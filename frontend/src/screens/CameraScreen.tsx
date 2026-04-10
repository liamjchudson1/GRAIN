import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import FilmCounter from '../components/FilmCounter';

const { width } = Dimensions.get('window');

interface Props {
  onPostCreated: () => void;
  onClose: () => void;
}

export default function CameraScreen({ onPostCreated, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing || uploading) return;
    if (!user || user.shotsRemaining <= 0) {
      Alert.alert(
        'No shots left',
        'You have used all your shots for this week. Come back when your roll resets.',
        [{ text: 'Got it', onPress: onClose }]
      );
      return;
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true, // No processing for authenticity
        exif: false,
      });

      if (!photo) throw new Error('No photo captured');

      setCapturing(false);
      setUploading(true);

      // Build form data
      const formData = new FormData();
      const filename = `pol_${Date.now()}.jpg`;

      if (Platform.OS === 'web') {
        // Web: fetch blob
        const resp = await fetch(photo.uri);
        const blob = await resp.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      }

      await api.createPost(formData);
      await refreshUser();
      onPostCreated();
    } catch (e: any) {
      setCapturing(false);
      setUploading(false);
      Alert.alert('Failed to post', e.message || 'Something went wrong. Try again.');
    }
  }, [capturing, uploading, user]);

  if (!permission) {
    return <View style={styles.loading}><ActivityIndicator color={theme.colors.accent} /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.permissionContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.permissionContent}>
            <View style={styles.permIcon}>
              <Ionicons name="camera" size={40} color={theme.colors.accent} />
            </View>
            <Text style={styles.permTitle}>Camera Access</Text>
            <Text style={styles.permDesc}>
              Proof of Life needs camera access to capture your real moments. No uploads — only live shots.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const shotsLeft = user?.shotsRemaining ?? 0;
  const isOutOfShots = shotsLeft <= 0;

  return (
    <View style={styles.root}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        animateShutter={false}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={styles.topLabel}>ONE SHOT</Text>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Shot counter overlay */}
        <View style={styles.counterOverlay}>
          <View style={styles.counterPill}>
            <View style={[styles.counterDot, { backgroundColor: isOutOfShots ? theme.colors.danger : theme.colors.accent }]} />
            <Text style={[styles.counterText, { color: isOutOfShots ? theme.colors.danger : theme.colors.white }]}>
              {shotsLeft}/{user?.shotsRemaining !== undefined ? 12 : '?'} shots remaining
            </Text>
          </View>
        </View>

        {/* No retakes notice */}
        {!isOutOfShots && (
          <View style={styles.noticeOverlay}>
            <Text style={styles.noticeText}>NO RETAKES · NO FILTERS · INSTANT POST</Text>
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {isOutOfShots ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Film Roll Empty</Text>
              <Text style={styles.emptyDesc}>
                Your shots reset in{' '}
                {user?.shotsResetAt
                  ? Math.ceil(
                      (new Date(user.shotsResetAt).getTime() - Date.now()) / 86400000
                    ) + 'd'
                  : '...'}
              </Text>
              <TouchableOpacity style={styles.closeEmptyBtn} onPress={onClose}>
                <Text style={styles.closeEmptyText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.shutterRow}>
              {/* Shutter */}
              <TouchableOpacity
                style={[styles.shutter, (capturing || uploading) && styles.shutterDisabled]}
                onPress={handleCapture}
                disabled={capturing || uploading}
                activeOpacity={0.85}
              >
                {capturing || uploading ? (
                  <ActivityIndicator color={theme.colors.black} size="large" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
              {(capturing || uploading) && (
                <Text style={styles.uploadingText}>
                  {capturing ? 'Capturing...' : 'Publishing...'}
                </Text>
              )}
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  topLabel: {
    fontSize: theme.font.xs,
    color: theme.colors.accent,
    fontWeight: '800',
    letterSpacing: 2,
  },
  counterOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  counterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  counterText: {
    fontSize: theme.font.sm,
    fontWeight: '600',
  },
  noticeOverlay: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: theme.spacing.lg,
    alignItems: 'center',
  },
  shutterRow: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterDisabled: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.white,
  },
  uploadingText: {
    color: theme.colors.white,
    fontSize: theme.font.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  emptyDesc: {
    fontSize: theme.font.md,
    color: 'rgba(255,255,255,0.6)',
  },
  closeEmptyBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
  },
  closeEmptyText: {
    fontWeight: '700',
    color: theme.colors.black,
    fontSize: theme.font.md,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  permIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  permTitle: {
    fontSize: theme.font.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: theme.font.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 14,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.sm,
  },
  permBtnText: {
    fontWeight: '800',
    color: theme.colors.black,
    fontSize: theme.font.md,
  },
});
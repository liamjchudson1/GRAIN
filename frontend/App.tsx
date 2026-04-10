import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { initErrorHandler } from './src/errorHandler';
import { initTestAgentBridge } from './src/testAgentBridge';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { theme } from './src/theme';

import AuthScreen from './src/screens/AuthScreen';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CameraScreen from './src/screens/CameraScreen';
import SearchScreen from './src/screens/SearchScreen';
import FriendsScreen from './src/screens/FriendsScreen';

initErrorHandler();

type Tab = 'feed' | 'profile';
type Modal = 'camera' | 'search' | 'friends' | 'user_profile';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('feed');
  const [activeModal, setActiveModal] = useState<Modal | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    initTestAgentBridge();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <View style={styles.splashLogoInner} />
        </View>
        <Text style={styles.splashText}>proof of life</Text>
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const openCamera = () => setActiveModal('camera');
  const openSearch = () => setActiveModal('search');
  const openFriends = () => setActiveModal('friends');
  const closeModal = () => {
    setActiveModal(null);
    setViewingUserId(null);
  };

  const openUserProfile = (userId: string) => {
    setViewingUserId(userId);
    setActiveModal('user_profile');
  };

  const handlePostCreated = () => {
    closeModal();
    setTab('profile');
    setFeedKey((k) => k + 1);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Main Content */}
      {tab === 'feed' ? (
        <FeedScreen
          key={feedKey}
          onOpenCamera={openCamera}
          onOpenProfile={openUserProfile}
          onOpenRequests={openFriends}
        />
      ) : (
        <ProfileScreen
          onOpenCamera={openCamera}
          onOpenSearch={openSearch}
        />
      )}

      {/* Bottom Tab Bar */}
      <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setTab('feed')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === 'feed' ? 'home' : 'home-outline'}
              size={24}
              color={tab === 'feed' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text style={[styles.tabLabel, tab === 'feed' && styles.tabLabelActive]}>Feed</Text>
          </TouchableOpacity>

          {/* Center camera button */}
          <TouchableOpacity
            style={[
              styles.cameraTab,
              (user.shotsRemaining ?? 0) === 0 && styles.cameraTabEmpty,
            ]}
            onPress={openCamera}
            activeOpacity={0.85}
          >
            <Ionicons
              name="camera"
              size={26}
              color={(user.shotsRemaining ?? 0) === 0 ? theme.colors.textMuted : theme.colors.black}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setTab('profile')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === 'profile' ? 'person' : 'person-outline'}
              size={24}
              color={tab === 'profile' ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text style={[styles.tabLabel, tab === 'profile' && styles.tabLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Camera Modal */}
      <Modal
        visible={activeModal === 'camera'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}
      >
        <SafeAreaProvider>
          <CameraScreen onPostCreated={handlePostCreated} onClose={closeModal} />
        </SafeAreaProvider>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={activeModal === 'search'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}
      >
        <SafeAreaProvider>
          <SearchScreen
            onUserPress={(userId) => {
              setActiveModal(null);
              setTimeout(() => {
                setViewingUserId(userId);
                setActiveModal('user_profile');
              }, 300);
            }}
            onClose={closeModal}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Friends Modal */}
      <Modal
        visible={activeModal === 'friends'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}
      >
        <SafeAreaProvider>
          <FriendsScreen
            onUserPress={(userId) => {
              setActiveModal(null);
              setTimeout(() => {
                setViewingUserId(userId);
                setActiveModal('user_profile');
              }, 300);
            }}
            onOpenSearch={() => {
              setActiveModal(null);
              setTimeout(() => setActiveModal('search'), 300);
            }}
            onClose={closeModal}
          />
        </SafeAreaProvider>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        visible={activeModal === 'user_profile'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeModal}
      >
        <SafeAreaProvider>
          <View style={styles.root}>
            <SafeAreaView style={styles.modalHeader} edges={['top']}>
              <TouchableOpacity style={styles.modalBackBtn} onPress={closeModal}>
                <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </SafeAreaView>
            {viewingUserId && (
              <ProfileScreen userId={viewingUserId} />
            )}
          </View>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  splashLogoInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.black,
  },
  splashText: {
    fontSize: theme.font.xxl,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  tabBarSafe: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  cameraTab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xl,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  cameraTabEmpty: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalBackBtn: {
    padding: theme.spacing.md,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post, api } from '../api';
import { theme } from '../theme';
import TimeAgo from './TimeAgo';

const EMOJIS = ['❤️', '🔥', '😮', '😂', '👏'];
const { width } = Dimensions.get('window');
const BASE_URL = 'https://studio-1b094b991adc.kooked.dev';

interface Props {
  post: Post;
  showUser?: boolean;
  onUserPress?: (userId: string) => void;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, showUser, onUserPress, currentUserId, onDelete }: Props) {
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(post.userReaction ?? null);
  const [reactionCount, setReactionCount] = useState(post.reactionCount ?? 0);
  const [imageError, setImageError] = useState(false);

  const imageUrl = post.imageUrl?.startsWith('http')
    ? post.imageUrl
    : `${BASE_URL}/${post.imageUrl}`;

  const handleReactionSelect = async (emoji: string) => {
    setReactionPickerVisible(false);
    try {
      if (userReaction === emoji) {
        await api.removeReaction(post.id);
        setUserReaction(null);
        setReactionCount((c) => Math.max(0, c - 1));
      } else {
        await api.addReaction(post.id, emoji);
        if (!userReaction) setReactionCount((c) => c + 1);
        setUserReaction(emoji);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'This cannot be undone. You have 1 delete per week.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(post.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {showUser && post.user && (
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => onUserPress?.(post.user!.id)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {post.user.avatarUrl ? (
              <Image source={{ uri: post.user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>
                {post.user.displayName?.[0]?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{post.user.displayName}</Text>
            <Text style={styles.username}>@{post.user.username}</Text>
          </View>
          <TimeAgo date={post.createdAt} style={styles.time} />
          {currentUserId === post.userId && onDelete && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Photo */}
      <View style={styles.imageContainer}>
        {!imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.imagePlaceholderText}>Photo unavailable</Text>
          </View>
        )}
        {/* Grain overlay for authenticity feel */}
        <View style={styles.grainOverlay} pointerEvents="none" />
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {post.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.reactionArea}>
          {reactionCount > 0 && (
            <Text style={styles.reactionCount}>{reactionCount}</Text>
          )}
          <TouchableOpacity
            style={[styles.reactBtn, userReaction && styles.reactBtnActive]}
            onPress={() => setReactionPickerVisible(true)}
            activeOpacity={0.7}
          >
            {userReaction ? (
              <Text style={styles.reactionEmoji}>{userReaction}</Text>
            ) : (
              <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!showUser && (
        <View style={styles.timeRow}>
          <TimeAgo date={post.createdAt} />
          {currentUserId === post.userId && onDelete && (
            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reaction picker modal */}
      <Modal
        visible={reactionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBg}
          activeOpacity={1}
          onPress={() => setReactionPickerVisible(false)}
        >
          <View style={styles.picker}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.pickerBtn, userReaction === emoji && styles.pickerBtnActive]}
                onPress={() => handleReactionSelect(emoji)}
              >
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLetter: {
    fontSize: theme.font.md,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: theme.font.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  time: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: theme.spacing.sm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceAlt,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  imagePlaceholderText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sm,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: '#fff',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  caption: {
    flex: 1,
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  reactionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionCount: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  reactBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactBtnActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
  },
  reactionEmoji: {
    fontSize: 15,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  modalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  pickerBtnActive: {
    backgroundColor: theme.colors.accent + '33',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  pickerEmoji: {
    fontSize: 24,
  },
});
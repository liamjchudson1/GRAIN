import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { api, Post } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import FilmCounter from '../components/FilmCounter';

interface Props {
  onOpenCamera: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenRequests: () => void;
}

export default function FeedScreen({ onOpenCamera, onOpenProfile, onOpenRequests }: Props) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [feedData, requestsData] = await Promise.all([
        api.getFeed(),
        api.getFriendRequests(),
      ]);
      setPosts(feedData.data);
      setPendingCount(requestsData.total);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e: any) {
      Alert.alert('Delete failed', e.message);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Wordmark */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>proof of life</Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenRequests}
          >
            <Ionicons name="people-outline" size={22} color={theme.colors.text} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shotBtn, (user?.shotsRemaining ?? 0) === 0 && styles.shotBtnEmpty]}
            onPress={onOpenCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={16} color={(user?.shotsRemaining ?? 0) === 0 ? theme.colors.danger : theme.colors.black} />
            <Text style={[styles.shotBtnText, (user?.shotsRemaining ?? 0) === 0 && styles.shotBtnTextEmpty]}>
              {user?.shotsRemaining ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {posts.length === 0 && !loading && (
        <View style={styles.emptyFeed}>
          <View style={styles.emptyIcon}>
            <Ionicons name="images-outline" size={40} color={theme.colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Your feed is empty</Text>
          <Text style={styles.emptyDesc}>
            Add friends to see their real, unedited moments here. Chronological only — no algorithm.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onOpenRequests} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={16} color={theme.colors.black} />
            <Text style={styles.emptyBtnText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>proof of life</Text>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            showUser
            onUserPress={onOpenProfile}
            currentUserId={user?.id}
            onDelete={item.userId === user?.id ? handleDeletePost : undefined}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        // No infinite scroll — intentional product decision
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  headerSection: {
    marginBottom: theme.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  wordmark: {
    fontSize: theme.font.xl,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.black,
  },
  shotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  shotBtnEmpty: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  shotBtnText: {
    fontSize: theme.font.sm,
    fontWeight: '800',
    color: theme.colors.black,
  },
  shotBtnTextEmpty: {
    color: theme.colors.danger,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: theme.font.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyDesc: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.sm,
  },
  emptyBtnText: {
    fontWeight: '700',
    color: theme.colors.black,
    fontSize: theme.font.sm,
  },
});
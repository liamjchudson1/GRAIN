import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { api, Post, UserProfile } from '../api';
import { useAuth } from '../context/AuthContext';
import FilmCounter from '../components/FilmCounter';
import TimeAgo from '../components/TimeAgo';
import PostCard from '../components/PostCard';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 3) / 3; // 3-column grid with 1.5px gaps
const BASE_URL = 'https://studio-1b094b991adc.kooked.dev';

interface Props {
  userId?: string; // If undefined, show own profile
  onOpenCamera?: () => void;
  onOpenSearch?: () => void;
}

type GridView = 'grid' | 'list';

export default function ProfileScreen({ userId, onOpenCamera, onOpenSearch }: Props) {
  const { user: currentUser, refreshUser, logout } = useAuth();
  const isSelf = !userId || userId === currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gridView, setGridView] = useState<GridView>('grid');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const targetId = userId || currentUser?.id || '';

  const load = useCallback(async () => {
    try {
      const [profileData, postsData] = await Promise.all([
        api.getUser(targetId),
        api.getUserPosts(targetId),
      ]);
      setProfile(profileData);
      setPosts(postsData.data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isSelf) refreshUser();
    load();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Delete failed', e.message);
    }
  };

  const handleFriendAction = async () => {
    if (!profile) return;
    setFriendLoading(true);
    try {
      if (profile.friendshipStatus === 'none') {
        await api.sendFriendRequest(targetId);
        setProfile((p) => p ? { ...p, friendshipStatus: 'pending_sent' } : p);
      } else if (profile.friendshipStatus === 'accepted' && profile.friendshipId) {
        Alert.alert('Remove Friend', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove', style: 'destructive',
            onPress: async () => {
              await api.removeFriend(profile.friendshipId!);
              setProfile((p) => p ? { ...p, friendshipStatus: 'none', friendshipId: undefined } : p);
            },
          },
        ]);
      } else if (profile.friendshipStatus === 'pending_received' && profile.friendshipId) {
        await api.acceptFriendRequest(profile.friendshipId);
        setProfile((p) => p ? { ...p, friendshipStatus: 'accepted' } : p);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFriendLoading(false);
    }
  };

  const friendBtnLabel = () => {
    switch (profile?.friendshipStatus) {
      case 'accepted': return 'Friends';
      case 'pending_sent': return 'Requested';
      case 'pending_received': return 'Accept';
      default: return 'Add Friend';
    }
  };

  const friendBtnStyle = () => {
    switch (profile?.friendshipStatus) {
      case 'accepted': return styles.friendBtnAccepted;
      case 'pending_sent': return styles.friendBtnPending;
      case 'pending_received': return styles.friendBtnAccept;
      default: return styles.friendBtnAdd;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const displayUser = isSelf ? currentUser : profile;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {displayUser?.avatarUrl ? (
                  <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>
                    {displayUser?.displayName?.[0]?.toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              {isSelf && currentUser?.lastPostedAt && (
                <View style={styles.activeDot} />
              )}
            </View>

            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{posts.length}</Text>
                <Text style={styles.statLabel}>shots</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profile?.friendCount ?? 0}</Text>
                <Text style={styles.statLabel}>friends</Text>
              </View>
            </View>
          </View>

          <Text style={styles.displayName}>{displayUser?.displayName}</Text>
          <Text style={styles.username}>@{displayUser?.username}</Text>
          {displayUser?.bio && <Text style={styles.bio}>{displayUser.bio}</Text>}

          {displayUser?.lastPostedAt && (
            <TimeAgo
              date={displayUser.lastPostedAt}
              prefix="posted "
              style={styles.lastPosted}
            />
          )}

          {/* Actions */}
          {isSelf ? (
            <View style={styles.selfActions}>
              <FilmCounter
                remaining={currentUser?.shotsRemaining ?? 0}
                resetAt={currentUser?.shotsResetAt}
              />
              <View style={styles.selfBtns}>
                {onOpenCamera && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cameraBtn, (currentUser?.shotsRemaining ?? 0) === 0 && styles.actionBtnDisabled]}
                    onPress={onOpenCamera}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color={theme.colors.black} />
                    <Text style={styles.cameraBtnText}>Take Shot</Text>
                  </TouchableOpacity>
                )}
                {onOpenSearch && (
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={onOpenSearch}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add-outline" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={logout}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.friendBtn, friendBtnStyle()]}
              onPress={handleFriendAction}
              disabled={friendLoading || profile?.friendshipStatus === 'pending_sent'}
              activeOpacity={0.8}
            >
              {friendLoading ? (
                <ActivityIndicator color={theme.colors.black} size="small" />
              ) : (
                <Text style={[
                  styles.friendBtnText,
                  profile?.friendshipStatus === 'accepted' && styles.friendBtnTextAccepted,
                ]}>
                  {friendBtnLabel()}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Grid toggle */}
        <View style={styles.gridToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, gridView === 'grid' && styles.toggleBtnActive]}
            onPress={() => setGridView('grid')}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={gridView === 'grid' ? theme.colors.accent : theme.colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, gridView === 'list' && styles.toggleBtnActive]}
            onPress={() => setGridView('list')}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={gridView === 'list' ? theme.colors.accent : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Posts */}
        {posts.length === 0 ? (
          <View style={styles.emptyGrid}>
            <Ionicons name="camera-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No shots yet</Text>
            <Text style={styles.emptyDesc}>
              {isSelf
                ? "Take your first shot — no edits, no pressure."
                : "This user hasn't posted yet."}
            </Text>
          </View>
        ) : gridView === 'grid' ? (
          <View style={styles.grid}>
            {posts.map((post, i) => {
              const imgUrl = post.imageUrl?.startsWith('http')
                ? post.imageUrl
                : `${BASE_URL}/${post.imageUrl}`;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => setSelectedPost(post)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: imgUrl }} style={styles.gridImg} resizeMode="cover" />
                  {/* Shot number */}
                  <View style={styles.gridNum}>
                    <Text style={styles.gridNumText}>{posts.length - i}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.listView}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onDelete={isSelf ? handleDeletePost : undefined}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Post detail modal */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPost(null)}>
            <Ionicons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          {selectedPost && (
            <View style={styles.modalCard}>
              <PostCard
                post={selectedPost}
                currentUserId={currentUser?.id}
                onDelete={isSelf ? handleDeletePost : undefined}
              />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  header: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    overflow: 'hidden',
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarLetter: {
    fontSize: theme.font.xxl,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingLeft: theme.spacing.xl,
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: theme.font.xl, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: theme.font.xs, color: theme.colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.colors.border },
  displayName: {
    fontSize: theme.font.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
  bio: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  lastPosted: {
    fontSize: theme.font.xs,
    color: theme.colors.accent,
    marginTop: 2,
  },
  selfActions: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  selfBtns: { flexDirection: 'row', gap: theme.spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  cameraBtn: { backgroundColor: theme.colors.accent, flex: 1, justifyContent: 'center' },
  cameraBtnText: { fontWeight: '700', color: theme.colors.black, fontSize: theme.font.sm },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBtn: {
    paddingVertical: 12,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  friendBtnAdd: { backgroundColor: theme.colors.accent },
  friendBtnPending: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  friendBtnAccept: { backgroundColor: '#4CAF50' },
  friendBtnAccepted: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  friendBtnText: { fontWeight: '700', fontSize: theme.font.sm, color: theme.colors.black },
  friendBtnTextAccepted: { color: theme.colors.textSecondary },
  gridToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1.5,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: theme.colors.surfaceAlt,
    position: 'relative',
  },
  gridImg: { width: '100%', height: '100%' },
  gridNum: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridNumText: { fontSize: 10, fontWeight: '700', color: theme.colors.accent },
  listView: { padding: theme.spacing.md, gap: theme.spacing.md },
  emptyGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: theme.spacing.sm,
  },
  emptyTitle: { fontSize: theme.font.lg, fontWeight: '700', color: theme.colors.textSecondary },
  emptyDesc: { fontSize: theme.font.sm, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: theme.spacing.xl },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: { marginTop: 40 },
});
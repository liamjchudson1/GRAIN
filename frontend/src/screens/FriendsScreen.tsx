import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { api, Friendship, FriendRequest, User } from '../api';
import TimeAgo from '../components/TimeAgo';

interface Props {
  onUserPress: (userId: string) => void;
  onOpenSearch: () => void;
  onClose: () => void;
}

export default function FriendsScreen({ onUserPress, onOpenSearch, onClose }: Props) {
  const [tab, setTab] = useState<'friends' | 'requests'>('requests');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
      ]);
      setFriends(friendsData.data);
      setRequests(requestsData.data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleAccept = async (req: FriendRequest) => {
    try {
      await api.acceptFriendRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      load(); // Refresh friends list
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReject = async (req: FriendRequest) => {
    try {
      await api.rejectFriendRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveFriend = (friendship: Friendship) => {
    const friend = friendship.requester || friendship.addressee;
    Alert.alert(
      'Remove Friend',
      `Remove ${friend?.displayName ?? 'this person'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.removeFriend(friendship.id);
              setFriends((prev) => prev.filter((f) => f.id !== friendship.id));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const AvatarView = ({ user }: { user?: User }) => (
    <View style={styles.avatar}>
      {user?.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
      ) : (
        <Text style={styles.avatarLetter}>{user?.displayName?.[0]?.toUpperCase() || '?'}</Text>
      )}
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => onUserPress(item.requester.id)} activeOpacity={0.7}>
        <AvatarView user={item.requester} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.rowInfo}
        onPress={() => onUserPress(item.requester.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.rowName}>{item.requester.displayName}</Text>
        <Text style={styles.rowSub}>@{item.requester.username}</Text>
        <TimeAgo date={item.createdAt} style={styles.rowTime} />
      </TouchableOpacity>
      <View style={styles.requestBtns}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAccept(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleReject(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: Friendship }) => {
    const friend = item.requester || item.addressee;
    if (!friend) return null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onUserPress(friend.id)}
        activeOpacity={0.7}
      >
        <AvatarView user={friend} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{friend.displayName}</Text>
          <Text style={styles.rowSub}>@{friend.username}</Text>
          {friend.lastPostedAt && (
            <TimeAgo date={friend.lastPostedAt} prefix="posted " style={styles.rowLastPosted} />
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveFriend(item)}
          style={styles.removeBtn}
          hitSlop={8}
        >
          <Ionicons name="person-remove-outline" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onOpenSearch} activeOpacity={0.8}>
          <Ionicons name="person-add-outline" size={18} color={theme.colors.black} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            Requests
          </Text>
          {requests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{requests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'friends' && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            Friends {friends.length > 0 ? `(${friends.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-open-outline" size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No pending requests</Text>
              <TouchableOpacity style={styles.findBtn} onPress={onOpenSearch} activeOpacity={0.8}>
                <Text style={styles.findBtnText}>Find People</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No friends yet</Text>
              <TouchableOpacity style={styles.findBtn} onPress={onOpenSearch} activeOpacity={0.8}>
                <Text style={styles.findBtnText}>Find People</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { padding: 4 },
  title: {
    fontSize: theme.font.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: { color: theme.colors.text },
  tabBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.black },
  list: { flexGrow: 1, padding: theme.spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarLetter: {
    fontSize: theme.font.lg,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: {
    fontSize: theme.font.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rowSub: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
  rowTime: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
  rowLastPosted: {
    fontSize: theme.font.xs,
    color: theme.colors.accent,
  },
  requestBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  acceptBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
  },
  acceptBtnText: {
    fontSize: theme.font.sm,
    fontWeight: '700',
    color: theme.colors.black,
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    padding: 6,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.font.md,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  findBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.sm,
  },
  findBtnText: {
    fontWeight: '700',
    color: theme.colors.black,
    fontSize: theme.font.sm,
  },
});
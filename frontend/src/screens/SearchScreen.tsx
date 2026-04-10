import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { api, User } from '../api';
import { useAuth } from '../context/AuthContext';
import TimeAgo from '../components/TimeAgo';

interface Props {
  onUserPress: (userId: string) => void;
  onClose: () => void;
}

export default function SearchScreen({ onUserPress, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchUsers(q.trim());
      setResults(data.data.filter((u) => u.id !== currentUser?.id));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => onUserPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarLetter}>{item.displayName?.[0]?.toUpperCase() || '?'}</Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
        {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
      </View>
      <View style={styles.meta}>
        {item.lastPostedAt && (
          <TimeAgo date={item.lastPostedAt} style={styles.lastPosted} />
        )}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleChange}
            placeholder="Search by name or @username"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => search(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Ionicons name="person-outline" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>Try a different username or name</Text>
              </View>
            ) : (
              <View style={styles.hint}>
                <Text style={styles.hintTitle}>Find Friends</Text>
                <Text style={styles.hintText}>
                  Search for people you know. Add them as friends to see their real moments on your feed.
                </Text>
              </View>
            )
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.md,
    color: theme.colors.text,
  },
  cancelBtn: { padding: theme.spacing.xs },
  cancelText: {
    fontSize: theme.font.md,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
    padding: theme.spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
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
  userInfo: { flex: 1 },
  displayName: {
    fontSize: theme.font.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  bio: {
    fontSize: theme.font.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  lastPosted: {
    fontSize: theme.font.xs,
    color: theme.colors.accent,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.font.lg,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
  },
  hint: {
    paddingTop: 40,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  hintTitle: {
    fontSize: theme.font.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hintText: {
    fontSize: theme.font.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
const BASE_URL = 'https://studio-1b094b991adc.kooked.dev';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
  isFormData?: boolean
): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as any) : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data as T;
}

export const api = {
  // Auth
  register: async (email: string, username: string, displayName: string, password: string) => {
    const res = await request<{ user: any; token: string }>('POST', '/api/auth/register', {
      email,
      username,
      fullName: displayName,
      password,
    });
    return { user: normalizeUser(res.user) as User, token: res.token };
  },

  login: async (email: string, password: string) => {
    const res = await request<{ user: any; token: string }>('POST', '/api/auth/login', { email, password });
    return { user: normalizeUser(res.user) as User, token: res.token };
  },

  me: async () => {
    const u = await request<any>('GET', '/api/users/me');
    return normalizeUser(u) as User;
  },

  updateProfile: (data: Partial<Pick<User, 'displayName' | 'bio'>>) =>
    request<User>('PUT', '/api/users/me', { fullName: data.displayName, bio: data.bio }),

  // Users
  getUser: async (id: string) => {
    const u = await request<any>('GET', `/api/users/${id}`);
    return normalizeUser(u) as UserProfile;
  },

  searchUsers: async (q: string) => {
    const res = await request<{ data: any[]; total: number }>('GET', `/api/users?q=${encodeURIComponent(q)}`);
    return { data: res.data.map(normalizeUser) as User[], total: res.total };
  },

  getUserPosts: (userId: string, page = 1) =>
    request<{ data: Post[]; total: number }>(
      'GET',
      `/api/posts/user/${userId}?page=${page}&limit=30`
    ),

  // Posts
  createPost: (formData: FormData) =>
    request<Post>('POST', '/api/posts', formData as any, true),

  deletePost: (id: string) => request<{ success: boolean }>('DELETE', `/api/posts/${id}`),

  // Feed
  getFeed: () => request<{ data: Post[]; total: number }>('GET', '/api/posts/feed'),

  // Friends
  getFriends: () => request<{ data: Friendship[]; total: number }>('GET', '/api/friends'),

  getFriendRequests: () =>
    request<{ data: FriendRequest[]; total: number }>('GET', '/api/friends/requests'),

  sendFriendRequest: (addresseeId: string) =>
    request<Friendship>('POST', '/api/friends', { friendId: addresseeId }),

  acceptFriendRequest: (id: string) => request<Friendship>('PUT', `/api/friends/${id}/accept`),

  rejectFriendRequest: (id: string) => request<Friendship>('PUT', `/api/friends/${id}/reject`),

  removeFriend: (id: string) => request<{ success: boolean }>('DELETE', `/api/friends/${id}`),

  // Reactions
  getReactions: (postId: string) =>
    request<{ grouped: Record<string, number>; userReaction: string | null; total: number }>(
      'GET',
      `/api/reactions/${postId}`
    ),

  addReaction: (postId: string, emoji: string) =>
    request<any>('POST', '/api/reactions', { postId, emoji }),

  removeReaction: (postId: string) => request<any>('DELETE', `/api/reactions/${postId}`),
};

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;  // mapped from fullName
  fullName?: string;    // raw from backend
  bio?: string;
  avatarUrl?: string;
  shotsRemaining: number;
  shotsResetAt: string;
  deletesRemaining: number;
  createdAt: string;
  lastPostedAt?: string;
}

function normalizeUser(u: any): User {
  return { ...u, displayName: u.displayName ?? u.fullName ?? u.username };
}

export interface UserProfile extends User {
  postCount: number;
  friendCount: number;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendshipId?: string;
}

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  user?: User;
  reactionCount?: number;
  userReaction?: string | null;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  requester?: User;
  addressee?: User;
}

export interface FriendRequest extends Friendship {
  requester: User;
}
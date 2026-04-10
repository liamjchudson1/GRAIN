import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: 'pol_auth_token',
  USER: 'pol_user',
};

export const storage = {
  async saveAuth(token: string, user: object) {
    await AsyncStorage.multiSet([
      [KEYS.AUTH_TOKEN, token],
      [KEYS.USER, JSON.stringify(user)],
    ]);
  },

  async getAuth(): Promise<{ token: string | null; user: any | null }> {
    const [[, token], [, userStr]] = await AsyncStorage.multiGet([KEYS.AUTH_TOKEN, KEYS.USER]);
    return {
      token,
      user: userStr ? JSON.parse(userStr) : null,
    };
  },

  async clearAuth() {
    await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.USER]);
  },

  async updateUser(user: object) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
};
// services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user_data';
const IS_LOGGED_IN_KEY = '@is_logged_in';

export const authService = {
  // Save login state
  saveLoginState: async (userData) => {
    try {
      await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'true');
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      if (userData.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, userData.token);
      }
      return true;
    } catch (error) {
      console.error('Error saving login state:', error);
      return false;
    }
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem(IS_LOGGED_IN_KEY);
      return isLoggedIn === 'true';
    } catch (error) {
      console.error('Error checking login state:', error);
      return false;
    }
  },

  // Get user data
  getUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  // Get auth token
  getAuthToken: async () => {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  // Clear login state (logout)
  clearLoginState: async () => {
    try {
      await AsyncStorage.multiRemove([IS_LOGGED_IN_KEY, USER_DATA_KEY, AUTH_TOKEN_KEY]);
      return true;
    } catch (error) {
      console.error('Error clearing login state:', error);
      return false;
    }
  },

  // Save device ID
  saveDeviceId: async (deviceId) => {
    try {
      await AsyncStorage.setItem('@device_id', deviceId);
      return true;
    } catch (error) {
      console.error('Error saving device ID:', error);
      return false;
    }
  },

  // Get device ID
  getDeviceId: async () => {
    try {
      return await AsyncStorage.getItem('@device_id');
    } catch (error) {
      console.error('Error getting device ID:', error);
      return null;
    }
  }
};
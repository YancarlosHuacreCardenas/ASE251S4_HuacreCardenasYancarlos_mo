import axios from 'axios';
import { Platform } from 'react-native';

// Override with EXPO_PUBLIC_API_URL when the backend uses another host or port.
const defaultBaseURL = Platform.OS === 'android'
  ? 'http://10.0.2.2:36045/api/v1'
  : 'http://127.0.0.1:36045/api/v1';
const baseURL = process.env.EXPO_PUBLIC_API_URL || defaultBaseURL;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

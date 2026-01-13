import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configure base URL - change this to your backend URL
const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      SecureStore.deleteItemAsync('authToken');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getUser: (username) => api.get(`/users/${username}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  updateProfilePic: (id, formData) =>
    api.post(`/users/${id}/profile-pic`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getFollowers: (id, page = 1) => api.get(`/users/${id}/followers?page=${page}`),
  getFollowing: (id, page = 1) => api.get(`/users/${id}/following?page=${page}`),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.delete(`/users/${id}/unfollow`),
  getUserPosts: (id, page = 1) => api.get(`/users/${id}/posts?page=${page}`),
};

// Posts API
export const postsAPI = {
  create: (formData) =>
    api.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for video upload
    }),
  getUploadUrl: () => api.get('/posts/upload-url'),
  confirmUpload: (data) => api.post('/posts/confirm', data),
  getFeed: (page = 1) => api.get(`/posts/feed?page=${page}`),
  getDiscover: (page = 1) => api.get(`/posts/discover?page=${page}`),
  getPost: (id) => api.get(`/posts/${id}`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.delete(`/posts/${id}/unlike`),
  getLikes: (id, page = 1) => api.get(`/posts/${id}/likes?page=${page}`),
  report: (id, data) => api.post(`/posts/${id}/report`, data),
};

// Comments API
export const commentsAPI = {
  create: (postId, text) => api.post(`/posts/${postId}/comments`, { text }),
  getComments: (postId, page = 1) => api.get(`/posts/${postId}/comments?page=${page}`),
  deleteComment: (id) => api.delete(`/comments/${id}`),
};

// Search API
export const searchAPI = {
  users: (query, page = 1) => api.get(`/search/users?q=${encodeURIComponent(query)}&page=${page}`),
  hashtags: (query, page = 1) => api.get(`/search/hashtags?q=${encodeURIComponent(query)}&page=${page}`),
  getHashtagPosts: (tag, page = 1) => api.get(`/search/hashtags/${encodeURIComponent(tag)}?page=${page}`),
  getRecent: () => api.get('/search/recent'),
  clearRecent: () => api.delete('/search/recent'),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;

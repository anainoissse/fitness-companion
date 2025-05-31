import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Auth functions
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    localStorage.setItem('token', response.data.token);
    return { success: true, token: response.data.token, user: response.data.user };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Ошибка входа' };
  }
};

export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    return { success: true, user: response.data.user };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Ошибка регистрации' };
  }
};

export const resetPassword = (email) => {
  return axios.post(`${API_URL}/auth/reset-password`, { email });
};

// Questionnaire functions
export const saveQuestionnaire = (data) => {
  const token = localStorage.getItem('token');
  // Если есть фото, отправляем form-data
  if (data.photo) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'photo') formData.append(key, value);
    });
    formData.append('photo', data.photo);
    return axios.post(`${API_URL}/auth/profile`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  } else {
    return axios.post(`${API_URL}/auth/profile`, data, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

// Profile functions
export const getProfile = () => axios.get(`${API_URL}/profile`);

export const updateProfile = (data) => {
  return axios.put(`${API_URL}/profile`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Feed functions
export const getSuggestedUsers = (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.experience) params.append('experience', filters.experience);
  if (filters.goal) params.append('goal', filters.goal);
  if (filters.interests?.length) {
    filters.interests.forEach(interest => params.append('interests[]', interest));
  }

  return axios.get(`${API_URL}/feed/suggested?${params.toString()}`);
};

export const getFilteredUsers = (filters) => {
  return axios.post(`${API_URL}/feed/filter`, filters);
};

export const getMoreUsers = (page, limit = 10) => {
  return axios.get(`${API_URL}/feed?page=${page}&limit=${limit}`);
};

export const getUserDetails = (userId) => {
  return axios.get(`${API_URL}/users/${userId}`);
};

export const reportUser = (userId, reason) => {
  return axios.post(`${API_URL}/users/${userId}/report`, { reason });
};

// Функция для получения заголовков с токеном авторизации
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Chat functions
export const getConversations = () => axios.get(`${API_URL}/chat/chats`, getAuthHeaders());
export const getMessages = (chatId) => axios.get(`${API_URL}/chat/chats/${chatId}/messages`, getAuthHeaders());
export const sendMessage = (receiverId, message) => {
  return axios.post(`${API_URL}/chat/messages/${receiverId}`, { content: message }, getAuthHeaders());
};
export const markAsRead = (chatId) => {
  return axios.patch(`${API_URL}/chat/chats/${chatId}/read`, {}, getAuthHeaders());
};
export const startNewChat = (userId) => {
  return axios.post(`${API_URL}/chat/chats`, { userId }, getAuthHeaders());
};

// Favorites functions
export const addToFavorites = (userId) => {
  return axios.post(`${API_URL}/favorites/${userId}`);
};

export const removeFromFavorites = (userId) => {
  return axios.delete(`${API_URL}/favorites/${userId}`);
};

export const getFavorites = () => {
  return axios.get(`${API_URL}/favorites`);
};
      

export const chatApi = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  startNewChat
};

export const feedApi = {
  getSuggestedUsers,
  getFilteredUsers,
  getMoreUsers,
  getUserDetails,
  reportUser,
  addToFavorites,
  removeFromFavorites,
  getFavorites
};
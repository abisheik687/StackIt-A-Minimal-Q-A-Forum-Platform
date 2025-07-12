// API configuration and utilities
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('accessToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication methods
  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.tokens?.accessToken) {
      this.setToken(response.tokens.accessToken);
    }
    return response;
  }

  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.tokens?.accessToken) {
      this.setToken(response.tokens.accessToken);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.setToken(null);
    }
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  // Question methods
  async getQuestions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/questions${queryString ? `?${queryString}` : ''}`);
  }

  async getQuestion(id) {
    return this.get(`/questions/${id}`);
  }

  async createQuestion(questionData) {
    return this.post('/questions', questionData);
  }

  async updateQuestion(id, questionData) {
    return this.put(`/questions/${id}`, questionData);
  }

  async deleteQuestion(id) {
    return this.delete(`/questions/${id}`);
  }

  async voteQuestion(id, type) {
    return this.post(`/questions/${id}/vote`, { type });
  }

  // User methods
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUser(id) {
    return this.get(`/users/${id}`);
  }

  // Health check
  async healthCheck() {
    return fetch(`${this.baseURL.replace('/api', '')}/health`).then(res => res.json());
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const {
  register,
  login,
  logout,
  getProfile,
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  voteQuestion,
  getUsers,
  getUser,
  healthCheck
} = apiClient;


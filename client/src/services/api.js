import axios from 'axios';

const serverUrl = import.meta.env.SERVER_URL || import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: serverUrl ? `${serverUrl.replace(/\/$/, '')}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Only clear the Merge AI session when our own JWT is rejected. A connected
// provider (for example GitHub) can also return 401 for its separate token.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = String(error.response?.data?.message || '').toLowerCase();
    const appSessionRejected = error.response?.status === 401 && (
      message.startsWith('not authorized') ||
      message === 'invalid token' ||
      message === 'token has expired'
    );
    if (appSessionRejected) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  deleteAccount: () => api.delete('/auth/account'),
};

// Reviews API
export const reviewsAPI = {
  createReview: (data) => api.post('/reviews', data),
  getRules: () => api.get('/reviews/rules'),
  saveRules: (data) => api.put('/reviews/rules', data),
  getReviews: (params) => api.get('/reviews', { params }),
  getReview: (id) => api.get(`/reviews/${id}`),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  makeProductionReady: (id) => api.post(`/reviews/${id}/production-ready`),
};

// GitHub API
export const githubAPI = {
  getAuthUrl: () => api.get('/github/auth-url'),
  connectCallback: (data) => api.post('/github/callback', data),
  getRepos: () => api.get('/github/repos'),
  getRepositoryTree: (owner, repo) => api.get('/github/tree', { params: { owner, repo } }),
  deleteRepositoryPath: (data) => api.delete('/github/path', { data }),
  pushToRepo: (data) => api.post('/github/push', data),
  createRepo: (data) => api.post('/github/repos', data),
  getPullRequests: (owner, repo) => api.get('/github/pulls', { params: { owner, repo } }),
  getBranches: (owner, repo) => api.get('/github/branches', { params: { owner, repo } }),
  createPullRequest: (data) => api.post('/github/pulls', data),
  createPullRequestFromFiles: (data) => api.post('/github/pulls/create-from-files', data),
  getPullRequestContext: (owner, repo, pullNumber) => api.get('/github/pulls/context', { params: { owner, repo, pullNumber } }),
  reviewPullRequest: (data) => api.post('/github/pulls/review', data),
  runPullRequestWorkflow: (data) => api.post('/github/pulls/workflows/dispatch', data),
  applyPullRequestFix: (data) => api.post('/github/pulls/apply-fix', data),
  publishPullRequestReview: (data) => api.post('/github/pulls/publish-review', data),
  closePullRequest: (data) => api.post('/github/pulls/close', data),
  deletePullRequestBranch: (data) => api.delete('/github/pulls/branch', { data }),
  disconnect: () => api.post('/github/disconnect'),
};

// Resume API
export const resumeAPI = {
  uploadResume: (formData) =>
    api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getResumes: () => api.get('/resume'),
  getResume: (id) => api.get(`/resume/${id}`),
  getJobRecommendations: (id) => api.get(`/resume/${id}/jobs`),
  analyzeRoleFit: (id, jobDescription) => api.post(`/resume/${id}/role-fit`, { jobDescription }),
  deleteResume: (id) => api.delete(`/resume/${id}`),
};

// Career preferences and saved job applications
export const careerAPI = {
  getPreferences: () => api.get('/career/preferences'),
  savePreferences: (data) => api.put('/career/preferences', data),
  getApplications: () => api.get('/career/applications'),
  saveApplication: (data) => api.post('/career/applications', data),
  updateApplication: (id, data) => api.patch(`/career/applications/${id}`, data),
  deleteApplication: (id) => api.delete(`/career/applications/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getReviewTrends: (params) => api.get('/analytics/trends', { params }),
  getLanguageDistribution: () => api.get('/analytics/languages'),
  getScoreDistribution: () => api.get('/analytics/scores'),
  getResumeInsights: () => api.get('/analytics/resumes'),
};

export const getApiError = (error) => error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong';

export default api;

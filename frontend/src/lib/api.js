import axios from 'axios';

// All browser traffic goes through Next.js API routes — secrets stay on the server.
const apiClient = axios.create({
  baseURL: '/api/backend',
  withCredentials: true,
  timeout: 90000, // Render free tier cold starts can take ~60s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Do not auto-reload on 401 — that caused an infinite loop on the lock screen
// (getProfile → 401 → reload → getProfile → …). Layout handles sign-out explicitly.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const auth = {
  getStatus: async () => {
    const res = await fetch('/api/auth/status', { credentials: 'include' });
    return res.json();
  },
  unlock: async (passcode) => {
    const res = await fetch('/api/auth/unlock', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.detail || 'Unlock failed');
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },
  checkSession: async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    return res.json();
  },
};

export const api = {
  // --- Profile ---
  getProfile: async () => {
    const res = await apiClient.get('/profile');
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await apiClient.put('/profile', data);
    return res.data;
  },
  uploadPhoto: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  addEducation: async (edu) => {
    const res = await apiClient.post('/profile/education', edu);
    return res.data;
  },
  updateEducation: async (id, edu) => {
    const res = await apiClient.put(`/profile/education/${id}`, edu);
    return res.data;
  },
  deleteEducation: async (id) => {
    const res = await apiClient.delete(`/profile/education/${id}`);
    return res.data;
  },
  addExperience: async (exp) => {
    const res = await apiClient.post('/profile/experience', exp);
    return res.data;
  },
  updateExperience: async (id, exp) => {
    const res = await apiClient.put(`/profile/experience/${id}`, exp);
    return res.data;
  },
  deleteExperience: async (id) => {
    const res = await apiClient.delete(`/profile/experience/${id}`);
    return res.data;
  },

  // --- Resume ---
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  generateATSResume: async (jobId) => {
    const res = await apiClient.post('/resume/generate-ats', { job_id: jobId });
    return res.data;
  },
  getResumeVersions: async () => {
    const res = await apiClient.get('/resume/versions');
    return res.data;
  },

  // --- Vault ---
  getDocuments: async () => {
    const res = await apiClient.get('/vault');
    return res.data;
  },
  uploadDocument: async (formData) => {
    const res = await apiClient.post('/vault/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getDocumentDownload: async (id) => {
    const res = await apiClient.get(`/vault/${id}/download`);
    return res.data;
  },
  deleteDocument: async (id) => {
    const res = await apiClient.delete(`/vault/${id}`);
    return res.data;
  },

  // --- Jobs ---
  getJobs: async (params) => {
    const res = await apiClient.get('/jobs', { params });
    return res.data;
  },
  getJob: async (id) => {
    const res = await apiClient.get(`/jobs/${id}`);
    return res.data;
  },
  saveJob: async (id) => {
    const res = await apiClient.post(`/jobs/${id}/save`);
    return res.data;
  },
  ignoreJob: async (id) => {
    const res = await apiClient.post(`/jobs/${id}/ignore`);
    return res.data;
  },
  applyToJob: async (id, data) => {
    const res = await apiClient.post(`/jobs/${id}/apply`, data);
    return res.data;
  },

  // --- Applications ---
  getApplications: async () => {
    const res = await apiClient.get('/applications');
    return res.data;
  },
  getAppDetail: async (id) => {
    const res = await apiClient.get(`/applications/${id}`);
    return res.data;
  },
  updateApp: async (id, data) => {
    const res = await apiClient.put(`/applications/${id}`, data);
    return res.data;
  },
  triggerFollowUp: async (id) => {
    const res = await apiClient.post(`/applications/${id}/follow-up`);
    return res.data;
  },
  getAppStats: async () => {
    const res = await apiClient.get('/applications/stats');
    return res.data;
  },

  // --- Competitions ---
  getCompetitions: async (params) => {
    const res = await apiClient.get('/competitions', { params });
    return res.data;
  },
  getCompStats: async () => {
    const res = await apiClient.get('/competitions/stats');
    return res.data;
  },
  registerCompetition: async (id) => {
    const res = await apiClient.post(`/competitions/${id}/register`);
    return res.data;
  },
  updateCompetition: async (id, data) => {
    const res = await apiClient.put(`/competitions/${id}`, data);
    return res.data;
  },

  // --- Interview Prep ---
  getInterviewPrep: async (jobId) => {
    const res = await apiClient.get(`/interview/${jobId}`);
    return res.data;
  },
  regeneratePrep: async (jobId) => {
    const res = await apiClient.post(`/interview/${jobId}/regenerate`);
    return res.data;
  },
  submitAnswer: async (data) => {
    const res = await apiClient.post('/interview/practice', data);
    return res.data;
  },

  // --- Scraper ---
  triggerScrape: async () => {
    const res = await apiClient.post('/scan/trigger');
    return res.data;
  },
  triggerCompScrape: async () => {
    const res = await apiClient.post('/scan/competitions/trigger');
    return res.data;
  },
  getScraperLogs: async () => {
    const res = await apiClient.get('/scan/logs');
    return res.data;
  },
  getScraperStatus: async () => {
    const res = await apiClient.get('/scan/status');
    return res.data;
  },

  // --- Email Log ---
  testEmail: async () => {
    const res = await apiClient.post('/email/test');
    return res.data;
  },
  getEmailLogs: async () => {
    const res = await apiClient.get('/email/log');
    return res.data;
  },
};

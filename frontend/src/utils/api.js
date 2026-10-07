// Central API client with Auth Bearer token support and in-memory cache for instant UI rendering
// Supports both relative /api (local proxy & Vercel monorepo) and external production URL (VITE_API_URL)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

const getHeaders = (customHeaders = {}) => {
  const token = localStorage.getItem('vargani_token');
  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// In-memory cache for fast tab and category switching (30-second TTL)
const cache = new Map();
const CACHE_TTL_MS = 30000;

const handleResponse = async (res, url) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401 && !url.includes('/users/login')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: err }));
      }
    }
    const errorObj = new Error(err.message || 'Request failed');
    errorObj.status = res.status;
    errorObj.data = err;
    throw errorObj;
  }
  return res.json();
};

export const api = {
  clearCache(prefix = '') {
    if (!prefix) {
      cache.clear();
    } else {
      for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
          cache.delete(key);
        }
      }
    }
  },

  async get(url, options = {}) {
    const { bypassCache = false } = options;
    const now = Date.now();

    if (!bypassCache && cache.has(url)) {
      const entry = cache.get(url);
      if (now - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
      }
      cache.delete(url);
    }

    const res = await fetch(`${API_BASE}${url}`, {
      headers: getHeaders(),
    });
    const data = await handleResponse(res, url);
    if (!bypassCache) {
      cache.set(url, { timestamp: now, data });
    }
    return data;
  },

  async post(url, data) {
    api.clearCache();
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    return handleResponse(res, url);
  },

  async put(url, data) {
    api.clearCache();
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    return handleResponse(res, url);
  },

  async delete(url) {
    api.clearCache();
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res, url);
  },
};

import { Platform } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:8000/api/v1').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 75_000;
const FILE_READ_TIMEOUT_MS = 15_000;

async function request(path, options) {
  let response;
  try {
    response = await fetchWithTimeout(`${API_BASE}${path}`, options, REQUEST_TIMEOUT_MS);
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection and try again.');
    }
    throw new Error(`Cannot reach the backend at ${API_BASE}. Check the API URL and make sure your phone and computer are on the same Wi-Fi.`);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = formatErrorMessage(body.detail || body.message) || message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  fetchHealth() {
    return request('/health');
  },

  fetchExpenses({ search = '', category = '' } = {}) {
    const query = new URLSearchParams({ page: '1', page_size: '50' });
    if (search) query.set('search', search);
    if (category) query.set('category', category);
    return request(`/expenses/?${query.toString()}`);
  },

  fetchAnalytics() {
    return request('/analytics/summary');
  },

  createExpense(expense) {
    return request('/expenses/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
  },

  deleteExpense(id) {
    return request(`/expenses/${id}`, { method: 'DELETE' });
  },

  scanReceipt(file) {
    return upload('/receipts/scan', file);
  },

  scanAndCreateExpense(file) {
    return upload('/receipts/scan-and-create', file);
  },

  askAdvisor(question) {
    return request('/advisor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  },
};

function upload(path, file) {
  return createUploadBody(file).then((body) => request(path, { method: 'POST', body }));
}

async function createUploadBody(file) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const response = await fetchWithTimeout(file.uri, {}, FILE_READ_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error(`Could not read the selected file (${response.status}).`);
    }
    const blob = await response.blob();
    form.append('file', blob, file.name);
    return form;
  }

  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });
  return form;
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      const error = new Error('Request timed out.');
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([
    fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) }),
    timeout,
  ]).finally(() => clearTimeout(timeoutId));
}

function formatErrorMessage(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const messages = value.map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const message = item.msg || item.message || item.detail;
      if (typeof message !== 'string') return formatErrorMessage(message);
      const location = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== 'body').join('.')
        : '';
      return location ? `${location}: ${message}` : message;
    }).filter(Boolean);
    return messages.join('\n') || JSON.stringify(value);
  }
  if (value && typeof value === 'object') {
    const nested = value.detail || value.message || value.error || value.msg;
    if (nested !== undefined) return formatErrorMessage(nested);
    return JSON.stringify(value);
  }
  return '';
}

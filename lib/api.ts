const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LogFile {
  id: number;
  original_filename: string;
  file_size: number;
  upload_date: string;
  status: string;
}

export interface LogEntry {
  id?: number;
  log_file_id?: number;
  timestamp: string;
  ip_address: string;
  event_description: string;
  status: string;
  confidence_score?: number;
  explanation?: string;
  threat_level?: string;
  recommended_action?: string;
  raw_log_line?: string;
  log_type?: string;
}

// Helper function to get auth token from localStorage
let __authToken: string | null = null;
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Check localStorage first, then fall back to memory
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      __authToken = storedToken;
    }
  }
  return __authToken;
};

// Helper function to set auth token in localStorage
const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    __authToken = token;
  }
};

// Helper function to remove auth token from localStorage
const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    __authToken = null;
  }
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Authentication API functions
export const authAPI = {
  signup: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    return response;
  },

  getCurrentUser: async (): Promise<User> => {
    return apiRequest<User>('/auth/me');
  },

  logout: (): void => {
    removeAuthToken();
  },

  isAuthenticated: (): boolean => {
    return getAuthToken() !== null;
  },
};

// Logs API functions
export const logsAPI = {
  uploadFile: async (file: File): Promise<{ message: string; file: any }> => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('logFile', file);

    const response = await fetch(`${API_BASE_URL}/logs/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  getFiles: async (): Promise<{ files: LogFile[] }> => {
    return apiRequest<{ files: LogFile[] }>('/logs/files');
  },

  getAnalysis: async (fileId: number): Promise<{ entries: LogEntry[] }> => {
    return apiRequest<{ entries: LogEntry[] }>(`/logs/analysis/${fileId}`);
  },

  // Re-analyze log entries with AI
  reanalyzeFile: async (fileId: number): Promise<{ message: string; analyzedEntries: number; anomaliesFound: number }> => {
    return apiRequest<{ message: string; analyzedEntries: number; anomaliesFound: number }>(`/logs/reanalyze/${fileId}`, {
      method: 'POST'
    });
  },

  // Delete log file and all associated analysis data
  deleteFile: async (fileId: number): Promise<{ message: string; deletedFileId: number }> => {
    return apiRequest<{ message: string; deletedFileId: number }>(`/logs/files/${fileId}`, {
      method: 'DELETE'
    });
  },
}; 
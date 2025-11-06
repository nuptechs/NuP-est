// API Client for connecting to the Express backend
const API_BASE_URL = import.meta.env.MODE === 'development' ? '' : '';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Get token from localStorage if it exists
    this.token = localStorage.getItem('nup_aim_auth_token');
  }

  setAuthToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('nup_aim_auth_token', token);
    } else {
      localStorage.removeItem('nup_aim_auth_token');
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check if response has content
      const contentType = response.headers.get('content-type');
      const hasJsonContent = contentType && contentType.includes('application/json');
      
      let data: any = null;
      
      // Only try to parse JSON if we have JSON content
      if (hasJsonContent) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
              success: false,
              error: 'Invalid JSON response from server',
            };
          }
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    profileId: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyEmail(token: string) {
    return this.request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerificationEmail(email: string) {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Data endpoints
  async getProfiles() {
    return this.request('/api/profiles');
  }

  async getProjects() {
    return this.request('/api/projects');
  }

  async createProject(projectData: any) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getAnalyses() {
    return this.request('/api/analyses');
  }

  async createAnalysis(analysisData: any) {
    return this.request('/api/analyses', {
      method: 'POST',
      body: JSON.stringify(analysisData),
    });
  }

  async updateAnalysis(id: string, analysisData: any) {
    return this.request(`/api/analyses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(analysisData),
    });
  }

  async deleteAnalysis(id: string) {
    return this.request(`/api/analyses/${id}`, {
      method: 'DELETE',
    });
  }

  // Initialize database (for development)
  async initializeDatabase() {
    return this.request('/api/db/init', {
      method: 'POST',
    });
  }

  // Logout (clear token)
  logout() {
    this.setAuthToken(null);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
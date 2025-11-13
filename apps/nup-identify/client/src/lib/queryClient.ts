import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Create query client for authentication management
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return apiRequest(url);
      },
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// API request helper
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem("accessToken");
  
  // Prefix URL with BASE_URL to support reverse proxy deployment
  // In development with proxy: BASE_URL = "/nup-identify"
  // In standalone mode: BASE_URL = "/"
  const baseUrl = (import.meta.env.VITE_BASE_PREFIX as string | undefined) || import.meta.env.BASE_URL || '/';
  const fullUrl = url.startsWith('/') 
    ? `${baseUrl.replace(/\/$/, '')}${url}` 
    : url;
  
  console.log('[API] Request:', {
    originalUrl: url,
    baseUrl,
    fullUrl,
    method: options.method || 'GET'
  });
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add authorization header if token exists
  if (token && !url.includes("/login") && !url.includes("/register")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  console.log('[API] Response:', {
    url: fullUrl,
    status: response.status,
    ok: response.ok
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Zod validation schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Auth types
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

// Auth API functions
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  
  // Store tokens and user in localStorage
  if (response.accessToken) {
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.user));
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }
  
  return response;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  
  // Store tokens and user in localStorage
  if (response.accessToken) {
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.user));
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }
  
  return response;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (refreshToken) {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // Ignore logout errors
    });
  }
  
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  queryClient.clear();
}

export async function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("accessToken");
}

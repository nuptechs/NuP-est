// Shared types for NuP-AIM application
// This file contains types used across both client and server

export interface User {
  id: string;
  username: string;
  email: string;
  profileId: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Re-export database types from server schema if needed
// import type { User as DBUser } from '../server/schema';

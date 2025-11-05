// User types - will be populated from shared/schema.ts
export interface User {
  id: string;
  username: string;
  email?: string;
  isAdmin: boolean;
}

export interface UserProfile {
  userId: string;
  learningDifficulties?: string[];
  learningObjectives?: string[];
  tdah?: boolean;
}

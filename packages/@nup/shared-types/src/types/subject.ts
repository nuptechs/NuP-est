// Subject types
export interface Subject {
  id: string;
  userId: string;
  name: string;
  category?: string | null;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Material types
export interface Material {
  id: string;
  userId: string;
  subjectId?: string | null;
  title: string;
  type: 'pdf' | 'text' | 'video' | 'audio' | 'other';
  content?: string | null;
  filePath?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

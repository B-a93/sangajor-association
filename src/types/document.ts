export type DocumentCategory = 'meeting_minutes' | 'policy' | 'report' | 'form' | 'resource';
export type DocumentAudience = 'all_members' | 'executives';
export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface KnowledgeDocument {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  audience: DocumentAudience;
  status: DocumentStatus;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  version: number;
  document_key: string;
  meeting_date: string | null;
  published_at: string | null;
  created_at: string;
  created_by: string;
}

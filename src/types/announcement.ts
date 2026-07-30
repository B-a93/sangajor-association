export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementAudience = 'all_members' | 'executives';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type AnnouncementRead = { announcement_id: string; member_id: string; read_at: string };

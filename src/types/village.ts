export type VillagePost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  category: VillageCategory;
  image_url: string | null;
  author: { full_name: string; avatar_url: string | null } | null;
  village_reactions: Array<{ member_id: string }>;
  village_comments: Array<{ id: string }>;
  village_bookmarks: Array<{ member_id: string }>;
};

export type VillageCategory = 'update' | 'celebration' | 'opportunity' | 'memory';

export type VillageComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
};

export type VillageNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  post_id: string | null;
  kind: 'reaction' | 'comment' | 'moderation';
  read_at: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

export type VillageReport = {
  id: string;
  post_id: string;
  reason: 'privacy' | 'harassment' | 'misinformation' | 'other';
  details: string | null;
  status: 'open' | 'reviewed' | 'resolved';
  resolution_note: string | null;
  created_at: string;
  reporter: { full_name: string } | null;
  post: { body: string; author: { full_name: string } | null } | null;
};

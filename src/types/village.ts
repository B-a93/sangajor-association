export type VillagePost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
  village_reactions: Array<{ member_id: string }>;
  village_comments: Array<{ id: string }>;
};

export type VillageComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { full_name: string } | null;
};

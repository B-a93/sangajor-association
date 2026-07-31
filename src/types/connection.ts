export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export type ConnectionProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
};

export type MemberConnection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  requester: ConnectionProfile;
  recipient: ConnectionProfile;
};

export type ConnectionMessage = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

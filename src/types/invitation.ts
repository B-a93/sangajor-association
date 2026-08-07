export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type Invitation = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  membership_number: string | null;
  role: string;
  executive_office: string | null;
  executive_position: string | null;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

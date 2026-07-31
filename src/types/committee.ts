export type CommitteeStatus = 'active' | 'inactive';
export type CommitteeRole = 'chair' | 'secretary' | 'member';
export type OpportunityStatus = 'draft' | 'open' | 'closed' | 'completed';
export type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export interface Committee {
  id: string;
  name: string;
  description: string;
  status: CommitteeStatus;
  created_at: string;
}

export interface CommitteeMembership {
  id: string;
  committee_id: string;
  member_id: string;
  role: CommitteeRole;
  joined_at: string;
  profiles?: { full_name: string; membership_number: string | null } | null;
}

export interface VolunteerOpportunity {
  id: string;
  committee_id: string | null;
  title: string;
  description: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: OpportunityStatus;
  committees?: { name: string } | null;
}

export interface VolunteerApplication {
  id: string;
  opportunity_id: string;
  member_id: string;
  note: string | null;
  status: ApplicationStatus;
  hours_served: number;
  profiles?: { full_name: string; membership_number: string | null } | null;
}

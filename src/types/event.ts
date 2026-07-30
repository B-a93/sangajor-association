export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendanceResponse = 'going' | 'not_going';

export type AssociationEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  capacity: number | null;
  status: EventStatus;
};

export type Attendance = {
  event_id: string;
  member_id: string;
  response: AttendanceResponse;
  checked_in_at: string | null;
};

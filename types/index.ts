export type UserRole = 'parent' | 'child';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  parent_id: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  subject: string;
  due_date: string; // ISO date string YYYY-MM-DD
  description: string;
  image_url: string | null;
  status: 'pending' | 'done';
  created_at: string;
  // joined
  user?: UserProfile;
}

export interface AnalyzeResult {
  subject: string;
  due_date: string;
  description: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    assignment: Assignment;
  };
}

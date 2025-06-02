
import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface TimetableEvent {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID of the student
  title: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // Format "HH:MM" e.g., "09:00"
  endTime: string;   // Format "HH:MM" e.g., "10:30"
  description?: string;
  createdAt?: Timestamp | FieldValue;
}

// For AI Flow
export interface OrganizeTimeEventInput {
  title: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface OrganizeTimeInput {
  events: OrganizeTimeEventInput[];
  userGoals?: string;
}

export interface OrganizeTimeOutput {
  suggestions: string[];
}

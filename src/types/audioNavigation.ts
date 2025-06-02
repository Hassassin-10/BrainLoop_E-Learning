
import type { Timestamp } from 'firebase/firestore';

export interface AudioNavigationSettings {
  isEnabled: boolean;
  preferredLanguage: string; // e.g., 'en-US'
}

export interface AudioNavLog {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  commandText: string;
  actionTaken: string; // e.g., 'navigate_dashboard', 'qa_attempt', 'playback_play'
  details?: Record<string, any>; // Additional details about the action
  timestamp: Timestamp;
}

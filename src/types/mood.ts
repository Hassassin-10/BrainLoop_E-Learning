
import type { Timestamp, FieldValue } from 'firebase/firestore';

export type MoodOption = 'Motivated' | 'Neutral' | 'Unmotivated';

export interface MoodLog {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  courseId: string;
  moduleId: string;
  mood: MoodOption;
  timestamp: Timestamp | FieldValue;
}

export interface BoostLog {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  courseId: string;
  moduleId: string;
  gameType: string; // e.g., "click_challenge"
  completed: boolean; // Whether the game was completed or timer ran out
  moodBefore: MoodOption;
  timestamp: Timestamp | FieldValue;
}

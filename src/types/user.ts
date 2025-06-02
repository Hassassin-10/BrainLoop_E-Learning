
import type { Timestamp, FieldValue } from 'firebase/firestore';
import type { AudioNavigationSettings } from './audioNavigation'; 
import type { MoodOption } from './mood'; // Added mood import

export interface AllowedStudent {
  name: string;
  email: string;
  // any other relevant fields for an allowed student
}

export interface StudentProfileQuizAttempt {
  quizId: string;
  score: number;
  attemptedAt: Timestamp;
}

export interface StudentProfileMoodSettings {
  disableMoodCheck?: boolean;
}

export interface StudentProfile {
  uid: string; // Firebase Auth UID
  studentId: string;
  name: string;
  email: string;
  coursesCompleted: string[]; // Array of course IDs, for quick listing of completed courses
  quizzesAttempted: StudentProfileQuizAttempt[];
  enrolledCourseIds?: string[]; // Optional: Array of course IDs student has access to
  lastLogin: Timestamp;
  createdAt: Timestamp;
  fcmTokens?: string[]; // To store FCM registration tokens for push notifications
  audioNavSettings?: AudioNavigationSettings; 
  moodSettings?: StudentProfileMoodSettings; // Added mood settings
}

// New type for the subcollection document students/{userId}/courses/{courseId}
export interface UserCourseProgress {
  completed: boolean;
  progress: number; // e.g., 0-100
  lastAccessed: Timestamp;
}

// Type for updating course progress. lastAccessed is handled by the service.
export type UserCourseProgressUpdate = Omit<UserCourseProgress, 'lastAccessed'>;

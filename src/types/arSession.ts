import type { Timestamp } from 'firebase/firestore';

export interface ARSessionLog {
  id?: string; // Firestore document ID, auto-generated
  studentId: string; // Firebase Auth UID of the student
  studentProfileId?: string; // The student's application-specific ID (e.g., "8918")
  courseId: string;
  moduleId: string;
  toolUsed: string; // e.g., "phet", "falstad", "ophysics"
  url: string; // The URL of the AR lab launched
  launchedAt: Timestamp;
}

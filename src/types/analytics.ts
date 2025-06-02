import type { Timestamp } from 'firebase/firestore';

export interface SkippedSegment {
  start: number; // seconds
  end: number;   // seconds
}

export interface LearningStat {
  // id field is the document ID: {courseId}_{moduleId}
  userId: string; // Firebase Auth UID
  courseId: string;
  moduleId: string;
  watchDurationSeconds?: number; // Total time spent watching this module's video
  completionPercentage?: number; // 0-100, calculated based on watchDuration vs videoLength
  skippedSegments?: SkippedSegment[];
  pausePointsSeconds?: number[]; // Timestamps in video where user paused
  doubtsRaisedIds?: string[]; // Array of doubt IDs raised by this user for this module
  lastAccessed: Timestamp; // Last time this module was accessed/interacted with
  updatedAt: Timestamp; // Last time this stat document was updated
}

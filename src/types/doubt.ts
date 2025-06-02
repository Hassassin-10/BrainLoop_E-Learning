import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface DoubtReply {
  id: string; // Client-generated or Firestore-generated if subcollection
  text: string;
  senderId: string; // Student ID (e.g., "8918")
  senderName: string; // Denormalized for display
  timestamp: Timestamp; // Replies will use client-side Timestamps or resolved server timestamps
}

export interface DoubtMessage {
  id: string; // Firestore document ID
  text: string;
  senderId: string; // Student ID (e.g., "8918")
  senderName: string; // Denormalized for display
  timestamp: Timestamp | FieldValue; // Allow FieldValue for writes
  videoTimestamp?: number; // Optional: time in seconds in the video where doubt was raised
  pinned: boolean;
  replies: DoubtReply[]; // Array of replies
  moduleId: string; // To associate with the module
  courseId: string; // To associate with the course
  likes?: string[]; // Array of studentUids who liked this doubt
  upvoteCount?: number; // Alternative: just a counter
}

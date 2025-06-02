import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface LiveMeeting {
  id: string; // Firestore document ID
  courseId: string;
  moduleId: string;
  title?: string; // Optional title for the meeting
  createdBy: string; // Student ID of creator (e.g., "8918")
  startedAt: Timestamp | FieldValue;
  endedAt?: Timestamp | FieldValue;
  isActive: boolean;
  // participants array might be removed if using presence subcollection as primary source
  jitsiRoomName: string; // e.g., brainloop-course1-mod1-{random_suffix}
}

export interface MeetingParticipant {
  studentId: string; // e.g. "8918"
  name: string; // Denormalized student name
  joinedAt: Timestamp | FieldValue;
  leftAt?: Timestamp | FieldValue;
  isHost?: boolean; // If the participant is the host/creator
  isMuted?: boolean; // For future audio control features
}

export interface MeetingChatMessage {
  id: string; // Firestore document ID
  senderId: string; // Student ID (e.g. "8918")
  senderName: string;
  text: string;
  timestamp: Timestamp | FieldValue;
  pinned: boolean;
}

export interface MeetingSummary {
  id: string; // roomId
  roomId: string;
  courseId: string;
  moduleId: string;
  meetingTitle?: string;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationMinutes?: number;
  attendance: { studentId: string, name: string, joinedAt: Timestamp, leftAt?: Timestamp }[];
  chatTranscript: MeetingChatMessage[];
  pinnedMessages: MeetingChatMessage[];
  generatedAt: Timestamp | FieldValue;
}

export interface CreateMeetingData {
    courseId: string;
    moduleId: string;
    title?: string;
}

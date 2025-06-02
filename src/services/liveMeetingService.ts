'use client'; // Can be 'use server' if all functions are server actions

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue,
  arrayUnion,
  arrayRemove,
  firebaseInitializationError, 
} from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  type Unsubscribe,
  type FirestoreError,
} from 'firebase/firestore';
import type {
  LiveMeeting,
  MeetingParticipant,
  MeetingChatMessage,
  MeetingSummary,
  CreateMeetingData
} from '@/types/liveMeeting';
import { v4 as uuidv4 } from 'uuid'; 

const LIVE_MEETINGS_COLLECTION = 'liveMeetings';
const PRESENCE_SUBCOLLECTION = 'presence';
const CHAT_SUBCOLLECTION = 'chat';
const SUMMARY_SUBCOLLECTION = 'summary'; 

// --- Meeting Management ---
export async function createLiveMeeting(
  courseId: string,
  moduleId: string,
  createdByStudentId: string,
  title?: string
): Promise<string> {
  if (!courseId || !moduleId || !createdByStudentId) {
    throw new Error('Course ID, Module ID, and Creator ID are required.');
  }
  if (createdByStudentId !== '8918') { // Ensure only admin can create
    throw new Error('Only Admin (ID: 8918) can create meetings.');
  }

  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot create live meeting.");
    throw new Error('Firestore is not available.');
  }

  const jitsiRoomName = `brainloop-${courseId}-${moduleId}-${uuidv4().substring(0, 8)}`;

  const meetingData: Omit<LiveMeeting, 'id' | 'startedAt'> & { startedAt: FieldValue } = {
    courseId,
    moduleId,
    title: title || `Live Session for ${moduleId}`,
    createdBy: createdByStudentId,
    startedAt: firestoreServerTimestamp(),
    isActive: true,
    jitsiRoomName,
  };

  const docRef = await addDoc(collection(db, LIVE_MEETINGS_COLLECTION), meetingData);
  console.log(`Live meeting created with ID: ${docRef.id}, Jitsi room: ${jitsiRoomName}`);
  return docRef.id;
}

export async function getLiveMeeting(roomId: string): Promise<LiveMeeting | null> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot get live meeting.");
    return null;
  }
  if (!roomId) return null;
  const docRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as LiveMeeting;
  }
  return null;
}

export function getAllActiveLiveMeetings(
  callback: (meetings: LiveMeeting[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot fetch live meetings.");
    onError({ code: 'unavailable', message: 'Firestore is not available.' } as FirestoreError);
    return () => {};
  }

  // MODIFIED QUERY: Requires only a single-field index on 'isActive' (often auto-created).
  // This is a workaround if the composite index (isActive ASC, startedAt DESC)
  // cannot be created immediately or is causing issues.
  //
  // FOR OPTIMAL PERFORMANCE and correct ordering from the backend,
  // ensure the following composite index is created in Firebase Firestore:
  // Collection: liveMeetings
  // Fields:
  // 1. isActive (Ascending)
  // 2. startedAt (Descending)
  // You can usually create this index via the link provided in Firebase console error messages.
  const q = query(
    collection(db, LIVE_MEETINGS_COLLECTION),
    where('isActive', '==', true)
    // orderBy('startedAt', 'desc') // Temporarily removed to simplify index needs.
                                      // Client-side sorting is now applied below.
  );

  return onSnapshot(q, (querySnapshot) => {
    const meetings = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LiveMeeting));
    // Client-side sorting as orderBy was removed from the query
    meetings.sort((a, b) => {
      const timeA = a.startedAt instanceof Timestamp ? a.startedAt.toMillis() : 0;
      const timeB = b.startedAt instanceof Timestamp ? b.startedAt.toMillis() : 0;
      return timeB - timeA; // Sort descending by start time (newest first)
    });
    callback(meetings);
  }, onError);
}


export function getLiveMeetingsForCourseModule(
  courseId: string,
  moduleId: string,
  callback: (meetings: LiveMeeting[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
   if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot fetch live meetings for course module.");
    onError({ code: 'unavailable', message: 'Firestore is not available.' } as FirestoreError);
    return () => {};
  }
  // This query will require a composite index: courseId ASC, moduleId ASC, isActive ASC, startedAt DESC
  // Or, remove orderBy and sort client-side if index creation is an issue.
  const q = query(
    collection(db, LIVE_MEETINGS_COLLECTION),
    where('courseId', '==', courseId),
    where('moduleId', '==', moduleId),
    where('isActive', '==', true),
    orderBy('startedAt', 'desc') 
  );

  return onSnapshot(q, (querySnapshot) => {
    const meetings = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LiveMeeting));
    callback(meetings);
  }, onError);
}


export async function endLiveMeeting(roomId: string, currentUserId: string): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot end live meeting.");
    throw new Error('Firestore is not available.');
  }
  const meetingDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId);
  const meeting = await getLiveMeeting(roomId);

  if (!meeting) throw new Error("Meeting not found.");
  
  if (currentUserId !== '8918') { // Check if current user is the admin
    throw new Error('Only Admin (ID: 8918) can end the meeting.');
  }

  await updateDoc(meetingDocRef, {
    isActive: false,
    endedAt: firestoreServerTimestamp(),
  });
}

// --- Participant Presence Management ---
export async function joinMeeting(roomId: string, studentId: string, studentName: string): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot join meeting.");
    throw new Error('Firestore is not available.');
  }
  const presenceDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId, PRESENCE_SUBCOLLECTION, studentId);
  await setDoc(presenceDocRef, {
    studentId,
    name: studentName,
    joinedAt: firestoreServerTimestamp(),
    active: true,
  });
}

export async function leaveMeeting(roomId: string, studentId: string): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot leave meeting.");
    throw new Error('Firestore is not available.');
  }
  const presenceDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId, PRESENCE_SUBCOLLECTION, studentId);
  await updateDoc(presenceDocRef, {
    active: false,
    leftAt: firestoreServerTimestamp(),
  });
}

export function getMeetingParticipants(
  roomId: string,
  callback: (participants: MeetingParticipant[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot get meeting participants.");
     onError({ code: 'unavailable', message: 'Firestore is not available.' } as FirestoreError);
    return () => {};
  }
  const q = query(collection(db, LIVE_MEETINGS_COLLECTION, roomId, PRESENCE_SUBCOLLECTION), where('active', '==', true));
  return onSnapshot(q, (querySnapshot) => {
    const participants = querySnapshot.docs.map(docSnap => ({ studentId: docSnap.id, ...docSnap.data() } as MeetingParticipant));
    callback(participants);
  }, onError);
}


// --- Chat Management ---
export async function sendMeetingChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<string> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot send chat message.");
    throw new Error('Firestore is not available.');
  }
  if (!roomId || !senderId || !text.trim()) {
    throw new Error('Room ID, Sender ID, and message text are required.');
  }
  const chatData: Omit<MeetingChatMessage, 'id' | 'timestamp'> & { timestamp: FieldValue, pinned: boolean } = {
    senderId,
    senderName,
    text,
    timestamp: firestoreServerTimestamp(),
    pinned: false,
  };
  const chatCollectionRef = collection(db, LIVE_MEETINGS_COLLECTION, roomId, CHAT_SUBCOLLECTION);
  const docRef = await addDoc(chatCollectionRef, chatData);
  return docRef.id;
}

export function getMeetingChatMessages(
  roomId: string,
  callback: (messages: MeetingChatMessage[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot get chat messages.");
    onError({ code: 'unavailable', message: 'Firestore is not available.' } as FirestoreError);
    return () => {};
  }
  const q = query(collection(db, LIVE_MEETINGS_COLLECTION, roomId, CHAT_SUBCOLLECTION), orderBy('timestamp', 'asc'));
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MeetingChatMessage));
    callback(messages);
  }, onError);
}

export async function pinMeetingChatMessage(
  roomId: string,
  messageId: string,
  pinned: boolean,
  currentUserId: string 
): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot pin chat message.");
    throw new Error('Firestore is not available.');
  }
  const meeting = await getLiveMeeting(roomId);
  if (!meeting) throw new Error("Meeting not found.");

  if (currentUserId !== '8918') { // Only Admin 8918 can pin
    throw new Error(`Only Admin (ID: 8918) can pin messages.`);
  }
  const messageDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId, CHAT_SUBCOLLECTION, messageId);
  await updateDoc(messageDocRef, { pinned });
}

// --- Summary (Conceptual - Generation would be a backend function) ---
export async function getMeetingSummary(roomId: string): Promise<MeetingSummary | null> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot get meeting summary.");
    return null;
  }
  const summaryDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId, SUMMARY_SUBCOLLECTION, 'details'); 
  const docSnap = await getDoc(summaryDocRef);
  if (docSnap.exists()) {
    return { id: roomId, ...docSnap.data() } as MeetingSummary;
  }
  return null;
}

export async function saveMeetingSummary(roomId: string, summaryData: Omit<MeetingSummary, 'id' | 'generatedAt'> & {generatedAt: FieldValue}): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot save meeting summary.");
    throw new Error('Firestore is not available.');
  }
  const summaryDocRef = doc(db, LIVE_MEETINGS_COLLECTION, roomId, SUMMARY_SUBCOLLECTION, 'details');
  await setDoc(summaryDocRef, { roomId, ...summaryData });
}

export async function deleteLiveMeeting(roomId: string, currentUserId: string): Promise<void> {
  if (firebaseInitializationError || !db) {
    console.error("Firestore is not initialized. Cannot delete live meeting.");
    throw new Error('Firestore is not available.');
  }
  const meeting = await getLiveMeeting(roomId);
  if (!meeting) throw new Error("Meeting not found.");

  if (currentUserId !== '8918') { // Only Admin 8918 can delete
    throw new Error(`Only Admin (ID: 8918) can delete the meeting.`);
  }
  
  await deleteDoc(doc(db, LIVE_MEETINGS_COLLECTION, roomId));
}

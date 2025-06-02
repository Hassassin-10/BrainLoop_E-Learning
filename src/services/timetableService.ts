
'use client';

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue,
  STUDENTS_COLLECTION, // Changed from USERS_COLLECTION
} from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
  type FirestoreError,
} from 'firebase/firestore';
import type { TimetableEvent } from '@/types/timetable';

// const USERS_COLLECTION = 'users'; // Replaced by STUDENTS_COLLECTION from firebase lib
const TIMETABLE_EVENTS_SUBCOLLECTION = 'timetableEvents';

/**
 * Adds a new timetable event for a user.
 */
export async function addTimetableEvent(
  userId: string,
  eventData: Omit<TimetableEvent, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!userId) throw new Error('User ID is required to add a timetable event.');
  console.log(`[TimetableService] Attempting to add event for userId: ${userId}`, eventData);

  const eventPayload: Omit<TimetableEvent, 'id'> = {
    ...eventData,
    userId,
    createdAt: firestoreServerTimestamp(),
  };

  const eventsCollectionPath = `${STUDENTS_COLLECTION}/${userId}/${TIMETABLE_EVENTS_SUBCOLLECTION}`;
  console.log(`[TimetableService] Writing to path: ${eventsCollectionPath}`);
  const eventsCollectionRef = collection(db, STUDENTS_COLLECTION, userId, TIMETABLE_EVENTS_SUBCOLLECTION);
  try {
    const docRef = await addDoc(eventsCollectionRef, eventPayload);
    console.log(`[TimetableService] Event added with ID: ${docRef.id} at path ${eventsCollectionPath}/${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('[TimetableService] Error adding timetable event:', error);
    throw new Error('Failed to add timetable event.');
  }
}

/**
 * Updates an existing timetable event for a user.
 */
export async function updateTimetableEvent(
  userId: string,
  eventId: string,
  eventUpdates: Partial<Omit<TimetableEvent, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (!userId || !eventId) throw new Error('User ID and Event ID are required to update a timetable event.');
  console.log(`[TimetableService] Attempting to update event for userId: ${userId}, eventId: ${eventId}`, eventUpdates);
  const eventDocPath = `${STUDENTS_COLLECTION}/${userId}/${TIMETABLE_EVENTS_SUBCOLLECTION}/${eventId}`;
  console.log(`[TimetableService] Updating at path: ${eventDocPath}`);
  const eventDocRef = doc(db, STUDENTS_COLLECTION, userId, TIMETABLE_EVENTS_SUBCOLLECTION, eventId);
  try {
    await setDoc(eventDocRef, eventUpdates, { merge: true });
    console.log(`[TimetableService] Event ${eventId} updated successfully.`);
  } catch (error) {
    console.error('[TimetableService] Error updating timetable event:', error);
    throw new Error('Failed to update timetable event.');
  }
}

/**
 * Deletes a timetable event for a user.
 */
export async function deleteTimetableEvent(userId: string, eventId: string): Promise<void> {
  if (!userId || !eventId) throw new Error('User ID and Event ID are required to delete a timetable event.');
  console.log(`[TimetableService] Attempting to delete event for userId: ${userId}, eventId: ${eventId}`);
  const eventDocPath = `${STUDENTS_COLLECTION}/${userId}/${TIMETABLE_EVENTS_SUBCOLLECTION}/${eventId}`;
  console.log(`[TimetableService] Deleting at path: ${eventDocPath}`);
  const eventDocRef = doc(db, STUDENTS_COLLECTION, userId, TIMETABLE_EVENTS_SUBCOLLECTION, eventId);
  try {
    await deleteDoc(eventDocRef);
    console.log(`[TimetableService] Event ${eventId} deleted successfully.`);
  } catch (error) {
    console.error('[TimetableService] Error deleting timetable event:', error);
    throw new Error('Failed to delete timetable event.');
  }
}

/**
 * Fetches timetable events for a user in real-time.
 */
export function getTimetableEvents(
  userId: string,
  callback: (events: TimetableEvent[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  if (!userId) {
    onError({ code: 'invalid-argument', message: 'User ID is required.' } as FirestoreError);
    return () => {};
  }
  const eventsCollectionPath = `${STUDENTS_COLLECTION}/${userId}/${TIMETABLE_EVENTS_SUBCOLLECTION}`;
  console.log(`[TimetableService] Setting up listener for path: ${eventsCollectionPath}`);

  const eventsCollectionRef = collection(db, STUDENTS_COLLECTION, userId, TIMETABLE_EVENTS_SUBCOLLECTION);
  // Order by day of week (custom sort might be needed on client if string order isn't ideal) then by start time
  const q = query(eventsCollectionRef, orderBy('dayOfWeek'), orderBy('startTime'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      console.log(`[TimetableService] Snapshot received for ${eventsCollectionPath}. Docs count: ${querySnapshot.docs.length}`);
      const events: TimetableEvent[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        // Handle potential Timestamp serialization issues if data comes from cache or server differently
        let createdAtProcessed;
        if (data.createdAt instanceof Timestamp) {
          createdAtProcessed = data.createdAt;
        } else if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
          // Convert Firebase-like timestamp objects to actual Timestamp instances if needed,
          // or to Date objects for client-side processing. For simplicity, keeping as is if toDate exists.
          createdAtProcessed = data.createdAt;
        } else {
          createdAtProcessed = undefined; // Or new Timestamp(0,0) if you need a placeholder
        }

        return {
          id: docSnap.id,
          ...data,
          createdAt: createdAtProcessed, // Ensure createdAt is consistently handled
        } as TimetableEvent;
      });
      callback(events);
    },
    (error) => {
      console.error(`[TimetableService] Error fetching timetable events from ${eventsCollectionPath}:`, error);
      onError(error);
    }
  );
  return unsubscribe;
}

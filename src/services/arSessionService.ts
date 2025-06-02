'use server';

import { db, firestoreServerTimestamp, type Timestamp } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { ARSessionLog } from '@/types/arSession';

const AR_SESSIONS_COLLECTION = 'arSessions';

/**
 * Logs the launch of an AR lab session to Firestore.
 *
 * @param userId The Firebase Auth UID of the student.
 * @param studentProfileId The application-specific student ID (e.g., "8918").
 * @param courseId The ID of the course.
 * @param moduleId The ID of the module.
 * @param toolUsed A string identifying the AR tool/platform (e.g., "phet").
 * @param url The URL of the AR lab that was launched.
 * @returns A promise that resolves to the ID of the new log document.
 */
export async function logArSessionLaunch(
  userId: string,
  studentProfileId: string | null,
  courseId: string,
  moduleId: string,
  toolUsed: string,
  url: string
): Promise<string> {
  if (!userId || !courseId || !moduleId || !toolUsed || !url) {
    throw new Error('All parameters are required to log AR session launch.');
  }

  const sessionData: Omit<ARSessionLog, 'id' | 'launchedAt'> & { launchedAt: Timestamp } = {
    studentId: userId,
    ...(studentProfileId && { studentProfileId }),
    courseId,
    moduleId,
    toolUsed,
    url,
    launchedAt: firestoreServerTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, AR_SESSIONS_COLLECTION), sessionData);
    console.log(`AR session launch logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error logging AR session launch to Firestore:', error);
    throw new Error('Failed to log AR session launch.');
  }
}

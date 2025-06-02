'use server';

import { db, STUDENTS_COLLECTION, firestoreServerTimestamp, type Timestamp } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { LearningStat } from '@/types/analytics';

const LEARNING_STATS_SUBCOLLECTION = 'learningStats';

/**
 * Logs or updates a student's learning statistics for a specific course module.
 * The stat document ID will be `${courseId}_${moduleId}`.
 *
 * @param userId The Firebase Auth UID of the student.
 * @param courseId The ID of the course.
 * @param moduleId The ID of the module.
 * @param statData An object containing fields to update from LearningStat (e.g., watchDuration, doubtsRaisedIds).
 *                 `lastAccessed` and `updatedAt` will be automatically set to the server timestamp.
 * @returns A promise that resolves when the stat is successfully updated/created.
 */
export async function logLearningStat(
  userId: string,
  courseId: string,
  moduleId: string,
  statData: Partial<Omit<LearningStat, 'userId' | 'courseId' | 'moduleId' | 'lastAccessed' | 'updatedAt'>>
): Promise<void> {
  if (!userId || !courseId || !moduleId) {
    throw new Error('User ID, Course ID, and Module ID are required to log learning stats.');
  }

  const statDocId = `${courseId}_${moduleId}`;
  // Path: students/{userId}/learningStats/{courseId}_{moduleId}
  const learningStatDocRef = doc(
    db,
    STUDENTS_COLLECTION,
    userId,
    LEARNING_STATS_SUBCOLLECTION,
    statDocId
  );

  const dataToSet: Partial<LearningStat> & { lastAccessed: Timestamp, updatedAt: Timestamp, userId: string, courseId: string, moduleId: string } = {
    userId, // Ensure these are always part of the document
    courseId,
    moduleId,
    ...statData,
    lastAccessed: firestoreServerTimestamp() as Timestamp,
    updatedAt: firestoreServerTimestamp() as Timestamp,
  };

  try {
    // Use setDoc with merge:true to create the document if it doesn't exist,
    // or update it if it does.
    await setDoc(learningStatDocRef, dataToSet, { merge: true });
    console.log(`Learning stat for user ${userId}, module ${moduleId} in course ${courseId} logged successfully.`);
  } catch (error) {
    console.error('Error logging learning stat to Firestore:', error);
    throw new Error('Failed to log learning stat.');
  }
}

/**
 * Retrieves a student's learning statistics for a specific course module.
 *
 * @param userId The Firebase Auth UID of the student.
 * @param courseId The ID of the course.
 * @param moduleId The ID of the module.
 * @returns A promise that resolves to the LearningStat object or null if not found.
 */
export async function getLearningStat(
  userId: string,
  courseId: string,
  moduleId: string
): Promise<LearningStat | null> {
  if (!userId || !courseId || !moduleId) {
    throw new Error('User ID, Course ID, and Module ID are required to get learning stats.');
  }
  const statDocId = `${courseId}_${moduleId}`;
  const learningStatDocRef = doc(
    db,
    STUDENTS_COLLECTION,
    userId,
    LEARNING_STATS_SUBCOLLECTION,
    statDocId
  );

  try {
    const docSnap = await getDoc(learningStatDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as LearningStat;
    }
    return null;
  } catch (error) {
    console.error('Error fetching learning stat from Firestore:', error);
    throw new Error('Failed to fetch learning stat.');
  }
}

// Example Usage (can be called from a server action or another service after a video event):
/*
async function userWatchedVideoSegment(userId: string, courseId: string, moduleId: string, durationWatched: number) {
  await logLearningStat(userId, courseId, moduleId, {
    watchDurationSeconds: durationWatched, // This would likely be an increment
  });
}

async function userRaisedDoubtInModule(userId: string, courseId: string, moduleId: string, doubtId: string) {
  const currentStats = await getLearningStat(userId, courseId, moduleId);
  const existingDoubts = currentStats?.doubtsRaisedIds || [];
  await logLearningStat(userId, courseId, moduleId, {
    doubtsRaisedIds: [...existingDoubts, doubtId]
  });
}
*/

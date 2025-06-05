"use server";

import {
  db,
  firestoreServerTimestamp,
  STUDENTS_COLLECTION,
} from "@/lib/firebase";
import {
  doc,
  setDoc,
  type Timestamp,
  type Firestore,
} from "firebase/firestore";
import type { UserCourseProgressUpdate } from "@/types/user";

export const USER_COURSE_PROGRESS_SUBCOLLECTION = "courses";

/**
 * Updates or creates a student's progress for a specific course.
 * The progress is stored in a subcollection `courses` under the student's document.
 *
 * @param userId The ID of the student (Firebase Auth UID).
 * @param courseId The ID of the course. This will be used as the document ID in the subcollection.
 * @param progressData An object containing fields to update (e.g., completed, progress).
 *                     `lastAccessed` will be automatically set to the server timestamp.
 * @returns A promise that resolves when the progress is successfully updated/created.
 */
export async function updateUserCourseProgress(
  userId: string,
  courseId: string,
  progressData: Partial<UserCourseProgressUpdate>
): Promise<void> {
  if (!userId || !courseId) {
    throw new Error(
      "User ID and Course ID are required to update course progress."
    );
  }

  if (!db) {
    throw new Error("Firestore instance is not initialized.");
  }

  // Path: students/{userId}/courses/{courseId}
  const courseProgressDocRef = doc(
    db as Firestore,
    STUDENTS_COLLECTION,
    userId,
    USER_COURSE_PROGRESS_SUBCOLLECTION,
    courseId
  );

  const dataToSet: Partial<UserCourseProgressUpdate> & {
    lastAccessed: Timestamp;
  } = {
    ...progressData,
    lastAccessed: firestoreServerTimestamp() as Timestamp, // Ensure correct type casting
  };

  try {
    // Use setDoc with merge:true to create the document if it doesn't exist,
    // or update it if it does.
    await setDoc(courseProgressDocRef, dataToSet, { merge: true });
    console.log(
      `Course progress for user ${userId}, course ${courseId} updated successfully.`
    );
  } catch (error) {
    console.error("Error updating course progress in Firestore:", error);
    throw new Error("Failed to update course progress.");
  }
}

// Example Usage (can be called from a server action or another service):
/*
async function markModuleAsComplete(userId: string, courseId: string, currentProgress: number) {
  // Example logic when a module is completed
  const newProgress = currentProgress + 25; // Assuming a module completion adds 25%
  const isCourseCompleted = newProgress >= 100;

  await updateUserCourseProgress(userId, courseId, {
    progress: Math.min(newProgress, 100), // Cap progress at 100
    completed: isCourseCompleted,
  });

  if (isCourseCompleted) {
    // Also update the main student profile's 'coursesCompleted' array
    // This would typically be another service call, e.g., addCompletedCourseToProfile(userId, courseId)
    console.log(`Course ${courseId} marked as fully completed for user ${userId}.`);
  }
}
*/

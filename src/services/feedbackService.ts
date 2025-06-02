// Removed 'use server'; // This service will now run on the client

import { db, firestoreServerTimestamp, FEEDBACK_COLLECTION, type Timestamp } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Submits student feedback to Firestore.
 *
 * @param studentUid The ID of the student submitting the feedback (Firebase Auth UID).
 * @param studentName The name of the student.
 * @param studentEmail The email of the student.
 * @param comment The feedback comment.
 * @returns A promise that resolves when the feedback is successfully submitted.
 */
export async function submitStudentFeedback(
  studentUid: string,
  studentName: string | null,
  studentEmail: string | null,
  comment: string
): Promise<void> {
  if (!studentUid) {
    throw new Error('Student UID is required to submit feedback.');
  }
  if (!comment.trim()) {
    throw new Error('Feedback comment cannot be empty.');
  }

  if (!db) {
    console.error('Firestore database instance (db) is not available in feedbackService.');
    throw new Error('Database service is not initialized. Failed to submit feedback.');
  }

  try {
    const feedbackCollectionRef = collection(db, FEEDBACK_COLLECTION);
    // Create a new document reference with an auto-generated ID in the "feedback" collection
    const feedbackDocRef = doc(feedbackCollectionRef); 

    const feedbackData = {
      studentId: studentUid, // Using studentUid which should be the Firebase Auth UID
      name: studentName || 'Anonymous',
      email: studentEmail || 'N/A',
      comment: comment,
      timestamp: firestoreServerTimestamp() as Timestamp, // Ensure correct type
    };

    await setDoc(feedbackDocRef, feedbackData);
    console.log(`Feedback from student ${studentUid} (Name: ${studentName || 'Anonymous'}) submitted successfully with ID: ${feedbackDocRef.id}.`);
  } catch (error) {
    console.error('Error submitting feedback to Firestore:', error);
    throw new Error(`Failed to submit feedback. Original error: ${(error as Error).message}`);
  }
}

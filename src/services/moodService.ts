
'use server';

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue,
  STUDENTS_COLLECTION,
} from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import type { MoodLog, BoostLog, MoodOption } from '@/types/mood';
import type { StudentProfileMoodSettings } from '@/types/user';

const MOOD_LOGS_SUBCOLLECTION = 'moodLogs';
const BOOST_LOGS_SUBCOLLECTION = 'boostLogs';
const SETTINGS_SUBCOLLECTION = 'settings'; // Consistent with audioNav settings

/**
 * Saves a student's mood log to Firestore.
 */
export async function saveMoodLog(
  userId: string,
  mood: MoodOption,
  courseId: string,
  moduleId: string
): Promise<string> {
  if (!userId || !mood || !courseId || !moduleId) {
    throw new Error('User ID, mood, course ID, and module ID are required for mood logging.');
  }

  const moodLogData: Omit<MoodLog, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
    userId,
    courseId,
    moduleId,
    mood,
    timestamp: firestoreServerTimestamp(),
  };

  const moodLogsCollectionRef = collection(db, STUDENTS_COLLECTION, userId, MOOD_LOGS_SUBCOLLECTION);
  try {
    const docRef = await addDoc(moodLogsCollectionRef, moodLogData);
    console.log(`Mood log saved with ID: ${docRef.id} for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error('Error saving mood log:', error);
    throw new Error('Failed to save mood log.');
  }
}

/**
 * Logs a motivation boost game interaction to Firestore.
 */
export async function saveBoostLog(
  userId: string,
  gameType: string,
  completed: boolean,
  moodBefore: MoodOption,
  courseId: string,
  moduleId: string
): Promise<string> {
  if (!userId || !gameType || !moodBefore || !courseId || !moduleId) {
    throw new Error('Required fields missing for boost logging.');
  }

  const boostLogData: Omit<BoostLog, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
    userId,
    courseId,
    moduleId,
    gameType,
    completed,
    moodBefore,
    timestamp: firestoreServerTimestamp(),
  };

  const boostLogsCollectionRef = collection(db, STUDENTS_COLLECTION, userId, BOOST_LOGS_SUBCOLLECTION);
  try {
    const docRef = await addDoc(boostLogsCollectionRef, boostLogData);
    console.log(`Boost log saved with ID: ${docRef.id} for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error('Error saving boost log:', error);
    throw new Error('Failed to save boost log.');
  }
}

/**
 * Fetches the user's mood check settings.
 * @param userId Firebase Auth UID of the student.
 * @returns A promise resolving to StudentProfileMoodSettings or null if not found.
 */
export async function getUserMoodSettings(userId: string): Promise<StudentProfileMoodSettings | null> {
  if (!userId) return null;
  
  // Mood settings are part of the main student profile document for simplicity now
  const studentDocRef = doc(db, STUDENTS_COLLECTION, userId);
  try {
    const docSnap = await getDoc(studentDocRef);
    if (docSnap.exists()) {
      const profileData = docSnap.data();
      return profileData?.moodSettings || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching student profile for mood settings:', error);
    return null;
  }
}

/**
 * Saves or updates the user's mood check settings.
 * @param userId Firebase Auth UID of the student.
 * @param settings The StudentProfileMoodSettings object.
 */
export async function updateUserMoodSettings(
  userId: string,
  settings: Partial<StudentProfileMoodSettings>
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to update mood settings.');
  }
  const studentDocRef = doc(db, STUDENTS_COLLECTION, userId);
  try {
    // Settings are stored directly on the student's main profile document
    await updateDoc(studentDocRef, {
      moodSettings: settings,
    });
    console.log(`Mood check settings updated for user ${userId}`);
  } catch (error) {
    console.error('Error updating mood settings:', error);
    throw new Error('Failed to update mood settings.');
  }
}

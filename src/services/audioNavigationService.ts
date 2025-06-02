
'use client'; // This service will be called from client components for logging

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue
} from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import type { AudioNavLog, AudioNavigationSettings } from '@/types/audioNavigation';

const USERS_COLLECTION = 'users'; // Assuming student profiles are under 'users' or 'students'
const AUDIO_NAV_SETTINGS_SUBCOLLECTION = 'settings';
const AUDIO_NAV_LOGS_SUBCOLLECTION = 'audioNavLogs';


/**
 * Logs an audio navigation command to Firestore.
 * @param userId Firebase Auth UID of the student.
 * @param commandText The recognized text of the command.
 * @param actionTaken A string identifier for the action performed (e.g., 'navigate_dashboard').
 * @param details Optional additional details about the action.
 */
export async function logAudioCommand(
  userId: string,
  commandText: string,
  actionTaken: string,
  details?: Record<string, any>
): Promise<string> {
  if (!userId || !commandText || !actionTaken) {
    throw new Error('User ID, command text, and action taken are required for logging.');
  }

  const logData: Omit<AudioNavLog, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
    userId,
    commandText,
    actionTaken,
    ...(details && { details }),
    timestamp: firestoreServerTimestamp(),
  };

  // Path: users/{userId}/audioNavLogs/{autoId}
  const logsCollectionRef = collection(db, USERS_COLLECTION, userId, AUDIO_NAV_LOGS_SUBCOLLECTION);
  try {
    const docRef = await addDoc(logsCollectionRef, logData);
    console.log(`Audio command logged with ID: ${docRef.id} for user ${userId}`);
    return docRef.id;
  } catch (error) {
    console.error('Error logging audio command:', error);
    throw new Error('Failed to log audio command.');
  }
}

/**
 * Saves or updates the user's audio navigation settings.
 * @param userId Firebase Auth UID of the student.
 * @param settings The AudioNavigationSettings object.
 */
export async function saveAudioNavigationSettings(
  userId: string,
  settings: Partial<AudioNavigationSettings>
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to save audio navigation settings.');
  }
  // Path: users/{userId}/settings/audioNav
  const settingsDocRef = doc(db, USERS_COLLECTION, userId, AUDIO_NAV_SETTINGS_SUBCOLLECTION, 'audioNav');
  try {
    await setDoc(settingsDocRef, settings, { merge: true });
    console.log(`Audio navigation settings saved for user ${userId}`);
  } catch (error) {
    console.error('Error saving audio navigation settings:', error);
    throw new Error('Failed to save audio navigation settings.');
  }
}

/**
 * Fetches the user's audio navigation settings.
 * @param userId Firebase Auth UID of the student.
 * @returns A promise resolving to AudioNavigationSettings or null if not found.
 */
export async function getAudioNavigationSettings(userId: string): Promise<AudioNavigationSettings | null> {
  if (!userId) {
    return null;
  }
  const settingsDocRef = doc(db, USERS_COLLECTION, userId, AUDIO_NAV_SETTINGS_SUBCOLLECTION, 'audioNav');
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as AudioNavigationSettings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching audio navigation settings:', error);
    return null; // Or rethrow, depending on desired error handling
  }
}

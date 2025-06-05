"use server";

import {
  db,
  firestoreServerTimestamp,
  type Timestamp,
  firebaseInitializationError,
} from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type {
  AudioNavigationLog,
  AudioNavigationSettings,
} from "@/types/audioNavigation";

const USERS_COLLECTION = "users";
const AUDIO_NAV_LOGS_SUBCOLLECTION = "audioNavLogs";
const AUDIO_NAV_SETTINGS_SUBCOLLECTION = "settings";

function getFirestore(): Firestore {
  if (!db) {
    console.error("Firestore is not initialized:", firebaseInitializationError);
    throw new Error("Database is not available.");
  }
  return db;
}

export async function logAudioCommand(
  userId: string,
  command: string,
  route: string,
  wasSuccessful: boolean,
  errorMessage?: string
): Promise<string> {
  if (!userId || !command || !route) {
    throw new Error(
      "User ID, command, and route are required to log audio navigation."
    );
  }

  const firestore = getFirestore();

  const logData: Omit<AudioNavigationLog, "id" | "timestamp"> & {
    timestamp: Timestamp;
  } = {
    userId,
    command,
    route,
    wasSuccessful,
    ...(errorMessage && { errorMessage }),
    timestamp: firestoreServerTimestamp() as Timestamp,
  };

  const logsCollectionRef = collection(
    firestore,
    USERS_COLLECTION,
    userId,
    AUDIO_NAV_LOGS_SUBCOLLECTION
  );

  try {
    const docRef = await addDoc(logsCollectionRef, logData);
    console.log(
      `Audio command logged with ID: ${docRef.id} for user ${userId}`
    );
    return docRef.id;
  } catch (error) {
    console.error("Error logging audio navigation command:", error);
    throw new Error("Failed to log audio navigation command.");
  }
}

export async function getAudioNavigationSettings(
  userId: string
): Promise<AudioNavigationSettings> {
  if (!userId) {
    throw new Error("User ID is required to get audio navigation settings.");
  }

  const firestore = getFirestore();
  // Path: users/{userId}/settings/audioNav
  const settingsDocRef = doc(
    firestore,
    USERS_COLLECTION,
    userId,
    AUDIO_NAV_SETTINGS_SUBCOLLECTION,
    "audioNav"
  );

  try {
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as AudioNavigationSettings;
    }

    // Return default settings if none exist
    return {
      isEnabled: true,
      preferredLanguage: "en-US",
    };
  } catch (error) {
    console.error("Error getting audio navigation settings:", error);
    throw new Error("Failed to get audio navigation settings.");
  }
}

export async function updateAudioNavigationSettings(
  userId: string,
  settings: AudioNavigationSettings
): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required to update audio navigation settings.");
  }

  const firestore = getFirestore();
  // Path: users/{userId}/settings/audioNav
  const settingsDocRef = doc(
    firestore,
    USERS_COLLECTION,
    userId,
    AUDIO_NAV_SETTINGS_SUBCOLLECTION,
    "audioNav"
  );
  try {
    await setDoc(settingsDocRef, settings, { merge: true });
    console.log(`Audio navigation settings saved for user ${userId}`);
  } catch (error) {
    console.error("Error saving audio navigation settings:", error);
    throw new Error("Failed to save audio navigation settings.");
  }
}


'use client';

import {
  messaging,
  getToken, // Corrected from getFCMToken
  onMessage,
  db,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  firebaseInitializationError,
  STUDENTS_COLLECTION,
} from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast'; // Although useToast is here, it's best used in component context for UI

// Function to get VAPID key from environment variables
const getVapidKey = (): string | undefined => {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
};

/**
 * Requests notification permission and saves the FCM token to the user's profile.
 * @param userId Firebase Auth UID of the student.
 * @param swRegistration Optional ServiceWorkerRegistration object.
 */
export async function requestNotificationPermissionAndSaveToken(
  userId: string,
  swRegistration?: ServiceWorkerRegistration // Make swRegistration optional
): Promise<void> {
  if (firebaseInitializationError || !messaging || !db) {
    console.error('Firebase messaging or Firestore not initialized.');
    alert('Notification service is not available.');
    return;
  }

  if (!userId) {
    console.error('User ID is required to save FCM token.');
    return;
  }

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.error('VAPID key is missing. Notifications will not work. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set.');
    // Consider showing a more user-friendly error, e.g., using toast if available
    alert('Notification configuration error. Please contact support.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Pass swRegistration to getToken if provided
      const currentToken = await getToken(messaging, { 
        vapidKey: vapidKey,
        ...(swRegistration && { serviceWorkerRegistration: swRegistration }) 
      });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        const studentDocRef = doc(db, STUDENTS_COLLECTION, userId);
        await updateDoc(studentDocRef, {
          fcmTokens: arrayUnion(currentToken),
        });
        console.log('FCM token saved to user profile.');
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
      alert('Notification permission denied. You will not receive live meeting updates.');
    }
  } catch (error) {
    console.error('An error occurred while requesting permission or getting token. ', error);
    alert(`Could not set up notifications: ${(error as Error).message}`);
  }
}

/**
 * Initializes Firebase Cloud Messaging listeners for foreground messages.
 */
export function initializeFCMListeners(): (() => void) | void {
  if (firebaseInitializationError || !messaging) {
    console.error('Firebase messaging not initialized. Cannot set up listeners.');
    return;
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Message received in foreground. ', payload);
    
    const event = new CustomEvent('fcmForegroundMessage', { detail: payload });
    window.dispatchEvent(event);
    
    if (Notification.permission === "granted" && payload.notification) {
        new Notification(payload.notification.title || "New BrainLoop Notification", { 
          body: payload.notification.body, 
          icon: payload.notification.icon || '/logo.png' 
        });
    } else {
        console.info("Foreground notification payload (no browser notification shown):", payload.notification);
    }
  });
  return unsubscribe;
}

/**
 * Unsubscribes from FCM messages and removes the token from the user's profile.
 * @param userId Firebase Auth UID of the student.
 * @param token The FCM token to remove.
 */
export async function unsubscribeFromNotifications(userId: string, token: string): Promise<void> {
  if (firebaseInitializationError || !messaging || !db) {
    console.error('Firebase messaging or Firestore not initialized.');
    return;
  }
  if (!userId || !token) {
    console.error('User ID and token are required to unsubscribe.');
    return;
  }
  try {
    const studentDocRef = doc(db, STUDENTS_COLLECTION, userId);
    await updateDoc(studentDocRef, {
      fcmTokens: arrayRemove(token),
    });
    console.log('FCM token removed from user profile.');
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
  }
}


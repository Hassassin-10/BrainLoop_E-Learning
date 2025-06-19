"use client";

import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type FirebaseStorage, getStorage } from "firebase/storage";
import { type Messaging, getMessaging } from "firebase/messaging";

// Use the same config from firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let clientApp: FirebaseApp;
let clientAuth: Auth;
let clientDb: Firestore;
let clientStorage: FirebaseStorage;
let clientMessaging: Messaging | null = null;

export function initializeClientFirebase() {
  try {
    clientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    clientAuth = getAuth(clientApp);
    clientDb = getFirestore(clientApp);
    clientStorage = getStorage(clientApp);

    // Initialize messaging only if supported
    if ("Notification" in window && firebaseConfig.messagingSenderId) {
      clientMessaging = getMessaging(clientApp);
    }

    return {
      app: clientApp,
      auth: clientAuth,
      db: clientDb,
      storage: clientStorage,
      messaging: clientMessaging,
    };
  } catch (error) {
    console.error("Error initializing Firebase on client:", error);
    throw error;
  }
}

// Export initialized instances
export const clientFirebase =
  typeof window !== "undefined" ? initializeClientFirebase() : null;

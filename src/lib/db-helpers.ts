"use server";

import { db } from "@/lib/firebase";
import type {
  Firestore,
  DocumentData,
  CollectionReference,
  DocumentReference,
  Query,
  WhereFilterOp,
} from "firebase/firestore";
import {
  collection,
  doc,
  query as firestoreQuery,
  where as firestoreWhere,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

/**
 * Helper to ensure Firestore is initialized and get a typed instance
 */
export function getDb(): Firestore {
  if (!db) {
    throw new Error(
      "Firestore instance is not initialized. Make sure to initialize Firebase on the server."
    );
  }
  return db as Firestore;
}

/**
 * Type-safe collection reference
 */
export function getTypedCollection<T extends DocumentData>(
  collectionPath: string
): CollectionReference<T> {
  return collection(getDb(), collectionPath) as CollectionReference<T>;
}

/**
 * Type-safe document reference
 */
export function createTypedDoc<T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  docId?: string
): DocumentReference<T> {
  return doc(collectionRef, docId) as DocumentReference<T>;
}

/**
 * Type-safe query builder
 */
export function createQuery<T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  field: keyof T,
  operator: WhereFilterOp,
  value: any
): Query<T> {
  return firestoreQuery(
    collectionRef,
    firestoreWhere(field as string, operator, value)
  );
}

/**
 * Safe document fetch with type inference
 */
export async function fetchTypedDoc<T extends DocumentData>(
  docRef: DocumentReference<T>
): Promise<T | null> {
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Safe collection fetch with type inference
 */
export async function fetchTypedDocs<T extends DocumentData>(
  query: Query<T> | CollectionReference<T>
): Promise<T[]> {
  const snapshot = await getDocs(query);
  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Safe document update
 */
export async function updateTypedDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: Partial<T>
): Promise<void> {
  await updateDoc(docRef, data as DocumentData);
}

/**
 * Safe document creation
 */
export async function setTypedDoc<T extends DocumentData>(
  docRef: DocumentReference<T>,
  data: T
): Promise<void> {
  await setDoc(docRef, data as DocumentData);
}

/**
 * Safe document deletion
 */
export async function deleteTypedDoc<T extends DocumentData>(
  docRef: DocumentReference<T>
): Promise<void> {
  await deleteDoc(docRef);
}

/**
 * Helper to create a collection reference with proper typing
 */
export function createCollection(
  path: string
): CollectionReference<DocumentData> {
  return collection(getDb(), path);
}

/**
 * Helper to create a document reference with proper typing
 */
export function createDocument(path: string): DocumentReference<DocumentData> {
  return doc(getDb(), path);
}

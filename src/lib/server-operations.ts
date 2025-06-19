"use server";

import { getDb } from "./db-helpers";
import { serverTimestamp } from "firebase/firestore";

/**
 * Creates a new document with server timestamp
 * @param path Collection path
 * @param data Document data
 */
export async function createServerDocument(path: string, data: any) {
  const db = getDb();
  const timestamp = serverTimestamp();
  return {
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Updates a document with server timestamp
 * @param path Document path
 * @param data Update data
 */
export async function updateServerDocument(path: string, data: any) {
  const db = getDb();
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Validates if the current context is server-side
 */
export function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("This operation can only be performed on the server side");
  }
}

/**
 * Server-side timestamp generator
 */
export const getServerTimestamp = () => serverTimestamp();

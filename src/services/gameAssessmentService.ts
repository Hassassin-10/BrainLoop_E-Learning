"use server";

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue,
  deleteDoc,
} from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  type FirestoreError,
  type Firestore,
  type DocumentReference,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import type {
  GameAssessment,
  GameAssessmentOutput,
  UserGameScore,
} from "@/types/gameAssessment";

const COURSES_COLLECTION = "courses";
const MODULES_SUBCOLLECTION = "modules";
const GAME_ASSESSMENTS_SUBCOLLECTION = "gameAssessments";
const USERS_COLLECTION = "users";
const GAME_SCORES_SUBCOLLECTION = "gameScores";

/**
 * Helper function to assert Firestore instance is initialized
 */
/**
 * Helper to get a typed Firestore instance
 * @throws Error if Firestore is not initialized
 * @returns A typed Firestore instance
 */
function getFirestore(): Firestore {
  if (!db) {
    throw new Error("Firestore instance is not initialized.");
  }
  return db as Firestore;
}

/**
 * Helper to get a collection reference with proper typing
 * @param segments Path segments leading to the collection
 * @returns A typed CollectionReference
 */
function getCollection(
  ...segments: string[]
): CollectionReference<DocumentData> {
  return collection(getFirestore(), ...segments);
}

/**
 * Helper to get a document reference with proper typing
 * @param segments Path segments leading to the document
 * @returns A typed DocumentReference
 */
function getDocument(...segments: string[]): DocumentReference<DocumentData> {
  return doc(getFirestore(), ...segments);
}

export async function saveGeneratedAssessment(
  courseId: string,
  moduleId: string,
  assessmentOutput: GameAssessmentOutput
): Promise<string> {
  if (!courseId || !moduleId) {
    throw new Error("Course ID and Module ID are required.");
  }

  const assessmentData: Omit<GameAssessment, "id" | "generatedAt"> & {
    generatedAt: FieldValue;
  } = {
    courseId,
    moduleId,
    ...assessmentOutput,
    generatedAt: firestoreServerTimestamp(),
    approvedByAdmin: false,
  };

  try {
    const assessmentsCollection = getCollection(
      COURSES_COLLECTION,
      courseId,
      MODULES_SUBCOLLECTION,
      moduleId,
      GAME_ASSESSMENTS_SUBCOLLECTION
    );

    const docRef = await addDoc(assessmentsCollection, assessmentData);
    console.log("Generated game assessment saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving generated assessment to Firestore:", error);
    throw new Error("Failed to save game assessment.");
  }
}

export async function getGameAssessment(
  courseId: string,
  moduleId: string,
  assessmentId: string
): Promise<GameAssessment | null> {
  if (!courseId || !moduleId || !assessmentId) {
    throw new Error(
      "Critical: Course ID, Module ID, or Assessment ID is missing in getGameAssessment call."
    );
  }

  assertFirestore(db);

  const path = `${COURSES_COLLECTION}/${courseId}/${MODULES_SUBCOLLECTION}/${moduleId}/${GAME_ASSESSMENTS_SUBCOLLECTION}/${assessmentId}`;
  const assessmentDocRef = doc(db as Firestore, path);

  try {
    const docSnap = await getDoc(assessmentDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      } as GameAssessment;
    }
    return null;
  } catch (error) {
    console.error("Error fetching game assessment:", error);
    throw new Error("Failed to fetch game assessment.");
  }
}

export async function getGameAssessmentsForModule(
  courseId: string,
  moduleId: string
): Promise<GameAssessment[]> {
  if (!courseId || !moduleId) {
    throw new Error("Course ID and Module ID are required.");
  }

  assertFirestore(db);

  const assessmentsCollectionRef = collection(
    db as Firestore,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    GAME_ASSESSMENTS_SUBCOLLECTION
  );

  try {
    const querySnapshot = await getDocs(
      query(assessmentsCollectionRef, orderBy("generatedAt", "desc"))
    );

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as GameAssessment)
    );
  } catch (error) {
    console.error("Error fetching game assessments:", error);
    throw new Error("Failed to fetch game assessments.");
  }
}

export async function saveUserGameScore(
  userId: string,
  data: {
    assessmentId: string;
    courseId: string;
    moduleId: string;
    score: number;
    attempts: number;
    answers: Record<string, string>;
  }
): Promise<void> {
  if (!userId || !data.assessmentId) {
    throw new Error("User ID and Assessment ID are required.");
  }

  const firestore = getFirestoreInstance();

  // Create collection and document references
  const usersCollection = collection(firestore, USERS_COLLECTION);
  const userDoc = doc(usersCollection, userId);
  const scoresCollection = collection(userDoc, GAME_SCORES_SUBCOLLECTION);
  const scoreDocRef = doc(scoresCollection, data.assessmentId);

  // Prepare score data for Firestore
  const scoreData: Omit<UserGameScore, "id"> = {
    userId,
    assessmentId: data.assessmentId,
    courseId: data.courseId,
    moduleId: data.moduleId,
    score: data.score,
    maxScore: 100, // Standard max score for percentage-based assessments
    timeTaken: 0, // TODO: Add timer functionality
    answers: data.answers,
    completedAt: firestoreServerTimestamp(),
  };

  try {
    // Set with merge option to update existing document if it exists
    await setDoc(scoreDocRef, scoreData, { merge: true });

    // Log success with detailed information
    console.log(
      `Game score saved successfully for user ${userId}, assessment ${data.assessmentId}, score ${data.score}`
    );
  } catch (error) {
    console.error("Error saving user game score:", error);
    throw new Error(
      `Failed to save game score: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Retrieves a user's game score for a specific assessment.
 * @param userId Firebase Auth UID.
 * @param assessmentId The ID of the assessment.
 * @returns Promise resolving to UserGameScore or null.
 */
export async function getUserGameScore(
  userId: string,
  assessmentId: string
): Promise<UserGameScore | null> {
  if (!userId || !assessmentId) {
    throw new Error("User ID and Assessment ID are required.");
  }
  const scoreDocRef = doc(
    db,
    USERS_COLLECTION,
    userId,
    GAME_SCORES_SUBCOLLECTION,
    assessmentId
  );
  try {
    const docSnap = await getDoc(scoreDocRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserGameScore;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user game score:", error);
    throw new Error("Failed to fetch user game score.");
  }
}

/**
 * Approves or unapproves a game assessment by an admin.
 * @param courseId The ID of the course.
 * @param moduleId The ID of the module.
 * @param assessmentId The ID of the game assessment.
 * @param approveStatus Boolean indicating whether to approve (true) or unapprove (false).
 */
export async function setGameAssessmentApproval(
  courseId: string,
  moduleId: string,
  assessmentId: string,
  approveStatus: boolean
): Promise<void> {
  if (!courseId || !moduleId || !assessmentId) {
    throw new Error("Course ID, Module ID, and Assessment ID are required.");
  }
  const assessmentDocRef = doc(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    GAME_ASSESSMENTS_SUBCOLLECTION,
    assessmentId
  );
  try {
    await setDoc(
      assessmentDocRef,
      { approvedByAdmin: approveStatus },
      { merge: true }
    );
    console.log(
      `Assessment ${assessmentId} approval status set to ${approveStatus}.`
    );
  } catch (error) {
    console.error("Error updating game assessment approval status:", error);
    throw new Error("Failed to update game assessment approval status.");
  }
}

/**
 * Deletes a game assessment.
 * @param courseId The ID of the course.
 * @param moduleId The ID of the module.
 * @param assessmentId The ID of the game assessment.
 */
export async function deleteGameAssessment(
  courseId: string,
  moduleId: string,
  assessmentId: string
): Promise<void> {
  if (!courseId || !moduleId || !assessmentId) {
    throw new Error("Course ID, Module ID, and Assessment ID are required.");
  }
  const assessmentDocRef = doc(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    GAME_ASSESSMENTS_SUBCOLLECTION,
    assessmentId
  );
  try {
    await deleteDoc(assessmentDocRef);
    console.log(`Assessment ${assessmentId} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting game assessment:", error);
    throw new Error("Failed to delete game assessment.");
  }
}

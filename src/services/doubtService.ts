"use client";

import {
  db,
  firestoreServerTimestamp,
  Timestamp,
  type FieldValue,
  arrayUnion,
  arrayRemove,
} from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  type DocumentData,
  type FirestoreError,
  type Firestore,
} from "firebase/firestore";
import type { DoubtMessage, DoubtReply } from "@/types/doubt";

const COURSES_COLLECTION = "courses";
const MODULES_SUBCOLLECTION = "modules";
const DOUBTS_SUBCOLLECTION = "doubts";

// Helper function to assert Firestore instance is initialized
function assertFirestore(db: Firestore | null): asserts db is Firestore {
  if (!db) {
    throw new Error("Firestore instance is not initialized.");
  }
}

// Function to listen for doubts for a specific module
export function getDoubtsForModule(
  courseId: string,
  moduleId: string,
  callback: (doubts: DoubtMessage[]) => void,
  onError: (error: FirestoreError) => void
): () => void {
  // Returns an unsubscribe function
  if (!courseId || !moduleId) {
    console.error("Course ID and Module ID are required to fetch doubts.");
    onError({
      code: "invalid-argument",
      message: "Course ID and Module ID are required.",
    } as FirestoreError);
    return () => {};
  }

  try {
    assertFirestore(db);

    const doubtsCollectionRef = collection(
      db,
      COURSES_COLLECTION,
      courseId,
      MODULES_SUBCOLLECTION,
      moduleId,
      DOUBTS_SUBCOLLECTION
    );
    const q = query(doubtsCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const doubts: DoubtMessage[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData;

          const repliesFromDb = (data.replies || []) as Array<
            DocumentData & { timestamp?: Timestamp | FieldValue }
          >;

          const processedReplies: DoubtReply[] = repliesFromDb
            .map((replyData, index: number) => {
              let ts: Timestamp;
              if (replyData.timestamp instanceof Timestamp) {
                ts = replyData.timestamp;
              } else if (
                replyData.timestamp &&
                typeof (replyData.timestamp as any).toDate === "function"
              ) {
                const dateFromData = (replyData.timestamp as any).toDate();
                ts = Timestamp.fromDate(
                  dateFromData instanceof Date ? dateFromData : new Date(0)
                );
              } else {
                ts = Timestamp.fromDate(new Date(0));
              }

              return {
                id:
                  replyData.id || `${docSnap.id}-reply-${Date.now()}-${index}`,
                text: replyData.text || "",
                senderId: replyData.senderId || "",
                senderName: replyData.senderName || replyData.senderId || "",
                timestamp: ts,
              };
            })
            .sort((a, b) => {
              return (
                (a.timestamp as Timestamp).toMillis() -
                (b.timestamp as Timestamp).toMillis()
              );
            });

          doubts.push({
            id: docSnap.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName || data.senderId,
            timestamp: data.timestamp as Timestamp,
            videoTimestamp: data.videoTimestamp,
            pinned: data.pinned || false,
            replies: processedReplies,
            moduleId: data.moduleId || moduleId,
            courseId: data.courseId || courseId,
            likes: data.likes || [],
            upvoteCount: data.upvoteCount || 0,
          });
        });
        callback(doubts);
      },
      (error) => {
        console.error("Error fetching doubts in real-time: ", error);
        onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up doubts listener:", error);
    onError(error as FirestoreError);
    return () => {};
  }
}

// Function to add a new doubt
export async function addDoubt(
  courseId: string,
  moduleId: string,
  doubtText: string,
  senderId: string,
  senderName: string,
  videoTimestamp?: number
): Promise<string> {
  if (!courseId || !moduleId || !doubtText.trim() || !senderId) {
    throw new Error(
      "Course ID, Module ID, doubt text, and sender ID are required."
    );
  }

  assertFirestore(db);

  const doubtData = {
    text: doubtText,
    senderId: senderId,
    senderName: senderName || senderId,
    timestamp: firestoreServerTimestamp(),
    ...(videoTimestamp !== undefined && { videoTimestamp }),
    pinned: false,
    replies: [],
    moduleId: moduleId,
    courseId: courseId,
    likes: [],
    upvoteCount: 0,
  };

  const doubtsCollectionRef = collection(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    DOUBTS_SUBCOLLECTION
  );
  const docRef = await addDoc(doubtsCollectionRef, doubtData);
  return docRef.id;
}

// Function to add a reply to a doubt
export async function addReplyToDoubt(
  courseId: string,
  moduleId: string,
  doubtId: string,
  replyText: string,
  senderId: string,
  senderName: string
): Promise<void> {
  if (!courseId || !moduleId || !doubtId || !replyText.trim() || !senderId) {
    throw new Error("Required fields missing for adding reply.");
  }

  assertFirestore(db);

  const doubtDocRef = doc(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    DOUBTS_SUBCOLLECTION,
    doubtId
  );

  try {
    const docSnap = await getDoc(doubtDocRef);
    if (!docSnap.exists()) {
      throw new Error("Doubt document not found.");
    }
    const doubtData = docSnap.data();

    const existingReplies: DoubtReply[] = (doubtData?.replies || []).map(
      (reply: any) => {
        let ts: Timestamp;
        if (reply.timestamp instanceof Timestamp) {
          ts = reply.timestamp;
        } else if (
          reply.timestamp &&
          typeof (reply.timestamp as any).toDate === "function"
        ) {
          const date = (reply.timestamp as any).toDate();
          ts = Timestamp.fromDate(date instanceof Date ? date : new Date(0));
        } else {
          ts = Timestamp.fromDate(new Date(0)); // Fallback for malformed data
        }
        return {
          ...reply,
          timestamp: ts, // Ensure it's a Firestore Timestamp
        };
      }
    );

    const newReply: DoubtReply = {
      id: `${doubtId}-reply-${Date.now()}-${existingReplies.length}`,
      text: replyText,
      senderId: senderId,
      senderName: senderName || senderId,
      timestamp: Timestamp.now(), // Use client-side Firestore Timestamp for replies array
    };

    const updatedReplies = [...existingReplies, newReply];

    updatedReplies.sort((a, b) => {
      const tsA = a.timestamp;
      const tsB = b.timestamp;
      return tsA.toMillis() - tsB.toMillis();
    });

    await updateDoc(doubtDocRef, {
      replies: updatedReplies,
    });
  } catch (error: any) {
    console.error("Error adding reply to doubt:", error);
    let message = "Failed to post reply.";
    if (error.message) {
      message += ` Details: ${error.message}`;
    }
    throw new Error(message);
  }
}

// Function to toggle the pinned status of a doubt
export async function togglePinDoubt(
  courseId: string,
  moduleId: string,
  doubtId: string,
  currentPinnedStatus: boolean,
  currentUserId: string // This is studentId (e.g., "8918")
): Promise<void> {
  if (!courseId || !moduleId || !doubtId || !currentUserId) {
    throw new Error("Required fields missing for pinning doubt.");
  }

  assertFirestore(db);

  const doubtDocRef = doc(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    DOUBTS_SUBCOLLECTION,
    doubtId
  );

  const doubtSnap = await getDoc(doubtDocRef);
  if (doubtSnap.exists()) {
    const doubtData = doubtSnap.data() as DoubtMessage;
    // Allow pinning if user is the sender OR an admin (e.g. studentId '8918')
    if (doubtData.senderId === currentUserId || currentUserId === "8918") {
      await updateDoc(doubtDocRef, {
        pinned: !currentPinnedStatus,
      });
    } else {
      throw new Error(
        "You can only pin/unpin your own doubts or if you are an admin."
      );
    }
  } else {
    throw new Error("Doubt not found.");
  }
}

// Function to toggle like on a doubt
export async function toggleLikeDoubt(
  courseId: string,
  moduleId: string,
  doubtId: string,
  userId: string // Firebase Auth UID of the user liking/unliking
): Promise<void> {
  if (!courseId || !moduleId || !doubtId || !userId) {
    throw new Error("Required fields missing for liking doubt.");
  }

  assertFirestore(db);

  const doubtDocRef = doc(
    db,
    COURSES_COLLECTION,
    courseId,
    MODULES_SUBCOLLECTION,
    moduleId,
    DOUBTS_SUBCOLLECTION,
    doubtId
  );

  const docSnap = await getDoc(doubtDocRef);
  if (!docSnap.exists()) {
    throw new Error("Doubt not found.");
  }

  const doubtData = docSnap.data() as DoubtMessage;
  const currentLikes = doubtData.likes || [];

  if (currentLikes.includes(userId)) {
    // User already liked, so unlike
    await updateDoc(doubtDocRef, {
      likes: arrayRemove(userId),
    });
  } else {
    // User hasn't liked, so like
    await updateDoc(doubtDocRef, {
      likes: arrayUnion(userId),
    });
  }
}

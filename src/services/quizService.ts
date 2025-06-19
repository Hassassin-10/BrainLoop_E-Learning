"use server";

import {
  db,
  firestoreServerTimestamp,
  STUDENTS_COLLECTION,
  type FieldValue,
} from "@/lib/firebase";
import {
  Timestamp,
  getDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  doc,
} from "firebase/firestore";
import type { QuizQuestion, UserAnswer, QuizAttempt } from "@/types/quiz";
import { addQuizAttemptToProfile } from "./studentProfileService";
import type { StudentProfile } from "@/types/user";

/**
 * Submits a quiz attempt to Firestore.
 * Also updates the student's profile with the quiz attempt summary.
 * @param quizId The ID of the quiz (e.g., "programming-10" or a generated unique ID for the quiz session).
 * @param quizTitle The title of the quiz.
 * @param userId The ID of the user who attempted the quiz (Firebase Auth UID).
 * @param studentName The name of the student attempting the quiz.
 * @param answers An array of UserAnswer objects.
 * @param questions The full list of QuizQuestion objects for score calculation.
 * @param durationSeconds Optional duration of the quiz attempt in seconds.
 * @returns A Promise resolving to the ID of the submitted QuizAttempt document.
 */
export async function submitQuizAttempt(
  quizId: string, // This should be the unique identifier for this specific quiz/category combination
  quizTitle: string,
  userId: string, // This should be Firebase Auth UID
  studentName: string | null, // Added studentName
  answers: UserAnswer[],
  questions: QuizQuestion[],
  durationSeconds?: number
): Promise<string> {
  try {
    let correctAnswersCount = 0;
    answers.forEach((userAnswer) => {
      const question = questions.find((q) => q.id === userAnswer.questionId);
      if (
        question &&
        userAnswer.selectedOptionId === question.correctOptionId
      ) {
        correctAnswersCount++;
      }
    });

    const score =
      questions.length > 0 ? (correctAnswersCount / questions.length) * 100 : 0;
    const completedAtServerTimestamp: FieldValue = firestoreServerTimestamp();

    // Data for the student_quiz_attempts collection
    const attemptDataForWrite: Omit<QuizAttempt, "id" | "completedAt"> & {
      completedAt: FieldValue;
    } = {
      quizId,
      quizTitle,
      userId,
      studentName: studentName || `User ${userId.substring(0, 6)}`, // Fallback name
      answers,
      score: parseFloat(score.toFixed(2)),
      totalQuestions: questions.length,
      completedAt: completedAtServerTimestamp,
      ...(durationSeconds && { durationSeconds }),
    };

    const attemptsCollectionRef = collection(db, "student_quiz_attempts");
    const attemptDocRef = await addDoc(
      attemptsCollectionRef,
      attemptDataForWrite
    );

    // Data for updating the student's profile
    // Ensure 'attemptedAt' is a Firestore Timestamp object for student profile
    const attemptedAtTimestamp = Timestamp.now(); // Use client-generated Timestamp for profile consistency

    await addQuizAttemptToProfile(userId, {
      quizId: quizId,
      score: parseFloat(score.toFixed(2)),
      attemptedAt: attemptedAtTimestamp,
    });

    return attemptDocRef.id;
  } catch (error) {
    console.error("Error submitting quiz attempt:", error);
    throw new Error(
      `Failed to submit quiz attempt. Original error: ${
        (error as Error).message
      }`
    );
  }
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  highScore: number;
  attempts: number;
}

export async function getLeaderboardData(
  category: string,
  count: number = 10
): Promise<LeaderboardEntry[]> {
  if (!category) return [];

  const categoryPrefix = category.toLowerCase().replace(/\s+/g, "-");
  const attemptsCollectionRef = collection(db, "student_quiz_attempts");

  // Query for attempts in the given category
  // Firestore string range queries: >= prefix and < prefix + high Unicode character
  const q = query(
    attemptsCollectionRef,
    where("quizId", ">=", categoryPrefix),
    where("quizId", "<", categoryPrefix + "\uf8ff"),
    orderBy("quizId"), // Order by quizId first to group similar quizzes if needed
    orderBy("score", "desc") // Then order by score
  );

  const querySnapshot = await getDocs(q);
  const attempts: QuizAttempt[] = [];
  querySnapshot.forEach((doc) => {
    attempts.push({ id: doc.id, ...doc.data() } as QuizAttempt);
  });

  // Process attempts to find the highest score for each user in this category
  const userHighScores: Record<
    string,
    { highScore: number; studentName: string; attemptsCount: number }
  > = {};

  for (const attempt of attempts) {
    if (attempt.userId) {
      const existingEntry = userHighScores[attempt.userId];
      if (!existingEntry || attempt.score > existingEntry.highScore) {
        let nameToDisplay = attempt.studentName;
        if (!nameToDisplay || nameToDisplay.startsWith("User ")) {
          // If name is default or missing
          try {
            const studentDocRef = doc(db, STUDENTS_COLLECTION, attempt.userId);
            const studentSnap = await getDoc(studentDocRef);
            if (studentSnap.exists()) {
              const profile = studentSnap.data() as StudentProfile;
              nameToDisplay =
                profile.name || `Student ${attempt.userId.substring(0, 6)}`;
            } else {
              nameToDisplay = `Student ${attempt.userId.substring(0, 6)}`;
            }
          } catch (e) {
            console.warn(`Could not fetch name for user ${attempt.userId}`, e);
            nameToDisplay =
              nameToDisplay || `Student ${attempt.userId.substring(0, 6)}`;
          }
        }
        userHighScores[attempt.userId] = {
          highScore: attempt.score,
          studentName:
            nameToDisplay || `Student ${attempt.userId.substring(0, 6)}`,
          attemptsCount: (existingEntry?.attemptsCount || 0) + 1,
        };
      } else if (existingEntry) {
        userHighScores[attempt.userId].attemptsCount += 1;
      }
    }
  }

  // Convert to array and sort by high score
  const leaderboardArray = Object.entries(userHighScores)
    .map(([studentId, data]) => ({
      studentId,
      studentName: data.studentName,
      highScore: data.highScore,
      attempts: data.attemptsCount,
    }))
    .sort((a, b) => b.highScore - a.highScore || a.attempts - b.attempts) // Sort by score, then by fewer attempts
    .slice(0, count); // Get top 'count' users

  return leaderboardArray.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

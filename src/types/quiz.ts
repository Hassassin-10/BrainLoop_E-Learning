
import type { Timestamp } from 'firebase/firestore';

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizQuestionOption[];
  correctOptionId: string; // ID of the correct QuizQuestionOption
  explanation?: string; // Optional explanation for the correct answer
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  category?: string;
  timeLimitMinutes?: number; // Optional time limit for the quiz
  createdAt?: Timestamp; // Optional: When the quiz was created
  updatedAt?: Timestamp; // Optional: When the quiz was last updated
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId: string | null; // Allow null if user skips a question
}

export interface QuizAttempt {
  id?: string; // Firestore will generate this if not provided
  quizId: string;
  quizTitle: string; // Denormalized for easier display
  userId: string; // Firebase Auth UID or studentId
  studentName?: string; // Denormalized student name for leaderboard
  answers: UserAnswer[];
  score: number; // Percentage or raw score
  totalQuestions: number;
  completedAt: Timestamp;
  durationSeconds?: number; // How long the user took
}

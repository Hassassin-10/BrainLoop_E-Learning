
import type { Timestamp, FieldValue } from 'firebase/firestore';

export type ChallengeType = 'python_debug' | 'logic_puzzle' | 'algorithm_choice' | 'fill_in_the_blanks' | 'story_decision';

export interface GameAssessmentChallengeData {
  codeSnippet?: string; // For python_debug
  options?: { id: string; text: string; isCorrect?: boolean }[]; // For algorithm_choice, logic_puzzle options
  blanks?: { id: string; correctValue: string; hint?: string }[]; // For fill_in_the_blanks
  storyBranches?: { choice: string; nextStoryNodeId: string }[]; // For story_decision
  puzzleDescription?: string; // For logic_puzzle
  // Removed .passthrough()
}

export interface GameAssessmentSolution {
  correctOptionId?: string; // For algorithm_choice
  correctCode?: string; // For python_debug
  explanation: string;
  correctValues?: { blankId: string; value: string }[]; // Changed from Record<string, string> to array of objects
  optimalPath?: string; // For story_decision
  // Removed .passthrough()
}

export interface GameAssessment {
  id: string; // Firestore document ID
  courseId: string;
  moduleId: string;
  title: string;
  storyNarration: string; // Thematic intro to the challenge
  challengeType: ChallengeType;
  challengeData: GameAssessmentChallengeData;
  solution: GameAssessmentSolution;
  difficulty: 'easy' | 'medium' | 'hard';
  learningObjectives?: string[]; // What this assessment targets
  generatedAt: Timestamp | FieldValue | string; // Allow string for serialized form
  approvedByAdmin?: boolean; // For admin review flow
}

// Output type for the Genkit flow when generating an assessment
export type GameAssessmentOutput = Omit<GameAssessment, 'id' | 'courseId' | 'moduleId' | 'generatedAt' | 'approvedByAdmin'>;


export interface UserGameScore {
  id?: string; // Firestore document ID (will be assessmentId for simplicity)
  userId: string; // Firebase Auth UID
  assessmentId: string;
  courseId: string;
  moduleId: string;
  score: number; // 0-100 or points
  attempts: number;
  completedAt: Timestamp | FieldValue; // This might also need serialization if passed to client
  timeTakenSeconds?: number;
  answers?: any; // Store user's specific answers/choices
  feedback?: 'passed' | 'failed_needs_review';
}

export interface GameAssessmentGenerationInput {
  courseId: string;
  moduleId: string;
  topic: string; // e.g., module title or specific sub-topic
  moduleObjectives: string[]; // Key learning outcomes for the module
  difficulty: 'easy' | 'medium' | 'hard';
}


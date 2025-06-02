
export interface StaticQuizOption {
  text: string;
  isCorrect: boolean; // Will be derived or checked against correctAnswerIndex
}

export interface StaticQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export interface StaticQuizCategory {
  category: string;
  questions: StaticQuizQuestion[];
}

export type StaticQuizData = StaticQuizCategory[];

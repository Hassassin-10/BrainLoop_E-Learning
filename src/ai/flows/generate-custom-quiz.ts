'use server';

/**
 * @fileOverview A custom quiz generation AI agent.
 *
 * - generateCustomQuiz - A function that handles the quiz generation process.
 * - GenerateCustomQuizInput - The input type for the generateCustomQuiz function.
 * - GenerateCustomQuizOutput - The return type for the generateCustomQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomQuizInputSchema = z.object({
  topic: z.string().describe('The topic for the quiz.'),
  studentId: z.string().describe('The ID of the student taking the quiz.'),
  numQuestions: z.number().describe('The number of questions for the quiz.'),
});
export type GenerateCustomQuizInput = z.infer<typeof GenerateCustomQuizInputSchema>;

const GenerateCustomQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz questions and answers.'),
});
export type GenerateCustomQuizOutput = z.infer<typeof GenerateCustomQuizOutputSchema>;

export async function generateCustomQuiz(input: GenerateCustomQuizInput): Promise<GenerateCustomQuizOutput> {
  return generateCustomQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomQuizPrompt',
  input: {schema: GenerateCustomQuizInputSchema},
  output: {schema: GenerateCustomQuizOutputSchema},
  prompt: `You are an expert quiz generator, creating quizzes for students on various topics.

You will generate a quiz with {{numQuestions}} questions on the topic of {{topic}} for student {{studentId}}.

The quiz should be in a format that includes both the questions and the correct answers.

Quiz: `,
});

const generateCustomQuizFlow = ai.defineFlow(
  {
    name: 'generateCustomQuizFlow',
    inputSchema: GenerateCustomQuizInputSchema,
    outputSchema: GenerateCustomQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

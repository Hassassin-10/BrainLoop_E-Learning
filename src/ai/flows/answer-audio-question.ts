
'use server';
/**
 * @fileOverview An AI agent for answering general questions asked via audio input.
 *
 * - answerAudioQuestion - A function that handles answering a student's question.
 * - AnswerAudioQuestionInput - The input type for the answerAudioQuestion function.
 * - AnswerAudioQuestionOutput - The return type for the answerAudioQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerAudioQuestionInputSchema = z.object({
  question: z.string().describe('The question asked by the user via voice.'),
  studentId: z.string().optional().describe('The ID of the student asking the question (optional).'),
});
export type AnswerAudioQuestionInput = z.infer<typeof AnswerAudioQuestionInputSchema>;

const AnswerAudioQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the user_s question.'),
});
export type AnswerAudioQuestionOutput = z.infer<typeof AnswerAudioQuestionOutputSchema>;

export async function answerAudioQuestion(
  input: AnswerAudioQuestionInput
): Promise<AnswerAudioQuestionOutput> {
  return answerAudioQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerAudioQuestionPrompt',
  input: {schema: AnswerAudioQuestionInputSchema},
  output: {schema: AnswerAudioQuestionOutputSchema},
  prompt: `You are a helpful AI assistant. Please answer the following question clearly and concisely.
  Question: {{{question}}}
  {{#if studentId}}This question is from student ID: {{studentId}}{{/if}}
  `,
  system: `You are an expert in a wide range of educational topics. Provide informative and easy-to-understand answers. If the question is ambiguous, ask for clarification if possible, otherwise provide the most likely interpretation. Keep answers succinct.`,
});

const answerAudioQuestionFlow = ai.defineFlow(
  {
    name: 'answerAudioQuestionFlow',
    inputSchema: AnswerAudioQuestionInputSchema,
    outputSchema: AnswerAudioQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || typeof output.answer !== 'string') {
      throw new Error('LLM did not provide a valid answer string.');
    }
    return output;
  }
);

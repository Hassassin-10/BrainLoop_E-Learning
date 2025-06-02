'use server';
/**
 * @fileOverview An AI assistant chatbot for students to ask questions, get clarifications,
 * and receive guidance on their learning path in a conversational manner.
 *
 * - aiAssistantChatbot - A function that handles the chatbot interaction.
 * - AiAssistantChatbotInput - The input type for the aiAssistantChatbot function.
 * - AiAssistantChatbotOutput - The return type for the aiAssistantChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssistantChatbotInputSchema = z.object({
  studentId: z.string().describe('The unique identifier of the student.'),
  moduleName: z.string().describe('The name of the learning module.'),
  message: z.string().describe('The message from the student.'),
});
export type AiAssistantChatbotInput = z.infer<typeof AiAssistantChatbotInputSchema>;

const AiAssistantChatbotOutputSchema = z.object({
  response: z.string().describe('The response from the AI assistant.'),
});
export type AiAssistantChatbotOutput = z.infer<typeof AiAssistantChatbotOutputSchema>;

export async function aiAssistantChatbot(input: AiAssistantChatbotInput): Promise<AiAssistantChatbotOutput> {
  return aiAssistantChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssistantChatbotPrompt',
  input: {schema: AiAssistantChatbotInputSchema},
  output: {schema: AiAssistantChatbotOutputSchema},
  prompt: `You are an AI assistant chatbot designed to help students with their learning.

You are assisting student {{studentId}} with the module {{moduleName}}.

Respond to the following message from the student:

{{message}}`,
});

const aiAssistantChatbotFlow = ai.defineFlow(
  {
    name: 'aiAssistantChatbotFlow',
    inputSchema: AiAssistantChatbotInputSchema,
    outputSchema: AiAssistantChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

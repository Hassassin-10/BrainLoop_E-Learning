
'use server';
/**
 * @fileOverview A Genkit flow to generate GPT-powered game-based assessments.
 *
 * - generateGameAssessment - Generates a story-driven assessment for a course module.
 * - GameAssessmentGenerationInput - Input schema for the flow.
 * - GameAssessmentSchema - Output schema for a single assessment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ChallengeType, GameAssessmentOutput, GameAssessmentGenerationInput } from '@/types/gameAssessment';
import { mockCourses } from '@/data/mockCourses'; // For fetching module context

const GameAssessmentChallengeDataSchema = z.object({
  codeSnippet: z.string().optional().describe('Code snippet for python_debug type challenges.'),
  options: z.array(z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean().optional() })).optional().describe('Multiple choice options for relevant challenge types.'),
  blanks: z.array(z.object({ id: z.string(), correctValue: z.string(), hint: z.string().optional() })).optional().describe('Blanks for fill_in_the_blanks challenges.'),
  storyBranches: z.array(z.object({ choice: z.string(), nextStoryNodeId: z.string() })).optional().describe('Branches for story_decision challenges.'),
  puzzleDescription: z.string().optional().describe('Description for logic_puzzle type challenges.'),
}).describe('Data specific to the challenge type.');

const GameAssessmentSolutionSchema = z.object({
  correctOptionId: z.string().optional().describe('ID of the correct option if applicable.'),
  correctCode: z.string().optional().describe('Corrected code snippet if applicable.'),
  explanation: z.string().describe('Explanation of the solution.'),
  correctValues: z.array(
    z.object({
      blankId: z.string().describe('The ID of the blank from the challengeData.blanks array.'),
      value: z.string().describe('The correct string value for this blank.')
    })
  ).optional().describe('An array of objects, each representing a correct value for a fill_in_the_blanks challenge. E.g., [{"blankId": "blank_1", "value": "answerA"}, {"blankId": "blank_2", "value": "answerB"}]'),
  optimalPath: z.string().optional().describe('Optimal path for story_decision challenges.'),
}).describe('Solution and explanation for the challenge.');

// This schema matches GameAssessmentOutput from types/gameAssessment.ts
const GameAssessmentOutputSchema = z.object({
  title: z.string().describe('Engaging title for the game assessment.'),
  storyNarration: z.string().describe('A brief, thematic story or scenario to introduce the challenge.'),
  challengeType: z.enum(['python_debug', 'logic_puzzle', 'algorithm_choice', 'fill_in_the_blanks', 'story_decision']).describe('The type of game/puzzle.'),
  challengeData: GameAssessmentChallengeDataSchema,
  solution: GameAssessmentSolutionSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level of the assessment.'),
  learningObjectives: z.array(z.string()).optional().describe('Learning objectives covered by this assessment.'),
});
export type GameAssessmentOutputFlowType = z.infer<typeof GameAssessmentOutputSchema>;


const GameAssessmentGenerationInputSchema = z.object({
  courseId: z.string().describe('The ID of the course.'),
  moduleId: z.string().describe('The ID of the module within the course.'),
  topic: z.string().describe('The main topic of the module.'),
  moduleObjectives: z.array(z.string()).describe('Specific learning objectives for this module.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium').describe('Desired difficulty for the assessment.'),
});
export type GameAssessmentGenerationInputFlowType = z.infer<typeof GameAssessmentGenerationInputSchema>;


export async function generateGameAssessment(input: GameAssessmentGenerationInput): Promise<GameAssessmentOutputFlowType> {
  // In a real scenario, fetch course/module details from Firestore
  // For now, we can simulate this or use mock data if needed
  const courseContext = mockCourses.find(c => c.id === input.courseId);
  const moduleContext = courseContext?.modules.find(m => m.id === input.moduleId);

  const contextPrompt = `
    Course: ${courseContext?.name || input.courseId}
    Module: ${moduleContext?.title || input.moduleId}
    Topic: ${input.topic}
    Learning Objectives: ${input.moduleObjectives.join(', ')}
    Difficulty: ${input.difficulty}
  `;

  return generateGameAssessmentFlow({ ...input, contextPrompt });
}

const prompt = ai.definePrompt({
  name: 'generateGameAssessmentPrompt',
  input: { schema: GameAssessmentGenerationInputSchema.extend({ contextPrompt: z.string() }) },
  output: { schema: GameAssessmentOutputSchema },
  prompt: `You are an expert educational game designer tasked with creating an engaging, story-driven assessment for a learning module.
Given the following context:
{{{contextPrompt}}}

Design a mini-game or puzzle assessment. Choose ONE of the following styles based on what fits the topic and objectives best:
1.  **Python Debug Challenge**: Present a short Python code snippet (around 5-15 lines) related to the module's topic that contains a subtle bug. The story should provide a thematic reason for needing to fix the code (e.g., "The ancient script to open the treasure chest is corrupted! Fix it!").
2.  **Logic Puzzle**: Create a scenario (e.g., "Escape the AI's Labyrinth") where the student must solve a logic puzzle based on principles from the module. This could involve ordering steps, identifying patterns, or making deductions.
3.  **Algorithm Choice Mission**: Present a mission (e.g., "Optimize the city's traffic flow," "Plan the Mars rover's path"). The student must choose the most appropriate algorithm or data structure from a list of options, based on the module's content.
4.  **Fill in the Blanks Narrative**: Craft a short story or technical description related to the module content with key terms or concepts missing. The student must fill in the blanks correctly.
5.  **Story Decision Point**: Create a branching narrative where the student makes a critical decision based on their understanding of the module's concepts, leading to different outcomes.

Your output MUST be a JSON object adhering to the provided schema.
Specifically, ensure 'challengeType' is one of the allowed enums.
'challengeData' should contain relevant fields for the chosen 'challengeType' (e.g., 'codeSnippet' for python_debug, 'options' for algorithm_choice, 'puzzleDescription' for logic_puzzle, 'blanks' for fill_in_the_blanks).
'solution' must include a clear 'explanation' and any specific correct answers (like 'correctCode', 'correctOptionId').
For 'fill_in_the_blanks' challenges, 'solution.correctValues' MUST be an array of objects, where each object has a 'blankId' (matching an ID from 'challengeData.blanks') and its corresponding string 'value'. For example: [{"blankId": "blank_id_1", "value": "correct answer for blank 1"}, {"blankId": "blank_id_2", "value": "correct answer for blank 2"}].
The 'title' and 'storyNarration' should be creative and thematic.
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
    ],
  },
});

const generateGameAssessmentFlow = ai.defineFlow(
  {
    name: 'generateGameAssessmentFlow',
    inputSchema: GameAssessmentGenerationInputSchema.extend({ contextPrompt: z.string() }),
    outputSchema: GameAssessmentOutputSchema,
  },
  async (input) => {
    console.log("[generateGameAssessmentFlow] Input received:", JSON.stringify(input, null, 2));
    try {
      const { output } = await prompt(input);
      
      if (!output) {
        console.error("[generateGameAssessmentFlow] LLM output was null or undefined.");
        throw new Error('LLM did not return a valid assessment structure. Output was null or undefined.');
      }
      console.log("[generateGameAssessmentFlow] Successfully generated and parsed assessment:", JSON.stringify(output, null, 2));
      return output;
    } catch (error: any) {
      console.error("[generateGameAssessmentFlow] Error during generation process:", error);
      let errorMessage = "Failed to generate game assessment.";
      
      if (error.name === 'ZodError' || (error.message && error.message.toLowerCase().includes('zod'))) {
        errorMessage = `LLM output schema validation failed. Details: ${error.message}`;
        if(error.errors) errorMessage += ` Issues: ${JSON.stringify(error.errors)}`;
      } else if (error.message) {
        errorMessage = `Generation Error: ${error.message}`;
      }
      
      if (error.details) { 
        errorMessage += ` Genkit Details: ${JSON.stringify(error.details)}`;
      }
      if (error.stack) {
        console.error("[generateGameAssessmentFlow] Error Stack:", error.stack);
      }
      throw new Error(errorMessage);
    }
  }
);


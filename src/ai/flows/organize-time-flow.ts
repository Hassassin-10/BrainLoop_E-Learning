"use server";

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import type {
  OrganizeTimeInput,
  OrganizeTimeOutput,
  OrganizeTimeEventInput,
} from "@/types/timetable";

const OrganizeTimeEventSchema = z.object({
  title: z.string().describe("The title of the event."),
  dayOfWeek: z
    .string()
    .describe("The day of the week for the event (e.g., Monday, Tuesday)."),
  startTime: z.string().describe("The start time of the event (HH:MM format)."),
  endTime: z.string().describe("The end time of the event (HH:MM format)."),
  description: z
    .string()
    .optional()
    .describe("A brief description of the event."),
});

const OrganizeTimeInputSchema = z.object({
  events: z
    .array(OrganizeTimeEventSchema)
    .describe("A list of events in the user schedule."),
  userGoals: z
    .string()
    .optional()
    .describe(
      'Optional user-defined goals or priorities for their time management (e.g., "Study more for Math", "Find time for exercise").'
    ),
});

const OrganizeTimeOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      "An array of actionable suggestions to help organize or optimize the provided schedule."
    ),
});

export async function organizeTime(
  input: OrganizeTimeInput
): Promise<OrganizeTimeOutput> {
  return organizeTimeFlow(input);
}

const organizeTimePrompt = ai.definePrompt({
  name: "organizeTimePrompt",
  input: { schema: OrganizeTimeInputSchema },
  output: { schema: OrganizeTimeOutputSchema },
  prompt: `You are a skilled time management and productivity advisor.

Here is the current schedule:
{{#each events}}
{{dayOfWeek}}: {{startTime}}-{{endTime}} - {{title}}{{#if description}} ({{description}}){{/if}}
{{/each}}

{{#if userGoals}}
The user has specified the following goals/priorities:
{{userGoals}}
{{/if}}

Please analyze this schedule and provide actionable suggestions to help optimize time usage and achieve any specified goals. Consider:
1. Time blocks and scheduling efficiency
2. Break times and rest periods
3. Potential conflicts or overlaps
4. Balance between different activities
5. Alignment with user goals (if specified)

Provide your suggestions in a clear, bullet-point format.`,
});

const organizeTimeFlow = ai.defineFlow(
  {
    name: "organizeTimeFlow",
    inputSchema: OrganizeTimeInputSchema,
    outputSchema: OrganizeTimeOutputSchema,
  },
  async (input) => {
    const { output } = await organizeTimePrompt(input);
    return output!;
  }
);

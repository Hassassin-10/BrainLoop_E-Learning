"use server";

/**
 * @fileOverview An AI agent for answering student questions, potentially incorporating external educational resources.
 *
 * - answerStudentQuestion - A function that handles answering a student's question.
 * - AnswerStudentQuestionInput - The input type for the answerStudentQuestion function.
 * - AnswerStudentQuestionOutput - The return type for the answerStudentQuestion function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const AnswerStudentQuestionInputSchema = z.object({
  question: z.string().describe("The question the student is asking."),
  studentId: z.string().describe("The ID of the student asking the question."),
  moduleName: z
    .string()
    .describe("The name of the module the question is related to."),
});
export type AnswerStudentQuestionInput = z.infer<
  typeof AnswerStudentQuestionInputSchema
>;

const AnswerStudentQuestionOutputSchema = z.object({
  answer: z.string().describe("The answer to the student\u2019s question."),
  usedExternalResources: z
    .boolean()
    .describe(
      "Whether or not external resources were used to answer the question."
    ),
});
export type AnswerStudentQuestionOutput = z.infer<
  typeof AnswerStudentQuestionOutputSchema
>;

export async function answerStudentQuestion(
  input: AnswerStudentQuestionInput
): Promise<AnswerStudentQuestionOutput> {
  return answerStudentQuestionFlow(input);
}

const shouldIncludeExternalResourcesPrompt = ai.definePrompt({
  name: "shouldIncludeExternalResources",
  input: {
    schema: z.object({
      question: z.string().describe("The question the student is asking."),
    }),
  },
  output: { schema: z.boolean() },
  prompt: `For the following question, determine if external resources would be helpful:
{{question}}

Return true if external resources would be helpful, false otherwise.`,
});

const getExternalResourcePrompt = ai.definePrompt({
  name: "getExternalResource",
  input: {
    schema: z.object({
      question: z.string().describe("The student's question"),
      moduleName: z
        .string()
        .describe("The module name to search resources for"),
    }),
  },
  output: { schema: z.string() },
  prompt: `Find relevant educational resources for this question in the {{moduleName}} module:
{{question}}

Return a summary of the most relevant resource.`,
});

const answerQuestionPrompt = ai.definePrompt({
  name: "answerQuestion",
  input: {
    schema: z.object({
      question: z.string(),
      externalResource: z.string().optional(),
    }),
  },
  output: { schema: z.string() },
  prompt: `Question: {{question}}
{{#if externalResource}}
Additional Resource: {{externalResource}}
{{/if}}

Please provide a clear, helpful, and educational answer.`,
});

const answerStudentQuestionFlow = ai.defineFlow(
  {
    name: "answerStudentQuestionFlow",
    inputSchema: AnswerStudentQuestionInputSchema,
    outputSchema: AnswerStudentQuestionOutputSchema,
  },
  async ({ question, moduleName }) => {
    const { output: shouldUseExternalResources } =
      await shouldIncludeExternalResourcesPrompt({
        question,
      });

    let externalResource = "";

    if (shouldUseExternalResources) {
      const { output: resource } = await getExternalResourcePrompt({
        question,
        moduleName,
      });
      externalResource = resource || "";
    }

    const { output: answer } = await answerQuestionPrompt({
      question,
      externalResource,
    });

    return {
      answer: answer || "",
      usedExternalResources: shouldUseExternalResources || false,
    };
  }
);


import { config } from 'dotenv';
config();

import '@/ai/flows/answer-student-question.ts';
import '@/ai/flows/generate-custom-quiz.ts';
import '@/ai/flows/ai-assistant-chatbot.ts';
import '@/ai/flows/create-razorpay-order.ts';
import '@/ai/flows/verify-razorpay-payment.ts';
import '@/ai/flows/answer-audio-question.ts';
import '@/ai/flows/generate-game-assessment.ts';
import '@/ai/flows/organize-time-flow.ts'; // Added new flow

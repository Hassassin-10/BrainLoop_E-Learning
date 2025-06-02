
'use server';
/**
 * @fileOverview A Genkit flow to create a Razorpay order for course purchases.
 * It now calls an internal Next.js API route to create the order.
 *
 * - createRazorpayOrder - Creates a Razorpay order.
 * - CreateRazorpayOrderInput - Input schema for the flow.
 * - CreateRazorpayOrderOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Course } from '@/types/course';
import type { RazorpayOrderCreationResponse } from '@/types/payment';

// Define if not globally available, or import

const CreateRazorpayOrderInputSchema = z.object({
  courseId: z.string().describe('The ID of the course to purchase.'),
  // Amount and currency will be fetched based on courseId
});
export type CreateRazorpayOrderInput = z.infer<typeof CreateRazorpayOrderInputSchema>;

const CreateRazorpayOrderOutputSchema = z.object({
  orderId: z.string().describe('The Razorpay Order ID.'),
  amount: z.number().describe('The order amount in the smallest currency unit (e.g., paise).'),
  currency: z.string().describe('The currency of the order (e.g., INR).'),
  courseName: z.string().describe('The name of the course.'),
});
export type CreateRazorpayOrderOutput = z.infer<typeof CreateRazorpayOrderOutputSchema>;

async function fetchCourseDetails(courseId: string): Promise<{ price: number; currency: string; name: string } | null> {
  // Mock course fetching. Replace with actual Firestore fetch in a real app.
  const { mockCourses } = await import('@/data/mockCourses');
  const course = mockCourses.find(c => c.id === courseId);
  if (course && course.price && course.currency) {
    return { price: course.price, currency: course.currency, name: course.name };
  }
  return null;
}


export async function createRazorpayOrder(input: CreateRazorpayOrderInput): Promise<CreateRazorpayOrderOutput> {
  return createRazorpayOrderFlow(input);
}

const createRazorpayOrderFlow = ai.defineFlow(
  {
    name: 'createRazorpayOrderFlow',
    inputSchema: CreateRazorpayOrderInputSchema,
    outputSchema: CreateRazorpayOrderOutputSchema,
  },
  async (input) => {
    const { courseId } = input;

    const courseDetails = await fetchCourseDetails(courseId);
    if (!courseDetails || !courseDetails.price || !courseDetails.currency) {
      throw new Error(`Course details or price not found for course ID: ${courseId}`);
    }

    const amountInPaise = courseDetails.price * 100; // Convert to smallest currency unit

    const orderPayload = {
      amount: amountInPaise,
      currency: courseDetails.currency,
      receipt: `receipt_course_${courseId}_${Date.now()}`,
      notes: {
        courseId: courseId,
        courseName: courseDetails.name,
      },
    };

    try {
      // Determine base URL for fetch.
      // VERCEL_URL is a system environment variable on Vercel, providing the deployment's URL.
      // NEXT_PUBLIC_APP_URL is a user-defined variable for the canonical production URL.
      const getAppBaseUrl = () => {
        if (process.env.VERCEL_URL) { // Automatically set by Vercel for preview and production deployments
          return `https://${process.env.VERCEL_URL}`;
        }
        if (process.env.NEXT_PUBLIC_APP_URL) { // Your canonical app URL, ensure this includes https://
          return process.env.NEXT_PUBLIC_APP_URL;
        }
        return 'http://localhost:9002'; // Fallback for local development
      };
      
      const appUrl = getAppBaseUrl();
      const fetchUrl = `${appUrl}/api/create-order`;
      console.log(`Fetching Razorpay order from: ${fetchUrl} with payload:`, JSON.stringify(orderPayload));
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error('Internal API for Razorpay order creation failed. Status:', response.status, 'Response Text:', errorText);
        throw new Error(`API Error: ${response.statusText}. Details: ${errorText.substring(0, 500)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Internal API did not return JSON. Content-Type:', contentType, 'Response Text:', responseText);
        throw new Error(`API did not return JSON. Received Content-Type: ${contentType}. Body: ${responseText.substring(0, 200)}...`);
      }
      
      const orderData: RazorpayOrderCreationResponse = await response.json();
      
      // @ts-ignore
      if (orderData.error) {
        // @ts-ignore
        console.error('Internal API returned JSON with error:', orderData.error);
         // @ts-ignore
        throw new Error(`API returned error in JSON: ${orderData.error}`);
      }


      return {
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        courseName: courseDetails.name,
      };
    } catch (error) {
      console.error('Error calling internal API to create Razorpay order or processing its response:', error);
      if (error instanceof Error && (error.message.startsWith('API Error:') || error.message.startsWith('API did not return JSON') || error.message.startsWith('API returned error in JSON:'))) {
        throw error; // Re-throw specific errors as is
      }
      throw new Error(`Failed to create Razorpay order via internal API: ${(error as Error).message}`);
    }
  }
);


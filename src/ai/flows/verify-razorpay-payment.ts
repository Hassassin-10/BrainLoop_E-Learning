"use server";
/**
 * @fileOverview A Genkit flow to verify Razorpay payment and grant course access.
 *
 * - verifyRazorpayPayment - Verifies payment and updates user profile.
 * - VerifyRazorpayPaymentInput - Input schema for the flow.
 * - VerifyRazorpayPaymentOutput - Output schema for the flow.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import crypto from "crypto";
import {
  db,
  collection,
  addDoc,
  firestoreServerTimestamp,
  STUDENTS_COLLECTION,
  type Timestamp,
  type FieldValue,
} from "@/lib/firebase";
import { enrollStudentInCourse } from "@/services/studentProfileService"; // Assuming this updates enrolledCourseIds
import type { PaymentDocument } from "@/types/payment";

const VerifyRazorpayPaymentInputSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  courseId: z.string(),
  studentUid: z.string().describe("Firebase Auth UID of the student."),
  studentAppId: z
    .string()
    .describe('Application specific student ID (e.g., "8918").'),
  amount: z
    .number()
    .describe("Amount paid in smallest currency unit (e.g., paise)."),
  currency: z.string().describe("Currency of the payment (e.g., INR)."),
});
export type VerifyRazorpayPaymentInput = z.infer<
  typeof VerifyRazorpayPaymentInputSchema
>;

const VerifyRazorpayPaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  paymentId: z
    .string()
    .optional()
    .describe("Firestore Payment Document ID if successful."),
});
export type VerifyRazorpayPaymentOutput = z.infer<
  typeof VerifyRazorpayPaymentOutputSchema
>;

export async function verifyRazorpayPayment(
  input: VerifyRazorpayPaymentInput
): Promise<VerifyRazorpayPaymentOutput> {
  return verifyRazorpayPaymentFlow(input);
}

const verifyRazorpayPaymentFlow = ai.defineFlow(
  {
    name: "verifyRazorpayPaymentFlow",
    inputSchema: VerifyRazorpayPaymentInputSchema,
    outputSchema: VerifyRazorpayPaymentOutputSchema,
  },
  async (input) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      studentUid,
      studentAppId,
      amount,
      currency,
    } = input;

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      console.error("Razorpay Key Secret is not configured.");
      return {
        success: false,
        message:
          "Payment verification failed due to server configuration error.",
      };
    }

    // Verify database connection
    if (!db) {
      console.error("Firebase database is not initialized.");
      return {
        success: false,
        message:
          "Payment verification failed due to database connection error.",
      };
    }

    // Verify Razorpay signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn("Razorpay signature verification failed.");
      // Optionally, save a failed payment attempt record
      const paymentData: Omit<PaymentDocument, "id" | "timestamp"> & {
        timestamp: FieldValue;
      } = {
        userId: studentUid,
        studentId: studentAppId,
        courseId,
        amount,
        currency,
        status: "failed",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        timestamp: firestoreServerTimestamp(),
      };
      try {
        const failedPaymentsRef = collection(db, "payments_failed");
        await addDoc(failedPaymentsRef, paymentData);
      } catch (dbError) {
        console.error("Error saving failed payment attempt:", dbError);
      }
      return {
        success: false,
        message: "Payment verification failed. Invalid signature.",
      };
    }

    // Signature is valid, proceed to save payment and grant access
    try {
      const paymentData: Omit<PaymentDocument, "id" | "timestamp"> & {
        timestamp: FieldValue;
      } = {
        userId: studentUid,
        studentId: studentAppId,
        courseId,
        amount,
        currency,
        status: "paid",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        timestamp: firestoreServerTimestamp(),
      };

      const paymentsRef = collection(db, "payments");
      const paymentDocRef = await addDoc(paymentsRef, paymentData);

      // Grant course access
      await enrollStudentInCourse(studentUid, courseId);

      return {
        success: true,
        message: "Payment verified and access granted.",
        paymentId: paymentDocRef.id,
      };
    } catch (error) {
      console.error("Error processing successful payment:", error);
      return {
        success: false,
        message:
          "Payment verified but failed to grant access. Please contact support.",
      };
    }
  }
);

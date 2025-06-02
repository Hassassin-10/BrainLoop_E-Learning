import type { Timestamp, FieldValue } from 'firebase/firestore';

export interface RazorpayOrderCreationResponse {
  id: string; // Razorpay Order ID
  entity: string;
  amount: number; // Amount in paise
  amount_paid: number;
  amount_due: number;
  currency: string; // e.g., INR
  receipt?: string;
  offer_id?: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string | number | boolean>;
  created_at: number; // Unix timestamp
}

export interface PaymentDocument {
  id?: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  studentId: string; // Application specific student ID
  courseId: string;
  amount: number; // Amount in the smallest currency unit (e.g., paise for INR)
  currency: string; // e.g., INR
  status: 'created' | 'attempted' | 'paid' | 'failed';
  timestamp: Timestamp | FieldValue;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

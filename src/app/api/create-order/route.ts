import { NextResponse, type NextRequest } from 'next/server';
import Razorpay from 'razorpay';

// Use environment variables for Razorpay keys
const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error(`[${new Date().toISOString()}] /api/create-order Error: Razorpay API keys are not configured in environment variables.`);
  // Do not throw here, let Razorpay instance creation fail if keys are truly missing,
  // but this log helps in debugging. The instance will fail if keys are invalid/missing.
}

// Initialize Razorpay instance
// It might be null if keys are missing, handle this potential issue
let razorpayInstance: Razorpay | null = null;
if (key_id && key_secret) {
  try {
    razorpayInstance = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] /api/create-order Error: Failed to initialize Razorpay SDK. Check API keys.`, e);
    // The function will fail later if instance is null
  }
}


export async function POST(req: NextRequest) {
  console.log(`[${new Date().toISOString()}] /api/create-order POST request received`);

  if (!razorpayInstance) {
    console.error(`[${new Date().toISOString()}] /api/create-order Error: Razorpay SDK not initialized. API keys might be missing or invalid.`);
    return NextResponse.json({ error: 'Payment gateway configuration error. Please contact support.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log(`[${new Date().toISOString()}] /api/create-order request body:`, body);
    const { amount, currency = 'INR', receipt = `receipt_order_${Date.now()}`, notes } = body;

    if (!amount) {
      console.error(`[${new Date().toISOString()}] /api/create-order Error: Amount is required`);
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      console.error(`[${new Date().toISOString()}] /api/create-order Error: Invalid amount - ${amount}`);
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const options = {
      amount: Number(amount), // Amount in paisa
      currency,
      receipt,
      notes: notes || {}, // Pass any notes from the request body
    };
    console.log(`[${new Date().toISOString()}] /api/create-order Razorpay options:`, options);

    const order = await razorpayInstance.orders.create(options);
    console.log(`[${new Date().toISOString()}] /api/create-order Razorpay order created:`, order);
    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Razorpay API Error in /api/create-order:`, error);
    // Check if the error object has Razorpay's specific structure
    const errorMessage = error.error?.description || error.message || 'Internal Server Error processing payment order.';
    const errorStatus = error.statusCode || 500;
    return NextResponse.json({ error: errorMessage, details: error.error || error.toString() }, { status: errorStatus });
  }
}

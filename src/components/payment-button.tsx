'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createRazorpayOrder } from '@/ai/flows/create-razorpay-order';
import { verifyRazorpayPayment } from '@/ai/flows/verify-razorpay-payment';
import type { Course } from '@/types/course';
import { ShoppingCart, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';


declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentButtonProps {
  course: Course;
}

export default function PaymentButton({ course }: PaymentButtonProps) {
  const { studentId, firebaseUser, studentProfile, isLoading: authLoading, isAuthenticated, refreshStudentProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (studentProfile?.enrolledCourseIds?.includes(course.id)) {
      setIsEnrolled(true);
    } else {
      setIsEnrolled(false);
    }
  }, [studentProfile, course.id]);


  const handlePayment = async () => {
    if (!isAuthenticated || !firebaseUser || !studentId || !studentProfile) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase this course.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    if (!course.price || !course.currency) {
      toast({
        title: 'Course Error',
        description: 'This course is not available for purchase at the moment.',
        variant: 'destructive',
      });
      return;
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      toast({
        title: 'Configuration Error',
        description: 'Razorpay Key ID is not configured. Payment cannot proceed.',
        variant: 'destructive',
      });
      console.error("Razorpay Key ID not found in environment variables (NEXT_PUBLIC_RAZORPAY_KEY_ID)");
      return;
    }


    setIsProcessing(true);

    try {
      // 1. Create Razorpay Order via Genkit flow (which calls our API route)
      const orderResponse = await createRazorpayOrder({ courseId: course.id });

      // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKeyId, // Use the public key from .env
        amount: orderResponse.amount.toString(),
        currency: orderResponse.currency,
        name: 'BrainLoop Learning',
        description: `Payment for ${orderResponse.courseName}`,
        image: '/logo.png', 
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
          setIsProcessing(true); // Show loader during verification
          try {
            const verificationResult = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course.id,
              studentUid: firebaseUser.uid,
              studentAppId: studentId,
              amount: orderResponse.amount,
              currency: orderResponse.currency,
            });

            if (verificationResult.success) {
              toast({
                title: 'Payment Successful!',
                description: verificationResult.message,
              });
              setIsEnrolled(true); // Optimistic UI update
              await refreshStudentProfile(); // Refresh profile to get latest enrollment status
            } else {
              toast({
                title: 'Payment Verification Failed',
                description: verificationResult.message,
                variant: 'destructive',
              });
            }
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            toast({
              title: 'Error',
              description: 'Failed to verify payment. Please contact support.',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: studentProfile.name || '',
          email: studentProfile.email || firebaseUser.email || '',
          contact: firebaseUser.phoneNumber || '',
        },
        notes: {
          course_id: course.id,
          student_uid: firebaseUser.uid,
        },
        theme: {
          color: '#003049', // Deep Blue - Primary color from globals.css
        },
      };

      if (typeof window.Razorpay === 'undefined') {
        toast({
          title: "Error",
          description: "Razorpay SDK not loaded. Please check your internet connection or refresh the page.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        let description = 'Payment failed. Please try again or contact support.';
        if(response.error && response.error.description) {
            description = response.error.description;
        }
        if(response.error && response.error.reason) {
            description += ` (Reason: ${response.error.reason})`;
        }
        toast({
          title: 'Payment Failed',
          description: description,
          variant: 'destructive',
        });
        setIsProcessing(false); 
      });
      rzp.open();
      // setIsProcessing will be set to false in handler or failure callback
      
    } catch (error) {
      console.error('Error during payment process:', error);
      toast({
        title: 'Payment Error',
        description: (error as Error).message || 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    } 
  };

  if (authLoading) {
    return <Button disabled className="w-full"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</Button>;
  }

  if (isEnrolled) {
    return <Button disabled variant="outline" className="w-full"><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Enrolled</Button>;
  }
  
  if (!course.price) {
    return <Button disabled variant="outline" className="w-full">Not Available</Button>;
  }

  return (
    <Button onClick={handlePayment} disabled={isProcessing || !isAuthenticated} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
      {isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}
      Buy Now ({course.currency} {course.price})
    </Button>
  );
}


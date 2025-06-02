
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { AlertTriangle, Camera, Loader2, LogIn, ScanLine, UserPlus, Mail, KeyRound, Building, Brain } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  auth as firebaseAuthService, // Use the potentially null auth object
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  type FirebaseUser,
  firebaseInitializationError
} from '@/lib/firebase';

type UIMode = 'initial' | 'emailForm' | 'studentIdPrompt' | 'firebaseError';

export default function LoginPage() {
  const authContext = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [uiMode, setUiMode] = useState<UIMode>(firebaseInitializationError ? 'firebaseError' : 'initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  useEffect(() => {
    setMounted(true);
    if (firebaseInitializationError) {
      setUiMode('firebaseError');
      return;
    }
    if (!authContext.isLoading && authContext.isAuthenticated) {
      router.push('/'); 
    }
  }, [authContext.isLoading, authContext.isAuthenticated, router]);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      stopScan(); 
    };
  }, []);

  useEffect(() => {
    if (firebaseInitializationError) return; // Don't process if Firebase failed
    if (!authContext.isLoading && authContext.firebaseUser && !authContext.studentId) {
      setPendingFirebaseUser(authContext.firebaseUser);
      setUiMode('studentIdPrompt');
    }
  }, [authContext.isLoading, authContext.firebaseUser, authContext.studentId]);


  const handleGoogleSignIn = async () => {
    if (!firebaseAuthService) {
      toast({ title: 'Firebase Error', description: 'Authentication service is not available.', variant: 'destructive' });
      setUiMode('firebaseError');
      return;
    }
    setIsProcessing(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuthService, provider);
      setPendingFirebaseUser(result.user);
      setUiMode('studentIdPrompt');
      toast({ title: 'Google Sign-In Successful', description: 'Please provide your Student ID.' });
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toast({ title: 'Sign-In Cancelled', description: 'The Google Sign-In popup was closed before completion.', variant: 'default' });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          title: 'Popup Blocked',
          description: 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.',
          variant: 'destructive',
          duration: 7000,
        });
      }
       else {
        toast({ title: 'Google Sign-In Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuthService) {
      toast({ title: 'Firebase Error', description: 'Authentication service is not available.', variant: 'destructive' });
      setUiMode('firebaseError');
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Error', description: 'Email and Password are required.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(firebaseAuthService, email, password);
        toast({ title: 'Sign Up Successful', description: 'Please provide your Student ID.' });
      } else {
        userCredential = await signInWithEmailAndPassword(firebaseAuthService, email, password);
        toast({ title: 'Sign In Successful', description: 'Please provide your Student ID.' });
      }
      setPendingFirebaseUser(userCredential.user);
      setUiMode('studentIdPrompt');
    } catch (error: any) {
      console.error('Email Auth error:', error);
      toast({ title: isSignUp ? 'Sign Up Failed' : 'Sign In Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudentIdSubmit = async () => {
    if (!pendingFirebaseUser) {
      toast({ title: 'Error', description: 'Firebase user not available. Please try authentication again.', variant: 'destructive' });
      setUiMode('initial'); 
      return;
    }
    if (!studentIdInput.trim()) {
      toast({ title: 'Error', description: 'Please enter your Student ID.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    await authContext.login(pendingFirebaseUser, studentIdInput);
    // Redirection is handled by AuthContext's useEffect or ProtectedRoute
    setIsProcessing(false);
    // If login failed in AuthContext (e.g. student ID not allowed), toast is shown there.
    // If studentId in context is still null, it means verification failed. UI remains 'studentIdPrompt'.
     if (!authContext.isAuthenticated && authContext.firebaseUser && !authContext.studentId) {
      // Stay in studentIdPrompt mode or reset if necessary
    }
  };

  const startScan = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);
    setHasCameraPermission(null); 

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) { 
        videoRef.current.srcObject = stream;
      }
      
      codeReader.current?.decodeFromStream(stream, videoRef.current, (result, error) => {
        if (result) {
          stopScan();
          const scannedId = result.getText();
          setStudentIdInput(scannedId);
          toast({ title: 'Barcode Scanned', description: `Student ID: ${scannedId}` });
        }
        if (error && !(error instanceof NotFoundException)) {
          console.error('Barcode scan error:', error);
        }
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions to use barcode scanning.',
      });
    }
  };

  const stopScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    codeReader.current?.reset();
    setIsScanning(false);
  };
  
  if (!mounted || (authContext.isLoading && !authContext.isAuthenticated && !firebaseInitializationError)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (authContext.isAuthenticated) {
     return null; 
  }

  if (uiMode === 'firebaseError') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There was an error initializing Firebase. Authentication features are unavailable.
              Please check the console for details or contact support.
            </p>
            {firebaseInitializationError && (
              <p className="text-xs text-destructive mt-2">Details: {firebaseInitializationError.message}</p>
            )}
          </CardContent>
           <CardFooter>
             <Button onClick={() => window.location.reload()} className="w-full">Try Reloading Page</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
            <Brain className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Welcome to BrainLoop</CardTitle>
        </CardHeader>

        {uiMode === 'initial' && (
          <CardContent className="space-y-6">
            <CardDescription>Choose your login method</CardDescription>
            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-500/10" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillRule="evenodd"/></svg>
              }
              Sign in with Google
            </Button>
            <Button onClick={() => setUiMode('emailForm')} variant="outline" className="w-full text-primary border-primary hover:bg-primary/10" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
              Sign in or Sign up with Email
            </Button>
          </CardContent>
        )}

        {uiMode === 'emailForm' && (
          <form onSubmit={handleEmailAuth}>
            <CardContent className="space-y-4">
              <CardDescription>{isSignUp ? 'Create a new account' : 'Sign in to your account'}</CardDescription>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-background"/>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-background"/>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Button>
              <Button variant="link" onClick={() => setUiMode('initial')} className="text-sm">
                Back to login options
              </Button>
            </CardFooter>
          </form>
        )}

        {uiMode === 'studentIdPrompt' && (
          <>
            <CardContent className="space-y-6">
              <CardDescription>Enter your Student ID to complete login.</CardDescription>
              <div>
                <Label htmlFor="studentIdVerify">Student ID</Label>
                <Input
                  id="studentIdVerify"
                  type="text"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Enter or Scan Student ID"
                  className="bg-background"
                  disabled={isScanning || isProcessing}
                />
              </div>
              
              {isScanning ? (
                <Button onClick={stopScan} variant="destructive" className="w-full" disabled={isProcessing}>
                  <ScanLine className="mr-2 h-5 w-5" /> Stop Scanning
                </Button>
              ) : (
                <Button onClick={startScan} variant="outline" className="w-full text-accent border-accent hover:bg-accent/10" disabled={isProcessing}>
                  <Camera className="mr-2 h-5 w-5" /> Scan Student ID Card
                </Button>
              )}

              <div className="mt-2">
                <video ref={videoRef} className={`w-full aspect-video rounded-md ${isScanning ? 'block' : 'hidden'} bg-muted`} autoPlay playsInline muted />
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Camera Permission Denied</AlertTitle>
                    <AlertDescription>Enable camera permissions to use barcode scanning.</AlertDescription>
                  </Alert>
                )}
                {hasCameraPermission === null && isScanning && (
                  <Alert className="mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertTitle>Requesting Camera</AlertTitle>
                    <AlertDescription>Please allow camera access.</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button onClick={handleStudentIdSubmit} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isProcessing || !studentIdInput.trim()}>
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Building className="mr-2 h-5 w-5" />}
                Verify &amp; Proceed
              </Button>
            </CardContent>
            <CardFooter className="flex-col space-y-2">
               <Button variant="link" onClick={() => { setPendingFirebaseUser(null); setUiMode('initial'); setEmail(''); setPassword('');}} className="text-sm"  disabled={isProcessing}>
                Use a different login method
              </Button>
            </CardFooter>
          </>
        )}
         {(uiMode === 'initial' || uiMode === 'emailForm') && 
            <CardFooter>
                <p className="text-xs text-muted-foreground text-center w-full">
                    BrainLoop: Your personalized AI learning companion.
                </p>
            </CardFooter>
         }
      </Card>
    </div>
  );
}

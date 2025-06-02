
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { logAudioCommand, getAudioNavigationSettings, saveAudioNavigationSettings } from '@/services/audioNavigationService';
import { answerAudioQuestion } from '@/ai/flows/answer-audio-question';
import type { AudioNavigationSettings } from '@/types/audioNavigation';

const RATE_LIMIT_MS = 2000; // 2 seconds

export default function AudioNavigationControl() {
  const { firebaseUser, studentId, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommandTime, setLastCommandTime] = useState(0);
  const [userSettings, setUserSettings] = useState<AudioNavigationSettings | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated || !firebaseUser?.uid) return;

    getAudioNavigationSettings(firebaseUser.uid).then(settings => {
      if (settings) {
        setUserSettings(settings);
      } else {
        // Default settings if none exist
        const defaultSettings: AudioNavigationSettings = { isEnabled: true, preferredLanguage: 'en-US' };
        setUserSettings(defaultSettings);
        saveAudioNavigationSettings(firebaseUser.uid, defaultSettings); // Save defaults
      }
    });
  }, [firebaseUser, isAuthenticated]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = userSettings?.preferredLanguage || 'en-US';

        recognitionRef.current.onresult = (event) => {
          const currentTranscript = event.results[0][0].transcript.trim();
          setTranscript(currentTranscript);
          processCommand(currentTranscript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          let errorMsg = 'Speech recognition error.';
          if (event.error === 'no-speech') errorMsg = 'No speech detected. Please try again.';
          if (event.error === 'audio-capture') errorMsg = 'Microphone problem. Please check permissions.';
          if (event.error === 'not-allowed') errorMsg = 'Microphone access denied. Please enable it in browser settings.';
          toast({ title: 'Voice Command Error', description: errorMsg, variant: 'destructive' });
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          // setIsListening(false); // Already set in onresult/onerror
        };
      }
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }, [userSettings]); // Re-initialize if settings (like language) change


  const processCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();
    let actionTaken = 'unknown_command';
    let details: Record<string, any> = { originalCommand: command };
    let feedback = `Command: "${command}"`;

    if (lowerCommand.includes('go to dashboard') || lowerCommand.includes('open dashboard')) {
      actionTaken = 'navigate_dashboard';
      router.push('/');
      feedback = 'Navigating to Dashboard...';
    } else if (lowerCommand.includes('open courses') || lowerCommand.includes('show courses')) {
      actionTaken = 'navigate_courses';
      router.push('/courses');
      feedback = 'Opening Courses...';
    } else if (lowerCommand.includes('open profile')) {
      actionTaken = 'navigate_profile';
      router.push('/profile');
      feedback = 'Opening Profile...';
    } else if (lowerCommand.includes('start quiz') || lowerCommand.includes('take a quiz')) {
      actionTaken = 'navigate_quiz';
      router.push('/static-quiz'); 
      feedback = 'Starting a Quiz...';
    } else if (lowerCommand.includes('open timetable') || lowerCommand.includes('show timetable') || lowerCommand.includes('my schedule')) {
      actionTaken = 'navigate_timetable';
      router.push('/timetable');
      feedback = 'Opening Timetable...';
    } else if (lowerCommand.includes('open admin') || lowerCommand.includes('admin panel')) {
      if (studentId === '8918') { // Check if user is admin
        actionTaken = 'navigate_admin';
        router.push('/admin');
        feedback = 'Opening Admin Panel...';
      } else {
        actionTaken = 'navigate_admin_denied';
        feedback = 'Admin panel access denied.';
      }
    } else if (lowerCommand.includes('open live meetings') || lowerCommand.includes('show live meetings')) {
      actionTaken = 'navigate_live_meetings';
      router.push('/live-meetings');
      feedback = 'Opening Live Meetings...';
    } else if (lowerCommand.startsWith('play') && lowerCommand.length <= 6) { 
      actionTaken = 'playback_play_attempted';
      feedback = 'Attempting to play... (Playback control not fully implemented)';
      console.log("Audio Command: Play (Placeholder)");
    } else if (lowerCommand.startsWith('pause') && lowerCommand.length <= 7) { 
      actionTaken = 'playback_pause_attempted';
      feedback = 'Attempting to pause... (Playback control not fully implemented)';
      console.log("Audio Command: Pause (Placeholder)");
    } else if (lowerCommand.startsWith('rewind') || lowerCommand.startsWith('go back')) {
      actionTaken = 'playback_rewind_attempted';
      feedback = 'Attempting to rewind... (Playback control not fully implemented)';
      console.log("Audio Command: Rewind (Placeholder)");
    } else if (lowerCommand.includes('next lesson') || lowerCommand.includes('next video')) {
      actionTaken = 'playback_next_attempted';
      feedback = 'Attempting to go to next lesson... (Playback control not fully implemented)';
      console.log("Audio Command: Next Lesson (Placeholder)");
    } else if (lowerCommand.startsWith('explain') || lowerCommand.startsWith('what is') || lowerCommand.startsWith('how does')) {
      actionTaken = 'qa_attempt';
      setIsLoadingAnswer(true);
      toast({ title: 'Thinking...', description: `Getting answer for: "${command}"` });
      try {
        const qaResponse = await answerAudioQuestion({ question: command, studentId: studentId || undefined });
        feedback = `Answer: ${qaResponse.answer}`;
        details.answer = qaResponse.answer;
        toast({ title: `Question: ${command}`, description: qaResponse.answer, duration: 10000 });
      } catch (error: any) {
        console.error("Error getting answer via audio command:", error);
        feedback = `Sorry, I couldn't get an answer for: "${command}". ${error.message}`;
        toast({ title: 'Q&A Error', description: feedback, variant: 'destructive' });
        details.error = error.message;
      } finally {
        setIsLoadingAnswer(false);
      }
    } else {
      feedback = `Command not recognized: "${command}"`;
      details.unrecognized = true;
    }

    if (firebaseUser?.uid) {
      try {
        await logAudioCommand(firebaseUser.uid, command, actionTaken, details);
      } catch (logError) {
        console.error("Failed to log audio command:", logError);
      }
    }
    if (actionTaken !== 'qa_attempt' && !(actionTaken === 'navigate_admin_denied' && studentId !== '8918')) { 
        toast({ description: feedback });
    } else if (actionTaken === 'navigate_admin_denied' && studentId !== '8918'){
        toast({ description: feedback, variant: 'destructive'});
    }
  };

  const handleToggleListen = () => {
    if (!isMounted || !recognitionRef.current) {
      toast({ title: 'Audio Not Ready', description: 'Speech recognition is not available or not initialized.', variant: 'destructive' });
      return;
    }
    if (!isAuthenticated || !userSettings?.isEnabled) {
      toast({ title: 'Feature Disabled', description: 'Please log in and enable audio navigation in settings.', variant: 'destructive' });
      return;
    }

    if (Date.now() - lastCommandTime < RATE_LIMIT_MS && !isListening) { // Only rate limit starting new commands
      toast({ title: 'Rate Limit', description: 'Too many commands, please wait a moment.', variant: 'default' });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = userSettings?.preferredLanguage || 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
        setLastCommandTime(Date.now());
        toast({ description: "Listening..." });
      } catch (e: any) {
        console.error("Error starting recognition:", e);
        toast({ title: "Mic Error", description: "Could not start listening. Please try again.", variant: "destructive"});
        setIsListening(false);
      }
    }
  };
  
  if (!isMounted || !isAuthenticated || !userSettings?.isEnabled) {
    return null; 
  }

  return (
    <Button
      onClick={handleToggleListen}
      className="fixed bottom-20 right-6 z-[101] rounded-full w-16 h-16 p-0 flex items-center justify-center bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl transition-all hover:scale-110 active:scale-100"
      aria-label={isListening ? "Stop listening" : "Start voice command"}
      title={isListening ? "Stop listening" : "Start voice command"}
      disabled={isLoadingAnswer}
    >
      {isLoadingAnswer ? (
        <Loader2 className="h-7 w-7 animate-spin" />
      ) : isListening ? (
        <Mic className="h-7 w-7 animate-pulse text-destructive" />
      ) : (
        <Zap className="h-7 w-7" /> 
      )}
    </Button>
  );
}

"use client";

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => ISpeechRecognition;
    SpeechRecognition: new () => ISpeechRecognition;
  }
}

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  logAudioCommand,
  getAudioNavigationSettings,
  updateAudioNavigationSettings,
} from "@/services/audioNavigationService";
import { answerAudioQuestion } from "@/ai/flows/answer-audio-question";
import type { AudioNavigationSettings } from "@/types/audioNavigation";

const RATE_LIMIT_MS = 2000; // 2 seconds

export default function AudioNavigationControl() {
  const { firebaseUser, studentId, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommandTime, setLastCommandTime] = useState(0);
  const [userSettings, setUserSettings] =
    useState<AudioNavigationSettings | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated || !firebaseUser?.uid) return;

    getAudioNavigationSettings(firebaseUser.uid).then((settings) => {
      if (settings) {
        setUserSettings(settings);
      } else {
        // Default settings if none exist
        const defaultSettings: AudioNavigationSettings = {
          isEnabled: true,
          preferredLanguage: "en-US",
        };
        setUserSettings(defaultSettings);
        updateAudioNavigationSettings(firebaseUser.uid, defaultSettings); // Save defaults
      }
    });
  }, [firebaseUser, isAuthenticated]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        if (recognitionRef.current) {
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang =
            userSettings?.preferredLanguage || "en-US";

          recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript;
            handleSpeechResult(transcript);
          };

          recognitionRef.current.onerror = (
            event: SpeechRecognitionErrorEvent
          ) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
          };

          recognitionRef.current.onend = () => {
            setIsListening(false);
          };
        }
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }, [userSettings]); // Re-initialize if settings (like language) change

  const handleSpeechResult = async (command: string) => {
    setTranscript(command);
    processCommand(command);
    setIsListening(false);
  };

  const processCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();
    let actionTaken = "unknown_command";
    let wasSuccessful = false;
    let errorMessage: string | undefined;
    let feedback = `Command: "${command}"`;

    try {
      // Navigation commands
      if (
        lowerCommand.includes("go to dashboard") ||
        lowerCommand.includes("open dashboard")
      ) {
        actionTaken = "navigate_dashboard";
        router.push("/");
        feedback = "Navigating to Dashboard...";
        wasSuccessful = true;
      } else if (
        lowerCommand.includes("open courses") ||
        lowerCommand.includes("show courses")
      ) {
        actionTaken = "navigate_courses";
        router.push("/courses");
        feedback = "Opening Courses...";
        wasSuccessful = true;
      } else if (lowerCommand.includes("open profile")) {
        actionTaken = "navigate_profile";
        router.push("/profile");
        feedback = "Opening Profile...";
        wasSuccessful = true;
      } else if (
        lowerCommand.includes("start quiz") ||
        lowerCommand.includes("take a quiz")
      ) {
        actionTaken = "navigate_quiz";
        router.push("/static-quiz");
        feedback = "Starting a Quiz...";
        wasSuccessful = true;
      } else if (
        lowerCommand.includes("open timetable") ||
        lowerCommand.includes("show timetable") ||
        lowerCommand.includes("my schedule")
      ) {
        actionTaken = "navigate_timetable";
        router.push("/timetable");
        feedback = "Opening Timetable...";
        wasSuccessful = true;
      } else if (
        lowerCommand.includes("open admin") ||
        lowerCommand.includes("admin panel")
      ) {
        if (studentId === "8918") {
          actionTaken = "navigate_admin";
          router.push("/admin");
          feedback = "Opening Admin Panel...";
          wasSuccessful = true;
        } else {
          actionTaken = "navigate_admin_denied";
          feedback = "Admin panel access denied.";
          wasSuccessful = false;
          errorMessage = "Access denied to admin panel";
        }
      } else if (
        lowerCommand.includes("open live meetings") ||
        lowerCommand.includes("show live meetings")
      ) {
        actionTaken = "navigate_live_meetings";
        router.push("/live-meetings");
        feedback = "Opening Live Meetings...";
        wasSuccessful = true;
      } else if (lowerCommand.startsWith("ask") || lowerCommand.includes("?")) {
        actionTaken = "ask_question";
        setIsLoadingAnswer(true);
        try {
          const qaResponse = await answerAudioQuestion({
            question: command,
            studentId: studentId || undefined,
          });
          feedback = qaResponse.answer;
          wasSuccessful = true;
        } catch (error: any) {
          errorMessage = error.message;
          feedback = "Sorry, I couldn't answer that question.";
          wasSuccessful = false;
        } finally {
          setIsLoadingAnswer(false);
        }
      } else {
        actionTaken = "unknown_command";
        feedback = "Sorry, I didn't understand that command.";
        wasSuccessful = false;
        errorMessage = "Unrecognized command";
      }

      // Log the command
      if (firebaseUser?.uid) {
        await logAudioCommand(
          firebaseUser.uid,
          command,
          actionTaken,
          wasSuccessful,
          errorMessage
        );
      }

      // Show feedback toast
      toast({
        title: "Voice Command",
        description: feedback,
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error processing command:", error);
      errorMessage = error.message;
      wasSuccessful = false;

      // Log the failed command
      if (firebaseUser?.uid) {
        await logAudioCommand(
          firebaseUser.uid,
          command,
          actionTaken,
          wasSuccessful,
          errorMessage
        );
      }

      toast({
        title: "Command Error",
        description: "Sorry, I couldn't process that command.",
        variant: "destructive",
      });
    }
  };

  const handleToggleListen = () => {
    if (!isMounted || !recognitionRef.current) {
      toast({
        title: "Audio Not Ready",
        description: "Speech recognition is not available or not initialized.",
        variant: "destructive",
      });
      return;
    }
    if (!isAuthenticated || !userSettings?.isEnabled) {
      toast({
        title: "Feature Disabled",
        description: "Please log in and enable audio navigation in settings.",
        variant: "destructive",
      });
      return;
    }

    if (Date.now() - lastCommandTime < RATE_LIMIT_MS && !isListening) {
      // Only rate limit starting new commands
      toast({
        title: "Rate Limit",
        description: "Too many commands, please wait a moment.",
        variant: "default",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang =
          userSettings?.preferredLanguage || "en-US";
        recognitionRef.current.start();
        setIsListening(true);
        setLastCommandTime(Date.now());
        toast({ description: "Listening..." });
      } catch (e: any) {
        console.error("Error starting recognition:", e);
        toast({
          title: "Mic Error",
          description: "Could not start listening. Please try again.",
          variant: "destructive",
        });
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

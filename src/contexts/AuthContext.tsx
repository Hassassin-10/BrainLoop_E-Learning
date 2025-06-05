"use client";

import type { ReactNode } from "react";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  auth as firebaseAuthService,
  db as firebaseDbService,
  firestoreServerTimestamp,
  onAuthStateChanged,
  firebaseSignOut,
  type FirebaseUser,
  doc,
  getDoc,
  setDoc,
  ALLOWED_STUDENTS_COLLECTION,
  STUDENTS_COLLECTION,
  Timestamp,
  firebaseInitializationError,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type {
  StudentProfile,
  StudentProfileMoodSettings,
  StudentProfileQuizAttempt,
} from "@/types/user";
import type { AudioNavigationSettings } from "@/types/audioNavigation";

// Add this interface for raw Firestore data
interface StudentProfileData {
  uid?: string;
  studentId?: string;
  name?: string;
  email?: string;
  coursesCompleted?: string[];
  quizzesAttempted?: StudentProfileQuizAttempt[];
  enrolledCourseIds?: string[];
  moodSettings?: StudentProfileMoodSettings;
  audioNavSettings?: AudioNavigationSettings;
  lastLogin?: Timestamp;
  createdAt?: Timestamp;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null | undefined;
  firebaseUid: string | null;
  studentId: string | null;
  studentProfile: StudentProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (firebaseUser: FirebaseUser, studentId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStudentProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<
    FirebaseUser | null | undefined
  >(undefined);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const isAuthenticated = !!firebaseUser && !!studentId;

  const fetchStudentProfile = useCallback(async (user: FirebaseUser | null) => {
    if (user && firebaseDbService) {
      const studentProfileDocRef = doc(
        firebaseDbService,
        STUDENTS_COLLECTION,
        user.uid
      );
      const studentProfileDocSnap = await getDoc(studentProfileDocRef);
      if (studentProfileDocSnap.exists()) {
        const profileData = studentProfileDocSnap.data() as StudentProfile;
        setStudentId(profileData.studentId);

        // Ensure moodSettings is initialized if not present
        const moodSettings = profileData.moodSettings || {
          disableMoodCheck: false,
        };
        setStudentProfile({ ...profileData, moodSettings });

        return { ...profileData, moodSettings };
      } else {
        setStudentId(null);
        setStudentProfile(null);
      }
    } else {
      setStudentId(null);
      setStudentProfile(null);
    }
    return null;
  }, []);

  useEffect(() => {
    if (firebaseInitializationError) {
      toast({
        title: "Firebase Error",
        description: `Failed to initialize Firebase: ${firebaseInitializationError.message}. Authentication will not work.`,
        variant: "destructive",
        duration: 10000,
      });
      setIsLoading(false);
      setFirebaseUser(null);
      setFirebaseUid(null);
      setStudentId(null);
      setStudentProfile(null);
      return;
    }

    if (!firebaseAuthService || !firebaseDbService) {
      toast({
        title: "Firebase Not Ready",
        description:
          "Firebase services are not available. Please check configuration.",
        variant: "destructive",
        duration: 10000,
      });
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuthService,
      async (user) => {
        setIsLoading(true);
        if (user) {
          setFirebaseUser(user);
          setFirebaseUid(user.uid);
          await fetchStudentProfile(user);
        } else {
          setFirebaseUser(null);
          setFirebaseUid(null);
          setStudentId(null);
          setStudentProfile(null);
        }
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [pathname, router, toast, fetchStudentProfile]);

  const refreshStudentProfile = useCallback(async () => {
    if (firebaseUser) {
      setIsLoading(true);
      await fetchStudentProfile(firebaseUser);
      setIsLoading(false);
    }
  }, [firebaseUser, fetchStudentProfile]);

  const login = useCallback(
    async (loggedInFirebaseUser: FirebaseUser, studentIdInput: string) => {
      if (
        firebaseInitializationError ||
        !firebaseAuthService ||
        !firebaseDbService
      ) {
        toast({
          title: "Login Failed",
          description: "Firebase is not configured correctly.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const allowedStudentDocRef = doc(
          firebaseDbService,
          ALLOWED_STUDENTS_COLLECTION,
          studentIdInput
        );
        const allowedStudentDocSnap = await getDoc(allowedStudentDocRef);

        let allowedStudentInfo: { name?: string; email?: string } | null = null;
        const bypassIds = ["8918", "8946", "8947", "STRITH23170"];

        if (allowedStudentDocSnap.exists()) {
          allowedStudentInfo = allowedStudentDocSnap.data() as {
            name?: string;
            email?: string;
          };
        } else {
          if (!bypassIds.includes(studentIdInput)) {
            toast({
              title: "Verification Failed",
              description:
                "Invalid student ID. This ID is not authorized for access.",
              variant: "destructive",
            });
            setIsLoading(false);
            setFirebaseUser(null); // Clear pending user if ID check fails
            return;
          }
          // For bypassed IDs, allow them but maybe log or use default info
          // console.log(`Student ID ${studentIdInput} bypassed authorization check.`);
        }

        const studentProfileDocRef = doc(
          firebaseDbService,
          STUDENTS_COLLECTION,
          loggedInFirebaseUser.uid
        );
        const studentProfileDocSnap = await getDoc(studentProfileDocRef);

        const profileName =
          allowedStudentInfo?.name ||
          loggedInFirebaseUser.displayName ||
          `Student ${studentIdInput}`;
        const profileEmail =
          allowedStudentInfo?.email ||
          loggedInFirebaseUser.email ||
          `${studentIdInput}@example.com`;

        const existingProfileData = studentProfileDocSnap.exists()
          ? (studentProfileDocSnap.data() as StudentProfileData)
          : {};

        const newStudentProfileData: StudentProfile = {
          uid: loggedInFirebaseUser.uid,
          studentId: studentIdInput,
          name: profileName,
          email: profileEmail,
          coursesCompleted: existingProfileData.coursesCompleted ?? [],
          quizzesAttempted: existingProfileData.quizzesAttempted ?? [],
          enrolledCourseIds: existingProfileData.enrolledCourseIds ?? [],
          moodSettings: existingProfileData.moodSettings ?? {
            disableMoodCheck: false,
          },
          audioNavSettings: existingProfileData.audioNavSettings ?? {
            isEnabled: true,
            preferredLanguage: "en-US",
          },
          lastLogin: firestoreServerTimestamp() as Timestamp,
          createdAt:
            existingProfileData.createdAt ??
            (firestoreServerTimestamp() as Timestamp),
        };

        await setDoc(studentProfileDocRef, newStudentProfileData, {
          merge: true,
        });

        setFirebaseUser(loggedInFirebaseUser);
        setFirebaseUid(loggedInFirebaseUser.uid);
        setStudentId(studentIdInput);
        setStudentProfile(newStudentProfileData);

        toast({
          title: "Login Successful!",
          description: `Welcome, ${newStudentProfileData.name}!`,
        });

        const queryParams = new URLSearchParams(window.location.search);
        const redirectPath = queryParams.get("redirect") || "/";
        router.push(redirectPath);
      } catch (error: any) {
        console.error("Student ID verification/profile creation error:", error);
        const bypassIds = ["8918", "8946", "8947", "STRITH23170"];
        if (
          !(
            error.message.includes("Invalid student ID") &&
            !bypassIds.includes(studentIdInput)
          )
        ) {
          toast({
            title: "Login Process Failed",
            description: `Something went wrong: ${error.message}`,
            variant: "destructive",
          });
        }
        setFirebaseUser(null); // Ensure firebaseUser is cleared on error to allow re-login attempt.
        setStudentId(null);
        setStudentProfile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast]
  );

  const logout = useCallback(async () => {
    if (firebaseInitializationError || !firebaseAuthService) {
      toast({
        title: "Logout Failed",
        description: "Firebase is not configured correctly.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      await firebaseSignOut(firebaseAuthService);
      setFirebaseUser(null);
      setFirebaseUid(null);
      setStudentId(null);
      setStudentProfile(null);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const value: AuthContextValue = {
    firebaseUser,
    firebaseUid,
    studentId,
    studentProfile,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshStudentProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

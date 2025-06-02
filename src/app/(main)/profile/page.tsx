
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch'; // Added Switch
import { Label } from '@/components/ui/label';   // Added Label
import { Loader2, User, Mail, Award, BookOpen, Edit3, ShieldCheck, Briefcase, History, Smile } from 'lucide-react'; // Added Smile
import Link from 'next/link';
import { mockCourses } from '@/data/mockCourses';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { updateUserMoodSettings } from '@/services/moodService'; // Added mood service
import { useToast } from '@/hooks/use-toast'; // Added useToast

export default function ProfilePage() {
  const { studentProfile, firebaseUser, isLoading: authLoading, isAuthenticated, refreshStudentProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [disableMoodCheck, setDisableMoodCheck] = useState(false);
  const [isSavingMoodSettings, setIsSavingMoodSettings] = useState(false);


  useEffect(() => {
    setMounted(true);
    if (studentProfile?.moodSettings) {
      setDisableMoodCheck(studentProfile.moodSettings.disableMoodCheck || false);
    }
  }, [studentProfile]);

  const getCourseNameById = (courseId: string) => {
    const course = mockCourses.find(c => c.id === courseId);
    return course ? course.name : courseId;
  };

  const formatQuizTimestamp = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'Date N/A';
    const date = timestamp instanceof Date ? timestamp : (timestamp && 'toDate' in timestamp ? timestamp.toDate() : new Date(0));
    if (date.getTime() === 0) return 'Date N/A'; 
    return format(date, 'PPp');
  };

  const handleMoodCheckToggle = async (checked: boolean) => {
    if (!firebaseUser?.uid) return;
    setIsSavingMoodSettings(true);
    setDisableMoodCheck(checked);
    try {
      await updateUserMoodSettings(firebaseUser.uid, { disableMoodCheck: checked });
      toast({ title: 'Settings Saved', description: `Mood check before modules is now ${checked ? 'disabled' : 'enabled'}.` });
      await refreshStudentProfile(); // Refresh context to reflect new settings
    } catch (error) {
      console.error("Error updating mood settings:", error);
      toast({ title: 'Error', description: 'Could not save mood check settings.', variant: 'destructive' });
      // Revert UI on error
      setDisableMoodCheck(!checked); 
    } finally {
      setIsSavingMoodSettings(false);
    }
  };


  if (!mounted || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !studentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Please log in to view your profile.</p>
        <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-secondary/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary ring-2 ring-primary/50">
              <AvatarImage 
                src={firebaseUser?.photoURL || `https://avatar.vercel.sh/${studentProfile.studentId}.png?size=80`} 
                alt={studentProfile.name}
                data-ai-hint="user avatar"
              />
              <AvatarFallback className="text-3xl bg-accent text-accent-foreground">
                {studentProfile.name.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-bold text-primary">{studentProfile.name}</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">Student Profile Dashboard</CardDescription>
            </div>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Future)
          </Button>
        </CardHeader>
        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
          <Card className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><User className="mr-2 h-5 w-5" /> Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center"><strong>Student ID:</strong><Badge variant="secondary" className="ml-2">{studentProfile.studentId}</Badge></div>
              <p><strong>Email:</strong> {studentProfile.email}</p>
              <p><strong>Joined BrainLoop:</strong> {studentProfile.createdAt ? format(studentProfile.createdAt.toDate(), 'MMMM d, yyyy') : 'N/A'}</p>
              <p><strong>Last Active:</strong> {studentProfile.lastLogin ? format(studentProfile.lastLogin.toDate(), 'MMMM d, yyyy, p') : 'N/A'}</p>
              {studentProfile.studentId === '8918' && (
                <p className="flex items-center gap-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  <ShieldCheck className="h-4 w-4" /> Administrator Access
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Briefcase className="mr-2 h-5 w-5" /> Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mood-check-toggle"
                    checked={!disableMoodCheck} // UI shows "Enable", so check is !disableMoodCheck
                    onCheckedChange={(checked) => handleMoodCheckToggle(!checked)}
                    disabled={isSavingMoodSettings}
                  />
                  <Label htmlFor="mood-check-toggle" className="cursor-pointer">
                    Enable Mood Check Before Modules
                  </Label>
                  {isSavingMoodSettings && <Loader2 className="h-4 w-4 animate-spin text-primary"/>}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  If enabled, you'll be asked about your mood before starting a module.
                </p>
                <Button variant="outline" className="w-full justify-start text-muted-foreground" disabled>Change Password</Button>
                <Button variant="outline" className="w-full justify-start text-muted-foreground" disabled>Notification Preferences</Button>
                <Button variant="destructive" className="w-full justify-start" disabled>Delete Account</Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <History className="mr-2 h-6 w-6" /> Learning Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><BookOpen className="mr-2 h-5 w-5" /> Courses Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {studentProfile.coursesCompleted && studentProfile.coursesCompleted.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {studentProfile.coursesCompleted.map(courseId => (
                    <li key={courseId} className="p-3 border rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <Link href={`/courses/${courseId}`} className="font-medium text-accent hover:underline">
                        {getCourseNameById(courseId)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No courses completed yet. Explore our catalog and start learning!</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Award className="mr-2 h-5 w-5" /> Quiz History</CardTitle>
            </CardHeader>
            <CardContent>
              {studentProfile.quizzesAttempted && studentProfile.quizzesAttempted.length > 0 ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {studentProfile.quizzesAttempted.slice(-5).reverse().map((quiz, index) => ( 
                    <li key={quiz.quizId + index} className="p-3 border rounded-md bg-secondary/30">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{quiz.quizId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        <Badge 
                          variant={quiz.score >= 70 ? "default" : "destructive"}
                          className={`${quiz.score >= 70 ? "bg-green-500 dark:bg-green-600 text-white dark:text-white" : ""}`}
                        >
                          {quiz.score.toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attempted on: {formatQuizTimestamp(quiz.attemptedAt)}
                      </p>
                    </li>
                  ))}
                  {studentProfile.quizzesAttempted.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center mt-3">
                      Showing last 5 of {studentProfile.quizzesAttempted.length} attempts.
                    </p>
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No quizzes attempted yet. Challenge yourself with a quiz!</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

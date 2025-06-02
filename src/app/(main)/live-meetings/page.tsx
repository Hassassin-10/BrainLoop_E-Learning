'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Added Alert components
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLiveMeeting, getAllActiveLiveMeetings } from '@/services/liveMeetingService';
import type { LiveMeeting } from '@/types/liveMeeting';
import { mockCourses } from '@/data/mockCourses';
import type { Course, CourseModule } from '@/types/course';
import { PlusCircle, Video, Loader2, Users, Radio, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

export default function LiveMeetingsPage() {
  const { studentId, isAuthenticated } = useAuth();
  const [meetings, setMeetings] = useState<LiveMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  
  // For creating a new meeting
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [meetingTitle, setMeetingTitle] = useState('');
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // State for displaying fetch error

  const isAdmin = isAuthenticated && studentId === '8918';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    setIsLoadingMeetings(true);
    setFetchError(null); // Reset error state on new fetch attempt
    const unsubscribe = getAllActiveLiveMeetings(
      (fetchedMeetings) => {
        console.log("Fetched active meetings (LiveMeetingsPage):", fetchedMeetings); 
        setMeetings(fetchedMeetings); 
        setIsLoadingMeetings(false);
      },
      (error) => {
        console.error("Failed to load meetings (LiveMeetingsPage):", error);
        const errorMessage = `Could not load live meetings: ${error.message}. If this persists, an administrator may need to create a Firestore index.`;
        toast({ title: "Error Loading Meetings", description: errorMessage, variant: "destructive", duration: 10000 });
        setFetchError(errorMessage); // Set error for display on page
        setIsLoadingMeetings(false);
      }
    );
    return () => unsubscribe();
  }, [mounted, toast]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedCourseId || !selectedModuleId || !studentId) {
      toast({ title: "Error", description: "Course, Module, and Admin privileges are required.", variant: "destructive" });
      return;
    }
    setIsLoadingCreate(true);
    try {
      const newMeetingId = await createLiveMeeting(selectedCourseId, selectedModuleId, studentId, meetingTitle);
      toast({ title: "Meeting Created!", description: `Live meeting "${meetingTitle || 'New Session'}" started.` });
      setMeetingTitle('');
      setSelectedCourseId('');
      setSelectedModuleId('');
      // Meetings list will update via onSnapshot
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to create meeting: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoadingCreate(false);
    }
  };
  
  const availableModules = selectedCourseId ? mockCourses.find(c => c.id === selectedCourseId)?.modules : [];

  if (!mounted) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      {isAdmin && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <PlusCircle className="mr-2 h-6 w-6" /> Create New Live Meeting
            </CardTitle>
            <CardDescription>Setup a new virtual classroom session for a course module.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateMeeting}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="courseSelect">Course</Label>
                <Select value={selectedCourseId} onValueChange={(value) => {setSelectedCourseId(value); setSelectedModuleId('');}}>
                  <SelectTrigger id="courseSelect" className="bg-background">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCourses.map(course => (
                      <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCourseId && (
                <div>
                  <Label htmlFor="moduleSelect">Module</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId} disabled={!availableModules || availableModules.length === 0}>
                    <SelectTrigger id="moduleSelect" className="bg-background">
                      <SelectValue placeholder="Select a module" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModules?.map(module => (
                        <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                      ))}
                       {availableModules?.length === 0 && <p className="p-2 text-sm text-muted-foreground">No modules in this course.</p>}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="meetingTitle">Meeting Title (Optional)</Label>
                <Input
                  id="meetingTitle"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Q&A for Chapter 3"
                  className="bg-background"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoadingCreate || !selectedCourseId || !selectedModuleId} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoadingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                Start Meeting
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <Radio className="mr-2 h-6 w-6" /> Active Live Meetings
          </CardTitle>
          <CardDescription>Join ongoing virtual classroom sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMeetings && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading active meetings...</p>
            </div>
          )}

          {fetchError && !isLoadingMeetings && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Meetings</AlertTitle>
              <AlertDescription>{fetchError} Check browser console for details. A Firestore index might be required.</AlertDescription>
            </Alert>
          )}

          {!isLoadingMeetings && !fetchError && meetings.length === 0 && (
            <p className="text-muted-foreground text-center py-10">
              No active live meetings found at the moment. 
              {isAdmin ? " You can create new meetings above." : " Please check back later or contact an admin."}
            </p>
          )}

          {!isLoadingMeetings && !fetchError && meetings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map(meeting => (
                <Card key={meeting.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{meeting.title || `Session for ${meeting.moduleId}`}</CardTitle>
                    <CardDescription>Course: {mockCourses.find(c=>c.id === meeting.courseId)?.name || meeting.courseId}</CardDescription>
                    <CardDescription>Module: {mockCourses.find(c=>c.id === meeting.courseId)?.modules.find(m=>m.id === meeting.moduleId)?.title || meeting.moduleId}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">Started by: Admin ({meeting.createdBy})</p>
                     <p className="text-xs text-muted-foreground">Jitsi Room: {meeting.jitsiRoomName}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link href={`/live-meetings/${meeting.id}`}>
                        <Users className="mr-2 h-4 w-4" /> Join Meeting
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge'; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGameAssessmentsForModule } from '@/services/gameAssessmentService';
import type { GameAssessment } from '@/types/gameAssessment';
import { mockCourses } from '@/data/mockCourses'; 
import { Loader2, Gamepad, ArrowLeft, Sparkles, AlertTriangle, ShieldAlert, Check, Puzzle, BookOpen, BarChart, PlayCircle } from 'lucide-react'; // Added icons

// Helper function to get an icon based on difficulty or type
const getAssessmentIcon = (assessment: GameAssessment) => {
  if (assessment.difficulty === 'easy') return <Puzzle className="mr-2 h-4 w-4 text-green-500" />;
  if (assessment.difficulty === 'medium') return <BookOpen className="mr-2 h-4 w-4 text-yellow-500" />;
  if (assessment.difficulty === 'hard') return <BarChart className="mr-2 h-4 w-4 text-red-500" />;
  return <Gamepad className="mr-2 h-4 w-4 text-primary" />;
};


export default function ModuleAssessmentsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;
  
  const router = useRouter();
  const { isAuthenticated } = useAuth(); 
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<GameAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [moduleName, setModuleName] = useState('');

  useEffect(() => {
    if (!courseId || !moduleId) {
      notFound();
      return;
    }

    const course = mockCourses.find(c => c.id === courseId);
    const module = course?.modules.find(m => m.id === moduleId);
    if (course) setCourseName(course.name);
    if (module) setModuleName(module.title);
    else {
      setModuleName(moduleId); 
    }


    setIsLoading(true);
    getGameAssessmentsForModule(courseId, moduleId, false) 
      .then(data => {
        setAssessments(data); 
      })
      .catch(err => {
        console.error("Failed to load assessments:", err);
        toast({ title: "Error", description: "Could not load game assessments for this module.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [courseId, moduleId, toast]);
  
  if (!isAuthenticated) {
     return (
        <div className="container mx-auto py-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to view assessments.</p>
            <Button asChild variant="default" onClick={() => router.push(`/login?redirect=/courses/${courseId}/module/${moduleId}/assessments`)}>
                 <Link href={`/login?redirect=/courses/${courseId}/module/${moduleId}/assessments`}>Log In</Link>
            </Button>
        </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button variant="outline" className="mb-6 group" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Module
      </Button>

      <Card className="shadow-xl bg-gradient-to-br from-card via-card to-secondary/10 dark:to-secondary/5">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <Gamepad className="mr-3 h-7 w-7 text-accent" /> Game-Based Assessments
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Interactive challenges for module: <strong className="text-primary">{moduleName || moduleId}</strong> in course: <strong className="text-primary">{courseName || courseId}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {assessments.length === 0 ? (
            <Alert variant="default" className="bg-secondary/30 border-accent/30 text-accent-foreground">
              <Sparkles className="h-5 w-5 text-accent" />
              <AlertTitle className="font-semibold text-accent">No Challenges Available Yet!</AlertTitle>
              <AlertDescription>
                It looks like there are no game-based assessments ready for this module. New adventures might be just around the corner!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map(assessment => (
                <Card key={assessment.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col bg-card hover:border-accent group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center mb-2">
                       {getAssessmentIcon(assessment)}
                      <CardTitle className="text-xl text-primary group-hover:text-accent transition-colors">{assessment.title}</CardTitle>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="capitalize border-primary/50 text-primary/80">{assessment.difficulty}</Badge>
                        <Badge variant="secondary" className="capitalize bg-secondary/70 text-secondary-foreground/80">{assessment.challengeType.replace(/_/g, ' ')}</Badge>
                         {assessment.approvedByAdmin && <Badge variant="default" className="bg-green-500/80 text-white w-fit"><Check className="mr-1 h-3 w-3"/>Approved</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow py-2">
                    <p className="text-sm text-muted-foreground line-clamp-3">{assessment.storyNarration}</p>
                  </CardContent>
                  <CardFooter className="p-4 mt-auto">
                    <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-shadow">
                       <Link href={`/assessments/take/${assessment.courseId}_${assessment.moduleId}_${assessment.id}`}>
                        Start Challenge <PlayCircle className="ml-2 h-5 w-5" />
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



'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateCustomQuiz, type GenerateCustomQuizOutput } from '@/ai/flows/generate-custom-quiz';
import { getStudentProgress, type StudentProgress } from '@/services/lms';
import { BarChart, Bot, Loader2, RefreshCw, TrendingUp, Brain } from 'lucide-react'; 
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';

interface GeneratedQuiz {
  id: string;
  topic: string;
  content: string; // Markdown content of the quiz
}

// Mock data for student progress - replace with actual API calls
const mockStudentProgress: StudentProgress[] = [
  { studentId: 'student123', moduleName: 'Algebra Basics', progress: 75 },
  { studentId: 'student123', moduleName: 'Geometry Fundamentals', progress: 60 },
  { studentId: 'student456', moduleName: 'Algebra Basics', progress: 90 },
];

export default function AiQuizPage() { 
  const { studentId: authStudentId, isAuthenticated } = useAuth();
  const [topic, setTopic] = useState('Algebra Basics');
  const [studentIdForQuiz, setStudentIdForQuiz] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [studentProgressData, setStudentProgressData] = useState<StudentProgress[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState('');


  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && authStudentId) {
      setStudentIdForQuiz(authStudentId);
      setFilterStudentId(authStudentId); // Default filter to logged-in student
      fetchStudentProgress(authStudentId);
    } else {
      fetchStudentProgress(); // Fetch all if not logged in or no specific student ID
    }
  }, [isAuthenticated, authStudentId]); // Removed fetchStudentProgress from deps to avoid loop with itself

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !studentIdForQuiz.trim() || numQuestions <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide a valid topic, student ID, and number of questions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingQuiz(true);
    setGeneratedQuiz(null); 
    try {
      const result: GenerateCustomQuizOutput = await generateCustomQuiz({
        topic,
        studentId: studentIdForQuiz,
        numQuestions,
      });
      setGeneratedQuiz({
        id: String(Date.now()),
        topic,
        content: result.quiz,
      });
      toast({
        title: 'AI Quiz Generated!',
        description: `An AI-powered quiz on "${topic}" has been created.`,
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: 'Could not generate AI quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const fetchStudentProgress = useCallback(async (idToFilter?: string) => {
    setIsLoadingProgress(true);
    try {
      // Use idToFilter if provided, otherwise use the component's filterStudentId state
      const currentFilterId = idToFilter !== undefined ? idToFilter : filterStudentId;

      if (currentFilterId) {
        const progress = await Promise.all(
          mockStudentProgress
            .filter(p => p.studentId === currentFilterId)
            .map(p => getStudentProgress(p.studentId, p.moduleName)) // This will use the mock for now
        );
        setStudentProgressData(progress);
      } else {
        // Show all progress if no specific student ID is provided in filter
         const allProgressPromises = mockStudentProgress.map(p => getStudentProgress(p.studentId, p.moduleName));
         const allProgress = await Promise.all(allProgressPromises);
         setStudentProgressData(allProgress);
      }
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch student progress.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProgress(false);
    }
  },[filterStudentId, toast]); // Added filterStudentId and toast to dependencies

  useEffect(() => {
    // Re-fetch progress when filterStudentId changes by user input
    // But only if not authenticated and setting initial filter.
    if (mounted && (!isAuthenticated || filterStudentId !== authStudentId)) {
        fetchStudentProgress(filterStudentId);
    }
  }, [filterStudentId, isAuthenticated, authStudentId, fetchStudentProgress, mounted]);


  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <Brain className="mr-2 h-6 w-6" /> AI-Powered Quiz Generation
          </CardTitle>
          <CardDescription>
            Create dynamic, personalized quizzes using AI for students based on specific topics and needs.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleGenerateQuiz}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quizTopic">Quiz Topic</Label>
                <Input
                  id="quizTopic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                  className="bg-background"
                />
              </div>
              <div>
                <Label htmlFor="quizStudentId">Target Student ID</Label>
                <Input
                  id="quizStudentId"
                  type="text"
                  value={studentIdForQuiz}
                  onChange={(e) => setStudentIdForQuiz(e.target.value)}
                  placeholder="Enter student ID"
                  className="bg-background"
                  disabled={isAuthenticated && !!authStudentId} 
                />
                {isAuthenticated && authStudentId && (
                    <p className="text-xs text-muted-foreground mt-1">Using ID: {authStudentId}</p>
                )}
              </div>
              <div>
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                  min="1"
                  max="20"
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoadingQuiz || (!isAuthenticated && !studentIdForQuiz.trim())} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoadingQuiz ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" /> 
              )}
              Generate AI Quiz
            </Button>
          </CardFooter>
        </form>
      </Card>

      {generatedQuiz && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Generated AI Quiz: {generatedQuiz.topic}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="quiz-content">
                <AccordionTrigger className="text-lg hover:no-underline">View Quiz Details</AccordionTrigger>
                <AccordionContent className="prose max-w-none p-4 border rounded-md bg-secondary/30">
                  <pre className="whitespace-pre-wrap text-sm">{generatedQuiz.content}</pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <BarChart className="mr-2 h-6 w-6" /> Teacher Insight: Student Progress
          </CardTitle>
          <CardDescription>
            Analyze student progress across different modules. Filter by student ID or view overall progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex-grow">
              <Label htmlFor="progressStudentId">Filter by Student ID (Optional)</Label>
              <Input
                id="progressStudentId"
                type="text"
                placeholder="Enter student ID or leave blank for all"
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button onClick={() => fetchStudentProgress(filterStudentId)} disabled={isLoadingProgress} variant="outline">
              {isLoadingProgress && studentProgressData.length === 0 ? ( 
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Progress
            </Button>
          </div>

          {isLoadingProgress && studentProgressData.length === 0 && ( // Show loader only if no data is currently displayed
             <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}
          {!isLoadingProgress && studentProgressData.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No progress data available for the selected criteria.</p>
          )}
          { studentProgressData.length > 0 && ( // Render chart if data exists, even if loading new data
            <div className="h-[400px] bg-card p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={studentProgressData} margin={{ top: 5, right: 30, left: 0, bottom: 70 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="moduleName" angle={-40} textAnchor="end" interval={0} height={80} style={{ fontSize: '0.75rem', fill: 'hsl(var(--foreground))' }} />
                  <YAxis domain={[0, 100]} label={{ value: 'Progress %', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: 'hsl(var(--foreground))'} }} style={{ fontSize: '0.8rem', fill: 'hsl(var(--foreground))' }}/>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                    cursor={{fill: 'hsl(var(--secondary)/0.3)'}}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px', color: 'hsl(var(--foreground))'}}/>
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Module Progress"/>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
         <CardFooter className="text-sm text-muted-foreground">
            <TrendingUp className="mr-2 h-4 w-4" />
            Data is illustrative. Integrate with your LMS for real-time student analytics.
          </CardFooter>
      </Card>
    </div>
  );
}


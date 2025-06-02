
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge'; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGameAssessment, saveUserGameScore } from '@/services/gameAssessmentService';
import type { GameAssessment, UserGameScore, ChallengeType, GameAssessmentChallengeData } from '@/types/gameAssessment'; 
import { Loader2, Lightbulb, Send, ArrowLeft, CheckCircle, XCircle, ShieldAlert, Sparkles, AlertTriangle, Brain, Play } from 'lucide-react';

// Helper to render challenge based on type
const RenderChallenge = ({ challengeType, challengeData, onInputChange, userAnswer, isSubmitted, assessmentSolution }: {
  challengeType: ChallengeType;
  challengeData: GameAssessmentChallengeData;
  onInputChange: (value: any) => void; 
  userAnswer: any;
  isSubmitted: boolean;
  assessmentSolution: GameAssessment['solution']; // Added for algorithm_choice correct option access
}) => {
  switch (challengeType) {
    case 'python_debug':
      return (
        <div className="space-y-2">
          <Label htmlFor="codeArea" className="text-sm font-medium">Debug the Python code:</Label>
          <Textarea
            id="codeArea"
            value={userAnswer as string || challengeData.codeSnippet || ''}
            onChange={(e) => onInputChange(e.target.value)}
            rows={10}
            className="font-mono text-sm bg-secondary/50 border-border focus:ring-accent focus:border-accent"
            disabled={isSubmitted}
            placeholder="Enter your corrected code here..."
          />
          {challengeData.codeSnippet && !userAnswer && !isSubmitted && ( 
            <p className="text-xs text-muted-foreground italic mt-1">Original snippet is pre-filled. Modify it to fix the bug.</p>
          )}
        </div>
      );
    case 'algorithm_choice':
      return (
        <RadioGroup
          value={userAnswer as string || undefined}
          onValueChange={onInputChange}
          className="space-y-3" // Increased spacing
          disabled={isSubmitted}
        >
          {challengeData.options?.map(option => (
            <Label
              key={option.id}
              htmlFor={option.id}
              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all duration-150 hover:shadow-md
                ${isSubmitted && option.id === (challengeData.options?.find(o => o.isCorrect)?.id || assessmentSolution?.correctOptionId) ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500' : ''}
                ${isSubmitted && userAnswer === option.id && option.id !== (challengeData.options?.find(o => o.isCorrect)?.id || assessmentSolution?.correctOptionId) ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500' : ''}
                ${!isSubmitted && userAnswer === option.id ? 'bg-accent text-accent-foreground ring-2 ring-accent' : 'bg-background hover:bg-muted/50'}
              `}
            >
              <RadioGroupItem value={option.id} id={option.id} className="border-muted-foreground data-[state=checked]:border-accent" />
              <span className="flex-1">{option.text}</span>
              {isSubmitted && option.id === (challengeData.options?.find(o => o.isCorrect)?.id || assessmentSolution?.correctOptionId) && <CheckCircle className="h-5 w-5 text-green-500" />}
              {isSubmitted && userAnswer === option.id && option.id !== (challengeData.options?.find(o => o.isCorrect)?.id || assessmentSolution?.correctOptionId) && <XCircle className="h-5 w-5 text-red-500" />}
            </Label>
          ))}
        </RadioGroup>
      );
    case 'fill_in_the_blanks':
        return (
            <div className="space-y-4">
            <Label className="text-sm font-medium">Fill in the blanks:</Label>
            {challengeData.blanks?.map((blank, index) => (
                <div key={blank.id || index} className="space-y-1">
                <Label htmlFor={`blank-${blank.id}`} className="text-xs text-muted-foreground">
                    Blank {index + 1}{blank.hint ? ` (Hint: ${blank.hint})` : ''}:
                </Label>
                <Input
                    id={`blank-${blank.id}`}
                    type="text"
                    value={(userAnswer as Record<string, string> || {})[blank.id] || ''}
                    onChange={(e) => {
                        const currentAnswers = userAnswer as Record<string, string> || {};
                        onInputChange({ ...currentAnswers, [blank.id]: e.target.value });
                    }}
                    className="bg-secondary/50 border-border focus:ring-accent focus:border-accent"
                    disabled={isSubmitted}
                    placeholder={`Enter value for blank ${index + 1}`}
                />
                </div>
            ))}
            </div>
        );
    case 'logic_puzzle': 
    case 'story_decision': 
      return (
        <div className="space-y-2">
          <Label htmlFor="answerText" className="text-sm font-medium">Your Answer/Decision:</Label>
          {challengeData.puzzleDescription && <p className="text-sm text-muted-foreground mb-2 p-3 bg-muted/50 rounded-md">{challengeData.puzzleDescription}</p>}
           <Textarea
            id="answerText"
            value={userAnswer as string || ''}
            onChange={(e) => onInputChange(e.target.value)}
            rows={challengeType === 'story_decision' ? 5 : 3}
            className="bg-secondary/50 border-border focus:ring-accent focus:border-accent"
            disabled={isSubmitted}
            placeholder="Type your answer or decision here..."
          />
        </div>
      );
    default:
      return <p className="text-destructive">Unsupported challenge type: {challengeType}</p>;
  }
};


export default function TakeGameAssessmentPage() {
  const params = useParams();
  const assessmentIdFull = params.assessmentId as string; 
  const [courseId, moduleId, actualAssessmentId] = assessmentIdFull ? assessmentIdFull.split('_') : [null, null, null];

  const router = useRouter();
  const { studentId, firebaseUser, isAuthenticated } = useAuth(); 
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<GameAssessment | null>(null);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0); 
  const [fetchError, setFetchError] = useState<string | null>(null);


  useEffect(() => {
    if (!courseId || !moduleId || !actualAssessmentId) {
      console.error("Invalid assessment identifier parts:", { courseId, moduleId, actualAssessmentId, assessmentIdFull });
      toast({ title: "Error", description: "Invalid assessment identifier. Cannot load assessment.", variant: "destructive" });
      setFetchError("Invalid assessment identifier provided in URL.");
      setIsLoading(false);
      // notFound(); // This would typically hide the page. Showing error instead.
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    getGameAssessment(courseId, moduleId, actualAssessmentId)
      .then(data => {
        if (data) {
          setAssessment(data);
          if (data.challengeType === 'python_debug' && data.challengeData.codeSnippet) {
            setUserAnswer(data.challengeData.codeSnippet);
          } else if (data.challengeType === 'fill_in_the_blanks') {
            setUserAnswer({}); 
          } else {
            setUserAnswer(null);
          }
        } else {
          setFetchError("Assessment data could not be found. It might not exist or you may not have permission.");
          // notFound(); // Or set a state to show a "not found" message on the page
        }
      })
      .catch(err => {
        console.error("Failed to load assessment:", err);
        toast({ title: "Error Loading Assessment", description: err.message || "Could not load the assessment.", variant: "destructive" });
        setFetchError(err.message || "An unexpected error occurred while loading the assessment.");
      })
      .finally(() => setIsLoading(false));
  }, [courseId, moduleId, actualAssessmentId, toast, assessmentIdFull]);

  const handleSubmitAnswer = async () => {
    if (!assessment || !firebaseUser?.uid || !studentId) { 
      toast({ title: "Cannot Submit", description: "Assessment or user data is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setAttempts(prev => prev + 1);

    let calculatedScore = 0;
    switch (assessment.challengeType) {
        case 'algorithm_choice':
            if (userAnswer === assessment.solution.correctOptionId) calculatedScore = 100;
            break;
        case 'python_debug':
            if ((userAnswer as string)?.trim() === assessment.solution.correctCode?.trim()) calculatedScore = 100;
            break;
        case 'fill_in_the_blanks':
            let correctBlanks = 0;
            const totalBlanks = assessment.challengeData.blanks?.length || 0;
            assessment.challengeData.blanks?.forEach(blank => {
                const submittedAnswer = (userAnswer as Record<string,string>)[blank.id]?.trim().toLowerCase();
                const correctAnswerForBlank = assessment.solution.correctValues?.find(cv => cv.blankId === blank.id)?.value.trim().toLowerCase();
                if (submittedAnswer === correctAnswerForBlank) {
                    correctBlanks++;
                }
            });
            if (totalBlanks > 0) calculatedScore = (correctBlanks / totalBlanks) * 100;
            else if (Object.keys(userAnswer || {}).length > 0) calculatedScore = 50; 
            break;
        case 'logic_puzzle':
        case 'story_decision':
            if ((userAnswer as string)?.trim().length > 10) calculatedScore = 70; // Basic scoring for text answers
            else if ((userAnswer as string)?.trim().length > 0) calculatedScore = 30;
            break;
    }
    
    if (attempts > 0 && calculatedScore > 0) { // Apply penalty for retries
        calculatedScore = Math.max(0, calculatedScore - (attempts * 10));
    }

    setScore(calculatedScore);
    setIsSubmitted(true);

    try {
      await saveUserGameScore(firebaseUser.uid, { 
        assessmentId: actualAssessmentId!, // actualAssessmentId is validated in useEffect
        courseId: assessment.courseId,
        moduleId: assessment.moduleId,
        score: parseFloat(calculatedScore.toFixed(2)),
        attempts: attempts + 1, 
        answers: userAnswer, 
      });
      toast({ title: "Assessment Submitted!", description: `Your score: ${calculatedScore.toFixed(0)}%` });
    } catch (error) {
      console.error("Failed to save score:", error);
      toast({ title: "Error", description: "Could not save your score.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIsSubmitted(false);
    setScore(null);
    if (assessment?.challengeType === 'python_debug' && assessment.challengeData.codeSnippet) {
        setUserAnswer(assessment.challengeData.codeSnippet);
    } else if (assessment?.challengeType === 'fill_in_the_blanks') {
        setUserAnswer({});
    } else {
        setUserAnswer(null);
    }
    setShowHint(false);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (fetchError || !assessment) {
     return (
        <div className="container mx-auto py-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Assessment Not Found</h2>
            <p className="text-muted-foreground mb-4">{fetchError || "The game assessment you are looking for could not be loaded or does not exist."}</p>
            <Button asChild variant="outline"><Link href="/courses">Back to Courses</Link></Button>
        </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
        <div className="container mx-auto py-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to take this assessment.</p>
            <Button asChild variant="default" onClick={() => router.push(`/login?redirect=/assessments/take/${assessmentIdFull}`)}>
                <span>Log In</span>
            </Button>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
       <Button variant="outline" className="mb-6 group" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
      </Button>

      <Card className="max-w-3xl mx-auto shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary to-accent/80 text-primary-foreground p-6">
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl font-bold flex items-center">
                    <Brain className="mr-3 h-7 w-7" /> {assessment.title}
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">Module: {assessment.moduleId} | Difficulty: <Badge variant="secondary" className="capitalize bg-black/20 text-white">{assessment.difficulty}</Badge></CardDescription>
            </div>
            {assessment.learningObjectives && assessment.learningObjectives.length > 0 && (
                 <Badge variant="outline" className="text-xs h-fit whitespace-normal text-left bg-white/20 text-primary-foreground border-primary-foreground/50">
                    Targets: {assessment.learningObjectives.join(', ')}
                 </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Alert variant="default" className="bg-accent/10 border-accent/50 text-accent-foreground shadow-md">
            <Sparkles className="h-5 w-5 text-accent" />
            <AlertTitle className="font-semibold text-accent">The Adventure Begins...</AlertTitle>
            <AlertDescription className="text-accent-foreground/90 whitespace-pre-wrap prose prose-sm max-w-none">{assessment.storyNarration}</AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg bg-card shadow-inner">
            <h3 className="text-xl font-semibold text-primary mb-4">Your Challenge:</h3>
            <RenderChallenge
              challengeType={assessment.challengeType}
              challengeData={assessment.challengeData}
              onInputChange={setUserAnswer}
              userAnswer={userAnswer}
              isSubmitted={isSubmitted}
              assessmentSolution={assessment.solution}
            />
          </div>

          {isSubmitted && score !== null && (
            <Card className={`p-4 border-2 ${score >= 50 ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'} shadow-lg`}>
              <CardTitle className={`text-2xl flex items-center font-bold ${score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {score >= 50 ? <CheckCircle className="mr-2 h-7 w-7" /> : <XCircle className="mr-2 h-7 w-7" />}
                Assessment Result
              </CardTitle>
              <CardContent className="pt-4 space-y-2">
                <p className={`text-3xl font-bold ${score >=50 ? 'text-green-700' : 'text-red-700'}`}>Your Score: {score.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Attempts: {attempts}</p>
                <div className="prose prose-sm max-w-none mt-3 p-3 bg-background/50 rounded-md">
                  <h4 className="font-semibold text-primary">Explanation:</h4>
                  <p className="whitespace-pre-wrap text-foreground/90">{assessment.solution.explanation}</p>
                  {assessment.solution.correctCode && (
                    <>
                      <h5 className="font-medium mt-2 text-primary">Correct Code:</h5>
                      <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap font-mono">{assessment.solution.correctCode}</pre>
                    </>
                  )}
                   {assessment.solution.correctOptionId && assessment.challengeData.options && (
                    <>
                      <h5 className="font-medium mt-2 text-primary">Correct Option:</h5>
                      <p className="text-foreground/90">{assessment.challengeData.options.find(opt => opt.id === assessment.solution.correctOptionId)?.text || 'N/A'}</p>
                    </>
                  )}
                  {assessment.challengeType === 'fill_in_the_blanks' && assessment.solution.correctValues && assessment.solution.correctValues.length > 0 && (
                    <>
                        <h5 className="font-medium mt-2 text-primary">Correct Answers:</h5>
                        <ul className="list-disc pl-5 text-xs text-foreground/90">
                        {assessment.challengeData.blanks?.map((blank, blankIndex) => {
                            const correctValObj = assessment.solution.correctValues?.find(cv => cv.blankId === blank.id);
                            return (
                                <li key={blank.id}>
                                Blank {blankIndex + 1}: <span className="font-semibold">{correctValObj?.value || 'N/A'}</span>
                                </li>
                            );
                        })}
                        </ul>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 p-6 border-t">
          <Button variant="outline" onClick={() => setShowHint(!showHint)} className="w-full sm:w-auto border-accent text-accent hover:bg-accent/10">
            <Lightbulb className="mr-2 h-4 w-4" /> {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
          {showHint && (
            <Alert variant="default" className="w-full text-sm p-3 my-2 bg-secondary/50 border-secondary text-secondary-foreground">
               <Lightbulb className="h-4 w-4 text-secondary-foreground/80" />
               <AlertTitle className="text-secondary-foreground font-medium">Conceptual Hint</AlertTitle>
              <AlertDescription className="text-secondary-foreground/80">{assessment.solution.explanation.substring(0, 120)}... (Full hint system TBD)</AlertDescription>
            </Alert>
          )}
          {!isSubmitted ? (
            <Button 
                onClick={handleSubmitAnswer} 
                disabled={isSubmitting || userAnswer === null || (typeof userAnswer === 'object' && Object.keys(userAnswer).length === 0 && assessment.challengeType !== 'fill_in_the_blanks') || (typeof userAnswer === 'string' && userAnswer.trim() === '')} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit Answer
            </Button>
          ) : (
             <Button onClick={handleRetry} variant="secondary" className="w-full sm:w-auto shadow hover:shadow-md transition-shadow">
                <Play className="mr-2 h-4 w-4" /> Retry Challenge
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


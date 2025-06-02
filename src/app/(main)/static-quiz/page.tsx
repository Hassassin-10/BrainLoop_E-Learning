
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { staticQuizQuestions, quizCategories, quizNumOfQuestionsOptions, DEFAULT_QUIZ_TIME_LIMIT } from '@/data/staticQuizData';
import type { StaticQuizQuestion } from '@/types/staticQuiz';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, CheckCircle, HelpCircle, Hourglass, Loader2, RefreshCw, Settings, Sparkles, Timer, XCircle, ShieldAlert, Trophy, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { submitQuizAttempt, getLeaderboardData, type LeaderboardEntry } from '@/services/quizService';
import type { UserAnswer as UserAttemptAnswer } from '@/types/quiz';
import { useRouter } from 'next/navigation';


type QuizMode = 'config' | 'quiz' | 'result' | 'auth_required';

export default function StaticQuizPage() {
  const { studentId, firebaseUser, isAuthenticated, isLoading: authIsLoading, studentProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<QuizMode>(authIsLoading ? 'config' : (isAuthenticated ? 'config' : 'auth_required'));
  const [selectedCategory, setSelectedCategory] = useState<string>(quizCategories[0]);
  const [selectedNumQuestions, setSelectedNumQuestions] = useState<number>(quizNumOfQuestionsOptions[1]);

  const [currentQuestion, setCurrentQuestion] = useState<StaticQuizQuestion | null>(null);
  const [questionPool, setQuestionPool] = useState<StaticQuizQuestion[]>([]);
  const [askedQuestionIndices, setAskedQuestionIndices] = useState<number[]>([]);
  const [currentQuestionDisplayIndex, setCurrentQuestionDisplayIndex] = useState(0);

  const [userSelectedOptionIndex, setUserSelectedOptionIndex] = useState<number | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isSelectionDisabled, setIsSelectionDisabled] = useState(false);

  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUIZ_TIME_LIMIT);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const { toast } = useToast();

  const [quizAnswers, setQuizAnswers] = useState<UserAttemptAnswer[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Leaderboard states
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>(quizCategories[0]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      setMode('auth_required');
    } else if (!authIsLoading && isAuthenticated && mode === 'auth_required') {
      setMode('config');
    }
  }, [isAuthenticated, authIsLoading, mode]);

  useEffect(() => {
    if (mode === 'config' || mode === 'result') { // Fetch leaderboard when on config or result screen
      fetchLeaderboard();
    }
  }, [leaderboardCategory, mode]);


  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(DEFAULT_QUIZ_TIME_LIMIT);
  }, []);

  const startTimer = useCallback(() => {
    resetTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          setIsSelectionDisabled(true);
          toast({ title: "Time's up!", description: "Moving to next question or showing result.", variant: "default" });
          highlightCorrectAnswer();
          if(nextQuestionBtnRef.current) nextQuestionBtnRef.current.focus();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [resetTimer, toast]);

  const nextQuestionBtnRef = useRef<HTMLButtonElement>(null);

  const submitAttempt = useCallback(async () => {
    if (!firebaseUser?.uid || !quizStartTime) {
        toast({ title: "Info", description: "Quiz results not saved as user is not fully identified or quiz did not start properly.", variant: "default"});
        return;
    }
    setIsSubmittingResult(true);
    const durationSeconds = Math.floor((Date.now() - quizStartTime) / 1000);

    const questionsForSubmission = questionPool
      .filter((_, idx) => askedQuestionIndices.slice(0, selectedNumQuestions).includes(idx))
      .map((q, i) => ({
        id: q.question,
        questionText: q.question,
        options: q.options.map((optText, optIdx) => ({ id: `${q.question}-opt${optIdx}`, text: optText })),
        correctOptionId: `${q.question}-opt${q.correctAnswer}`,
        explanation: ""
    }));


    try {
        const quizAttemptId = `${selectedCategory.toLowerCase().replace(/\s+/g, '-')}-${selectedNumQuestions}`;
        await submitQuizAttempt(
            quizAttemptId,
            `${selectedCategory} Quiz (${selectedNumQuestions} questions)`,
            firebaseUser.uid,
            studentProfile?.name || null,
            quizAnswers,
            questionsForSubmission.slice(0, selectedNumQuestions),
            durationSeconds
        );
        toast({ title: "Success", description: "Quiz results submitted." });
        fetchLeaderboard(); // Refresh leaderboard after submitting
    } catch (error) {
        console.error("Failed to submit quiz attempt:", error);
        toast({ title: "Error", description: `Failed to save quiz results: ${(error as Error).message}`, variant: "destructive" });
    } finally {
        setIsSubmittingResult(false);
    }
  }, [firebaseUser, quizStartTime, questionPool, askedQuestionIndices, selectedNumQuestions, selectedCategory, quizAnswers, toast, studentProfile?.name]);


  const loadRandomQuestion = useCallback(() => {
    if (askedQuestionIndices.length >= Math.min(selectedNumQuestions, questionPool.length)) {
      setMode('result');
      submitAttempt();
      return null;
    }

    let randomIndex;
    let questionCandidate;

    if (questionPool.length <= 0) {
        toast({title: "No questions", description: `No questions found for category ${selectedCategory}`, variant: "destructive"});
        setMode('config');
        return null;
    }

    do {
      randomIndex = Math.floor(Math.random() * questionPool.length);
      questionCandidate = questionPool[randomIndex];
    } while (askedQuestionIndices.includes(randomIndex) && askedQuestionIndices.length < questionPool.length);

    if (askedQuestionIndices.length >= questionPool.length && questionPool.length < selectedNumQuestions) {
        setMode('result');
        submitAttempt();
        return null;
    }

    setAskedQuestionIndices(prev => [...prev, randomIndex]);
    setCurrentQuestionDisplayIndex(prev => prev + 1);
    return questionCandidate;
  }, [askedQuestionIndices, selectedNumQuestions, questionPool, toast, selectedCategory, submitAttempt]);


  const handleStartQuiz = () => {
    if (!isAuthenticated) {
        setMode('auth_required');
        toast({ title: "Authentication Required", description: "Please log in to start the quiz.", variant: "destructive"});
        return;
    }
    const categoryData = staticQuizQuestions.find(cat => cat.category.toLowerCase() === selectedCategory.toLowerCase());
    if (!categoryData || categoryData.questions.length === 0) {
      toast({ title: "Error", description: `No questions available for category: ${selectedCategory}`, variant: "destructive" });
      return;
    }

    let actualNumQuestions = selectedNumQuestions;
    if (selectedNumQuestions > categoryData.questions.length) {
        toast({ title: "Note", description: `Selected category has only ${categoryData.questions.length} questions. Quiz will have ${categoryData.questions.length} questions.`, variant: "default" });
        actualNumQuestions = categoryData.questions.length;
    }


    setQuestionPool(categoryData.questions);
    setSelectedNumQuestions(actualNumQuestions);
    setCorrectAnswersCount(0);
    setAskedQuestionIndices([]);
    setCurrentQuestionDisplayIndex(0);
    setQuizAnswers([]);
    setQuizStartTime(Date.now());

    const firstQuestion = loadRandomQuestion();
    if (firstQuestion) {
      setCurrentQuestion(firstQuestion);
      setMode('quiz');
      setIsSelectionDisabled(false);
      setUserSelectedOptionIndex(null);
      startTimer();
    } else if(categoryData.questions.length > 0) {
       toast({title: "Error", description: "Could not load the first question.", variant: "destructive" });
       setMode('config');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'quiz') {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [mode]);

  const highlightCorrectAnswer = () => {
    if (!currentQuestion || userSelectedOptionIndex === null) return;
    const correctOptionElement = answerOptionsRef.current?.children[currentQuestion.correctAnswer] as HTMLLabelElement | undefined;
    if (correctOptionElement && userSelectedOptionIndex !== currentQuestion.correctAnswer) {
        correctOptionElement.classList.add("correct-missed", "border-green-500", "bg-green-500/10");
    }
  };
  const answerOptionsRef = useRef<HTMLDivElement>(null);


  const handleOptionSelect = (optionIndex: number) => {
    if (isSelectionDisabled || !currentQuestion) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsSelectionDisabled(true);
    setUserSelectedOptionIndex(optionIndex);

    const isCorrect = currentQuestion.correctAnswer === optionIndex;
    if (isCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
    } else {
      highlightCorrectAnswer();
    }

    setQuizAnswers(prev => [...prev, {
      questionId: currentQuestion.question,
      selectedOptionId: currentQuestion.options[optionIndex]
    }]);
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;

    if (currentQuestionDisplayIndex >= selectedNumQuestions) {
      setMode('result');
      submitAttempt();
      return;
    }

    const nextQ = loadRandomQuestion();
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setUserSelectedOptionIndex(null);
      setIsSelectionDisabled(false);
      startTimer();
    } else {
      setMode('result');
      submitAttempt();
    }
  };


  const handleTryAgain = () => {
    setMode('config');
    resetTimer();
    setCurrentQuestion(null);
    setAskedQuestionIndices([]);
    setCurrentQuestionDisplayIndex(0);
    setUserSelectedOptionIndex(null);
    setCorrectAnswersCount(0);
    setIsSelectionDisabled(false);
    setQuestionPool([]);
    setQuizAnswers([]);
    setQuizStartTime(null);
  };

  const fetchLeaderboard = useCallback(async () => {
    if (!leaderboardCategory) return;
    setIsLoadingLeaderboard(true);
    try {
      const data = await getLeaderboardData(leaderboardCategory);
      setLeaderboardData(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      toast({ title: "Error", description: "Could not load leaderboard.", variant: "destructive" });
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [leaderboardCategory, toast]);


  if (!mounted || authIsLoading) {
     return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (mode === 'auth_required') {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader>
             <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive mt-4">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">Please log in to access the quiz feature.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/login')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  if (mode === 'config') {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Card className="w-full max-w-lg mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <Settings className="mr-2 h-6 w-6" /> Quiz Configuration
            </CardTitle>
            <CardDescription>Customize your quiz experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-lg font-medium mb-2 block">Select Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {quizCategories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                    className="w-full capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-lg font-medium mb-2 block">Number of Questions</Label>
              <div className="flex flex-wrap gap-2">
                {quizNumOfQuestionsOptions.map(num => (
                  <Button
                    key={num}
                    variant={selectedNumQuestions === num ? 'default' : 'outline'}
                    onClick={() => setSelectedNumQuestions(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartQuiz} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!isAuthenticated}>
              Start Quiz
            </Button>
          </CardFooter>
        </Card>
        <LeaderboardSection
          category={leaderboardCategory}
          onCategoryChange={setLeaderboardCategory}
          data={leaderboardData}
          isLoading={isLoadingLeaderboard}
        />
      </div>
    );
  }

  if (mode === 'quiz' && currentQuestion) {
    const progressPercent = (currentQuestionDisplayIndex / selectedNumQuestions) * 100;
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-primary flex items-center capitalize">
                <HelpCircle className="mr-2 h-6 w-6" /> {selectedCategory} Quiz
              </CardTitle>
              <div className={`flex items-center p-2 rounded-md text-lg font-semibold ${timeLeft <=5 ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                <Timer className="mr-2 h-5 w-5" />
                <span>{timeLeft}s</span>
              </div>
            </div>
            <Progress value={progressPercent} className="w-full mt-2 h-3" aria-label="Quiz progress"/>
            <CardDescription className="text-right mt-1">
              Question {currentQuestionDisplayIndex} of {selectedNumQuestions}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl font-semibold text-foreground">{currentQuestion.question}</p>
            <RadioGroup
              ref={answerOptionsRef}
              value={userSelectedOptionIndex !== null ? currentQuestion.options[userSelectedOptionIndex] : undefined}
              onValueChange={(value) => {
                const index = currentQuestion.options.findIndex(opt => opt === value);
                handleOptionSelect(index);
              }}
              className="space-y-3"
              disabled={isSelectionDisabled}
            >
              {currentQuestion.options.map((option, index) => {
                let itemClass = "border-border hover:bg-muted/50";
                let IconComponent = null;
                if (isSelectionDisabled) {
                    const isCorrectUserChoice = index === userSelectedOptionIndex && index === currentQuestion.correctAnswer;
                    const isIncorrectUserChoice = index === userSelectedOptionIndex && index !== currentQuestion.correctAnswer;
                    const isActualCorrect = index === currentQuestion.correctAnswer;

                    if (isCorrectUserChoice) {
                        itemClass = "border-green-500 bg-green-500/20 text-green-700 dark:text-green-400";
                        IconComponent = <CheckCircle className="h-5 w-5 text-green-500" />;
                    } else if (isIncorrectUserChoice) {
                        itemClass = "border-red-500 bg-red-500/20 text-red-700 dark:text-red-400";
                        IconComponent = <XCircle className="h-5 w-5 text-red-500" />;
                    } else if (isActualCorrect) {
                         itemClass = "border-green-500 bg-green-500/10 text-green-600 dark:text-green-500";
                         if(userSelectedOptionIndex !== currentQuestion.correctAnswer) {
                            IconComponent = <CheckCircle className="h-5 w-5 text-green-500 opacity-70" />;
                         }
                    } else {
                        itemClass = "opacity-70";
                    }
                }

                return (
                  <Label
                    key={index}
                    htmlFor={`option-${index}`}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${itemClass} ${isSelectionDisabled && index !== userSelectedOptionIndex && index !== currentQuestion.correctAnswer ? 'opacity-60' : ''}`}
                  >
                    <span className="flex-grow">{option}</span>
                    <div className="flex items-center">
                      {IconComponent}
                      {!isSelectionDisabled && <RadioGroupItem value={option} id={`option-${index}`} className="ml-4" />}
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button ref={nextQuestionBtnRef} onClick={handleNextQuestion} disabled={!isSelectionDisabled && timeLeft > 0} className="bg-primary hover:bg-primary/90">
              {currentQuestionDisplayIndex === selectedNumQuestions ? 'Finish Quiz' : 'Next Question'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (mode === 'result') {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Card className="w-full max-w-md mx-auto text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary mt-4">Quiz Completed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Image
                src={`https://picsum.photos/seed/quizcomplete${Date.now()}/300/200`}
                alt="Quiz completed"
                width={300}
                height={200}
                className="mx-auto rounded-lg shadow-md"
                data-ai-hint="quiz celebration"
            />
            <p className="text-xl text-foreground">
              You answered <strong className="text-accent">{correctAnswersCount}</strong> out of <strong className="text-accent">{selectedNumQuestions}</strong> questions correctly.
            </p>
            <p className="text-4xl font-bold text-primary">
              Your Score: {((correctAnswersCount / selectedNumQuestions) * 100).toFixed(0)}%
            </p>
            {isSubmittingResult && <div className="flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Saving results...</span></div>}
          </CardContent>
          <CardFooter>
            <Button onClick={handleTryAgain} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Another Quiz
            </Button>
          </CardFooter>
        </Card>
        <LeaderboardSection
          category={leaderboardCategory}
          onCategoryChange={setLeaderboardCategory}
          data={leaderboardData}
          isLoading={isLoadingLeaderboard}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-muted-foreground">Loading Quiz Interface...</p>
    </div>
  );
}

interface LeaderboardSectionProps {
  category: string;
  onCategoryChange: (category: string) => void;
  data: LeaderboardEntry[];
  isLoading: boolean;
}

function LeaderboardSection({ category, onCategoryChange, data, isLoading }: LeaderboardSectionProps) {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-yellow-500" /> Quiz Leaderboard
        </CardTitle>
        <CardDescription>See who's topping the charts in different quiz categories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="leaderboardCategory" className="text-md font-medium">Select Category for Leaderboard</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger id="leaderboardCategory" className="mt-1 bg-background">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {quizCategories.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No leaderboard data available for {category}. Be the first to set a score!</p>
        )}

        {!isLoading && data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">High Score</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.studentId} className={entry.studentId === useAuth().studentId ? 'bg-accent/20' : ''}>
                    <TableCell className="font-medium">{entry.rank}</TableCell>
                    <TableCell>{entry.studentName}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{entry.highScore.toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{entry.attempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <BarChart3 className="mr-2 h-4 w-4" />
        Leaderboard shows top scores for the selected category. Keep practicing!
      </CardFooter>
    </Card>
  );
}

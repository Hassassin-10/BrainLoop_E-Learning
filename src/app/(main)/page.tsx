
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea'; 
import { AnimationWrapper } from '@/components/ui/animation-wrapper'; 
import { SplineBackground } from '@/components/spline-background';
import {
  ArrowRight,
  BarChart,
  Brain,
  Bot,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageCircle,
  PencilRuler,
  TrendingUp,
  Eye,
  Ear,
  Zap,
  Sparkles,
  BookOpen,
  Activity,
  Award,
  Star,
  Loader2,
  Send,
  ThumbsUp,
  FlaskConical
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; 
import { submitStudentFeedback } from '@/services/feedbackService'; 
import { useToast } from '@/hooks/use-toast'; 

export default function HomePage() {
   const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
      <HeroSection />
      <GamificationSection />
      <FeaturesSection />
      <RecentActivitySection />
      <HowItWorksSection />
      <FeedbackSection /> 
      <CtaSection />
      <Footer />
    </div>
  );
}

function HeroSection() {
  const { isAuthenticated } = useAuth();
  const heroButtonLink = isAuthenticated ? "/courses" : "/login";
  const heroButtonText = isAuthenticated ? "Explore Courses" : "Get Started";

  return (
    <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden">
      <SplineBackground />
      <div className="relative container mx-auto px-4 md:px-6 text-center z-10">
        <AnimationWrapper delay={100}>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
            Unlock Your Learning Potential with BrainLoop
          </h1>
        </AnimationWrapper>
        <AnimationWrapper delay={200}>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            BrainLoop empowers students and educators with personalized learning
            experiences, AI-powered Q&A, and custom quiz generation.
          </p>
        </AnimationWrapper>
        <AnimationWrapper delay={300}>
          <div className="flex flex-col items-center space-y-3 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-shadow">
             <Link href={heroButtonLink}>
              {heroButtonText}
              <ArrowRight className="ml-2 h-5 w-5" />
             </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-2 hover:border-primary hover:bg-primary/5">
              Learn More
            </Button>
          </div>
        </AnimationWrapper>
      </div>
    </section>
  );
}

function GamificationSection() {
  const { studentProfile } = useAuth();
  
  const averageProgress = 33; 
  
  const coursesCompletedCount = studentProfile?.coursesCompleted?.length || 1; 
  const totalCoursesExample = 3; 

  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <AnimationWrapper>
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-primary md:text-4xl text-center">
            Your Learning Journey
            </h2>
        </AnimationWrapper>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <AnimationWrapper delay={100}>
            <Card className="card-standout overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <TrendingUp className="mr-2 h-6 w-6 text-accent" />
                  Overall Progress
                </CardTitle>
                <CardDescription>You're doing great! Keep up the momentum.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>Course Completion</span>
                    <span className="text-primary font-semibold">{averageProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={averageProgress} aria-label="Course completion progress" className="h-4 rounded-full overflow-hidden">
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-foreground/90">
                      {averageProgress.toFixed(0)}% Complete
                    </span>
                  </Progress>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've completed {coursesCompletedCount} out of {totalCoursesExample} courses. Keep going!
                </p>
              </CardContent>
            </Card>
          </AnimationWrapper>
          <AnimationWrapper delay={200}>
            <Card className="card-standout overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Award className="mr-2 h-6 w-6 text-accent" />
                  Achievements & Badges
                </CardTitle>
                <CardDescription>Collect badges as you master new skills.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <div className="achievement-badge">
                  <Star className="mr-1 h-4 w-4 text-yellow-500" /> Math Whiz
                </div>
                <div className="achievement-badge">
                  <Sparkles className="mr-1 h-4 w-4 text-blue-500" /> Science Explorer
                </div>
                <div className="achievement-badge-outline">
                  <BookOpen className="mr-1 h-4 w-4" /> Quick Learner
                </div>
                <div className="achievement-badge-outline">
                  Perfect Score
                </div>
              </CardContent>
            </Card>
          </AnimationWrapper>
        </div>
      </div>
    </section>
  );
}


const featuresData = [
  { icon: <Eye className="h-10 w-10 text-primary" />, title: "Visual Learning", description: "Engage with vibrant, visual content designed to enhance understanding." },
  { icon: <Ear className="h-10 w-10 text-primary" />, title: "Audio Lessons", description: "Immerse yourself in auditory learning that adapts to your pace." },
  { icon: <Zap className="h-10 w-10 text-primary" />, title: "Interactive Exercises", description: "Boost knowledge retention with hands-on learning and instant feedback." },
  { icon: <ClipboardList className="h-10 w-10 text-primary" />, title: "Personalized Paths", description: "Tailored learning experiences designed for your unique style (visual, auditory, kinesthetic)." },
  { icon: <Bot className="h-10 w-10 text-primary" />, title: "Real-time Support", description: "Instant help with our AI assistant and NLP-powered question answering." },
  { icon: <FlaskConical className="h-10 w-10 text-primary" />, title: "AR Interactive Labs", description: "Experience hands-on learning with augmented reality simulations." },
  { icon: <FileText className="h-10 w-10 text-primary" />, title: "Custom Quizzes", description: "Reinforce knowledge with quizzes generated specifically for your learning needs." },
  { icon: <BarChart className="h-10 w-10 text-primary" />, title: "Teacher Insights", description: "Empowering educators with data-driven insights into student progress." },
  { icon: <Brain className="h-10 w-10 text-primary" />, title: "AI + Education", description: "Experience the future of learning with our cutting-edge AI integration." },
];

function FeaturesSection() {
  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-secondary/80 dark:bg-secondary/10">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <AnimationWrapper>
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Key Features
            </h2>
        </AnimationWrapper>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuresData.map((feature, index) => (
            <AnimationWrapper key={feature.title} delay={index * 100}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </AnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="flex flex-col items-center p-6 text-center transition-transform hover:scale-105 bg-background card-standout overflow-hidden h-full">
      <div className="mb-4 rounded-full bg-primary/10 p-4">{icon}</div>
      <CardTitle className="mb-2 text-xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}

function RecentActivitySection() {
  const activities = [
    {
      id: 1,
      title: "New Course: Advanced Calculus",
      description: "Challenge yourself with our newly added Advanced Calculus course, designed for visual learners.",
      imageSrc: "https://picsum.photos/seed/calculus/400/200",
      category: "Mathematics",
      aiHint: "calculus textbook",
    },
    {
      id: 2,
      title: "AR Lab Update: Chemistry Titration",
      description: "Experience enhanced realism in our updated AR Chemistry Titration lab. More precise and interactive!",
      imageSrc: "https://picsum.photos/seed/chemistrylab/400/200",
      category: "Science Lab",
      aiHint: "chemistry lab",
    },
    {
      id: 3,
      title: "Recommended: Python for Beginners",
      description: "Based on your interest in problem-solving, we recommend starting with Python for Beginners.",
      imageSrc: "https://picsum.photos/seed/python/400/200",
      category: "Programming",
      aiHint: "python code",
    },
  ];

  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <AnimationWrapper>
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-primary md:text-4xl text-center">
            <Activity className="inline-block mr-3 h-8 w-8" />
            What's New & Recommended
            </h2>
        </AnimationWrapper>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <AnimationWrapper key={activity.id} delay={index * 100}>
              <Card className="flex flex-col overflow-hidden card-standout h-full">
                <div className="relative h-48 w-full">
                  <Image
                    src={activity.imageSrc}
                    alt={activity.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    data-ai-hint={activity.aiHint}
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{activity.title}</CardTitle>
                  <Badge variant="outline" className="w-fit">{activity.category}</Badge>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{activity.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-shadow">
                    <Link href="/courses">
                      Learn More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </AnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

const howItWorksData = [
  { icon: <ClipboardList className="h-10 w-10 text-primary" />, title: "Assess Learning Style", description: "Initial test to identify student preferences for visual, auditory, or kinesthetic learning.", imageSrc: "https://picsum.photos/seed/assessment/400/300", imageAlt: "Student taking a test", "data-ai-hint": "learning assessment" },
  { icon: <MessageCircle className="h-10 w-10 text-primary" />, title: "NLP Query Handling", description: "Processes doubts and delivers clear answers using advanced Natural Language Processing.", imageSrc: "https://picsum.photos/seed/nlpchat/400/300", imageAlt: "Chatbot interface", "data-ai-hint": "NLP chatbot" },
  { icon: <PencilRuler className="h-10 w-10 text-primary" />, title: "Quiz Generation", description: "Creates tailored quizzes for knowledge reinforcement based on individual learning needs.", imageSrc: "https://picsum.photos/seed/quizgen/400/300", imageAlt: "Quiz generation interface", "data-ai-hint": "quiz interface" },
  { icon: <TrendingUp className="h-10 w-10 text-primary" />, title: "Track Progress", description: "Integrates with LMS to monitor and guide learning, providing valuable insights.", imageSrc: "https://picsum.photos/seed/progressdash/400/300", imageAlt: "Progress tracking dashboard", "data-ai-hint": "dashboard chart" },
];

function HowItWorksSection() {
  return (
    <section className="w-full py-16 md:py-24 lg:py-32 bg-secondary/80 dark:bg-secondary/10">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <AnimationWrapper>
            <h2 className="mb-12 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            How It Works: AI in Action
            </h2>
        </AnimationWrapper>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {howItWorksData.map((item, index) => (
            <AnimationWrapper key={item.title} delay={index * 100}>
              <HowItWorksCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                imageSrc={item.imageSrc}
                imageAlt={item.imageAlt}
                data-ai-hint={item['data-ai-hint']}
              />
            </AnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}

interface HowItWorksCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  "data-ai-hint": string;
}

function HowItWorksCard({
  icon,
  title,
  description,
  imageSrc,
  imageAlt,
  "data-ai-hint": dataAiHint,
}: HowItWorksCardProps) {
  return (
    <Card className="overflow-hidden transition-transform hover:scale-105 bg-background card-standout h-full">
      <div className="relative h-48 w-full">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          data-ai-hint={dataAiHint}
        />
      </div>
      <CardHeader className="pt-6">
        <div className="mb-3 flex justify-center">{icon}</div>
        <CardTitle className="text-center text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function FeedbackSection() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firebaseUser, studentProfile, isAuthenticated } = useAuth(); // Use firebaseUser for UID
  const { toast } = useToast();

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast({
        title: 'Empty Feedback',
        description: 'Please write something before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAuthenticated || !firebaseUser?.uid) { // Check firebaseUser.uid for authentication
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to submit feedback.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const nameToSubmit = studentProfile?.name || firebaseUser?.displayName || 'Anonymous';
      const emailToSubmit = studentProfile?.email || firebaseUser?.email || 'N/A';

      // Pass firebaseUser.uid as the first argument (studentUid)
      await submitStudentFeedback(firebaseUser.uid, nameToSubmit, emailToSubmit, feedback);
      toast({
        title: 'Feedback Submitted!',
        description: 'Thank you for your valuable feedback.',
      });
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback from page:', error);
      toast({
        title: 'Submission Error',
        description: (error as Error).message || 'Could not submit feedback. Please try again.', // Display more specific error
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <AnimationWrapper>
          <Card className="max-w-2xl mx-auto card-standout">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary flex items-center">
                <ThumbsUp className="mr-2 h-6 w-6" /> Share Your Thoughts
              </CardTitle>
              <CardDescription>
                We value your feedback! Let us know how we can improve BrainLoop.
                 {isAuthenticated && studentProfile && (
                  <span className="block text-xs mt-1">
                    Submitting as: {studentProfile.name} ({studentProfile.email || firebaseUser?.email || 'Email N/A'})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="feedbackInput"
                placeholder="Enter your comments here..."
                rows={5}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="bg-background"
                disabled={isSubmitting || !isAuthenticated}
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmitFeedback} 
                disabled={isSubmitting || !feedback.trim() || !isAuthenticated} 
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </CardFooter>
             {!isAuthenticated && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                    You need to be logged in to submit feedback.
                </p>
            )}
          </Card>
        </AnimationWrapper>
      </div>
    </section>
  );
}


function CtaSection() {
  const { isAuthenticated } = useAuth();
  const ctaLink = isAuthenticated ? "/courses" : "/login";
  const ctaText = isAuthenticated ? "Start Learning Now" : "Sign Up for Free";
  return (
    <section className="w-full py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <AnimationWrapper>
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Ready to Transform Learning?
            </h2>
        </AnimationWrapper>
        <AnimationWrapper delay={100}>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Join BrainLoop today and experience the future of personalized
            education. Empower students, support teachers, and unlock true
            potential.
            </p>
        </AnimationWrapper>
        <AnimationWrapper delay={200}>
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-shadow">
              <Link href={ctaLink}>
                {ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
        </AnimationWrapper>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">
            © {new Date().getFullYear()} BrainLoop. All rights reserved.
          </p>
          <p className="text-sm mt-1">
            Made by HEMANTH S.P ❤️
          </p>
        </div>
        <div className="flex space-x-4">
          <Link href="#" className="hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-accent transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}


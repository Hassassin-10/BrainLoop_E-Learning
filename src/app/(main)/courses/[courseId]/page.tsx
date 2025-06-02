"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
// Label import was missing
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"; // Added DialogDescription
import {
  mockCourses,
  learningStyleIcons,
  moduleTypeIcons,
} from "@/data/mockCourses";
import type {
  Course,
  CourseModule,
  SuggestedYouTubeVideo,
} from "@/types/course";
import type { DoubtMessage, DoubtReply } from "@/types/doubt";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDoubtsForModule,
  addDoubt,
  addReplyToDoubt,
  togglePinDoubt,
  toggleLikeDoubt,
} from "@/services/doubtService";
import { logArSessionLaunch } from "@/services/arSessionService";
import { logLearningStat } from "@/services/learningAnalyticsService";
import PaymentButton from "@/components/payment-button";
import { saveMoodLog, saveBoostLog } from "@/services/moodService";
import type { MoodOption } from "@/types/mood";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  ListChecks,
  Info,
  Youtube,
  MessageSquare,
  Send,
  Reply,
  Bookmark,
  User,
  CornerDownRight,
  ThumbsUp,
  Film,
  Clock,
  Lock,
  ShoppingCart,
  CheckCircle,
  Gamepad,
  Video,
  PlayCircle,
  Smile,
  Zap as ZapIcon,
  Coffee,
  Meh,
  Frown,
  AudioLines,
  Gamepad2,
} from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { Timestamp, type FieldValue } from "firebase/firestore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper function to get YouTube embed URL
function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function DoubtChatSection({
  courseId,
  module,
  studentId,
  studentName,
  studentUid,
}: {
  courseId: string;
  module: CourseModule;
  studentId: string | null;
  studentName: string | null;
  studentUid: string | null;
}) {
  const [doubts, setDoubts] = useState<DoubtMessage[]>([]);
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(true);
  const [newDoubtText, setNewDoubtText] = useState("");
  const [newDoubtVideoTimestamp, setNewDoubtVideoTimestamp] = useState<
    number | undefined
  >(undefined);
  const [replyingTo, setReplyingTo] = useState<{
    doubtId: string;
    doubtText: string;
  } | null>(null);
  const [newReplyText, setNewReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const doubtsEndRef = useRef<HTMLDivElement>(null);

  const allowedStudentIdsForChat = ["8918", "8946", "8947", "STRITH23170"];
  const canChat = studentId && allowedStudentIdsForChat.includes(studentId);

  useEffect(() => {
    if (!courseId || !module.id) return;
    setIsLoadingDoubts(true);
    const unsubscribe = getDoubtsForModule(
      courseId,
      module.id,
      (fetchedDoubts) => {
        setDoubts(fetchedDoubts);
        setIsLoadingDoubts(false);
      },
      (error) => {
        console.error("Failed to load doubts:", error);
        toast({
          title: "Error",
          description: "Could not load doubts for this module.",
          variant: "destructive",
        });
        setIsLoadingDoubts(false);
      }
    );
    return () => unsubscribe();
  }, [courseId, module.id, toast]);

  useEffect(() => {
    doubtsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [doubts]);

  const handleSendDoubt = async () => {
    if (!newDoubtText.trim() || !studentId || !studentName) return;
    setIsSubmitting(true);
    try {
      const submittedDoubtId = await addDoubt(
        courseId,
        module.id,
        newDoubtText,
        studentId,
        studentName,
        newDoubtVideoTimestamp
      );
      setNewDoubtText("");
      setNewDoubtVideoTimestamp(undefined);
      toast({ title: "Doubt posted!" });
      if (studentUid) {
        await logLearningStat(studentUid, courseId, module.id, {
          doubtsRaisedIds: [submittedDoubtId],
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to post doubt: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (doubtId: string) => {
    if (!newReplyText.trim() || !studentId || !studentName) return;
    setIsSubmitting(true);
    try {
      await addReplyToDoubt(
        courseId,
        module.id,
        doubtId,
        newReplyText,
        studentId,
        studentName
      );
      setNewReplyText("");
      setReplyingTo(null);
      toast({ title: "Reply posted!" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to post reply: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (doubt: DoubtMessage) => {
    if (!studentId) return;
    setIsSubmitting(true);
    try {
      await togglePinDoubt(
        courseId,
        module.id,
        doubt.id,
        doubt.pinned,
        studentId
      );
      toast({ title: doubt.pinned ? "Doubt unpinned" : "Doubt pinned!" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to toggle pin: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (doubtId: string) => {
    if (!studentUid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to like a doubt.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await toggleLikeDoubt(courseId, module.id, doubtId, studentUid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update like: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (
    timestampInput: Timestamp | FieldValue | undefined
  ): string => {
    if (!timestampInput || !(timestampInput instanceof Timestamp)) {
      if (
        timestampInput &&
        typeof (timestampInput as any).isEqual === "function"
      ) {
        return "Processing...";
      }
      return "";
    }
    const date = timestampInput.toDate();
    if (isNaN(date.getTime()) || date.getTime() === 0) return "Date N/A";
    return formatDistanceToNowStrict(date, { addSuffix: true });
  };

  return (
    <div className="mt-6 p-4 border-t border-border bg-secondary/20 rounded-b-lg">
      <h3 className="text-lg font-semibold text-primary mb-3 flex items-center">
        <MessageSquare className="mr-2 h-5 w-5" /> Module Doubts & Discussion
      </h3>
      {isLoadingDoubts && (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoadingDoubts && doubts.length === 0 && !canChat && (
        <p className="text-sm text-muted-foreground italic">
          No doubts posted for this module yet.
        </p>
      )}
      {!isLoadingDoubts && doubts.length === 0 && canChat && (
        <p className="text-sm text-muted-foreground italic">
          No doubts posted yet. Be the first to ask a question!
        </p>
      )}

      <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 pr-2">
        {doubts
          .sort((a, b) => {
            const pinnedAVal = a.pinned ? 1 : 0;
            const pinnedBVal = b.pinned ? 1 : 0;
            if (pinnedAVal !== pinnedBVal) return pinnedBVal - pinnedAVal;

            const timeA =
              a.timestamp instanceof Timestamp
                ? a.timestamp.toMillis()
                : typeof (a.timestamp as any)?.toMillis === "function"
                ? (a.timestamp as any).toMillis()
                : 0;
            const timeB =
              b.timestamp instanceof Timestamp
                ? b.timestamp.toMillis()
                : typeof (b.timestamp as any)?.toMillis === "function"
                ? (b.timestamp as any).toMillis()
                : 0;

            if (timeA === 0 && timeB === 0 && a.id && b.id)
              return a.id.localeCompare(b.id);
            if (timeA === 0) return 1; // Push items with invalid/pending timestamps to the end
            if (timeB === 0) return -1;
            return timeA - timeB;
          })
          .map((doubt) => (
            <Card
              key={doubt.id}
              className={`shadow-sm ${
                doubt.pinned
                  ? "bg-yellow-100 dark:bg-yellow-700/30 border-yellow-400"
                  : "bg-card"
              }`}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {doubt.senderName || doubt.senderId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(doubt.timestamp)}
                    </p>
                    {doubt.videoTimestamp !== undefined && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="mr-1 h-3 w-3" />@
                        {Math.floor(doubt.videoTimestamp / 60)}:
                        {(doubt.videoTimestamp % 60)
                          .toString()
                          .padStart(2, "0")}{" "}
                        in video
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {canChat &&
                      (doubt.senderId === studentId ||
                        studentId === "8918" ||
                        studentId === "STRITH23170") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(doubt)}
                          disabled={isSubmitting}
                          title={doubt.pinned ? "Unpin Doubt" : "Pin Doubt"}
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              doubt.pinned
                                ? "fill-yellow-500 text-yellow-600"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      )}
                    {studentUid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleLike(doubt.id)}
                        disabled={isSubmitting}
                        title="Like/Unlike"
                      >
                        <ThumbsUp
                          className={`h-4 w-4 ${
                            doubt.likes?.includes(studentUid)
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="ml-1 text-xs">
                          {doubt.likes?.length || 0}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {doubt.text}
                </p>

                {doubt.replies && doubt.replies.length > 0 && (
                  <div className="pl-4 mt-2 space-y-2 border-l-2 border-primary/30">
                    {doubt.replies
                      .sort(
                        (a, b) =>
                          (a.timestamp as Timestamp).toMillis() -
                          (b.timestamp as Timestamp).toMillis()
                      )
                      .map((reply) => (
                        <div
                          key={reply.id}
                          className="text-sm bg-secondary/50 p-2 rounded"
                        >
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-accent">
                              {reply.senderName || reply.senderId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(reply.timestamp)}
                            </p>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">
                            {reply.text}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {canChat && (
                  <div className="mt-2">
                    {replyingTo?.doubtId === doubt.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={newReplyText}
                          onChange={(e) => setNewReplyText(e.target.value)}
                          placeholder={`Replying to ${
                            doubt.senderName || doubt.senderId
                          }...`}
                          rows={2}
                          className="bg-background"
                          disabled={isSubmitting}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(doubt.id)}
                            disabled={isSubmitting || !newReplyText.trim()}
                            className="bg-accent text-accent-foreground"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}{" "}
                            Send Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplyingTo(null)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo({
                            doubtId: doubt.id,
                            doubtText: doubt.text,
                          });
                          setNewReplyText("");
                        }}
                        className="text-accent border-accent hover:bg-accent/10"
                      >
                        <Reply className="mr-1 h-3 w-3" /> Reply
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        <div ref={doubtsEndRef} />
      </div>

      {canChat && (
        <div className="mt-4 pt-4 border-t">
          <Label
            htmlFor={`new-doubt-${module.id}`}
            className="font-semibold text-foreground"
          >
            Post a new doubt for this module:
          </Label>
          <Textarea
            id={`new-doubt-${module.id}`}
            value={newDoubtText}
            onChange={(e) => setNewDoubtText(e.target.value)}
            placeholder="Type your question or doubt here..."
            rows={3}
            className="mt-1 bg-background"
            disabled={isSubmitting}
          />
          <div className="mt-2">
            <Label
              htmlFor={`video-timestamp-${module.id}`}
              className="text-xs text-muted-foreground"
            >
              Video Timestamp (Optional, e.g., 120 for 2:00)
            </Label>
            <Input
              id={`video-timestamp-${module.id}`}
              type="number"
              value={
                newDoubtVideoTimestamp === undefined
                  ? ""
                  : newDoubtVideoTimestamp
              }
              onChange={(e) =>
                setNewDoubtVideoTimestamp(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder="Seconds (e.g., 65 for 1m5s)"
              className="mt-1 bg-background h-8 text-sm"
              disabled={isSubmitting}
            />
          </div>
          <Button
            onClick={handleSendDoubt}
            disabled={isSubmitting || !newDoubtText.trim()}
            className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Post Doubt
          </Button>
        </div>
      )}
      {!canChat && studentId && (
        <p className="text-sm text-muted-foreground italic mt-4">
          Real-time chat for this module is currently available for specific
          student IDs. You can view existing doubts.
        </p>
      )}
      {!studentId && (
        <p className="text-sm text-muted-foreground italic mt-4">
          Please log in to participate in the discussion.
        </p>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [mounted, setMounted] = useState(false);
  const { studentId, studentProfile, isAuthenticated, firebaseUser } =
    useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const router = useRouter();
  const videoRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoObject, setSelectedVideoObject] =
    useState<SuggestedYouTubeVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [currentModuleForFlow, setCurrentModuleForFlow] =
    useState<CourseModule | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [miniGameClicks, setMiniGameClicks] = useState(0);
  const [miniGameTimer, setMiniGameTimer] = useState(15);
  const miniGameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeModuleContent, setActiveModuleContent] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setMounted(true);
    const foundCourse = mockCourses.find((c) => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
    } else if (mounted && courseId) {
      const timer = setTimeout(() => {
        if (!mockCourses.find((c) => c.id === courseId)) {
          notFound();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [courseId, mounted]);

  useEffect(() => {
    if (studentProfile && course) {
      setIsEnrolled(
        studentProfile.enrolledCourseIds?.includes(course.id) ?? false
      );
    }
  }, [studentProfile, course]);

  const openVideoDialog = (video: SuggestedYouTubeVideo) => {
    setSelectedVideoUrl(`https://www.youtube.com/embed/${video.videoId}`);
    setSelectedVideoObject(video);
    setIsVideoDialogOpen(true);
  };

  const handleArLabLaunch = async (
    moduleId: string,
    arUrl: string,
    toolName: string
  ) => {
    if (firebaseUser?.uid && course?.id) {
      try {
        await logArSessionLaunch(
          firebaseUser.uid,
          studentId,
          course.id,
          moduleId,
          toolName,
          arUrl
        );
        toast({
          title: "AR Lab Session Logged",
          description: "Your interaction with the AR lab has been recorded.",
        });
      } catch (error) {
        console.error("Failed to log AR session launch:", error);
        toast({
          title: "Logging Error",
          description: "Could not log AR lab session.",
          variant: "destructive",
        });
      }
    }
    window.open(arUrl, "_blank", "noopener,noreferrer");
  };

  const handleStartLearningSession = (module: CourseModule) => {
    setCurrentModuleForFlow(module);
    if (studentProfile?.moodSettings?.disableMoodCheck) {
      setActiveModuleContent((prev) => ({ ...prev, [module.id]: true }));
    } else {
      setShowMoodModal(true);
    }
  };

  const handleMoodSelected = async (mood: MoodOption) => {
    setSelectedMood(mood);
    setShowMoodModal(false);
    if (firebaseUser?.uid && currentModuleForFlow && course) {
      await saveMoodLog(
        firebaseUser.uid,
        mood,
        course.id,
        currentModuleForFlow.id
      );
    }

    if (mood === "Motivated") {
      setActiveModuleContent((prev) => ({
        ...prev,
        [currentModuleForFlow!.id]: true,
      }));
    } else {
      setShowGameModal(true);
      setMiniGameClicks(0);
      setMiniGameTimer(15);
      if (miniGameTimerRef.current) clearInterval(miniGameTimerRef.current);
      miniGameTimerRef.current = setInterval(() => {
        setMiniGameTimer((prev) => {
          if (prev <= 1) {
            clearInterval(miniGameTimerRef.current!);
            handleMiniGameEnd(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleMiniGameClick = () => {
    const newClicks = miniGameClicks + 1;
    setMiniGameClicks(newClicks);
    if (newClicks >= 5) {
      if (miniGameTimerRef.current) clearInterval(miniGameTimerRef.current);
      handleMiniGameEnd(true);
    }
  };

  const handleMiniGameEnd = async (completed: boolean) => {
    setShowGameModal(false);
    if (firebaseUser?.uid && currentModuleForFlow && course && selectedMood) {
      await saveBoostLog(
        firebaseUser.uid,
        "click_challenge",
        completed,
        selectedMood,
        course.id,
        currentModuleForFlow.id
      );
    }
    setActiveModuleContent((prev) => ({
      ...prev,
      [currentModuleForFlow!.id]: true,
    }));
    if (miniGameTimerRef.current) clearInterval(miniGameTimerRef.current);
  };

  if (!mounted || (!course && courseId)) {
    if (mounted && courseId && !course) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
          <Info className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The course you are looking for might not exist or is loading.
          </p>
          <Button asChild variant="outline">
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    notFound();
    return null;
  }

  const LearningIcon = learningStyleIcons[course.learningStyle];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/courses">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Link>
      </Button>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-secondary/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center mb-2 md:mb-0">
              <LearningIcon className="h-8 w-8 text-primary mr-3" />
              <CardTitle className="text-3xl font-bold text-primary">
                {course.name}
              </CardTitle>
            </div>
            {course.price && course.currency && !isEnrolled && (
              <div className="w-full md:w-auto mt-2 md:mt-0">
                <PaymentButton course={course} />
              </div>
            )}
            {isEnrolled && (
              <Badge
                variant="default"
                className="mt-2 md:mt-0 text-lg py-2 px-4 bg-green-600 text-white dark:bg-green-500 dark:text-black"
              >
                <CheckCircle className="mr-2 h-5 w-5" /> Enrolled
              </Badge>
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {course.category && (
              <Badge variant="secondary">{course.category}</Badge>
            )}
            {course.difficulty && (
              <Badge variant="outline">{course.difficulty}</Badge>
            )}
            <Badge
              variant="outline"
              className="capitalize flex items-center gap-1"
            >
              {course.learningStyle}
            </Badge>
            {course.price && course.currency && (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600"
              >
                {course.currency} {course.price}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-3 text-base">
            {course.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
            <ListChecks className="mr-2 h-6 w-6" /> Course Modules
          </h2>
          {course.modules.length === 0 ? (
            <p className="text-muted-foreground">
              No modules available for this course yet.
            </p>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {course.modules.map((module, index) => {
                const ModuleIcon = moduleTypeIcons[module.type] || ListChecks;

                let primaryYoutubeEmbedUrl: string | null = null;
                if (module.type === "video") {
                  primaryYoutubeEmbedUrl = getYoutubeEmbedUrl(module.url);
                  if (
                    !primaryYoutubeEmbedUrl &&
                    module.suggestedYoutubeVideos &&
                    module.suggestedYoutubeVideos.length > 0
                  ) {
                    const firstSuggestedVideo =
                      module.suggestedYoutubeVideos[0];
                    if (firstSuggestedVideo && firstSuggestedVideo.videoId) {
                      primaryYoutubeEmbedUrl = `https://www.youtube.com/embed/${firstSuggestedVideo.videoId}`;
                    }
                  }
                }

                let arToolName = "generic_ar";
                if (module.type === "ar_interactive_lab" && module.url) {
                  if (module.url.includes("phet.colorado.edu"))
                    arToolName = "phet";
                  else if (module.url.includes("visualgo.net"))
                    arToolName = "visualgo";
                  else if (module.url.includes("ophysics.com"))
                    arToolName = "ophysics";
                  else if (module.url.includes("physicsclassroom.com"))
                    arToolName = "physicsclassroom";
                  else if (module.url.includes("falstad.com"))
                    arToolName = "falstad";
                }

                return (
                  <AccordionItem
                    value={module.id}
                    key={module.id}
                    className="border bg-card rounded-lg shadow-sm"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 rounded-t-lg data-[state=open]:rounded-b-none">
                      <div className="flex items-center gap-3 w-full">
                        <ModuleIcon className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="font-medium text-lg text-left flex-grow">
                          {module.title}
                        </span>
                        {module.estimatedDuration && (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto flex-shrink-0"
                          >
                            {module.estimatedDuration}
                          </Badge>
                        )}
                        {!isEnrolled && course.price && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock
                                  className="ml-auto h-4 w-4 text-muted-foreground"
                                  aria-label="Locked content"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Enroll to access this content</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-3 border-t bg-secondary/10 rounded-b-lg space-y-3">
                      {!isEnrolled && course.price ? (
                        <div className="text-center py-4">
                          <Lock className="h-10 w-10 text-primary mx-auto mb-2" />
                          <p className="font-semibold text-lg text-primary">
                            Module Locked
                          </p>
                          <p className="text-muted-foreground mb-3">
                            Enroll in this course to access the module content.
                          </p>
                          <PaymentButton course={course} />
                        </div>
                      ) : (
                        <>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {module.description}
                            </p>
                          )}

                          {!activeModuleContent[module.id] ? (
                            <Button
                              onClick={() => handleStartLearningSession(module)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <PlayCircle className="mr-2 h-4 w-4" /> Start
                              Learning Session
                            </Button>
                          ) : (
                            <>
                              {module.type === "video" &&
                              primaryYoutubeEmbedUrl ? (
                                <div className="aspect-video">
                                  <iframe
                                    ref={videoRef}
                                    className="w-full h-full rounded-lg"
                                    src={primaryYoutubeEmbedUrl}
                                    title={module.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  ></iframe>
                                </div>
                              ) : module.type === "video" ? (
                                <p className="text-muted-foreground italic">
                                  Video for this module is currently
                                  unavailable.
                                </p>
                              ) : module.url &&
                                module.type !== "ar_interactive_lab" ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="default"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  <a
                                    href={module.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {module.type === "audio" ? (
                                      <AudioLines className="mr-2 h-4 w-4" />
                                    ) : module.type ===
                                      "interactive_exercise" ? (
                                      <Gamepad2 className="mr-2 h-4 w-4" />
                                    ) : null}
                                    {module.type === "audio"
                                      ? "Listen Audio"
                                      : module.type === "interactive_exercise"
                                      ? "Start Exercise"
                                      : "Access Resource"}
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                  </a>
                                </Button>
                              ) : null}

                              {module.type === "ar_interactive_lab" &&
                                module.url && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    onClick={() =>
                                      handleArLabLaunch(
                                        module.id,
                                        module.url!,
                                        arToolName
                                      )
                                    }
                                  >
                                    {moduleTypeIcons.ar_interactive_lab ? (
                                      <moduleTypeIcons.ar_interactive_lab className="mr-2 h-4 w-4" />
                                    ) : null}
                                    Launch AR Lab
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                  </Button>
                                )}

                              {module.content && (
                                <div className="prose prose-sm max-w-none text-muted-foreground">
                                  <h4 className="font-semibold text-foreground">
                                    Content Preview:
                                  </h4>
                                  <pre className="whitespace-pre-wrap bg-background p-2 rounded text-xs">
                                    {module.content.substring(0, 200)}
                                    {module.content.length > 200 ? "..." : ""}
                                  </pre>
                                </div>
                              )}

                              {!module.url &&
                                !module.content &&
                                !primaryYoutubeEmbedUrl &&
                                module.type !== "video" && (
                                  <p className="text-sm text-muted-foreground italic">
                                    No direct content or link for this module.
                                    It might be an in-person activity or
                                    integrated differently.
                                  </p>
                                )}
                            </>
                          )}

                          {module.suggestedYoutubeVideos &&
                            module.suggestedYoutubeVideos.length > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="text-md font-semibold text-primary mb-2 flex items-center">
                                  <Video className="mr-2 h-5 w-5" /> Suggested
                                  YouTube Videos
                                </h4>
                                <ul className="space-y-2">
                                  {module.suggestedYoutubeVideos.map(
                                    (video) => (
                                      <li
                                        key={video.videoId}
                                        className="text-sm"
                                      >
                                        <Button
                                          variant="link"
                                          className="p-0 h-auto text-accent hover:underline"
                                          onClick={() => openVideoDialog(video)}
                                        >
                                          <Youtube className="mr-2 h-4 w-4" />{" "}
                                          {video.title}
                                        </Button>
                                        {video.channelTitle && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            by {video.channelTitle}
                                          </span>
                                        )}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-3 border-accent text-accent hover:bg-accent/10"
                          >
                            <Link
                              href={`/courses/${course.id}/module/${module.id}/assessments`}
                            >
                              <Gamepad className="mr-2 h-4 w-4" /> View Game
                              Assessments
                            </Link>
                          </Button>

                          <DoubtChatSection
                            courseId={course.id}
                            module={module}
                            studentId={isAuthenticated ? studentId : null}
                            studentName={
                              isAuthenticated && studentProfile
                                ? studentProfile.name
                                : null
                            }
                            studentUid={firebaseUser?.uid || null}
                          />
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-3xl w-full p-0 data-[state=open]:sm:rounded-lg">
          {selectedVideoUrl && selectedVideoObject && (
            <>
              <DialogHeader className="px-4 py-3 border-b">
                <DialogTitle className="text-lg font-semibold truncate">
                  {selectedVideoObject.title || "Course Video"}
                </DialogTitle>
              </DialogHeader>
              <div className="aspect-video bg-black">
                <iframe
                  className="w-full h-full"
                  src={selectedVideoUrl}
                  title={selectedVideoObject.title || "YouTube video player"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </>
          )}
          {!selectedVideoUrl && (
            <DialogHeader className="p-4">
              <DialogTitle>Video Player</DialogTitle>
              <DialogDescription>No video selected.</DialogDescription>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMoodModal} onOpenChange={setShowMoodModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Smile className="mr-2 h-5 w-5 text-primary" /> How are you
              feeling today?
            </DialogTitle>
            <DialogDescription>
              Your well-being matters! Let us know your current mood.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-around py-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-col h-auto p-4 hover:bg-green-500/10 border-green-500 text-green-600"
              onClick={() => handleMoodSelected("Motivated")}
            >
              <ZapIcon className="h-8 w-8 mb-1 text-green-500" /> Motivated
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-col h-auto p-4 hover:bg-yellow-500/10 border-yellow-500 text-yellow-600"
              onClick={() => handleMoodSelected("Neutral")}
            >
              <Meh className="h-8 w-8 mb-1 text-yellow-500" /> Neutral
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-col h-auto p-4 hover:bg-red-500/10 border-red-500 text-red-600"
              onClick={() => handleMoodSelected("Unmotivated")}
            >
              <Frown className="h-8 w-8 mb-1 text-red-500" /> Unmotivated
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGameModal} onOpenChange={setShowGameModal}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center">
              <Coffee className="mr-2 h-6 w-6 text-accent" /> Quick Boost!
            </DialogTitle>
            <DialogDescription>
              Let's get those good vibes flowing. Click the button 5 times!
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-2xl font-bold text-primary">
              Timer: {miniGameTimer}s
            </p>
            <Button
              size="lg"
              className="w-full h-16 text-lg bg-accent text-accent-foreground hover:bg-accent/90 transform transition-transform active:scale-95"
              onClick={handleMiniGameClick}
              disabled={miniGameTimer === 0}
            >
              Click Me! ({miniGameClicks}/5)
            </Button>
            {miniGameTimer === 0 && miniGameClicks < 5 && (
              <p className="text-sm text-muted-foreground">
                Time's up! No worries, let's proceed.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

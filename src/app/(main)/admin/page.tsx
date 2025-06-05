"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  Save,
  Trash2,
  Edit3,
  Loader2,
  ListChecks,
  BookCopy,
  BarChart3,
  DatabaseZap,
  FlaskConical,
  Info,
  Gamepad,
  Wand2,
  Check,
  ShieldAlert,
  PlayCircle,
  TagsIcon,
  Code2,
  FileEdit,
  Puzzle,
} from "lucide-react";
import type {
  Course,
  CourseModule,
  LearningStyle,
  ModuleType,
  DifficultyLevel,
} from "@/types/course";
import {
  mockCourses as initialCourses,
  learningStyleIcons,
  moduleTypeIcons,
  difficultyLevels,
} from "@/data/mockCourses";
import { generateGameAssessment } from "@/ai/flows/generate-game-assessment";
import type {
  GameAssessmentOutput,
  GameAssessment,
  ChallengeType,
} from "@/types/gameAssessment";
import {
  saveGeneratedAssessment,
  getGameAssessmentsForModule,
  deleteGameAssessment,
  setGameAssessmentApproval,
} from "@/services/gameAssessmentService";
import Link from "next/link";

export default function AdminPage() {
  const { studentId, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const isAdmin = isAuthenticated && studentId === "8918";
  const adminOnlyMessage =
    "Only Admin (ID: 8918) has permission for this action.";

  // For Game Assessment Generation
  const [selectedCourseForAssessment, setSelectedCourseForAssessment] =
    useState<string>("");
  const [selectedModuleForAssessment, setSelectedModuleForAssessment] =
    useState<string>("");
  const [assessmentDifficulty, setAssessmentDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [generatedGameAssessments, setGeneratedGameAssessments] = useState<
    GameAssessment[]
  >([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Here you would typically fetch courses from your backend
  }, []);

  useEffect(() => {
    if (selectedCourseForAssessment && selectedModuleForAssessment) {
      fetchGameAssessments(
        selectedCourseForAssessment,
        selectedModuleForAssessment
      );
    } else {
      setGeneratedGameAssessments([]);
    }
  }, [selectedCourseForAssessment, selectedModuleForAssessment]);

  const handleInputChange = (field: keyof Course, value: any) => {
    if (!isAdmin) return;
    setCurrentCourse((prev) => ({ ...prev, [field]: value }));
  };

  const handleModuleChange = (
    index: number,
    field: keyof CourseModule,
    value: any
  ) => {
    if (!isAdmin) return;
    const updatedModules = [...(currentCourse.modules || [])];
    if (field === "tags") {
      // Assuming value is a comma-separated string from the input
      updatedModules[index] = {
        ...updatedModules[index],
        [field]:
          typeof value === "string"
            ? value
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag)
            : [],
      };
    } else {
      updatedModules[index] = { ...updatedModules[index], [field]: value };
    }
    setCurrentCourse((prev) => ({ ...prev, modules: updatedModules }));
  };

  const addModule = () => {
    if (!isAdmin) return;
    const newModule: CourseModule = {
      id: `mod${Date.now()}`,
      type: "video",
      title: "",
      estimatedDuration: "30 mins",
      tags: [],
      suggestedYoutubeVideos: [],
    };
    setCurrentCourse((prev) => ({
      ...prev,
      modules: [...(prev.modules || []), newModule],
    }));
  };

  const removeModule = (index: number) => {
    if (!isAdmin) return;
    setCurrentCourse((prev) => ({
      ...prev,
      modules: prev.modules?.filter((_, i) => i !== index),
    }));
  };

  const saveCourse = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: adminOnlyMessage,
        variant: "destructive",
      });
      return;
    }
    if (
      !currentCourse.name ||
      !currentCourse.learningStyle ||
      !currentCourse.difficulty ||
      !currentCourse.category
    ) {
      toast({
        title: "Error",
        description:
          "Course Name, Learning Style, Category, and Difficulty are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (isEditing && currentCourse.id) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === currentCourse.id ? (currentCourse as Course) : c
        )
      );
      toast({ title: "Success", description: "Course updated!" });
    } else {
      const newCourse = {
        ...currentCourse,
        id: `course${Date.now()}`,
      } as Course;
      setCourses((prev) => [...prev, newCourse]);
      toast({ title: "Success", description: "Course created!" });
    }
    setIsLoading(false);
    resetForm();
  };

  const editCourse = (course: Course) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only Admin can edit courses.",
        variant: "destructive",
      });
      return;
    }
    setCurrentCourse(course);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCourse = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only Admin can delete courses.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Success", description: "Course deleted." });
    setIsLoading(false);
  };

  const resetForm = () => {
    setCurrentCourse({ modules: [] });
    setIsEditing(false);
  };

  const handleGenerateAssessment = async () => {
    if (!selectedCourseForAssessment || !selectedModuleForAssessment) {
      toast({ description: "Please select a course and module first." });
      return;
    }

    setIsGeneratingAssessment(true);
    try {
      // Find the selected course and module
      const selectedCourse = courses.find(
        (c) => c.id === selectedCourseForAssessment
      );
      const selectedModule = selectedCourse?.modules?.find(
        (m) => m.id === selectedModuleForAssessment
      );

      if (!selectedModule) {
        toast({ description: "Could not find the selected module." });
        return;
      }

      const assessmentInput = {
        courseContext: {
          courseId: selectedCourseForAssessment,
          moduleId: selectedModuleForAssessment,
          moduleTitle: selectedModule.title,
          moduleDescription: selectedModule.description || "",
          learningObjectives: selectedModule.description
            ? [selectedModule.description]
            : [],
        },
        challengeType: "python_debug" as ChallengeType, // Default type, can be made configurable
        difficulty: assessmentDifficulty,
      };

      const generatedData = await generateGameAssessment(assessmentInput);

      // Save the generated assessment
      if (generatedData) {
        const assessmentId = await saveGeneratedAssessment(
          selectedCourseForAssessment,
          selectedModuleForAssessment,
          generatedData
        );

        await fetchGameAssessments(
          selectedCourseForAssessment,
          selectedModuleForAssessment
        );

        toast({
          description: "Game assessment generated and saved successfully!",
        });
      }
    } catch (error) {
      console.error("Error generating assessment:", error);
      toast({
        variant: "destructive",
        description: "Failed to generate game assessment. Please try again.",
      });
    } finally {
      setIsGeneratingAssessment(false);
    }
  };

  const fetchGameAssessments = async (courseId: string, moduleId: string) => {
    setIsLoadingAssessments(true);
    try {
      const assessments = await getGameAssessmentsForModule(courseId, moduleId);
      setGeneratedGameAssessments(assessments);
    } catch (error) {
      console.error("Error fetching game assessments:", error);
      toast({
        title: "Error",
        description: "Could not fetch game assessments.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAssessments(false);
    }
  };

  const handleToggleAssessmentApproval = async (assessment: GameAssessment) => {
    if (!isAdmin) return;
    try {
      await setGameAssessmentApproval(
        assessment.courseId,
        assessment.moduleId,
        assessment.id,
        !assessment.approvedByAdmin
      );
      toast({
        title: "Success",
        description: `Assessment approval status updated for "${assessment.title}".`,
      });
      fetchGameAssessments(
        selectedCourseForAssessment,
        selectedModuleForAssessment
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update approval: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGameAssessment = async (assessment: GameAssessment) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `Are you sure you want to delete assessment "${assessment.title}"?`
      )
    )
      return;

    try {
      await deleteGameAssessment(
        assessment.courseId,
        assessment.moduleId,
        assessment.id
      );
      toast({
        title: "Success",
        description: `Assessment "${assessment.title}" deleted.`,
      });
      fetchGameAssessments(
        selectedCourseForAssessment,
        selectedModuleForAssessment
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete assessment: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getAvailableModulesForAssessment = () => {
    return (
      courses.find((c) => c.id === selectedCourseForAssessment)?.modules || []
    );
  };

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const CourseIcon = currentCourse.learningStyle
    ? learningStyleIcons[currentCourse.learningStyle]
    : BookCopy;

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <CourseIcon className="mr-2 h-6 w-6" />
              {isAdmin
                ? isEditing
                  ? "Edit Course"
                  : "Create New Course"
                : "View Course Configuration (Admin Only)"}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Configure personalized courses with modules tailored to different learning styles, subjects, and difficulties. Include video lectures and AR interactive labs."
                : "Course management is restricted to administrators. (Admin ID: 8918)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                value={currentCourse.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Introduction to Calculus"
                className="bg-background"
                disabled={!isAdmin || isLoading}
              />
            </div>
            <div>
              <Label htmlFor="courseDescription">Description</Label>
              <Textarea
                id="courseDescription"
                value={currentCourse.description || ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Briefly describe this course."
                className="bg-background"
                disabled={!isAdmin || isLoading}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="learningStyle">Primary Learning Style</Label>
                <Select
                  value={currentCourse.learningStyle || ""}
                  onValueChange={(value) =>
                    handleInputChange("learningStyle", value as LearningStyle)
                  }
                  disabled={!isAdmin || isLoading}
                >
                  <SelectTrigger id="learningStyle" className="bg-background">
                    <SelectValue placeholder="Select learning style" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(learningStyleIcons).map(
                      ([style, IconComponent]) => (
                        <SelectItem key={style} value={style}>
                          <IconComponent className="mr-2 h-4 w-4 inline-block" />{" "}
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="courseCategory">Category</Label>
                <Input
                  id="courseCategory"
                  value={currentCourse.category || ""}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  placeholder="e.g., Science, Arts"
                  className="bg-background"
                  disabled={!isAdmin || isLoading}
                />
              </div>
              <div>
                <Label htmlFor="courseDifficulty">Difficulty</Label>
                <Select
                  value={currentCourse.difficulty || ""}
                  onValueChange={(value) =>
                    handleInputChange("difficulty", value as DifficultyLevel)
                  }
                  disabled={!isAdmin || isLoading}
                >
                  <SelectTrigger
                    id="courseDifficulty"
                    className="bg-background"
                  >
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <ListChecks className="mr-2 h-5 w-5" /> Course Modules
              </h3>
              {(currentCourse.modules || []).map((module, index) => {
                const ModuleIcon = moduleTypeIcons[module.type] || ListChecks;
                return (
                  <Card
                    key={module.id}
                    className="p-4 bg-secondary/30 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-primary flex items-center">
                        <ModuleIcon className="mr-2 h-5 w-5" /> Module{" "}
                        {index + 1}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModule(index)}
                            className="text-destructive hover:text-destructive/80"
                            disabled={!isAdmin || isLoading}
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Remove
                          </Button>
                        </TooltipTrigger>
                        {!isAdmin && (
                          <TooltipContent>
                            <p>{adminOnlyMessage}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                    <div>
                      <Label htmlFor={`moduleTitle${index}`}>Title</Label>
                      <Input
                        id={`moduleTitle${index}`}
                        value={module.title}
                        onChange={(e) =>
                          handleModuleChange(index, "title", e.target.value)
                        }
                        placeholder="Module title"
                        className="bg-background"
                        disabled={!isAdmin || isLoading}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`moduleType${index}`}>Type</Label>
                        <Select
                          value={module.type}
                          onValueChange={(value) =>
                            handleModuleChange(
                              index,
                              "type",
                              value as ModuleType
                            )
                          }
                          disabled={!isAdmin || isLoading}
                        >
                          <SelectTrigger
                            id={`moduleType${index}`}
                            className="bg-background"
                          >
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(moduleTypeIcons).map(
                              ([type, IconComponent]) => (
                                <SelectItem key={type} value={type}>
                                  <IconComponent className="mr-2 h-4 w-4 inline-block" />{" "}
                                  {type
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`moduleDuration${index}`}>
                          Estimated Duration
                        </Label>
                        <Input
                          id={`moduleDuration${index}`}
                          value={module.estimatedDuration || ""}
                          onChange={(e) =>
                            handleModuleChange(
                              index,
                              "estimatedDuration",
                              e.target.value
                            )
                          }
                          placeholder="e.g., 30 mins"
                          className="bg-background"
                          disabled={!isAdmin || isLoading}
                        />
                      </div>
                    </div>
                    {(module.type === "video" ||
                      module.type === "audio" ||
                      module.type === "interactive_exercise" ||
                      module.type === "ar_interactive_lab") && (
                      <div>
                        <Label htmlFor={`moduleUrl${index}`}>
                          {module.type === "ar_interactive_lab"
                            ? "AR Lab URL"
                            : "Resource URL"}
                        </Label>
                        <Input
                          id={`moduleUrl${index}`}
                          value={module.url || ""}
                          onChange={(e) =>
                            handleModuleChange(index, "url", e.target.value)
                          }
                          placeholder={
                            module.type === "ar_interactive_lab"
                              ? "https://example.com/ar-lab-link"
                              : "https://example.com/resource"
                          }
                          className="bg-background"
                          disabled={!isAdmin || isLoading}
                        />
                      </div>
                    )}
                    {module.type === "reading_material" && (
                      <div>
                        <Label htmlFor={`moduleContent${index}`}>
                          Content (Markdown supported)
                        </Label>
                        <Textarea
                          id={`moduleContent${index}`}
                          value={module.content || ""}
                          onChange={(e) =>
                            handleModuleChange(index, "content", e.target.value)
                          }
                          placeholder="Enter reading material content here."
                          className="bg-background min-h-[100px]"
                          disabled={!isAdmin || isLoading}
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor={`moduleDescription${index}`}>
                        Module Description
                      </Label>
                      <Textarea
                        id={`moduleDescription${index}`}
                        value={module.description || ""}
                        onChange={(e) =>
                          handleModuleChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Briefly describe this module's content and objectives."
                        className="bg-background"
                        disabled={!isAdmin || isLoading}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`moduleTags${index}`}>
                        Tags (comma-separated)
                      </Label>
                      <Input
                        id={`moduleTags${index}`}
                        value={module.tags ? module.tags.join(", ") : ""}
                        onChange={(e) =>
                          handleModuleChange(index, "tags", e.target.value)
                        }
                        placeholder="e.g., python, basics, loops"
                        className="bg-background"
                        disabled={!isAdmin || isLoading}
                      />
                    </div>
                  </Card>
                );
              })}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={!isAdmin ? 0 : -1}>
                    <Button
                      variant="outline"
                      onClick={addModule}
                      className="text-accent border-accent hover:bg-accent/10"
                      disabled={!isAdmin || isLoading}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Module
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isAdmin && (
                  <TooltipContent>
                    <p>{adminOnlyMessage}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={!isAdmin ? 0 : -1}>
                    <Button
                      variant="ghost"
                      onClick={resetForm}
                      disabled={isLoading || !isAdmin}
                    >
                      Cancel
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isAdmin && (
                  <TooltipContent>
                    <p>{adminOnlyMessage}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={!isAdmin ? 0 : -1}>
                  <Button
                    onClick={saveCourse}
                    disabled={isLoading || !isAdmin}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />{" "}
                    {isEditing ? "Update Course" : "Create Course"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isAdmin && (
                <TooltipContent>
                  <p>{adminOnlyMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </CardFooter>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <BarChart3 className="mr-2 h-6 w-6" /> Existing Courses
            </CardTitle>
            <CardDescription>
              Manage and view all configured courses, including video lectures
              and AR labs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {isAdmin
                  ? "No courses created yet."
                  : "No courses available to view."}
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {courses.map((course) => {
                  const PathIcon = learningStyleIcons[course.learningStyle];
                  return (
                    <AccordionItem value={course.id} key={course.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <PathIcon className="h-5 w-5 text-accent" />
                          <span className="font-medium">{course.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 space-y-3 bg-secondary/20 rounded-md">
                        <p>
                          <strong className="text-foreground">
                            Description:
                          </strong>{" "}
                          {course.description}
                        </p>
                        <div className="grid sm:grid-cols-3 gap-2 text-sm">
                          <p>
                            <strong className="text-foreground">
                              Learning Style:
                            </strong>{" "}
                            <span className="capitalize">
                              {course.learningStyle}
                            </span>
                          </p>
                          <p>
                            <strong className="text-foreground">
                              Category:
                            </strong>{" "}
                            {course.category}
                          </p>
                          <p>
                            <strong className="text-foreground">
                              Difficulty:
                            </strong>{" "}
                            {course.difficulty}
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mt-2">
                          Modules:
                        </h4>
                        {course.modules.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {course.modules.map((mod) => {
                              const ModIcon =
                                moduleTypeIcons[mod.type] || ListChecks;
                              let typeDisplay = mod.type
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase());
                              if (mod.type === "ar_interactive_lab")
                                typeDisplay = "AR Lab";

                              return (
                                <li key={mod.id} className="flex items-center">
                                  <ModIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <strong>{mod.title}</strong>&nbsp;(
                                  {typeDisplay})
                                  {mod.estimatedDuration && (
                                    <span className="text-muted-foreground text-xs ml-1">
                                      ({mod.estimatedDuration})
                                    </span>
                                  )}
                                  {mod.url && (
                                    <a
                                      href={mod.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-accent hover:underline"
                                    >
                                      Link
                                    </a>
                                  )}
                                  {mod.content && (
                                    <p className="text-xs text-muted-foreground italic mt-1">
                                      Preview: {mod.content.substring(0, 50)}...
                                    </p>
                                  )}
                                  {mod.description && (
                                    <p className="text-xs text-muted-foreground italic mt-1">
                                      Desc: {mod.description.substring(0, 50)}
                                      ...
                                    </p>
                                  )}
                                  {mod.tags && mod.tags.length > 0 && (
                                    <p className="text-xs text-muted-foreground italic mt-1 flex items-center">
                                      <TagsIcon className="mr-1 h-3 w-3" />{" "}
                                      Tags: {mod.tags.join(", ")}
                                    </p>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No modules in this course.
                          </p>
                        )}
                        <div className="flex justify-end gap-2 mt-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={!isAdmin ? 0 : -1}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editCourse(course)}
                                  disabled={isLoading || !isAdmin}
                                >
                                  <Edit3 className="mr-1 h-4 w-4" /> Edit
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && (
                              <TooltipContent>
                                <p>{adminOnlyMessage}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={!isAdmin ? 0 : -1}>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteCourse(course.id)}
                                  disabled={
                                    isLoading ||
                                    (isEditing &&
                                      currentCourse.id === course.id) ||
                                    !isAdmin
                                  }
                                >
                                  {isLoading &&
                                  currentCourse.id === course.id &&
                                  !isEditing ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-1 h-4 w-4" />
                                  )}
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!isAdmin && (
                              <TooltipContent>
                                <p>{adminOnlyMessage}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <Gamepad className="mr-2 h-6 w-6" /> GPT-Powered Game-Based
              Assessments
            </CardTitle>
            <CardDescription>
              Generate and manage interactive game-based assessments for course
              modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAdmin ? (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="assessmentCourseSelect">
                      Target Course
                    </Label>
                    <Select
                      value={selectedCourseForAssessment}
                      onValueChange={(value) => {
                        setSelectedCourseForAssessment(value);
                        setSelectedModuleForAssessment("");
                        setGeneratedGameAssessments([]);
                      }}
                    >
                      <SelectTrigger
                        id="assessmentCourseSelect"
                        className="bg-background"
                      >
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assessmentModuleSelect">
                      Target Module
                    </Label>
                    <Select
                      value={selectedModuleForAssessment}
                      onValueChange={(value) =>
                        setSelectedModuleForAssessment(value)
                      }
                      disabled={
                        !selectedCourseForAssessment ||
                        getAvailableModulesForAssessment().length === 0
                      }
                    >
                      <SelectTrigger
                        id="assessmentModuleSelect"
                        className="bg-background"
                      >
                        <SelectValue placeholder="Select a module" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableModulesForAssessment().map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.title}
                          </SelectItem>
                        ))}
                        {selectedCourseForAssessment &&
                          getAvailableModulesForAssessment().length === 0 && (
                            <p className="p-2 text-sm text-muted-foreground">
                              No modules in selected course.
                            </p>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assessmentDifficultySelect">
                      Assessment Difficulty
                    </Label>
                    <Select
                      value={assessmentDifficulty}
                      onValueChange={(value) =>
                        setAssessmentDifficulty(
                          value as "easy" | "medium" | "hard"
                        )
                      }
                    >
                      <SelectTrigger
                        id="assessmentDifficultySelect"
                        className="bg-background"
                      >
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateAssessment}
                  disabled={
                    isGeneratingAssessment ||
                    !selectedCourseForAssessment ||
                    !selectedModuleForAssessment
                  }
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isGeneratingAssessment ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate New Game Assessment
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Game-based assessment generation is restricted to
                administrators. (Admin ID: 8918)
              </p>
            )}

            {selectedModuleForAssessment && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  Existing Game Assessments for this Module:
                </h4>
                {isLoadingAssessments ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : generatedGameAssessments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No game assessments generated yet for this module.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {generatedGameAssessments.map((ga) => (
                      <AccordionItem value={ga.id} key={ga.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-left">
                              {ga.title} ({ga.difficulty}) -{" "}
                              {ga.challengeType.replace(/_/g, " ")}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {ga.approvedByAdmin ? (
                                    <Check
                                      className="h-5 w-5 text-green-500 ml-2"
                                      aria-label="Approved"
                                    />
                                  ) : (
                                    <ShieldAlert
                                      className="h-5 w-5 text-yellow-500 ml-2"
                                      aria-label="Pending Approval"
                                    />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {ga.approvedByAdmin
                                      ? "Assessment Approved"
                                      : "Pending Admin Approval"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 space-y-2 bg-secondary/20 rounded-md">
                          <p>
                            <strong>Story:</strong> {ga.storyNarration}
                          </p>
                          <p>
                            <strong>Challenge Type:</strong> {ga.challengeType}
                          </p>
                          <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {JSON.stringify(ga.challengeData, null, 2)}
                          </pre>
                          <p className="text-xs mt-1">
                            Generated:{" "}
                            {ga.generatedAt
                              ? new Date(
                                  ga.generatedAt as string
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                          {isAdmin && (
                            <div className="flex gap-2 mt-2 flex-wrap items-center">
                              <Button
                                size="sm"
                                variant={
                                  ga.approvedByAdmin ? "secondary" : "default"
                                }
                                onClick={() =>
                                  handleToggleAssessmentApproval(ga)
                                }
                                className={
                                  ga.approvedByAdmin
                                    ? ""
                                    : "bg-green-600 hover:bg-green-700 text-white"
                                }
                              >
                                {ga.approvedByAdmin ? (
                                  <ShieldAlert className="mr-1 h-4 w-4" />
                                ) : (
                                  <Check className="mr-1 h-4 w-4" />
                                )}
                                {ga.approvedByAdmin
                                  ? "Unapprove"
                                  : "Approve Assessment"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGameAssessment(ga)}
                              >
                                {" "}
                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                              </Button>
                              <Link
                                href={`/assessments/take/${ga.courseId}_${ga.moduleId}_${ga.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline">
                                  {" "}
                                  <PlayCircle className="mr-1 h-4 w-4" /> Take
                                  Assessment (Test)
                                </Button>
                              </Link>
                            </div>
                          )}
                          {!isAdmin && ga.approvedByAdmin && (
                            <Link
                              href={`/assessments/take/${ga.courseId}_${ga.moduleId}_${ga.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                size="sm"
                                variant="default"
                                className="mt-2 bg-primary text-primary-foreground"
                              >
                                {" "}
                                <PlayCircle className="mr-1 h-4 w-4" /> Take
                                Assessment
                              </Button>
                            </Link>
                          )}
                          {!isAdmin && !ga.approvedByAdmin && (
                            <p className="text-xs text-muted-foreground italic mt-2">
                              This assessment is pending admin approval.
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <FlaskConical className="mr-2 h-6 w-6" /> AR Labs Management
              (Placeholder)
            </CardTitle>
            <CardDescription>
              Dedicated section for managing AR interactive labs. This can
              include uploading AR assets, configuring lab parameters, and
              linking them to courses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Future enhancements will allow direct management of AR labs here.
              Currently, AR labs are added as modules within courses.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center">
              <DatabaseZap className="mr-2 h-6 w-6" /> Data Management
            </CardTitle>
            <CardDescription>
              Manage sample data for testing and development purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Data population options can be added here as needed for other
              features.
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Update the rendering of game assessment icons to proper Lucide component usage
const AssessmentIcon = ({ type }: { type: string }) => {
  if (type === "python_debug") return <Code2 className="h-5 w-5" />;
  if (type === "logic_puzzle") return <Puzzle className="h-5 w-5" />;
  if (type === "algorithm_choice") return <FlaskConical className="h-5 w-5" />;
  if (type === "fill_in_the_blanks") return <FileEdit className="h-5 w-5" />;
  if (type === "story_decision") return <BookCopy className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
};

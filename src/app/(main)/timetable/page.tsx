"use client";

import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  PlusCircle,
  Edit3,
  Trash2,
  Loader2,
  Wand2,
  Sparkles,
  FileDown,
} from "lucide-react";
import type {
  TimetableEvent,
  OrganizeTimeEventInput,
  OrganizeTimeOutput,
} from "@/types/timetable";
import {
  addTimetableEvent,
  getTimetableEvents,
  updateTimetableEvent,
  deleteTimetableEvent,
} from "@/services/timetableService";
import { organizeTime } from "@/ai/flows/organize-time-flow";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable, { CellInput } from "jspdf-autotable";

const daysOfWeek: TimetableEvent["dayOfWeek"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const initialEventState: Omit<TimetableEvent, "id" | "userId" | "createdAt"> = {
  title: "",
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "10:00",
  description: "",
};

export default function TimetablePage() {
  const { firebaseUser, studentId, isAuthenticated, studentProfile } =
    useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] =
    useState<Partial<TimetableEvent>>(initialEventState);
  const [eventToEditId, setEventToEditId] = useState<string | null>(null);

  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [userGoals, setUserGoals] = useState("");

  useEffect(() => {
    if (isAuthenticated && firebaseUser?.uid) {
      setIsLoadingEvents(true);
      const unsubscribe = getTimetableEvents(
        firebaseUser.uid,
        (fetchedEvents) => {
          setEvents(fetchedEvents);
          setIsLoadingEvents(false);
        },
        (error) => {
          console.error("TimetablePage: Error fetching events:", error);
          toast({
            title: "Error loading timetable",
            description: error.message || "Could not load timetable events.",
            variant: "destructive",
          });
          setIsLoadingEvents(false);
        }
      );
      return () => {
        unsubscribe();
      };
    } else {
      setEvents([]);
      setIsLoadingEvents(false);
    }
  }, [isAuthenticated, firebaseUser, toast]);

  const handleOpenForm = (eventToEdit?: TimetableEvent) => {
    if (eventToEdit) {
      setIsEditing(true);
      setEventToEditId(eventToEdit.id || null);
      setCurrentEvent({
        title: eventToEdit.title,
        dayOfWeek: eventToEdit.dayOfWeek,
        startTime: eventToEdit.startTime,
        endTime: eventToEdit.endTime,
        description: eventToEdit.description,
      });
    } else {
      setIsEditing(false);
      setEventToEditId(null);
      setCurrentEvent(initialEventState);
    }
    setIsFormOpen(true);
  };

  const handleFormInputChange = (
    field: keyof typeof initialEventState,
    value: string
  ) => {
    setCurrentEvent((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async () => {
    if (
      !firebaseUser?.uid ||
      !currentEvent.title ||
      !currentEvent.dayOfWeek ||
      !currentEvent.startTime ||
      !currentEvent.endTime
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title, day, start time, and end time.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      title: currentEvent.title,
      dayOfWeek: currentEvent.dayOfWeek as TimetableEvent["dayOfWeek"],
      startTime: currentEvent.startTime,
      endTime: currentEvent.endTime,
      description: currentEvent.description || "",
    };

    try {
      if (isEditing && eventToEditId) {
        await updateTimetableEvent(firebaseUser.uid, eventToEditId, eventData);
        toast({ title: "Success", description: "Event updated!" });
      } else {
        await addTimetableEvent(firebaseUser.uid, eventData);
        toast({ title: "Success", description: "Event added!" });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Save Error",
        description: (error as Error).message || "Could not save event.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!firebaseUser?.uid || !eventId) return;
    try {
      await deleteTimetableEvent(firebaseUser.uid, eventId);
      toast({ title: "Success", description: "Event deleted." });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Delete Error",
        description: (error as Error).message || "Could not delete event.",
        variant: "destructive",
      });
    }
  };

  const handleExportToPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add title
    doc.setFontSize(20);
    doc.text("Weekly Timetable", pageWidth / 2, 15, { align: "center" });

    // Prepare table data with proper typing
    const tableData: CellInput[][] = [];

    daysOfWeek.forEach((day) => {
      const dayEvents = groupedEvents[day];
      if (dayEvents.length > 0) {
        tableData.push([
          { content: day, colSpan: 3, styles: { fontStyle: "bold" } },
        ]);
        dayEvents.forEach((event) => {
          tableData.push([
            event.startTime + " - " + event.endTime,
            event.title,
            event.description || "",
          ]);
        });
      }
    });

    // Configure and generate table
    autoTable(doc, {
      startY: 25,
      head: [["Time", "Event", "Description"] as CellInput[]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      margin: { top: 25 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 90 },
      },
    });

    // Save the PDF
    doc.save("timetable.pdf");
  };

  const handleGetAiSuggestions = async () => {
    if (!firebaseUser?.uid) return;
    if (events.length === 0 && !isLoadingEvents) {
      toast({
        title: "No Events",
        description: "Add some events to your timetable to get AI suggestions.",
        variant: "default",
      });
      return;
    }
    setIsGeneratingSuggestions(true);
    setAiSuggestions([]);
    try {
      const eventsForAI: OrganizeTimeEventInput[] = events.map((e) => ({
        title: e.title,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        description: e.description,
      }));
      const result: OrganizeTimeOutput = await organizeTime({
        events: eventsForAI,
        userGoals: userGoals || undefined,
      });
      setAiSuggestions(result.suggestions);
      toast({
        title: "AI Suggestions Ready!",
        description: "Check out the tips below.",
      });
    } catch (error: any) {
      console.error("Error getting AI suggestions:", error);
      setAiSuggestions([
        `Failed to get suggestions: ${error.message || "Please try again."}`,
      ]);
      toast({
        title: "AI Error",
        description: "Could not get AI suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const groupEventsByDay = () => {
    const grouped: Record<string, TimetableEvent[]> = {};
    daysOfWeek.forEach((day) => (grouped[day] = []));
    events.forEach((event) => {
      if (grouped[event.dayOfWeek]) {
        grouped[event.dayOfWeek].push(event);
      }
    });
    for (const day in grouped) {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  };

  const groupedEvents = groupEventsByDay();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Timetable Organizer</h1>
        <p className="text-muted-foreground">
          Please log in to manage your timetable.
        </p>
        <Button asChild className="mt-4">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <CardTitle className="text-2xl font-bold text-primary flex items-center">
              <CalendarDays className="mr-2 h-6 w-6" /> My Weekly Timetable
            </CardTitle>
            <CardDescription>
              Organize your week, add events, and get AI-powered suggestions.
              Events loaded:{" "}
              {isLoadingEvents && events.length === 0
                ? "Loading..."
                : events.length}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Timetable data is stored under `students/{studentId}
              /timetableEvents` in Firestore.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExportToPdf}
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
              disabled={events.length === 0 && !isLoadingEvents}
            >
              <FileDown className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenForm()}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? "Edit Event" : "Add New Event"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? "Update the details of your event."
                      : "Fill in the details for your new event."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={currentEvent.title || ""}
                      onChange={(e) =>
                        handleFormInputChange("title", e.target.value)
                      }
                      className="col-span-3 bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dayOfWeek" className="text-right">
                      Day
                    </Label>
                    <Select
                      value={currentEvent.dayOfWeek || "Monday"}
                      onValueChange={(value) =>
                        handleFormInputChange("dayOfWeek", value)
                      }
                    >
                      <SelectTrigger className="col-span-3 bg-background">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startTime" className="text-right">
                      Start Time
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={currentEvent.startTime || "09:00"}
                      onChange={(e) =>
                        handleFormInputChange("startTime", e.target.value)
                      }
                      className="col-span-3 bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endTime" className="text-right">
                      End Time
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={currentEvent.endTime || "10:00"}
                      onChange={(e) =>
                        handleFormInputChange("endTime", e.target.value)
                      }
                      className="col-span-3 bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={currentEvent.description || ""}
                      onChange={(e) =>
                        handleFormInputChange("description", e.target.value)
                      }
                      className="col-span-3 bg-background"
                      placeholder="Optional details..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleFormSubmit}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isEditing ? "Save Changes" : "Add Event"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEvents && events.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !isLoadingEvents && events.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              Your timetable is empty. Add some events to get started!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
              {daysOfWeek.map((day) => (
                <Card
                  key={day}
                  className="bg-secondary/30 flex flex-col min-h-[200px]"
                >
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg text-center font-semibold text-primary">
                      {day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 flex-grow">
                    {groupedEvents[day].length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center italic py-2">
                        No events scheduled.
                      </p>
                    ) : (
                      groupedEvents[day].map((event) => (
                        <Card
                          key={event.id}
                          className="bg-card shadow-sm p-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-accent">
                                {event.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.startTime} - {event.endTime}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleOpenForm(event)}
                                title="Edit Event"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive/80"
                                    title="Delete Event"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the event "
                                      {event.title}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteEvent(event.id!)
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-xs text-foreground mt-1 pt-1 border-t border-dashed">
                              {event.description}
                            </p>
                          )}
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary flex items-center">
            <Wand2 className="mr-2 h-5 w-5" /> AI Time Organization Suggestions
          </CardTitle>
          <CardDescription>
            Get personalized tips from our AI to optimize your schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userGoals">Your Goals/Priorities (Optional)</Label>
            <Textarea
              id="userGoals"
              value={userGoals}
              onChange={(e) => setUserGoals(e.target.value)}
              placeholder="e.g., 'Study more for Math exam next week', 'Find 30 minutes for exercise daily', 'Reduce screen time after 8 PM'"
              className="bg-background"
              rows={2}
            />
          </div>
          <Button
            onClick={handleGetAiSuggestions}
            disabled={
              isGeneratingSuggestions ||
              (isLoadingEvents && events.length === 0)
            }
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isGeneratingSuggestions ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Get AI Suggestions
          </Button>
          {aiSuggestions.length > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-secondary/30 space-y-2">
              <h4 className="font-semibold text-primary">
                Here are some suggestions:
              </h4>
              <ul className="list-disc list-inside text-sm text-foreground">
                {aiSuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          {!isLoadingEvents &&
            events.length === 0 &&
            !isGeneratingSuggestions && (
              <p className="text-sm text-muted-foreground italic">
                Add some events to your timetable to enable AI suggestions.
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

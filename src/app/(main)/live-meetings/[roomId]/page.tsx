'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getLiveMeeting,
  endLiveMeeting,
  joinMeeting,
  leaveMeeting,
  getMeetingParticipants,
  sendMeetingChatMessage,
  getMeetingChatMessages,
  pinMeetingChatMessage,
} from '@/services/liveMeetingService';
import type { LiveMeeting, MeetingParticipant, MeetingChatMessage } from '@/types/liveMeeting';
import { ArrowLeft, Loader2, Send, Pin, PinOff, User, Power, MessageSquare, Users } from 'lucide-react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';


// Placeholder for Jitsi Meet integration
declare global {
  interface Window { JitsiMeetExternalAPI: any; }
}

export default function LiveMeetingRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const { studentId, studentProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [meeting, setMeeting] = useState<LiveMeeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(true);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAuthenticated && studentId === '8918';

  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    getLiveMeeting(roomId)
      .then((data) => {
        if (data) {
          setMeeting(data);
          if (data.isActive && studentId && studentProfile?.name) {
            joinMeeting(roomId, studentId, studentProfile.name).catch(console.error);
          }
        } else {
          toast({ title: "Error", description: "Meeting not found.", variant: "destructive" });
          router.push('/live-meetings');
        }
      })
      .catch((error) => {
        toast({ title: "Error", description: `Failed to load meeting: ${error.message}`, variant: "destructive" });
      })
      .finally(() => setIsLoading(false));

    // Cleanup: Leave meeting when component unmounts or roomId/studentId changes
    return () => {
      if (roomId && studentId && meeting?.isActive) { // Check if meeting was active
        leaveMeeting(roomId, studentId).catch(console.error);
      }
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [roomId, studentId, studentProfile?.name, toast, router, meeting?.isActive]);

  useEffect(() => {
    if (!meeting || !meeting.isActive) return;

    const loadJitsi = () => {
      if (jitsiApiRef.current || !jitsiContainerRef.current || !studentProfile?.name) return;
      
      const domain = 'meet.jit.si';
      const options = {
        roomName: meeting.jitsiRoomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', // 'security'
          ],
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          prejoinPageEnabled: false, // Skip prejoin page for quicker entry
        },
        userInfo: {
          displayName: studentProfile.name
        }
      };
      try {
        jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        // Add event listeners if needed, e.g., for participants joining/leaving via Jitsi API
         jitsiApiRef.current.addEventListener('videoConferenceLeft', () => {
            if (studentId) leaveMeeting(roomId, studentId).catch(console.error);
            // If admin ends the call, ideally we'd trigger endLiveMeeting service call
            // This might require more complex Jitsi event handling.
            if (isAdmin && meeting?.isActive) {
                // handleEndMeeting(); // This is tricky, as hangup might not mean end for all.
            }
         });

      } catch (error) {
        console.error("Failed to load Jitsi Meet API:", error);
        toast({title: "Video Call Error", description: "Could not load video conferencing.", variant: "destructive"});
      }
    };
    
    if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
        loadJitsi();
    } else {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = loadJitsi;
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }

  }, [meeting, studentProfile?.name, isAdmin, roomId, studentId, toast]);

  useEffect(() => {
    if (!roomId) return;
    setIsParticipantsLoading(true);
    const unsubscribe = getMeetingParticipants(roomId, setParticipants, (err) => {
      toast({ title: "Error", description: "Could not load participants.", variant: "destructive" });
      console.error(err);
      setIsParticipantsLoading(false);
    });
    setIsParticipantsLoading(false); // Initial set
    return () => unsubscribe();
  }, [roomId, toast]);

  useEffect(() => {
    if (!roomId) return;
    setIsChatLoading(true);
    const unsubscribe = getMeetingChatMessages(roomId, (messages) => {
      setChatMessages(messages);
      if (chatScrollAreaRef.current) {
        chatScrollAreaRef.current.scrollTo({ top: chatScrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
      setIsChatLoading(false);
    }, (err) => {
      toast({ title: "Error", description: "Could not load chat messages.", variant: "destructive" });
      console.error(err);
      setIsChatLoading(false);
    });
    return () => unsubscribe();
  }, [roomId, toast]);
  
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !studentId || !studentProfile?.name || !meeting?.isActive) return;
    setIsSubmittingChat(true);
    try {
      await sendMeetingChatMessage(roomId, studentId, studentProfile.name, newMessage);
      setNewMessage('');
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to send message: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmittingChat(false);
    }
  };

  const handleTogglePinMessage = async (messageId: string, currentPinStatus: boolean) => {
    if (!isAdmin || !studentId || !meeting?.isActive) return; // Only admin can pin
    try {
      await pinMeetingChatMessage(roomId, messageId, !currentPinStatus, studentId);
      toast({ title: "Success", description: `Message ${!currentPinStatus ? 'pinned' : 'unpinned'}.` });
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to pin message: ${error.message}`, variant: "destructive" });
    }
  };

  const handleEndMeeting = async () => {
    if (!isAdmin || !studentId || !meeting?.isActive) return; // Only admin can end
    setIsLoading(true); // Reuse main loading state
    try {
      await endLiveMeeting(roomId, studentId);
      toast({ title: "Meeting Ended", description: "The live session has been concluded." });
      // Jitsi API will handle hangup via event listener if configured
      jitsiApiRef.current?.executeCommand('hangup'); 
      // The meeting state should update via onSnapshot or a page refresh may be needed
      // For now, manually update local state for immediate UI feedback
      setMeeting(prev => prev ? {...prev, isActive: false, endedAt: Timestamp.now()} : null);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to end meeting: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimestamp = (timestampInput: Timestamp | undefined): string => {
    if (!timestampInput) return '';
    // Ensure it's a Firestore Timestamp object before calling toDate()
    const date = timestampInput instanceof Timestamp ? timestampInput.toDate() : new Date(0); // Fallback to epoch if not a Timestamp
     if (isNaN(date.getTime()) || date.getTime() === 0) return 'Date N/A'; 
    return formatDistanceToNowStrict(date, { addSuffix: true });
  };


  if (isLoading || !meeting) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!meeting.isActive && meeting.endedAt) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 text-center">
            <Card className="max-w-lg mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Meeting Ended</CardTitle>
                    <CardDescription>This live session has concluded.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Title: {meeting.title}</p>
                    <p>Ended: {format( (meeting.endedAt as Timestamp).toDate(), 'PPpp')}</p>
                     {/* Placeholder for summary link */}
                </CardContent>
                <CardFooter className="justify-center">
                     <Button asChild variant="outline"><Link href="/live-meetings"><ArrowLeft className="mr-2 h-4 w-4" />Back to Meetings</Link></Button>
                </CardFooter>
            </Card>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-6 px-2 md:px-4 lg:px-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/live-meetings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Meetings List</Link>
        </Button>
        {isAdmin && meeting.isActive && (
          <Button onClick={handleEndMeeting} variant="destructive" size="sm" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <Power className="mr-2 h-4 w-4" /> End Meeting
          </Button>
        )}
      </div>

      <Card className="shadow-lg mb-4">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl text-primary">{meeting.title || `Live Session: ${meeting.moduleId}`}</CardTitle>
          <CardDescription>Course: {meeting.courseId} | Module: {meeting.moduleId}</CardDescription>
          <CardDescription>Jitsi Room: <span className="font-mono text-xs">{meeting.jitsiRoomName}</span></CardDescription>
        </CardHeader>
      </Card>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Video Area */}
        <div className="lg:col-span-2 bg-muted rounded-lg shadow-inner min-h-[300px] md:min-h-[400px] lg:min-h-0">
           <div ref={jitsiContainerRef} className="w-full h-full rounded-lg overflow-hidden">
             {!jitsiApiRef.current && <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading Video Conference...</div>}
           </div>
        </div>

        {/* Sidebar: Participants & Chat */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
          {/* Participants List */}
          <Card className="shadow-md flex-shrink-0 max-h-[30%] overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-lg text-primary flex items-center"><Users className="mr-2 h-5 w-5"/>Participants ({participants.length})</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow">
              <CardContent className="p-3 space-y-2 text-sm">
                {isParticipantsLoading && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin"/></div>}
                {!isParticipantsLoading && participants.length === 0 && <p className="text-muted-foreground italic text-xs">No active participants.</p>}
                {participants.map(p => (
                  <div key={p.studentId} className="flex items-center gap-2 p-1.5 bg-secondary/30 rounded">
                    <Avatar className="h-6 w-6 text-xs">
                      <AvatarFallback>{p.name?.substring(0,1).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <span>{p.name} {p.studentId === studentId && "(You)"}</span>
                  </div>
                ))}
              </CardContent>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="shadow-md flex-grow flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-lg text-primary flex items-center"><MessageSquare className="mr-2 h-5 w-5"/>Live Chat</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-grow p-3 bg-secondary/20" ref={chatScrollAreaRef}>
              {isChatLoading && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin"/></div>}
              {!isChatLoading && chatMessages.length === 0 && <p className="text-muted-foreground italic text-xs text-center py-4">No messages yet.</p>}
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex flex-col mb-2.5 ${msg.senderId === studentId ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-2 rounded-lg shadow-sm text-sm ${msg.senderId === studentId ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card text-card-foreground rounded-bl-none'} ${msg.pinned ? 'border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-700/20' : ''}`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-xs">{msg.senderName}</span>
                        {isAdmin && meeting.isActive && (
                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleTogglePinMessage(msg.id, msg.pinned)} title={msg.pinned ? "Unpin" : "Pin"}>
                                {msg.pinned ? <PinOff className="h-3 w-3 text-yellow-600"/> : <Pin className="h-3 w-3 text-muted-foreground"/>}
                             </Button>
                        )}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 opacity-70 ${msg.senderId === studentId ? 'text-right' : ''}`}>{formatTimestamp(msg.timestamp as Timestamp | undefined)}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <CardFooter className="p-2 border-t">
              <form onSubmit={handleSendChatMessage} className="flex w-full items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={meeting.isActive ? "Type a message..." : "Chat disabled (meeting ended)"}
                  className="flex-1 bg-background h-9 text-sm"
                  disabled={isSubmittingChat || !meeting.isActive}
                />
                <Button type="submit" size="icon" className="h-9 w-9 bg-accent text-accent-foreground" disabled={isSubmittingChat || !newMessage.trim() || !meeting.isActive}>
                  {isSubmittingChat ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
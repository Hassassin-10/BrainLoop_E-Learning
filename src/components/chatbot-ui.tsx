
'use client';

import type { FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { aiAssistantChatbot, type AiAssistantChatbotOutput } from '@/ai/flows/ai-assistant-chatbot';
import { Bot, Loader2, Send, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function ChatbotCoreUI() {
  const { studentId: authStudentId, isAuthenticated, studentProfile } = useAuth();
  const [studentIdForChat, setStudentIdForChat] = useState('');
  const [moduleName, setModuleName] = useState('General Assistance');
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && authStudentId) {
      setStudentIdForChat(authStudentId);
    }
  }, [isAuthenticated, authStudentId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!currentMessage.trim() || !studentIdForChat.trim() || !moduleName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please ensure Student ID and Module Name are set, and type a message.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: currentMessage,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const aiResponse: AiAssistantChatbotOutput = await aiAssistantChatbot({
        studentId: studentIdForChat,
        moduleName,
        message: userMessage.text,
      });

      const aiMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiResponse.response,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const errorMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
      toast({
        title: 'Error',
        description: 'Could not connect to the chatbot. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        <div>
          <label htmlFor="chatbotStudentId" className="block text-xs font-medium text-foreground mb-1">Student ID</label>
          <Input
            id="chatbotStudentId"
            type="text"
            value={studentIdForChat}
            onChange={(e) => setStudentIdForChat(e.target.value)}
            placeholder="Enter ID"
            className="bg-background text-sm h-8"
            disabled={isAuthenticated && !!authStudentId}
          />
          {isAuthenticated && authStudentId && (
            <p className="text-xs text-muted-foreground mt-1">Using: {authStudentId}</p>
          )}
        </div>
        <div>
          <label htmlFor="chatbotModuleName" className="block text-xs font-medium text-foreground mb-1">Module/Topic</label>
          <Input
            id="chatbotModuleName"
            type="text"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            placeholder="e.g., Calculus"
            className="bg-background text-sm h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-grow w-full rounded-md border p-3 bg-secondary/30" ref={scrollAreaRef}>
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <Bot className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No messages yet. Start chatting!</p>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
          >
            {msg.sender === 'ai' && (
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[75%] p-2.5 rounded-lg shadow ${msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card text-card-foreground rounded-bl-none'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.sender === 'user' && (
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {studentProfile?.name ? studentProfile.name.substring(0, 1).toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-end gap-2 mb-3 justify-start">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[75%] p-2.5 rounded-lg shadow bg-card text-card-foreground rounded-bl-none">
              <div className="flex items-center space-x-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Typing...</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex w-full items-start gap-2 pt-2 border-t">
        <Textarea
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 resize-none bg-background text-sm"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={!isAuthenticated && !studentIdForChat.trim()}
        />
        <Button type="submit" size="icon" disabled={isLoading || !currentMessage.trim() || (!isAuthenticated && !studentIdForChat.trim())} className="bg-accent text-accent-foreground hover:bg-accent/90 h-10 w-10">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

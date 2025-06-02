
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { answerStudentQuestion, type AnswerStudentQuestionOutput } from '@/ai/flows/answer-student-question';
import { Loader2, Send, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  isLoading?: boolean;
  usedExternalResources?: boolean;
}

export default function QAPage() {
  const { studentId: authStudentId, isAuthenticated } = useAuth();
  const [studentIdForQA, setStudentIdForQA] = useState('');
  const [moduleName, setModuleName] = useState('Introduction to Algebra');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && authStudentId) {
      setStudentIdForQA(authStudentId);
    }
  }, [isAuthenticated, authStudentId]);


  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !studentIdForQA.trim() || !moduleName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please ensure Student ID and Module Name are set, and type a question.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: Message = { id: String(Date.now()), type: 'user', text: question };
    const aiPlaceholderMessage: Message = { id: String(Date.now() + 1), type: 'ai', text: '', isLoading: true };
    
    setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const aiResponse: AnswerStudentQuestionOutput = await answerStudentQuestion({
        question,
        studentId: studentIdForQA,
        moduleName,
      });
      
      const aiResponseMessage: Message = {
        id: String(Date.now() + 1),
        type: 'ai',
        text: aiResponse.answer,
        usedExternalResources: aiResponse.usedExternalResources,
      };
      setMessages(prev => prev.map(msg => msg.id === aiPlaceholderMessage.id ? aiResponseMessage : msg ));

    } catch (error: any) {
      console.error('Error getting answer:', error);
       let errorMessageText = 'Sorry, I encountered an error trying to answer your question. Please try again.';
      if (error.message && error.message.includes("Schema validation failed")) {
        errorMessageText = "The AI couldn't provide an answer in the expected format. Please try rephrasing your question."
      }
      const errorResponseMessage: Message = {
        id: String(Date.now() + 1),
        type: 'ai',
        text: errorMessageText,
      };
      setMessages(prev => prev.map(msg => msg.id === aiPlaceholderMessage.id ? errorResponseMessage : msg ));
      toast({
        title: 'Error',
        description: 'Could not get an answer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!mounted) {
     return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center">
            <HelpCircle className="mr-2 h-6 w-6" /> AI Question & Answer
            </CardTitle>
          <CardDescription>
            Ask any question related to your studies and our AI will provide a clear, concise answer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-foreground mb-1">Student ID</label>
              <Input
                id="studentId"
                type="text"
                value={studentIdForQA}
                onChange={(e) => setStudentIdForQA(e.target.value)}
                placeholder="Enter your student ID"
                className="bg-background"
                disabled={isAuthenticated && !!authStudentId} 
              />
              {isAuthenticated && authStudentId && (
                <p className="text-xs text-muted-foreground mt-1">Using ID: {authStudentId}</p>
              )}
            </div>
            <div>
              <label htmlFor="moduleName" className="block text-sm font-medium text-foreground mb-1">Module Name</label>
              <Input
                id="moduleName"
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="Enter the module name"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 border rounded-md bg-secondary/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground'
                  }`}
                >
                  {msg.isLoading ? (
                     <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.type === 'ai' && msg.usedExternalResources && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      (External resources were used to generate this answer)
                    </p>
                  )}
                </div>
              </div>
            ))}
             {messages.length === 0 && (
              <p className="text-center text-muted-foreground">Ask a question to get started!</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleQuestionSubmit} className="flex w-full items-start gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              className="flex-1 resize-none bg-background"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuestionSubmit(e as unknown as React.FormEvent);
                }
              }}
              disabled={!isAuthenticated && !studentIdForQA.trim()}
            />
            <Button type="submit" disabled={isLoading || !question.trim() || (!isAuthenticated && !studentIdForQA.trim())} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="sr-only">Send Question</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

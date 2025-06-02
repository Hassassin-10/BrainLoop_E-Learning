
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react'; // Changed MessageSquareText to Bot
import ChatbotCoreUI from '@/components/chatbot-ui';

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chatbot toggle button */}
      {!isOpen && (
        <Button
          onClick={toggleChatbot}
          className="fixed bottom-6 right-6 z-[100] rounded-full w-16 h-16 p-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-transform hover:scale-110 active:scale-100"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-7 w-7" /> {/* Changed icon here */}
        </Button>
      )}

      {/* Chatbot window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] bg-card rounded-2xl shadow-xl border w-[calc(100vw-3rem)] max-w-[400px] h-[70vh] max-h-[600px] flex flex-col transition-all duration-300 ease-out transform-gpu animate-in fade-in-0 slide-in-from-bottom-5">
          <div className="flex justify-between items-center p-3 border-b bg-card rounded-t-2xl">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Bot className="mr-2 h-5 w-5" /> AI Assistant
            </h3>
            <Button variant="ghost" size="icon" onClick={toggleChatbot} aria-label="Close AI Assistant">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-grow overflow-hidden"> {/* This div will manage the ChatbotCoreUI's space */}
            <ChatbotCoreUI />
          </div>
        </div>
      )}
    </>
  );
}


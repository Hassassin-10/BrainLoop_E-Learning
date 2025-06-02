
'use client';

import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCircle, LogOut, Library, FlaskConical, Search, Sun, Moon, FileText, Settings2, Brain, HelpCircle, Puzzle, User, Bot, Radio, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function AppHeader() {
  const { isAuthenticated, logout, studentId } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isAdmin = isAuthenticated && studentId === '8918';

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b px-4 md:px-6 shadow-sm app-header-acrylic">
      <div className="flex items-center gap-2 md:gap-4">
        {isAuthenticated && <SidebarTrigger className="md:hidden" />}
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary md:text-xl">
          <Brain className="h-7 w-7" /> 
          <span>BrainLoop</span>
        </Link>
        {isAuthenticated && (
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses, labs..."
              className="pl-8 sm:w-[200px] md:w-[250px] lg:w-[300px] bg-background/50 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {isAuthenticated && (
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild size="sm">
            <Link href="/courses">
              <Library className="mr-1 h-4 w-4" /> Courses
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/labs">
              <FlaskConical className="mr-1 h-4 w-4" /> AR Labs
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/qa">
              <HelpCircle className="mr-1 h-4 w-4" /> Q&A
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/static-quiz"> 
              <Puzzle className="mr-1 h-4 w-4" /> Static Quiz
            </Link>
          </Button>
           <Button variant="ghost" asChild size="sm">
            <Link href="/quiz">
              <FileText className="mr-1 h-4 w-4" /> AI Quiz
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/timetable">
              <CalendarDays className="mr-1 h-4 w-4" /> Time Table
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/live-meetings">
              <Radio className="mr-1 h-4 w-4" /> Live Meetings
            </Link>
          </Button>
           <Button variant="ghost" asChild size="sm">
            <Link href="/profile">
              <User className="mr-1 h-4 w-4" /> Profile
            </Link>
          </Button>
          {isAdmin && ( 
            <Button variant="ghost" asChild size="sm">
              <Link href="/admin">
                <Settings2 className="mr-1 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
        </nav>
      )}

      <div className="flex items-center gap-2">
         {mounted && (
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={`Toggle to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
        {isAuthenticated ? (
          <>
            {studentId && (
              <span className="text-sm text-muted-foreground hidden sm:inline flex items-center">
                <UserCircle className="mr-1 h-4 w-4" /> {studentId}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log Out</span>
            </Button>
          </>
        ) : (
            <Button variant="outline" asChild>
              <Link href="/login">Log In</Link>
            </Button>
        )}
      </div>
    </header>
  );
}

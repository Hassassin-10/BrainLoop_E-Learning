
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Library,
  FlaskConical,
  HelpCircle,
  FileText,
  Settings2, 
  Home,
  UserCircle,
  LogOut,
  Brain, 
  Puzzle,
  User,
  Bot,
  Radio,
  CalendarDays // Added CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItemsBase = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/courses', label: 'Courses', icon: Library },
  { href: '/labs', label: 'AR Labs', icon: FlaskConical },
  { href: '/qa', label: 'Q & A', icon: HelpCircle },
  { href: '/static-quiz', label: 'Static Quiz', icon: Puzzle },
  { href: '/quiz', label: 'AI Quiz', icon: FileText },
  { href: '/timetable', label: 'Time Table', icon: CalendarDays }, // Added Time Table
  { href: '/live-meetings', label: 'Live Meetings', icon: Radio },
  { href: '/profile', label: 'My Profile', icon: User },
];

const adminNavItem = { href: '/admin', label: 'Admin Panel', icon: Settings2 };


export default function AppSidebar() {
  const pathname = usePathname();
  const { studentId, logout, isAuthenticated } = useAuth(); 
  const { state, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (state === 'collapsed' || window.innerWidth < 768) { 
        setOpenMobile(false);
    }
  };

  if (!isAuthenticated) { 
    return null;
  }
  
  const isAdmin = isAuthenticated && studentId === '8918';
  const navItems = isAdmin ? [...navItemsBase, adminNavItem] : navItemsBase;


  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="items-center p-4">
         {state === 'expanded' && (
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground">
                <Brain className="h-7 w-7" />
                <span>BrainLoop</span>
            </Link>
        )}
         {state === 'collapsed' && (
             <Link href="/" className="flex items-center justify-center">
                <Brain className="h-7 w-7 text-sidebar-foreground" />
            </Link>
        )}
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                tooltip={item.label}
                onClick={handleLinkClick}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {state === 'expanded' && studentId && (
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80 mb-2">
            <UserCircle className="h-5 w-5" />
            <span>{studentId}</span>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => {
            logout();
            handleLinkClick(); 
          }}
          title="Logout"
        >
          <LogOut className={`mr-2 h-5 w-5 ${state === 'collapsed' ? 'mr-0' : ''}`} />
          {state === 'expanded' && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

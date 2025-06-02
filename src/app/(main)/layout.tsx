
'use client'; // This layout uses hooks, so it must be a client component

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppHeader from '@/components/app-header';
import AppSidebar from '@/components/app-sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import GlobalChatbot from '@/components/global-chatbot';
import AudioNavigationControl from '@/components/audio-navigation-control';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermissionAndSaveToken, initializeFCMListeners } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { messaging, app } from '@/lib/firebase'; // Import messaging and app

export default function MainAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { firebaseUser, studentId } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let fcmUnsubscribe: (() => void) | void;

    const setupNotifications = async () => {
      if (firebaseUser && studentId && messaging && 'serviceWorker' in navigator && app) {
        const fbConfig = app.options;
        const queryParams = new URLSearchParams({
          apiKey: fbConfig.apiKey || '',
          authDomain: fbConfig.authDomain || '',
          projectId: fbConfig.projectId || '',
          storageBucket: fbConfig.storageBucket || '',
          messagingSenderId: fbConfig.messagingSenderId || '',
          appId: fbConfig.appId || '',
          databaseURL: fbConfig.databaseURL || '', // Include databaseURL if your SW needs it
        }).toString();
        const swUrl = `/firebase-messaging-sw.js?${queryParams}`;

        try {
          const registration = await navigator.serviceWorker.register(swUrl);
          console.log('Service Worker registered successfully with scope:', registration.scope);
          
          // Wait for the service worker to become active
          await navigator.serviceWorker.ready;
          console.log('Service Worker is active.');

          // Now request permission and get token
          await requestNotificationPermissionAndSaveToken(firebaseUser.uid, registration);
        } catch (err) {
          console.error('Service Worker registration or token retrieval failed:', err);
          toast({
            title: 'Notification Setup Failed',
            description: `Could not initialize notifications: ${(err as Error).message}`,
            variant: 'destructive',
          });
        }

        // Initialize listeners for foreground messages
        fcmUnsubscribe = initializeFCMListeners();
      }
    };

    setupNotifications();

    // Listener for custom event from notificationService to show toast
    const handleForegroundMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent.detail;
      if (payload.notification) {
        toast({
          title: payload.notification.title || "New Notification",
          description: payload.notification.body || "You have an update.",
        });
      }
    };
    window.addEventListener('fcmForegroundMessage', handleForegroundMessage);

    return () => {
      if (fcmUnsubscribe) {
        fcmUnsubscribe();
      }
      window.removeEventListener('fcmForegroundMessage', handleForegroundMessage);
    };
  }, [firebaseUser, studentId, toast, app]); // Added app to dependencies

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <div className="flex flex-1">
            <AppSidebar />
            <main className="flex-1 bg-secondary/50 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
        <GlobalChatbot />
        <AudioNavigationControl />
      </SidebarProvider>
    </ProtectedRoute>
  );
}

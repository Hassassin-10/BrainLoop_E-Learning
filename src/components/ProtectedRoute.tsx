
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authContext = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authContext.isLoading && !authContext.isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [authContext.isAuthenticated, authContext.isLoading, router, pathname]);

  if (authContext.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authContext.isAuthenticated && pathname !== '/login') {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-2">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}

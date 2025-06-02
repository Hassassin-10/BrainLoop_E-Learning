
'use client';

import type { ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

interface AnimationWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number; // in milliseconds for CSS transition-delay
  initialState?: string; // Tailwind classes for initial state, e.g., 'opacity-0 translate-y-5'
  finalState?: string; // Tailwind classes for final state, e.g., 'opacity-100 translate-y-0'
  threshold?: number; // IntersectionObserver threshold
  triggerOnce?: boolean; // Whether to trigger animation only once
  duration?: string; // Tailwind duration class, e.g., 'duration-500'
}

export const AnimationWrapper = ({
  children,
  className,
  delay = 0,
  initialState = 'opacity-0 translate-y-6', // Default: fade-in-up
  finalState = 'opacity-100 translate-y-0',
  threshold = 0.1, // Trigger when 10% of the element is visible
  triggerOnce = true,
  duration = 'duration-700', // Default animation duration
}: AnimationWrapperProps) => {
  const { ref, inView } = useInView({
    triggerOnce: triggerOnce,
    threshold: threshold,
    // Note: react-intersection-observer's `delay` prop is for when `inView` becomes true,
    // not for CSS animation delay. We use inline style for `transitionDelay`.
  });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out', // General transition properties
        duration,                 // Apply duration class
        inView ? finalState : initialState, // Apply states based on inView status
        className
      )}
      style={{ transitionDelay: `${delay}ms` }} // Apply CSS transition-delay
    >
      {children}
    </div>
  );
};

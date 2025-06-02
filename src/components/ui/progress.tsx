"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, children, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 transition-all" // Removed explicit bg-primary, relies on CSS in globals.css
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      data-radix-progress-indicator // Add data attribute for easier targeting
    />
     {/* Allow children to be rendered, useful for text labels */}
    {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

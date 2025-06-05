"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Import Spline with proper ESM handling for v2.2.6
const Spline = dynamic(
  () =>
    import("@splinetool/react-spline").then((mod) => {
      // Handle both ESM and CommonJS exports
      return mod.default || mod;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-secondary/20 to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-primary/50">Loading 3D Background...</div>
        </div>
      </div>
    ),
  }
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function SplineBackground() {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <div className="fixed inset-0 -z-10">
      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-secondary/20 to-background">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-primary/50">
                3D Background Failed to Load
              </div>
            </div>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-secondary/20 to-background">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-primary/50">Loading 3D Background...</div>
              </div>
            </div>
          }
        >
          <Spline
            scene="https://prod.spline.design/your-scene-url"
            onLoad={() => setIsLoaded(true)}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: "opacity 0.5s ease-in-out",
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

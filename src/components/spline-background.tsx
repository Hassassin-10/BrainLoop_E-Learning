"use client";

export function SplineBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-secondary/20 to-background">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-primary/50">3D Background</div>
      </div>
    </div>
  );
}

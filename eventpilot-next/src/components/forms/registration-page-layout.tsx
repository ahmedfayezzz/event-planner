import { cn } from "@/lib/utils";

interface RegistrationPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function RegistrationPageLayout({
  children,
  className,
}: RegistrationPageLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 relative overflow-hidden",
        className
      )}
    >
      {/* Background pattern dots */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.02] pointer-events-none"></div>

      {/* Decorative glass orbs */}
      <div className="absolute top-20 right-10 w-32 h-32 md:w-64 md:h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-40 h-40 md:w-80 md:h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

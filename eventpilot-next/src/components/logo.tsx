import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "navbar" | "footer" | "hero" | "admin" | "email";
  showText?: boolean;
  className?: string;
}

export function Logo({
  variant = "navbar",
  showText = true,
  className,
}: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 md:gap-3",
        variant === "hero" && "flex-col",
        variant === "footer" && "flex-col",
        className
      )}
    >
      <div className="relative group">
        <Image
          src="/logo.png"
          alt="ثلوثية الأعمال"
          width={
            variant === "navbar"
              ? 60
              : variant === "admin"
              ? 32
              : variant === "footer"
              ? 60
              : variant === "hero"
              ? 160
              : 80
          }
          height={
            variant === "navbar"
              ? 60
              : variant === "admin"
              ? 32
              : variant === "footer"
              ? 60
              : variant === "hero"
              ? 160
              : 80
          }
          className={cn(
            "transition-transform hover:scale-105",
            variant === "navbar" && "md:w-15 md:h-15 w-15 h-15 rounded-lg",
            variant === "admin" && "w-8 h-8 rounded-lg",
            variant === "footer" && "md:w-15 md:h-15 w-10 h-10",
            variant === "hero" && "md:w-40 md:h-40 w-24 h-24 drop-shadow-2xl",
            variant === "email" && "w-20 h-20"
          )}
          priority={variant === "navbar" || variant === "hero"}
        />
      </div>
      {showText && (
        <span
          className={cn(
            "font-bold text-primary",
            variant === "navbar" && "text-xl tracking-tight hidden sm:inline",
            variant === "admin" && "text-sm font-semibold hidden sm:inline",
            variant === "footer" && "text-2xl text-white",
            variant === "hero" &&
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-cairo leading-tight",
            variant === "email" && "text-3xl"
          )}
        >
          ثلوثية الأعمال
        </span>
      )}
    </div>
  );
}

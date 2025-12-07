"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
  variant?: "dark" | "light"; // dark = white text (for dark bg), light = themed text (for light bg)
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, title, onExpire, compact, variant = "light", className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setExpired(true);
        onExpire?.();
        return null;
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      if (!newTimeLeft) {
        clearInterval(timer);
      }
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (expired) {
    return (
      <div className={compact ? "text-center py-2" : "text-center py-4 md:py-8"}>
        <p className={compact ? "text-base md:text-lg font-bold text-primary" : "text-xl md:text-2xl font-bold text-primary"}>
          بدأ الحدث!
        </p>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex justify-center gap-2 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={compact ? "h-10 w-10 md:h-12 md:w-12 animate-pulse rounded-lg bg-muted" : "h-16 w-14 md:h-24 md:w-20 animate-pulse rounded-lg bg-muted"} />
        ))}
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.seconds, label: "ثانية" },
    { value: timeLeft.minutes, label: "دقيقة" },
    { value: timeLeft.hours, label: "ساعة" },
    { value: timeLeft.days, label: "يوم" },
  ];

  // Style variants
  const isDark = variant === "dark";

  const boxStyles = isDark
    ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
    : "bg-primary/5 border border-primary/20 shadow-sm";

  const numberStyles = isDark ? "text-white" : "text-primary";
  const labelStyles = isDark ? "text-white/70" : "text-muted-foreground";

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {title && (
          <h3 className={cn("text-center text-xs md:text-sm font-semibold", labelStyles)}>
            {title}
          </h3>
        )}
        <div className="flex justify-center gap-1.5 md:gap-2">
          {timeUnits.map((unit, index) => (
            <div key={index} className={cn("min-w-[42px] md:min-w-[50px] rounded-lg p-1.5 md:p-2 text-center", boxStyles)}>
              <div className={cn("text-base md:text-lg font-bold", numberStyles)}>
                {unit.value.toString().padStart(2, "0")}
              </div>
              <div className={cn("text-[8px] md:text-[10px]", labelStyles)}>
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 md:space-y-4", className)}>
      {title && (
        <h3 className={cn("text-center text-base md:text-lg font-semibold", labelStyles)}>
          {title}
        </h3>
      )}
      <div className="flex justify-center gap-2 md:gap-3 lg:gap-4">
        {timeUnits.map((unit, index) => (
          <div
            key={index}
            className={cn(
              "min-w-[55px] md:min-w-[70px] lg:min-w-[80px] rounded-xl md:rounded-2xl p-2 md:p-3 lg:p-4 text-center transition-all",
              boxStyles,
              isDark && "hover:bg-white/15"
            )}
          >
            <div className={cn("text-xl md:text-2xl lg:text-4xl font-bold", numberStyles)}>
              {unit.value.toString().padStart(2, "0")}
            </div>
            <div className={cn("text-[10px] md:text-xs lg:text-sm mt-0.5 md:mt-1", labelStyles)}>
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

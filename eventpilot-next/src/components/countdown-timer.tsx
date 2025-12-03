"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, title, onExpire, compact }: CountdownTimerProps) {
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
      <div className={compact ? "text-center py-2" : "text-center py-8"}>
        <p className={compact ? "text-lg font-bold text-primary" : "text-2xl font-bold text-primary"}>
          بدأت الجلسة!
        </p>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex justify-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={compact ? "h-12 w-12 animate-pulse rounded-lg bg-muted" : "h-24 w-20 animate-pulse rounded-lg bg-muted"} />
        ))}
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.days, label: "يوم" },
    { value: timeLeft.hours, label: "ساعة" },
    { value: timeLeft.minutes, label: "دقيقة" },
    { value: timeLeft.seconds, label: "ثانية" },
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        {title && (
          <h3 className="text-center text-sm font-semibold text-muted-foreground">
            {title}
          </h3>
        )}
        <div className="flex justify-center gap-2">
          {timeUnits.map((unit, index) => (
            <div key={index} className="min-w-[50px] bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-primary">
                {unit.value.toString().padStart(2, "0")}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-center text-lg font-semibold text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="flex justify-center gap-3 md:gap-4">
        {timeUnits.map((unit, index) => (
          <Card key={index} className="min-w-[70px] md:min-w-[80px]">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-2xl md:text-4xl font-bold text-primary">
                {unit.value.toString().padStart(2, "0")}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">
                {unit.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

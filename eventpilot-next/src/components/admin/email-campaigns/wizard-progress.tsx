"use client";

import { cn } from "@/lib/utils";
import { Check, Users, Mail, Send } from "lucide-react";

interface WizardProgressProps {
  currentStep: number;
  steps: { title: string; description: string }[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  const icons = [Users, Mail, Send];

  return (
    <div className="w-full">
      {/* Desktop: Horizontal stepper - compact */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const Icon = icons[index] ?? Mail;
          const isCompleted = currentStep > index;
          const isCurrent = currentStep === index;

          return (
            <div key={index} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    (isCompleted || isCurrent) && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-3 transition-all",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          {steps.map((_, index) => {
            const isCompleted = currentStep > index;
            const isCurrent = currentStep === index;

            return (
              <div key={index} className="flex items-center flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <div className="font-medium">{steps[currentStep]?.title}</div>
          <div className="text-sm text-muted-foreground">
            {steps[currentStep]?.description}
          </div>
        </div>
      </div>
    </div>
  );
}

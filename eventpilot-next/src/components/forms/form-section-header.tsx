import { cn } from "@/lib/utils";

interface FormSectionHeaderProps {
  title: string;
  className?: string;
}

export function FormSectionHeader({ title, className }: FormSectionHeaderProps) {
  return (
    <h3
      className={cn(
        "font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base",
        className
      )}
    >
      <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
      {title}
    </h3>
  );
}

"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Color variant for fallback initials */
  variant?: "default" | "light" | "accent";
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
};

const variantClasses = {
  default: "bg-primary/10 text-primary",
  light: "bg-white/20 text-white",
  accent: "bg-accent text-primary",
};

/**
 * Get initials from a name (supports Arabic and English)
 */
function getInitials(name?: string | null): string {
  if (!name) return "";

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    // Single word - return first character
    return parts[0].charAt(0).toUpperCase();
  }

  // Multiple words - return first char of first and last word
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
}

/**
 * UserAvatar component with S3 presigned URL support
 * Displays user's avatar image or falls back to initials
 */
export function UserAvatar({ avatarUrl, name, size = "md", className, variant = "default" }: UserAvatarProps) {
  const { url: imageUrl, isLoading } = usePresignedUrl(avatarUrl);
  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && !isLoading && imageUrl && (
        <AvatarImage src={imageUrl} alt={name || "User avatar"} />
      )}
      <AvatarFallback className={cn(variantClasses[variant], "font-medium")}>
        {initials || <User className="size-1/2 opacity-50" />}
      </AvatarFallback>
    </Avatar>
  );
}

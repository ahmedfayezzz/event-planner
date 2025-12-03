"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface QRDisplayProps {
  qrCode?: string | null;
  title?: string;
  description?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-32 h-32",
  md: "w-48 h-48",
  lg: "w-64 h-64",
};

export function QRDisplay({
  qrCode,
  title,
  description,
  isLoading,
  size = "md",
}: QRDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        {(title || description) && (
          <CardHeader className="text-center">
            {title && <Skeleton className="h-6 w-32 mx-auto" />}
            {description && <Skeleton className="h-4 w-48 mx-auto mt-2" />}
          </CardHeader>
        )}
        <CardContent className="flex justify-center pb-6">
          <Skeleton className={sizeClasses[size]} />
        </CardContent>
      </Card>
    );
  }

  if (!qrCode) {
    return (
      <Card>
        {(title || description) && (
          <CardHeader className="text-center">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="flex justify-center items-center pb-6">
          <div className={`${sizeClasses[size]} bg-muted rounded-lg flex items-center justify-center`}>
            <p className="text-muted-foreground text-sm text-center px-4">
              رمز QR غير متوفر
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {(title || description) && (
        <CardHeader className="text-center">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex justify-center pb-6">
        <div className={`${sizeClasses[size]} bg-white rounded-lg p-2 shadow-sm`}>
          <img
            src={qrCode}
            alt="QR Code"
            className="w-full h-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified inline version without card wrapper
export function QRCodeImage({
  qrCode,
  size = "md",
  className,
}: {
  qrCode?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!qrCode) {
    return (
      <div className={`${sizeClasses[size]} bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <p className="text-muted-foreground text-sm text-center px-4">
          رمز QR غير متوفر
        </p>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-white rounded-lg p-2 shadow-sm ${className || ""}`}>
      <img
        src={qrCode}
        alt="QR Code"
        className="w-full h-full object-contain"
      />
    </div>
  );
}

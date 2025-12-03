"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8 text-center">
      <h1 className="text-9xl font-bold text-muted-foreground/20">500</h1>
      <h2 className="text-2xl font-bold mt-4">حدث خطأ</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-2" dir="ltr">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-4 mt-8">
        <Button onClick={reset}>
          <RefreshCcw className="ml-2 h-4 w-4" />
          حاول مرة أخرى
        </Button>
        <Button variant="outline" asChild>
          <a href="/">
            <Home className="ml-2 h-4 w-4" />
            الصفحة الرئيسية
          </a>
        </Button>
      </div>
    </div>
  );
}

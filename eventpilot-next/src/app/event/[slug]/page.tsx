"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  // Try to get session by slug first, then by ID
  const { data: session, isLoading, error } = api.session.getBySlug.useQuery(
    { slug },
    {
      retry: false,
    }
  );

  useEffect(() => {
    if (session) {
      // Redirect to the session page
      router.replace(`/session/${session.id}`);
    } else if (!isLoading && !session) {
      // Try as ID if slug didn't work
      router.replace(`/session/${slug}`);
    }
  }, [session, isLoading, router, slug]);

  if (error) {
    // Try as ID if slug didn't work
    router.replace(`/session/${slug}`);
    return null;
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <p className="text-muted-foreground">جارٍ التحميل...</p>
      </div>
    </div>
  );
}

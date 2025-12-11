import { api } from "@/trpc/react";

/**
 * Hook to get a presigned read URL for S3 images
 * Automatically handles Railway's private bucket requirement
 *
 * @param url - The stored image URL (may be direct or need presigning)
 * @param enabled - Whether to fetch the presigned URL
 * @returns The URL to use for displaying the image
 */
export function usePresignedUrl(url: string | null | undefined, enabled = true) {
  const { data, isLoading, error } = api.upload.getReadUrl.useQuery(
    { url: url ?? "" },
    {
      enabled: enabled && !!url,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    url: data?.url ?? url ?? "",
    isPresigned: data?.presigned ?? false,
    isLoading: enabled && !!url && isLoading,
    error,
  };
}

/**
 * Hook to check if this deployment needs presigned URLs
 */
export function useNeedsPresignedUrls() {
  const { data } = api.upload.needsPresignedUrls.useQuery(undefined, {
    staleTime: Infinity, // This won't change during session
  });

  return {
    needsPresigned: data?.needsPresigned ?? false,
    isConfigured: data?.isConfigured ?? false,
  };
}

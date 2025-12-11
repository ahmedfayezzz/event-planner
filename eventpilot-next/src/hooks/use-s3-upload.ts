import { useState, useCallback } from "react";
import { api } from "@/trpc/react";

type ImageType = "avatar" | "banner" | "logo";

interface UploadState {
  status: "idle" | "preparing" | "uploading" | "confirming" | "complete" | "error";
  progress: number;
  error?: string;
}

interface UseS3UploadOptions {
  imageType: ImageType;
  entityId: string;
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: string) => void;
}

export function useS3Upload(options: UseS3UploadOptions) {
  const { imageType, entityId, onSuccess, onError } = options;
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });

  const getPresignedUrl = api.upload.getPresignedUrl.useMutation();
  const confirmUpload = api.upload.confirmUpload.useMutation();

  const upload = useCallback(
    async (file: File, oldImageUrl?: string): Promise<string | null> => {
      try {
        setState({ status: "preparing", progress: 0 });

        // 1. Get presigned URL from backend
        const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
          imageType,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          entityId,
        });

        setState({ status: "uploading", progress: 20 });

        // 2. Upload directly to S3
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!response.ok) {
          throw new Error("فشل في رفع الملف إلى التخزين");
        }

        setState({ status: "confirming", progress: 80 });

        // 3. Confirm upload and update entity
        await confirmUpload.mutateAsync({
          imageType,
          entityId,
          imageUrl: publicUrl,
          oldImageUrl,
        });

        setState({ status: "complete", progress: 100 });
        onSuccess?.(publicUrl);

        return publicUrl;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "فشل في رفع الصورة";
        setState({ status: "error", progress: 0, error: message });
        onError?.(message);
        return null;
      }
    },
    [imageType, entityId, getPresignedUrl, confirmUpload, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ status: "idle", progress: 0 });
  }, []);

  return {
    upload,
    reset,
    status: state.status,
    progress: state.progress,
    error: state.error,
    isUploading:
      state.status === "uploading" ||
      state.status === "preparing" ||
      state.status === "confirming",
    isComplete: state.status === "complete",
    isError: state.status === "error",
  };
}

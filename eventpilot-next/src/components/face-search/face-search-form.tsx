"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Upload, X, Search, Loader2 } from "lucide-react";

interface FaceSearchFormProps {
  onSearch: (matches: { filename: string; similarity: number }[], total: number) => void;
  isLoading: boolean;
  onLoadingChange: (isLoading: boolean) => void;
}

export function FaceSearchForm({
  onSearch,
  isLoading,
  onLoadingChange,
}: FaceSearchFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError(null);
    onLoadingChange(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/face-search", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        onSearch(data.matches, data.total);
      } else {
        setError(data.error || "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reference-image">صورة الشخص المراد البحث عنه</Label>
        <div className="mt-2">
          {preview ? (
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="h-48 w-48 rounded-lg object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -left-2 h-6 w-6"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="reference-image"
              className={cn(
                "flex h-48 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed",
                "border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="mt-2 text-sm text-muted-foreground">
                اختر صورة
              </span>
            </label>
          )}
          <input
            ref={inputRef}
            id="reference-image"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={!file || isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري البحث...
          </>
        ) : (
          <>
            <Search className="ml-2 h-4 w-4" />
            بحث
          </>
        )}
      </Button>
    </form>
  );
}

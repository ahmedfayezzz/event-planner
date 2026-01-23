/**
 * In-memory store for tracking Google Drive import progress and cancellation
 */

export interface ImportProgress {
  galleryId: string;
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  status: "importing" | "completed" | "cancelled" | "failed";
  cancelled: boolean;
  startedAt: Date;
  completedAt?: Date;
}

const importProgressStore = new Map<string, ImportProgress>();

export function startImportProgress(galleryId: string, total: number): void {
  importProgressStore.set(galleryId, {
    galleryId,
    total,
    imported: 0,
    failed: 0,
    skipped: 0,
    status: "importing",
    cancelled: false,
    startedAt: new Date(),
  });
}

export function updateImportProgress(
  galleryId: string,
  updates: Partial<Pick<ImportProgress, "imported" | "failed" | "skipped">>
): void {
  const progress = importProgressStore.get(galleryId);
  if (progress) {
    Object.assign(progress, updates);
  }
}

export function completeImportProgress(galleryId: string): void {
  const progress = importProgressStore.get(galleryId);
  if (progress) {
    progress.status = "completed";
    progress.completedAt = new Date();
    // Clean up after 5 minutes
    setTimeout(() => {
      importProgressStore.delete(galleryId);
    }, 5 * 60 * 1000);
  }
}

export function failImportProgress(galleryId: string): void {
  const progress = importProgressStore.get(galleryId);
  if (progress) {
    progress.status = "failed";
    progress.completedAt = new Date();
    // Clean up after 5 minutes
    setTimeout(() => {
      importProgressStore.delete(galleryId);
    }, 5 * 60 * 1000);
  }
}

export function cancelImportProgress(galleryId: string): void {
  const progress = importProgressStore.get(galleryId);
  if (progress) {
    progress.cancelled = true;
    progress.status = "cancelled";
    progress.completedAt = new Date();
    // Clean up after 1 minute
    setTimeout(() => {
      importProgressStore.delete(galleryId);
    }, 60 * 1000);
  }
}

export function getImportProgress(galleryId: string): ImportProgress | null {
  return importProgressStore.get(galleryId) ?? null;
}

export function isImportCancelled(galleryId: string): boolean {
  const progress = importProgressStore.get(galleryId);
  return progress?.cancelled ?? false;
}

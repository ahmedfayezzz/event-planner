"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { X, Plus, Check } from "lucide-react";

interface UserLabelManagerProps {
  userId: string;
  userLabels: Array<{ id: string; name: string; color: string }>;
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

const PRESET_COLORS = [
  "#001421", // Midnight Blue (primary)
  "#B27F59", // Sand (accent)
  "#8C684A", // Dark Sand
  "#CDA991", // Dune
  "#333F48", // Pantone 7546
  "#10b981", // green
  "#ef4444", // red
  "#8b5cf6", // purple
];

export function UserLabelManager({
  userId,
  userLabels,
  trigger,
  onUpdate,
}: UserLabelManagerProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  // Use userLabels directly as source of truth, local state only for optimistic updates
  const [localLabels, setLocalLabels] = useState<string[] | null>(null);

  // Use local state if set, otherwise use prop
  const selectedLabels = localLabels ?? userLabels.map((l) => l.id);

  const { data: allLabels, refetch: refetchLabels } = api.label.getAll.useQuery();

  const createLabelMutation = api.label.create.useMutation({
    onSuccess: async (newLabel) => {
      await refetchLabels();
      const newSelection = [...selectedLabels, newLabel.id];
      setLocalLabels(newSelection);
      setSearchValue("");
      // Auto-save after creating
      assignLabelsMutation.mutate({
        userId,
        labelIds: newSelection,
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const assignLabelsMutation = api.label.assignToUser.useMutation({
    onSuccess: () => {
      // Reset local state and let parent refetch
      setLocalLabels(null);
      onUpdate?.();
    },
    onError: (error) => {
      // Revert on error
      setLocalLabels(null);
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleToggleLabel = (labelId: string) => {
    const newSelection = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];

    // Optimistic update
    setLocalLabels(newSelection);

    // Auto-save on selection change
    assignLabelsMutation.mutate({
      userId,
      labelIds: newSelection,
    });
  };

  const handleCreateLabel = (name: string) => {
    // Pick a random color from presets
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    createLabelMutation.mutate({
      name: name.trim(),
      color: randomColor,
    });
  };

  // Reset local state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setLocalLabels(null);
      setSearchValue("");
    }
  };

  // Filter labels based on search
  const filteredLabels = allLabels?.filter((label) =>
    label.name.toLowerCase().includes(searchValue.toLowerCase())
  ) ?? [];

  // Check if search value exactly matches an existing label
  const exactMatch = allLabels?.some(
    (label) => label.name.toLowerCase() === searchValue.toLowerCase().trim()
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تصنيفات المستخدم</DialogTitle>
        </DialogHeader>

        {/* Selected labels display */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {selectedLabels.map((labelId) => {
              const label = allLabels?.find((l) => l.id === labelId);
              if (!label) return null;
              return (
                <Badge
                  key={label.id}
                  className="gap-1 pr-1"
                  style={{
                    backgroundColor: label.color + "20",
                    color: label.color,
                    borderColor: label.color + "40",
                  }}
                >
                  {label.name}
                  <button
                    onClick={() => handleToggleLabel(label.id)}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Search and select */}
        <div className="border rounded-lg">
          <div className="flex items-center border-b px-3">
            <input
              placeholder="ابحث أو أنشئ تصنيف..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredLabels.length === 0 && !searchValue.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                لا توجد تصنيفات
              </div>
            )}
            {filteredLabels.map((label) => {
              const isSelected = selectedLabels.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggleLabel(label.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-accent text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-right">{label.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
            {/* Show create option when searching and no exact match */}
            {searchValue.trim() && !exactMatch && (
              <button
                onClick={() => handleCreateLabel(searchValue)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-accent text-sm text-primary border-t mt-1"
              >
                <Plus className="h-4 w-4" />
                <span>إنشاء &quot;{searchValue.trim()}&quot;</span>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

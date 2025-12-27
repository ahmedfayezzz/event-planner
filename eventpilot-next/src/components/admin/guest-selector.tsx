"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  GripVertical,
  Loader2,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";

// Simple guest type for the selector
interface SelectedGuest {
  id: string;
  name: string;
  title: string | null;
  jobTitle: string | null;
  company: string | null;
  imageUrl: string | null;
}

// Component to display guest image with presigned URL
function GuestAvatar({
  imageUrl,
  name,
  size = "sm",
}: {
  imageUrl: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const { url, isLoading } = usePresignedUrl(imageUrl);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-full" />
      ) : (
        <>
          <AvatarImage src={url || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            <User className="h-3 w-3" />
          </AvatarFallback>
        </>
      )}
    </Avatar>
  );
}

interface GuestSelectorProps {
  selectedGuests: SelectedGuest[];
  onChange: (guests: SelectedGuest[]) => void;
  disabled?: boolean;
}

export function GuestSelector({
  selectedGuests,
  onChange,
  disabled = false,
}: GuestSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const utils = api.useUtils();

  // Search for guests
  const { data: searchResults, isLoading: isSearching } =
    api.guest.searchForSelector.useQuery(
      {
        search: debouncedSearch || undefined,
        excludeIds: selectedGuests.map((g) => g.id),
        limit: 10,
      },
      { enabled: open }
    );

  // Quick create mutation
  const quickCreateMutation = api.guest.quickCreate.useMutation({
    onSuccess: (newGuest) => {
      // Add the new guest to selected
      onChange([
        ...selectedGuests,
        {
          id: newGuest.id,
          name: newGuest.name,
          title: newGuest.title,
          jobTitle: newGuest.jobTitle,
          company: newGuest.company,
          imageUrl: newGuest.imageUrl,
        },
      ]);
      utils.guest.searchForSelector.invalidate();
      utils.guest.getAll.invalidate();
      utils.guest.getInsights.invalidate();
      setIsCreateDialogOpen(false);
      setNewGuestName("");
      toast.success("تم إنشاء الضيف وإضافته");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الضيف");
    },
  });

  const handleSelect = (guest: SelectedGuest) => {
    onChange([...selectedGuests, guest]);
    setSearchQuery("");
  };

  const handleRemove = (guestId: string) => {
    onChange(selectedGuests.filter((g) => g.id !== guestId));
  };

  const handleCreateGuest = () => {
    if (!newGuestName.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    quickCreateMutation.mutate({ name: newGuestName.trim() });
  };

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex === dropIndex) return;

    const newOrder = [...selectedGuests];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    onChange(newOrder);
  };

  const showCreateOption =
    searchQuery.trim() &&
    !isSearching &&
    (!searchResults || searchResults.length === 0);

  return (
    <div className="space-y-3">
      {/* Selected Guests */}
      {selectedGuests.length > 0 && (
        <div className="space-y-2">
          {selectedGuests.map((guest, index) => (
            <div
              key={guest.id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-muted/30",
                !disabled && "cursor-grab active:cursor-grabbing"
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <GuestAvatar
                imageUrl={guest.imageUrl}
                name={guest.name}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {guest.title && (
                    <span className="text-muted-foreground">{guest.title} </span>
                  )}
                  {guest.name}
                </p>
                {(guest.jobTitle || guest.company) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {guest.jobTitle}
                    {guest.jobTitle && guest.company && " - "}
                    {guest.company}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleRemove(guest.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Guest Button / Search */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة ضيف
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن ضيف بالاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-1">
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => {
                      handleSelect({
                        id: guest.id,
                        name: guest.name,
                        title: guest.title,
                        jobTitle: guest.jobTitle,
                        company: guest.company,
                        imageUrl: guest.imageUrl,
                      });
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-right"
                  >
                    <GuestAvatar
                      imageUrl={guest.imageUrl}
                      name={guest.name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {guest.title && (
                          <span className="text-muted-foreground">
                            {guest.title}{" "}
                          </span>
                        )}
                        {guest.name}
                      </p>
                      {(guest.jobTitle || guest.company) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {guest.jobTitle}
                          {guest.jobTitle && guest.company && " - "}
                          {guest.company}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : showCreateOption ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  لا يوجد ضيف بهذا الاسم
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewGuestName(searchQuery);
                    setIsCreateDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  إنشاء &quot;{searchQuery}&quot;
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "لا يوجد نتائج" : "ابدأ البحث عن ضيف"}
              </div>
            )}
          </div>

          {/* Create new button at bottom */}
          <div className="p-2 border-t">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setNewGuestName("");
                setIsCreateDialogOpen(true);
                setOpen(false);
              }}
            >
              <Plus className="ml-2 h-4 w-4" />
              إنشاء ضيف جديد
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Guest Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>إنشاء ضيف جديد</DialogTitle>
            <DialogDescription>
              أدخل اسم الضيف. يمكنك إضافة المزيد من التفاصيل لاحقاً من صفحة
              الضيوف.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-guest-name">الاسم</Label>
            <Input
              id="new-guest-name"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              placeholder="اسم الضيف"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateGuest();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewGuestName("");
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreateGuest}
              disabled={quickCreateMutation.isPending || !newGuestName.trim()}
            >
              {quickCreateMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Plus className="ml-2 h-4 w-4" />
                  إنشاء وإضافة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Share2,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  type LucideIcon,
} from "lucide-react";

// Custom icon components for platforms not in lucide
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 0 1 .267-.063c.21 0 .42.075.615.195.165.105.285.3.285.495 0 .225-.12.405-.24.525-.12.12-.27.21-.405.27-.12.045-.285.09-.45.135-.66.18-1.245.36-1.2.66.015.09.045.165.075.225.015.03.03.045.03.06l.012.039c.21.495 1.665 1.095 2.88 1.545.135.045.24.09.315.135.315.165.54.465.54.795 0 .3-.12.57-.36.735-.36.285-1.245.42-2.88.48-.06.48-.12.99-.195 1.455-.03.18-.09.36-.24.495a.79.79 0 0 1-.525.195c-.12 0-.315-.03-.45-.06-.45-.105-.9-.195-1.35-.285-.225-.045-.45-.075-.69-.075-.39 0-.87.075-1.245.27-.57.285-1.17.855-1.965.855-.75 0-1.38-.57-1.965-.87-.375-.18-.855-.255-1.245-.255-.24 0-.465.03-.69.075-.45.09-.9.18-1.35.285-.12.03-.33.06-.45.06a.762.762 0 0 1-.525-.195c-.15-.135-.21-.315-.24-.495-.075-.465-.135-.975-.195-1.455-1.635-.06-2.52-.195-2.88-.48a.784.784 0 0 1-.36-.735c0-.33.225-.63.54-.795.075-.045.18-.09.315-.135 1.215-.45 2.67-1.05 2.88-1.545l.012-.039c0-.015.015-.03.03-.06.03-.06.06-.135.075-.225.045-.3-.54-.48-1.2-.66-.165-.045-.33-.09-.45-.135-.135-.06-.285-.15-.405-.27-.12-.12-.24-.3-.24-.525 0-.195.12-.39.285-.495a.91.91 0 0 1 .615-.195c.09 0 .18.015.267.063.374.181.733.297 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847 1.583-3.545 4.94-3.821 5.93-3.821z"/>
  </svg>
);

// Social media platforms configuration
const SOCIAL_MEDIA_PLATFORMS: Array<{
  key: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
}> = [
  { key: "twitter", label: "X", icon: Twitter },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "tiktok", label: "TikTok", icon: TikTokIcon },
  { key: "snapchat", label: "Snapchat", icon: SnapchatIcon },
  { key: "website", label: "Website", icon: Globe },
];

type PlatformKey = (typeof SOCIAL_MEDIA_PLATFORMS)[number]["key"];

interface SponsorSocialMediaProps {
  sponsorId: string;
  socialMediaLinks?: Record<string, string> | null;
  trigger?: React.ReactNode;
  onUpdate?: () => void;
}

export function SponsorSocialMedia({
  sponsorId,
  socialMediaLinks,
  trigger,
  onUpdate,
}: SponsorSocialMediaProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [newPlatform, setNewPlatform] = useState<PlatformKey | "">("");
  const [newUrl, setNewUrl] = useState("");

  // Initialize links from prop when dialog opens
  useEffect(() => {
    if (open && socialMediaLinks) {
      setLinks(socialMediaLinks);
    } else if (open) {
      setLinks({});
    }
  }, [open, socialMediaLinks]);

  const updateMutation = api.sponsor.updateSocialMedia.useMutation({
    onSuccess: () => {
      onUpdate?.();
      toast.success("تم تحديث روابط التواصل الاجتماعي");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const handleAddLink = () => {
    if (!newPlatform || !newUrl.trim()) return;

    // Basic URL validation
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setLinks((prev) => ({
      ...prev,
      [newPlatform]: url,
    }));
    setNewPlatform("");
    setNewUrl("");
  };

  const handleRemoveLink = (platform: string) => {
    setLinks((prev) => {
      const updated = { ...prev };
      delete updated[platform];
      return updated;
    });
  };

  const handleSave = () => {
    updateMutation.mutate({
      sponsorId,
      socialMediaLinks: links,
    });
  };

  // Get platforms that are not already added
  const availablePlatforms = SOCIAL_MEDIA_PLATFORMS.filter(
    (p) => !links[p.key]
  );

  // Get the icon component for a platform
  const getPlatformIcon = (platform: string) => {
    const config = SOCIAL_MEDIA_PLATFORMS.find((p) => p.key === platform);
    if (config) {
      const IconComponent = config.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  // Get platform label
  const getPlatformLabel = (platform: string) => {
    return SOCIAL_MEDIA_PLATFORMS.find((p) => p.key === platform)?.label ?? platform;
  };

  // Count of active links
  const linkCount = Object.keys(socialMediaLinks ?? {}).length;

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Share2 className="h-4 w-4" />
      {linkCount > 0 && (
        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          {linkCount}
        </span>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            روابط التواصل الاجتماعي
          </DialogTitle>
        </DialogHeader>

        {/* Current links */}
        <div className="space-y-2">
          {Object.entries(links).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Share2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>لا توجد روابط</p>
            </div>
          ) : (
            Object.entries(links).map(([platform, url]) => (
              <div
                key={platform}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getPlatformIcon(platform)}
                  <span className="font-medium text-sm">
                    {getPlatformLabel(platform)}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground truncate hover:text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                </div>
                <button
                  onClick={() => handleRemoveLink(platform)}
                  className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new link */}
        {availablePlatforms.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">إضافة رابط جديد</p>
            <div className="flex gap-2">
              <Select
                value={newPlatform}
                onValueChange={(value) => setNewPlatform(value as PlatformKey)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="المنصة" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlatforms.map((platform) => (
                    <SelectItem key={platform.key} value={platform.key}>
                      <div className="flex items-center gap-2">
                        <platform.icon className="h-4 w-4" />
                        <span>{platform.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="الرابط..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddLink}
                disabled={!newPlatform || !newUrl.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : null}
            حفظ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Display-only component for showing social media icons in the table
export function SponsorSocialMediaIcons({
  socialMediaLinks,
}: {
  socialMediaLinks?: Record<string, string> | null;
}) {
  if (!socialMediaLinks || Object.keys(socialMediaLinks).length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(socialMediaLinks).map(([platform, url]) => {
        const config = SOCIAL_MEDIA_PLATFORMS.find((p) => p.key === platform);
        if (!config) return null;
        const IconComponent = config.icon;
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
            title={config.label}
          >
            <IconComponent className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}

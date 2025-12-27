"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresignedUrl } from "@/hooks/use-presigned-url";
import { formatArabicDate } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";

// Custom icon components for platforms not in lucide
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 0 1 .267-.063c.21 0 .42.075.615.195.165.105.285.3.285.495 0 .225-.12.405-.24.525-.12.12-.27.21-.405.27-.12.045-.285.09-.45.135-.66.18-1.245.36-1.2.66.015.09.045.165.075.225.015.03.03.045.03.06l.012.039c.21.495 1.665 1.095 2.88 1.545.135.045.24.09.315.135.315.165.54.465.54.795 0 .3-.12.57-.36.735-.36.285-1.245.42-2.88.48-.06.48-.12.99-.195 1.455-.03.18-.09.36-.24.495a.79.79 0 0 1-.525.195c-.12 0-.315-.03-.45-.06-.45-.105-.9-.195-1.35-.285-.225-.045-.45-.075-.69-.075-.39 0-.87.075-1.245.27-.57.285-1.17.855-1.965.855-.75 0-1.38-.57-1.965-.87-.375-.18-.855-.255-1.245-.255-.24 0-.465.03-.69.075-.45.09-.9.18-1.35.285-.12.03-.33.06-.45.06a.762.762 0 0 1-.525-.195c-.15-.135-.21-.315-.24-.495-.075-.465-.135-.975-.195-1.455-1.635-.06-2.52-.195-2.88-.48a.784.784 0 0 1-.36-.735c0-.33.225-.63.54-.795.075-.045.18-.09.315-.135 1.215-.45 2.67-1.05 2.88-1.545l.012-.039c0-.015.015-.03.03-.06.03-.06.06-.135.075-.225.045-.3-.54-.48-1.2-.66-.165-.045-.33-.09-.45-.135-.135-.06-.285-.15-.405-.27-.12-.12-.24-.3-.24-.525 0-.195.12-.39.285-.495a.91.91 0 0 1 .615-.195c.09 0 .18.015.267.063.374.181.733.297 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847 1.583-3.545 4.94-3.821 5.93-3.821z" />
  </svg>
);

// Social media platforms configuration
const SOCIAL_MEDIA_PLATFORMS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  twitter: { label: "X", icon: Twitter },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  instagram: { label: "Instagram", icon: Instagram },
  facebook: { label: "Facebook", icon: Facebook },
  youtube: { label: "YouTube", icon: Youtube },
  tiktok: { label: "TikTok", icon: TikTokIcon },
  snapchat: { label: "Snapchat", icon: SnapchatIcon },
  website: { label: "Website", icon: Globe },
};

function GuestProfileImage({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  const { url, isLoading } = usePresignedUrl(imageUrl);

  if (!imageUrl) {
    return (
      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <User className="w-16 h-16 md:w-20 md:h-20 text-primary/50" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto" />
    );
  }

  return (
    <img
      src={url || undefined}
      alt={name}
      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mx-auto shadow-lg"
    />
  );
}

export function GuestProfileClient({
  id,
  adminPreview = false,
}: {
  id: string;
  adminPreview?: boolean;
}) {
  const { data: guest, isLoading, error } = api.guest.getPublic.useQuery({
    id,
    adminPreview,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="h-40 md:h-48 bg-gradient-to-br from-primary/80 to-primary"></div>
        <div className="container -mt-20 md:-mt-24 px-4 pb-8 md:pb-12">
          <div className="max-w-2xl mx-auto">
            <Card className="rounded-2xl shadow-lg overflow-hidden">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto" />
                  <Skeleton className="h-8 w-48 mx-auto" />
                  <Skeleton className="h-5 w-64 mx-auto" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="container py-16 text-center">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-4 text-foreground">
          الضيف غير موجود
        </h1>
        <p className="text-muted-foreground mb-6">
          قد يكون الملف الشخصي غير متاح للعرض العام
        </p>
        <Button asChild size="lg">
          <Link href="/sessions">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للأحداث
          </Link>
        </Button>
      </div>
    );
  }

  const socialLinks = guest.socialMediaLinks as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Preview Banner */}
      {adminPreview && !guest.isPublic && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 py-2">
          <div className="container">
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">
                وضع المعاينة - هذا الملف غير منشور للعامة
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Background */}
      <div className="h-40 md:h-48 bg-gradient-to-br from-primary/80 to-primary"></div>

      {/* Main Content */}
      <div className="container -mt-20 md:-mt-24 px-4 pb-8 md:pb-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card className="rounded-2xl shadow-lg overflow-hidden">
            <CardContent className="pt-6 pb-8">
              <div className="text-center space-y-4">
                {/* Profile Image */}
                <GuestProfileImage imageUrl={guest.imageUrl} name={guest.name} />

                {/* Name and Title */}
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {guest.title ? `${guest.title} ${guest.name}` : guest.name}
                  </h1>

                  {/* Job Title and Company */}
                  {(guest.jobTitle || guest.company) && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      {guest.jobTitle && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {guest.jobTitle}
                        </span>
                      )}
                      {guest.jobTitle && guest.company && (
                        <span className="text-muted-foreground/50">|</span>
                      )}
                      {guest.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {guest.company}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {guest.description && (
                  <div className="pt-4 border-t max-w-lg mx-auto">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {guest.description}
                    </p>
                  </div>
                )}

                {/* Social Media Links */}
                {socialLinks && Object.keys(socialLinks).length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {Object.entries(socialLinks).map(([platform, url]) => {
                        const config = SOCIAL_MEDIA_PLATFORMS[platform];
                        if (!config || !url) return null;
                        const IconComponent = config.icon;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                            title={config.label}
                          >
                            <IconComponent className="w-5 h-5" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions Card */}
          {guest.sessionGuests && guest.sessionGuests.length > 0 && (
            <Card className="rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  الأحداث
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guest.sessionGuests.map((sg) => (
                  <Link
                    key={sg.session.id}
                    href={`/session/${sg.session.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sg.session.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatArabicDate(new Date(sg.session.date))}
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link href="/sessions">
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة للأحداث
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

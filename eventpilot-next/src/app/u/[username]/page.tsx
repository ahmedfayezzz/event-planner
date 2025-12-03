"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArabicDate } from "@/lib/utils";

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: user, isLoading, error } = api.user.getProfile.useQuery({ username });

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">المستخدم غير موجود</h1>
        <p className="text-muted-foreground mb-6">
          لم نتمكن من العثور على هذا المستخدم
        </p>
        <Button asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {user.name.charAt(0)}
              </span>
            </div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>@{user.username}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Professional Info */}
            {(user.companyName || user.position || user.activityType) && (
              <div className="flex flex-wrap gap-2 justify-center">
                {user.position && (
                  <Badge variant="secondary">{user.position}</Badge>
                )}
                {user.companyName && (
                  <Badge variant="outline">{user.companyName}</Badge>
                )}
                {user.activityType && (
                  <Badge variant="outline">{user.activityType}</Badge>
                )}
              </div>
            )}

            {/* AI Description */}
            {user.aiDescription && (
              <div className="pt-4 border-t">
                <p className="text-center text-muted-foreground leading-relaxed">
                  {user.aiDescription}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2">
          <Card>
            <CardHeader className="pb-2 text-center">
              <CardDescription>التسجيلات</CardDescription>
              <CardTitle className="text-3xl">{user.registrationCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 text-center">
              <CardDescription>الحضور</CardDescription>
              <CardTitle className="text-3xl">{user.attendanceCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Social Media */}
        {(user.instagram || user.snapchat || user.twitter) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">وسائل التواصل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-center">
                {user.instagram && (
                  <a
                    href={user.instagram.startsWith("http") ? user.instagram : `https://instagram.com/${user.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
                )}
                {user.snapchat && (
                  <a
                    href={user.snapchat.startsWith("http") ? user.snapchat : `https://snapchat.com/add/${user.snapchat}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                    </svg>
                    Snapchat
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={user.twitter.startsWith("http") ? user.twitter : `https://twitter.com/${user.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Member Since */}
        <div className="text-center text-sm text-muted-foreground">
          عضو منذ {formatArabicDate(new Date(user.createdAt))}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center pb-4">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}

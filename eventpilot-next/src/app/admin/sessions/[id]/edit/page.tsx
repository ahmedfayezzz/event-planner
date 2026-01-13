"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import {
  SessionForm,
  SessionFormData,
} from "@/components/admin/session-form";
import { formatDateForForm, formatDateTimeForForm, parseFormDateToUTC } from "@/lib/timezone";

export default function SessionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: session, isLoading } = api.session.getAdminDetails.useQuery({ id });

  const [initialFormData, setInitialFormData] =
    useState<SessionFormData | null>(null);

  useEffect(() => {
    if (session) {
      // Convert UTC dates to Saudi time for form display
      const { date: dateStr, time: timeStr } = formatDateForForm(session.date);
      setInitialFormData({
        sessionNumber: session.sessionNumber.toString(),
        title: session.title,
        description: session.description || "",
        date: dateStr,
        time: timeStr,
        location: session.location || "",
        guestIds: session.sessionGuests?.map((sg: { guestId: string }) => sg.guestId) || [],
        maxParticipants: session.maxParticipants.toString(),
        maxCompanions: session.maxCompanions.toString(),
        status: session.status as "open" | "closed" | "completed",
        requiresApproval: session.requiresApproval,
        showParticipantCount: session.showParticipantCount,
        showCountdown: session.showCountdown,
        showGuestProfile: session.showGuestProfile,
        inviteOnly: session.inviteOnly,
        inviteMessage: session.inviteMessage || "",
        sendQrInEmail: session.sendQrInEmail,
        showSocialMediaFields: session.showSocialMediaFields,
        showRegistrationPurpose: session.showRegistrationPurpose,
        showCateringInterest: session.showCateringInterest,
        slug: session.slug || "",
        registrationDeadline: session.registrationDeadline
          ? formatDateTimeForForm(session.registrationDeadline)
          : "",
        customConfirmationMessage: session.customConfirmationMessage || "",
        locationUrl: session.locationUrl || "",
        // Valet service
        valetEnabled: session.valetEnabled ?? false,
        valetLotCapacity: (session.valetLotCapacity ?? 0).toString(),
        valetRetrievalNotice: (session.valetRetrievalNotice ?? 5).toString(),
      });
    }
  }, [session]);

  const updateMutation = api.session.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحدث بنجاح");
      router.push(`/admin/sessions/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الحدث");
    },
  });

  const handleSubmit = async (formData: SessionFormData) => {
    // Convert Saudi time input to UTC for database storage
    const dateTime = parseFormDateToUTC(formData.date, formData.time);

    await updateMutation.mutateAsync({
      id,
      // sessionNumber is not editable - removed from mutation
      title: formData.title,
      description: formData.description || undefined,
      date: dateTime,
      location: formData.location || undefined,
      guestIds: formData.guestIds || [],
      maxParticipants: parseInt(formData.maxParticipants),
      maxCompanions: parseInt(formData.maxCompanions),
      status: formData.status,
      requiresApproval: formData.requiresApproval,
      showParticipantCount: formData.showParticipantCount,
      showCountdown: formData.showCountdown,
      showGuestProfile: formData.showGuestProfile,
      inviteOnly: formData.inviteOnly,
      inviteMessage: formData.inviteMessage || undefined,
      sendQrInEmail: formData.sendQrInEmail,
      showSocialMediaFields: formData.showSocialMediaFields,
      showRegistrationPurpose: formData.showRegistrationPurpose,
      showCateringInterest: formData.showCateringInterest,
      // slug field is commented out in form - removed from mutation
      // Convert registration deadline from Saudi time to UTC
      registrationDeadline: formData.registrationDeadline
        ? parseFormDateToUTC(formData.registrationDeadline.split("T")[0], formData.registrationDeadline.split("T")[1])
        : null,
      // customConfirmationMessage field is commented out in form - removed from mutation
      locationUrl: formData.locationUrl || undefined,
      // Valet service
      valetEnabled: formData.valetEnabled,
      valetLotCapacity: parseInt(formData.valetLotCapacity) || 0,
      valetRetrievalNotice: parseInt(formData.valetRetrievalNotice) || 5,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">الحدث غير موجود</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للأحداث</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/sessions/${id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">تعديل الحدث</h1>
          <p className="text-muted-foreground">
            {session.title} - التجمع رقم {session.sessionNumber}
          </p>
        </div>
      </div>

      {initialFormData && (
        <SessionForm
          mode="edit"
          initialData={initialFormData}
          initialSelectedGuests={session?.sessionGuests?.map((sg) => ({
            id: sg.guest.id,
            name: sg.guest.name,
            title: sg.guest.title,
            jobTitle: null,
            company: null,
            imageUrl: sg.guest.imageUrl,
          })) ?? []}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          onCancel={() => router.push(`/admin/sessions/${id}`)}
        />
      )}
    </div>
  );
}

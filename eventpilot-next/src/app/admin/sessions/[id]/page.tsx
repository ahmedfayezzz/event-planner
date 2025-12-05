"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, Users, QrCode, Mail } from "lucide-react";
import {
  SessionForm,
  SessionFormData,
  defaultFormData,
} from "@/components/admin/session-form";
import { InvitationModal } from "@/components/admin/invitation-modal";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: session, isLoading } = api.session.getById.useQuery({ id });

  const [initialFormData, setInitialFormData] =
    useState<SessionFormData | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    if (session) {
      const date = new Date(session.date);
      setInitialFormData({
        sessionNumber: session.sessionNumber.toString(),
        title: session.title,
        description: session.description || "",
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().slice(0, 5),
        location: session.location || "",
        guestName: session.guestName || "",
        guestProfile: session.guestProfile || "",
        maxParticipants: session.maxParticipants.toString(),
        maxCompanions: session.maxCompanions.toString(),
        status: session.status as "open" | "closed" | "completed",
        requiresApproval: session.requiresApproval,
        showParticipantCount: session.showParticipantCount,
        showCountdown: session.showCountdown,
        showGuestProfile: session.showGuestProfile,
        inviteOnly: session.inviteOnly,
        inviteMessage: session.inviteMessage || "",
        embedEnabled: session.embedEnabled,
        enableMiniView: session.enableMiniView,
        sendQrInEmail: session.sendQrInEmail,
        slug: session.slug || "",
        registrationDeadline: session.registrationDeadline
          ? new Date(session.registrationDeadline).toISOString().slice(0, 16)
          : "",
        customConfirmationMessage: session.customConfirmationMessage || "",
      });
    }
  }, [session]);

  const updateMutation = api.session.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الجلسة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الجلسة");
    },
  });

  const handleSubmit = async (formData: SessionFormData) => {
    const dateTime = new Date(`${formData.date}T${formData.time}`);

    await updateMutation.mutateAsync({
      id,
      sessionNumber: parseInt(formData.sessionNumber),
      title: formData.title,
      description: formData.description || undefined,
      date: dateTime,
      location: formData.location || undefined,
      guestName: formData.guestName || undefined,
      guestProfile: formData.guestProfile || undefined,
      maxParticipants: parseInt(formData.maxParticipants),
      maxCompanions: parseInt(formData.maxCompanions),
      status: formData.status,
      requiresApproval: formData.requiresApproval,
      showParticipantCount: formData.showParticipantCount,
      showCountdown: formData.showCountdown,
      showGuestProfile: formData.showGuestProfile,
      inviteOnly: formData.inviteOnly,
      inviteMessage: formData.inviteMessage || undefined,
      embedEnabled: formData.embedEnabled,
      enableMiniView: formData.enableMiniView,
      sendQrInEmail: formData.sendQrInEmail,
      slug: formData.slug || undefined,
      registrationDeadline: formData.registrationDeadline
        ? new Date(formData.registrationDeadline)
        : null,
      customConfirmationMessage:
        formData.customConfirmationMessage || undefined,
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
        <h2 className="text-xl font-bold mb-4">الجلسة غير موجودة</h2>
        <Button asChild>
          <Link href="/admin/sessions">العودة للجلسات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/sessions">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground">
              التجمع رقم {session.sessionNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setInviteModalOpen(true)}>
            <Mail className="ml-2 h-4 w-4" />
            دعوة مستخدمين
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/sessions/${id}/attendees`}>
              <Users className="ml-2 h-4 w-4" />
              المسجلين
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/checkin/${id}`}>
              <QrCode className="ml-2 h-4 w-4" />
              تسجيل الحضور
            </Link>
          </Button>
        </div>
      </div>

      {initialFormData && (
        <SessionForm
          mode="edit"
          initialData={initialFormData}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          onCancel={() => router.push("/admin/sessions")}
        />
      )}

      <InvitationModal
        sessionId={id}
        sessionTitle={session.title}
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </div>
  );
}

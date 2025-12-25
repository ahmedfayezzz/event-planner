"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CampaignWizard } from "@/components/admin/email-campaigns";

export default function NewCampaignPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/admin/email-campaigns">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">حملة جديدة</h1>
          <p className="text-muted-foreground">
            إنشاء وإرسال حملة بريد جديدة
          </p>
        </div>
      </div>

      {/* Wizard */}
      <CampaignWizard onSuccess={() => router.push("/admin/email-campaigns")} />
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { TemplateManager } from "@/components/admin/email-campaigns";

export default function TemplatesPage() {
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
          <h1 className="text-2xl font-bold">إدارة القوالب</h1>
          <p className="text-muted-foreground">
            إدارة قوالب البريد الإلكتروني
          </p>
        </div>
      </div>

      {/* Template Manager */}
      <TemplateManager />
    </div>
  );
}

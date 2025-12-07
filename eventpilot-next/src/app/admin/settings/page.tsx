"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Database, Mail, Shield, Globe, Save } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = api.settings.get.useQuery();
  const updateSettings = api.settings.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: (error) => {
      toast.error("فشل حفظ الإعدادات: " + error.message);
    },
  });

  const [showSocialMediaFields, setShowSocialMediaFields] = useState(true);
  const [showRegistrationPurpose, setShowRegistrationPurpose] = useState(true);
  const [showCateringInterest, setShowCateringInterest] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Initialize from settings when loaded
  useEffect(() => {
    if (settings) {
      setShowSocialMediaFields(settings.showSocialMediaFields ?? true);
      setShowRegistrationPurpose(settings.showRegistrationPurpose ?? true);
      setShowCateringInterest(settings.showCateringInterest ?? true);
    }
  }, [settings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSaveSettings = () => {
    updateSettings.mutate({
      showSocialMediaFields,
      showRegistrationPurpose,
      showCateringInterest,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات النظام والتكوين</p>
      </div>

      {/* Registration Form Field Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات نماذج التسجيل
          </CardTitle>
          <CardDescription>
            التحكم في ظهور الحقول في نموذج التسجيل للحساب (يمكن تخصيصها لكل حدث
            على حدة)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <>
              {/* Social Media Fields */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="showSocialMediaFields"
                    className="text-sm font-medium cursor-pointer"
                  >
                    إظهار حقول وسائل التواصل الاجتماعي
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    حسابات X، LinkedIn، وInstagram في نموذج التسجيل
                  </p>
                </div>
                <Switch
                  id="showSocialMediaFields"
                  checked={showSocialMediaFields}
                  onCheckedChange={setShowSocialMediaFields}
                  disabled={updateSettings.isPending}
                />
              </div>

              {/* Registration Purpose */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="showRegistrationPurpose"
                    className="text-sm font-medium cursor-pointer"
                  >
                    إظهار حقل الهدف من التسجيل
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    السؤال عن هدف المستخدم من التسجيل في الحدث
                  </p>
                </div>
                <Switch
                  id="showRegistrationPurpose"
                  checked={showRegistrationPurpose}
                  onCheckedChange={setShowRegistrationPurpose}
                  disabled={updateSettings.isPending}
                />
              </div>

              {/* Catering Interest */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="showCateringInterest"
                    className="text-sm font-medium cursor-pointer"
                  >
                    إظهار خيار الرغبة في تقديم الضيافة
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    السؤال عن رغبة المستخدم في استضافة أحداث مستقبلية
                  </p>
                </div>
                <Switch
                  id="showCateringInterest"
                  checked={showCateringInterest}
                  onCheckedChange={setShowCateringInterest}
                  disabled={updateSettings.isPending}
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 ml-2" />
                {updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

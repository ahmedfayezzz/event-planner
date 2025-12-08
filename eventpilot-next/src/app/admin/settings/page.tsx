"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Mail, Phone, Globe, Save, MessageCircle } from "lucide-react";
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

  // Contact info
  const [siteName, setSiteName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Social media handles
  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [snapchatHandle, setSnapchatHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  // Initialize from settings when loaded
  useEffect(() => {
    if (settings) {
      setShowSocialMediaFields(settings.showSocialMediaFields ?? true);
      setShowRegistrationPurpose(settings.showRegistrationPurpose ?? true);
      setShowCateringInterest(settings.showCateringInterest ?? true);
      setSiteName(settings.siteName ?? "");
      setContactEmail(settings.contactEmail ?? "");
      setContactPhone(settings.contactPhone ?? "");
      setTwitterHandle(settings.twitterHandle ?? "");
      setInstagramHandle(settings.instagramHandle ?? "");
      setSnapchatHandle(settings.snapchatHandle ?? "");
      setLinkedinUrl(settings.linkedinUrl ?? "");
      setWhatsappNumber(settings.whatsappNumber ?? "");
    }
  }, [settings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSaveSettings = () => {
    updateSettings.mutate({
      showSocialMediaFields,
      showRegistrationPurpose,
      showCateringInterest,
      siteName: siteName || undefined,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      twitterHandle: twitterHandle || null,
      instagramHandle: instagramHandle || null,
      snapchatHandle: snapchatHandle || null,
      linkedinUrl: linkedinUrl || null,
      whatsappNumber: whatsappNumber || null,
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

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            معلومات التواصل
          </CardTitle>
          <CardDescription>
            معلومات الاتصال التي تظهر في الفوتر ورسائل البريد الإلكتروني
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="siteName">اسم الموقع</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="ثلاثاء الأعمال"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني للتواصل
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  dir="ltr"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف للتواصل
                </Label>
                <Input
                  id="contactPhone"
                  dir="ltr"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+966 XX XXX XXXX"
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

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            وسائل التواصل الاجتماعي
          </CardTitle>
          <CardDescription>
            روابط حسابات التواصل الاجتماعي للمنظمة (تظهر في الفوتر)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="twitterHandle" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X (Twitter)
                </Label>
                <Input
                  id="twitterHandle"
                  dir="ltr"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  placeholder="@username"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramHandle" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </Label>
                <Input
                  id="instagramHandle"
                  dir="ltr"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@username"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="snapchatHandle" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                  </svg>
                  Snapchat
                </Label>
                <Input
                  id="snapchatHandle"
                  dir="ltr"
                  value={snapchatHandle}
                  onChange={(e) => setSnapchatHandle(e.target.value)}
                  placeholder="@username"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </Label>
                <Input
                  id="linkedinUrl"
                  dir="ltr"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsappNumber"
                  dir="ltr"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+966XXXXXXXXX"
                  disabled={updateSettings.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  أدخل الرقم مع رمز الدولة (مثال: +966501234567)
                </p>
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

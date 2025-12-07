"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Mail, Shield, Globe } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">
          إعدادات النظام والتكوين
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              معلومات النظام
            </CardTitle>
            <CardDescription>
              معلومات عامة عن النظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإصدار</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">البيئة</span>
              <Badge variant="outline">
                {process.env.NODE_ENV === "production" ? "إنتاج" : "تطوير"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework</span>
              <Badge variant="outline">Next.js 15</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              قاعدة البيانات
            </CardTitle>
            <CardDescription>
              حالة قاعدة البيانات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">النوع</span>
              <Badge variant="outline">SQLite / PostgreSQL</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ORM</span>
              <Badge variant="outline">Prisma 6.x</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة</span>
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                متصل
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              البريد الإلكتروني
            </CardTitle>
            <CardDescription>
              إعدادات خدمة البريد
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المزود</span>
              <Badge variant="outline">Resend</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة</span>
              <Badge
                className={
                  process.env.RESEND_API_KEY
                    ? "bg-green-500/10 text-green-600 border-green-200"
                    : "bg-orange-500/10 text-orange-600 border-orange-200"
                }
              >
                {process.env.RESEND_API_KEY ? "مكوّن" : "غير مكوّن"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              المصادقة
            </CardTitle>
            <CardDescription>
              إعدادات تسجيل الدخول
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المزود</span>
              <Badge variant="outline">NextAuth.js v5</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاستراتيجية</span>
              <Badge variant="outline">JWT</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">مدة الجلسة (Session)</span>
              <Badge variant="outline">30 يوم</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            متغيرات البيئة
          </CardTitle>
          <CardDescription>
            المتغيرات المطلوبة للتشغيل
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm" dir="ltr">
            <pre className="whitespace-pre-wrap">
{`DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_xxx"
FROM_EMAIL="noreply@example.com"
BASE_URL="http://localhost:3000"`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

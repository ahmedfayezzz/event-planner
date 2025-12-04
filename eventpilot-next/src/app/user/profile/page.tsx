"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowRight, Save, User, Mail, Briefcase, Instagram, Twitter } from "lucide-react";

export default function UserProfilePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    // In a real app, we would fetch the full profile data here
    // For now, we'll just use the session data and some placeholders
    const [formData, setFormData] = useState({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        bio: "",
        jobTitle: "",
        company: "",
        instagram: "",
        twitter: "",
    });

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success("تم تحديث الملف الشخصي بنجاح");
        setIsSaving(false);
    };

    if (status === "loading") {
        return <div className="container py-20 text-center">جارٍ التحميل...</div>;
    }

    if (status === "unauthenticated") {
        router.push("/user/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            {/* Header */}
            <div className="bg-primary text-white pt-20 pb-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
                <div className="container relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
                            <Link href="/user/dashboard">
                                <ArrowRight className="ml-2 h-5 w-5" />
                                العودة للوحة التحكم
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold">إعدادات الحساب</h1>
                    <p className="text-white/80 mt-2">قم بتحديث معلوماتك الشخصية والمهنية</p>
                </div>
            </div>

            <div className="container -mt-20 relative z-20">
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Sidebar / Profile Card */}
                    <div className="md:col-span-1">
                        <Card className="border-none shadow-lg overflow-hidden">
                            <div className="h-32 bg-gradient-to-br from-primary to-primary/80"></div>
                            <CardContent className="pt-0 relative">
                                <div className="absolute -top-16 right-1/2 translate-x-1/2">
                                    <div className="h-32 w-32 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-4xl font-bold text-primary">
                                        {session?.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="mt-20 text-center space-y-2">
                                    <h2 className="text-xl font-bold">{session?.user?.name}</h2>
                                    <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
                                    <div className="pt-4 flex justify-center gap-2">
                                        <Button variant="outline" size="sm" className="w-full">
                                            تغيير الصورة
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Form */}
                    <div className="md:col-span-2">
                        <Card className="border-none shadow-lg">
                            <CardHeader>
                                <CardTitle>المعلومات الشخصية</CardTitle>
                                <CardDescription>هذه المعلومات ستظهر في ملفك الشخصي العام</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">الاسم الكامل</Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">البريد الإلكتروني</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                value={formData.email}
                                                disabled
                                                className="pr-10 bg-muted/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">نبذة عنك</Label>
                                    <Textarea
                                        id="bio"
                                        placeholder="اكتب نبذة مختصرة عن خبراتك واهتماماتك..."
                                        className="min-h-[100px]"
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="jobTitle">المسمى الوظيفي</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="jobTitle"
                                                placeholder="مثال: مدير تسويق"
                                                value={formData.jobTitle}
                                                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company">الجهة / الشركة</Label>
                                        <Input
                                            id="company"
                                            placeholder="اسم الشركة أو المشروع"
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="instagram">Instagram</Label>
                                        <div className="relative">
                                            <Instagram className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="instagram"
                                                placeholder="@username"
                                                value={formData.instagram}
                                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="twitter">Twitter (X)</Label>
                                        <div className="relative">
                                            <Twitter className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="twitter"
                                                placeholder="@username"
                                                value={formData.twitter}
                                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                                className="pr-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                                        {isSaving ? "جارٍ الحفظ..." : (
                                            <>
                                                <Save className="ml-2 h-4 w-4" />
                                                حفظ التغييرات
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

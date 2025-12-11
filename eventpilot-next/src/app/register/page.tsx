"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HOSTING_TYPES } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch global settings for field visibility
  const { data: settings } = api.settings.get.useQuery();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    instagram: "",
    snapchat: "",
    twitter: "",
    companyName: "",
    position: "",
    activityType: "",
    gender: "" as "male" | "female" | "",
    goal: "",
    wantsToHost: false,
    hostingTypes: [] as string[],
  });

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول");
      router.push("/user/login");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الحساب");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      await registerMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        instagram: formData.instagram || undefined,
        snapchat: formData.snapchat || undefined,
        twitter: formData.twitter || undefined,
        companyName: formData.companyName,
        position: formData.position,
        activityType: formData.activityType || undefined,
        gender: formData.gender || undefined,
        goal: formData.goal || undefined,
        wantsToHost: formData.wantsToHost,
        hostingTypes: formData.hostingTypes,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.08]"></div>
      {/* Decorative glass orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
      <div className="w-full max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
            الانضمام كعضو
          </h2>
          <p className="mt-2 text-xs md:text-sm text-muted-foreground">
            انضم إلى مجتمع ثلوثية الأعمال
          </p>
        </div>

        <Card className="bg-gradient-to-br from-white to-primary/3 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-xl md:rounded-2xl">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
              {/* Basic Info */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base">
                  <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                  المعلومات الأساسية
                </h3>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="name" className="text-sm">
                      الاسم الكامل *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="email" className="text-sm">
                      البريد الإلكتروني *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      dir="ltr"
                      className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="phone" className="text-sm">
                      رقم الهاتف *
                    </Label>
                    <PhoneInput
                      id="phone"
                      international
                      defaultCountry="SA"
                      value={formData.phone}
                      onChange={(value) =>
                        setFormData({ ...formData, phone: value || "" })
                      }
                      disabled={isLoading}
                      className="phone-input-container bg-white/60 backdrop-blur-sm border border-primary/10 focus-within:border-primary/50 focus-within:bg-white/80 h-10 md:h-11 transition-all shadow-none rounded-md px-3"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="gender" className="text-sm">
                      الجنس
                    </Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          gender: value as "male" | "female",
                        })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base">
                  <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                  كلمة المرور
                </h3>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="password" className="text-sm">
                      كلمة المرور *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        disabled={isLoading}
                        dir="ltr"
                        autoComplete="off"
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">
                      تأكيد كلمة المرور *
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        disabled={isLoading}
                        dir="ltr"
                        autoComplete="off"
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base">
                  <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                  المعلومات المهنية
                </h3>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="companyName" className="text-sm">
                      اسم الشركة *
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      required
                      disabled={isLoading}
                      className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="position" className="text-sm">
                      المنصب *
                    </Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      required
                      disabled={isLoading}
                      className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <Label htmlFor="activityType" className="text-sm">
                      نوع النشاط
                    </Label>
                    <Input
                      id="activityType"
                      value={formData.activityType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          activityType: e.target.value,
                        })
                      }
                      disabled={isLoading}
                      className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media */}
              {settings?.showSocialMediaFields && (
                <div className="space-y-3 md:space-y-4">
                  <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                    وسائل التواصل (اختياري)
                  </h3>
                  <div className="grid gap-3 md:gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="instagram" className="text-sm">
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        placeholder="instagram.com/..."
                        value={formData.instagram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instagram: e.target.value,
                          })
                        }
                        disabled={isLoading}
                        dir="ltr"
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="snapchat" className="text-sm">
                        Snapchat
                      </Label>
                      <Input
                        id="snapchat"
                        placeholder="snapchat.com/add/..."
                        value={formData.snapchat}
                        onChange={(e) =>
                          setFormData({ ...formData, snapchat: e.target.value })
                        }
                        disabled={isLoading}
                        dir="ltr"
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2 sm:col-span-2 md:col-span-1">
                      <Label htmlFor="twitter" className="text-sm">
                        Twitter / X
                      </Label>
                      <Input
                        id="twitter"
                        placeholder="x.com/..."
                        value={formData.twitter}
                        onChange={(e) =>
                          setFormData({ ...formData, twitter: e.target.value })
                        }
                        disabled={isLoading}
                        dir="ltr"
                        className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Goal */}
              {settings?.showRegistrationPurpose && (
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="goal" className="text-sm">
                    هدفك من الحضور (اختياري)
                  </Label>
                  <Textarea
                    id="goal"
                    placeholder="ما الذي تتمنى تحقيقه من خلال حضورك لأحداث ثلوثية الأعمال؟"
                    value={formData.goal}
                    onChange={(e) =>
                      setFormData({ ...formData, goal: e.target.value })
                    }
                    disabled={isLoading}
                    rows={3}
                    className="bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 text-sm md:text-base transition-all shadow-none"
                  />
                </div>
              )}

              {/* Hosting Section */}
              {settings?.showCateringInterest && (
                <div className="space-y-3 md:space-y-4">
                  <h3 className="font-semibold text-primary border-b border-primary/10 pb-2 flex items-center gap-2 text-sm md:text-base">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-accent rounded-full inline-block"></span>
                    الرعاية
                  </h3>
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox
                      id="wantsToHost"
                      checked={formData.wantsToHost}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          wantsToHost: checked === true,
                          hostingTypes: checked ? formData.hostingTypes : [],
                        })
                      }
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="wantsToHost"
                        className="cursor-pointer text-sm font-medium"
                      >
                        هل ترغب في رعاية الضيافة في احداثنا القادمة؟
                      </Label>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        سوف يتم التواصل معكم لتحديد الاحتياج
                      </p>
                    </div>
                  </div>

                  {formData.wantsToHost && (
                    <div className="pe-7 space-y-2">
                      <Label className="text-sm">نوع الضيافة</Label>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                        {HOSTING_TYPES.map((type) => (
                          <div
                            key={type.value}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`hosting-${type.value}`}
                              checked={formData.hostingTypes.includes(
                                type.value
                              )}
                              onCheckedChange={(checked) => {
                                const types = checked
                                  ? [...formData.hostingTypes, type.value]
                                  : formData.hostingTypes.filter(
                                      (t) => t !== type.value
                                    );
                                setFormData({
                                  ...formData,
                                  hostingTypes: types,
                                });
                              }}
                              disabled={isLoading}
                            />
                            <Label
                              htmlFor={`hosting-${type.value}`}
                              className="cursor-pointer text-sm"
                            >
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 md:gap-4 pt-4 md:pt-6 px-4 md:px-6 pb-5 md:pb-6">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:shadow-xl h-11 md:h-12 text-base md:text-lg"
                disabled={isLoading}
              >
                {isLoading ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
              </Button>
              <div className="text-center text-xs md:text-sm text-foreground/70">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/user/login"
                  className="font-semibold text-primary hover:text-primary/80 hover:underline"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

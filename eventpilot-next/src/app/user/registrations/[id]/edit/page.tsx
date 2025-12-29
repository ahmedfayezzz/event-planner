"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { formatArabicDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, X, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Validation schema for companion
const companionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(9, "رقم الهاتف مطلوب"),
  company: z.string().min(1, "اسم الشركة مطلوب"),
  title: z.string().min(1, "المنصب مطلوب"),
  email: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
});

// Shared input styling
const inputClassName =
  "bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none";
const inputErrorClassName =
  "bg-white/60 backdrop-blur-sm border border-destructive focus:border-destructive focus:bg-white/80 h-10 md:h-11 transition-all shadow-none";

const formSchema = z.object({
  companions: z.array(companionSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function EditRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: registrationId } = use(params);
  const router = useRouter();
  const { status: authStatus } = useSession();

  // Form setup with react-hook-form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companions: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "companions",
  });

  const {
    formState: { errors, isSubmitting },
  } = form;

  // Fetch registration data
  const { data: registration, isLoading } =
    api.registration.getConfirmation.useQuery({
      registrationId,
    });

  const updateMutation = api.registration.updateRegistration.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث التسجيل بنجاح!");
      router.push("/user/registrations");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء التحديث");
    },
  });

  // Load companions when registration data is available
  useEffect(() => {
    if (registration?.companions) {
      form.reset({
        companions: registration.companions.map((c) => ({
          id: c.id,
          name: c.name || "",
          company: c.company || "",
          title: c.title || "",
          phone: c.phone || "",
          email: c.email || "",
        })),
      });
    }
  }, [registration, form]);

  // Redirect if not authenticated
  if (authStatus === "unauthenticated") {
    router.push(
      `/user/login?callbackUrl=/user/registrations/${registrationId}/edit`
    );
    return null;
  }

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">جاري التحميل...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          التسجيل غير موجود
        </h1>
        <Button asChild size="lg">
          <Link href="/user/registrations">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتسجيلاتي
          </Link>
        </Button>
      </div>
    );
  }

  if (!registration.hasAccount) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          غير مسموح بالتعديل
        </h1>
        <p className="text-muted-foreground mb-4">
          التسجيلات الخاصة بالزوار لا يمكن تعديلها
        </p>
        <Button asChild size="lg">
          <Link href="/user/registrations">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتسجيلاتي
          </Link>
        </Button>
      </div>
    );
  }

  const addCompanion = () => {
    if (fields.length >= (registration.session?.maxCompanions || 5)) {
      toast.error("لقد وصلت للحد الأقصى من المرافقين");
      return;
    }
    append({ name: "", company: "", title: "", phone: "", email: "" });
  };

  const handleSubmit = async (data: FormData) => {
    const validCompanions = data.companions.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      company: c.company || undefined,
      title: c.title || undefined,
      email: c.email || undefined,
    }));

    await updateMutation.mutateAsync({
      registrationId,
      companions: validCompanions,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-accent/5 py-8 md:py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/user/registrations"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة لتسجيلاتي
          </Link>
          <h1 className="text-3xl font-bold text-primary mb-2">
            تعديل التسجيل
          </h1>
          <p className="text-muted-foreground">{registration.session.title}</p>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-6">
            {/* Registration Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات التسجيل</CardTitle>
                <CardDescription>
                  تم التسجيل في{" "}
                  {formatArabicDate(new Date(registration.registeredAt))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    حالة التسجيل
                  </span>
                  <Badge
                    variant={registration.isApproved ? "default" : "secondary"}
                  >
                    {registration.isApproved
                      ? "✓ مؤكد"
                      : "⏳ في انتظار الموافقة"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Companions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      المرافقون
                    </CardTitle>
                    <CardDescription>
                      يمكنك تعديل معلومات المرافقين أو إضافة/حذف مرافقين
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{fields.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 md:p-5 border border-primary/10 rounded-xl bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary text-sm md:text-base flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-accent rounded-full inline-block"></span>
                        المرافق {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label
                          htmlFor={`companion-${index}-name`}
                          className="text-sm"
                        >
                          الاسم <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`companion-${index}-name`}
                          {...form.register(`companions.${index}.name`)}
                          placeholder="الاسم الكامل"
                          className={
                            errors.companions?.[index]?.name
                              ? inputErrorClassName
                              : inputClassName
                          }
                        />
                        {errors.companions?.[index]?.name && (
                          <p className="text-sm text-destructive">
                            {errors.companions[index].name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 md:space-y-2">
                        <Label
                          htmlFor={`companion-${index}-phone`}
                          className="text-sm"
                        >
                          رقم الهاتف <span className="text-destructive">*</span>
                        </Label>
                        <PhoneInput
                          id={`companion-${index}-phone`}
                          international
                          defaultCountry="SA"
                          value={form.watch(`companions.${index}.phone`)}
                          onChange={(value) => {
                            form.setValue(
                              `companions.${index}.phone`,
                              value || "",
                              {
                                shouldValidate: true,
                              }
                            );
                          }}
                          className={`phone-input-container bg-white/60 backdrop-blur-sm border focus-within:border-primary/50 focus-within:bg-white/80 h-10 md:h-11 transition-all shadow-none rounded-md px-3 ${
                            errors.companions?.[index]?.phone
                              ? "border-destructive"
                              : "border-primary/10"
                          }`}
                        />
                        {errors.companions?.[index]?.phone && (
                          <p className="text-sm text-destructive">
                            {errors.companions[index].phone.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 md:space-y-2">
                        <Label
                          htmlFor={`companion-${index}-company`}
                          className="text-sm"
                        >
                          الشركة <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`companion-${index}-company`}
                          {...form.register(`companions.${index}.company`)}
                          placeholder="اسم الشركة"
                          className={
                            errors.companions?.[index]?.company
                              ? inputErrorClassName
                              : inputClassName
                          }
                        />
                        {errors.companions?.[index]?.company && (
                          <p className="text-sm text-destructive">
                            {errors.companions[index].company.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 md:space-y-2">
                        <Label
                          htmlFor={`companion-${index}-title`}
                          className="text-sm"
                        >
                          المنصب <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`companion-${index}-title`}
                          {...form.register(`companions.${index}.title`)}
                          placeholder="المنصب الوظيفي"
                          className={
                            errors.companions?.[index]?.title
                              ? inputErrorClassName
                              : inputClassName
                          }
                        />
                        {errors.companions?.[index]?.title && (
                          <p className="text-sm text-destructive">
                            {errors.companions[index].title.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                        <Label
                          htmlFor={`companion-${index}-email`}
                          className="text-sm"
                        >
                          البريد الإلكتروني
                        </Label>
                        <Input
                          id={`companion-${index}-email`}
                          type="email"
                          {...form.register(`companions.${index}.email`)}
                          placeholder="example@email.com"
                          dir="ltr"
                          className={
                            errors.companions?.[index]?.email
                              ? inputErrorClassName
                              : inputClassName
                          }
                        />
                        {errors.companions?.[index]?.email && (
                          <p className="text-sm text-destructive">
                            {errors.companions[index].email.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {fields.length < (registration.session?.maxCompanions || 5) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCompanion}
                    className="w-full h-11 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <UserPlus className="w-4 h-4 ml-2" />
                    إضافة مرافق
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/user/registrations")}
                disabled={isSubmitting || updateMutation.isPending}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                className="flex-1"
              >
                {isSubmitting || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  "حفظ التعديلات"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

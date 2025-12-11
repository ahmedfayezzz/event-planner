"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { FormSectionHeader } from "./form-section-header";

export interface Companion {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
}

interface CompanionSectionProps {
  companions: Companion[];
  maxCompanions: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof Companion, value: string) => void;
  className?: string;
  usePhoneInput?: boolean;
}

const inputClassName =
  "bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 h-10 md:h-11 transition-all shadow-none";

export function CompanionSection({
  companions,
  maxCompanions,
  onAdd,
  onRemove,
  onChange,
  className,
  usePhoneInput = false,
}: CompanionSectionProps) {
  if (maxCompanions <= 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <FormSectionHeader title="المرافقون" />
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/20"
        >
          {companions.length} / {maxCompanions}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        يمكنك إضافة حتى {maxCompanions} مرافقين (اختياري)
      </p>

      {companions.map((companion, index) => (
        <div
          key={index}
          className="p-4 md:p-5 border border-primary/10 rounded-xl bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary text-sm md:text-base flex items-center gap-2">
              <span className="w-1.5 h-4 bg-accent rounded-full inline-block"></span>
              مرافق {index + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor={`companion-${index}-name`} className="text-sm">
                الاسم *
              </Label>
              <Input
                id={`companion-${index}-name`}
                value={companion.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder="الاسم الكامل"
                required
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor={`companion-${index}-phone`} className="text-sm">
                رقم الهاتف *
              </Label>
              {usePhoneInput ? (
                <PhoneInput
                  id={`companion-${index}-phone`}
                  international
                  defaultCountry="SA"
                  value={companion.phone}
                  onChange={(value) => onChange(index, "phone", value || "")}
                  className="phone-input-container"
                />
              ) : (
                <Input
                  id={`companion-${index}-phone`}
                  type="tel"
                  value={companion.phone}
                  onChange={(e) => onChange(index, "phone", e.target.value)}
                  placeholder="05XXXXXXXX"
                  required
                  className={inputClassName}
                  dir="ltr"
                />
              )}
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor={`companion-${index}-company`} className="text-sm">
                الشركة
              </Label>
              <Input
                id={`companion-${index}-company`}
                value={companion.company}
                onChange={(e) => onChange(index, "company", e.target.value)}
                placeholder="اسم الشركة"
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor={`companion-${index}-title`} className="text-sm">
                المنصب
              </Label>
              <Input
                id={`companion-${index}-title`}
                value={companion.title}
                onChange={(e) => onChange(index, "title", e.target.value)}
                placeholder="المنصب الوظيفي"
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5 md:space-y-2 md:col-span-2">
              <Label htmlFor={`companion-${index}-email`} className="text-sm">
                البريد الإلكتروني
              </Label>
              <Input
                id={`companion-${index}-email`}
                type="email"
                value={companion.email}
                onChange={(e) => onChange(index, "email", e.target.value)}
                placeholder="example@email.com"
                className={inputClassName}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      ))}

      {companions.length < maxCompanions && (
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          className="w-full h-11 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <UserPlus className="w-4 h-4 ml-2" />
          إضافة مرافق
        </Button>
      )}
    </div>
  );
}

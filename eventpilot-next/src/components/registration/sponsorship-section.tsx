"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPONSORSHIP_TYPES, SPONSOR_TYPES } from "@/lib/constants";

export interface SponsorshipData {
  wantsToSponsor: boolean;
  sponsorshipTypes: string[];
  sponsorshipOtherText: string;
  sponsorType: "person" | "company" | "";
  /** Company name - only used when sponsorType is "company" */
  sponsorCompanyName: string;
}

interface SponsorshipSectionProps {
  data: SponsorshipData;
  onChange: (data: SponsorshipData) => void;
  disabled?: boolean;
  /** Custom styling variant */
  variant?: "default" | "card";
}

export function SponsorshipSection({
  data,
  onChange,
  disabled = false,
  variant = "default",
}: SponsorshipSectionProps) {
  const handleWantsToSponsorChange = (checked: boolean) => {
    onChange({
      ...data,
      wantsToSponsor: checked,
      sponsorshipTypes: checked ? data.sponsorshipTypes : [],
      sponsorshipOtherText: checked ? data.sponsorshipOtherText : "",
      sponsorType: checked ? data.sponsorType : "",
      sponsorCompanyName: checked ? data.sponsorCompanyName : "",
    });
  };

  const handleSponsorTypeChange = (value: "person" | "company") => {
    onChange({
      ...data,
      sponsorType: value,
      // Clear company name if switching to person
      sponsorCompanyName: value === "person" ? "" : data.sponsorCompanyName,
    });
  };

  const handleCompanyNameChange = (name: string) => {
    onChange({ ...data, sponsorCompanyName: name });
  };

  const handleSponsorshipTypeToggle = (typeValue: string, checked: boolean) => {
    const types = checked
      ? [...data.sponsorshipTypes, typeValue]
      : data.sponsorshipTypes.filter((t) => t !== typeValue);
    onChange({ ...data, sponsorshipTypes: types });
  };

  const handleOtherTextChange = (text: string) => {
    onChange({ ...data, sponsorshipOtherText: text });
  };

  const inputClassName =
    variant === "card"
      ? "bg-white/60 backdrop-blur-sm border border-primary/10 focus:border-primary/50 focus:bg-white/80 transition-all shadow-none"
      : "";

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-3 space-x-reverse">
        <Checkbox
          id="wantsToSponsor"
          checked={data.wantsToSponsor}
          onCheckedChange={(checked) =>
            handleWantsToSponsorChange(checked === true)
          }
          disabled={disabled}
          className="mt-1"
        />
        <div className="space-y-1">
          <Label
            htmlFor="wantsToSponsor"
            className="cursor-pointer text-sm font-medium"
          >
            هل ترغب في رعاية أحداثنا القادمة؟
          </Label>
          <p className="text-xs md:text-sm text-muted-foreground">
            سوف يتم التواصل معكم لتحديد الاحتياج
          </p>
        </div>
      </div>

      {data.wantsToSponsor && (
        <div className="pe-7 space-y-4 animate-in fade-in-0">
          <div className="space-y-2">
            <Label className="text-sm">نوع الراعي</Label>
            <Select
              value={data.sponsorType}
              onValueChange={handleSponsorTypeChange}
              disabled={disabled}
            >
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder="اختر نوع الراعي" />
              </SelectTrigger>
              <SelectContent>
                {SPONSOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.sponsorType === "company" && (
            <div className="space-y-2">
              <Label htmlFor="sponsorCompanyName" className="text-sm">
                اسم الشركة / المؤسسة
              </Label>
              <Input
                id="sponsorCompanyName"
                value={data.sponsorCompanyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="أدخل اسم الشركة أو المؤسسة"
                disabled={disabled}
                className={inputClassName}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">نوع الرعاية</Label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {SPONSORSHIP_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`sponsorship-${type.value}`}
                    checked={data.sponsorshipTypes.includes(type.value)}
                    onCheckedChange={(checked) =>
                      handleSponsorshipTypeToggle(type.value, checked === true)
                    }
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`sponsorship-${type.value}`}
                    className="cursor-pointer text-sm"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {data.sponsorshipTypes.includes("other") && (
            <div className="space-y-2">
              <Label htmlFor="sponsorshipOtherText">
                حدد نوع الرعاية الأخرى
              </Label>
              <Textarea
                id="sponsorshipOtherText"
                value={data.sponsorshipOtherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                placeholder="اكتب تفاصيل نوع الرعاية..."
                rows={2}
                disabled={disabled}
                className={inputClassName}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Shared types for bulk email components

export interface SelectedUser {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  position?: string;
}

export interface CampaignFilters {
  // General filters
  search?: string;
  roleFilter: "all" | "USER" | "GUEST";
  labelIds?: string[];
  isActive?: boolean;

  // Session-based filters
  sessionId?: string;
  registrationStatus?: "all" | "registered" | "not_registered";
  approvalStatus?: "all" | "approved" | "pending";
  attendanceStatus?: "all" | "attended" | "not_attended";
}

export interface CampaignDraft {
  name?: string;
  subject: string;
  content: string;
  attachments: Attachment[];
  selectedUsers: SelectedUser[];
  filters: CampaignFilters;
}

export interface Attachment {
  filename: string;
  content: string; // base64 encoded
  type?: string; // MIME type (e.g., "image/png", "application/pdf")
}

export interface WizardStep {
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { title: "اختيار المستلمين", description: "حدد من سيستلم الرسالة" },
  { title: "كتابة الرسالة", description: "صمم محتوى البريد" },
  { title: "مراجعة وإرسال", description: "تأكد من البيانات وأرسل" },
];

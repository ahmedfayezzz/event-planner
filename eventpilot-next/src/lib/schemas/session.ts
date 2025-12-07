import { z } from "zod";

export const sessionFormSchema = z.object({
  sessionNumber: z.string().optional(),
  title: z.string().min(1, "عنوان الجلسة مطلوب"),
  description: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().min(1, "الوقت مطلوب"),
  location: z.string().optional(),
  guestName: z.string().optional(),
  guestProfile: z.string().optional(),
  maxParticipants: z.string().refine(
    (v) => !v || parseInt(v) > 0,
    "يجب أن يكون رقم صحيح موجب"
  ),
  maxCompanions: z.string().refine(
    (v) => !v || parseInt(v) >= 0,
    "يجب أن يكون رقم صحيح"
  ),
  status: z.enum(["open", "closed", "completed"]),
  requiresApproval: z.boolean(),
  showParticipantCount: z.boolean(),
  showCountdown: z.boolean(),
  showGuestProfile: z.boolean(),
  inviteOnly: z.boolean(),
  inviteMessage: z.string().optional(),
  sendQrInEmail: z.boolean(),
  slug: z.string().optional(),
  registrationDeadline: z.string().optional(),
  customConfirmationMessage: z.string().optional(),
});

export type SessionFormData = z.infer<typeof sessionFormSchema>;

export const defaultSessionFormData: SessionFormData = {
  sessionNumber: "",
  title: "",
  description: "",
  date: "",
  time: "18:00",
  location: "",
  guestName: "",
  guestProfile: "",
  maxParticipants: "50",
  maxCompanions: "5",
  status: "open",
  requiresApproval: false,
  showParticipantCount: true,
  showCountdown: true,
  showGuestProfile: true,
  inviteOnly: false,
  inviteMessage: "",
  sendQrInEmail: true,
  slug: "",
  registrationDeadline: "",
  customConfirmationMessage: "",
};

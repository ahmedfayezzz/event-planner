import { z } from "zod";

export const sessionFormSchema = z.object({
  sessionNumber: z.string().optional(),
  title: z.string().min(1, "عنوان الحدث مطلوب"),
  description: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().min(1, "الوقت مطلوب"),
  location: z.string().optional(),
  guestIds: z.array(z.string()).optional(),
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
  showSocialMediaFields: z.boolean(),
  showRegistrationPurpose: z.boolean(),
  showCateringInterest: z.boolean(),
  slug: z.string().optional(),
  registrationDeadline: z.string().optional(),
  customConfirmationMessage: z.string().optional(),
  locationUrl: z.string().optional(),
  // Valet service
  valetEnabled: z.boolean(),
  valetLotCapacity: z.string().refine(
    (v) => !v || parseInt(v) >= 0,
    "يجب أن يكون رقم صحيح"
  ),
  valetRetrievalNotice: z.string().refine(
    (v) => !v || parseInt(v) >= 1,
    "يجب أن يكون رقم صحيح موجب"
  ),
});

export type SessionFormData = z.infer<typeof sessionFormSchema>;

export const defaultSessionFormData: SessionFormData = {
  sessionNumber: "",
  title: "",
  description: "",
  date: "",
  time: "18:00",
  location: "",
  guestIds: [],
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
  showSocialMediaFields: true,
  showRegistrationPurpose: true,
  showCateringInterest: true,
  slug: "",
  registrationDeadline: "",
  customConfirmationMessage: "",
  locationUrl: "",
  // Valet service
  valetEnabled: false,
  valetLotCapacity: "0",
  valetRetrievalNotice: "5",
};

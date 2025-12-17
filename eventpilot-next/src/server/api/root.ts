import { createCallerFactory, createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { sessionRouter } from "./routers/session";
import { registrationRouter } from "./routers/registration";
import { companionRouter } from "./routers/companion";
import { attendanceRouter } from "./routers/attendance";
import { invitationRouter } from "./routers/invitation";
import { adminRouter } from "./routers/admin";
import { cateringRouter } from "./routers/catering";
import { sponsorRouter } from "./routers/sponsor";
import { settingsRouter } from "./routers/settings";
import { labelRouter } from "./routers/label";
import { noteRouter } from "./routers/note";
import { uploadRouter } from "./routers/upload";
import { manualRegistrationRouter } from "./routers/manual-registration";
import { emailRouter } from "./routers/email";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  session: sessionRouter,
  registration: registrationRouter,
  companion: companionRouter,
  attendance: attendanceRouter,
  invitation: invitationRouter,
  admin: adminRouter,
  catering: cateringRouter,
  sponsor: sponsorRouter,
  settings: settingsRouter,
  label: labelRouter,
  note: noteRouter,
  upload: uploadRouter,
  manualRegistration: manualRegistrationRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

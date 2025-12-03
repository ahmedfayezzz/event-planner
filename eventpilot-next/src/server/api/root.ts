import { createCallerFactory, createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { sessionRouter } from "./routers/session";
import { registrationRouter } from "./routers/registration";
import { companionRouter } from "./routers/companion";
import { attendanceRouter } from "./routers/attendance";
import { invitationRouter } from "./routers/invitation";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  session: sessionRouter,
  registration: registrationRouter,
  companion: companionRouter,
  attendance: attendanceRouter,
  invitation: invitationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

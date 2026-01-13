import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "../auth";
import { db } from "../db";
import {
  extractValetToken,
  verifyValetToken,
  type ValetTokenPayload,
} from "@/lib/valet-auth";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Admin procedure - requires admin role (ADMIN or SUPER_ADMIN)
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const role = ctx.session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Super Admin procedure - requires SUPER_ADMIN role only
export const superAdminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Valet employee procedure - requires valid valet JWT token
export const valetProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = extractValetToken(ctx.headers);

  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Valet authentication required",
    });
  }

  const valetEmployee = await verifyValetToken(token);

  if (!valetEmployee) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired valet token",
    });
  }

  // Verify employee still exists and is active
  const employee = await ctx.db.valetEmployee.findUnique({
    where: { id: valetEmployee.employeeId },
  });

  if (!employee || !employee.isActive) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Valet employee not found or inactive",
    });
  }

  return next({
    ctx: {
      valetEmployee: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
      } as ValetTokenPayload & { id: string },
    },
  });
});

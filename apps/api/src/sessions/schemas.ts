import { z } from "zod";

export const activityTypes = [
  "volleyball",
  "basketball",
  "soccer",
  "running",
  "other",
] as const;

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    activityType: z.enum(activityTypes),
    description: z.string().trim().max(500).optional(),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(15).max(720).default(120),
    broadcastRadiusM: z.number().int().min(50).max(1000).default(150),
    checkinRadiusM: z.number().int().min(10).max(200).default(40),
    shutoffRadiusM: z.number().int().min(100).max(5000).default(300),
    groupId: z.string().uuid().optional(),
    anchor: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
  })
  .superRefine((session, ctx) => {
    if (session.checkinRadiusM > session.broadcastRadiusM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-in radius cannot exceed broadcast radius",
        path: ["checkinRadiusM"],
      });
    }
    if (session.broadcastRadiusM > session.shutoffRadiusM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shutoff radius must be at least the broadcast radius",
        path: ["shutoffRadiusM"],
      });
    }
  });

export const nearbySessionsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusM: z.coerce.number().int().min(100).max(50000).default(5000),
});
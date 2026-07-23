import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const nameSchema = z.string().trim().min(1, "Name is required").max(120);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const adminCreateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  roleIds: z.array(z.string()).default([]),
});

export const adminUpdateUserSchema = z.object({
  userId: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  roleIds: z.array(z.string()).default([]),
});

// --- Floor-plan locator ----------------------------------------------------

const fraction = z.coerce.number().min(0).max(1);

export const floorPlanUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(200),
  building: z.string().trim().max(120).optional().or(z.literal("")),
  floor: z.string().trim().max(120).optional().or(z.literal("")),
});

export const roomCreateSchema = z.object({
  floorPlanId: z.string().min(1),
  number: z.string().trim().min(1, "Room number is required").max(60),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  department: z.string().trim().max(200).optional().or(z.literal("")),
  x: fraction,
  y: fraction,
});

export const roomUpdateSchema = z.object({
  roomId: z.string().min(1),
  number: z.string().trim().min(1, "Room number is required").max(60),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  department: z.string().trim().max(200).optional().or(z.literal("")),
});

export const roomMoveSchema = z.object({
  roomId: z.string().min(1),
  x: fraction,
  y: fraction,
});

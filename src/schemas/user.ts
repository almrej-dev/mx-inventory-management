import { z } from "zod/v4";

export const userSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "staff", "viewer"]),
});

export type UserFormData = z.infer<typeof userSchema>;

export const editUserSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "staff", "viewer"]),
  password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")).optional(),
});

export type EditUserFormData = z.infer<typeof editUserSchema>;

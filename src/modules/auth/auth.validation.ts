import z from "zod";

export const customerRegistrationZodSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character"),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  defaultAddress: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  alternatePhone: z.string().optional(),
});

export const loginZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenZodSchema = z.object({
  refreshToken: z.string().optional(),
});

export const googleLoginZodSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const forgotPasswordZodSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character"),
});

export const authValidation = {
  customerRegistrationZodSchema,
  loginZodSchema,
  refreshTokenZodSchema,
  googleLoginZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
};

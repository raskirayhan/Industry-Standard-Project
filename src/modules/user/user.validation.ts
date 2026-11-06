import z from "zod";

export const updateUserZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
});

export const userValidation = {
  updateUserZodSchema,
};

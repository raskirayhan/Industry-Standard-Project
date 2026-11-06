import z from "zod";

export const createHubZodSchema = z.object({
  name: z.string().min(2, "Hub name must be at least 2 characters"),
  code: z.string().optional(),
  address: z.string().min(3, "Address is required"),
  zone: z.string().min(2, "Zone is required"),
  contactNo: z.string().min(6, "Contact number is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateHubZodSchema = z.object({
  name: z.string().min(2, "Hub name must be at least 2 characters").optional(),
  address: z.string().min(3, "Address is required").optional(),
  zone: z.string().min(2, "Zone is required").optional(),
  contactNo: z.string().min(6, "Contact number is required").optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const hubValidation = {
  createHubZodSchema,
  updateHubZodSchema,
};

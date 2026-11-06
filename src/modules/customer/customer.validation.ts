import z from "zod";

export const updateCustomerZodSchema = z.object({
  defaultAddress: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  alternatePhone: z.string().optional(),
});

export const customerValidation = {
  updateCustomerZodSchema,
};

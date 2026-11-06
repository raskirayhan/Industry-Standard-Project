import z from "zod";

export const initiatePaymentZodSchema = z.object({
  shipmentId: z.string().uuid("Invalid Shipment ID format"),
});

export const paymentValidation = {
  initiatePaymentZodSchema,
};

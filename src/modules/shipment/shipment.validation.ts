import z from "zod";
import { ShipmentStatus } from "@prisma/client";

export const calculatePriceZodSchema = z.object({
  originHubId: z.string().uuid("Invalid Origin Hub ID"),
  destinationHubId: z.string().uuid("Invalid Destination Hub ID"),
  weightKg: z.number().positive("Weight must be greater than 0"),
  lengthCm: z.number().positive("Length must be greater than 0"),
  widthCm: z.number().positive("Width must be greater than 0"),
  heightCm: z.number().positive("Height must be greater than 0"),
  isFragile: z.boolean().optional(),
});

export const createShipmentZodSchema = z.object({
  originHubId: z.string().uuid("Invalid Origin Hub ID"),
  destinationHubId: z.string().uuid("Invalid Destination Hub ID"),
  senderName: z.string().min(2, "Sender name is required"),
  senderPhone: z.string().min(6, "Sender phone is required"),
  senderAddress: z.string().min(3, "Sender address is required"),
  receiverName: z.string().min(2, "Receiver name is required"),
  receiverPhone: z.string().min(6, "Receiver phone is required"),
  receiverAddress: z.string().min(3, "Receiver address is required"),
  weightKg: z.number().positive("Weight must be greater than 0"),
  lengthCm: z.number().positive("Length must be greater than 0"),
  widthCm: z.number().positive("Width must be greater than 0"),
  heightCm: z.number().positive("Height must be greater than 0"),
  isFragile: z.boolean().optional(),
  deliveryNotes: z.string().optional(),
});

export const updateShipmentZodSchema = z.object({
  senderName: z.string().optional(),
  senderPhone: z.string().optional(),
  senderAddress: z.string().optional(),
  receiverName: z.string().optional(),
  receiverPhone: z.string().optional(),
  receiverAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
});

export const assignCourierZodSchema = z.object({
  courierId: z.string().uuid("Invalid Courier User ID"),
});

export const updateShipmentStatusZodSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  deliveryOtp: z.string().optional(),
  remarks: z.string().optional(),
  podSignatureUrl: z.string().optional(),
  podImageUrl: z.string().optional(),
});

export const shipmentValidation = {
  calculatePriceZodSchema,
  createShipmentZodSchema,
  updateShipmentZodSchema,
  assignCourierZodSchema,
  updateShipmentStatusZodSchema,
};

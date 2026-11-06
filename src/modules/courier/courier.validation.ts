import z from "zod";
import { VehicleType } from "@prisma/client";

export const courierProfileZodSchema = z.object({
  hubId: z.string().uuid("Invalid Hub ID"),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  vehicleNumber: z.string().min(2, "Vehicle number is required"),
  drivingLicense: z.string().optional(),
  currentZone: z.string().min(2, "Current zone is required"),
  maxCapacityKg: z.number().positive().optional(),
});

export const courierValidation = {
  courierProfileZodSchema,
};

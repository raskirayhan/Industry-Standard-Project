import { IPricingCalculationInput } from "./shipment.interface";
import crypto from 'crypto';

export const computeShipmentCost = (input: IPricingCalculationInput) => {
  const { weightKg, lengthCm, widthCm, heightCm, isSameZone, isFragile } = input;

  if (weightKg <= 0 || lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    throw new Error('Weight And Size Of The Product Must Be Greater Than Zero');
  }

 
  const volumetricWeight = (lengthCm * widthCm * heightCm) / 5000;
  const chargeableWeight = Math.max(weightKg, volumetricWeight);

  
  const baseFare = isSameZone ? 60.0 : 120.0;     
  
  const perKgRate = isSameZone ? 30.0 : 45.0;    

 
  const extraWeight = Math.max(0, chargeableWeight - 1.0);
  const extraWeightFare = Math.ceil(extraWeight) * perKgRate;

  
  const surcharge = isFragile ? 50.0 : 0.0;

  const totalCost = baseFare + extraWeightFare + surcharge;

  return {
    actualWeightKg: parseFloat(weightKg.toFixed(2)),
    volumetricWeightKg: parseFloat(volumetricWeight.toFixed(2)),
    chargeableWeightKg: parseFloat(chargeableWeight.toFixed(2)),
    baseFare,
    extraWeightFare,
    surcharge,
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
};


export const generateTrackingNumber = (): string => {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-${year}-${randomHex}`;
};
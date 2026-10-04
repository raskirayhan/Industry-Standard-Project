export interface ICreateCourierProfilePayload {
  hubId: string;
  vehicleType: 'BICYCLE' | 'MOTORBIKE' | 'VAN' | 'TRUCK';
  vehicleNumber: string;
  drivingLicense?: string;
  currentZone: string;
  maxCapacityKg?: number;
}
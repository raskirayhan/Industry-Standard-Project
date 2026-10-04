export interface ICalculatePricePayload {
  originHubId: string;
  destinationHubId: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isFragile?: boolean;
}


export interface ICreateShipmentPayload {
  originHubId: string;
  destinationHubId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isFragile?: boolean;
  deliveryNotes?: string;
}


export interface IUpdateShipmentPayload {
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  deliveryNotes?: string;
}


export interface IShipmentFilterOptions {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPricingCalculationInput {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  isSameZone: boolean;
  isFragile?: boolean;
}

export interface IAssignCourierPayload {
  courierId: string; 
}
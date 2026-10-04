export interface ICreateHubPayload {
  name: string;
  code?: string;
  address: string;
  zone: string; // e.g., "Dhaka Metro", "Khulna Division"
  contactNo: string;
  latitude?: number;
  longitude?: number;
}

export interface IUpdateHubPayload {
  name?: string;
  address?: string;
  zone?: string;
  contactNo?: string;
  latitude?: number;
  longitude?: number;
}

export interface IHubFilterOptions {
  searchTerm?: string;
  zone?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IInventoryFilterOptions {
  status?: string;
  page?: number;
  limit?: number;
}
export type IUpdateCustomerPayload = {
  defaultAddress?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  alternatePhone?: string;
};

export type ICustomerFilterOptions = {
  city?: string;
  district?: string;
  searchTerm?: string;
};

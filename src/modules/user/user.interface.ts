import { Role } from "@prisma/client";

export type IUpdateUserPayload = {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  isVerified?: boolean;
};

export type IUserFilterOptions = {
  searchTerm?: string;
  role?: Role;
};

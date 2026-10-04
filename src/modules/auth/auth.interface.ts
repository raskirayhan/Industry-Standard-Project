import { Role } from "@prisma/client";

export type IRegisterUserPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: Role;
  avatarUrl?: string;
  // Optional customer specific fields upon registration
  defaultAddress?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  alternatePhone?: string;
};

export type ILoginUserPayload = {
  email: string;
  password: string;
};


export interface IGoogleLoginPayload {
  
  idToken : string
}


export interface IForgotPasswordPayload {
	email : string
}

export interface IResetPasswordPayload {
	 
	email : string;
	
	newPassword: string;
	otp : string
}
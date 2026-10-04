import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { customerService } from "./customer.service";

const getMyCustomerProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await customerService.getMyCustomerProfile(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Customer profile retrieved successfully",
    data: result,
  });
});

const updateMyCustomerProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await customerService.updateMyCustomerProfile(userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Customer profile updated successfully",
    data: result,
  });
});

const getAllCustomers = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    city: req.query.city ? String(req.query.city) : undefined,
    district: req.query.district ? String(req.query.district) : undefined,
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : undefined,
  };

  const result = await customerService.getAllCustomers(filters);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Customers retrieved successfully",
    data: result,
  });
});

const getCustomerById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await customerService.getCustomerById(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Customer retrieved successfully",
    data: result,
  });
});

const softDeleteCustomer = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await customerService.softDeleteCustomer(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Customer deleted successfully",
    data: result,
  });
});

export const customerController = {
  getMyCustomerProfile,
  updateMyCustomerProfile,
  getAllCustomers,
  getCustomerById,
  softDeleteCustomer,
};

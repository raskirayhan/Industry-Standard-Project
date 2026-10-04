import { Request, Response } from "express";
import httpStatus from "http-status";
import { Role } from "@prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userService } from "./user.service";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await userService.getMyProfile(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await userService.updateMyProfile(userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User profile updated successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : undefined,
    role: req.query.role ? (req.query.role as Role) : undefined,
  };

  const result = await userService.getAllUsers(filters);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await userService.getUserById(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: result,
  });
});

const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await userService.softDeleteUser(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User deleted successfully",
    data: result,
  });
});

export const userController = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  softDeleteUser,
};

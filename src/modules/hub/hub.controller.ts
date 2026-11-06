import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { hubService } from "./hub.service";
import { sendResponse } from "../../utils/sendResponse";

const createHub = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await hubService.createHubIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hub Created Successfully",
    data: result,
  });
});

const getAllHubs = catchAsync(async (req: Request, res: Response) => {
  const result = await hubService.getAllHubsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Hubs Found Successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getHubById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new Error("Invalid hub ID");
  }

  const result = await hubService.getHubByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub Data Successfully Found",
    data: result,
  });
});

export const updateHub = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new Error("Invalid Hub Id");
  }

  const result = await hubService.updateHubInDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub updated successfully",
    data: result,
  });
});

export const deleteHub = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new Error("Invalid Hub Id");
  }

  const result = await hubService.softDeleteHubInDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hub deleted successfully",
    data: result,
  });
});

export const hubController = {
  createHub,
  getAllHubs,
  getHubById,
  updateHub,
  deleteHub,
};

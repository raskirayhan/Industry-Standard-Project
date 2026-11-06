import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { shipmentService } from "./shipment.service";

const calculatePrice = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await shipmentService.calculateShipmentPriceFromDB(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Price Calculated Successfully",
    data: result,
  });
});

export const createShipment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const payload = req.body;

  const result = await shipmentService.createShipmentIntoDB(user, payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Parcel booked successfully. Please proceed to payment.",
    data: result,
  });
});

export const getAllShipments = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.getAllShipmentsFromDB(req.user!, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getShipmentById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.getShipmentByIdFromDB(req.user!, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment details retrieved successfully",
    data: result,
  });
});

const updateShipment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const payload = req.body;
  const result = await shipmentService.updateShipmentInDB(req.user!, id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment updated successfully",
    data: result,
  });
});

const cancelShipment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.cancelShipmentInDB(req.user!, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment cancelled successfully",
    data: result,
  });
});

const deleteShipment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.softDeleteShipmentInDB(req.user!, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment deleted successfully",
    data: result,
  });
});

const assignCourier = catchAsync(async (req: Request, res: Response) => {
  const { courierId } = req.body;
  if (!courierId) {
    throw new Error("Courier ID is mandatory");
  }

  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }

  const result = await shipmentService.assignCourierToShipmentInDB(
    req.user!,
    id,
    courierId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Courier assigned successfully to shipment",
    data: result,
  });
});

const updateShipmentStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }

  const result = await shipmentService.updateShipmentStatusInDB(
    req.user!,
    id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Shipment status updated successfully",
    data: result,
  });
});

export const shipmentController = {
  calculatePrice,
  createShipment,
  getAllShipments,
  getShipmentById,
  updateShipment,
  cancelShipment,
  deleteShipment,
  assignCourier,
  updateShipmentStatus,
};

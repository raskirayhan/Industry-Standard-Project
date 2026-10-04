import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { shipmentService } from "./shipment.service";

const calculatePrice = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body
  const result = await shipmentService.calculateShipmentPriceFromDB(payload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Price Calculated Successfully',
    data: result,
  });
});


export const createShipment = catchAsync(async (req: Request, res: Response) => {

  const user = req.user!
   const payload = req.body

  const result = await shipmentService.createShipmentIntoDB(user, payload);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Parcel Has Been Booked Successfully.Please Pay For the Shipment',
    data: result,
  });
});



export const getAllShipments = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.getAllShipmentsFromDB(req.user!, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Shipment List Get Successfully',
    meta: result.meta,
    data: result.data,
  });
});


const getShipmentById = catchAsync(async (req: Request, res: Response) => {

  const {id} = req.params;
  if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }
  const result = await shipmentService.getShipmentByIdFromDB(req.user!,id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'The Shipment Data Found ',
    data: result,
  });
});
const updateShipment = catchAsync(async (req: Request, res: Response) => {

  const {id} = req.params;
  if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }
  const payload = req.body
  const result = await shipmentService.updateShipmentInDB(req.user!,id,payload);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Shipment Updated Successfully',
    data: result,
  });
});


const cancelShipment= catchAsync(async (req: Request, res: Response) => {

  const {id} = req.params;
  if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }
  const result = await shipmentService.getShipmentByIdFromDB(req.user!,id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Shipment Cancelled Successfully',
    data: result,
  });
});
const deleteShipment= catchAsync(async (req: Request, res: Response) => {

  const {id} = req.params;
  if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }
  const result = await shipmentService.softDeleteShipmentInDB(req.user!,id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Shipment Cancelled Successfully',
    data: result,
  });
});


const assignCourier = catchAsync(async(req:Request,res:Response)=>{
  

  const {courierId} = req.body;
  if(!courierId){
    throw new Error("Courier Id Is Mandatory")
  }

  const {id} = req.params;
  if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }

  const result = await shipmentService.assignCourierToShipmentInDB(req.user!,id,courierId)


})

export const shipmentController = {
    calculatePrice,
    createShipment,
    getAllShipments,
    getShipmentById,
    updateShipment,
    cancelShipment,
    deleteShipment,
    assignCourier
}
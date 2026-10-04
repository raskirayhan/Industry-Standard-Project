import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { courierService } from "./courier.service";
import { sendResponse } from "../../utils/sendResponse";

 const setupCourierProfile = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const payload = req.body?.data ? (typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data) : req.body;
  const result = await courierService.createOrUpdateCourierProfile(req.user!, payload, files);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Courier Profile And Documents Are Created And Updated Successfully',
    data: result,
  });
});


const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await courierService.getMyCourierProfile(req.user!.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Courier Profile Data Found',
    data: result,
  });
});


export const courierController = {
    setupCourierProfile,
    getMyProfile
}
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { paymentService } from "./payment.service";
import { sendResponse } from "../../utils/sendResponse";

const initiatePayment = catchAsync(async(req:Request,res:Response)=>{

    const result = await paymentService.initiatePaymentSession(req.user!, req.body.shipmentId);

    sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment Link Has Been Created.Please Open The Browser',
    data: result,
  });
})


   const stripeWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    await paymentService.handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Webhook Error',
    });
  }
};

export const getPaymentDetails = catchAsync(async (req: Request, res: Response) => {

    const {id } = req.params

     if(!id || Array.isArray(id)){
    throw new Error("Shipment Id Is Required")
  }
  const result = await paymentService.getPaymentDetailsFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment Data Found',
    data: result,
  });
});

export const paymentController = {
    initiatePayment,
    stripeWebhookHandler,
    getPaymentDetails
}
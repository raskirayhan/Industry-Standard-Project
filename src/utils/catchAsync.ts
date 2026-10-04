import { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";


export const catchAsync = (fn : RequestHandler) =>{
    return async(req:Request, res:Response,next:NextFunction) =>{
        try {
            await fn(req,res,next);
        } catch (error) {
            console.log(error);
            
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                statusCode :httpStatus.INTERNAL_SERVER_ERROR,
                message : (error as Error).message || "Internal Server Error",
                error: (error as Error).message || error
            })
        }
    }
}
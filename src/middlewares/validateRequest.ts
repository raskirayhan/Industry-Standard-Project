import { ZodTypeAny } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { NextFunction, Request, Response } from "express";

export const validateRequest = (zodSchema: ZodTypeAny) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body ?? {};
    const parsedData = await zodSchema.parseAsync(payload);
    req.body = parsedData;
    next();
  });
};

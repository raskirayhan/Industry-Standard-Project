import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import httpStatus from "http-status";

export const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = err.message || "Something went wrong!";

  // Handle invalid JSON body syntax errors from body-parser
  if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid JSON body format. Please check your request payload syntax.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages: [
      {
        path: req.originalUrl,
        message,
      },
    ],
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  });
};

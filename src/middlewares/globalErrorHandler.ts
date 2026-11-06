import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";

export interface IErrorMessage {
  path: string;
  message: string;
}

export const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = "Something went wrong!";
  let errors: IErrorMessage[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [
      {
        path: req.originalUrl,
        message: err.message,
      },
    ];
  } else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation Error";
    errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err?.name === "PrismaClientKnownRequestError") {
    statusCode = httpStatus.BAD_REQUEST;
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : (err.meta?.target as string) || "Field";
      message = `Unique constraint failed on field(s): ${target}`;
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = "Record not found in the database";
    } else {
      message = `Database query error (Code: ${err.code})`;
    }
    errors = [{ path: req.originalUrl, message }];
  } else if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid JSON body format. Please check your request payload syntax.";
    errors = [{ path: req.originalUrl, message }];
  } else if (err instanceof Error) {
    statusCode = (err as any).statusCode || httpStatus.BAD_REQUEST;
    message = err.message || message;
    errors = [{ path: req.originalUrl, message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
  });
};

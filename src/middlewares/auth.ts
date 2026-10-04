import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";





export interface RequestUser {
  id: string;
  email: string;
  name: string;
  userId: string;
  role: Role;
}


declare global {
  namespace Express {
    interface Request {
      user?: RequestUser
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.headers.authorization;

    if (!token) {
      throw new Error("You are not authorized. Please log in to access this resource.");
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new Error(verifiedToken.error || "Invalid or expired token.");
    }

    const { id } = verifiedToken.data as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error("User not found. Please log in again.");
    }

    if (user.deletedAt) {
      throw new Error("Your account has been deactivated. Please contact support.");
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new Error("Forbidden. You do not have permission to access this resource.");
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      userId: user.id,
      role: user.role,
    };

    next();
  });
};
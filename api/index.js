// src/app.ts
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import httpStatus12 from "http-status";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
var config_default = {
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  admin_name: process.env.ADMIN_NAME,
  admin_email: process.env.ADMIN_EMAIL,
  admin_password: process.env.ADMIN_PASSWORD,
  redis_user: process.env.REDIS_USER,
  redis_password: process.env.REDIS_PASSWORD,
  redis_host: process.env.REDIS_HOST,
  redis_port: process.env.REDIS_PORT,
  smtp_user: process.env.SMTP_USER,
  smtp_password: process.env.SMTP_PASSWORD,
  email_sender: process.env.EMAIL_SENDER,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_key: process.env.STRIPE_WEBHOOK_KEY,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET
};

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import httpStatus3 from "http-status";

// src/utils/catchAsync.ts
import httpStatus from "http-status";
var catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.log(error);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: httpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || "Internal Server Error",
        error: error.message || error
      });
    }
  };
};

// src/utils/sendResponse.ts
var sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    statusCode: data.statusCode,
    message: data.message,
    data: data.data,
    meta: data.meta
  });
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import { AuthProvider, Role, UserStatus } from "@prisma/client";

// src/lib/prisma.ts
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var connectionString = process.env.DATABASE_URL;
var pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
var adapter = new PrismaPg(pool);
var prisma = globalForPrisma.prisma || new PrismaClient({
  adapter
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var createToken = (payload, secret, expiresIn) => {
  const token = jwt.sign(
    payload,
    secret,
    {
      expiresIn
    }
  );
  return token;
};
var verifyToken = (token, secret) => {
  try {
    const verifiedToken = jwt.verify(token, secret);
    return {
      success: true,
      data: verifiedToken
    };
  } catch (error) {
    console.log("Token verification failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
};
var jwtUtils = {
  createToken,
  verifyToken
};

// src/lib/googleAuth.ts
import { OAuth2Client } from "google-auth-library";
var googleClient = new OAuth2Client({
  client_id: config_default.google_client_id
});

// src/modules/auth/auth.service.ts
import httpStatus2 from "http-status";
import crypto from "crypto";

// src/lib/redis.ts
import { createClient } from "redis";
var redisClient = createClient({
  username: config_default.redis_user || void 0,
  password: config_default.redis_password || void 0,
  socket: {
    host: config_default.redis_host || "localhost",
    port: Number(config_default.redis_port) || 6379
  }
});
redisClient.on("error", (err) => {
  console.warn("Redis Client Notice:", err.message);
});

// src/modules/auth/auth.service.ts
import path2 from "path";
import ejs from "ejs";

// src/lib/nodemailer.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config_default.smtp_user,
    pass: config_default.smtp_password
  }
});

// src/errors/AppError.ts
var AppError = class extends Error {
  statusCode;
  constructor(statusCode, message, stack = "") {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};

// src/modules/auth/auth.service.ts
var registerUser = async (payload) => {
  const {
    name,
    email,
    password,
    phone,
    role = Role.CUSTOMER,
    avatarUrl,
    defaultAddress,
    city,
    district,
    postalCode,
    alternatePhone
  } = payload;
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  if (existingUser) {
    throw new AppError(httpStatus2.CONFLICT, "User with this email already exists.");
  }
  if (phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone }
    });
    if (existingPhone) {
      throw new AppError(
        httpStatus2.CONFLICT,
        "User with this phone number already exists."
      );
    }
  }
  const saltRounds = Number(config_default.bcrypt_salt_rounds) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        avatarUrl,
        emailVerified: true
      }
    });
    if (role === Role.CUSTOMER) {
      await tx.customer.create({
        data: {
          userId: createdUser.id,
          name,
          email,
          defaultAddress,
          city,
          district,
          postalCode,
          alternatePhone
        }
      });
    }
    const userWithRelation = await tx.user.findUnique({
      where: { id: createdUser.id },
      include: {
        customer: true
      }
    });
    return userWithRelation;
  });
  if (!result) {
    throw new AppError(httpStatus2.BAD_REQUEST, "Failed to register user.");
  }
  const { password: _, ...userWithoutPassword } = result;
  return userWithoutPassword;
};
var loginUser = async (payload) => {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (!user) {
    throw new AppError(httpStatus2.UNAUTHORIZED, "Invalid email or password.");
  }
  if (user.deletedAt || user.isDeleted) {
    throw new AppError(
      httpStatus2.FORBIDDEN,
      "Account has been deactivated. Please contact support."
    );
  }
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus2.FORBIDDEN, "Your account has been blocked.");
  }
  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new AppError(httpStatus2.UNAUTHORIZED, "Invalid email or password.");
  }
  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_access_secret,
    config_default.jwt_access_expires_in || "1d"
  );
  const refreshToken3 = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_refresh_secret,
    config_default.jwt_refresh_expires_in || "7d"
  );
  return {
    accessToken,
    refreshToken: refreshToken3
  };
};
var refreshToken = async (token) => {
  const verifiedToken = jwtUtils.verifyToken(token, config_default.jwt_refresh_secret);
  if (!verifiedToken.success) {
    throw new AppError(
      httpStatus2.UNAUTHORIZED,
      verifiedToken.error || "Invalid refresh token."
    );
  }
  const { id } = verifiedToken.data;
  const user = await prisma.user.findUnique({
    where: { id }
  });
  if (!user) {
    throw new AppError(httpStatus2.UNAUTHORIZED, "User not found.");
  }
  if (user.deletedAt || user.isDeleted) {
    throw new AppError(httpStatus2.FORBIDDEN, "Account has been deactivated.");
  }
  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_access_secret,
    config_default.jwt_access_expires_in || "1d"
  );
  return {
    accessToken
  };
};
var googleLogin = async (payload) => {
  let googleIdTokenPayload = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config_default.google_client_id
    });
    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log("Google ID Token Verification Failed ", error);
    throw new AppError(
      httpStatus2.UNAUTHORIZED,
      "Invalid Or Expired Google Id Token"
    );
  }
  if (!googleIdTokenPayload) {
    throw new AppError(
      httpStatus2.UNAUTHORIZED,
      "Invalid Or Expired Google Id Token"
    );
  }
  if (!googleIdTokenPayload.email) {
    throw new AppError(httpStatus2.BAD_REQUEST, "Google Email Not Found");
  }
  if (!googleIdTokenPayload.name) {
    throw new AppError(
      httpStatus2.BAD_REQUEST,
      "Google Email User Name Not Found"
    );
  }
  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email
    }
  });
  let user = existingUser;
  if (existingUser) {
    if (existingUser.status === UserStatus.BLOCKED) {
      throw new AppError(httpStatus2.FORBIDDEN, "User Is Blocked");
    }
    if (existingUser.isDeleted || existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
      throw new AppError(httpStatus2.FORBIDDEN, "User Is Deleted");
    }
    if (!existingUser.googleId) {
      user = await prisma.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          googleId: googleIdTokenPayload.sub
        }
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        name: googleIdTokenPayload.name,
        email: googleIdTokenPayload.email,
        password: "",
        role: Role.CUSTOMER,
        googleId: googleIdTokenPayload.sub,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
        customer: {
          create: {
            name: googleIdTokenPayload.name,
            email: googleIdTokenPayload.email
          }
        }
      }
    });
  }
  if (!user) {
    throw new AppError(httpStatus2.BAD_REQUEST, "User Not Found");
  }
  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_access_secret,
    config_default.jwt_access_expires_in || "1d"
  );
  const refreshToken3 = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_refresh_secret,
    config_default.jwt_refresh_expires_in || "7d"
  );
  return {
    accessToken,
    refreshToken: refreshToken3
  };
};
var forgotPassword = async (payload) => {
  const { email } = payload;
  const isUserExist = await prisma.user.findUnique({
    where: {
      email
    }
  });
  if (!isUserExist) {
    throw new AppError(httpStatus2.NOT_FOUND, "User Does Not Exist");
  }
  if (isUserExist.status === "BLOCKED") {
    throw new AppError(httpStatus2.FORBIDDEN, "User Is Blocked");
  }
  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new AppError(httpStatus2.FORBIDDEN, "User Is Deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
    throw new AppError(
      httpStatus2.BAD_REQUEST,
      "User registered with Google OAuth. Password reset is not allowed."
    );
  }
  const otp = crypto.randomInt(1e5, 1e6).toString();
  const key = `forgot-password-otp:${isUserExist.email}`;
  const expirationSeconds = 5 * 60;
  try {
    await redisClient.set(key, otp, {
      expiration: {
        type: "EX",
        value: expirationSeconds
      }
    });
  } catch (err) {
    console.error("Redis set OTP error:", err);
  }
  const templatePath = path2.join(
    process.cwd(),
    "src/templates/forgot-password.ejs"
  );
  const templateData = {
    name: isUserExist.name,
    otp,
    expirationMinutes: expirationSeconds / 60
  };
  try {
    const html = await ejs.renderFile(templatePath, templateData);
    if (config_default.email_sender && config_default.smtp_user) {
      await transporter.sendMail({
        from: config_default.email_sender,
        to: isUserExist.email,
        subject: "Password Reset OTP - Courier Service",
        html
      });
    }
  } catch (mailError) {
    console.warn("Mail sending skipped or failed:", mailError);
  }
};
var resetPassword = async (payload) => {
  const { email, otp, newPassword } = payload;
  const isUserExist = await prisma.user.findUnique({
    where: {
      email
    }
  });
  if (!isUserExist) {
    throw new AppError(httpStatus2.NOT_FOUND, "User Does Not Exist");
  }
  if (isUserExist.status === "BLOCKED") {
    throw new AppError(httpStatus2.FORBIDDEN, "User Is Blocked");
  }
  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new AppError(httpStatus2.FORBIDDEN, "User Is Deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
    throw new AppError(
      httpStatus2.BAD_REQUEST,
      "User registered with Google OAuth."
    );
  }
  const key = `forgot-password-otp:${isUserExist.email}`;
  let redisOtp = null;
  try {
    redisOtp = await redisClient.get(key);
  } catch (err) {
    console.error("Redis get OTP error:", err);
  }
  if (!redisOtp || redisOtp !== otp) {
    throw new AppError(httpStatus2.BAD_REQUEST, "Invalid or expired OTP");
  }
  const saltRounds = Number(config_default.bcrypt_salt_rounds) || 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  await prisma.user.update({
    where: {
      email: isUserExist.email
    },
    data: {
      password: hashedPassword
    }
  });
  try {
    await redisClient.del([key]);
  } catch (err) {
    console.error("Redis del OTP error:", err);
  }
  try {
    const templatePath = path2.join(
      process.cwd(),
      "src/templates/reset-password-success.ejs"
    );
    const templateData = { name: isUserExist.name };
    const html = await ejs.renderFile(templatePath, templateData);
    if (config_default.email_sender && config_default.smtp_user) {
      await transporter.sendMail({
        from: config_default.email_sender,
        to: isUserExist.email,
        subject: "Password Reset Successful",
        html
      });
    }
  } catch (mailErr) {
    console.warn("Reset notification email skipped or failed:", mailErr);
  }
};
var authService = {
  registerUser,
  loginUser,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword
};

// src/modules/auth/auth.controller.ts
var registerUser2 = catchAsync(async (req, res) => {
  const result = await authService.registerUser(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus3.CREATED,
    message: "User registered successfully",
    data: result
  });
});
var loginUser2 = catchAsync(async (req, res) => {
  const { accessToken, refreshToken: refreshToken3 } = await authService.loginUser(req.body);
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1e3 * 60 * 60 * 24
    // 1 day
  });
  res.cookie("refreshToken", refreshToken3, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1e3 * 60 * 60 * 24 * 7
    // 7 days
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus3.OK,
    message: "User logged in successfully",
    data: {
      accessToken,
      refreshToken: refreshToken3
    }
  });
});
var refreshToken2 = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    throw new Error("Refresh token is missing.");
  }
  const result = await authService.refreshToken(token);
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1e3 * 60 * 60 * 24
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus3.OK,
    message: "Token refreshed successfully",
    data: result
  });
});
var googleLogin2 = catchAsync(async (req, res) => {
  const payload = req.body;
  const { accessToken, refreshToken: refreshToken3 } = await authService.googleLogin(payload);
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1e3 * 60 * 60 * 24
    // 1 day
  });
  res.cookie("refreshToken", refreshToken3, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1e3 * 60 * 60 * 24 * 7
    // 7 days
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus3.OK,
    message: "User logged in successfully",
    data: {
      accessToken,
      refreshToken: refreshToken3
    }
  });
});
var forgotPassword2 = catchAsync(async (req, res) => {
  const payload = req.body;
  await authService.forgotPassword(payload);
  sendResponse(res, {
    statusCode: httpStatus3.OK,
    success: true,
    message: `OTP sent to email: ${payload.email}`,
    data: null
  });
});
var resetPassword2 = catchAsync(async (req, res) => {
  const payload = req.body;
  await authService.resetPassword(payload);
  sendResponse(res, {
    statusCode: httpStatus3.OK,
    success: true,
    message: "Password changed successfully",
    data: null
  });
});
var authController = {
  registerUser: registerUser2,
  loginUser: loginUser2,
  refreshToken: refreshToken2,
  googleLogin: googleLogin2,
  forgotPassword: forgotPassword2,
  resetPassword: resetPassword2
};

// src/middlewares/validateRequest.ts
var validateRequest = (zodSchema) => {
  return catchAsync(async (req, res, next) => {
    const payload = req.body ?? {};
    const parsedData = await zodSchema.parseAsync(payload);
    req.body = parsedData;
    next();
  });
};

// src/modules/auth/auth.validation.ts
import z from "zod";
var customerRegistrationZodSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").regex(/[a-z]/, "Password must contain at least 1 lowercase letter").regex(/[A-Z]/, "Password must contain at least 1 uppercase letter").regex(/[0-9]/, "Password must contain at least 1 number").regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character"),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  defaultAddress: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  alternatePhone: z.string().optional()
});
var loginZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});
var refreshTokenZodSchema = z.object({
  refreshToken: z.string().optional()
});
var googleLoginZodSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required")
});
var forgotPasswordZodSchema = z.object({
  email: z.string().email("Invalid email address")
});
var resetPasswordZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long").regex(/[a-z]/, "Password must contain at least 1 lowercase letter").regex(/[A-Z]/, "Password must contain at least 1 uppercase letter").regex(/[0-9]/, "Password must contain at least 1 number").regex(/[^a-zA-Z0-9]/, "Password must contain at least 1 special character")
});
var authValidation = {
  customerRegistrationZodSchema,
  loginZodSchema,
  refreshTokenZodSchema,
  googleLoginZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema
};

// src/modules/auth/auth.routes.ts
var router = Router();
router.post(
  "/register",
  validateRequest(authValidation.customerRegistrationZodSchema),
  authController.registerUser
);
router.post(
  "/login",
  validateRequest(authValidation.loginZodSchema),
  authController.loginUser
);
router.post(
  "/refresh-token",
  validateRequest(authValidation.refreshTokenZodSchema),
  authController.refreshToken
);
router.post(
  "/google",
  validateRequest(authValidation.googleLoginZodSchema),
  authController.googleLogin
);
router.post(
  "/forgot-password",
  validateRequest(authValidation.forgotPasswordZodSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordZodSchema),
  authController.resetPassword
);
var authRoutes = router;

// src/modules/user/user.routes.ts
import { Router as Router2 } from "express";
import { Role as Role2 } from "@prisma/client";

// src/middlewares/auth.ts
var auth = (...requiredRoles) => {
  return catchAsync(async (req, res, next) => {
    const token = req.cookies?.accessToken ? req.cookies.accessToken : req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : req.headers.authorization;
    if (!token) {
      throw new AppError(
        401,
        "You are not authorized. Please log in to access this resource."
      );
    }
    const verifiedToken = jwtUtils.verifyToken(token, config_default.jwt_access_secret);
    if (!verifiedToken.success) {
      throw new AppError(
        401,
        verifiedToken.error || "Invalid or expired access token."
      );
    }
    const { id } = verifiedToken.data;
    const user = await prisma.user.findUnique({
      where: { id }
    });
    if (!user) {
      throw new AppError(401, "User not found. Please log in again.");
    }
    if (user.deletedAt || user.isDeleted) {
      throw new AppError(
        403,
        "Your account has been deactivated. Please contact support."
      );
    }
    if (user.status === "BLOCKED") {
      throw new AppError(403, "Your account has been blocked.");
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new AppError(
        403,
        "Forbidden. You do not have permission to access this resource."
      );
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      userId: user.id,
      role: user.role
    };
    next();
  });
};

// src/modules/user/user.controller.ts
import httpStatus4 from "http-status";

// src/modules/user/user.service.ts
var getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: true
    }
  });
  if (!user || user.deletedAt) {
    throw new Error("User profile not found.");
  }
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
var updateMyProfile = async (userId, payload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user || user.deletedAt) {
    throw new Error("User profile not found.");
  }
  if (payload.phone && payload.phone !== user.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.phone }
    });
    if (existingPhone) {
      throw new Error("Phone number is already in use by another user.");
    }
  }
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    include: {
      customer: true
    }
  });
  const { password: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};
var getAllUsers = async (filters) => {
  const { searchTerm, role } = filters;
  const andConditions = [{ deletedAt: null }];
  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } }
      ]
    });
  }
  if (role) {
    andConditions.push({ role });
  }
  const whereConditions = {
    AND: andConditions
  };
  const users = await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      customer: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return users;
};
var getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      customer: true,
      deletedAt: true
    }
  });
  if (!user || user.deletedAt) {
    throw new Error("User not found.");
  }
  return user;
};
var softDeleteUser = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });
  if (!user || user.deletedAt) {
    throw new Error("User not found or already deleted.");
  }
  const deletedUser = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: /* @__PURE__ */ new Date()
    },
    select: {
      id: true,
      email: true,
      deletedAt: true
    }
  });
  return deletedUser;
};
var userService = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  softDeleteUser
};

// src/modules/user/user.controller.ts
var getMyProfile2 = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await userService.getMyProfile(userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus4.OK,
    message: "User profile retrieved successfully",
    data: result
  });
});
var updateMyProfile2 = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await userService.updateMyProfile(userId, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus4.OK,
    message: "User profile updated successfully",
    data: result
  });
});
var getAllUsers2 = catchAsync(async (req, res) => {
  const filters = {
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : void 0,
    role: req.query.role ? req.query.role : void 0
  };
  const result = await userService.getAllUsers(filters);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus4.OK,
    message: "Users retrieved successfully",
    data: result
  });
});
var getUserById2 = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await userService.getUserById(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus4.OK,
    message: "User retrieved successfully",
    data: result
  });
});
var softDeleteUser2 = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await userService.softDeleteUser(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus4.OK,
    message: "User deleted successfully",
    data: result
  });
});
var userController = {
  getMyProfile: getMyProfile2,
  updateMyProfile: updateMyProfile2,
  getAllUsers: getAllUsers2,
  getUserById: getUserById2,
  softDeleteUser: softDeleteUser2
};

// src/modules/user/user.validation.ts
import z2 from "zod";
var updateUserZodSchema = z2.object({
  name: z2.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z2.string().optional(),
  avatarUrl: z2.string().url("Invalid URL").optional()
});
var userValidation = {
  updateUserZodSchema
};

// src/modules/user/user.routes.ts
var router2 = Router2();
router2.get("/me", auth(Role2.ADMIN, Role2.CUSTOMER, Role2.COURIER), userController.getMyProfile);
router2.patch(
  "/me",
  auth(Role2.ADMIN, Role2.CUSTOMER, Role2.COURIER),
  validateRequest(userValidation.updateUserZodSchema),
  userController.updateMyProfile
);
router2.get("/", auth(Role2.ADMIN), userController.getAllUsers);
router2.get("/:id", auth(Role2.ADMIN), userController.getUserById);
router2.delete("/:id", auth(Role2.ADMIN), userController.softDeleteUser);
var userRoutes = router2;

// src/modules/customer/customer.routes.ts
import { Router as Router3 } from "express";
import { Role as Role3 } from "@prisma/client";

// src/modules/customer/customer.controller.ts
import httpStatus5 from "http-status";

// src/modules/customer/customer.service.ts
var getMyCustomerProfile = async (userId) => {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isVerified: true
        }
      }
    }
  });
  if (!customer || customer.deletedAt) {
    throw new Error("Customer profile not found.");
  }
  return customer;
};
var updateMyCustomerProfile = async (userId, payload) => {
  const customer = await prisma.customer.findUnique({
    where: { userId }
  });
  if (!customer || customer.deletedAt) {
    throw new Error("Customer profile not found.");
  }
  const updatedCustomer = await prisma.customer.update({
    where: { userId },
    data: payload,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true
        }
      }
    }
  });
  return updatedCustomer;
};
var getAllCustomers = async (filters) => {
  const { city, district, searchTerm } = filters;
  const andConditions = [{ deletedAt: null }];
  if (city) {
    andConditions.push({ city: { equals: city, mode: "insensitive" } });
  }
  if (district) {
    andConditions.push({ district: { equals: district, mode: "insensitive" } });
  }
  if (searchTerm) {
    andConditions.push({
      OR: [
        { city: { contains: searchTerm, mode: "insensitive" } },
        { district: { contains: searchTerm, mode: "insensitive" } },
        { defaultAddress: { contains: searchTerm, mode: "insensitive" } },
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { user: { phone: { contains: searchTerm, mode: "insensitive" } } }
      ]
    });
  }
  const customers = await prisma.customer.findMany({
    where: { AND: andConditions },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  return customers;
};
var getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true
        }
      }
    }
  });
  if (!customer || customer.deletedAt) {
    throw new Error("Customer not found.");
  }
  return customer;
};
var softDeleteCustomer = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id }
  });
  if (!customer || customer.deletedAt) {
    throw new Error("Customer not found or already deleted.");
  }
  const deletedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      deletedAt: /* @__PURE__ */ new Date()
    }
  });
  return deletedCustomer;
};
var customerService = {
  getMyCustomerProfile,
  updateMyCustomerProfile,
  getAllCustomers,
  getCustomerById,
  softDeleteCustomer
};

// src/modules/customer/customer.controller.ts
var getMyCustomerProfile2 = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await customerService.getMyCustomerProfile(userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus5.OK,
    message: "Customer profile retrieved successfully",
    data: result
  });
});
var updateMyCustomerProfile2 = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await customerService.updateMyCustomerProfile(userId, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus5.OK,
    message: "Customer profile updated successfully",
    data: result
  });
});
var getAllCustomers2 = catchAsync(async (req, res) => {
  const filters = {
    city: req.query.city ? String(req.query.city) : void 0,
    district: req.query.district ? String(req.query.district) : void 0,
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : void 0
  };
  const result = await customerService.getAllCustomers(filters);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus5.OK,
    message: "Customers retrieved successfully",
    data: result
  });
});
var getCustomerById2 = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await customerService.getCustomerById(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus5.OK,
    message: "Customer retrieved successfully",
    data: result
  });
});
var softDeleteCustomer2 = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await customerService.softDeleteCustomer(id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus5.OK,
    message: "Customer deleted successfully",
    data: result
  });
});
var customerController = {
  getMyCustomerProfile: getMyCustomerProfile2,
  updateMyCustomerProfile: updateMyCustomerProfile2,
  getAllCustomers: getAllCustomers2,
  getCustomerById: getCustomerById2,
  softDeleteCustomer: softDeleteCustomer2
};

// src/modules/customer/customer.validation.ts
import z3 from "zod";
var updateCustomerZodSchema = z3.object({
  defaultAddress: z3.string().optional(),
  city: z3.string().optional(),
  district: z3.string().optional(),
  postalCode: z3.string().optional(),
  alternatePhone: z3.string().optional()
});
var customerValidation = {
  updateCustomerZodSchema
};

// src/modules/customer/customer.routes.ts
var router3 = Router3();
router3.get("/me", auth(Role3.CUSTOMER), customerController.getMyCustomerProfile);
router3.patch(
  "/me",
  auth(Role3.CUSTOMER),
  validateRequest(customerValidation.updateCustomerZodSchema),
  customerController.updateMyCustomerProfile
);
router3.get("/", auth(Role3.ADMIN, Role3.COURIER), customerController.getAllCustomers);
router3.get("/:id", auth(Role3.ADMIN, Role3.COURIER), customerController.getCustomerById);
router3.delete("/:id", auth(Role3.ADMIN), customerController.softDeleteCustomer);
var customerRoutes = router3;

// src/middlewares/globalErrorHandler.ts
import httpStatus6 from "http-status";
import { ZodError } from "zod";
var globalErrorHandler = (err, req, res, next) => {
  let statusCode = httpStatus6.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong!";
  let errors = [];
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [
      {
        path: req.originalUrl,
        message: err.message
      }
    ];
  } else if (err instanceof ZodError) {
    statusCode = httpStatus6.BAD_REQUEST;
    message = "Validation Error";
    errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
  } else if (err?.name === "PrismaClientKnownRequestError") {
    statusCode = httpStatus6.BAD_REQUEST;
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target || "Field";
      message = `Unique constraint failed on field(s): ${target}`;
    } else if (err.code === "P2025") {
      statusCode = httpStatus6.NOT_FOUND;
      message = "Record not found in the database";
    } else {
      message = `Database query error (Code: ${err.code})`;
    }
    errors = [{ path: req.originalUrl, message }];
  } else if (err instanceof SyntaxError && "body" in err && err.status === 400) {
    statusCode = httpStatus6.BAD_REQUEST;
    message = "Invalid JSON body format. Please check your request payload syntax.";
    errors = [{ path: req.originalUrl, message }];
  } else if (err instanceof Error) {
    statusCode = err.statusCode || httpStatus6.BAD_REQUEST;
    message = err.message || message;
    errors = [{ path: req.originalUrl, message: err.message }];
  }
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err?.stack : void 0
  });
};

// src/middlewares/notFound.ts
import httpStatus7 from "http-status";
var notFound = (req, res) => {
  res.status(httpStatus7.NOT_FOUND).json({
    success: false,
    message: "API Route Not Found",
    errors: [
      {
        path: req.originalUrl,
        message: `Cannot ${req.method} ${req.originalUrl}`
      }
    ]
  });
};

// src/modules/hub/hub.routes.ts
import { Router as Router4 } from "express";
import { Role as Role4 } from "@prisma/client";

// src/modules/hub/hub.controller.ts
import httpStatus9 from "http-status";

// src/utils/hub.ts
var generateHubCode = async (zoneName) => {
  const cleanZone = zoneName.trim().replace(/[^a-zA-Z]/g, "");
  const prefix = (cleanZone.substring(0, 3) || "HUB").toUpperCase();
  const count = await prisma.hub.count({
    where: { zone: { contains: zoneName, mode: "insensitive" } }
  });
  const serial = String(count + 1).padStart(2, "0");
  return `HUB-${prefix}-${serial}`;
};

// src/modules/hub/hub.service.ts
import httpStatus8 from "http-status";
var REDIS_HUBS_CACHE_KEY = "hubs:all";
var invalidateHubsCache = async () => {
  try {
    await redisClient.del([REDIS_HUBS_CACHE_KEY]);
  } catch (err) {
    console.warn("Failed to invalidate hubs Redis cache:", err);
  }
};
var createHubIntoDB = async (payload) => {
  let finalCode = payload.code?.toUpperCase().trim();
  if (!finalCode) {
    finalCode = await generateHubCode(payload.zone);
  } else {
    const existing = await prisma.hub.findUnique({
      where: { code: finalCode }
    });
    if (existing) {
      throw new AppError(httpStatus8.CONFLICT, "Hub Code Has Already Been Used");
    }
  }
  const createdHub = await prisma.hub.create({
    data: {
      name: payload.name,
      code: finalCode,
      address: payload.address,
      zone: payload.zone,
      contactNo: payload.contactNo,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null
    }
  });
  await invalidateHubsCache();
  return createdHub;
};
var getAllHubsFromDB = async (filters) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;
  const { searchTerm, zone, sortBy = "createdAt", sortOrder = "desc" } = filters;
  const isDefaultQuery = !searchTerm && !zone && page === 1 && limit === 10 && sortBy === "createdAt";
  if (isDefaultQuery) {
    try {
      const cached = await redisClient.get(REDIS_HUBS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn("Redis get error for hubs:", err);
    }
  }
  const andConditions = [{ deletedAt: null }];
  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { code: { contains: searchTerm, mode: "insensitive" } },
        { address: { contains: searchTerm, mode: "insensitive" } }
      ]
    });
  }
  if (zone) {
    andConditions.push({
      zone: { contains: zone, mode: "insensitive" }
    });
  }
  const whereConditions = { AND: andConditions };
  const [hubs, total] = await Promise.all([
    prisma.hub.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    }),
    prisma.hub.count({ where: whereConditions })
  ]);
  const response = {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data: hubs
  };
  if (isDefaultQuery) {
    try {
      await redisClient.set(REDIS_HUBS_CACHE_KEY, JSON.stringify(response), {
        expiration: {
          type: "EX",
          value: 3600
          // 1 hour
        }
      });
    } catch (err) {
      console.warn("Redis set error for hubs:", err);
    }
  }
  return response;
};
var getHubByIdFromDB = async (id) => {
  const hub = await prisma.hub.findFirst({
    where: { id, deletedAt: null }
  });
  if (!hub) {
    throw new AppError(httpStatus8.NOT_FOUND, "Hub Not Found");
  }
  return hub;
};
var updateHubInDB = async (id, payload) => {
  const hub = await prisma.hub.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });
  if (!hub) {
    throw new AppError(httpStatus8.NOT_FOUND, "Hub Not Found");
  }
  const updatedHub = await prisma.hub.update({
    where: { id },
    data: payload
  });
  await invalidateHubsCache();
  return updatedHub;
};
var softDeleteHubInDB = async (id) => {
  const hub = await prisma.hub.findFirst({
    where: {
      id,
      deletedAt: null
    }
  });
  if (!hub) {
    throw new AppError(httpStatus8.NOT_FOUND, "Hub Not Found");
  }
  const deletedHub = await prisma.hub.update({
    where: { id },
    data: {
      deletedAt: /* @__PURE__ */ new Date()
    }
  });
  await invalidateHubsCache();
  return deletedHub;
};
var hubService = {
  createHubIntoDB,
  getAllHubsFromDB,
  getHubByIdFromDB,
  updateHubInDB,
  softDeleteHubInDB
};

// src/modules/hub/hub.controller.ts
var createHub = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await hubService.createHubIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus9.CREATED,
    success: true,
    message: "Hub Created Successfully",
    data: result
  });
});
var getAllHubs = catchAsync(async (req, res) => {
  const result = await hubService.getAllHubsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus9.OK,
    success: true,
    message: "All Hubs Found Successfully",
    meta: result.meta,
    data: result.data
  });
});
var getHubById = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Invalid hub ID");
  }
  const result = await hubService.getHubByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus9.OK,
    success: true,
    message: "Hub Data Successfully Found",
    data: result
  });
});
var updateHub = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Invalid Hub Id");
  }
  const result = await hubService.updateHubInDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus9.OK,
    success: true,
    message: "Hub updated successfully",
    data: result
  });
});
var deleteHub = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Invalid Hub Id");
  }
  const result = await hubService.softDeleteHubInDB(id);
  sendResponse(res, {
    statusCode: httpStatus9.OK,
    success: true,
    message: "Hub deleted successfully",
    data: result
  });
});
var hubController = {
  createHub,
  getAllHubs,
  getHubById,
  updateHub,
  deleteHub
};

// src/modules/hub/hub.validation.ts
import z4 from "zod";
var createHubZodSchema = z4.object({
  name: z4.string().min(2, "Hub name must be at least 2 characters"),
  code: z4.string().optional(),
  address: z4.string().min(3, "Address is required"),
  zone: z4.string().min(2, "Zone is required"),
  contactNo: z4.string().min(6, "Contact number is required"),
  latitude: z4.number().optional(),
  longitude: z4.number().optional()
});
var updateHubZodSchema = z4.object({
  name: z4.string().min(2, "Hub name must be at least 2 characters").optional(),
  address: z4.string().min(3, "Address is required").optional(),
  zone: z4.string().min(2, "Zone is required").optional(),
  contactNo: z4.string().min(6, "Contact number is required").optional(),
  latitude: z4.number().optional(),
  longitude: z4.number().optional()
});
var hubValidation = {
  createHubZodSchema,
  updateHubZodSchema
};

// src/modules/hub/hub.routes.ts
var router4 = Router4();
router4.post(
  "/",
  auth(Role4.ADMIN),
  validateRequest(hubValidation.createHubZodSchema),
  hubController.createHub
);
router4.post(
  "/create",
  auth(Role4.ADMIN),
  validateRequest(hubValidation.createHubZodSchema),
  hubController.createHub
);
router4.get("/", hubController.getAllHubs);
router4.get("/:id", hubController.getHubById);
router4.patch(
  "/:id",
  auth(Role4.ADMIN),
  validateRequest(hubValidation.updateHubZodSchema),
  hubController.updateHub
);
router4.delete("/:id", auth(Role4.ADMIN), hubController.deleteHub);
var hubRoutes = router4;

// src/modules/shipment/shipment.route.ts
import { Router as Router5 } from "express";
import { Role as Role5 } from "@prisma/client";

// src/modules/shipment/shipment.controller.ts
import httpStatus11 from "http-status";

// src/modules/shipment/shipment.service.ts
import httpStatus10 from "http-status";

// src/modules/shipment/shipment.utils.ts
import crypto2 from "crypto";
var computeShipmentCost = (input) => {
  const { weightKg, lengthCm, widthCm, heightCm, isSameZone, isFragile } = input;
  if (weightKg <= 0 || lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    throw new Error("Weight And Size Of The Product Must Be Greater Than Zero");
  }
  const volumetricWeight = lengthCm * widthCm * heightCm / 5e3;
  const chargeableWeight = Math.max(weightKg, volumetricWeight);
  const baseFare = isSameZone ? 60 : 120;
  const perKgRate = isSameZone ? 30 : 45;
  const extraWeight = Math.max(0, chargeableWeight - 1);
  const extraWeightFare = Math.ceil(extraWeight) * perKgRate;
  const surcharge = isFragile ? 50 : 0;
  const totalCost = baseFare + extraWeightFare + surcharge;
  return {
    actualWeightKg: parseFloat(weightKg.toFixed(2)),
    volumetricWeightKg: parseFloat(volumetricWeight.toFixed(2)),
    chargeableWeightKg: parseFloat(chargeableWeight.toFixed(2)),
    baseFare,
    extraWeightFare,
    surcharge,
    totalCost: parseFloat(totalCost.toFixed(2))
  };
};
var generateTrackingNumber = () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const randomHex = crypto2.randomBytes(3).toString("hex").toUpperCase();
  return `TRK-${year}-${randomHex}`;
};

// src/modules/shipment/shipment.service.ts
var calculateShipmentPriceFromDB = async (payload) => {
  const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } })
  ]);
  if (!originHub || !destHub) {
    throw new AppError(httpStatus10.NOT_FOUND, "Origin or Destination Hub Not Found");
  }
  const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase();
  return computeShipmentCost({
    weightKg: Number(payload.weightKg),
    lengthCm: Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile
  });
};
var createShipmentIntoDB = async (user, payload) => {
  if (!user || !user.userId) {
    throw new AppError(httpStatus10.UNAUTHORIZED, "Please log in to book a parcel.");
  }
  const customer = await prisma.customer.findUnique({
    where: { userId: user.userId }
  });
  if (!customer) {
    throw new AppError(httpStatus10.NOT_FOUND, "Customer Profile Not Found");
  }
  const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } })
  ]);
  if (!originHub || !destHub) {
    throw new AppError(httpStatus10.NOT_FOUND, "Selected Origin or Destination Hub is invalid.");
  }
  const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase();
  const priceDetails = computeShipmentCost({
    weightKg: Number(payload.weightKg),
    lengthCm: Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile
  });
  const trackingNumber = generateTrackingNumber();
  return await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        trackingNumber,
        customerId: customer.id,
        originHubId: payload.originHubId,
        destinationHubId: payload.destinationHubId,
        senderName: payload.senderName,
        senderPhone: payload.senderPhone,
        senderAddress: payload.senderAddress,
        receiverName: payload.receiverName,
        receiverPhone: payload.receiverPhone,
        receiverAddress: payload.receiverAddress,
        weightKg: priceDetails.actualWeightKg,
        lengthCm: Number(payload.lengthCm),
        widthCm: Number(payload.widthCm),
        heightCm: Number(payload.heightCm),
        chargeableWeightKg: priceDetails.chargeableWeightKg,
        baseFare: priceDetails.baseFare,
        surcharge: priceDetails.surcharge,
        totalCost: priceDetails.totalCost,
        status: "PAYMENT_PENDING",
        deliveryNotes: payload.deliveryNotes || null
      },
      include: {
        originHub: { select: { name: true, code: true, zone: true } },
        destinationHub: { select: { name: true, code: true, zone: true } }
      }
    });
    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: "ORDER_PLACED",
        toStatus: "PAYMENT_PENDING",
        performedById: user.userId,
        remarks: "Parcel booked. Awaiting customer payment."
      }
    });
    return shipment;
  });
};
var getAllShipmentsFromDB = async (user, filters) => {
  if (!user || !user.role) {
    throw new AppError(httpStatus10.UNAUTHORIZED, "Unauthorized access.");
  }
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;
  const { status, searchTerm, sortBy = "createdAt", sortOrder = "desc" } = filters;
  const andConditions = [{ deletedAt: null }];
  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    andConditions.push({ customerId: customer?.id || "NO_ACCESS" });
  } else if (user.role === "COURIER") {
    andConditions.push({ courierId: user.userId });
  }
  if (status) {
    andConditions.push({ status });
  }
  if (searchTerm) {
    andConditions.push({
      OR: [
        { trackingNumber: { contains: searchTerm, mode: "insensitive" } },
        { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
        { receiverName: { contains: searchTerm, mode: "insensitive" } }
      ]
    });
  }
  const whereConditions = { AND: andConditions };
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        originHub: { select: { name: true, code: true } },
        destinationHub: { select: { name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } }
      }
    }),
    prisma.shipment.count({ where: whereConditions })
  ]);
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data: shipments
  };
};
var getShipmentByIdFromDB = async (user, shipmentId) => {
  if (!user || !user.role) {
    throw new AppError(httpStatus10.UNAUTHORIZED, "Unauthorized access.");
  }
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    },
    include: {
      originHub: true,
      destinationHub: true,
      customer: { select: { name: true, email: true, alternatePhone: true } },
      courier: { select: { id: true, name: true, phone: true, email: true } },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { performedBy: { select: { name: true, role: true } } }
      }
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Shipment Not Found");
  }
  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus10.FORBIDDEN, "Forbidden. You cannot view another user's parcel.");
    }
  } else if (user.role === "COURIER") {
    if (shipment.courierId !== user.userId) {
      throw new AppError(httpStatus10.FORBIDDEN, "Forbidden. This shipment is not assigned to you.");
    }
  }
  return shipment;
};
var updateShipmentInDB = async (user, shipmentId, payload) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Shipment Not Found");
  }
  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus10.FORBIDDEN, "Forbidden. You cannot update another user's parcel.");
    }
  }
  if (!["ORDER_PLACED", "PAYMENT_PENDING", "PAID"].includes(shipment.status)) {
    throw new AppError(
      httpStatus10.BAD_REQUEST,
      "Shipment details cannot be changed once dispatch has started."
    );
  }
  return await prisma.shipment.update({
    where: {
      id: shipmentId
    },
    data: payload
  });
};
var cancelShipmentInDB = async (user, shipmentId) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Shipment Not Found");
  }
  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { userId: user.userId }
    });
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus10.FORBIDDEN, "Forbidden. You cannot cancel another user's parcel.");
    }
  }
  if (!["ORDER_PLACED", "PAYMENT_PENDING", "PAID"].includes(shipment.status)) {
    throw new AppError(
      httpStatus10.BAD_REQUEST,
      `Parcel is already in status '${shipment.status}'. It cannot be cancelled.`
    );
  }
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: "CANCELLED" }
    });
    await tx.shipmentLog.create({
      data: {
        shipmentId,
        fromStatus: shipment.status,
        toStatus: "CANCELLED",
        performedById: user.userId,
        remarks: `Parcel cancelled by ${user.role}`
      }
    });
    return updated;
  });
};
var softDeleteShipmentInDB = async (user, shipmentId) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Shipment Not Found");
  }
  if (!["ORDER_PLACED", "PAYMENT_PENDING", "CANCELLED"].includes(shipment.status)) {
    throw new AppError(
      httpStatus10.BAD_REQUEST,
      `Cannot delete parcel in '${shipment.status}' status.`
    );
  }
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      deletedAt: /* @__PURE__ */ new Date()
    }
  });
  return null;
};
var assignCourierToShipmentInDB = async (adminUser, shipmentId, courierUserId) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Parcel Not Found");
  }
  if (shipment.status !== "PAID") {
    throw new AppError(
      httpStatus10.BAD_REQUEST,
      `Only PAID parcels can be assigned to a courier. Current status: ${shipment.status}`
    );
  }
  const courier = await prisma.user.findFirst({
    where: {
      id: courierUserId,
      role: "COURIER",
      status: "ACTIVE",
      deletedAt: null
    },
    include: { courierProfile: true }
  });
  if (!courier || !courier.courierProfile) {
    throw new AppError(httpStatus10.NOT_FOUND, "Active Courier Profile Not Found");
  }
  if (!courier.courierProfile.isAvailable) {
    throw new AppError(
      httpStatus10.BAD_REQUEST,
      `Courier ${courier.name} is currently marked unavailable.`
    );
  }
  return await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: {
        id: shipmentId,
        version: shipment.version
      },
      data: {
        courierId: courier.id,
        status: "PICKUP_ASSIGNED",
        version: { increment: 1 }
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });
    await tx.courierProfile.update({
      where: { userId: courier.id },
      data: {
        activeDeliveries: { increment: 1 }
      }
    });
    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: "PAID",
        toStatus: "PICKUP_ASSIGNED",
        performedById: adminUser.userId,
        remarks: `Courier ${courier.name} assigned for pickup by Admin`
      }
    });
    return updatedShipment;
  });
};
var updateShipmentStatusInDB = async (user, shipmentId, payload) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    }
  });
  if (!shipment) {
    throw new AppError(httpStatus10.NOT_FOUND, "Shipment Not Found");
  }
  if (user.role === "COURIER" && shipment.courierId !== user.userId) {
    throw new AppError(
      httpStatus10.FORBIDDEN,
      "Forbidden. You are not assigned to this shipment."
    );
  }
  const { status: nextStatus, deliveryOtp, remarks, podSignatureUrl, podImageUrl } = payload;
  if (nextStatus === "DELIVERED") {
    if (!deliveryOtp) {
      throw new AppError(httpStatus10.BAD_REQUEST, "Delivery OTP is required to mark shipment as DELIVERED.");
    }
    if (shipment.deliveryOtp && shipment.deliveryOtp !== deliveryOtp) {
      throw new AppError(httpStatus10.BAD_REQUEST, "Invalid Delivery OTP.");
    }
  }
  return await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: nextStatus,
        podSignatureUrl: podSignatureUrl || shipment.podSignatureUrl,
        podImageUrl: podImageUrl || shipment.podImageUrl,
        version: { increment: 1 }
      }
    });
    if (["DELIVERED", "FAILED_DELIVERY", "RETURNED_TO_SENDER"].includes(nextStatus) && shipment.courierId) {
      await tx.courierProfile.updateMany({
        where: { userId: shipment.courierId },
        data: {
          activeDeliveries: { decrement: 1 }
        }
      });
    }
    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: nextStatus,
        performedById: user.userId,
        remarks: remarks || `Shipment status updated to ${nextStatus} by ${user.role} (${user.name})`
      }
    });
    return updatedShipment;
  });
};
var shipmentService = {
  calculateShipmentPriceFromDB,
  createShipmentIntoDB,
  getAllShipmentsFromDB,
  getShipmentByIdFromDB,
  updateShipmentInDB,
  cancelShipmentInDB,
  softDeleteShipmentInDB,
  assignCourierToShipmentInDB,
  updateShipmentStatusInDB
};

// src/modules/shipment/shipment.controller.ts
var calculatePrice = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await shipmentService.calculateShipmentPriceFromDB(payload);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Price Calculated Successfully",
    data: result
  });
});
var createShipment = catchAsync(async (req, res) => {
  const user = req.user;
  const payload = req.body;
  const result = await shipmentService.createShipmentIntoDB(user, payload);
  sendResponse(res, {
    statusCode: httpStatus11.CREATED,
    success: true,
    message: "Parcel booked successfully. Please proceed to payment.",
    data: result
  });
});
var getAllShipments = catchAsync(async (req, res) => {
  const result = await shipmentService.getAllShipmentsFromDB(req.user, req.query);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment list retrieved successfully",
    meta: result.meta,
    data: result.data
  });
});
var getShipmentById = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.getShipmentByIdFromDB(req.user, id);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment details retrieved successfully",
    data: result
  });
});
var updateShipment = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const payload = req.body;
  const result = await shipmentService.updateShipmentInDB(req.user, id, payload);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment updated successfully",
    data: result
  });
});
var cancelShipment = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.cancelShipmentInDB(req.user, id);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment cancelled successfully",
    data: result
  });
});
var deleteShipment = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.softDeleteShipmentInDB(req.user, id);
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment deleted successfully",
    data: result
  });
});
var assignCourier = catchAsync(async (req, res) => {
  const { courierId } = req.body;
  if (!courierId) {
    throw new Error("Courier ID is mandatory");
  }
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.assignCourierToShipmentInDB(
    req.user,
    id,
    courierId
  );
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Courier assigned successfully to shipment",
    data: result
  });
});
var updateShipmentStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment ID is required");
  }
  const result = await shipmentService.updateShipmentStatusInDB(
    req.user,
    id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus11.OK,
    success: true,
    message: "Shipment status updated successfully",
    data: result
  });
});
var shipmentController = {
  calculatePrice,
  createShipment,
  getAllShipments,
  getShipmentById,
  updateShipment,
  cancelShipment,
  deleteShipment,
  assignCourier,
  updateShipmentStatus
};

// src/modules/shipment/shipment.validation.ts
import z5 from "zod";
import { ShipmentStatus } from "@prisma/client";
var calculatePriceZodSchema = z5.object({
  originHubId: z5.string().uuid("Invalid Origin Hub ID"),
  destinationHubId: z5.string().uuid("Invalid Destination Hub ID"),
  weightKg: z5.number().positive("Weight must be greater than 0"),
  lengthCm: z5.number().positive("Length must be greater than 0"),
  widthCm: z5.number().positive("Width must be greater than 0"),
  heightCm: z5.number().positive("Height must be greater than 0"),
  isFragile: z5.boolean().optional()
});
var createShipmentZodSchema = z5.object({
  originHubId: z5.string().uuid("Invalid Origin Hub ID"),
  destinationHubId: z5.string().uuid("Invalid Destination Hub ID"),
  senderName: z5.string().min(2, "Sender name is required"),
  senderPhone: z5.string().min(6, "Sender phone is required"),
  senderAddress: z5.string().min(3, "Sender address is required"),
  receiverName: z5.string().min(2, "Receiver name is required"),
  receiverPhone: z5.string().min(6, "Receiver phone is required"),
  receiverAddress: z5.string().min(3, "Receiver address is required"),
  weightKg: z5.number().positive("Weight must be greater than 0"),
  lengthCm: z5.number().positive("Length must be greater than 0"),
  widthCm: z5.number().positive("Width must be greater than 0"),
  heightCm: z5.number().positive("Height must be greater than 0"),
  isFragile: z5.boolean().optional(),
  deliveryNotes: z5.string().optional()
});
var updateShipmentZodSchema = z5.object({
  senderName: z5.string().optional(),
  senderPhone: z5.string().optional(),
  senderAddress: z5.string().optional(),
  receiverName: z5.string().optional(),
  receiverPhone: z5.string().optional(),
  receiverAddress: z5.string().optional(),
  deliveryNotes: z5.string().optional()
});
var assignCourierZodSchema = z5.object({
  courierId: z5.string().uuid("Invalid Courier User ID")
});
var updateShipmentStatusZodSchema = z5.object({
  status: z5.nativeEnum(ShipmentStatus),
  deliveryOtp: z5.string().optional(),
  remarks: z5.string().optional(),
  podSignatureUrl: z5.string().optional(),
  podImageUrl: z5.string().optional()
});
var shipmentValidation = {
  calculatePriceZodSchema,
  createShipmentZodSchema,
  updateShipmentZodSchema,
  assignCourierZodSchema,
  updateShipmentStatusZodSchema
};

// src/modules/shipment/shipment.route.ts
var router5 = Router5();
router5.post(
  "/calculate-price",
  validateRequest(shipmentValidation.calculatePriceZodSchema),
  shipmentController.calculatePrice
);
router5.post(
  "/",
  auth(Role5.CUSTOMER),
  validateRequest(shipmentValidation.createShipmentZodSchema),
  shipmentController.createShipment
);
router5.post(
  "/create-shipment",
  auth(Role5.CUSTOMER),
  validateRequest(shipmentValidation.createShipmentZodSchema),
  shipmentController.createShipment
);
router5.get(
  "/",
  auth(Role5.ADMIN, Role5.CUSTOMER, Role5.COURIER),
  shipmentController.getAllShipments
);
router5.get(
  "/get-all-shipments",
  auth(Role5.ADMIN, Role5.CUSTOMER, Role5.COURIER),
  shipmentController.getAllShipments
);
router5.get(
  "/:id",
  auth(Role5.CUSTOMER, Role5.ADMIN, Role5.COURIER),
  shipmentController.getShipmentById
);
router5.patch(
  "/:id",
  auth(Role5.CUSTOMER, Role5.ADMIN),
  validateRequest(shipmentValidation.updateShipmentZodSchema),
  shipmentController.updateShipment
);
router5.patch(
  "/:id/status",
  auth(Role5.COURIER, Role5.ADMIN),
  validateRequest(shipmentValidation.updateShipmentStatusZodSchema),
  shipmentController.updateShipmentStatus
);
router5.post(
  "/:id/cancel",
  auth(Role5.CUSTOMER, Role5.ADMIN),
  shipmentController.cancelShipment
);
router5.delete(
  "/:id",
  auth(Role5.CUSTOMER, Role5.ADMIN),
  shipmentController.deleteShipment
);
router5.post(
  "/:id/assign-courier",
  auth(Role5.ADMIN),
  validateRequest(shipmentValidation.assignCourierZodSchema),
  shipmentController.assignCourier
);
var shipmentRoutes = router5;

// src/lib/stripe.ts
import Stripe from "stripe";
var stripeSecretKey = config_default.stripe_secret_key || "sk_test_placeholder_for_startup";
var stripe = new Stripe(stripeSecretKey);

// src/modules/payment/payment.service.ts
import crypto3 from "crypto";
var MIN_STRIPE_BDT_AMOUNT = 70;
var initiatePaymentSession = async (user, shipmentId) => {
  if (!shipmentId) {
    throw new Error("shipmentId is required");
  }
  let shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null
    },
    include: {
      customer: true
    }
  });
  if (!shipment) {
    throw new Error("Shipment Not Found");
  }
  if (user.role === "CUSTOMER" && shipment.customer.userId !== user.userId) {
    throw new Error("Unauthorized Access");
  }
  if (shipment.status !== "PAYMENT_PENDING") {
    throw new Error(`This Parcel Status ${shipment.status},This Is Not The Right Payment Status`);
  }
  const expectedMinCost = shipment.baseFare + shipment.surcharge;
  if (shipment.totalCost < expectedMinCost) {
    shipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: { totalCost: expectedMinCost },
      include: { customer: true }
    });
  }
  let payment = await prisma.payment.findFirst({
    where: {
      shipmentId: shipment.id,
      userId: user.userId,
      status: "PENDING",
      deletedAt: null
    }
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        shipmentId: shipment.id,
        userId: user.userId,
        amount: shipment.totalCost,
        currency: "BDT",
        gateway: "STRIPE",
        status: "PENDING"
      }
    });
  } else if (payment.amount !== shipment.totalCost) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { amount: shipment.totalCost }
    });
  }
  const chargableAmount = Math.max(shipment.totalCost, MIN_STRIPE_BDT_AMOUNT);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `Courier Delivery - Track: ${shipment.trackingNumber}`,
            description: `From: ${shipment.senderAddress} To: ${shipment.receiverAddress}`
          },
          unit_amount: Math.round(chargableAmount * 100)
        },
        quantity: 1
      }
    ],
    metadata: {
      shipmentId: shipment.id,
      paymentId: payment.id,
      userId: user.userId
    },
    success_url: `${config_default.app_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config_default.app_url || "http://localhost:3000"}/payment/cancel`
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewaySessionId: session.id }
  });
  return {
    checkoutUrl: session.url,
    paymentId: payment.id,
    amount: shipment.totalCost,
    currency: "BDT"
  };
};
var handleStripeWebhook = async (payload, signature) => {
  let event;
  const webhookSecret = config_default.stripe_webhook_key || process.env.STRIPE_WEBHOOK_KEY || process.env.STRIPE_WEBHOOK_SECRET;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    throw new Error(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { shipmentId, paymentId, userId } = session.metadata;
    const deliveryOtp = crypto3.randomInt(1e5, 999999).toString();
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCESS",
          transactionId: session.payment_intent,
          gatewayResponse: session
        }
      });
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: "PAID",
          deliveryOtp,
          version: { increment: 1 }
        }
      });
      await tx.shipmentLog.create({
        data: {
          shipmentId: updatedShipment.id,
          fromStatus: "PAYMENT_PENDING",
          toStatus: "PAID",
          performedById: userId,
          remarks: `Stripe-\u098F \u09B8\u09AB\u09B2 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F (TrxID: ${session.payment_intent})`
        }
      });
    });
  }
  return { received: true };
};
var getPaymentDetailsFromDB = async (id) => {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { id },
        { shipmentId: id }
      ],
      deletedAt: null
    },
    include: {
      shipment: { select: { trackingNumber: true, status: true, totalCost: true } }
    }
  });
  if (!payment) throw new Error("Payment Record Not Found");
  return payment;
};
var paymentService = {
  initiatePaymentSession,
  handleStripeWebhook,
  getPaymentDetailsFromDB
};

// src/modules/payment/payment.controller.ts
var initiatePayment = catchAsync(async (req, res) => {
  const result = await paymentService.initiatePaymentSession(req.user, req.body.shipmentId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment Link Has Been Created.Please Open The Browser",
    data: result
  });
});
var stripeWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    await paymentService.handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Webhook Error"
    });
  }
};
var getPaymentDetails = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    throw new Error("Shipment Id Is Required");
  }
  const result = await paymentService.getPaymentDetailsFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment Data Found",
    data: result
  });
});
var paymentController = {
  initiatePayment,
  stripeWebhookHandler,
  getPaymentDetails
};

// src/modules/payment/payment.route.ts
import { Router as Router6 } from "express";
import { Role as Role6 } from "@prisma/client";

// src/modules/payment/payment.validation.ts
import z6 from "zod";
var initiatePaymentZodSchema = z6.object({
  shipmentId: z6.string().uuid("Invalid Shipment ID format")
});
var paymentValidation = {
  initiatePaymentZodSchema
};

// src/modules/payment/payment.route.ts
var router6 = Router6();
router6.post(
  "/initiate",
  auth(Role6.CUSTOMER, Role6.ADMIN),
  validateRequest(paymentValidation.initiatePaymentZodSchema),
  paymentController.initiatePayment
);
router6.get("/:id", paymentController.getPaymentDetails);
var paymentRoutes = router6;

// src/modules/courier/courier.route.ts
import { Router as Router7 } from "express";
import { Role as Role7 } from "@prisma/client";

// src/lib/cloudinary.ts
import { v2 as Cloudinary } from "cloudinary";
Cloudinary.config({
  cloud_name: config_default.cloudinary_cloud_name,
  api_key: config_default.cloudinary_api_key,
  api_secret: config_default.cloudinary_api_secret
});
var uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};
var cloudinary = Cloudinary;

// src/modules/courier/courier.service.ts
var createOrUpdateCourierProfile = async (user, payload, files) => {
  if (!payload || !payload.hubId) {
    throw new Error("hubId is required to setup courier profile");
  }
  const existingUser = await prisma.user.findFirst({
    where: { id: user.userId, deletedAt: null },
    include: { courierProfile: true }
  });
  if (!existingUser || existingUser.role !== "COURIER") {
    throw new Error("Only Courier Can Be Created In the Courier Profile");
  }
  const hub = await prisma.hub.findFirst({
    where: {
      id: payload.hubId,
      deletedAt: null
    }
  });
  if (!hub) {
    throw new Error("The Selected Hub Is Not Found");
  }
  let drivingLicenseUrl = existingUser.courierProfile?.drivingLicenseUrl || null;
  let nidCardUrl = existingUser.courierProfile?.nidCardUrl || null;
  if (files?.drivingLicense?.[0]) {
    const licenseUpload = await uploadToCloudinary(
      files.drivingLicense[0].buffer,
      "courier_documents/licenses"
    );
    drivingLicenseUrl = licenseUpload.secure_url;
  }
  if (files?.nidCard?.[0]) {
    const nidUpload = await uploadToCloudinary(
      files.nidCard[0].buffer,
      "courier_documents/nids"
    );
    nidCardUrl = nidUpload.secure_url;
  }
  ;
  const profile = await prisma.courierProfile.upsert({
    where: { userId: user.userId },
    update: {
      hubId: payload.hubId,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      drivingLicense: payload.drivingLicense || null,
      drivingLicenseUrl,
      nidCardUrl,
      currentZone: payload.currentZone,
      maxCapacityKg: payload.maxCapacityKg ? Number(payload.maxCapacityKg) : 30
    },
    create: {
      userId: user.userId,
      hubId: payload.hubId,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      drivingLicense: payload.drivingLicense || null,
      drivingLicenseUrl,
      nidCardUrl,
      currentZone: payload.currentZone,
      maxCapacityKg: payload.maxCapacityKg ? Number(payload.maxCapacityKg) : 30
    },
    include: {
      hub: { select: { id: true, name: true, code: true, zone: true } }
    }
  });
  return profile;
};
var getMyCourierProfile = async (userId) => {
  const profile = await prisma.courierProfile.findUnique({
    where: {
      userId
    },
    include: {
      hub: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true
        }
      }
    }
  });
  if (!profile) {
    throw new Error("Courier Profile Didn't Created Yet");
  }
  return profile;
};
var courierService = {
  createOrUpdateCourierProfile,
  getMyCourierProfile
};

// src/modules/courier/courier.controller.ts
var setupCourierProfile = catchAsync(async (req, res) => {
  const files = req.files;
  const payload = req.body?.data ? typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data : req.body;
  const result = await courierService.createOrUpdateCourierProfile(req.user, payload, files);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Courier Profile And Documents Are Created And Updated Successfully",
    data: result
  });
});
var getMyProfile3 = catchAsync(async (req, res) => {
  const result = await courierService.getMyCourierProfile(req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Courier Profile Data Found",
    data: result
  });
});
var courierController = {
  setupCourierProfile,
  getMyProfile: getMyProfile3
};

// src/lib/multer.ts
import multer from "multer";
var storage = multer.memoryStorage();
var uploadCourierDocs = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only jpg and pdf can be download"));
    }
  }
}).fields([
  { name: "drivingLicense", maxCount: 1 },
  { name: "nidCard", maxCount: 1 }
]);

// src/modules/courier/courier.route.ts
var router7 = Router7();
router7.post("/profile", auth(Role7.COURIER, Role7.ADMIN), uploadCourierDocs, courierController.setupCourierProfile);
router7.get("/profile/me", auth(Role7.COURIER), courierController.getMyProfile);
var courierRoutes = router7;

// src/app.ts
var app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !config_default.app_url || config_default.app_url === "*" || origin === config_default.app_url) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);
app.post(
  ["/api/v1/payments/webhook", "/api/payments/webhook"],
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhookHandler
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.status(httpStatus12.OK).json({
    success: true,
    message: "Courier & Logistics Platform Backend API"
  });
});
app.get("/api/v1/health", async (req, res) => {
  res.status(httpStatus12.OK).json({
    success: true,
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/hubs", hubRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/courier", courierRoutes);
app.use(notFound);
app.use(globalErrorHandler);
var app_default = app;
export {
  app_default as default
};

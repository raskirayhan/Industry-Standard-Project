import bcrypt from "bcryptjs";
import { SignOptions } from "jsonwebtoken";
import { AuthProvider, Role, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";
import {
  IForgotPasswordPayload,
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterUserPayload,
  IResetPasswordPayload,
} from "./auth.interface";
import { googleClient } from "../../lib/googleAuth";
import { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { AppError } from "../../errors/AppError";

const registerUser = async (payload: IRegisterUserPayload) => {
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
    alternatePhone,
  } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "User with this email already exists.");
  }

  if (phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhone) {
      throw new AppError(
        httpStatus.CONFLICT,
        "User with this phone number already exists."
      );
    }
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await prisma.$transaction(async (tx: any) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        avatarUrl,
        emailVerified: true,
      },
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
          alternatePhone,
        },
      });
    }

    const userWithRelation = await tx.user.findUnique({
      where: { id: createdUser.id },
      include: {
        customer: true,
      },
    });

    return userWithRelation;
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, "Failed to register user.");
  }

  const { password: _, ...userWithoutPassword } = result;

  return userWithoutPassword;
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  if (user.deletedAt || user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Account has been deactivated. Please contact support."
    );
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked.");
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    (config.jwt_access_expires_in || "1d") as SignOptions["expiresIn"]
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    (config.jwt_refresh_expires_in || "7d") as SignOptions["expiresIn"]
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  const verifiedToken = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

  if (!verifiedToken.success) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      verifiedToken.error || "Invalid refresh token."
    );
  }

  const { id } = verifiedToken.data as { id: string };

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not found.");
  }

  if (user.deletedAt || user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "Account has been deactivated.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    (config.jwt_access_expires_in || "1d") as SignOptions["expiresIn"]
  );

  return {
    accessToken,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log("Google ID Token Verification Failed ", error);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid Or Expired Google Id Token"
    );
  }

  if (!googleIdTokenPayload) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid Or Expired Google Id Token"
    );
  }

  if (!googleIdTokenPayload.email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Google Email Not Found");
  }

  if (!googleIdTokenPayload.name) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Google Email User Name Not Found"
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
    },
  });

  let user = existingUser;

  if (existingUser) {
    if (existingUser.status === UserStatus.BLOCKED) {
      throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
    }

    if (
      existingUser.isDeleted ||
      existingUser.status === UserStatus.DELETED ||
      existingUser.deletedAt
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
    }

    if (!existingUser.googleId) {
      user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
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
            email: googleIdTokenPayload.email,
          },
        },
      },
    });
  }

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, "User Not Found");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    (config.jwt_access_expires_in || "1d") as SignOptions["expiresIn"]
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    (config.jwt_refresh_expires_in || "7d") as SignOptions["expiresIn"]
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist");
  }

  if (isUserExist.status === "BLOCKED") {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
  }

  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
  }

  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User registered with Google OAuth. Password reset is not allowed."
    );
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgot-password-otp:${isUserExist.email}`;
  const expirationSeconds = 5 * 60;

  try {
    await redisClient.set(key, otp, {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    });
  } catch (err) {
    console.error("Redis set OTP error:", err);
  }

  const templatePath = path.join(
    process.cwd(),
    "src/templates/forgot-password.ejs"
  );

  const templateData = {
    name: isUserExist.name,
    otp,
    expirationMinutes: expirationSeconds / 60,
  };

  try {
    const html = await ejs.renderFile(templatePath, templateData);
    if (config.email_sender && config.smtp_user) {
      await transporter.sendMail({
        from: config.email_sender,
        to: isUserExist.email,
        subject: "Password Reset OTP - Courier Service",
        html,
      });
    }
  } catch (mailError) {
    console.warn("Mail sending skipped or failed:", mailError);
  }
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, otp, newPassword } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist");
  }

  if (isUserExist.status === "BLOCKED") {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
  }

  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
  }

  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User registered with Google OAuth."
    );
  }

  const key = `forgot-password-otp:${isUserExist.email}`;

  let redisOtp: string | null = null;
  try {
    redisOtp = await redisClient.get(key);
  } catch (err) {
    console.error("Redis get OTP error:", err);
  }

  if (!redisOtp || redisOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await prisma.user.update({
    where: {
      email: isUserExist.email,
    },
    data: {
      password: hashedPassword,
    },
  });

  try {
    await redisClient.del([key]);
  } catch (err) {
    console.error("Redis del OTP error:", err);
  }

  try {
    const templatePath = path.join(
      process.cwd(),
      "src/templates/reset-password-success.ejs"
    );
    const templateData = { name: isUserExist.name };
    const html = await ejs.renderFile(templatePath, templateData);
    if (config.email_sender && config.smtp_user) {
      await transporter.sendMail({
        from: config.email_sender,
        to: isUserExist.email,
        subject: "Password Reset Successful",
        html,
      });
    }
  } catch (mailErr) {
    console.warn("Reset notification email skipped or failed:", mailErr);
  }
};

export const authService = {
  registerUser,
  loginUser,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
};

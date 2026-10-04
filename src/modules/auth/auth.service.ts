import bcrypt from "bcryptjs";
import { SignOptions } from "jsonwebtoken";
import { AuthProvider, Role, UserStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";
import { IForgotPasswordPayload, IGoogleLoginPayload, ILoginUserPayload, IRegisterUserPayload, IResetPasswordPayload } from "./auth.interface";
import { googleClient } from "../../lib/googleAuth";
import { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import crypto from "crypto"
import { redisClient } from "../../lib/redis";
import path from "path"
import ejs from "ejs"
import { transporter } from "../../lib/nodemailer";

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
    throw new Error("User with this email already exists.");
  }

  if (phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhone) {
      throw new Error("User with this phone number already exists.");
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
    throw new Error("Failed to register user.");
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
    throw new Error("Invalid email or password.");
  }

  if (user.deletedAt) {
    throw new Error("Account has been deactivated. Please contact support.");
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new Error("Invalid email or password.");
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
    throw new Error(verifiedToken.error || "Invalid refresh token.");
  }

  const { id } = verifiedToken.data as { id: string };

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.deletedAt) {
    throw new Error("Account has been deactivated.");
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
    throw new Error("Invalid Or Expired Google Id Token");
  }

  if (!googleIdTokenPayload) {
    throw new Error("Invalid Or Expired Google Id Token");
  }

  if (!googleIdTokenPayload.email) {
    throw new Error("Google Email Not Found");
  }

  if (!googleIdTokenPayload.name) {
    throw new Error("Google Email User Name Not Found");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
    },
  });

  let user = existingUser;

  if (existingUser) {
    if (existingUser.status === UserStatus.BLOCKED) {
      throw new Error("User Is Blocked");
    }

    if (existingUser.isDeleted || existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
      throw new Error("User Is Deleted");
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
    throw new Error("User Not Found");
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

const forgotPassword = async(payload :IForgotPasswordPayload) =>{
  const {email} = payload;

  const isUserExist = await prisma.user.findUnique({
    where : {
      email
    }
  })


  if(!isUserExist){
    throw new Error("User Does Not Exist")
  }

  if(isUserExist.status === "BLOCKED"){
    throw new Error("User Does Not Exist")
  }

  if(!isUserExist.emailVerified){
    throw new Error("User Not Verified")
  }

  if(isUserExist.isDeleted || isUserExist.status === "DELETED"){
    throw new Error("User Is Deleted")
  }

  if(isUserExist.googleId && isUserExist.authProvider === "GOOGLE"){
    throw new Error("User Has Account With Google ")
  }

   const otp = crypto.randomInt(100000, 1000000).toString();

   const key = `forget-password-otp:${isUserExist.email}`

    const expirationSeconds = 3 * 60

     await redisClient.set(key, otp, {
		expiration: {
			type:"EX",
			value: expirationSeconds
		}
	 })

   const templatePath = path.join(process.cwd(), "src/templates/forgot-password.ejs");

   const templateData = {
    name : isUserExist.name,
    otp,
    expirationMinutes : expirationSeconds / 60
   }

   const html = await ejs.renderFile(templatePath,templateData)


   await transporter.sendMail({
    from: config.email_sender,
    to: isUserExist.email,
    subject:"forgot Password",
    html
   })

   



}


const resetPassword = async(payload : IResetPasswordPayload) =>{
  const {email, otp, newPassword} = payload;

  const isUserExist = await prisma.user.findUnique({
    where : {
      email
    }
  })


  if(!isUserExist){
    throw new Error("User Does Not Exist");
  }

  if(isUserExist.status === "BLOCKED"){
    throw new Error("User Is Blocked")
  }

  if(!isUserExist.emailVerified){
    throw new Error("User Not Verified");
  }

  if(isUserExist.isDeleted || isUserExist.status === "DELETED"){
    throw new Error("User Is Deleted");
  }

  if(isUserExist.googleId && isUserExist.authProvider === "GOOGLE"){
    throw new Error("User Has Account With Google ");
  }

  const key = `forgot-password-otp: ${isUserExist.email}`

  const redisOtp = await redisClient.get(key);

  if(!redisOtp){
    throw new Error("Invalid OTP")
  }

  if(redisOtp !== otp){
    throw new Error("OTP Does Not Match");
  }

  const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  await prisma.user.update({
    where : {
      email : isUserExist.email
    },
    data : {
      password:hashedPassword
    }
  });

  await redisClient.del([key])

  const templatePath = path.join(process.cwd(), "src/templates/reset-password-success.ejs")

  const templateData = {
    name : isUserExist.name
  }

  const html =  await ejs.renderFile(templatePath, templateData)

  await transporter.sendMail({
    from : config.email_sender,
    to : isUserExist.email,
    subject: "Password Changed",
    html
  })




}



export const authService = {
  registerUser,
  loginUser,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword
};

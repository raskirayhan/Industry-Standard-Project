import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";

const router = Router();

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

export const authRoutes = router;

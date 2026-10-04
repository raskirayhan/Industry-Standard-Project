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
router.post("/login", validateRequest(authValidation.loginZodSchema), authController.loginUser);
router.post("/refresh-token", authController.refreshToken);

router.post("/google", authController.googleLogin);

 router.post("/forgot-password",authController.forgotPassword);


 router.post("/reset-password",authController.resetPassword)

export const authRoutes = router;
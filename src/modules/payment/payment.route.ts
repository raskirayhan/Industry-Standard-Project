import { Router } from "express";
import { paymentController } from "./payment.controller";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { paymentValidation } from "./payment.validation";

const router = Router();

router.post(
  "/initiate",
  auth(Role.CUSTOMER, Role.ADMIN),
  validateRequest(paymentValidation.initiatePaymentZodSchema),
  paymentController.initiatePayment
);

router.get("/:id", paymentController.getPaymentDetails);

export const paymentRoutes = router;

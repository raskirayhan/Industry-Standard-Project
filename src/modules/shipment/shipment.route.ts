import { Router } from "express";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { shipmentController } from "./shipment.controller";
import { shipmentValidation } from "./shipment.validation";

const router = Router();

router.post(
  "/calculate-price",
  validateRequest(shipmentValidation.calculatePriceZodSchema),
  shipmentController.calculatePrice
);

// RESTful booking + legacy alias
router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(shipmentValidation.createShipmentZodSchema),
  shipmentController.createShipment
);
router.post(
  "/create-shipment",
  auth(Role.CUSTOMER),
  validateRequest(shipmentValidation.createShipmentZodSchema),
  shipmentController.createShipment
);

// RESTful list + legacy alias
router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  shipmentController.getAllShipments
);
router.get(
  "/get-all-shipments",
  auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
  shipmentController.getAllShipments
);

router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.ADMIN, Role.COURIER),
  shipmentController.getShipmentById
);

router.patch(
  "/:id",
  auth(Role.CUSTOMER, Role.ADMIN),
  validateRequest(shipmentValidation.updateShipmentZodSchema),
  shipmentController.updateShipment
);

// Courier & Admin status transitions (delivery lifecycle)
router.patch(
  "/:id/status",
  auth(Role.COURIER, Role.ADMIN),
  validateRequest(shipmentValidation.updateShipmentStatusZodSchema),
  shipmentController.updateShipmentStatus
);

router.post(
  "/:id/cancel",
  auth(Role.CUSTOMER, Role.ADMIN),
  shipmentController.cancelShipment
);

router.delete(
  "/:id",
  auth(Role.CUSTOMER, Role.ADMIN),
  shipmentController.deleteShipment
);

// Protected courier assignment
router.post(
  "/:id/assign-courier",
  auth(Role.ADMIN),
  validateRequest(shipmentValidation.assignCourierZodSchema),
  shipmentController.assignCourier
);

export const shipmentRoutes = router;

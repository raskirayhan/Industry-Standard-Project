import { Router } from "express";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { customerController } from "./customer.controller";

const router = Router();

router.get("/me", auth(Role.CUSTOMER), customerController.getMyCustomerProfile);
router.patch("/me", auth(Role.CUSTOMER), customerController.updateMyCustomerProfile);

router.get("/", auth(Role.ADMIN, Role.COURIER), customerController.getAllCustomers);
router.get("/:id", auth(Role.ADMIN, Role.COURIER), customerController.getCustomerById);
router.delete("/:id", auth(Role.ADMIN), customerController.softDeleteCustomer);

export const customerRoutes = router;

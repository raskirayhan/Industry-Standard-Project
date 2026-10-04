import { Router } from "express";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { userController } from "./user.controller";

const router = Router();

router.get("/me", auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER), userController.getMyProfile);
router.patch("/me", auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER), userController.updateMyProfile);

router.get("/", auth(Role.ADMIN), userController.getAllUsers);
router.get("/:id", auth(Role.ADMIN), userController.getUserById);
router.delete("/:id", auth(Role.ADMIN), userController.softDeleteUser);

export const userRoutes = router;

import { Router } from "express";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { hubController } from "./hub.controller";
import { hubValidation } from "./hub.validation";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(hubValidation.createHubZodSchema),
  hubController.createHub
);

router.post(
  "/create",
  auth(Role.ADMIN),
  validateRequest(hubValidation.createHubZodSchema),
  hubController.createHub
);

router.get("/", hubController.getAllHubs);
router.get("/:id", hubController.getHubById);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(hubValidation.updateHubZodSchema),
  hubController.updateHub
);

router.delete("/:id", auth(Role.ADMIN), hubController.deleteHub);

export const hubRoutes = router;

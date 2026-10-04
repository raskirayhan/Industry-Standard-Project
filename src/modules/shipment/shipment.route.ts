import { Router } from "express";
import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";
import { shipmentController } from "./shipment.controller";

const router = Router();


router.post('/calculate-price', shipmentController.calculatePrice)


router.post('/create-shipment', auth(Role.CUSTOMER), shipmentController.createShipment)



router.get('/get-all-shipments', auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER), shipmentController.getAllShipments)

router.get(
  "/:id",
  auth(Role.CUSTOMER, Role.ADMIN, Role.COURIER),
  shipmentController.getShipmentById
)

router.patch('/:id',auth(Role.CUSTOMER,Role.ADMIN),shipmentController.updateShipment)

router.post('/:id/cancel',auth(Role.CUSTOMER,Role.ADMIN),shipmentController.cancelShipment);

router.delete('/:id',auth(Role.CUSTOMER,Role.ADMIN),shipmentController.deleteShipment)

router.post(
  '/:id/assign-courier',
  shipmentController.assignCourier
);



export const shipmentRoutes = router
import { Router } from "express";
import { paymentController } from "./payment.controller";

import { Role } from "@prisma/client";
import { auth } from "../../middlewares/auth";

const router = Router();





router.post('/initiate',auth(Role.CUSTOMER,Role.ADMIN),paymentController.initiatePayment);

router.get('/:id', paymentController.getPaymentDetails);





export const paymentRoutes = router
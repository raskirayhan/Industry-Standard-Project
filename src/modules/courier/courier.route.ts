import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "@prisma/client";
import { courierController } from "./courier.controller";
import { uploadCourierDocs } from "../../lib/multer";

const router = Router()


router.post('/profile', auth(Role.COURIER, Role.ADMIN), uploadCourierDocs, courierController.setupCourierProfile)


router.get('/profile/me',auth(Role.COURIER),courierController.getMyProfile)



export const courierRoutes = router
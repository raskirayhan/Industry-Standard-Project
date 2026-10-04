import cors from "cors";
import cookieParser from "cookie-parser";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import config from "./config";
import { authRoutes } from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/user/user.routes";
import { customerRoutes } from "./modules/customer/customer.routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { hubRoutes } from "./modules/hub/hub.routes";
import { shipmentRoutes } from "./modules/shipment/shipment.route";
import { paymentController } from "./modules/payment/payment.controller";
import { paymentRoutes } from "./modules/payment/payment.route";
import { courierRoutes } from "./modules/courier/courier.route";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url || "*",
    credentials: true,
  })
);


app.post(
  ['/api/v1/payments/webhook', '/api/payments/webhook'],
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhookHandler
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root route check
app.get("/", (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Courier & Logistics Platform Backend API",
  });
});

// Application API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/hubs",hubRoutes);
app.use("/api/v1/shipments",shipmentRoutes);
app.use('/api/v1/payments',paymentRoutes);
app.use('/api/v1/courier',courierRoutes)

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    statusCode: httpStatus.NOT_FOUND,
    message: "API Route Not Found",
  });
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
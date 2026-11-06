import config from "../../config";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middlewares/auth";
import { AppError } from "../../errors/AppError";
import httpStatus from "http-status";
import {
  ICalculatePricePayload,
  ICreateShipmentPayload,
  IShipmentFilterOptions,
  IUpdateShipmentPayload,
} from "./shipment.interface";
import { computeShipmentCost, generateTrackingNumber } from "./shipment.utils";
import { ShipmentStatus } from "@prisma/client";

const calculateShipmentPriceFromDB = async (payload: ICalculatePricePayload) => {
  const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } }),
  ]);

  if (!originHub || !destHub) {
    throw new AppError(httpStatus.NOT_FOUND, "Origin or Destination Hub Not Found");
  }

  const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase();

  return computeShipmentCost({
    weightKg: Number(payload.weightKg),
    lengthCm: Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile,
  });
};

const createShipmentIntoDB = async (
  user: RequestUser,
  payload: ICreateShipmentPayload
) => {
  if (!user || !user.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Please log in to book a parcel.");
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: user.userId },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found");
  }

  const [originHub, destHub] = await Promise.all([
    prisma.hub.findFirst({ where: { id: payload.originHubId, deletedAt: null } }),
    prisma.hub.findFirst({ where: { id: payload.destinationHubId, deletedAt: null } }),
  ]);

  if (!originHub || !destHub) {
    throw new AppError(httpStatus.NOT_FOUND, "Selected Origin or Destination Hub is invalid.");
  }

  const isSameZone = originHub.zone.toLowerCase() === destHub.zone.toLowerCase();

  const priceDetails = computeShipmentCost({
    weightKg: Number(payload.weightKg),
    lengthCm: Number(payload.lengthCm),
    widthCm: Number(payload.widthCm),
    heightCm: Number(payload.heightCm),
    isSameZone,
    isFragile: payload.isFragile,
  });

  const trackingNumber = generateTrackingNumber();

  return await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        trackingNumber,
        customerId: customer.id,
        originHubId: payload.originHubId,
        destinationHubId: payload.destinationHubId,
        senderName: payload.senderName,
        senderPhone: payload.senderPhone,
        senderAddress: payload.senderAddress,
        receiverName: payload.receiverName,
        receiverPhone: payload.receiverPhone,
        receiverAddress: payload.receiverAddress,
        weightKg: priceDetails.actualWeightKg,
        lengthCm: Number(payload.lengthCm),
        widthCm: Number(payload.widthCm),
        heightCm: Number(payload.heightCm),
        chargeableWeightKg: priceDetails.chargeableWeightKg,
        baseFare: priceDetails.baseFare,
        surcharge: priceDetails.surcharge,
        totalCost: priceDetails.totalCost,
        status: "PAYMENT_PENDING",
        deliveryNotes: payload.deliveryNotes || null,
      },
      include: {
        originHub: { select: { name: true, code: true, zone: true } },
        destinationHub: { select: { name: true, code: true, zone: true } },
      },
    });

    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: "ORDER_PLACED",
        toStatus: "PAYMENT_PENDING",
        performedById: user.userId,
        remarks: "Parcel booked. Awaiting customer payment.",
      },
    });

    return shipment;
  });
};

const getAllShipmentsFromDB = async (
  user: RequestUser,
  filters: IShipmentFilterOptions
) => {
  if (!user || !user.role) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access.");
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const { status, searchTerm, sortBy = "createdAt", sortOrder = "desc" } = filters;

  const andConditions: any[] = [{ deletedAt: null }];

  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    andConditions.push({ customerId: customer?.id || "NO_ACCESS" });
  } else if (user.role === "COURIER") {
    andConditions.push({ courierId: user.userId });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { trackingNumber: { contains: searchTerm, mode: "insensitive" } },
        { receiverPhone: { contains: searchTerm, mode: "insensitive" } },
        { receiverName: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const whereConditions = { AND: andConditions };

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        originHub: { select: { name: true, code: true } },
        destinationHub: { select: { name: true, code: true } },
        courier: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.shipment.count({ where: whereConditions }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: shipments,
  };
};

const getShipmentByIdFromDB = async (user: RequestUser, shipmentId: string) => {
  if (!user || !user.role) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access.");
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
    include: {
      originHub: true,
      destinationHub: true,
      customer: { select: { name: true, email: true, alternatePhone: true } },
      courier: { select: { id: true, name: true, phone: true, email: true } },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { performedBy: { select: { name: true, role: true } } },
      },
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment Not Found");
  }

  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden. You cannot view another user's parcel.");
    }
  } else if (user.role === "COURIER") {
    if (shipment.courierId !== user.userId) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden. This shipment is not assigned to you.");
    }
  }

  return shipment;
};

const updateShipmentInDB = async (
  user: RequestUser,
  shipmentId: string,
  payload: IUpdateShipmentPayload
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment Not Found");
  }

  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({ where: { userId: user.userId } });
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden. You cannot update another user's parcel.");
    }
  }

  if (!["ORDER_PLACED", "PAYMENT_PENDING", "PAID"].includes(shipment.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Shipment details cannot be changed once dispatch has started."
    );
  }

  return await prisma.shipment.update({
    where: {
      id: shipmentId,
    },
    data: payload,
  });
};

const cancelShipmentInDB = async (user: RequestUser, shipmentId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment Not Found");
  }

  if (user.role === "CUSTOMER") {
    const customer = await prisma.customer.findUnique({
      where: { userId: user.userId },
    });
    // FIXED: Must be !== so owner CAN cancel!
    if (!customer || shipment.customerId !== customer.id) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden. You cannot cancel another user's parcel.");
    }
  }

  if (!["ORDER_PLACED", "PAYMENT_PENDING", "PAID"].includes(shipment.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Parcel is already in status '${shipment.status}'. It cannot be cancelled.`
    );
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: "CANCELLED" },
    });

    await tx.shipmentLog.create({
      data: {
        shipmentId,
        fromStatus: shipment.status,
        toStatus: "CANCELLED",
        performedById: user.userId,
        remarks: `Parcel cancelled by ${user.role}`,
      },
    });

    return updated;
  });
};

const softDeleteShipmentInDB = async (user: RequestUser, shipmentId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment Not Found");
  }

  if (!["ORDER_PLACED", "PAYMENT_PENDING", "CANCELLED"].includes(shipment.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete parcel in '${shipment.status}' status.`
    );
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      deletedAt: new Date(),
    },
  });
  return null;
};

const assignCourierToShipmentInDB = async (
  adminUser: RequestUser,
  shipmentId: string,
  courierUserId: string
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Parcel Not Found");
  }

  if (shipment.status !== "PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only PAID parcels can be assigned to a courier. Current status: ${shipment.status}`
    );
  }

  const courier = await prisma.user.findFirst({
    where: {
      id: courierUserId,
      role: "COURIER",
      status: "ACTIVE",
      deletedAt: null,
    },
    include: { courierProfile: true },
  });

  if (!courier || !courier.courierProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Active Courier Profile Not Found");
  }

  if (!courier.courierProfile.isAvailable) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Courier ${courier.name} is currently marked unavailable.`
    );
  }

  return await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: {
        id: shipmentId,
        version: shipment.version,
      },
      data: {
        courierId: courier.id,
        status: "PICKUP_ASSIGNED",
        version: { increment: 1 },
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    await tx.courierProfile.update({
      where: { userId: courier.id },
      data: {
        activeDeliveries: { increment: 1 },
      },
    });

    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: "PAID",
        toStatus: "PICKUP_ASSIGNED",
        performedById: adminUser.userId,
        remarks: `Courier ${courier.name} assigned for pickup by Admin`,
      },
    });

    return updatedShipment;
  });
};

const updateShipmentStatusInDB = async (
  user: RequestUser,
  shipmentId: string,
  payload: {
    status: ShipmentStatus;
    deliveryOtp?: string;
    remarks?: string;
    podSignatureUrl?: string;
    podImageUrl?: string;
  }
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment Not Found");
  }

  // Courier can only update shipments assigned to them
  if (user.role === "COURIER" && shipment.courierId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Forbidden. You are not assigned to this shipment."
    );
  }

  const { status: nextStatus, deliveryOtp, remarks, podSignatureUrl, podImageUrl } =
    payload;

  // Handle DELIVERED transition with OTP verification
  if (nextStatus === "DELIVERED") {
    if (!deliveryOtp) {
      throw new AppError(httpStatus.BAD_REQUEST, "Delivery OTP is required to mark shipment as DELIVERED.");
    }

    if (shipment.deliveryOtp && shipment.deliveryOtp !== deliveryOtp) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid Delivery OTP.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: nextStatus,
        podSignatureUrl: podSignatureUrl || shipment.podSignatureUrl,
        podImageUrl: podImageUrl || shipment.podImageUrl,
        version: { increment: 1 },
      },
    });

    // If final status reached, decrement courier activeDeliveries
    if (["DELIVERED", "FAILED_DELIVERY", "RETURNED_TO_SENDER"].includes(nextStatus) && shipment.courierId) {
      await tx.courierProfile.updateMany({
        where: { userId: shipment.courierId },
        data: {
          activeDeliveries: { decrement: 1 },
        },
      });
    }

    await tx.shipmentLog.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: nextStatus,
        performedById: user.userId,
        remarks:
          remarks ||
          `Shipment status updated to ${nextStatus} by ${user.role} (${user.name})`,
      },
    });

    return updatedShipment;
  });
};

export const shipmentService = {
  calculateShipmentPriceFromDB,
  createShipmentIntoDB,
  getAllShipmentsFromDB,
  getShipmentByIdFromDB,
  updateShipmentInDB,
  cancelShipmentInDB,
  softDeleteShipmentInDB,
  assignCourierToShipmentInDB,
  updateShipmentStatusInDB,
};

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('ORDER_PLACED', 'PAYMENT_PENDING', 'PAID', 'PICKUP_ASSIGNED', 'PICKED_UP', 'IN_HUB_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'CANCELLED', 'RETURNED_TO_SENDER');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "trackingNumber" VARCHAR(50) NOT NULL,
    "customerId" TEXT NOT NULL,
    "senderName" VARCHAR(100) NOT NULL,
    "senderPhone" VARCHAR(20) NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "receiverName" VARCHAR(100) NOT NULL,
    "receiverPhone" VARCHAR(20) NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "originHubId" TEXT NOT NULL,
    "destinationHubId" TEXT NOT NULL,
    "courierId" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "lengthCm" DOUBLE PRECISION NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "chargeableWeightKg" DOUBLE PRECISION NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "deliveryOtp" VARCHAR(10),
    "deliveryNotes" TEXT,
    "podSignatureUrl" VARCHAR(500),
    "podImageUrl" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_logs" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromStatus" "ShipmentStatus" NOT NULL,
    "toStatus" "ShipmentStatus" NOT NULL,
    "performedById" TEXT NOT NULL,
    "remarks" TEXT,
    "hubContext" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingNumber_key" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipments_customerId_status_idx" ON "shipments"("customerId", "status");

-- CreateIndex
CREATE INDEX "shipments_courierId_status_idx" ON "shipments"("courierId", "status");

-- CreateIndex
CREATE INDEX "shipments_originHubId_destinationHubId_idx" ON "shipments"("originHubId", "destinationHubId");

-- CreateIndex
CREATE INDEX "shipments_deletedAt_idx" ON "shipments"("deletedAt");

-- CreateIndex
CREATE INDEX "shipment_logs_shipmentId_createdAt_idx" ON "shipment_logs"("shipmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_originHubId_fkey" FOREIGN KEY ("originHubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_logs" ADD CONSTRAINT "shipment_logs_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_logs" ADD CONSTRAINT "shipment_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

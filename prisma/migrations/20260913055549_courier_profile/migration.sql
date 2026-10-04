-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BICYCLE', 'MOTORBIKE', 'VAN', 'TRUCK');

-- CreateTable
CREATE TABLE "courier_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hubId" TEXT,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTORBIKE',
    "vehicleNumber" VARCHAR(50) NOT NULL,
    "drivingLicense" VARCHAR(100),
    "drivingLicenseUrl" VARCHAR(500),
    "nidCardUrl" VARCHAR(500),
    "currentZone" VARCHAR(100) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "activeDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courier_profiles_userId_key" ON "courier_profiles"("userId");

-- CreateIndex
CREATE INDEX "courier_profiles_hubId_isAvailable_idx" ON "courier_profiles"("hubId", "isAvailable");

-- AddForeignKey
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "zone" VARCHAR(100) NOT NULL,
    "contactNo" VARCHAR(20) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hubs_code_key" ON "hubs"("code");

-- CreateIndex
CREATE INDEX "hubs_code_zone_idx" ON "hubs"("code", "zone");

-- CreateIndex
CREATE INDEX "hubs_deletedAt_idx" ON "hubs"("deletedAt");

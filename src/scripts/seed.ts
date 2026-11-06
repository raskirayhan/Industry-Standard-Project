import { Role, VehicleType, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import config from "../config";

async function runSeed() {
  console.log("🌱 Starting database seeding...");

  try {
    const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
    const defaultPasswordHash = await bcrypt.hash("Password@123!", saltRounds);

    // 1. Seed Super Admin
    const adminEmail = config.admin_email || "admin@courier.com";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: config.admin_name || "Super Admin",
          email: adminEmail,
          password: defaultPasswordHash,
          role: Role.ADMIN,
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      });
      console.log(`✅ Admin created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // 2. Seed Hubs
    const hubsData = [
      {
        name: "Dhaka Central Hub",
        code: "HUB-DHK-01",
        address: "House 42, Road 11, Dhanmondi, Dhaka",
        zone: "Dhaka",
        contactNo: "01811000001",
        latitude: 23.7461,
        longitude: 90.3742,
      },
      {
        name: "Chittagong Port Hub",
        code: "HUB-CTG-01",
        address: "Agrabad Commercial Area, Chittagong",
        zone: "Chittagong",
        contactNo: "01811000002",
        latitude: 22.3384,
        longitude: 91.8317,
      },
      {
        name: "Sylhet Main Hub",
        code: "HUB-SYL-01",
        address: "Zindabazar, Sylhet",
        zone: "Sylhet",
        contactNo: "01811000003",
        latitude: 24.8949,
        longitude: 91.8687,
      },
    ];

    for (const hub of hubsData) {
      const existingHub = await prisma.hub.findUnique({ where: { code: hub.code } });
      if (!existingHub) {
        await prisma.hub.create({ data: hub });
        console.log(`✅ Hub created: ${hub.name} (${hub.code})`);
      }
    }

    // 3. Seed Demo Customer
    const customerEmail = "customer@demo.com";
    const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!existingCustomer) {
      const customerUser = await prisma.user.create({
        data: {
          name: "Demo Customer",
          email: customerEmail,
          password: defaultPasswordHash,
          role: Role.CUSTOMER,
          phone: "01700000001",
          emailVerified: true,
          status: UserStatus.ACTIVE,
          customer: {
            create: {
              name: "Demo Customer",
              email: customerEmail,
              defaultAddress: "Road 5, Dhanmondi, Dhaka",
              city: "Dhaka",
              district: "Dhaka",
            },
          },
        },
      });
      console.log(`✅ Demo Customer created: ${customerEmail}`);
    }

    // 4. Seed Demo Courier
    const courierEmail = "courier@demo.com";
    const existingCourier = await prisma.user.findUnique({ where: { email: courierEmail } });
    if (!existingCourier) {
      const dhakaHub = await prisma.hub.findFirst({ where: { code: "HUB-DHK-01" } });
      await prisma.user.create({
        data: {
          name: "Demo Rider",
          email: courierEmail,
          password: defaultPasswordHash,
          role: Role.COURIER,
          phone: "01700000002",
          emailVerified: true,
          status: UserStatus.ACTIVE,
          courierProfile: {
            create: {
              hubId: dhakaHub?.id,
              vehicleType: VehicleType.MOTORBIKE,
              vehicleNumber: "DHK-METRO-HA-5555",
              currentZone: "Dhaka",
              isAvailable: true,
              maxCapacityKg: 35.0,
            },
          },
        },
      });
      console.log(`✅ Demo Courier created: ${courierEmail}`);
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSeed();

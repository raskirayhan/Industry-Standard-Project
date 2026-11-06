import { Role } from "@prisma/client";
import config from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
  try {
    const adminEmail = config.admin_email || "admin@courier.com";
    const adminName = config.admin_name || "Super Admin";
    const adminPassword = config.admin_password || "Admin@123456";

    const isAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });

    if (isAdminExist) {
      console.log("Super Admin Already Exists.");
      return;
    }

    const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        role: Role.ADMIN,
        password: hashedPassword,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Super Admin seeded successfully:", admin.email);
  } catch (error) {
    console.error("Error Seeding Super Admin:", error);
  }
};

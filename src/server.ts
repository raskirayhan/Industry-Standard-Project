import app from "./app";
import "dotenv/config";
import config from "./config";
import { prisma } from "./lib/prisma";
import { seedAdmin } from "./utils/seed";
import { connectRedis } from "./lib/redis";

const PORT = config.port || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database successfully.");

    await connectRedis();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

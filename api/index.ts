import app from "../src/app";
import { connectRedis } from "../src/lib/redis";
import { seedAdmin } from "../src/utils/seed";

// Initialize serverless connections
(async () => {
  try {
    await connectRedis();
    await seedAdmin();
  } catch (err) {
    console.warn("Serverless init warning:", err);
  }
})();

export default app;

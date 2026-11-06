import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
  username: config.redis_user || undefined,
  password: config.redis_password || undefined,
  socket: {
    host: config.redis_host || "localhost",
    port: Number(config.redis_port) || 6379,
  },
});

redisClient.on("error", (err) => {
  console.warn("Redis Client Notice:", err.message);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen && config.redis_host) {
    try {
      await redisClient.connect();
      console.log("Redis Connected Successfully");
    } catch (error) {
      console.warn("Redis connection skipped/failed:", error);
    }
  }
};

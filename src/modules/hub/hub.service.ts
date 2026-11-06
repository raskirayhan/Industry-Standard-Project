import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { generateHubCode } from "../../utils/hub";
import { AppError } from "../../errors/AppError";
import httpStatus from "http-status";
import {
  ICreateHubPayload,
  IHubFilterOptions,
  IUpdateHubPayload,
} from "./hub.interface";

const REDIS_HUBS_CACHE_KEY = "hubs:all";

const invalidateHubsCache = async () => {
  try {
    await redisClient.del([REDIS_HUBS_CACHE_KEY]);
  } catch (err) {
    console.warn("Failed to invalidate hubs Redis cache:", err);
  }
};

const createHubIntoDB = async (payload: ICreateHubPayload) => {
  let finalCode = payload.code?.toUpperCase().trim();

  if (!finalCode) {
    finalCode = await generateHubCode(payload.zone);
  } else {
    const existing = await prisma.hub.findUnique({
      where: { code: finalCode },
    });
    if (existing) {
      throw new AppError(httpStatus.CONFLICT, "Hub Code Has Already Been Used");
    }
  }

  const createdHub = await prisma.hub.create({
    data: {
      name: payload.name,
      code: finalCode,
      address: payload.address,
      zone: payload.zone,
      contactNo: payload.contactNo,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null,
    },
  });

  await invalidateHubsCache();
  return createdHub;
};

export const getAllHubsFromDB = async (filters: IHubFilterOptions) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const { searchTerm, zone, sortBy = "createdAt", sortOrder = "desc" } = filters;

  // Check Redis cache for standard unqualified listings
  const isDefaultQuery =
    !searchTerm && !zone && page === 1 && limit === 10 && sortBy === "createdAt";

  if (isDefaultQuery) {
    try {
      const cached = await redisClient.get(REDIS_HUBS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn("Redis get error for hubs:", err);
    }
  }

  const andConditions: any[] = [{ deletedAt: null }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { code: { contains: searchTerm, mode: "insensitive" } },
        { address: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (zone) {
    andConditions.push({
      zone: { contains: zone, mode: "insensitive" },
    });
  }

  const whereConditions = { AND: andConditions };

  const [hubs, total] = await Promise.all([
    prisma.hub.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.hub.count({ where: whereConditions }),
  ]);

  const response = {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: hubs,
  };

  if (isDefaultQuery) {
    try {
      await redisClient.set(REDIS_HUBS_CACHE_KEY, JSON.stringify(response), {
        expiration: {
          type: "EX",
          value: 3600, // 1 hour
        },
      });
    } catch (err) {
      console.warn("Redis set error for hubs:", err);
    }
  }

  return response;
};

export const getHubByIdFromDB = async (id: string) => {
  const hub = await prisma.hub.findFirst({
    where: { id, deletedAt: null },
  });

  if (!hub) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub Not Found");
  }

  return hub;
};

const updateHubInDB = async (id: string, payload: IUpdateHubPayload) => {
  const hub = await prisma.hub.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!hub) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub Not Found");
  }

  const updatedHub = await prisma.hub.update({
    where: { id },
    data: payload,
  });

  await invalidateHubsCache();
  return updatedHub;
};

const softDeleteHubInDB = async (id: string) => {
  const hub = await prisma.hub.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!hub) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub Not Found");
  }

  const deletedHub = await prisma.hub.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  await invalidateHubsCache();
  return deletedHub;
};

export const hubService = {
  createHubIntoDB,
  getAllHubsFromDB,
  getHubByIdFromDB,
  updateHubInDB,
  softDeleteHubInDB,
};

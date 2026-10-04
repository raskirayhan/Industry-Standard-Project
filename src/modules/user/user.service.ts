import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { IUpdateUserPayload, IUserFilterOptions } from "./user.interface";

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customer: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new Error("User profile not found.");
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const updateMyProfile = async (userId: string, payload: IUpdateUserPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new Error("User profile not found.");
  }

  if (payload.phone && payload.phone !== user.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existingPhone) {
      throw new Error("Phone number is already in use by another user.");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    include: {
      customer: true,
    },
  });

  const { password: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

const getAllUsers = async (filters: IUserFilterOptions) => {
  const { searchTerm, role } = filters;
  const andConditions: Prisma.UserWhereInput[] = [{ deletedAt: null }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (role) {
    andConditions.push({ role });
  }

  const whereConditions: Prisma.UserWhereInput = {
    AND: andConditions,
  };

  const users = await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users;
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      customer: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new Error("User not found.");
  }

  return user;
};

const softDeleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.deletedAt) {
    throw new Error("User not found or already deleted.");
  }

  const deletedUser = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      deletedAt: true,
    },
  });

  return deletedUser;
};

export const userService = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  softDeleteUser,
};

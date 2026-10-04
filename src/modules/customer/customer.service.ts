import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ICustomerFilterOptions, IUpdateCustomerPayload } from "./customer.interface";

const getMyCustomerProfile = async (userId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
        },
      },
    },
  });

  if (!customer || customer.deletedAt) {
    throw new Error("Customer profile not found.");
  }

  return customer;
};

const updateMyCustomerProfile = async (userId: string, payload: IUpdateCustomerPayload) => {
  const customer = await prisma.customer.findUnique({
    where: { userId },
  });

  if (!customer || customer.deletedAt) {
    throw new Error("Customer profile not found.");
  }

  const updatedCustomer = await prisma.customer.update({
    where: { userId },
    data: payload,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  return updatedCustomer;
};

const getAllCustomers = async (filters: ICustomerFilterOptions) => {
  const { city, district, searchTerm } = filters;
  const andConditions: Prisma.CustomerWhereInput[] = [{ deletedAt: null }];

  if (city) {
    andConditions.push({ city: { equals: city, mode: "insensitive" } });
  }

  if (district) {
    andConditions.push({ district: { equals: district, mode: "insensitive" } });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { city: { contains: searchTerm, mode: "insensitive" } },
        { district: { contains: searchTerm, mode: "insensitive" } },
        { defaultAddress: { contains: searchTerm, mode: "insensitive" } },
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { user: { phone: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  const customers = await prisma.customer.findMany({
    where: { AND: andConditions },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return customers;
};

const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  if (!customer || customer.deletedAt) {
    throw new Error("Customer not found.");
  }

  return customer;
};

const softDeleteCustomer = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer || customer.deletedAt) {
    throw new Error("Customer not found or already deleted.");
  }

  const deletedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return deletedCustomer;
};

export const customerService = {
  getMyCustomerProfile,
  updateMyCustomerProfile,
  getAllCustomers,
  getCustomerById,
  softDeleteCustomer,
};

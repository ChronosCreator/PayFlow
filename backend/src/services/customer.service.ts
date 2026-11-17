import prisma from "../config/prisma";

interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
}

export const createCustomer = async (
  merchantId: string,
  data: CreateCustomerInput
) => {
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      merchantId,
    },
  });

  return customer;
};

export const getMerchantCustomers = async (
  merchantId: string
) => {
  return prisma.customer.findMany({
    where: {
      merchantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateCustomer = async (
  merchantId: string,
  customerId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
  }
) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      merchantId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
  });
};

export const deleteCustomer = async (
  merchantId: string,
  customerId: string
) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      merchantId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  await prisma.customer.delete({
    where: {
      id: customerId,
    },
  });

  return customer;
};
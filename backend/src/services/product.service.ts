import prisma from "../config/prisma";

interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
}

export const createProduct = async (
  merchantId: string,
  data: CreateProductInput
) => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency ?? "INR",
      merchantId,
    },
  });

  return product;
};

export const getMerchantProducts = async (
  merchantId: string
) => {
  return prisma.product.findMany({
    where: {
      merchantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateProduct = async (
  merchantId: string,
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    active?: boolean;
  }
) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      merchantId,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.price !== undefined && {
        price: data.price,
      }),
      ...(data.currency !== undefined && {
        currency: data.currency,
      }),
      ...(data.active !== undefined && {
        active: data.active,
      }),
    },
  });
};

export const deleteProduct = async (
  merchantId: string,
  productId: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      merchantId,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await prisma.product.delete({
    where: {
      id: productId,
    },
  });

  return product;
};
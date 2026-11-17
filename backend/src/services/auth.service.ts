import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export const registerMerchant = async ({
  name,
  email,
  password,
}: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "MERCHANT",
      },
    });

    const merchant = await tx.merchant.create({
      data: {
        name,
        email,
        userId: user.id,
      },
    });

    return {
      userId: user.id,
      merchantId: merchant.id,
      name: merchant.name,
      email: merchant.email,
    };
  });

  return result;
};

export const loginMerchant = async (
  email: string,
  password: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      merchant: true,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.merchant) {
    throw new Error("MERCHANT_NOT_FOUND");
  }

  const token = generateToken({
    userId: user.id,
    merchantId: user.merchant.id,
    role: user.role,
  });

  return {
    userId: user.id,
    merchantId: user.merchant.id,
    name: user.merchant.name,
    email: user.email,
    token,
  };
};
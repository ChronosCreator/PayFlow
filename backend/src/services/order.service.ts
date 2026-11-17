
import prisma from "../config/prisma";
import { RazorpayProvider } from "./razorpay.provider";

const paymentProvider = new RazorpayProvider();

interface CreateOrderInput {
  customerId: string;
  amount: number;
  currency?: string;
  idempotencyKey: string;
}

export const createOrder = async (
  merchantId: string,
  data: CreateOrderInput
) => {
  const existingOrder = await prisma.order.findFirst({
    where: {
      merchantId,
      idempotencyKey: data.idempotencyKey,
    },
    include: {
      payments: true,
    },
  });

  if (existingOrder) return existingOrder;

  const customer = await prisma.customer.findFirst({
    where: {
      id: data.customerId,
      merchantId,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const orderNumber = `PF-${Date.now()}-${Math.floor(
    Math.random() * 10000
  )}`;

  const providerOrder = await paymentProvider.createOrder(
    data.amount,
    data.currency ?? "INR",
    orderNumber
  );

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        idempotencyKey: data.idempotencyKey,
        amount: data.amount,
        currency: data.currency ?? "INR",
        status: "CREATED",
        merchantId,
        customerId: data.customerId,
      },
    });

    await tx.payment.create({
      data: {
        amount: data.amount,
        currency: data.currency ?? "INR",
        status: "CREATED",
        provider: "RAZORPAY",
        providerOrderId: providerOrder.providerOrderId,
        orderId: order.id,
        merchantId,
        customerId: data.customerId,
      },
    });

    return order;
  });

  return prisma.order.findUnique({
    where: { id: result.id },
    include: {
      customer: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getMerchantOrders = async (
  merchantId: string
) => {
  return prisma.order.findMany({
    where: { merchantId },
    include: {
      customer: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const retryOrderPayment = async (
  merchantId: string,
  orderId: string
) => {
  // Generate a unique reservation token for this request.
  const reservationToken = crypto.randomUUID();
  const lockUntil = new Date(Date.now() + 2 * 60 * 1000);

  // Reserve the order while holding its PostgreSQL row lock.
  const reservation = await prisma.$transaction(async (tx) => {
    const orders = await tx.$queryRaw<
      { id: string; status: string; retryLockUntil: Date | null }[]
    >`
      SELECT "id", "status", "retryLockUntil"
      FROM "Order"
      WHERE "id" = ${orderId}
        AND "merchantId" = ${merchantId}
      FOR UPDATE
    `;

    const order = orders[0];

    if (!order) throw new Error("ORDER_NOT_FOUND");

    if (order.status === "PAID") {
      throw new Error("ORDER_ALREADY_PAID");
    }

    if (order.status === "CANCELLED") {
      throw new Error("ORDER_CANCELLED");
    }

    if (
      order.retryLockUntil &&
      order.retryLockUntil > new Date()
    ) {
      throw new Error("ORDER_RETRY_IN_PROGRESS");
    }

    const latestPayment = await tx.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestPayment || latestPayment.status !== "FAILED") {
      throw new Error("ORDER_NOT_ELIGIBLE_FOR_RETRY");
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        retryLockUntil: lockUntil,
      },
    });

    return {
      amount: latestPayment.amount,
      currency: latestPayment.currency,
      customerId: latestPayment.customerId,
    };
  });

  try {
    // Create the external Razorpay order outside the DB transaction.
    const providerOrder = await paymentProvider.createOrder(
      Number(reservation.amount),
      reservation.currency,
      `PF-R-${reservationToken}`
    );

    const payment = await prisma.$transaction(async (tx) => {
      // Verify that this request still owns the reservation.
      const orders = await tx.$queryRaw<
        { id: string; status: string }[]
      >`
        SELECT "id", "status"
        FROM "Order"
        WHERE "id" = ${orderId}
          AND "merchantId" = ${merchantId}
          AND "retryLockUntil" = ${lockUntil}
        FOR UPDATE
      `;

      const order = orders[0];

      if (!order || order.status === "PAID" || order.status === "CANCELLED") {
        throw new Error("ORDER_RETRY_RESERVATION_EXPIRED");
      }

      const newPayment = await tx.payment.create({
        data: {
          amount: reservation.amount,
          currency: reservation.currency,
          status: "CREATED",
          provider: "RAZORPAY",
          providerOrderId: providerOrder.providerOrderId,
          orderId,
          merchantId,
          customerId: reservation.customerId,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CREATED",
          retryLockUntil: null,
        },
      });

      return newPayment;
    });

    return { payment };
  } catch (error) {
    // Only release the reservation belonging to this request.
    await prisma.order.updateMany({
      where: {
        id: orderId,
        merchantId,
        retryLockUntil: lockUntil,
      },
      data: {
        retryLockUntil: null,
      },
    });

    throw error;
  }
};

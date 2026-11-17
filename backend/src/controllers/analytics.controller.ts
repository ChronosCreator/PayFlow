
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../config/prisma";

export const getAnalytics = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const merchantId = req.user.merchantId;

    const [
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      successfulRevenue,
      recentPayments,
      monthlyPayments,
    ] = await Promise.all([
      prisma.payment.count({
        where: { merchantId },
      }),

      prisma.payment.count({
        where: { merchantId, status: "SUCCESS" },
      }),

      prisma.payment.count({
        where: { merchantId, status: "PENDING" },
      }),

      prisma.payment.count({
        where: { merchantId, status: "FAILED" },
      }),

      prisma.payment.aggregate({
        where: {
          merchantId,
          status: "SUCCESS",
        },
        _sum: { amount: true },
      }),

      prisma.payment.findMany({
        where: { merchantId },
        include: {
          customer: {
            select: { name: true, email: true },
          },
          order: {
            select: { orderNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.payment.findMany({
        where: {
          merchantId,
          status: "SUCCESS",
          createdAt: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1
            ),
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
    ]);

    const revenueByMonth = Array.from(
      { length: 6 },
      (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));

        return {
          month: date.toLocaleString("en-IN", {
            month: "short",
            year: "numeric",
          }),
          revenue: 0,
        };
      }
    );

    monthlyPayments.forEach((payment) => {
      const paymentDate = new Date(payment.createdAt);

      const monthIndex =
        (paymentDate.getFullYear() -
          new Date().getFullYear()) *
          12 +
        paymentDate.getMonth() -
        (new Date().getMonth() - 5);

      if (monthIndex >= 0 && monthIndex < 6) {
        revenueByMonth[monthIndex].revenue +=
          Number(payment.amount);
      }
    });

    const successRate =
      totalPayments > 0
        ? Number(
            ((successfulPayments / totalPayments) * 100).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        totalPayments,
        successfulPayments,
        pendingPayments,
        failedPayments,
        successfulRevenue: Number(
          successfulRevenue._sum.amount ?? 0
        ),
        successRate,
        revenueByMonth,
        recentPayments,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch analytics",
    });
  }
};

import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";

import {
  createCustomer,
  getMerchantCustomers,
  updateCustomer,
  deleteCustomer,
} from "../services/customer.service";

export const create = async (
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

    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required",
      });
    }

    const customer = await createCustomer(
      req.user.merchantId,
      {
        name,
        email,
        phone,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Customer creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};

export const getAll = async (
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

    const customers = await getMerchantCustomers(
      req.user.merchantId
    );

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

export const update = async (
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

    const customerId = String(req.params.id);

    const { name, email, phone } = req.body;

    const customer = await updateCustomer(
      req.user.merchantId,
      customerId,
      {
        name,
        email,
        phone,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Customer update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

export const remove = async (
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

    const customerId = String(req.params.id);

    await deleteCustomer(
      req.user.merchantId,
      customerId
    );

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Customer deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};
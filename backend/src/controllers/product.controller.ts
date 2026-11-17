import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  createProduct,
  getMerchantProducts,
  updateProduct,
  deleteProduct,
} from "../services/product.service";

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

    const {
      name,
      description,
      price,
      currency,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    const product = await createProduct(
      req.user.merchantId,
      {
        name,
        description,
        price: Number(price),
        currency,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Product creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
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

    const products = await getMerchantProducts(
      req.user.merchantId
    );

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
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

    const productId = String(req.params.id);

    const {
      name,
      description,
      price,
      currency,
      active,
    } = req.body;

    if (price !== undefined && Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    const product = await updateProduct(
  req.user.merchantId,
  productId,
      {
        name,
        description,
        price:
          price !== undefined ? Number(price) : undefined,
        currency,
        active,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.error("Product update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
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

    const productId = String(req.params.id);

    await deleteProduct(
      req.user.merchantId,
      productId
    );

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.error("Product deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  create,
  getAll,
  retry,
} from "../controllers/order.controller";

const router = Router();

router.post("/", authenticate, create);
router.get("/", authenticate, getAll);
router.post("/:orderId/retry", authenticate, retry);

export default router;
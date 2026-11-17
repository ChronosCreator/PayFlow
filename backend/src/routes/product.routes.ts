import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  create,
  getAll,
  update,
  remove,
} from "../controllers/product.controller";

const router = Router();

router.post("/", authenticate, create);
router.patch("/:id", authenticate, update);
router.get("/", authenticate, getAll);
router.delete("/:id", authenticate, remove);
export default router;
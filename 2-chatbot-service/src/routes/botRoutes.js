import { Router } from "express";
import { askBot } from "../controllers/botController.js";

const router = Router();

router.post("/ask", askBot);

export default router;

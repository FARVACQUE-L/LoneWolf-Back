import { Router } from "express";
import { roll } from "../../domain/dice";
import { requireAuth } from "../../middlewares/auth";

export const randomRouter = Router();

randomRouter.get("/random-table", requireAuth, (_req, res) => {
	res.json({ draw: roll() });
});

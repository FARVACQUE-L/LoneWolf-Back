import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as service from "./discipline.service";

export const disciplinesRouter = Router();

disciplinesRouter.get("/", requireAuth, async (_req, res) => {
	const disciplines = await service.list();
	res.json({ disciplines });
});

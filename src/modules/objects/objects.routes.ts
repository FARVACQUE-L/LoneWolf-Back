import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as service from "./objects.service";

export const objectsRouter = Router();
objectsRouter.use(requireAuth);

objectsRouter.get("/", async (_req, res) => {
	const objects = await service.list();
	res.json({ objects });
});

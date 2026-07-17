import { Router } from "express";

import { getUserId, requireAuth } from "../../middlewares/auth";
import { idParamSchema } from "../characters/character.schema";
import { nextRoundSchema, startFightSchema } from "./fight.schema";
import * as fightService from "./fight.service";

export const fightsRouter = Router();

fightsRouter.post("/characters/:id/fights", requireAuth, async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const body = startFightSchema.parse(req.body);
	const fight = await fightService.startFight(id, getUserId(req), body);
	res.status(201).json(fight);
});

fightsRouter.post("/fights/:id/rounds", requireAuth, async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const body = nextRoundSchema.parse(req.body ?? {});
	const result = await fightService.nextRound(id, getUserId(req), body);
	res.status(201).json(result);
});

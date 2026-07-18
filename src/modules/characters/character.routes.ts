import { Router } from "express";

import { getUserId, requireAuth } from "../../middlewares/auth";
import {
	addObjectSchema,
	createCharacterSchema,
	customObjectSchema,
	damageSchema,
	equipSchema,
	goldSchema,
	idParamSchema,
	lineParamSchema,
	masterySchema,
	updateCharacterSchema,
} from "./character.schema";
import * as service from "./character.service";

export const charactersRouter = Router();

charactersRouter.use(requireAuth);

charactersRouter.post("/", async (req, res) => {
	const input = createCharacterSchema.parse(req.body);
	const character = await service.create(getUserId(req), input);
	res.status(201).json({ character });
});

charactersRouter.get("/", async (req, res) => {
	const characters = await service.list(getUserId(req));
	res.json({ characters });
});

charactersRouter.get("/:id", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const character = await service.getOne(id, getUserId(req));
	res.json({ character });
});

charactersRouter.patch("/:id", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const input = updateCharacterSchema.parse(req.body);
	const character = await service.update(id, getUserId(req), input);
	res.json({ character });
});

charactersRouter.delete("/:id", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	await service.remove(id, getUserId(req));
	res.status(204).end();
});

charactersRouter.post("/:id/damage", async (req, res) => {
	const idUser = getUserId(req);
	const { id } = idParamSchema.parse(req.params);
	const { amount, newFight } = damageSchema.parse(req.body);
	const result = await service.damageCharacter(id, idUser, amount, newFight);
	res.status(200).json(result);
});

charactersRouter.post("/:id/replay", async (req, res) => {
	const idUser = getUserId(req);
	const { id } = idParamSchema.parse(req.params);
	const result = await service.replayCharacter(id, idUser);
	res.status(200).json(result);
});

charactersRouter.post("/:id/abandon", async (req, res) => {
	const idUser = getUserId(req);
	const { id } = idParamSchema.parse(req.params);
	const result = await service.abandonCharacter(id, idUser);
	res.status(200).json(result);
});

charactersRouter.post("/:id/objects", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const { objectId, quantity } = addObjectSchema.parse(req.body);
	const character = await service.addObject(
		id,
		getUserId(req),
		objectId,
		quantity,
	);
	res.status(201).json({ character });
});

charactersRouter.post("/:id/objects/custom", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const { name, bonusSkill } = customObjectSchema.parse(req.body);
	const character = await service.addCustomObject(
		id,
		getUserId(req),
		name,
		bonusSkill,
	);
	res.status(201).json({ character });
});

charactersRouter.delete("/:id/lines/:lineId", async (req, res) => {
	const { id, lineId } = lineParamSchema.parse(req.params);
	const character = await service.removeLine(id, getUserId(req), lineId);
	res.status(200).json({ character });
});

charactersRouter.post("/:id/lines/:lineId/use", async (req, res) => {
	const { id, lineId } = lineParamSchema.parse(req.params);
	const result = await service.useLine(id, getUserId(req), lineId);
	res.status(200).json(result);
});

charactersRouter.patch("/:id/lines/:lineId/equip", async (req, res) => {
	const { id, lineId } = lineParamSchema.parse(req.params);
	const { equipped } = equipSchema.parse(req.body);
	const character = await service.equipLine(
		id,
		getUserId(req),
		lineId,
		equipped,
	);
	res.status(200).json({ character });
});

charactersRouter.patch("/:id/lines/:lineId/mastery", async (req, res) => {
	const { id, lineId } = lineParamSchema.parse(req.params);
	const { mastered } = masterySchema.parse(req.body);
	const character = await service.setMastery(
		id,
		getUserId(req),
		lineId,
		mastered,
	);
	res.status(200).json({ character });
});

charactersRouter.patch("/:id/lines/:lineId/drop", async (req, res) => {
	const { id, lineId } = lineParamSchema.parse(req.params);
	const character = await service.dropOneLine(id, getUserId(req), lineId);
	res.status(200).json({ character });
});

charactersRouter.post("/:id/heal", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const result = await service.heal(id, getUserId(req));
	res.status(200).json(result);
});

charactersRouter.post("/:id/meal", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const result = await service.skipMeal(id, getUserId(req));
	res.status(200).json(result);
});

charactersRouter.post("/:id/gold", async (req, res) => {
	const { id } = idParamSchema.parse(req.params);
	const { delta } = goldSchema.parse(req.body);
	const result = await service.updateGold(id, getUserId(req), delta);
	res.status(200).json(result);
});

import { z } from "zod";

export const idParamSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const createCharacterSchema = z.object({
	name: z.string().trim().min(1, "Le nom est requis.").max(80),
	disciplineIds: z
		.array(z.number().int().positive())
		.length(5, "Choisis exactement 5 disciplines.")
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "Une même discipline est choisie deux fois.",
		}),
	objectIds: z.array(z.number().int().positive()).default([]),
});

export const updateCharacterSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		gold: z.number().int().min(0).max(50).optional(),
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: "Aucun champ à mettre à jour.",
	});

export const damageSchema = z.object({
	amount: z
		.number({ error: "amount doit être un nombre." })
		.int("amount doit être un entier.")
		.positive("amount doit être strictement positif.")
		.max(999, "amount est déraisonnablement grand."),
	newFight: z.boolean().optional().default(false),
});

export const objectParamSchema = z.object({
	id: z.coerce.number().int().positive(),
	objectId: z.coerce.number().int().positive(),
});

export const addObjectSchema = z.object({
	objectId: z.coerce.number().int().positive(),
	quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const equipSchema = z.object({
	equipped: z.boolean(),
});

export const lineParamSchema = z.object({
	id: z.coerce.number().int().positive(),
	lineId: z.coerce.number().int().positive(),
});

export const customObjectSchema = z.object({
	name: z.string().trim().min(1).max(80),
	bonusSkill: z.coerce.number().int().min(0).max(8).default(0),
});

export const masterySchema = z.object({ mastered: z.boolean() });

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type DamageInput = z.infer<typeof damageSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;

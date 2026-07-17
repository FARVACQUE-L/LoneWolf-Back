// fight.schema.ts
import { z } from "zod";

export const startFightSchema = z.object({
	enemyName: z.string().min(1).max(120).optional(),
	enemyCombatSkill: z
		.number({ error: "Habileté de l'adversaire requise." })
		.int()
		.min(1)
		.max(99),
	enemyEndurance: z
		.number({ error: "Endurance de l'adversaire requise." })
		.int()
		.min(1)
		.max(99),
});
export type StartFightInput = z.infer<typeof startFightSchema>;

export const nextRoundSchema = z.object({
	disciplineBonus: z.number().int().min(0).max(10).optional(),
});
export type NextRoundInput = z.infer<typeof nextRoundSchema>;

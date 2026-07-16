export const RULES = {
	DISCIPLINES_AT_START: 5,
	MAX_WEAPONS: 2,
	MAX_BACKPACK: 8,
	MAX_GOLD: 50,
	BASE_FIGHT_SKILL: 10,
	BASE_ENDURANCE: 20,
} as const;

export interface StartingStats {
	fightSkill: number;
	endurance: number;
	enduranceMax: number;
	gold: number;
}

export function rollStartingStats(roll: () => number): StartingStats {
	const fightSkill = RULES.BASE_FIGHT_SKILL + roll();
	const enduranceMax = RULES.BASE_ENDURANCE + roll();
	const gold = roll();
	return { fightSkill, endurance: enduranceMax, enduranceMax, gold };
}

export function checkInventoryLimits(
	types: ReadonlyArray<"WEAPON" | "BACKPACK" | "SPECIAL">,
): string | null {
	const weapons = types.filter((t) => t === "WEAPON").length;
	const backpack = types.filter((t) => t === "BACKPACK").length;

	if (weapons > RULES.MAX_WEAPONS) {
		return `Maximum ${RULES.MAX_WEAPONS} armes au départ (reçu ${weapons}).`;
	}
	if (backpack > RULES.MAX_BACKPACK) {
		return `Maximum ${RULES.MAX_BACKPACK} objets dans le sac à dos (reçu ${backpack}).`;
	}
	return null;
}

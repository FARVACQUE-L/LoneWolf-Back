export type Loss = number | "K";

export type Cell = readonly [enemy: Loss, player: Loss];

export const COMBAT_RESULTS_TABLE: Readonly<Record<number, readonly Cell[]>> = {
	1: [
		[0, "K"],
		[0, "K"],
		[0, 8],
		[0, 6],
		[1, 6],
		[2, 5],
		[3, 5],
		[4, 5],
		[5, 4],
		[6, 4],
		[7, 4],
		[8, 3],
		[9, 3],
	],
	2: [
		[0, "K"],
		[0, 8],
		[0, 7],
		[1, 6],
		[2, 5],
		[3, 5],
		[4, 4],
		[5, 4],
		[6, 4],
		[7, 4],
		[8, 3],
		[9, 3],
		[10, 2],
	],
	3: [
		[0, 8],
		[0, 7],
		[1, 6],
		[2, 5],
		[3, 5],
		[4, 4],
		[5, 4],
		[6, 3],
		[7, 3],
		[8, 2],
		[9, 2],
		[10, 2],
		[11, 2],
	],
	4: [
		[0, 8],
		[1, 7],
		[2, 6],
		[3, 5],
		[4, 4],
		[5, 4],
		[6, 3],
		[7, 3],
		[8, 2],
		[9, 2],
		[10, 2],
		[11, 2],
		[12, 2],
	],
	5: [
		[1, 7],
		[2, 6],
		[3, 5],
		[4, 4],
		[5, 4],
		[6, 3],
		[7, 2],
		[8, 2],
		[9, 2],
		[10, 2],
		[11, 1],
		[12, 1],
		[14, 1],
	],
	6: [
		[2, 6],
		[3, 6],
		[4, 5],
		[5, 4],
		[6, 3],
		[7, 2],
		[8, 2],
		[9, 2],
		[10, 2],
		[11, 1],
		[12, 1],
		[14, 1],
		[16, 1],
	],
	7: [
		[3, 5],
		[4, 5],
		[5, 4],
		[6, 3],
		[7, 2],
		[8, 2],
		[9, 1],
		[10, 1],
		[11, 1],
		[12, 0],
		[14, 0],
		[16, 0],
		[18, 0],
	],
	8: [
		[4, 4],
		[5, 4],
		[6, 3],
		[7, 2],
		[8, 1],
		[9, 1],
		[10, 0],
		[11, 0],
		[12, 0],
		[14, 0],
		[16, 0],
		[18, 0],
		["K", 0],
	],
	9: [
		[5, 3],
		[6, 3],
		[7, 2],
		[8, 0],
		[9, 0],
		[10, 0],
		[11, 0],
		[12, 0],
		[14, 0],
		[16, 0],
		[18, 0],
		["K", 0],
		["K", 0],
	],
	0: [
		[6, 0],
		[7, 0],
		[8, 0],
		[9, 0],
		[10, 0],
		[11, 0],
		[12, 0],
		[14, 0],
		[16, 0],
		[18, 0],
		["K", 0],
		["K", 0],
		["K", 0],
	],
};

export function combatRatioToColumn(ratio: number): number {
	if (ratio <= -11) return 0;
	if (ratio >= 11) return 12;
	if (ratio === 0) return 6;
	if (ratio < 0) return 6 - Math.ceil(Math.abs(ratio) / 2);
	return 6 + Math.ceil(ratio / 2);
}

export interface RoundInput {
	characterCombatSkill: number;
	enemyCombatSkill: number;
	draw: number;
}

export interface RoundOutcome {
	combatRatio: number;
	draw: number;
	enemyLoss: Loss;
	playerLoss: Loss;
}

export function resolveRound(input: RoundInput): RoundOutcome {
	if (!Number.isInteger(input.draw) || input.draw < 0 || input.draw > 9) {
		throw new Error(`Invalid draw: ${input.draw} (expected 0–9)`);
	}
	const combatRatio = input.characterCombatSkill - input.enemyCombatSkill;
	const column = combatRatioToColumn(combatRatio);
	const [enemyLoss, playerLoss] = COMBAT_RESULTS_TABLE[input.draw][column];
	return { combatRatio, draw: input.draw, enemyLoss, playerLoss };
}

export function applyLoss(current: number, loss: Loss): number {
	if (loss === "K") return 0;
	return Math.max(0, current - loss);
}

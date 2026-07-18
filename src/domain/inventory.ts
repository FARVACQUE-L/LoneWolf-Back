import type { CharacterStatus, ObjectType } from "../db/types";
import { BadRequest, Conflict } from "../errors";

export const MASTERY_BONUS = 2;
export const MAX_WEAPONS = 2;
export const MAX_BACKPACK = 8;
export const HEALING_REGEN = 1;
export const MISSED_MEAL_LOSS = 3;
export interface MealResult extends ConsumeResult {
	status: CharacterStatus;
}

function normalize(name: string): string {
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

const ENDURANCE_RESTORE: Readonly<Record<string, number>> = {
	"potion de laumspur": 4,
	"herbes de guerison": 2,
	"gateau de miel": 3,
};

export function healingRestore(objectName: string): number {
	return ENDURANCE_RESTORE[normalize(objectName)] ?? 0;
}

export function applyHealing(
	endurance: number,
	enduranceMax: number,
): ConsumeResult {
	const newEndurance = Math.min(enduranceMax, endurance + HEALING_REGEN);
	return { enduranceDelta: newEndurance - endurance, newEndurance };
}

export function applyMissedMeal(endurance: number): MealResult {
	const newEndurance = Math.max(0, endurance - MISSED_MEAL_LOSS);
	return {
		enduranceDelta: newEndurance - endurance,
		newEndurance,
		status: newEndurance > 0 ? "ALIVE" : "DEAD",
	};
}

export interface ConsumeResult {
	enduranceDelta: number;
	newEndurance: number;
}

export function effectiveFightSkill(
	base: number,
	lines: ReadonlyArray<{ equipped: boolean; bonusSkill: number }>,
): number {
	return lines.reduce(
		(total, l) => total + (l.equipped ? l.bonusSkill : 0),
		base,
	);
}

export function assertCanMaster(
	type: ObjectType,
	hasWeaponskill: boolean,
): void {
	if (type !== "WEAPON") {
		throw BadRequest("Seule une arme peut être maîtrisée.");
	}
	if (!hasWeaponskill) {
		throw Conflict(
			"Le personnage ne possède pas la discipline Maîtrise des armes.",
		);
	}
}

export function assertAlive(status: CharacterStatus): void {
	if (status !== "ALIVE") {
		throw Conflict(
			"Le personnage doit être en vie pour modifier son inventaire.",
		);
	}
}

export function assertCanCarry(
	type: ObjectType,
	currentQuantity: number,
	adding: number,
): void {
	if (type === "WEAPON" && currentQuantity + adding > MAX_WEAPONS) {
		throw Conflict(`Deux armes maximum (${MAX_WEAPONS}).`);
	}
	if (type === "BACKPACK" && currentQuantity + adding > MAX_BACKPACK) {
		throw Conflict(`Sac à dos plein (${MAX_BACKPACK} objets maximum).`);
	}
}

export function assertConsumable(type: ObjectType): void {
	if (type !== "BACKPACK") {
		throw BadRequest("Seuls les objets du sac à dos peuvent être utilisés.");
	}
}

export function assertEquipable(type: ObjectType): void {
	if (type === "BACKPACK") {
		throw BadRequest("Cet objet ne peut pas être équipé.");
	}
}

export function applyConsume(
	objectName: string,
	endurance: number,
	enduranceMax: number,
): ConsumeResult {
	const restore = ENDURANCE_RESTORE[normalize(objectName)] ?? 0;
	const newEndurance = Math.min(enduranceMax, endurance + restore);
	return { enduranceDelta: newEndurance - endurance, newEndurance };
}

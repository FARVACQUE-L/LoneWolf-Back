import type { CharacterStatus } from "../db/types";
import { BadRequest, Conflict, UnprocessableEntity } from "../errors";

export function assertCanAct(status: CharacterStatus): void {
	if (status === "DEFEATED") {
		throw Conflict(
			"Ton Endurance est tombée à zéro. Reprends le combat depuis ta dernière sauvegarde, ou abandonne l’aventure.",
			"CHOICE_REQUIRED",
		);
	}
	if (status === "DEAD") {
		throw Conflict(
			"Ce Seigneur Kaï est mort. Sa fiche est en lecture seule.",
			"CHARACTER_DEAD",
		);
	}
}

export function assertAwaitingChoice(status: CharacterStatus): void {
	if (status !== "DEFEATED") {
		throw Conflict(
			"Aucun choix en attente pour ce personnage.",
			"NO_PENDING_CHOICE",
		);
	}
}

export function applyDamage(
	currentEndurance: number,
	damage: number,
): { currentEndurance: number; status: CharacterStatus } {
	if (!Number.isInteger(damage) || damage < 0) {
		throw BadRequest(
			"Les dégâts doivent être un entier positif.",
			"INVALID_DAMAGE",
		);
	}

	const remaining = Math.max(0, currentEndurance - damage);
	return {
		currentEndurance: remaining,
		status: remaining > 0 ? "ALIVE" : "DEFEATED",
	};
}

export interface SnapshotInventoryLine {
	objectId: number;
	quantity: number;
	equipped: boolean;
}

export interface CharacterSnapshot {
	fightSkill: number;
	endurance: number;
	enduranceMax: number;
	gold: number;
	disciplines: number[];
	inventory: SnapshotInventoryLine[];
}

export function buildSnapshot(source: {
	fightSkill: number;
	endurance: number;
	enduranceMax: number;
	gold: number;
	disciplines: number[];
	inventory: SnapshotInventoryLine[];
}): CharacterSnapshot {
	return {
		fightSkill: source.fightSkill,
		endurance: source.endurance,
		enduranceMax: source.enduranceMax,
		gold: source.gold,
		disciplines: [...source.disciplines],
		inventory: source.inventory.map((l) => ({
			objectId: l.objectId,
			quantity: l.quantity,
			equipped: l.equipped,
		})),
	};
}

export function assertValidSnapshot(
	value: unknown,
): asserts value is CharacterSnapshot {
	const s = value as Partial<CharacterSnapshot> | null;

	const ok =
		!!s &&
		Number.isFinite(s.fightSkill) &&
		Number.isFinite(s.endurance) &&
		(s.endurance as number) > 0 &&
		Number.isFinite(s.enduranceMax) &&
		Number.isFinite(s.gold) &&
		Array.isArray(s.disciplines) &&
		Array.isArray(s.inventory);

	if (!ok) {
		throw UnprocessableEntity(
			"Sauvegarde illisible ou corrompue.",
			"INVALID_SNAPSHOT",
		);
	}
}

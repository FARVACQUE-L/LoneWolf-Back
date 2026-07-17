import { transaction } from "../../db/pool";
import {
	type CharacterRow,
	type CharacterSheet,
	toBool,
	toCharacterSummary,
} from "../../db/types";
import {
	applyDamage,
	assertAwaitingChoice,
	assertCanAct,
	assertValidSnapshot,
	buildSnapshot,
} from "../../domain/combat";
import { roll } from "../../domain/dice";
import * as inventory from "../../domain/inventory";
import { checkInventoryLimits, rollStartingStats } from "../../domain/rules";
import {
	BadRequest,
	Conflict,
	NotFound,
	UnprocessableEntity,
} from "../../errors";

import * as repo from "./character.repository";

import type {
	CreateCharacterInput,
	UpdateCharacterInput,
} from "./character.schema";

async function buildSheet(row: CharacterRow): Promise<CharacterSheet> {
	const [disciplines, objects] = await Promise.all([
		repo.findDisciplines(row.id),
		repo.findObjects(row.id),
	]);

	const inventory = objects.map((o) => ({
		id: o.line_id,
		objectId: o.id_object,
		name: o.name,
		type: o.type,
		quantity: o.quantity,
		equipped: toBool(o.equipped),
		bonusSkill: o.bonus_skill,
	}));

	const summary = toCharacterSummary(row);

	return {
		...summary,
		effectiveFightSkill: inventory.reduce(
			(t, o) => t + (o.equipped ? o.bonusSkill : 0),
			summary.fightSkill,
		),
		disciplines: disciplines.map((d) => ({
			id: d.id_discipline,
			name: d.name,
			description: d.description,
		})),
		inventory,
	};
}

export async function create(
	idUser: number,
	input: CreateCharacterInput,
): Promise<CharacterSheet> {
	const found = await repo.findExistingDisciplineIds(input.disciplineIds);
	if (found.length !== input.disciplineIds.length) {
		throw BadRequest(
			"Une ou plusieurs disciplines sont inconnues.",
			"UNKNOWN_DISCIPLINE",
		);
	}

	const objectIds = [...new Set(input.objectIds)];
	if (objectIds.length > 0) {
		const rows = await repo.findObjectTypesByIds(objectIds);
		if (rows.length !== objectIds.length) {
			throw BadRequest(
				"Un ou plusieurs objets sont inconnus.",
				"UNKNOWN_OBJECT",
			);
		}
		const violation = checkInventoryLimits(rows.map((r) => r.type));
		if (violation) throw UnprocessableEntity(violation);
	}

	const stats = rollStartingStats(roll);

	const id = await transaction(async (cx) => {
		const newId = await repo.insertCharacterTx(cx, {
			idUser,
			name: input.name,
			fightSkill: stats.fightSkill,
			endurance: stats.endurance,
			enduranceMax: stats.enduranceMax,
			gold: stats.gold,
		});
		await repo.insertDisciplinesTx(cx, newId, input.disciplineIds);
		await repo.insertObjectsTx(cx, newId, objectIds);
		return newId;
	});

	const row = await repo.findOwned(id, idUser);
	if (!row) throw NotFound("Personnage introuvable après création.");
	return buildSheet(row);
}

export async function list(idUser: number) {
	const rows = await repo.listByUser(idUser);
	return rows.map(toCharacterSummary);
}

export async function getOne(
	id: number,
	idUser: number,
): Promise<CharacterSheet> {
	const row = await repo.findOwned(id, idUser);
	if (!row) throw NotFound("Personnage introuvable.");
	return buildSheet(row);
}

export async function update(
	id: number,
	idUser: number,
	input: UpdateCharacterInput,
): Promise<CharacterSheet> {
	const row = await repo.findOwned(id, idUser);
	if (!row) throw NotFound("Personnage introuvable.");
	if (row.status !== "ALIVE") {
		throw UnprocessableEntity(
			"Ce personnage est en lecture seule (vaincu ou mort).",
			"CHARACTER_LOCKED",
		);
	}
	await repo.updateOwned(id, idUser, input);
	const updated = await repo.findOwned(id, idUser);
	if (!updated) throw NotFound("Personnage introuvable.");
	return buildSheet(updated);
}

export async function remove(id: number, idUser: number): Promise<void> {
	const affected = await repo.deleteOwned(id, idUser);
	if (affected === 0) throw NotFound("Personnage introuvable.");
}

async function snapshotBeforeFight(
	idCharacter: number,
	vitals: repo.CharacterVitals,
): Promise<void> {
	const [disciplines, inventory] = await Promise.all([
		repo.findDisciplineIds(idCharacter),
		repo.findInventoryLines(idCharacter),
	]);

	const snapshot = buildSnapshot({
		fightSkill: vitals.fightSkill,
		endurance: vitals.endurance,
		enduranceMax: vitals.enduranceMax,
		gold: vitals.gold,
		disciplines,
		inventory,
	});

	await repo.insertSave(idCharacter, snapshot);
}

export async function checkpoint(
	idCharacter: number,
	idUser: number,
): Promise<void> {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	assertCanAct(vitals.status);
	await snapshotBeforeFight(idCharacter, vitals);
}

export async function damageCharacter(
	idCharacter: number,
	idUser: number,
	amount: number,
	newFight: boolean,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");

	assertCanAct(vitals.status);

	if (newFight) {
		await snapshotBeforeFight(idCharacter, vitals);
	}

	const { currentEndurance, status } = applyDamage(vitals.endurance, amount);
	await repo.updateVitals(idCharacter, idUser, {
		endurance: currentEndurance,
		status,
	});

	return {
		endurance: currentEndurance,
		enduranceMax: vitals.enduranceMax,
		status,
		choiceRequired: status === "DEFEATED",
	};
}

export async function replayCharacter(idCharacter: number, idUser: number) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");

	assertAwaitingChoice(vitals.status);

	const snapshot = await repo.findLatestSnapshot(idCharacter);
	if (snapshot === null) {
		throw Conflict(
			"Aucune sauvegarde à restaurer : ce combat était sans filet.",
			"NO_SAVE",
		);
	}
	assertValidSnapshot(snapshot);

	await repo.restoreFromSnapshot(idCharacter, idUser, snapshot);
	return { status: "ALIVE" as const, endurance: snapshot.endurance };
}

export async function abandonCharacter(idCharacter: number, idUser: number) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");

	assertAwaitingChoice(vitals.status);

	await repo.updateStatus(idCharacter, idUser, "DEAD");
	return { status: "MORT" as const };
}

export async function addObject(
	idCharacter: number,
	idUser: number,
	idObject: number,
	quantity: number,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const object = await repo.findObjectById(idObject);
	if (!object) throw NotFound("Objet introuvable.");

	const current = await repo.sumQuantityByType(idCharacter, object.type);
	inventory.assertCanCarry(object.type, current, quantity);

	await repo.addObject(idCharacter, idObject, quantity);
	return getOne(idCharacter, idUser);
}

export async function addCustomObject(
	idCharacter: number,
	idUser: number,
	name: string,
	bonusSkill: number,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	await repo.insertCustomObject(idCharacter, name, bonusSkill);
	return getOne(idCharacter, idUser);
}

export async function removeLine(
	idCharacter: number,
	idUser: number,
	lineId: number,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const line = await repo.findLineById(lineId, idCharacter);
	if (!line) throw NotFound("Cet objet n'est pas dans l'inventaire.");

	await repo.deleteLine(lineId);
	return getOne(idCharacter, idUser);
}

export async function dropOneLine(
	idCharacter: number,
	idUser: number,
	lineId: number,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const line = await repo.findLineById(lineId, idCharacter);
	if (!line) throw NotFound("Cet objet n'est pas dans l'inventaire.");

	await repo.decrementLine(lineId, 1);
	return getOne(idCharacter, idUser);
}

export async function useLine(
	idCharacter: number,
	idUser: number,
	lineId: number,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const line = await repo.findLineById(lineId, idCharacter);
	if (!line) throw NotFound("Cet objet n'est pas dans l'inventaire.");
	inventory.assertConsumable(line.type);

	const { enduranceDelta, newEndurance } = inventory.applyConsume(
		line.name,
		vitals.endurance,
		vitals.enduranceMax,
	);
	if (enduranceDelta !== 0) {
		await repo.updateEndurance(idCharacter, idUser, newEndurance);
	}
	await repo.decrementLine(lineId, 1);

	const character = await getOne(idCharacter, idUser);
	return { character, effect: { name: line.name, enduranceDelta } };
}

export async function equipLine(
	idCharacter: number,
	idUser: number,
	lineId: number,
	equipped: boolean,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const line = await repo.findLineById(lineId, idCharacter);
	if (!line) throw NotFound("Cet objet n'est pas dans l'inventaire.");
	inventory.assertEquipable(line.type);

	await repo.setLineEquipped(lineId, equipped);
	return getOne(idCharacter, idUser);
}

export async function setMastery(
	idCharacter: number,
	idUser: number,
	lineId: number,
	mastered: boolean,
) {
	const vitals = await repo.findVitals(idCharacter, idUser);
	if (!vitals) throw NotFound("Personnage introuvable.");
	inventory.assertAlive(vitals.status);

	const line = await repo.findLineById(lineId, idCharacter);
	if (!line) throw NotFound("Cet objet n'est pas dans l'inventaire.");

	const hasWeaponskill = await repo.hasDiscipline(
		idCharacter,
		"Maîtrise des armes",
	);
	inventory.assertCanMaster(line.type, hasWeaponskill);

	if (mastered) {
		await repo.clearWeaponBonuses(idCharacter);
		await repo.setLineBonus(lineId, inventory.MASTERY_BONUS);
	} else {
		await repo.setLineBonus(lineId, 0);
	}
	return getOne(idCharacter, idUser);
}

import type { PoolConnection } from "mysql2/promise";
import {
	execute,
	query,
	queryOne,
	type SqlParam,
	transaction,
	txExecute,
} from "../../db/pool";
import type {
	CharacterDisciplineRow,
	CharacterObjectRow,
	CharacterRow,
	CharacterStatus,
	ObjectType,
} from "../../db/types";
import type { CharacterSnapshot } from "../../domain/combat";

interface InsertCharacterData {
	idUser: number;
	name: string;
	fightSkill: number;
	endurance: number;
	enduranceMax: number;
	gold: number;
}

export interface CharacterVitals {
	id: number;
	status: CharacterStatus;
	endurance: number;
	enduranceMax: number;
	fightSkill: number;
	gold: number;
}

export function findOwned(
	id: number,
	idUser: number,
): Promise<CharacterRow | null> {
	return queryOne<CharacterRow>(
		`SELECT * FROM characters WHERE id = ? AND id_user = ?`,
		[id, idUser],
	);
}

export function listByUser(idUser: number): Promise<CharacterRow[]> {
	return query<CharacterRow>(
		`SELECT * FROM characters WHERE id_user = ? ORDER BY created_at DESC`,
		[idUser],
	);
}

export function findDisciplines(
	idCharacter: number,
): Promise<CharacterDisciplineRow[]> {
	return query<CharacterDisciplineRow>(
		`SELECT d.id AS id_discipline, d.name, d.description
       FROM character_disciplines cd
       JOIN disciplines d ON d.id = cd.id_discipline
      WHERE cd.id_character = ?
      ORDER BY d.name`,
		[idCharacter],
	);
}

export function findObjects(
	idCharacter: number,
): Promise<CharacterObjectRow[]> {
	return query<CharacterObjectRow>(
		`SELECT co.id AS line_id,
		        co.id_object,
		        COALESCE(o.name, co.custom_name) AS name,
		        COALESCE(o.type, 'SPECIAL')       AS type,
		        co.quantity,
		        co.equipped,
		        co.bonus_skill
		   FROM character_objects co
		   LEFT JOIN objects o ON o.id = co.id_object
		  WHERE co.id_character = ?
		  ORDER BY type, name`,
		[idCharacter],
	);
}

export function findExistingDisciplineIds(
	ids: number[],
): Promise<Array<{ id: number }>> {
	if (ids.length === 0) return Promise.resolve([]);
	const placeholders = ids.map(() => "?").join(",");
	return query<{ id: number }>(
		`SELECT id FROM disciplines WHERE id IN (${placeholders})`,
		ids,
	);
}

export function findObjectTypesByIds(
	ids: number[],
): Promise<Array<{ id: number; type: ObjectType }>> {
	if (ids.length === 0) return Promise.resolve([]);
	const placeholders = ids.map(() => "?").join(",");
	return query<{ id: number; type: ObjectType }>(
		`SELECT id, type FROM objects WHERE id IN (${placeholders})`,
		ids,
	);
}

export async function insertCharacterTx(
	cx: PoolConnection,
	data: InsertCharacterData,
): Promise<number> {
	const result = await txExecute(
		cx,
		`INSERT INTO characters (id_user, name, fight_skill, endurance, endurance_max, gold)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			data.idUser,
			data.name,
			data.fightSkill,
			data.endurance,
			data.enduranceMax,
			data.gold,
		],
	);
	return result.insertId;
}

export async function insertDisciplinesTx(
	cx: PoolConnection,
	idCharacter: number,
	disciplineIds: number[],
): Promise<void> {
	if (disciplineIds.length === 0) return;
	const placeholders = disciplineIds.map(() => "(?, ?)").join(", ");
	const params = disciplineIds.flatMap((id) => [idCharacter, id]);
	await txExecute(
		cx,
		`INSERT INTO character_disciplines (id_character, id_discipline) VALUES ${placeholders}`,
		params,
	);
}

export async function insertObjectsTx(
	cx: PoolConnection,
	idCharacter: number,
	objectIds: number[],
): Promise<void> {
	if (objectIds.length === 0) return;
	const placeholders = objectIds.map(() => "(?, ?)").join(", ");
	const params = objectIds.flatMap((id) => [idCharacter, id]);
	await txExecute(
		cx,
		`INSERT INTO character_objects (id_character, id_object) VALUES ${placeholders}`,
		params,
	);
}

export async function updateOwned(
	id: number,
	idUser: number,
	fields: { name?: string; gold?: number },
): Promise<number> {
	const sets: string[] = [];
	const params: SqlParam[] = [];

	if (fields.name !== undefined) {
		sets.push("name = ?");
		params.push(fields.name);
	}
	if (fields.gold !== undefined) {
		sets.push("gold = ?");
		params.push(fields.gold);
	}
	if (sets.length === 0) return 0;

	params.push(id, idUser);
	const result = await execute(
		`UPDATE characters SET ${sets.join(", ")} WHERE id = ? AND id_user = ?`,
		params,
	);
	return result.affectedRows;
}

export async function deleteOwned(id: number, idUser: number): Promise<number> {
	const result = await execute(
		`DELETE FROM characters WHERE id = ? AND id_user = ?`,
		[id, idUser],
	);
	return result.affectedRows;
}

export async function findVitals(
	idCharacter: number,
	idUser: number,
): Promise<CharacterVitals | null> {
	const row = await queryOne<{
		id: number;
		status: CharacterStatus;
		endurance: number;
		endurance_max: number;
		fight_skill: number;
		gold: number;
	}>(
		`SELECT id, status, endurance, endurance_max, fight_skill, gold
       FROM characters
      WHERE id = ? AND id_user = ?`,
		[idCharacter, idUser],
	);

	if (!row) return null;
	return {
		id: row.id,
		status: row.status,
		endurance: row.endurance,
		enduranceMax: row.endurance_max,
		fightSkill: row.fight_skill,
		gold: row.gold,
	};
}

export async function updateVitals(
	idCharacter: number,
	idUser: number,
	data: { endurance: number; status: CharacterStatus },
): Promise<void> {
	await execute(
		`UPDATE characters
        SET endurance = ?, status = ?, updated_at = NOW()
      WHERE id = ? AND id_user = ?`,
		[data.endurance, data.status, idCharacter, idUser],
	);
}

export async function updateStatus(
	idCharacter: number,
	idUser: number,
	status: CharacterStatus,
): Promise<void> {
	await execute(
		`UPDATE characters
        SET status = ?, updated_at = NOW()
      WHERE id = ? AND id_user = ?`,
		[status, idCharacter, idUser],
	);
}

export async function findDisciplineIds(
	idCharacter: number,
): Promise<number[]> {
	const rows = await query<{ id_discipline: number }>(
		`SELECT id_discipline FROM character_disciplines WHERE id_character = ?`,
		[idCharacter],
	);
	return rows.map((r) => r.id_discipline);
}

export async function findInventoryLines(
	idCharacter: number,
): Promise<Array<{ objectId: number; quantity: number; equipped: boolean }>> {
	const rows = await query<{
		id_object: number;
		quantity: number;
		equipped: number;
	}>(
		`SELECT id_object, quantity, equipped
       FROM character_objects
      WHERE id_character = ?`,
		[idCharacter],
	);
	return rows.map((r) => ({
		objectId: r.id_object,
		quantity: r.quantity,
		equipped: Boolean(r.equipped),
	}));
}

export async function insertSave(
	idCharacter: number,
	snapshot: CharacterSnapshot,
): Promise<void> {
	await execute(`INSERT INTO saves (id_character, snapshot) VALUES (?, ?)`, [
		idCharacter,
		JSON.stringify(snapshot),
	]);
}

export async function findLatestSnapshot(
	idCharacter: number,
): Promise<unknown | null> {
	const row = await queryOne<{ snapshot: unknown }>(
		`SELECT snapshot
       FROM saves
      WHERE id_character = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
		[idCharacter],
	);
	if (!row) return null;
	return typeof row.snapshot === "string"
		? JSON.parse(row.snapshot)
		: row.snapshot;
}

export async function restoreFromSnapshot(
	idCharacter: number,
	idUser: number,
	snapshot: CharacterSnapshot,
): Promise<void> {
	await transaction(async (conn) => {
		await txExecute(
			conn,
			`DELETE FROM character_objects WHERE id_character = ?`,
			[idCharacter],
		);
		for (const line of snapshot.inventory) {
			await txExecute(
				conn,
				`INSERT INTO character_objects (id_character, id_object, quantity, equipped)
         VALUES (?, ?, ?, ?)`,
				[idCharacter, line.objectId, line.quantity, line.equipped ? 1 : 0],
			);
		}

		await txExecute(
			conn,
			`DELETE FROM character_disciplines WHERE id_character = ?`,
			[idCharacter],
		);
		for (const id of snapshot.disciplines) {
			await txExecute(
				conn,
				`INSERT INTO character_disciplines (id_character, id_discipline) VALUES (?, ?)`,
				[idCharacter, id],
			);
		}

		await txExecute(
			conn,
			`UPDATE characters
          SET endurance = ?, endurance_max = ?, fight_skill = ?, gold = ?,
              status = 'ALIVE', updated_at = NOW()
        WHERE id = ? AND id_user = ?`,
			[
				snapshot.endurance,
				snapshot.enduranceMax,
				snapshot.fightSkill,
				snapshot.gold,
				idCharacter,
				idUser,
			],
		);
	});
}

export function findObjectById(
	id: number,
): Promise<{ id: number; name: string; type: ObjectType } | null> {
	return queryOne<{ id: number; name: string; type: ObjectType }>(
		`SELECT id, name, type FROM objects WHERE id = ?`,
		[id],
	);
}

export async function sumQuantityByType(
	idCharacter: number,
	type: ObjectType,
): Promise<number> {
	const row = await queryOne<{ total: number | null }>(
		`SELECT SUM(co.quantity) AS total
		   FROM character_objects co
		   JOIN objects o ON o.id = co.id_object
		  WHERE co.id_character = ? AND o.type = ?`,
		[idCharacter, type],
	);
	return Number(row?.total ?? 0);
}

export async function addObject(
	idCharacter: number,
	idObject: number,
	quantity: number,
): Promise<void> {
	await execute(
		`INSERT INTO character_objects (id_character, id_object, quantity, equipped)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
		[idCharacter, idObject, quantity],
	);
}

export async function updateEndurance(
	idCharacter: number,
	idUser: number,
	endurance: number,
): Promise<void> {
	await execute(
		`UPDATE characters SET endurance = ?, updated_at = NOW()
      WHERE id = ? AND id_user = ?`,
		[endurance, idCharacter, idUser],
	);
}

export function findLineById(
	lineId: number,
	idCharacter: number,
): Promise<{
	line_id: number;
	id_object: number | null;
	name: string;
	type: ObjectType;
	quantity: number;
	equipped: number;
	bonus_skill: number;
} | null> {
	return queryOne(
		`SELECT co.id AS line_id, co.id_object,
		        COALESCE(o.name, co.custom_name) AS name,
		        COALESCE(o.type, 'SPECIAL')       AS type,
		        co.quantity, co.equipped, co.bonus_skill
		   FROM character_objects co
		   LEFT JOIN objects o ON o.id = co.id_object
		  WHERE co.id = ? AND co.id_character = ?`,
		[lineId, idCharacter],
	);
}

export async function insertCustomObject(
	idCharacter: number,
	name: string,
	bonusSkill: number,
): Promise<number> {
	const result = await execute(
		`INSERT INTO character_objects
		   (id_character, id_object, custom_name, quantity, equipped, bonus_skill)
		 VALUES (?, NULL, ?, 1, 0, ?)`,
		[idCharacter, name, bonusSkill],
	);
	return result.insertId;
}

export async function decrementLine(lineId: number, by: number): Promise<void> {
	await execute(
		`UPDATE character_objects SET quantity = quantity - ?
		  WHERE id = ? AND quantity >= ?`,
		[by, lineId, by],
	);
	await execute(
		`DELETE FROM character_objects WHERE id = ? AND quantity <= 0`,
		[lineId],
	);
}

export async function deleteLine(lineId: number): Promise<number> {
	const result = await execute(`DELETE FROM character_objects WHERE id = ?`, [
		lineId,
	]);
	return result.affectedRows;
}

export async function setLineEquipped(
	lineId: number,
	equipped: boolean,
): Promise<void> {
	await execute(`UPDATE character_objects SET equipped = ? WHERE id = ?`, [
		equipped ? 1 : 0,
		lineId,
	]);
}

export async function setLineBonus(
	lineId: number,
	bonus: number,
): Promise<void> {
	await execute(`UPDATE character_objects SET bonus_skill = ? WHERE id = ?`, [
		bonus,
		lineId,
	]);
}

export async function clearWeaponBonuses(idCharacter: number): Promise<void> {
	await execute(
		`UPDATE character_objects co
		   JOIN objects o ON o.id = co.id_object
		    SET co.bonus_skill = 0
		  WHERE co.id_character = ? AND o.type = 'WEAPON'`,
		[idCharacter],
	);
}

export async function hasDiscipline(
	idCharacter: number,
	name: string,
): Promise<boolean> {
	const row = await queryOne<{ ok: number }>(
		`SELECT 1 AS ok
		   FROM character_disciplines cd
		   JOIN disciplines d ON d.id = cd.id_discipline
		  WHERE cd.id_character = ? AND d.name = ?
		  LIMIT 1`,
		[idCharacter, name],
	);
	return row !== null;
}

export async function findLatestSaveId(
	idCharacter: number,
): Promise<number | null> {
	const row = await queryOne<{ id: number }>(
		`SELECT id FROM saves WHERE id_character = ? ORDER BY id DESC LIMIT 1`,
		[idCharacter],
	);
	return row?.id ?? null;
}

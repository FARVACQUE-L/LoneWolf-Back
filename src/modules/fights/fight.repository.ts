import { execute, queryOne, transaction, txExecute } from "../../db/pool";

export interface CharacterFightRow {
	id: number;
	combatSkill: number;
	effectiveSkill: number;
	endurance: number;
	enduranceMax: number;
	status: "ALIVE" | "DEFEATED" | "DEAD";
}

const EFFECTIVE_SKILL = `
  c.fight_skill + COALESCE((
    SELECT SUM(co.bonus_skill) FROM character_objects co
    WHERE co.id_character = c.id AND co.equipped = 1
  ), 0)`;

export function findCharacterForFight(idCharacter: number, idUser: number) {
	return queryOne<CharacterFightRow>(
		`SELECT c.id,
            c.fight_skill  AS fightSkill,
            c.endurance,
            c.endurance_max AS enduranceMax,
            c.status,
            ${EFFECTIVE_SKILL} AS effectiveSkill
     FROM characters c
     WHERE c.id = ? AND c.id_user = ?`,
		[idCharacter, idUser],
	);
}

export function findActiveFight(idCharacter: number) {
	return queryOne<{ id: number }>(
		`SELECT id FROM fights WHERE id_character = ? AND status = 'IN_PROGRESS' LIMIT 1`,
		[idCharacter],
	);
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

export interface NewFight {
	enemyName: string;
	enemyCombatSkill: number;
	enemyEndurance: number;
	idSave: number | null;
}

export async function createFight(
	idCharacter: number,
	f: NewFight,
): Promise<number> {
	const res = await execute(
		`INSERT INTO fights
       (id_character, id_save, enemy_name, enemy_combat_skill, enemy_endurance_max, enemy_endurance)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			idCharacter,
			f.idSave,
			f.enemyName,
			f.enemyCombatSkill,
			f.enemyEndurance,
			f.enemyEndurance,
		],
	);
	return res.insertId;
}

export interface FightWithCharacter {
	fightId: number;
	fightStatus: "IN_PROGRESS" | "WON" | "LOST";
	enemyName: string;
	enemyCombatSkill: number;
	enemyEndurance: number;
	enemyEnduranceMax: number;
	idCharacter: number;
	effectiveSkill: number;
	characterEndurance: number;
	characterStatus: "ALIVE" | "DEFEATED" | "DEAD";
	lastRoundNumber: number;
}

export function findFightWithCharacter(idFight: number, idUser: number) {
	return queryOne<FightWithCharacter>(
		`SELECT f.id                  AS fightId,
            f.status              AS fightStatus,
            f.enemy_name          AS enemyName,
            f.enemy_combat_skill  AS enemyCombatSkill,
            f.enemy_endurance     AS enemyEndurance,
            f.enemy_endurance_max AS enemyEnduranceMax,
            c.id                  AS idCharacter,
            c.endurance           AS characterEndurance,
            c.status              AS characterStatus,
            ${EFFECTIVE_SKILL}    AS effectiveSkill,
            COALESCE((SELECT MAX(r.number) FROM rounds r WHERE r.id_fight = f.id), 0) AS lastRoundNumber
     FROM fights f
     JOIN characters c ON c.id = f.id_character
     WHERE f.id = ? AND c.id_user = ?`,
		[idFight, idUser],
	);
}

export interface RoundPersist {
	idFight: number;
	number: number;
	combatRatio: number;
	draw: number;
	enemyLoss: number;
	playerLoss: number;
	characterEnduranceAfter: number;
	enemyEnduranceAfter: number;
	fightStatus: "IN_PROGRESS" | "WON" | "LOST";
	idCharacter: number;
	characterStatus: "ALIVE" | "DEFEATED" | "DEAD";
}

export async function persistRoundResult(p: RoundPersist): Promise<void> {
	await transaction(async (cx) => {
		await txExecute(
			cx,
			`INSERT INTO rounds
         (id_fight, number, combat_ratio, draw, enemy_loss, player_loss,
          character_endurance_after, enemy_endurance_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				p.idFight,
				p.number,
				p.combatRatio,
				p.draw,
				p.enemyLoss,
				p.playerLoss,
				p.characterEnduranceAfter,
				p.enemyEnduranceAfter,
			],
		);
		await txExecute(
			cx,
			`UPDATE fights SET enemy_endurance = ?, status = ? WHERE id = ?`,
			[p.enemyEnduranceAfter, p.fightStatus, p.idFight],
		);
		await txExecute(
			cx,
			`UPDATE characters SET endurance = ?, status = ? WHERE id = ?`,
			[p.characterEnduranceAfter, p.characterStatus, p.idCharacter],
		);
	});
}

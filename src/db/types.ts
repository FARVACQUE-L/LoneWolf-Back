export const toBool = (v: number | boolean | null): boolean => Boolean(v);

export interface UserRow {
	id: number;
	email: string;
	password_hash: string;
	created_at: Date;
}

export type CharacterStatus = "ALIVE" | "DEFEATED" | "DEAD";
export type ObjectType = "WEAPON" | "BACKPACK" | "SPECIAL";

export interface CharacterRow {
	id: number;
	id_user: number;
	name: string;
	fight_skill: number;
	endurance: number;
	endurance_max: number;
	gold: number;
	status: CharacterStatus;
	created_at: Date;
	updated_at: Date;
}

export interface DisciplineRow {
	id: number;
	name: string;
	description: string;
}

export interface CharacterDisciplineRow {
	id_discipline: number;
	name: string;
	description: string;
}

export interface ObjectRow {
	id: number;
	name: string;
	type: ObjectType;
	description: string | null;
}

export interface CharacterObjectRow {
	line_id: number;
	id_object: number | null;
	name: string;
	type: ObjectType;
	quantity: number;
	equipped: number;
	bonus_skill: number;
}

export interface SaveRow {
	id: number;
	id_character: number;
	snapshot: string;
	created_at: Date;
}

export interface CharacterSheetItem {
	id: number;
	objectId: number | null;
	name: string;
	type: ObjectType;
	quantity: number;
	equipped: boolean;
	bonusSkill: number;
}

export interface CharacterSheet {
	id: number;
	name: string;
	fightSkill: number;
	effectiveFightSkill: number;
	endurance: number;
	enduranceMax: number;
	gold: number;
	status: CharacterStatus;
	createdAt: Date;
	updatedAt: Date;
	disciplines: Array<{ id: number; name: string; description: string }>;
	inventory: CharacterSheetItem[];
}

export const toCharacterSummary = (r: CharacterRow) => ({
	id: r.id,
	name: r.name,
	fightSkill: r.fight_skill,
	endurance: r.endurance,
	enduranceMax: r.endurance_max,
	gold: r.gold,
	status: r.status,
	createdAt: r.created_at,
	updatedAt: r.updated_at,
});

import { describe, expect, it } from "vitest";
import {
	type RoundModifiers,
	adjustedCombatSkill,
	mindblastBonus,
	playerRoundLoss,
	psychicBacklash,
	unarmedPenalty,
} from "./combat-rules";

// Base neutre : aucune règle ne s'applique. Chaque test surcharge ce qu'il teste.
const base: RoundModifiers = {
	hasWeaponEquipped: true,
	hasMindblast: false,
	mindblastEnabled: false,
	hasMindshield: true,
	enemyHasPsychicAttack: false,
};

describe("(2) combat sans arme", () => {
	it("aucune pénalité avec une arme équipée", () => {
		expect(unarmedPenalty(true)).toBe(0);
	});
	it("−4 sans arme", () => {
		expect(unarmedPenalty(false)).toBe(-4);
	});
});

describe("(6) Puissance Psychique", () => {
	it("+2 si possédée et active", () => {
		expect(mindblastBonus(true, true)).toBe(2);
	});
	it("0 si possédée mais désactivée (immunité ennemie)", () => {
		expect(mindblastBonus(true, false)).toBe(0);
	});
	it("0 si non possédée, même 'active'", () => {
		expect(mindblastBonus(false, true)).toBe(0);
	});
});

describe("(5) Bouclier Psychique", () => {
	it("−2 Endurance si pas de bouclier et ennemi psychique", () => {
		expect(psychicBacklash(false, true)).toBe(2);
	});
	it("0 si bouclier présent (annule l'attaque psychique)", () => {
		expect(psychicBacklash(true, true)).toBe(0);
	});
	it("0 si l'ennemi n'a pas d'attaque psychique", () => {
		expect(psychicBacklash(false, false)).toBe(0);
	});
});

describe("adjustedCombatSkill (composition, niveau Habileté)", () => {
	it("cas neutre : Habileté inchangée", () => {
		expect(adjustedCombatSkill(18, base)).toBe(18);
	});

	it("sans arme mais Puissance Psychique active : −4 puis +2 (net −2)", () => {
		const m: RoundModifiers = {
			...base,
			hasWeaponEquipped: false,
			hasMindblast: true,
			mindblastEnabled: true,
		};
		expect(adjustedCombatSkill(18, m)).toBe(16);
	});

	it("Puissance Psychique possédée mais coupée pour ce combat : pas de +2", () => {
		const m: RoundModifiers = {
			...base,
			hasMindblast: true,
			mindblastEnabled: false,
		};
		expect(adjustedCombatSkill(18, m)).toBe(18);
	});

	it("sans arme, sans Puissance Psychique : −4 sec", () => {
		const m: RoundModifiers = { ...base, hasWeaponEquipped: false };
		expect(adjustedCombatSkill(18, m)).toBe(14);
	});
});

describe("playerRoundLoss (composition)", () => {
	it("perte de la table seule si protégé", () => {
		expect(playerRoundLoss(3, base)).toBe(3);
	});

	it("perte de la table + 2 si pas de bouclier face à un ennemi psychique", () => {
		const m: RoundModifiers = {
			...base,
			hasMindshield: false,
			enemyHasPsychicAttack: true,
		};
		expect(playerRoundLoss(3, m)).toBe(5);
	});

	it("le retour psychique s'ajoute même quand la table fait perdre 0", () => {
		const m: RoundModifiers = {
			...base,
			hasMindshield: false,
			enemyHasPsychicAttack: true,
		};
		expect(playerRoundLoss(0, m)).toBe(2);
	});
});

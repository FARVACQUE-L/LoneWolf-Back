import { describe, expect, it } from "vitest";
import { applyLoss, combatRatioToColumn, resolveRound } from "./fight";

describe("combatRatioToColumn", () => {
	it("mappe le quotient 0 sur la colonne centrale", () => {
		expect(combatRatioToColumn(0)).toBe(6);
	});

	it("regroupe les quotients négatifs par paires", () => {
		expect(combatRatioToColumn(-1)).toBe(5);
		expect(combatRatioToColumn(-2)).toBe(5);
		expect(combatRatioToColumn(-5)).toBe(3);
		expect(combatRatioToColumn(-6)).toBe(3);
		expect(combatRatioToColumn(-10)).toBe(1);
	});

	it("regroupe les quotients positifs par paires", () => {
		expect(combatRatioToColumn(1)).toBe(7);
		expect(combatRatioToColumn(2)).toBe(7);
		expect(combatRatioToColumn(10)).toBe(11);
	});

	it("plafonne aux colonnes extrêmes", () => {
		expect(combatRatioToColumn(-11)).toBe(0);
		expect(combatRatioToColumn(-15)).toBe(0); // même colonne que -11
		expect(combatRatioToColumn(11)).toBe(12);
		expect(combatRatioToColumn(20)).toBe(12); // même colonne que +11
	});
});

describe("resolveRound", () => {
	it("case de référence du livre : quotient 0, tirage 1 → ennemi 3 / joueur 5", () => {
		const r = resolveRound({
			characterCombatSkill: 15,
			enemyCombatSkill: 15,
			draw: 1,
		});
		expect(r.combatRatio).toBe(0);
		expect(r.enemyLoss).toBe(3);
		expect(r.playerLoss).toBe(5);
	});

	it("quotient 0, tirage 6 → ennemi 8 / joueur 2 (exemple Project Aon)", () => {
		const r = resolveRound({
			characterCombatSkill: 15,
			enemyCombatSkill: 15,
			draw: 6,
		});
		expect(r.enemyLoss).toBe(8);
		expect(r.playerLoss).toBe(2);
	});

	it("tirage 0 : le joueur ne perd rien (coup critique)", () => {
		const r = resolveRound({
			characterCombatSkill: 15,
			enemyCombatSkill: 15,
			draw: 0,
		});
		expect(r.enemyLoss).toBe(12);
		expect(r.playerLoss).toBe(0);
	});

	it("calcule le quotient à partir des deux Habiletés", () => {
		expect(
			resolveRound({ characterCombatSkill: 17, enemyCombatSkill: 20, draw: 6 })
				.combatRatio,
		).toBe(-3);
	});

	it("renvoie K côté joueur quand la table le prévoit", () => {
		// quotient <= -11 (colonne 0), tirage 1 → [0, "K"]
		const r = resolveRound({
			characterCombatSkill: 5,
			enemyCombatSkill: 20,
			draw: 1,
		});
		expect(r.enemyLoss).toBe(0);
		expect(r.playerLoss).toBe("K");
	});

	it("renvoie K côté ennemi quand la table le prévoit", () => {
		// quotient >= +11 (colonne 12), tirage 0 → ["K", 0]
		const r = resolveRound({
			characterCombatSkill: 30,
			enemyCombatSkill: 15,
			draw: 0,
		});
		expect(r.enemyLoss).toBe("K");
		expect(r.playerLoss).toBe(0);
	});

	it("rejette un tirage hors 0–9", () => {
		const base = { characterCombatSkill: 15, enemyCombatSkill: 15 };
		expect(() => resolveRound({ ...base, draw: 10 })).toThrow();
		expect(() => resolveRound({ ...base, draw: -1 })).toThrow();
		expect(() => resolveRound({ ...base, draw: 3.5 })).toThrow();
	});
});

describe("applyLoss", () => {
	it("soustrait la perte de l'Endurance courante", () => {
		expect(applyLoss(25, 6)).toBe(19);
	});

	it("ne descend jamais sous 0", () => {
		expect(applyLoss(3, 8)).toBe(0);
	});

	it("K met l'Endurance à 0", () => {
		expect(applyLoss(30, "K")).toBe(0);
	});
});

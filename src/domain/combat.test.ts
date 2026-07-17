import { describe, expect, it } from "vitest";
import {
	applyDamage,
	assertAwaitingChoice,
	assertCanAct,
	assertValidSnapshot,
	buildSnapshot,
} from "./combat";

// Capture l'erreur levée pour inspecter son code métier.
// Si ton AppError expose le code sous une autre clé que `.code`, ajuste ici.
function capture(fn: () => unknown): { code?: string; message?: string } {
	try {
		fn();
	} catch (e) {
		return e as { code?: string; message?: string };
	}
	throw new Error("La fonction devait lever une erreur, mais ne l'a pas fait.");
}

describe("assertCanAct", () => {
	it("laisse agir un personnage ALIVE", () => {
		expect(() => assertCanAct("ALIVE")).not.toThrow();
	});

	it("bloque un personnage DEFEATED (choix en attente)", () => {
		expect(capture(() => assertCanAct("DEFEATED")).code).toBe(
			"CHOICE_REQUIRED",
		);
	});

	it("bloque un personnage DEAD (lecture seule)", () => {
		expect(capture(() => assertCanAct("DEAD")).code).toBe("CHARACTER_DEAD");
	});
});

describe("assertAwaitingChoice", () => {
	it("passe quand le personnage est DEFEATED", () => {
		expect(() => assertAwaitingChoice("DEFEATED")).not.toThrow();
	});

	it("refuse un personnage ALIVE (aucun choix en attente)", () => {
		expect(capture(() => assertAwaitingChoice("ALIVE")).code).toBe(
			"NO_PENDING_CHOICE",
		);
	});

	it("refuse un personnage DEAD (aucun choix en attente)", () => {
		expect(capture(() => assertAwaitingChoice("DEAD")).code).toBe(
			"NO_PENDING_CHOICE",
		);
	});
});

describe("applyDamage", () => {
	it("soustrait les dégâts et reste ALIVE tant qu'il reste de l'Endurance", () => {
		expect(applyDamage(29, 5)).toEqual({
			currentEndurance: 24,
			status: "ALIVE",
		});
	});

	it("passe DEFEATED quand l'Endurance atteint exactement 0", () => {
		expect(applyDamage(5, 5)).toEqual({
			currentEndurance: 0,
			status: "DEFEATED",
		});
	});

	it("INVARIANT : des dégâts ≥ Endurance donnent DEFEATED, jamais DEAD", () => {
		const result = applyDamage(5, 99);
		expect(result.currentEndurance).toBe(0);
		expect(result.status).toBe("DEFEATED");
		expect(result.status).not.toBe("DEAD");
	});

	it("ne change rien avec 0 dégât", () => {
		expect(applyDamage(29, 0)).toEqual({
			currentEndurance: 29,
			status: "ALIVE",
		});
	});

	it("rejette des dégâts négatifs", () => {
		expect(capture(() => applyDamage(29, -1)).code).toBe("INVALID_DAMAGE");
	});

	it("rejette des dégâts non entiers", () => {
		expect(capture(() => applyDamage(29, 2.5)).code).toBe("INVALID_DAMAGE");
	});
});

describe("buildSnapshot", () => {
	const source = {
		fightSkill: 15,
		endurance: 29,
		enduranceMax: 29,
		gold: 25,
		disciplines: [1, 2, 3],
		inventory: [{ objectId: 10, quantity: 2, equipped: true }],
	};

	it("recopie tous les champs de la fiche", () => {
		expect(buildSnapshot(source)).toEqual(source);
	});

	it("clone les disciplines (pas de référence partagée)", () => {
		const snap = buildSnapshot(source);
		source.disciplines.push(99);
		expect(snap.disciplines).toEqual([1, 2, 3]);
	});

	it("clone les lignes d'inventaire (pas de référence partagée)", () => {
		const snap = buildSnapshot(source);
		source.inventory[0].quantity = 999;
		expect(snap.inventory[0].quantity).toBe(2);
	});
});

describe("assertValidSnapshot", () => {
	const valid = {
		fightSkill: 15,
		endurance: 29,
		enduranceMax: 29,
		gold: 25,
		disciplines: [],
		inventory: [],
	};

	it("accepte une sauvegarde bien formée", () => {
		expect(() => assertValidSnapshot(valid)).not.toThrow();
	});

	it("rejette null", () => {
		expect(capture(() => assertValidSnapshot(null)).code).toBe(
			"INVALID_SNAPSHOT",
		);
	});

	it("rejette une Endurance à 0 (doit être > 0)", () => {
		expect(
			capture(() => assertValidSnapshot({ ...valid, endurance: 0 })).code,
		).toBe("INVALID_SNAPSHOT");
	});

	it("rejette un fightSkill non fini", () => {
		expect(
			capture(() => assertValidSnapshot({ ...valid, fightSkill: Number.NaN }))
				.code,
		).toBe("INVALID_SNAPSHOT");
	});

	it("rejette des disciplines qui ne sont pas un tableau", () => {
		expect(
			capture(() => assertValidSnapshot({ ...valid, disciplines: null })).code,
		).toBe("INVALID_SNAPSHOT");
	});

	it("rejette un inventaire qui n'est pas un tableau", () => {
		expect(
			capture(() => assertValidSnapshot({ ...valid, inventory: undefined }))
				.code,
		).toBe("INVALID_SNAPSHOT");
	});
});

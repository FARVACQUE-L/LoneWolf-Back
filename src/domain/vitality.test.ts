import { describe, expect, it } from "vitest";
import { applyHealing, applyMissedMeal, healingRestore } from "./inventory";

describe("healingRestore", () => {
	it("Laumspur soigne 4", () =>
		expect(healingRestore("Potion de Laumspur")).toBe(4));
	it("insensible aux accents / à la casse", () =>
		expect(healingRestore("Herbes de Guérison")).toBe(2));
	it("gâteau de miel soigne 3", () =>
		expect(healingRestore("Gâteau de Miel")).toBe(3));
	it("0 pour un objet non soignant", () =>
		expect(healingRestore("Épée")).toBe(0));
});

describe("applyHealing (+1, clamp max)", () => {
	it("monte de 1 sous le max", () => {
		expect(applyHealing(10, 20)).toEqual({
			enduranceDelta: 1,
			newEndurance: 11,
		});
	});
	it("ne dépasse jamais le max", () => {
		expect(applyHealing(20, 20)).toEqual({
			enduranceDelta: 0,
			newEndurance: 20,
		});
	});
	it("comble pile le dernier point", () => {
		expect(applyHealing(19, 20)).toEqual({
			enduranceDelta: 1,
			newEndurance: 20,
		});
	});
});

describe("applyMissedMeal (−3, DEAD à 0)", () => {
	it("perte simple, reste ALIVE", () => {
		expect(applyMissedMeal(10)).toEqual({
			enduranceDelta: -3,
			newEndurance: 7,
			status: "ALIVE",
		});
	});
	it("tombe pile à 0 → DEAD", () => {
		expect(applyMissedMeal(3)).toEqual({
			enduranceDelta: -3,
			newEndurance: 0,
			status: "DEAD",
		});
	});
	it("ne descend pas sous 0, mais meurt quand même", () => {
		expect(applyMissedMeal(2)).toEqual({
			enduranceDelta: -2,
			newEndurance: 0,
			status: "DEAD",
		});
	});
	it("1 d'Endurance → 0 → DEAD", () => {
		expect(applyMissedMeal(1)).toEqual({
			enduranceDelta: -1,
			newEndurance: 0,
			status: "DEAD",
		});
	});
});

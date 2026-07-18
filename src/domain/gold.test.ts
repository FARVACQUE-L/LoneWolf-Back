import { describe, expect, it } from "vitest";
import { applyGoldDelta } from "./rules";

describe("applyGoldDelta", () => {
	it("ajout simple sous le plafond", () => {
		expect(applyGoldDelta(25, 6)).toEqual({ gold: 31, applied: 6 });
	});
	it("retrait simple au-dessus de 0", () => {
		expect(applyGoldDelta(25, -10)).toEqual({ gold: 15, applied: -10 });
	});
	it("l'excédent au-dessus de 50 est perdu", () => {
		expect(applyGoldDelta(48, 6)).toEqual({ gold: 50, applied: 2 });
	});
	it("retrait exact jusqu'à 0 autorisé", () => {
		expect(applyGoldDelta(5, -5)).toEqual({ gold: 0, applied: -5 });
	});
	it("paiement insuffisant refusé", () => {
		expect(() => applyGoldDelta(5, -10)).toThrow();
	});
	it("delta nul est neutre", () => {
		expect(applyGoldDelta(30, 0)).toEqual({ gold: 30, applied: 0 });
	});
});

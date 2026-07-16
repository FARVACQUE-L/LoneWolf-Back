import { randomInt } from "node:crypto";

export function roll(): number {
	return randomInt(0, 10);
}

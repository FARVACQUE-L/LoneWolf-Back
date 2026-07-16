import { query } from "../../db/pool";
import type { DisciplineRow } from "../../db/types";

export function findAllDisciplines() {
	return query<DisciplineRow>(
		"SELECT id, name, description FROM disciplines ORDER BY id",
	);
}

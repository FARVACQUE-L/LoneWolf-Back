import { query } from "../../db/pool";
import type { ObjectType } from "../../db/types";

export interface ObjectCatalogRow {
	id: number;
	name: string;
	type: ObjectType;
	description: string | null;
}

export function listAll(): Promise<ObjectCatalogRow[]> {
	return query<ObjectCatalogRow>(
		`SELECT id, name, type, description FROM objects ORDER BY type, name`,
	);
}

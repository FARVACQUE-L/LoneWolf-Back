import { findAllDisciplines } from "./discipline.repository";

export function list() {
	return findAllDisciplines();
}

import * as repo from "./objects.repository";

export function list() {
	return repo.listAll();
}

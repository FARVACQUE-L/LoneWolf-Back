import { randomInt } from "node:crypto";
import { applyDamage, assertCanAct } from "../../domain/combat";
import {
	adjustedCombatSkill,
	playerRoundLoss,
	type RoundModifiers,
} from "../../domain/combat-rules";
import { applyLoss, resolveRound } from "../../domain/fight";
import { Conflict, NotFound } from "../../errors";
import { findLatestSaveId } from "../characters/character.repository";
import { checkpoint } from "../characters/character.service";
import * as fightRepo from "./fight.repository";
import type { NextRoundInput, StartFightInput } from "./fight.schema";

async function snapshotBeforeFight(
	idCharacter: number,
	idUser: number,
): Promise<number | null> {
	await checkpoint(idCharacter, idUser);
	return findLatestSaveId(idCharacter);
}

export async function startFight(
	idCharacter: number,
	idUser: number,
	input: StartFightInput,
) {
	const character = await fightRepo.findCharacterForFight(idCharacter, idUser);
	if (!character) throw NotFound("Personnage introuvable.");
	assertCanAct(character.status);

	const active = await fightRepo.findActiveFight(idCharacter);
	if (active) throw Conflict("Un combat est déjà en cours pour ce personnage.");

	const idSave = await snapshotBeforeFight(idCharacter, idUser);

	const enemyName = input.enemyName ?? "Adversaire";
	const fightId = await fightRepo.createFight(idCharacter, {
		enemyName,
		enemyCombatSkill: input.enemyCombatSkill,
		enemyEndurance: input.enemyEndurance,
		idSave,
		enemyPsychic: input.enemyPsychicAttack,
	});

	return {
		fightId,
		status: "IN_PROGRESS" as const,
		enemy: {
			name: enemyName,
			combatSkill: input.enemyCombatSkill,
			endurance: input.enemyEndurance,
		},
		character: { endurance: character.endurance, status: character.status },
		snapshotSaved: true,
	};
}

export async function nextRound(
	idFight: number,
	idUser: number,
	input: NextRoundInput,
) {
	const f = await fightRepo.findFightWithCharacter(
		idFight,
		idUser,
		fightRepo.DISCIPLINE_MINDBLAST,
		fightRepo.DISCIPLINE_MINDSHIELD,
	);
	if (!f) throw NotFound("Combat introuvable.");
	if (f.fightStatus !== "IN_PROGRESS")
		throw Conflict("Ce combat est déjà terminé.");
	assertCanAct(f.characterStatus);

	const draw = randomInt(0, 10);

	const mods: RoundModifiers = {
		hasWeaponEquipped: Boolean(f.hasWeaponEquipped),
		hasMindblast: Boolean(f.hasMindblast),
		mindblastEnabled: input.mindblastEnabled ?? true,
		hasMindshield: Boolean(f.hasMindshield),
		enemyHasPsychicAttack: Boolean(f.enemyPsychic),
	};

	const effectiveSkill =
		adjustedCombatSkill(Number(f.effectiveSkill), mods) +
		(input.disciplineBonus ?? 0);
	const outcome = resolveRound({
		characterCombatSkill: effectiveSkill,
		enemyCombatSkill: f.enemyCombatSkill,
		draw,
	});

	const enemyEnduranceAfter = applyLoss(f.enemyEndurance, outcome.enemyLoss);

	const baseLoss =
		outcome.playerLoss === "K" ? f.characterEndurance : outcome.playerLoss;
	const totalPlayerLoss =
		outcome.playerLoss === "K" ? baseLoss : playerRoundLoss(baseLoss, mods);
	const player = applyDamage(f.characterEndurance, totalPlayerLoss);

	const enemyLossApplied = f.enemyEndurance - enemyEnduranceAfter;
	const playerLossApplied = f.characterEndurance - player.currentEndurance;

	let fightStatus: "IN_PROGRESS" | "WON" | "LOST" = "IN_PROGRESS";
	if (player.currentEndurance <= 0) fightStatus = "LOST";
	else if (enemyEnduranceAfter <= 0) fightStatus = "WON";

	const roundNumber = f.lastRoundNumber + 1;

	await fightRepo.persistRoundResult({
		idFight,
		number: roundNumber,
		combatRatio: outcome.combatRatio,
		draw,
		enemyLoss: enemyLossApplied,
		playerLoss: playerLossApplied,
		characterEnduranceAfter: player.currentEndurance,
		enemyEnduranceAfter,
		fightStatus,
		idCharacter: f.idCharacter,
		characterStatus: player.status,
	});

	return {
		round: {
			number: roundNumber,
			combatRatio: outcome.combatRatio,
			draw,
			enemyLoss: enemyLossApplied,
			playerLoss: playerLossApplied,
		},
		enemy: { name: f.enemyName, endurance: enemyEnduranceAfter },
		character: {
			endurance: player.currentEndurance,
			status: player.status,
			choiceRequired: player.status === "DEFEATED",
		},
		fightStatus,
	};
}

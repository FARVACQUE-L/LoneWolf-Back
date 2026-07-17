// ─────────────────────────────────────────────────────────────────────────────
// domain/combat-rules.ts
//
// Modificateurs de ROUND purs : aucune dépendance à mysql2, Express ou req/res.
// S'insèrent dans le moteur existant (domain/fight.ts) à DEUX endroits :
//   • adjustedCombatSkill() → l'Habileté envoyée à resolveRound() (qui soustrait
//     ensuite l'Habileté ennemie pour obtenir le rapport de force) ;
//   • playerRoundLoss()     → la perte d'Endurance du joueur, APRÈS lecture de
//     la table de tirage.
//
// Règles couvertes (Lone Wolf) :
//   (2) Combat sans arme          → −4 à l'Habileté.
//   (6) Puissance Psychique       → +2, désactivable (ennemi immunisé / mention livre).
//   (5) Bouclier Psychique absent → −2 Endurance/round si l'ennemi a une attaque psychique.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contexte du round : disciplines du perso + arme équipée + nature de l'ennemi.
 * Fourni par la couche service à partir de la fiche et du combat.
 */
export interface RoundModifiers {
	/** (2) Une arme est-elle actuellement équipée ? */
	hasWeaponEquipped: boolean;
	/** (6) Le personnage possède-t-il la discipline Puissance Psychique ? */
	hasMindblast: boolean;
	/** (6) Puissance Psychique active pour CE round ? (désactivable) */
	mindblastEnabled: boolean;
	/** (5) Le personnage possède-t-il la discipline Bouclier Psychique ? */
	hasMindshield: boolean;
	/** (5) L'ennemi porte-t-il une attaque psychique ? */
	enemyHasPsychicAttack: boolean;
}

/** (2) −4 à l'Habileté sans arme, 0 sinon. */
export function unarmedPenalty(hasWeaponEquipped: boolean): number {
	return hasWeaponEquipped ? 0 : -4;
}

/** (6) +2 si Puissance Psychique possédée ET active, 0 sinon. */
export function mindblastBonus(
	hasMindblast: boolean,
	enabled: boolean,
): number {
	return hasMindblast && enabled ? 2 : 0;
}

/** (5) Perte d'Endurance ADDITIONNELLE (2) si pas de bouclier face à un ennemi psychique. */
export function psychicBacklash(
	hasMindshield: boolean,
	enemyHasPsychicAttack: boolean,
): number {
	return !hasMindshield && enemyHasPsychicAttack ? 2 : 0;
}

/**
 * Habileté effective une fois les règles (2) et (6) appliquées.
 * À passer telle quelle à resolveRound() comme `characterCombatSkill`
 * (c'est resolveRound qui soustrait ensuite l'Habileté ennemie).
 */
export function adjustedCombatSkill(
	effectiveSkill: number,
	m: RoundModifiers,
): number {
	return (
		effectiveSkill +
		unarmedPenalty(m.hasWeaponEquipped) +
		mindblastBonus(m.hasMindblast, m.mindblastEnabled)
	);
}

/** Perte d'Endurance du joueur : perte de la table + (règle 5) retour psychique. */
export function playerRoundLoss(tableLoss: number, m: RoundModifiers): number {
	return tableLoss + psychicBacklash(m.hasMindshield, m.enemyHasPsychicAttack);
}

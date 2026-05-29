/**
 * Slot Machine — logica di gioco.
 * €2 per giro. Premi basati sul rank del membro.
 * 3 paylines attive: riga top, middle, bottom.
 */

import { membri, nomeDisplay } from './membri.js';

export const COSTO_GIRO = 2;

function calcolaPremio(rank) {
	if (rank === 1) return 500; // Luisa — tier esclusivo
	if (rank <= 3) return 100;  // Leggendario
	if (rank <= 8) return 50;   // Epico
	if (rank <= 15) return 10;  // Raro
	return 4;                    // Comune
}

/** Probabilità tris per simbolo — inversamente proporzionale al premio */
function calcolaProbabilita(rank) {
	if (rank === 1) return 0.000005; // Luisa: praticamente impossibile
	if (rank <= 3) return 0.0001;    // Leggendario: rarissimo
	if (rank <= 8) return 0.0003;    // Epico: molto raro
	if (rank <= 15) return 0.0006;   // Raro: raro
	return 0.001;                     // Comune: poco comune
}

export const SLOT_SIMBOLI = membri.map((m, i) => ({
	emoji: m.emoji,
	nome: m.nome,
	animale: m.animale,
	colore: m.colore,
	tipo: `membro_${i}`,
	rank: i + 1,
	grido: `${nomeDisplay(m).toUpperCase()}!`,
	premio: calcolaPremio(i + 1),
	prob: calcolaProbabilita(i + 1)
}));

/** Tier groups per la tabella premi — rank 1 è sempre il top tier */
const _rank1 = SLOT_SIMBOLI[0];
export const TIER_GROUPS = [
	{ label: _rank1.nome.toUpperCase(), premio: 500, colore: _rank1.colore, icon: _rank1.emoji, prob: 'Leggenda' },
	{ label: 'LEGGENDARIO', premio: 100, colore: '#ffd700', icon: '🏆', prob: 'Ultra Rara' },
	{ label: 'EPICO', premio: 50, colore: '#c084fc', icon: '✨', prob: 'Molto Rara' },
	{ label: 'RARO', premio: 10, colore: '#60a5fa', icon: '⭐', prob: 'Rara' },
	{ label: 'COMUNE', premio: 4, colore: '#86efac', icon: '🎯', prob: 'Comune' }
].map((t) => ({
	...t,
	simboli: SLOT_SIMBOLI.filter((s) => s.premio === t.premio)
}));

// Particelle per ogni animale vincente
export const WIN_PARTICLES = {
	leone: { emoji: '👑', extra: '✨' },
	lupo: { emoji: '🌙', extra: '⭐' },
	squalo: { emoji: '🌊', extra: '💧' },
	puma: { emoji: '⚡', extra: '💨' },
	delfino: { emoji: '💦', extra: '🐟' },
	orso: { emoji: '🐾', extra: '❄️' },
	giraffa: { emoji: '🌟', extra: '⭐' },
	pecora: { emoji: '☁️', extra: '🌸' },
	canguro: { emoji: '💨', extra: '🌿' },
	varana: { emoji: '✨', extra: '💚' }
};

/**
 * Genera il risultato per una singola riga.
 */
function giraRiga() {
	const r = Math.random();
	let cum = 0;

	for (const s of SLOT_SIMBOLI) {
		cum += s.prob;
		if (r < cum) {
			return { simboli: [s, s, s], vincita: true, animale: s };
		}
	}

	// Nessuna vincita — genera 3 simboli casuali senza tris accidentale
	let simboli;
	do {
		simboli = Array.from(
			{ length: 3 },
			() => SLOT_SIMBOLI[Math.floor(Math.random() * SLOT_SIMBOLI.length)]
		);
	} while (simboli[0].tipo === simboli[1].tipo && simboli[1].tipo === simboli[2].tipo);

	return { simboli, vincita: false, animale: null };
}

/**
 * Esegue un giro della slot machine su 3 paylines.
 *
 * Restituisce:
 * - griglia: array[3][3] dove griglia[riga][colonna] (0=top, 1=mid, 2=bot)
 * - vincite: array di { linea (0|1|2), animale }
 * - vincita: boolean
 * - simboli: middle row (per compatibilità logger)
 * - animale: animale più prezioso tra i vincitori (per compatibilità logger)
 */
export function gira() {
	const righe = [giraRiga(), giraRiga(), giraRiga()];
	const griglia = righe.map((r) => r.simboli); // griglia[row][col]
	const vincite = righe
		.map((r, i) => (r.vincita ? { linea: i, animale: r.animale } : null))
		.filter(Boolean);

	const animale =
		vincite.length > 0
			? vincite.reduce((best, v) => (v.animale.premio > best.animale.premio ? v : best)).animale
			: null;

	return {
		griglia,
		vincite,
		vincita: vincite.length > 0,
		simboli: griglia[1], // middle row per compatibilità logger
		animale
	};
}

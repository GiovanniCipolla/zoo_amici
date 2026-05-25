/**
 * Slot Machine — logica di gioco.
 * €2 per giro. Premi basati sul rank del membro.
 */

import { membri } from './membri.js';

export const COSTO_GIRO = 2;

function calcolaPremio(rank) {
	if (rank <= 3) return 15;
	if (rank <= 8) return 10;
	if (rank <= 15) return 7;
	return 4;
}

/** Probabilità tris per simbolo — inversamente proporzionale al premio */
function calcolaProbabilita(rank) {
	if (rank <= 3) return 0.0001;   // rarissimo
	if (rank <= 8) return 0.0003;   // molto raro
	if (rank <= 15) return 0.0006;  // raro
	return 0.001;                    // poco comune
}

export const SLOT_SIMBOLI = membri.map((m, i) => ({
	emoji: m.emoji,
	nome: m.nome,
	animale: m.animale,
	colore: m.colore,
	tipo: `membro_${i}`,
	rank: i + 1,
	grido: `${m.nome.toUpperCase()}!`,
	premio: calcolaPremio(i + 1),
	prob: calcolaProbabilita(i + 1)
}));

// Particelle per ogni animale vincente (fallback { emoji: '✨', extra: '⭐' } se tipo non trovato)
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
 * Esegue un giro della slot machine.
 * Ogni simbolo ha la propria probabilità di tris, inversamente
 * proporzionale al premio. Simboli top-rank sono rarissimi.
 * Restituisce { simboli, vincita, animale }
 */
export function gira() {
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
	} while (
		simboli[0].tipo === simboli[1].tipo &&
		simboli[1].tipo === simboli[2].tipo
	);

	return { simboli, vincita: false, animale: null };
}

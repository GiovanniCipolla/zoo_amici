/**
 * Slot Machine — logica di gioco.
 * 10 giri al giorno, 2% di win rate forzato.
 * Un tris = vincita.
 */

export const SLOT_SIMBOLI = [
	{ emoji: '🦁', nome: 'Leone', colore: '#e8b84b', tipo: 'leone', grido: 'RUGGITO!' },
	{ emoji: '🐺', nome: 'Lupo', colore: '#8b9ab0', tipo: 'lupo', grido: 'AUUUUU!' },
	{ emoji: '🦈', nome: 'Squalo', colore: '#1840b0', tipo: 'squalo', grido: 'ATTACCO!' },
	{ emoji: '🐆', nome: 'Puma', colore: '#c87830', tipo: 'puma', grido: 'VELOCITÀ!' },
	{ emoji: '🐬', nome: 'Delfino', colore: '#1ab0e8', tipo: 'delfino', grido: 'SPLASH!' },
	{ emoji: '🐻', nome: 'Orso', colore: '#8a5020', tipo: 'orso', grido: 'GRRRR!' },
	{ emoji: '🦒', nome: 'Giraffa', colore: '#e89a30', tipo: 'giraffa', grido: 'IN CIMA!' },
	{ emoji: '🐑', nome: 'Pecora', colore: '#b0b8c8', tipo: 'pecora', grido: 'BEEEEH!' },
	{ emoji: '🦘', nome: 'Canguro', colore: '#d4820a', tipo: 'canguro', grido: 'HOP HOP!' },
	{ emoji: '🦎', nome: 'Varana', colore: '#4aae6a', tipo: 'varana', grido: 'SSSSS!' }
];

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

export const MAX_GIRI = 10;
const WIN_RATE = 0.02;

function chiaveOggi() {
	const d = new Date();
	return `zoo_slots_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStatoGiornaliero() {
	if (typeof localStorage === 'undefined') return { giri: 0, vittorie: 0 };
	try {
		return JSON.parse(localStorage.getItem(chiaveOggi()) ?? '{"giri":0,"vittorie":0}');
	} catch {
		return { giri: 0, vittorie: 0 };
	}
}

export function giriRimasti() {
	return Math.max(0, MAX_GIRI - getStatoGiornaliero().giri);
}

/**
 * Esegue un giro della slot machine.
 * Restituisce { simboli, vincita, animale, esaurito }
 */
export function gira() {
	const stato = getStatoGiornaliero();
	if (stato.giri >= MAX_GIRI) {
		return { simboli: null, vincita: false, esaurito: true };
	}

	const vince = Math.random() < WIN_RATE;
	let simboli;

	if (vince) {
		const s = SLOT_SIMBOLI[Math.floor(Math.random() * SLOT_SIMBOLI.length)];
		simboli = [s, s, s];
	} else {
		// Genera 3 simboli casuali garantendo nessun tris accidentale
		do {
			simboli = Array.from(
				{ length: 3 },
				() => SLOT_SIMBOLI[Math.floor(Math.random() * SLOT_SIMBOLI.length)]
			);
		} while (
			simboli[0].tipo === simboli[1].tipo &&
			simboli[1].tipo === simboli[2].tipo
		);
	}

	stato.giri += 1;
	if (vince) stato.vittorie += 1;

	try {
		localStorage.setItem(chiaveOggi(), JSON.stringify(stato));
	} catch {}

	return {
		simboli,
		vincita: vince,
		animale: vince ? simboli[0] : null,
		esaurito: false
	};
}

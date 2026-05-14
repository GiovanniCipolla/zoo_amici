import { browser } from '$app/environment';

export const ACHIEVEMENTS = [
	{
		id: 'cercatore',
		emoji: '🔍',
		nome: 'Cercatore',
		desc: 'Hai usato la barra di ricerca'
	},
	{
		id: 'curioso',
		emoji: '👀',
		nome: 'Curioso',
		desc: 'Hai aperto 10 schede animale'
	},
	{
		id: 'partecipante',
		emoji: '🎯',
		nome: 'Partecipante',
		desc: 'Hai completato il primo quiz'
	},
	{
		id: 'perfetto',
		emoji: '🏆',
		nome: 'Leggenda',
		desc: 'Punteggio perfetto al quiz'
	},
	{
		id: 'veterano',
		emoji: '📅',
		nome: 'Veterano',
		desc: 'Hai completato 4 quiz o più'
	},
	{
		id: 'esploratore',
		emoji: '🌍',
		nome: 'Esploratore',
		desc: 'Hai filtrato tutte le 9 categorie'
	},
	{
		id: 'chimico',
		emoji: '⚗️',
		nome: 'Chimico',
		desc: 'Hai testato 5 compatibilità'
	},
	{
		id: 'giocatore',
		emoji: '🎰',
		nome: 'Giocatore',
		desc: 'Hai fatto il primo giro alle slot'
	},
	{
		id: 'fortunello',
		emoji: '🍀',
		nome: 'Fortunello',
		desc: 'Hai vinto alle slot machine! (2% di probabilità...)'
	}
];

/** Restituisce l'array degli id sbloccati. */
export function getUnlocked() {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem('zoo_achievements') ?? '[]');
	} catch {
		return [];
	}
}

/**
 * Sblocca un achievement. Restituisce true se era nuovo (appena sbloccato).
 * Emette l'evento globale 'achievement-unlocked' per il toast.
 */
export function unlock(id) {
	if (!browser) return false;
	const current = getUnlocked();
	if (current.includes(id)) return false;
	localStorage.setItem('zoo_achievements', JSON.stringify([...current, id]));
	const def = ACHIEVEMENTS.find((a) => a.id === id);
	if (def) {
		window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: def }));
	}
	return true;
}

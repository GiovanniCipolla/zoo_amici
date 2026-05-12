import { membri } from './membri.js';

/**
 * Aggiungi nuove settimane qui sotto.
 * weekStart: lunedì della settimana (YYYY-MM-DD)
 * risposta: nome del membro (campo `nome` in membri.js)
 */
export const quizWeeks = [
	{
		weekStart: '2026-05-11',
		domande: [
			{
				testo: 'In pochi la conoscono. Rallentata o furba, chi lo sa davvero. Di certo abbastanza impavida da tenere a bada uno degli animali più pericolosi del pianeta.',
				risposta: 'Alexia'
			},
			{
				testo: "Con lui martello e carota. Allo stato selvaggio è imprevedibile, molesto, pericoloso — non replicabile. Ma ama il guinzaglio. E con quello torna docile come nessun altro.",
				risposta: 'Nicola'
			},
			{
				testo: "Sfuggente come pochi. Rintracciabile raramente, impossibile da tenere ferma. Qualcosa di marino nell'aria — forse. In pochi la conoscono davvero. Forse nessuno.",
				risposta: 'Vincenzina'
			},
			{
				testo: "La perfezione esiste, e chi la guarda lo sa. Aura e orgoglio allo stato puro. Un solo difetto: il gin lemon.",
				risposta: 'Bea'
			},
			{
				testo: "Leggenda vivente — nel bene o nel male, non si è ancora capito. Pericoloso e amichevole allo stesso tempo. Insulto facile, ubriacatura facile, sensi di colpa a mille. Sembra originario di Napoli. Con lui è tutto più bello.",
				risposta: 'Anthony'
			}
		]
	}
];

/** Restituisce il quiz della settimana corrente, o null se non esiste. */
export function getCurrentQuiz() {
	const now = new Date();
	for (const week of quizWeeks) {
		const start = new Date(week.weekStart + 'T00:00:00');
		const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
		if (now >= start && now < end) return week;
	}
	return null;
}

/** Millisecondi fino al prossimo lunedì 00:00. */
export function msUntilNextMonday() {
	const now = new Date();
	const day = now.getDay(); // 0=Dom, 1=Lun, ...
	const daysUntilMonday = day === 0 ? 1 : 8 - day;
	const next = new Date(now);
	next.setDate(now.getDate() + daysUntilMonday);
	next.setHours(0, 0, 0, 0);
	return Math.max(0, next.getTime() - now.getTime());
}

/** Formatta millisecondi in "Xg XXh XXm XXs". */
export function formatCountdown(ms) {
	if (ms <= 0) return '00h 00m 00s';
	const s = Math.floor(ms / 1000);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const parts = [];
	if (d > 0) parts.push(`${d}g`);
	parts.push(`${String(h).padStart(2, '0')}h`);
	parts.push(`${String(m).padStart(2, '0')}m`);
	parts.push(`${String(sec).padStart(2, '0')}s`);
	return parts.join(' ');
}

/** Shuffle deterministico con seed intero. */
function seededShuffle(arr, seed) {
	const result = [...arr];
	let s = seed >>> 0;
	for (let i = result.length - 1; i > 0; i--) {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		const j = s % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Restituisce 4 opzioni (1 corretta + 3 sbagliate) in ordine casuale ma deterministico.
 * Le stesse opzioni appaiono per tutti gli utenti nella stessa settimana.
 */
export function getOptions(qIndex, correttaNome, weekStart) {
	const correct = membri.find((m) => m.nome === correttaNome);
	const others = membri.filter((m) => m.nome !== correttaNome);
	const weekNum = parseInt(weekStart.replace(/-/g, ''), 10);
	const seed = (((qIndex + 1) * 997 + weekNum) >>> 0);
	const shuffledOthers = seededShuffle(others, seed);
	return seededShuffle([correct, ...shuffledOthers.slice(0, 3)], (seed + 777) >>> 0);
}

/** Chiave localStorage per una settimana. */
export function quizStorageKey(weekStart) {
	return `zoo_quiz_${weekStart}`;
}

/** Emoji/messaggio in base al punteggio. */
export function scoreInfo(score, total) {
	const ratio = score / total;
	if (ratio === 1) return { emoji: '🏆', msg: 'Perfetto! Sei degno dello Zoo degli Animalacci.' };
	if (ratio >= 0.8) return { emoji: '🥇', msg: 'Ottimo! Conosci bene il tuo branco.' };
	if (ratio >= 0.6) return { emoji: '🥈', msg: 'Non male. Quasi un esperto del gruppo.' };
	if (ratio >= 0.4) return { emoji: '🥉', msg: 'Ci siamo quasi. Frequentali di più.' };
	if (ratio > 0)    return { emoji: '😅', msg: 'Un tentativo. I tuoi amici ti perdonano.' };
	return              { emoji: '💀', msg: 'Ehm... forse li vedi troppo poco?' };
}

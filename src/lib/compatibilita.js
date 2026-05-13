/**
 * Compatibilità tra gli animalacci.
 * Le coppie definite dall'utente sono fisse; le restanti sono
 * calcolate deterministicamente tramite hash — sempre lo stesso risultato.
 */

/** Coppie con punteggio deciso dall'utente (chiave: nomi ordinati alfabeticamente). */
const OVERRIDES = {
	'Luisa|Yayà': 9,       // Leonessa L. + Leone
	'Pompoff|Yayà': 10,    // Scoiattolo + Leone
	'Alexia|Downtonio': 9, // Varana Alx. + Varano
	'Alice|Downtonio': 8,  // Coniglio Nero + Varano
	'Bea|Pompoff': 10,     // Leonessa B. + Scoiattolo
	'Nico Nico|Nicola': 9, // Lupetto N. + Lupo
	'Angelone|Vincenzina': 10 // Delfino + Antilope
};

/** Hash deterministico di una stringa → intero positivo. */
function strHash(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

/**
 * Restituisce il punteggio di compatibilità tra due membri (1–10).
 * Simmetrico: compatScore(A, B) === compatScore(B, A).
 */
export function compatScore(nome1, nome2) {
	const key = [nome1, nome2].sort().join('|');
	if (key in OVERRIDES) return OVERRIDES[key];
	// Range 2–9 per le coppie non specificate (evita estremi banali)
	return (strHash(key) % 8) + 2;
}

/** Commenti per fascia di punteggio — scelti deterministicamente per coppia. */
const COMMENTI = {
	10: [
		"Destinati l'uno all'altro. L'universo lo sapeva prima di loro.",
		'Una forza cosmica. Inspiegabile, inevitabile, leggendaria.',
		'Compatibilità assoluta. Il tipo di intesa che non si spiega — si subisce.'
	],
	alto: [
		'Intesa fuori dall\'ordinario. Si capiscono con uno sguardo.',
		'Alchimia rara. Il tipo di feeling che si trova una volta su mille.',
		'Non hanno bisogno di spiegarsi. Funziona — e basta.'
	],
	medio: [
		'Buona base. Qualche attrito, ma funziona meglio di quanto sembri.',
		'Due caratteri che trovano un equilibrio inaspettato.',
		'Funziona. Non chiederti perché — accettalo e basta.'
	],
	basso: [
		'Si tollerano. Ed è già un risultato non scontato.',
		'Rapporto complesso. Ma chi non ne ha uno interessante?',
		'Bassa tensione. Non esplosiva, ma presente. Come sempre.'
	],
	minimo: [
		'Caos puro. Ma almeno non ci si annoia mai insieme.',
		'Come fuoco e acqua. Il risultato: vapore, confusione e qualcosa di epico.',
		'Dinamica imprevedibile. Non per tutti — decisamente non per tutti.'
	]
};

/** Restituisce label, colore e commento per un dato punteggio e coppia. */
export function compatInfo(score, nome1, nome2) {
	const key = [nome1, nome2].sort().join('|');
	const idx = strHash(key + score);

	let tier, label, colore;
	if (score === 10) {
		tier = COMMENTI[10];
		label = 'Anima gemella';
		colore = '#ffd700';
	} else if (score >= 8) {
		tier = COMMENTI.alto;
		label = 'Intesa perfetta';
		colore = '#4ade80';
	} else if (score >= 6) {
		tier = COMMENTI.medio;
		label = 'Buona alchimia';
		colore = '#60a5fa';
	} else if (score >= 4) {
		tier = COMMENTI.basso;
		label = 'Si tollerano';
		colore = '#f97316';
	} else {
		tier = COMMENTI.minimo;
		label = 'Caos garantito';
		colore = '#f87171';
	}

	return { label, colore, commento: tier[idx % tier.length] };
}

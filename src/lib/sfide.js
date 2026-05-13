/**
 * 30 sfide giornaliere del gruppo Zoo Animalacci.
 * Una sfida diversa ogni giorno dell'anno, ciclica su 30.
 */
export const sfide = [
	{
		tema: 'Sopravvivenza nel bosco',
		emoji: '🌲',
		descrizione:
			'Bloccati nel bosco senza segnale né cibo. Chi costruisce il rifugio? Chi trova da mangiare? Chi è già in lacrime al minuto 3 chiamando i soccorsi con un ramo?'
	},
	{
		tema: 'Aperitivo infinito',
		emoji: '🍹',
		descrizione:
			"L'aperitivo non finisce mai. Chi regge fino alle 4 di mattina? Chi racconta per la terza volta la storia della propria vita? Chi ordina la quinta bevanda convinto di stare benissimo?"
	},
	{
		tema: 'Black Friday',
		emoji: '🛒',
		descrizione:
			'Apertura negozi alle 6:00. Chi era in fila dalla mezzanotte? Chi compra cose assolutamente inutili con la faccia soddisfatta? Chi finisce i soldi prima di mezzogiorno senza rimpianti?'
	},
	{
		tema: 'Gita in montagna',
		emoji: '🏔️',
		descrizione:
			'Escursione 10km con dislivello. Chi arriva in cima per primo senza fiatare? Chi finge di avere mal di ginocchio già al secondo tornante? Chi porta il panino di riserva e lo difende con la vita?'
	},
	{
		tema: 'Karaoke notturno',
		emoji: '🎤',
		descrizione:
			"Microfono in mano, nessuna via d'uscita. Chi prende tutte le note con stile? Chi canta la stessa canzone per la terza volta stasera? Chi sparisce ogni volta che tocca a lui e ricompare al bis?"
	},
	{
		tema: 'Partita a calcio',
		emoji: '⚽',
		descrizione:
			"5 vs 5 al campetto sotto casa. Chi segna e festeggia come ai mondiali? Chi litiga con l'arbitro dal minuto 1? Chi vuole fare il portiere solo per non correre?"
	},
	{
		tema: 'Cena al ristorante chic',
		emoji: '🕯️',
		descrizione:
			'Menù incomprensibile, cameriere in guanti bianchi. Chi ordina la cosa più cara senza battere ciglio? Chi conosce davvero la differenza tra i calici? Chi rovescia il vino bianco sul vestito buono?'
	},
	{
		tema: 'Volo low cost',
		emoji: '✈️',
		descrizione:
			'Posto centrale assegnato, bagaglio a mano conteso. Chi arriva al gate 2 minuti prima della chiusura con tre borse? Chi dorme dal decollo fino ai bagagli? Chi mangia un pasto completo a bordo senza vergogna?'
	},
	{
		tema: 'Coda autostradale',
		emoji: '🚗',
		descrizione:
			'40km di coda al sole. Chi cambia corsia ogni 30 secondi? Chi inizia a cantare per stemperare la tensione? Chi mangia un pasto completo in auto come se nulla fosse?'
	},
	{
		tema: 'Fila alle poste',
		emoji: '📬',
		descrizione:
			'Numero 847. Stanno al 12. Chi porta un libro? Chi conosce già tutti in fila entro 10 minuti? Chi si lamenta ad alta voce ogni 2 minuti e poi si scusa?'
	},
	{
		tema: 'Esame a sorpresa',
		emoji: '📚',
		descrizione:
			"Domani esame, nessuno ha studiato. Chi apre i libri alle 3 di notte credendo di recuperare? Chi si convince di sapere già tutto e va a dormire alle 22? Chi copia con tale eleganza da diventare leggenda?"
	},
	{
		tema: 'Trasloco al quarto piano',
		emoji: '📦',
		descrizione:
			"Scatole ovunque, ascensore fuori servizio. Chi porta i mobili pesanti senza protestare? Chi si occupa solo degli oggetti fragili? Chi sparisce nei momenti cruciali e riappare col caffè?"
	},
	{
		tema: 'Masterchef notturno',
		emoji: '👨‍🍳',
		descrizione:
			'Soli in cucina, frigo quasi vuoto, ospiti in arrivo tra un ora. Chi inventa qualcosa di commestibile? Chi brucia il sugo e nega tutto? Chi ordina la pizza in segreto mentre gli altri cucinano?'
	},
	{
		tema: 'Notte in tenda',
		emoji: '⛺',
		descrizione:
			'Campeggio improvvisato nella natura. Chi porta tutto il necessario con lista precompilata? Chi dimentica il sacco a pelo e si lamenta tutta la notte? Chi sente rumori nel bosco e sveglia tutti alle 3?'
	},
	{
		tema: 'Gara di ballo',
		emoji: '💃',
		descrizione:
			'Pista da ballo, tutti obbligati a esibirsi. Chi prende campo e non lo lascia per tutta la serata? Chi balla in un angolo sperando di non essere visto? Chi improvvisa mosse mai catalogate dalla scienza?'
	},
	{
		tema: 'Escape room',
		emoji: '🔐',
		descrizione:
			"60 minuti per uscire dalla stanza. Chi risolve gli enigmi in silenzio con metodo? Chi urla la soluzione sbagliata con certezza assoluta? Chi inizia a cedere al panico al minuto 20 dicendo 'è impossibile'?"
	},
	{
		tema: 'Mercatino dell\'usato',
		emoji: '🛍️',
		descrizione:
			"Un'ora, 20€ in tasca. Chi trova il pezzo unico della vita? Chi contratta ogni singolo centesimo senza cedere mai? Chi compra qualcosa di inspiegabile convinto di fare l'affare dell'anno?"
	},
	{
		tema: 'Ferragosto in spiaggia',
		emoji: '🏖️',
		descrizione:
			'Spiaggia al completo, 37 gradi. Chi occupa 10mq con teli, ombrellone e borsa frigo? Chi entra in acqua dopo 5 secondi al sole? Chi finisce la crema solare altrui senza chiedere?'
	},
	{
		tema: 'Maratona cinematografica',
		emoji: '🎬',
		descrizione:
			"5 film di fila, divano, coperta, buio totale. Chi sceglie la lista e non accetta obiezioni? Chi si addormenta al secondo film negando di dormire? Chi commenta ogni scena con teorie di propria elaborazione?"
	},
	{
		tema: 'Torneo di videogiochi',
		emoji: '🎮',
		descrizione:
			"Finale epica, tutti contro tutti. Chi vince e non lo fa pesare (solo per i prossimi 6 mesi)? Chi dà la colpa al controller difettoso? Chi smette dicendo 'non era comunque il mio genere'?"
	},
	{
		tema: 'Corsa del mattino',
		emoji: '🏃',
		descrizione:
			"Sveglia alle 6, tutti convocati al parco. Chi è già stirato e pronto con la playlist curata? Chi appare in tuta strappata con gli occhi ancora chiusi? Chi torna indietro dopo 500 metri per 'un crampo improvviso'?"
	},
	{
		tema: 'Dieta di gruppo',
		emoji: '🥗',
		descrizione:
			"7 giorni senza junk food, parola d'onore davanti a tutti. Chi regge 3 giorni interi con orgoglio? Chi finisce le patatine al giorno 2 perché 'era già aperto'? Chi non aveva mai iniziato ma partecipa alla chat di supporto?"
	},
	{
		tema: 'Partita a carte',
		emoji: '♠️',
		descrizione:
			'Scala 40, ultimi giri, tutto in gioco. Chi bluffa con la faccia più seria del tavolo? Chi vince e lo ricorderà per i prossimi sei mesi? Chi accusa qualcuno di barare senza una singola prova?'
	},
	{
		tema: 'Concerto all\'aperto',
		emoji: '🎸',
		descrizione:
			"Prima fila, 3 ore in piedi. Chi conosce tutte le parole di ogni canzone? Chi filma ogni momento invece di viverlo? Chi sparisce durante i bis per 'evitare il traffico in uscita'?"
	},
	{
		tema: 'Shopping natalizio di emergenza',
		emoji: '🎄',
		descrizione:
			"Il 24 dicembre, regali ancora da fare. Chi compra tutto quel giorno con calma olimpica? Chi confeziona i regali in modo artistico da sembrare un professionista? Chi consegna qualcosa di riciclato con carta nuova e sorriso innocente?"
	},
	{
		tema: 'Notte in bianco',
		emoji: '🌙',
		descrizione:
			"Sfida di resistenza: nessuno dorme. Chi conta le stelle alle 7 di mattina ancora lucido? Chi crolla alle 2:30 giurando di 'riposare solo 5 minuti'? Chi diventa profondamente filosofo dopo le 3 di notte?"
	},
	{
		tema: 'Quiz di cultura generale',
		emoji: '🧠',
		descrizione:
			"Domande a raffica, timer spietato. Chi risponde di tutto con la sicurezza di chi sa davvero? Chi usa 'mah, non si sa mai' come strategia consolidata? Chi conosce solo domande di calcio o musica ma vince comunque?"
	},
	{
		tema: 'Sfida piccante',
		emoji: '🌶️',
		descrizione:
			'Livello di piccante crescente, nessuna resa onorevole. Chi arriva fino in fondo senza versare una lacrima? Chi chiede acqua già al primo piatto? Chi nega di soffrire con la faccia rossa come un peperone?'
	},
	{
		tema: 'Gara fotografica',
		emoji: '📸',
		descrizione:
			"Un'ora di tempo, tema libero, vince il più creativo. Chi fa la foto artistica che nessuno capisce ma tutti apprezzano? Chi fotografa solo cibo? Chi cancella 30 scatti perché 'non catturavano l'essenza giusta'?"
	},
	{
		tema: 'Capodanno',
		emoji: '🎉',
		descrizione:
			"Conto alla rovescia, brindisi, fuochi artificiali. Chi abbraccia tutti commosso con le lacrime agli occhi? Chi era già distrutto alle 22:00? Chi aspetta solo la mezzanotte per potersi giustificare ad andare a dormire?"
	}
];

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
 * Restituisce tutti i dati della sfida del giorno:
 * - sfida: tema e descrizione
 * - formato: '1v1' | '2v2'
 * - lato1 / lato2: array di membri (1 o 2 per lato)
 * - voteKey: chiave localStorage unica per oggi
 *
 * Tutto è deterministico: lo stesso giorno → stessi avversari.
 */
export function getSfidaDati(membri) {
	const d = new Date();
	const dayOfYear = Math.floor(
		(d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000
	);
	const sfida = sfide[(dayOfYear - 1 + sfide.length) % sfide.length];

	// 3 giorni su 5 → 1v1, 2 su 5 → 2v2
	const formato = dayOfYear % 5 < 3 ? '1v1' : '2v2';
	const n = formato === '1v1' ? 2 : 4;

	const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
	const picked = seededShuffle(membri, seed * 31337).slice(0, n);

	const lato1 = formato === '1v1' ? [picked[0]] : [picked[0], picked[1]];
	const lato2 = formato === '1v1' ? [picked[1]] : [picked[2], picked[3]];

	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	const voteKey = `zoo_sfida_${d.getFullYear()}-${mm}-${dd}`;

	return { sfida, formato, lato1, lato2, voteKey };
}

/** Formatta la data odierna in italiano. */
export function oggiFormattato() {
	return new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

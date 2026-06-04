<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { membri } from '$lib/membri.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { unlock, checkEconomyAchievements } from '$lib/achievements.js';

	// ── CONFIGURAZIONE TAVOLI ────────────────────────────────────────────
	const TAVOLI = [
		{
			id: 'varano', nome: 'Tavolo del Varano', emoji: '🦎', colore: '#22c55e',
			entrata: 10, sb: 2, bb: 4, numGiocatori: 5,
			desc: 'Piccolo buio €2 · Grande buio €4 · 5 giocatori'
		},
		{
			id: 'lupo', nome: 'Tavolo del Lupo', emoji: '🐺', colore: '#f59e0b',
			entrata: 50, sb: 20, bb: 40, numGiocatori: 5,
			desc: 'Piccolo buio €20 · Grande buio €40 · 5 giocatori'
		},
		{
			id: 'leone', nome: 'Tavolo del Leone', emoji: '🦁', colore: '#ef4444',
			entrata: 500, sb: 150, bb: 300, numGiocatori: 5,
			desc: 'Piccolo buio €150 · Grande buio €300 · 5 giocatori'
		},
		{
			id: 'torneo', nome: 'Torneo degli Animali', emoji: '🏆', colore: '#a855f7',
			entrata: 100, sb: 10, bb: 20, numGiocatori: 10, isTorneo: true,
			chipIniziali: 1000,
			desc: '10 giocatori · Eliminazione classica · Montepremi €1000'
		}
	];

	// ── BLINDS TORNEO (aumentano ogni 2 min) ─────────────────────────────
	const BLIND_SCHEDULE = [
		{ sb: 10, bb: 20 },
		{ sb: 20, bb: 40 },
		{ sb: 30, bb: 60 },
		{ sb: 50, bb: 100 },
		{ sb: 75, bb: 150 },
		{ sb: 100, bb: 200 },
		{ sb: 150, bb: 300 },
		{ sb: 200, bb: 400 }
	];

	// ── SISTEMA CARTE ────────────────────────────────────────────────────
	const SEMI = ['♠', '♥', '♦', '♣'];
	const SEMI_ROSSI = new Set(['♥', '♦']);
	const NOMI_VAL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

	function creaMazzo() {
		const deck = [];
		for (const seme of SEMI)
			for (let v = 2; v <= 14; v++)
				deck.push({ valore: v, seme });
		return mischia(deck);
	}

	function mischia(arr) {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function dispVal(v) { return NOMI_VAL[v] ?? String(v); }
	function isRosso(seme) { return SEMI_ROSSI.has(seme); }

	// ── VALUTAZIONE MANO (7 carte → miglior 5) ──────────────────────────
	function combinazioni5(arr) {
		const res = [];
		const n = arr.length;
		for (let a = 0; a < n - 4; a++)
			for (let b = a + 1; b < n - 3; b++)
				for (let c = b + 1; c < n - 2; c++)
					for (let d = c + 1; d < n - 1; d++)
						for (let e = d + 1; e < n; e++)
							res.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
		return res;
	}

	function valuta5(carte) {
		const vals = carte.map(c => c.valore).sort((a, b) => b - a);
		const isFlush = new Set(carte.map(c => c.seme)).size === 1;
		const counts = {};
		for (const v of vals) counts[v] = (counts[v] || 0) + 1;
		const gruppi = Object.entries(counts)
			.map(([v, n]) => [+v, n])
			.sort((a, b) => b[1] - a[1] || b[0] - a[0]);

		const valSet = new Set(vals);
		if (valSet.has(14)) valSet.add(1);
		let isStraight = false, strHigh = 0;
		for (let h = 14; h >= 5; h--) {
			if ([h, h - 1, h - 2, h - 3, h - 4].every(v => valSet.has(v))) {
				isStraight = true; strHigh = h; break;
			}
		}

		if (isFlush && isStraight) return { rank: 8, tb: [strHigh], nome: strHigh === 14 ? 'Royal Flush' : 'Scala Reale' };
		if (gruppi[0][1] === 4) return { rank: 7, tb: [gruppi[0][0], gruppi[1][0]], nome: 'Poker' };
		if (gruppi[0][1] === 3 && gruppi[1]?.[1] === 2) return { rank: 6, tb: [gruppi[0][0], gruppi[1][0]], nome: 'Full House' };
		if (isFlush) return { rank: 5, tb: vals, nome: 'Colore' };
		if (isStraight) return { rank: 4, tb: [strHigh], nome: 'Scala' };
		if (gruppi[0][1] === 3) return { rank: 3, tb: [gruppi[0][0], ...gruppi.slice(1).map(g => g[0]).sort((a, b) => b - a)], nome: 'Tris' };
		if (gruppi[0][1] === 2 && gruppi[1]?.[1] === 2) {
			const pairs = [gruppi[0][0], gruppi[1][0]].sort((a, b) => b - a);
			return { rank: 2, tb: [...pairs, gruppi[2]?.[0] ?? 0], nome: 'Doppia Coppia' };
		}
		if (gruppi[0][1] === 2) return { rank: 1, tb: [gruppi[0][0], ...gruppi.slice(1).map(g => g[0]).sort((a, b) => b - a)], nome: 'Coppia' };
		return { rank: 0, tb: vals, nome: 'Carta Alta' };
	}

	function valutaMano(carte7) {
		let best = null;
		for (const combo of combinazioni5(carte7)) {
			const v = valuta5(combo);
			if (!best || v.rank > best.rank || (v.rank === best.rank && cmpTB(v.tb, best.tb) > 0)) best = v;
		}
		return best ?? { rank: 0, tb: [], nome: '—' };
	}

	function cmpTB(a, b) {
		for (let i = 0; i < Math.max(a.length, b.length); i++) {
			const d = (a[i] ?? 0) - (b[i] ?? 0);
			if (d !== 0) return d;
		}
		return 0;
	}

	function cmpMani(a, b) {
		if (a.rank !== b.rank) return a.rank - b.rank;
		return cmpTB(a.tb, b.tb);
	}

	// ── AI: STIMA FORZA MANO ─────────────────────────────────────────────
	function stimaPreflop(carte2) {
		const [c1, c2] = [...carte2].sort((a, b) => b.valore - a.valore);
		const v1 = c1.valore, v2 = c2.valore;
		const suited = c1.seme === c2.seme;
		if (v1 === v2) {
			const tbl = { 14: 0.98, 13: 0.94, 12: 0.9, 11: 0.85, 10: 0.8, 9: 0.75, 8: 0.7, 7: 0.65, 6: 0.6 };
			return tbl[v1] ?? 0.5;
		}
		let f = 0.28 + (v1 - 2) / 26 + (v2 - 2) / 40;
		if (suited) f += 0.08;
		if (v1 - v2 <= 2) f += 0.05;
		if (v1 === 14) f += 0.08;
		return Math.max(0.12, Math.min(0.9, f));
	}

	function stimaForza(cartePrivate, comunita) {
		if (!cartePrivate || cartePrivate.length < 2) return 0.3;
		if (comunita.length === 0) return stimaPreflop(cartePrivate);
		const m = valutaMano([...cartePrivate, ...comunita]);
		const noise = (Math.random() - 0.5) * 0.1;
		return Math.max(0.05, Math.min(0.97, m.rank / 8 + noise));
	}

	// ── STATO PRINCIPALE ─────────────────────────────────────────────────
	let fase = $state('tavoli');        // tavoli | gioco | esci
	let faseMano = $state('attesa');    // attesa | preflop | flop | turn | river | showdown
	let tavolo = $state(null);

	let giocatori = $state([]);
	let mazzoArr = [];
	let carteComunita = $state([]);
	let pot = $state(0);
	let puntataCorrente = $state(0);    // massimo bet del round corrente
	let dealerIdx = $state(0);
	let sbIdx = $state(0);
	let bbIdx = $state(0);
	let turnoIdx = $state(-1);
	let daAgire = $state([]);           // coda di player che devono agire

	let blindSb = $state(0);
	let blindBb = $state(0);

	let mostraRaise = $state(false);
	let importoRaise = $state(0);

	let vincitoriMano = $state([]);
	let mostraEsito = $state(false);
	let allInRunout = $state(false);
	let saldo = $state(0);
	let particelle = $state([]);
	let partIdCnt = 0;
	let aiThinking = $state(false);
	let aiTmout = null;

	// Torneo
	let torneoInterval = null;
	let prossimoBlindsIn = $state(120);
	let blindLivello = $state(0);

	// Fine partita
	let risultatoFinale = $state(null); // { vinto, chips, isRE }

	onMount(() => {
		if (browser) saldo = getSaldo();
	});

	onDestroy(() => {
		if (aiTmout) clearTimeout(aiTmout);
		if (torneoInterval) clearInterval(torneoInterval);
	});

	// ── SCELTA TAVOLO ────────────────────────────────────────────────────
	function scegliTavolo(t) {
		if (saldo < t.entrata) return;
		spendSaldo(t.entrata);
		saldo = getSaldo();
		tavolo = t;
		blindSb = t.sb;
		blindBb = t.bb;
		blindLivello = 0;

		const shuffled = mischia([...membri]);
		const numAI = t.numGiocatori - 1;
		// Per i cash game: l'entrata è solo la quota d'ingresso (costo fisso),
		// il player usa il saldo rimanente come chip stack
		const saldoDopoEntrata = getSaldo();
		const chipStart = t.isTorneo ? t.chipIniziali : saldoDopoEntrata;
		// Trasferisci il saldo rimasto in chip (wallet → 0 durante il gioco)
		if (!t.isTorneo && saldoDopoEntrata > 0) {
			spendSaldo(saldoDopoEntrata);
			saldo = 0;
		}

		const aiPlayers = shuffled.slice(0, numAI).map(m => ({
			nome: m.nome, emoji: m.emoji, chips: chipStart,
			cartePrivate: [], bet: 0,
			folded: false, allIn: false, isAI: true,
			personalita: getPersonalita(m.nome),
			manoValutata: null, eliminato: false
		}));

		giocatori = [
			{
				nome: 'Tu', emoji: '🧑', chips: chipStart,
				cartePrivate: [], bet: 0,
				folded: false, allIn: false, isAI: false,
				personalita: 'human', manoValutata: null, eliminato: false
			},
			...aiPlayers
		];

		dealerIdx = Math.floor(Math.random() * giocatori.length);
		risultatoFinale = null;

		if (t.isTorneo) {
			prossimoBlindsIn = 120;
			torneoInterval = setInterval(() => {
				prossimoBlindsIn -= 1;
				if (prossimoBlindsIn <= 0) {
					prossimoBlindsIn = 120;
					blindLivello = Math.min(blindLivello + 1, BLIND_SCHEDULE.length - 1);
					blindSb = BLIND_SCHEDULE[blindLivello].sb;
					blindBb = BLIND_SCHEDULE[blindLivello].bb;
				}
			}, 1000);
		}

		fase = 'gioco';
		iniziaMano();
	}

	function getPersonalita(nome) {
		if (['Luisa', 'Giancarlo', 'Fetente', 'Anthony'].includes(nome)) return 'aggressivo';
		if (['Pompoff', 'Aquilino', 'Tartaruga', 'Nunzia'].includes(nome)) return 'conservativo';
		return 'random';
	}

	// ── NUOVA MANO ───────────────────────────────────────────────────────
	function iniziaMano() {
		faseMano = 'attesa';
		mostraEsito = false;
		allInRunout = false;
		vincitoriMano = [];
		carteComunita = [];
		pot = 0;
		puntataCorrente = 0;
		mostraRaise = false;

		// Elimina chi non ha chip
		giocatori = giocatori.map(g => ({
			...g,
			cartePrivate: [], bet: 0, folded: false, allIn: false, manoValutata: null,
			eliminato: g.eliminato || g.chips <= 0
		}));

		const attivi = giocatori.filter(g => !g.eliminato);
		if (attivi.length < 2) { finePartita(); return; }

		mazzoArr = creaMazzo();

		// Avanza dealer
		dealerIdx = nextActive(dealerIdx);
		if (attivi.length === 2) {
			sbIdx = dealerIdx;
			bbIdx = nextActive(sbIdx);
		} else {
			sbIdx = nextActive(dealerIdx);
			bbIdx = nextActive(sbIdx);
		}

		// Posta blind
		postBlind(sbIdx, blindSb);
		postBlind(bbIdx, blindBb);
		puntataCorrente = giocatori[bbIdx].bet;

		// Distribuisce 2 carte a ciascun attivo
		for (let i = 0; i < giocatori.length; i++) {
			if (!giocatori[i].eliminato) {
				giocatori[i] = { ...giocatori[i], cartePrivate: [mazzoArr.pop(), mazzoArr.pop()] };
			}
		}
		giocatori = [...giocatori];

		faseMano = 'preflop';
		buildBetting('preflop');
	}

	function postBlind(idx, importo) {
		const g = giocatori[idx];
		const eff = Math.min(importo, g.chips);
		g.chips -= eff;
		g.bet = (g.bet || 0) + eff;
		pot += eff;
		if (g.chips === 0) g.allIn = true;
	}

	function nextActive(fromIdx) {
		const n = giocatori.length;
		let idx = (fromIdx + 1) % n;
		for (let t = 0; t < n; t++) {
			if (!giocatori[idx].eliminato) return idx;
			idx = (idx + 1) % n;
		}
		return fromIdx;
	}

	// ── ROUND DI PUNTATE ─────────────────────────────────────────────────
	function buildBetting(round) {
		const n = giocatori.length;
		const startIdx = round === 'preflop'
			? (bbIdx + 1) % n
			: nextActive(dealerIdx);

		const queue = [];
		for (let i = 0; i < n; i++) {
			const idx = (startIdx + i) % n;
			const g = giocatori[idx];
			if (!g.folded && !g.allIn && !g.eliminato) queue.push(idx);
		}
		daAgire = queue;

		const attiviVivi = giocatori.filter(g => !g.folded && !g.allIn && !g.eliminato);
		if (attiviVivi.length <= 1 || queue.length === 0) {
			// All-in runout: mostra le carte degli avversari e aggiungi delay
			const rimastinMano = giocatori.filter(g => !g.folded && !g.eliminato);
			if (rimastinMano.length >= 2) allInRunout = true;
			setTimeout(() => prossimaFase(), 1400);
			return;
		}
		avanzaTurno();
	}

	function avanzaTurno() {
		// Check single player left
		const rimasti = giocatori.filter(g => !g.folded && !g.eliminato);
		if (rimasti.length === 1) {
			premiaSingolo(rimasti[0]);
			return;
		}
		if (daAgire.length === 0) {
			prossimaFase();
			return;
		}

		turnoIdx = daAgire[0];
		daAgire = daAgire.slice(1);

		if (giocatori[turnoIdx]?.isAI) {
			aiThinking = true;
			aiTmout = setTimeout(() => {
				aiThinking = false;
				mossaAI();
			}, 500 + Math.random() * 900);
		}
	}

	// ── AZIONI PLAYER ────────────────────────────────────────────────────
	function eseguiAzione(azione, importo = 0) {
		if (turnoIdx < 0) return;
		mostraRaise = false;
		const g = { ...giocatori[turnoIdx] };

		if (azione === 'fold') {
			g.folded = true;
			giocatori[turnoIdx] = g;
			giocatori = [...giocatori];
			const rimasti = giocatori.filter(x => !x.folded && !x.eliminato);
			if (rimasti.length === 1) { premiaSingolo(rimasti[0]); return; }
			avanzaTurno();
			return;
		}

		if (azione === 'check') {
			giocatori[turnoIdx] = g;
			avanzaTurno();
			return;
		}

		if (azione === 'call') {
			const da = Math.min(puntataCorrente - g.bet, g.chips);
			g.chips -= da; g.bet += da; pot += da;
			if (g.chips === 0) g.allIn = true;
			giocatori[turnoIdx] = g;
			giocatori = [...giocatori];
			avanzaTurno();
			return;
		}

		if (azione === 'raise') {
			const totale = Math.min(importo, g.chips + g.bet);
			const da = totale - g.bet;
			if (da <= 0) { avanzaTurno(); return; }
			g.chips -= da; g.bet = totale; pot += da;
			puntataCorrente = totale;
			if (g.chips === 0) g.allIn = true;
			giocatori[turnoIdx] = g;
			giocatori = [...giocatori];

			// Re-coda tutti gli altri attivi
			const ci = turnoIdx;
			const nuova = [];
			for (let i = 1; i < giocatori.length; i++) {
				const idx = (ci + i) % giocatori.length;
				const gj = giocatori[idx];
				if (!gj.folded && !gj.allIn && !gj.eliminato) nuova.push(idx);
			}
			daAgire = nuova;
			avanzaTurno();
			return;
		}
	}

	// ── AI LOGIC ─────────────────────────────────────────────────────────
	function mossaAI() {
		const g = giocatori[turnoIdx];
		if (!g?.isAI) return;

		const forza = stimaForza(g.cartePrivate, carteComunita);
		const daChiamare = Math.max(0, puntataCorrente - g.bet);
		const isAgg = g.personalita === 'aggressivo';
		const isCons = g.personalita === 'conservativo';

		if (daChiamare <= 0) {
			// Può checkare o aprire
			const soglia = isAgg ? 0.52 : isCons ? 0.70 : 0.60;
			const bluff = isAgg ? 0.22 : 0.08;
			if (forza >= soglia || Math.random() < bluff) {
				const mult = isAgg ? 2.5 : 1.8;
				const raiseAmt = Math.min(puntataCorrente + Math.ceil(blindBb * mult), g.chips + g.bet);
				if (raiseAmt > g.bet) { eseguiAzione('raise', raiseAmt); return; }
			}
			eseguiAzione('check');
		} else {
			const potOdds = daChiamare / (pot + daChiamare + 0.01);
			const soglia = potOdds + (isCons ? 0.1 : isAgg ? -0.04 : 0.03);

			if (forza >= soglia + 0.22 && isAgg && Math.random() < 0.45) {
				const raiseAmt = Math.min(Math.ceil(puntataCorrente * 2.2), g.chips + g.bet);
				if (raiseAmt > puntataCorrente) { eseguiAzione('raise', raiseAmt); return; }
			}

			if (forza >= soglia) {
				eseguiAzione('call');
			} else if (Math.random() < 0.07) {
				eseguiAzione('call'); // bluff call
			} else {
				eseguiAzione('fold');
			}
		}
	}

	// ── AVANZAMENTO FASI ─────────────────────────────────────────────────
	function prossimaFase() {
		giocatori = giocatori.map(g => ({ ...g, bet: 0 }));
		puntataCorrente = 0;

		if (faseMano === 'preflop') {
			carteComunita = [mazzoArr.pop(), mazzoArr.pop(), mazzoArr.pop()];
			faseMano = 'flop';
		} else if (faseMano === 'flop') {
			carteComunita = [...carteComunita, mazzoArr.pop()];
			faseMano = 'turn';
		} else if (faseMano === 'turn') {
			carteComunita = [...carteComunita, mazzoArr.pop()];
			faseMano = 'river';
		} else if (faseMano === 'river') {
			showdown();
			return;
		}

		giocatori = [...giocatori];
		buildBetting('postflop');
	}

	function showdown() {
		faseMano = 'showdown';

		const attiviIdx = giocatori
			.map((g, i) => ({ g, i }))
			.filter(({ g }) => !g.folded && !g.eliminato && g.cartePrivate.length === 2);

		if (attiviIdx.length === 0) return;

		const valutati = attiviIdx.map(({ g, i }) => {
			const m = valutaMano([...g.cartePrivate, ...carteComunita]);
			giocatori[i] = { ...g, manoValutata: m };
			return { idx: i, m };
		});
		giocatori = [...giocatori];

		const best = valutati.reduce((b, c) => cmpMani(c.m, b.m) > 0 ? c : b);
		const vincitori = valutati.filter(v => cmpMani(v.m, best.m) === 0);

		const quota = Math.floor(pot / vincitori.length);
		vincitoriMano = [];
		for (const v of vincitori) {
			giocatori[v.idx] = { ...giocatori[v.idx], chips: giocatori[v.idx].chips + quota };
			vincitoriMano.push({ ...giocatori[v.idx] });
		}
		giocatori = [...giocatori];

		const playerVince = vincitori.some(v => !giocatori[v.idx].isAI);
		if (playerVince) {
			generaParticelle();
			unlock('poker_vincitore');
		}

		// Piccolo delay per far vedere le carte prima dell'overlay risultato
		setTimeout(() => {
			mostraEsito = true;
			checkContinua();
		}, allInRunout ? 2000 : 600);
	}

	function premiaSingolo(vincitore) {
		const idx = giocatori.findIndex((g, i) =>
			g.nome === vincitore.nome && g.emoji === vincitore.emoji
		);
		if (idx < 0) return;
		giocatori[idx] = { ...giocatori[idx], chips: giocatori[idx].chips + pot };
		vincitoriMano = [{ ...giocatori[idx] }];
		faseMano = 'showdown';
		mostraEsito = true;
		giocatori = [...giocatori];

		if (!vincitore.isAI) generaParticelle();
		checkContinua();
	}

	function checkContinua() {
		const player = giocatori.find(g => !g.isAI);
		if (!player) return;

		if (tavolo?.isTorneo) {
			const inGioco = giocatori.filter(g => !g.eliminato && g.chips > 0);
			if (inGioco.length <= 1) setTimeout(finePartita, 1800);
			else if (player.chips <= 0) setTimeout(finePartita, 1800);
		} else {
			if (player.chips <= 0) setTimeout(finePartita, 1800);
		}
	}

	function prossimaManno() {
		mostraEsito = false;
		giocatori = giocatori.map(g => ({
			...g, eliminato: g.eliminato || g.chips <= 0
		}));
		const attivi = giocatori.filter(g => !g.eliminato);
		if (attivi.length < 2) { finePartita(); return; }
		const player = giocatori.find(g => !g.isAI);
		if (!player || player.chips <= 0) { finePartita(); return; }
		iniziaMano();
	}

	function lasciaTavolo() {
		if (aiTmout) clearTimeout(aiTmout);
		if (torneoInterval) clearInterval(torneoInterval);
		const player = giocatori.find(g => !g.isAI);
		if (player && player.chips > 0 && !tavolo?.isTorneo) {
			addSaldo(player.chips, 'poker_cashout');
			saldo = getSaldo();
			risultatoFinale = { vinto: player.chips > tavolo.entrata, chips: player.chips };
		} else {
			risultatoFinale = { vinto: false, chips: 0 };
		}
		checkEconomyAchievements();
		fase = 'esci';
	}

	function finePartita() {
		if (aiTmout) clearTimeout(aiTmout);
		if (torneoInterval) clearInterval(torneoInterval);

		const player = giocatori.find(g => !g.isAI);

		if (tavolo?.isTorneo) {
			const inGioco = giocatori.filter(g => !g.eliminato && g.chips > 0);
			if (inGioco.length === 1 && !inGioco[0].isAI) {
				const premio = tavolo.entrata * tavolo.numGiocatori;
				addSaldo(premio, 'poker_torneo_vinto');
				saldo = getSaldo();
				unlock('poker_torneo');
				risultatoFinale = { vinto: true, chips: premio, isTorneo: true };
			} else {
				const winner = inGioco[0];
				risultatoFinale = { vinto: false, chips: 0, isTorneo: true, winner };
			}
		} else if (player && player.chips > 0) {
			addSaldo(player.chips, 'poker_cashout');
			saldo = getSaldo();
			risultatoFinale = { vinto: player.chips > tavolo.entrata, chips: player.chips };
		} else {
			risultatoFinale = { vinto: false, chips: 0 };
		}

		checkEconomyAchievements();
		fase = 'esci';
	}

	// ── HELPERS UI ───────────────────────────────────────────────────────
	function puoCheck() {
		const g = giocatori[turnoIdx];
		return !g || puntataCorrente <= (g.bet || 0);
	}

	function callAmt() {
		const g = giocatori[turnoIdx];
		if (!g) return 0;
		return Math.min(puntataCorrente - (g.bet || 0), g.chips);
	}

	function minRaise() {
		const g = giocatori[turnoIdx];
		if (!g) return blindBb;
		return Math.min((g.bet || 0) + Math.max(puntataCorrente - (g.bet || 0), 0) + blindBb, g.chips + (g.bet || 0));
	}

	function maxRaise() {
		const g = giocatori[turnoIdx];
		return g ? g.chips + (g.bet || 0) : 0;
	}

	function isPlayerTurn() {
		return turnoIdx >= 0
			&& !giocatori[turnoIdx]?.isAI
			&& !aiThinking
			&& faseMano !== 'showdown'
			&& faseMano !== 'attesa'
			&& !mostraEsito;
	}

	function getRuolo(idx) {
		if (giocatori.filter(g => !g.eliminato).length === 2 && idx === dealerIdx) return 'SB';
		if (idx === sbIdx && idx !== dealerIdx) return 'SB';
		if (idx === bbIdx) return 'BB';
		if (idx === dealerIdx) return 'D';
		return '';
	}

	function attiviCount() {
		return giocatori.filter(g => !g.eliminato && g.chips > 0).length;
	}

	function playerChipsVal() {
		return giocatori.find(g => !g.isAI)?.chips ?? 0;
	}

	function apriRaise() {
		importoRaise = minRaise();
		mostraRaise = true;
	}

	function stepRaise(delta) {
		importoRaise = Math.max(minRaise(), Math.min(maxRaise(), importoRaise + delta));
	}

	function setRaisePreset(tipo) {
		if (tipo === 'min') importoRaise = minRaise();
		else if (tipo === 'half') importoRaise = Math.min(maxRaise(), Math.max(minRaise(), Math.floor(puntataCorrente + pot / 2)));
		else if (tipo === 'pot') importoRaise = Math.min(maxRaise(), Math.max(minRaise(), puntataCorrente + pot));
		else if (tipo === 'allin') importoRaise = maxRaise();
	}

	// ── PARTICELLE ───────────────────────────────────────────────────────
	function generaParticelle() {
		particelle = Array.from({ length: 18 }, (_, i) => ({
			id: ++partIdCnt,
			x: 5 + Math.random() * 90,
			delay: Math.random() * 0.7,
			dur: 1.6 + Math.random() * 1.2,
			size: 0.9 + Math.random() * 0.8,
			fromBottom: i % 2 === 0,
			emoji: ['🃏', '🏆', '♠', '♥', '💰', '✨'][Math.floor(Math.random() * 6)]
		}));
		setTimeout(() => { particelle = []; }, 3500);
	}

	function fmtW(v) {
		if (v === undefined || v === null) return '€0';
		return `€${Number(v).toFixed(Number(v) % 1 === 0 ? 0 : 2)}`;
	}

	function nomeFase(f) {
		return { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown', attesa: '' }[f] ?? '';
	}
</script>

<!-- ── POPUP "CI STIAMO LAVORANDO" ──────────────────────────────────── -->
<div class="wip-overlay" role="dialog" aria-modal="true">
	<div class="wip-box">
		<div class="wip-em">🃏</div>
		<h2 class="wip-titolo">Ci stiamo lavorando!</h2>
		<p class="wip-desc">Il Texas Hold'em ha qualche problema da sistemare. Torna presto — nel frattempo prova i minigiochi!</p>
		<div class="wip-actions">
			<a href="/minigiochi" class="wip-btn-go">🐆 Non farti vedere da Martina</a>
			<a href="/ludopatia" class="wip-btn-back">← Sala Ludopatia</a>
		</div>
	</div>
</div>

<!-- ── PARTICELLE ─────────────────────────────────────────────────────── -->
{#each particelle as p (p.id)}
	<div
		class="particle"
		class:from-bottom={p.fromBottom}
		style="left:{p.x}%;font-size:{p.size}rem;animation-delay:{p.delay}s;animation-duration:{p.dur}s"
		aria-hidden="true">{p.emoji}</div>
{/each}

<!-- ── BG BLOBS ──────────────────────────────────────────────────────── -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob b1"></div>
	<div class="blob b2"></div>
	<div class="blob b3"></div>
</div>

<!-- ════════════════════ SELEZIONE TAVOLO ════════════════════ -->
{#if fase === 'tavoli'}
	<div class="back-wrap">
		<a href="/ludopatia" class="back-btn">← Ludopatia</a>
	</div>

	<main class="main-tavoli">
		<header>
			<p class="pre-title">Sala Ludopatia</p>
			<h1>
				<span class="title-icon">🃏</span>
				<span class="title-text">Texas Hold'em</span>
			</h1>
			<p class="subtitle">Scegli il tuo tavolo · Saldo: <strong class="saldo-hl">{fmtW(saldo)}</strong></p>
		</header>

		<div class="tavoli-grid">
			{#each TAVOLI as t}
				{@const affordabile = saldo > t.entrata}
				<button
					class="tavolo-card"
					class:not-affordable={!affordabile}
					onclick={() => scegliTavolo(t)}
					disabled={!affordabile}
					style="--tc:{t.colore}"
				>
					<span class="tv-emoji">{t.emoji}</span>
					<p class="tv-nome">{t.nome}</p>
					<p class="tv-desc">{t.desc}</p>
					<div class="tv-chips">
						<div class="tv-chip-row">
							<span class="tv-label">Entrata</span>
							<span class="tv-val">{fmtW(t.entrata)}</span>
						</div>
						<div class="tv-chip-row">
							<span class="tv-label">Piccolo buio</span>
							<span class="tv-val">{fmtW(t.sb)}</span>
						</div>
						<div class="tv-chip-row">
							<span class="tv-label">Grande buio</span>
							<span class="tv-val">{fmtW(t.bb)}</span>
						</div>
					</div>
					<span class="tv-cta">
						{affordabile ? 'Siediti →' : 'Fondi insufficienti'}
					</span>
				</button>
			{/each}
		</div>

		<footer class="main-footer">
			<p>🃏 Texas Hold'em · Le migliori 5 carte valgono</p>
		</footer>
	</main>

<!-- ════════════════════ TAVOLO DI GIOCO ════════════════════ -->
{:else if fase === 'gioco'}
	<div class="game-root">
		<!-- Header -->
		<div class="game-hdr">
			<button class="back-btn-sm" onclick={lasciaTavolo}>
				{tavolo?.isTorneo ? '← Abbandona' : '← Lascia tavolo'}
			</button>
			<div class="hdr-info">
				<span class="hdr-fase" class:fase-active={faseMano !== 'attesa'}>{nomeFase(faseMano)}</span>
				<span class="hdr-pot">POT {fmtW(pot)}</span>
				{#if tavolo?.isTorneo}
					<span class="hdr-torneo">
						🏆 {attiviCount()} giocatori · Blinds {fmtW(blindSb)}/{fmtW(blindBb)} · ⏱{prossimoBlindsIn}s
					</span>
				{:else}
					<span class="hdr-tavolo">{tavolo?.emoji} {tavolo?.nome}</span>
				{/if}
			</div>
		</div>

		<!-- Area AI -->
		<div class="ai-zone">
			{#each giocatori.filter(g => g.isAI) as g}
				{@const gIdx = giocatori.indexOf(g)}
				<div
					class="ai-seat"
					class:seat-active={gIdx === turnoIdx && !aiThinking}
					class:seat-thinking={gIdx === turnoIdx && aiThinking}
					class:seat-folded={g.folded}
					class:seat-out={g.eliminato}
				>
					<!-- Carte AI -->
					<div class="ai-cards">
						{#if faseMano === 'showdown' && !g.folded && !g.eliminato && g.cartePrivate.length === 2}
							{#each g.cartePrivate as carta}
								<div class="card csm" class:red={isRosso(carta.seme)}>
									<b>{dispVal(carta.valore)}</b>{carta.seme}
								</div>
							{/each}
						{:else if g.folded}
							<div class="card csm card-fold">✕</div>
							<div class="card csm card-fold">✕</div>
						{:else if g.eliminato}
							<div class="card csm card-out">—</div>
						{:else if allInRunout && g.allIn && g.cartePrivate.length === 2}
							{#each g.cartePrivate as carta}
								<div class="card csm" class:red={isRosso(carta.seme)}>
									<b>{dispVal(carta.valore)}</b>{carta.seme}
								</div>
							{/each}
						{:else}
							<div class="card csm card-back"></div>
							<div class="card csm card-back"></div>
						{/if}
					</div>
					<!-- Info -->
					<div class="ai-meta">
						<span class="ai-em">{g.emoji}</span>
						<span class="ai-nome">{g.nome.split(' ')[0]}</span>
						{#if getRuolo(gIdx)}<span class="ruolo">{getRuolo(gIdx)}</span>{/if}
					</div>
					<div class="ai-stack">
						{#if g.eliminato}
							<span class="out-label">Out</span>
						{:else}
							<span class="stack-val">{fmtW(g.chips)}</span>
							{#if (g.bet || 0) > 0}<span class="bet-badge">bet {fmtW(g.bet)}</span>{/if}
						{/if}
					</div>
					{#if gIdx === turnoIdx && aiThinking}
						<div class="thinking-dots">···</div>
					{/if}
					{#if faseMano === 'showdown' && g.manoValutata && !g.folded && !g.eliminato}
						<div class="mano-tag">{g.manoValutata.nome}</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Tavolo centrale -->
		<div class="felt">
			<div class="community">
				{#each Array(5) as _, i}
					{#if carteComunita[i]}
						<div class="card cmd" class:red={isRosso(carteComunita[i].seme)}>
							<span class="cv">{dispVal(carteComunita[i].valore)}</span>
							<span class="cs">{carteComunita[i].seme}</span>
						</div>
					{:else}
						<div class="card cmd card-ph"></div>
					{/if}
				{/each}
			</div>
			<div class="pot-badge">🏆 {fmtW(pot)}</div>
		</div>

		<!-- Esito mano -->
		{#if mostraEsito}
			<div class="esito-overlay fade-in">
				<div class="esito-box">
					{#if vincitoriMano.length === 1}
						<div class="esito-who">
							{vincitoriMano[0].nome === 'Tu'
								? '🏆 Hai vinto!'
								: `${vincitoriMano[0].emoji} ${vincitoriMano[0].nome} vince`}
						</div>
					{:else}
						<div class="esito-who">🤝 Pareggio!</div>
					{/if}
					{#if vincitoriMano[0]?.manoValutata}
						<div class="esito-mano">{vincitoriMano[0].manoValutata.nome}</div>
					{/if}
					<div class="esito-pot">+{fmtW(Math.floor(pot / vincitoriMano.length))}</div>
					<div class="esito-btns">
						<button class="cta-btn" onclick={prossimaManno}>Prossima mano →</button>
						{#if !tavolo?.isTorneo}
							<button class="ghost-btn" onclick={lasciaTavolo}>Incassa e vai 💰</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Area player -->
		<div class="player-zone">
			{#if giocatori[0]}
				{@const pl = giocatori[0]}
				<div class="player-info-row">
					<!-- Carte player -->
					<div class="player-cards">
						{#each pl.cartePrivate as carta}
							<div class="card clg" class:red={isRosso(carta.seme)}>
								<span class="cv-lg">{dispVal(carta.valore)}</span>
								<span class="cs-lg">{carta.seme}</span>
							</div>
						{:else}
							<div class="card clg card-ph"></div>
							<div class="card clg card-ph"></div>
						{/each}
					</div>
					<!-- Metadati player -->
					<div class="player-meta">
						<div class="player-name-row">
							<span class="player-nome">Tu</span>
							{#if getRuolo(0)}<span class="ruolo">{getRuolo(0)}</span>{/if}
						</div>
						<div class="player-chips-val">{fmtW(pl.chips)}</div>
						{#if (pl.bet || 0) > 0}
							<div class="player-bet-val">bet: {fmtW(pl.bet)}</div>
						{/if}
						{#if faseMano === 'showdown' && pl.manoValutata}
							<div class="mano-tag player-mano-tag">{pl.manoValutata.nome}</div>
						{/if}
					</div>
				</div>

				<!-- Azioni -->
				{#if isPlayerTurn()}
					{#if mostraRaise}
						<div class="raise-panel fade-in">
							<div class="raise-header">
								<span class="raise-label">Puntata:</span>
								<strong class="raise-amt">{fmtW(importoRaise)}</strong>
							</div>
							<div class="raise-stepper">
								<button class="st-btn" onclick={() => stepRaise(-blindBb)}>−</button>
								<input
									type="range"
									class="raise-slider"
									min={minRaise()}
									max={maxRaise()}
									step={1}
									bind:value={importoRaise}
								/>
								<button class="st-btn" onclick={() => stepRaise(blindBb)}>+</button>
							</div>
							<div class="raise-presets">
								<button class="preset" onclick={() => setRaisePreset('min')}>Min</button>
								<button class="preset" onclick={() => setRaisePreset('half')}>½ Pot</button>
								<button class="preset" onclick={() => setRaisePreset('pot')}>Pot</button>
								<button class="preset" onclick={() => setRaisePreset('allin')}>All-in</button>
							</div>
							<div class="raise-actions">
								<button class="ghost-btn-sm" onclick={() => { mostraRaise = false; }}>Annulla</button>
								<button class="cta-btn raise-confirm" onclick={() => eseguiAzione('raise', importoRaise)}>
									Punta {fmtW(importoRaise)} →
								</button>
							</div>
						</div>
					{:else}
						<div class="azioni fade-in">
							<button class="btn-fold" onclick={() => eseguiAzione('fold')}>✕ Fold</button>
							{#if puoCheck()}
								<button class="btn-check" onclick={() => eseguiAzione('check')}>✓ Check</button>
							{:else}
								<button class="btn-call" onclick={() => eseguiAzione('call')}>
									📞 Call {fmtW(callAmt())}
								</button>
							{/if}
							<button class="btn-raise" onclick={apriRaise} disabled={pl.chips <= 0}>
								↑ Raise
							</button>
						</div>
					{/if}
				{:else if aiThinking}
					<div class="ai-wait">
						<div class="ai-spin"></div>
						<span>{giocatori[turnoIdx]?.nome ?? '?'} sta pensando...</span>
					</div>
				{:else if faseMano === 'attesa'}
					<div class="ai-wait"><span>Distribuzione carte...</span></div>
				{/if}
			{/if}
		</div>
	</div>

<!-- ════════════════════ FINE PARTITA ════════════════════ -->
{:else if fase === 'esci'}
	<div class="back-wrap">
		<a href="/ludopatia" class="back-btn">← Ludopatia</a>
	</div>

	<main class="main-tavoli">
		<div class="esci-wrap fade-in">
			<div class="glass-card esci-card">
				{#if risultatoFinale}
					{#if risultatoFinale.isTorneo}
						{#if risultatoFinale.vinto}
							<div class="esci-emoji">🏆</div>
							<h2 class="esci-title">Torneo Vinto!</h2>
							<p class="esci-premio">Montepremi: <strong>+{fmtW(risultatoFinale.chips)}</strong></p>
							<p class="esci-hint">Saldo: {fmtW(saldo)}</p>
						{:else}
							<div class="esci-emoji">🃏</div>
							<h2 class="esci-title">Eliminato!</h2>
							{#if risultatoFinale.winner}
								<p class="esci-sub">Vince: {risultatoFinale.winner.emoji} {risultatoFinale.winner.nome}</p>
							{/if}
						{/if}
					{:else if risultatoFinale.vinto || risultatoFinale.chips > 0}
						<div class="esci-emoji">💰</div>
						<h2 class="esci-title">Incassato!</h2>
						<p class="esci-premio">+{fmtW(risultatoFinale.chips)}</p>
						<p class="esci-hint">Saldo: {fmtW(saldo)}</p>
					{:else}
						<div class="esci-emoji">🃏</div>
						<h2 class="esci-title">Nessun chip rimasto</h2>
						<p class="esci-sub">Meglio la prossima volta!</p>
					{/if}
				{/if}

				<div class="esci-actions">
					<button class="cta-btn" onclick={() => { fase = 'tavoli'; saldo = getSaldo(); }}>
						🃏 Nuovo tavolo
					</button>
					<button class="ghost-btn" onclick={() => goto('/ludopatia')}>← Ludopatia</button>
				</div>
			</div>
		</div>
	</main>
{/if}

<style>
	/* ── PARTICELLE ──────────────────────────────────────────────────── */
	.particle {
		position: fixed; top: 0; pointer-events: none; z-index: 999;
		animation: fall-down 2.5s ease-in forwards; user-select: none;
	}
	.particle.from-bottom { top: auto; bottom: 0; animation-name: rise-up; }
	@keyframes fall-down {
		from { transform: translateY(-20px) rotate(0deg); opacity: 1; }
		to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
	}
	@keyframes rise-up {
		from { transform: translateY(20px) rotate(0deg); opacity: 1; }
		to   { transform: translateY(-110vh) rotate(-720deg); opacity: 0; }
	}

	/* ── BG BLOBS ────────────────────────────────────────────────────── */
	.bg-blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
	.blob { position: absolute; border-radius: 50%; filter: blur(90px); }
	.b1 {
		width: 480px; height: 480px;
		background: radial-gradient(circle, #166534 0%, transparent 70%);
		top: -120px; left: -90px; opacity: 0.18;
		animation: drift 22s ease-in-out infinite;
	}
	.b2 {
		width: 380px; height: 380px;
		background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
		bottom: -90px; right: -70px; opacity: 0.12;
		animation: drift 26s ease-in-out infinite reverse;
	}
	.b3 {
		width: 260px; height: 260px;
		background: radial-gradient(circle, #b45309 0%, transparent 70%);
		top: 45%; left: 58%; opacity: 0.10;
		animation: drift 30s ease-in-out infinite 8s;
	}
	@keyframes drift {
		0%, 100% { transform: translate(0,0) scale(1); }
		33% { transform: translate(45px,-35px) scale(1.07); }
		66% { transform: translate(-28px,44px) scale(0.94); }
	}

	/* ── BACK BUTTON ─────────────────────────────────────────────────── */
	.back-wrap {
		position: relative; z-index: 10;
		padding: 1rem 1.5rem 0; max-width: 920px; margin: 0 auto;
	}
	.back-btn {
		display: inline-flex; align-items: center; gap: 0.4rem;
		padding: 0.4rem 0.9rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.05);
		color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; font-size: 0.78rem;
		text-decoration: none; transition: all 0.18s ease;
	}
	.back-btn:hover { background: rgba(255,255,255,0.1); color: rgba(240,240,250,0.9); }

	/* ── LAYOUT TAVOLI ───────────────────────────────────────────────── */
	.main-tavoli {
		position: relative; z-index: 1;
		max-width: 920px; margin: 0 auto;
		padding: 0 1.4rem 4rem;
	}
	header { text-align: center; padding: 2.5rem 1rem 2rem; animation: fade-down 0.6s ease both; }
	.pre-title {
		font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.22em;
		color: rgba(240,240,250,0.3); margin-bottom: 0.6rem;
	}
	h1 { display: flex; align-items: center; justify-content: center; gap: 0.6rem; line-height: 1; }
	.title-icon {
		font-size: clamp(2rem, 5vw, 3.5rem);
		animation: flip-card 5s ease-in-out infinite;
	}
	@keyframes flip-card {
		0%, 80%, 100% { transform: rotateY(0deg); }
		40% { transform: rotateY(180deg); }
	}
	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.2rem, 6vw, 4.5rem);
		letter-spacing: 0.04em; color: #fff;
	}
	.subtitle { margin-top: 0.8rem; font-size: 0.84rem; color: rgba(240,240,250,0.38); }
	.saldo-hl { color: #ffd700; }

	.tavoli-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 1.2rem;
		animation: fade-down 0.6s ease 0.1s both;
	}

	.tavolo-card {
		display: flex; flex-direction: column; align-items: center;
		gap: 0.7rem; padding: 1.8rem 1.2rem 1.4rem;
		background: rgba(255,255,255,0.045);
		border: 1px solid rgba(255,255,255,0.09);
		border-radius: 20px; cursor: pointer; color: #f0f0fa;
		transition: all 0.22s ease; text-align: center;
	}
	.tavolo-card:hover:not(:disabled) {
		background: rgba(var(--tc-rgb, 34,197,94), 0.08);
		border-color: color-mix(in srgb, var(--tc) 50%, transparent);
		transform: translateY(-4px) scale(1.02);
		box-shadow: 0 12px 36px color-mix(in srgb, var(--tc) 20%, transparent);
	}
	.tavolo-card.not-affordable { opacity: 0.45; cursor: not-allowed; }

	.tv-emoji { font-size: 3rem; line-height: 1; transition: transform 0.2s ease; }
	.tavolo-card:hover .tv-emoji { transform: scale(1.15) rotate(5deg); }
	.tv-nome { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 0.06em; color: #fff; margin: 0; }
	.tv-desc { font-size: 0.72rem; color: rgba(240,240,250,0.4); line-height: 1.5; margin: 0; }
	.tv-chips { width: 100%; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 0.7rem 0.8rem; }
	.tv-chip-row { display: flex; justify-content: space-between; font-size: 0.74rem; padding: 0.18rem 0; }
	.tv-label { color: rgba(240,240,250,0.38); }
	.tv-val { color: #ffd700; font-weight: 700; }
	.tv-cta {
		font-size: 0.73rem; font-weight: 700; letter-spacing: 0.08em;
		color: var(--tc, #22c55e); opacity: 0;
		transform: translateY(4px); transition: all 0.2s ease;
	}
	.tavolo-card:hover .tv-cta { opacity: 1; transform: translateY(0); }

	.main-footer { text-align: center; color: rgba(240,240,250,0.2); font-size: 0.74rem; padding-top: 2.5rem; }

	/* ── GAME ROOT ────────────────────────────────────────────────────── */
	.game-root {
		position: fixed; inset: 0; z-index: 5;
		display: flex; flex-direction: column;
		background: linear-gradient(180deg, #07070f 0%, #0a1a0e 50%, #07070f 100%);
		overflow: hidden;
	}

	/* Header gioco */
	.game-hdr {
		display: flex; align-items: center; gap: 0.8rem;
		padding: 0.6rem 1rem; background: rgba(0,0,0,0.5);
		border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
		flex-wrap: wrap;
	}
	.back-btn-sm {
		padding: 0.3rem 0.75rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.06);
		color: rgba(240,240,250,0.55);
		font-family: 'Outfit', sans-serif; font-size: 0.74rem;
		cursor: pointer; transition: all 0.16s ease; white-space: nowrap;
	}
	.back-btn-sm:hover { background: rgba(255,255,255,0.12); color: rgba(240,240,250,0.9); }
	.hdr-info {
		display: flex; align-items: center; gap: 0.7rem;
		flex: 1; flex-wrap: wrap;
	}
	.hdr-fase {
		font-family: 'Bebas Neue', sans-serif; font-size: 1rem;
		letter-spacing: 0.08em; color: rgba(240,240,250,0.3);
		transition: color 0.2s ease;
	}
	.hdr-fase.fase-active { color: #86efac; }
	.hdr-pot { font-weight: 700; color: #ffd700; font-size: 0.85rem; }
	.hdr-torneo, .hdr-tavolo { font-size: 0.72rem; color: rgba(240,240,250,0.38); }

	/* Area AI */
	.ai-zone {
		display: flex; flex-wrap: wrap; gap: 0.5rem;
		padding: 0.6rem 0.8rem; justify-content: center;
		background: rgba(0,0,0,0.25); flex-shrink: 0;
		max-height: 130px; overflow-y: auto;
	}
	.ai-seat {
		display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
		padding: 0.45rem 0.6rem; border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.07);
		background: rgba(255,255,255,0.03);
		transition: all 0.2s ease; min-width: 68px;
		position: relative;
	}
	.ai-seat.seat-active {
		background: rgba(34,197,94,0.12);
		border-color: rgba(34,197,94,0.4);
		box-shadow: 0 0 14px rgba(34,197,94,0.2);
	}
	.ai-seat.seat-thinking {
		background: rgba(234,179,8,0.10);
		border-color: rgba(234,179,8,0.3);
	}
	.ai-seat.seat-folded { opacity: 0.35; }
	.ai-seat.seat-out { opacity: 0.2; }

	.ai-cards { display: flex; gap: 0.2rem; margin-bottom: 0.15rem; }
	.ai-meta { display: flex; align-items: center; gap: 0.3rem; }
	.ai-em { font-size: 1.1rem; }
	.ai-nome { font-size: 0.65rem; color: rgba(240,240,250,0.65); max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ai-stack { font-size: 0.64rem; color: rgba(240,240,250,0.5); text-align: center; }
	.stack-val { color: #ffd700; font-weight: 700; display: block; }
	.bet-badge { color: #86efac; font-size: 0.6rem; display: block; }
	.out-label { color: rgba(240,240,250,0.25); font-size: 0.6rem; }
	.thinking-dots { font-size: 0.7rem; color: #fbbf24; animation: dots 1s infinite; }
	@keyframes dots { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
	.mano-tag {
		font-size: 0.58rem; color: #a78bfa; text-align: center;
		background: rgba(167,139,250,0.1); border-radius: 4px;
		padding: 0.1rem 0.3rem; margin-top: 0.15rem;
	}
	.player-mano-tag { font-size: 0.72rem; padding: 0.15rem 0.5rem; }

	/* Felt / community */
	.felt {
		flex: 1; display: flex; flex-direction: column;
		align-items: center; justify-content: center; gap: 0.8rem;
		background: radial-gradient(ellipse at center, #0f3a1a 0%, #061009 80%);
		border-top: 1px solid rgba(34,197,94,0.15);
		border-bottom: 1px solid rgba(34,197,94,0.15);
		padding: 0.8rem;
	}
	.community { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
	.pot-badge {
		font-size: 0.88rem; font-weight: 700; color: #ffd700;
		background: rgba(0,0,0,0.5); border-radius: 999px;
		padding: 0.25rem 0.9rem;
		border: 1px solid rgba(255,215,0,0.2);
	}

	/* Carte */
	.card {
		display: inline-flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: #f8f5ee; color: #1a1a1a;
		border-radius: 5px; border: 1px solid rgba(0,0,0,0.15);
		font-family: 'Outfit', sans-serif; font-weight: 700;
		user-select: none; line-height: 1.1;
	}
	.card.red { color: #dc2626; }
	.card-back {
		background: linear-gradient(135deg, #1e3a8a 30%, #1d4ed8 70%);
		border: 1px solid rgba(255,255,255,0.2) !important;
		color: transparent;
		background-image: repeating-linear-gradient(
			45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px,
			transparent 2px, transparent 8px
		), linear-gradient(135deg, #1e3a8a, #1d4ed8);
	}
	.card-ph {
		background: rgba(255,255,255,0.04) !important;
		border: 1px dashed rgba(255,255,255,0.12) !important;
	}
	.card-fold { background: rgba(100,100,100,0.3) !important; color: rgba(255,255,255,0.25) !important; }
	.card-out { background: rgba(50,50,50,0.3) !important; color: rgba(255,255,255,0.15) !important; }

	/* Dimensioni carte */
	.csm { width: 28px; height: 38px; font-size: 0.6rem; border-radius: 4px; }
	.csm b { font-size: 0.64rem; display: block; }
	.cmd { width: 46px; height: 64px; gap: 0.1rem; }
	.cmd .cv { font-size: 1rem; font-weight: 800; }
	.cmd .cs { font-size: 0.9rem; }
	.clg { width: 52px; height: 74px; gap: 0.15rem; }
	.cv-lg { font-size: 1.15rem; font-weight: 800; }
	.cs-lg { font-size: 1.05rem; }

	/* Ruolo badge */
	.ruolo {
		font-size: 0.56rem; font-weight: 800; letter-spacing: 0.04em;
		background: rgba(251,191,36,0.2); color: #fbbf24;
		border: 1px solid rgba(251,191,36,0.3);
		border-radius: 4px; padding: 0.05rem 0.25rem;
	}

	/* Esito overlay */
	.esito-overlay {
		position: absolute; inset: 0; z-index: 50;
		display: flex; align-items: center; justify-content: center;
		background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
	}
	.esito-box {
		background: rgba(10,20,12,0.95);
		border: 1px solid rgba(34,197,94,0.3);
		border-radius: 18px; padding: 2rem 2.2rem;
		text-align: center; min-width: 240px;
		box-shadow: 0 20px 60px rgba(0,0,0,0.6);
	}
	.esito-who { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #fff; margin-bottom: 0.3rem; }
	.esito-mano { font-size: 0.82rem; color: #a78bfa; margin-bottom: 0.4rem; }
	.esito-pot { font-size: 1.6rem; font-weight: 800; color: #ffd700; margin-bottom: 1.2rem; }
	.esito-btns { display: flex; flex-direction: column; gap: 0.5rem; }

	/* Player zone */
	.player-zone {
		padding: 0.7rem 1rem calc(4.5rem + env(safe-area-inset-bottom, 0rem)); background: rgba(0,0,0,0.4);
		border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
	}
	.player-info-row {
		display: flex; align-items: center; gap: 1rem; margin-bottom: 0.6rem;
		max-width: 500px; margin-left: auto; margin-right: auto;
	}
	.player-cards { display: flex; gap: 0.5rem; }
	.player-meta { flex: 1; }
	.player-name-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem; }
	.player-nome { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; color: #fff; }
	.player-chips-val { font-size: 1.1rem; font-weight: 700; color: #ffd700; }
	.player-bet-val { font-size: 0.72rem; color: #86efac; margin-top: 0.1rem; }

	/* Azioni */
	.azioni {
		display: grid; grid-template-columns: 1fr 1.5fr 1fr;
		gap: 0.5rem; align-items: stretch;
		max-width: 500px; margin: 0 auto;
	}
	.btn-fold {
		padding: 0.6rem 1rem; border-radius: 10px;
		border: 1px solid rgba(239,68,68,0.4);
		background: rgba(239,68,68,0.1); color: #fca5a5;
		font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700;
		cursor: pointer; transition: all 0.18s ease;
		min-height: 44px; width: 100%;
	}
	.btn-fold:hover { background: rgba(239,68,68,0.22); border-color: rgba(239,68,68,0.6); }
	.btn-check {
		padding: 0.6rem 1.1rem; border-radius: 10px;
		border: 1px solid rgba(34,197,94,0.35);
		background: rgba(34,197,94,0.1); color: #86efac;
		font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700;
		cursor: pointer; transition: all 0.18s ease; flex: 1;
		min-height: 44px; width: 100%;
	}
	.btn-check:hover { background: rgba(34,197,94,0.22); }
	.btn-call {
		padding: 0.6rem 1.1rem; border-radius: 10px;
		border: 1px solid rgba(59,130,246,0.4);
		background: rgba(59,130,246,0.1); color: #93c5fd;
		font-family: 'Outfit', sans-serif; font-size: 0.82rem; font-weight: 700;
		cursor: pointer; transition: all 0.18s ease; flex: 1;
		min-height: 44px; width: 100%;
	}
	.btn-call:hover { background: rgba(59,130,246,0.22); }
	.btn-raise {
		padding: 0.6rem 1rem; border-radius: 10px;
		border: 1px solid rgba(251,191,36,0.4);
		background: rgba(251,191,36,0.1); color: #fbbf24;
		font-family: 'Outfit', sans-serif; font-size: 0.85rem; font-weight: 700;
		cursor: pointer; transition: all 0.18s ease;
		min-height: 44px; width: 100%;
	}
	.btn-raise:hover:not(:disabled) { background: rgba(251,191,36,0.22); }
	.btn-raise:disabled { opacity: 0.3; cursor: not-allowed; }

	/* Raise panel */
	.raise-panel {
		width: 100%; background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 14px; padding: 0.9rem 1rem;
		max-width: 500px; margin: 0 auto;
	}
	.raise-header {
		display: flex; justify-content: space-between; align-items: center;
		font-size: 0.78rem; color: rgba(240,240,250,0.5); margin-bottom: 0.6rem;
	}
	.raise-label { font-size: 0.76rem; color: rgba(240,240,250,0.45); }
	.raise-amt { color: #fbbf24; font-size: 1.05rem; font-weight: 800; }
	.raise-stepper { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem; }
	.raise-slider {
		flex: 1; accent-color: #fbbf24; height: 4px;
		background: rgba(255,255,255,0.1); border-radius: 2px;
	}
	.st-btn {
		width: 32px; height: 32px; border-radius: 50%;
		border: 1px solid rgba(255,255,255,0.15);
		background: rgba(255,255,255,0.07); color: #f0f0fa;
		font-size: 1rem; cursor: pointer; transition: all 0.14s ease;
		display: flex; align-items: center; justify-content: center;
	}
	.st-btn:hover { background: rgba(251,191,36,0.2); border-color: rgba(251,191,36,0.4); }
	.raise-presets { display: flex; gap: 0.4rem; margin-bottom: 0.7rem; flex-wrap: wrap; }
	.preset {
		padding: 0.3rem 0.65rem; border-radius: 8px;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.05);
		color: rgba(240,240,250,0.6);
		font-family: 'Outfit', sans-serif; font-size: 0.73rem;
		cursor: pointer; transition: all 0.14s ease;
	}
	.preset:hover { background: rgba(251,191,36,0.15); color: #fbbf24; border-color: rgba(251,191,36,0.3); }
	.raise-actions { display: flex; gap: 0.5rem; }
	.raise-confirm { flex: 1; }
	.ghost-btn-sm {
		padding: 0.5rem 0.9rem; border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.12);
		background: transparent; color: rgba(240,240,250,0.45);
		font-family: 'Outfit', sans-serif; font-size: 0.8rem;
		cursor: pointer; transition: all 0.16s ease;
	}
	.ghost-btn-sm:hover { background: rgba(255,255,255,0.07); color: rgba(240,240,250,0.8); }

	/* AI wait */
	.ai-wait {
		display: flex; align-items: center; gap: 0.7rem;
		font-size: 0.8rem; color: rgba(240,240,250,0.4); padding: 0.4rem 0;
		max-width: 500px; margin: 0 auto;
	}
	.ai-spin {
		width: 20px; height: 20px;
		border: 2px solid rgba(34,197,94,0.2);
		border-top-color: #22c55e;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── FINE PARTITA ────────────────────────────────────────────────── */
	.esci-wrap { display: flex; justify-content: center; margin-top: 3rem; }
	.glass-card {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 22px; padding: 2.2rem 2rem;
	}
	.esci-card { max-width: 400px; text-align: center; }
	.esci-emoji { font-size: 4rem; margin-bottom: 0.5rem; }
	.esci-title { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; color: #fff; letter-spacing: 0.05em; }
	.esci-premio { font-size: 1.5rem; font-weight: 800; color: #ffd700; margin: 0.5rem 0; }
	.esci-hint { font-size: 0.78rem; color: rgba(240,240,250,0.38); margin-bottom: 1.5rem; }
	.esci-sub { font-size: 0.88rem; color: rgba(240,240,250,0.45); margin-bottom: 1.5rem; }
	.esci-actions { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.5rem; }

	/* ── BUTTONS GLOBALI ─────────────────────────────────────────────── */
	.cta-btn {
		width: 100%; padding: 0.72rem 1.4rem; border-radius: 12px;
		border: none; background: linear-gradient(135deg, #166534, #15803d);
		color: #fff; font-family: 'Outfit', sans-serif;
		font-size: 0.9rem; font-weight: 700; cursor: pointer;
		transition: all 0.2s ease; letter-spacing: 0.03em;
	}
	.cta-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(22,101,52,0.45); }
	.cta-btn:disabled { opacity: 0.35; cursor: not-allowed; }
	.ghost-btn {
		width: 100%; padding: 0.65rem 1.4rem; border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.12);
		background: transparent; color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; font-size: 0.85rem;
		cursor: pointer; transition: all 0.18s ease;
	}
	.ghost-btn:hover { background: rgba(255,255,255,0.07); color: rgba(240,240,250,0.85); }

	/* ── UTILITIES ───────────────────────────────────────────────────── */
	.fade-in { animation: fade-down 0.35s ease both; }
	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-10px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── RESPONSIVE ──────────────────────────────────────────────────── */
	@media (max-width: 600px) {
		.main-tavoli { padding: 0 0.8rem 3rem; }
		.back-wrap { padding: 0.7rem 0.9rem 0; }
		.tavoli-grid { grid-template-columns: 1fr 1fr; gap: 0.8rem; }
		.game-hdr { padding: 0.5rem 0.7rem; gap: 0.5rem; }
		.hdr-torneo { display: none; }
		.ai-zone { gap: 0.35rem; padding: 0.5rem 0.6rem; }
		.ai-seat { min-width: 58px; padding: 0.35rem 0.45rem; }
		.ai-nome { max-width: 44px; font-size: 0.6rem; }
		.csm { width: 24px; height: 32px; font-size: 0.55rem; }
		.cmd { width: 38px; height: 52px; }
		.cmd .cv { font-size: 0.85rem; }
		.clg { width: 44px; height: 62px; }
		.cv-lg { font-size: 0.95rem; }
		.cs-lg { font-size: 0.9rem; }
		.player-zone { padding: 0.5rem 0.7rem calc(4.5rem + env(safe-area-inset-bottom, 0rem)); }
		.azioni { gap: 0.4rem; }
		.btn-fold, .btn-check, .btn-call, .btn-raise { padding: 0.5rem 0.6rem; font-size: 0.76rem; min-height: 44px; }
		.raise-panel { padding: 0.7rem 0.8rem; }
		.esci-card { padding: 1.8rem 1.4rem; }
		h1 { flex-direction: column; gap: 0.3rem; }
	}

	/* ── WIP OVERLAY ── */
	.wip-overlay {
		position: fixed; inset: 0; z-index: 9999;
		background: rgba(0, 0, 0, 0.88);
		display: flex; align-items: center; justify-content: center;
		padding: 1.5rem;
		backdrop-filter: blur(6px);
	}
	.wip-box {
		background: #12121e;
		border: 2px solid rgba(245, 158, 11, 0.35);
		border-radius: 22px;
		padding: 2.5rem 2rem 2rem;
		max-width: 400px; width: 100%;
		text-align: center;
		box-shadow: 0 24px 60px rgba(245, 158, 11, 0.15);
		animation: wip-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
	}
	@keyframes wip-pop {
		from { transform: scale(0.6) translateY(30px); opacity: 0; }
		to   { transform: scale(1) translateY(0); opacity: 1; }
	}
	.wip-em { font-size: 4rem; line-height: 1; margin-bottom: 0.8rem; }
	.wip-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2rem; letter-spacing: 0.05em;
		color: #fbbf24; margin-bottom: 0.8rem;
	}
	.wip-desc {
		font-size: 0.88rem; color: rgba(240,240,250,0.6);
		line-height: 1.6; margin-bottom: 1.5rem;
	}
	.wip-actions {
		display: flex; flex-direction: column; gap: 0.7rem;
	}
	.wip-btn-go {
		padding: 0.85rem 1rem;
		background: linear-gradient(135deg, #c87830, #a05820);
		border-radius: 12px; color: #fff;
		text-decoration: none; font-weight: 700; font-size: 0.9rem;
		transition: all 0.2s;
	}
	.wip-btn-go:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(200,120,48,0.4); }
	.wip-btn-back {
		padding: 0.7rem 1rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 12px; color: rgba(240,240,250,0.5);
		text-decoration: none; font-size: 0.82rem;
		transition: all 0.18s;
	}
	.wip-btn-back:hover { background: rgba(255,255,255,0.1); color: #fff; }
</style>

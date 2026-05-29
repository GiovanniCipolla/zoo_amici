<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { membri } from '$lib/membri.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { unlock, checkEconomyAchievements } from '$lib/achievements.js';

	const PRESET_IMPORTI = [1, 2, 5, 10, 20, 50];
	const DICE_UNICODE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

	// ── Personalities per membro ────────────────────────────────────────
	const AGGRESSIVI = ['Luisa', 'Giancarlo'];
	const CONSERVATIVI = ['Pompoff', 'Aquilino'];

	function getPersonalita(nome) {
		if (AGGRESSIVI.includes(nome)) return 'aggressivo';
		if (CONSERVATIVI.includes(nome)) return 'conservativo';
		return 'random';
	}

	// ── Stato principale ────────────────────────────────────────────────
	let fase = $state('menu'); // menu | setup | regole | passaggio | gioco | fine
	let subfase = $state('lancio'); // lancio | puntata | rivela | risultato
	let modalita = $state('singolo'); // singolo | locale

	let giocatori = $state([]);
	let turnoIdx = $state(0);
	let puntataCorrente = $state({ quantita: 0, valore: 0, giocatoreIdx: -1 });
	let dadiTotali = $state(0);
	let pot = $state(0);
	let betAmount = $state(5);
	let saldo = $state(0);

	// Setup multiplayer
	let numGiocatori = $state(2);
	let setupGiocatori = $state([]); // { nome, emoji, membro }
	let setupIdx = $state(0); // giocatore corrente nel setup

	// Bid input
	let bidQuantita = $state(1);
	let bidValore = $state(2);

	// Risultato sfida
	let sfidaEsito = $state(null); // { sfidante, puntatore, dadiValidi, bidValida }
	let perdenteSfida = $state(null);

	// Fine gioco
	let vincitore = $state(null);
	let particelle = $state([]);
	let partIdCnt = 0;

	// Dadi visibili al giocatore umano
	let dadiVisibili = $state(false);

	// Animazione lancio
	let lancioAnimazione = $state(false);
	let lancioTimeout = null;

	// Achievement tracking
	let bluffSuccessi = $state(0);
	let vittorieBluff = $state(0);

	onMount(() => {
		if (!browser) return;
		saldo = getSaldo();
		bluffSuccessi = parseInt(localStorage.getItem('zoo_bluff_successi') ?? '0', 10);
		vittorieBluff = parseInt(localStorage.getItem('zoo_bluff_vittorie') ?? '0', 10);
	});

	// ── Utility dadi ───────────────────────────────────────────────────
	function lanciaDadi(n) {
		return Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
	}

	function contaDadi(dadi, valore) {
		// I dadi con valore 1 sono jolly (contano per qualsiasi valore)
		return dadi.filter((d) => d === valore || (valore !== 1 && d === 1)).length;
	}

	function contaDadiTotali(tuttiiDadi, valore) {
		return tuttiiDadi.reduce((sum, g) => sum + contaDadi(g.dadi, valore), 0);
	}

	// ── Setup gioco ────────────────────────────────────────────────────
	function iniziaSetup(mod) {
		modalita = mod;
		setupGiocatori = [];
		setupIdx = 0;
		if (mod === 'singolo') {
			fase = 'setup';
		} else {
			// In multiplayer, prima scegliamo quanti giocatori
			fase = 'setup';
		}
	}

	function confermaBet() {
		if (saldo < betAmount) return;
		if (modalita === 'singolo') {
			// 2-4 avversari AI random
			const numAvversari = Math.floor(Math.random() * 3) + 2; // 2, 3 o 4
			const shuffled = [...membri].sort(() => Math.random() - 0.5);
			const avversari = shuffled.slice(0, numAvversari).map((m) => ({
				nome: m.nome,
				emoji: m.emoji,
				dadi: [],
				isAI: true,
				personalita: getPersonalita(m.nome),
				membro: m
			}));
			giocatori = [
				{ nome: 'Tu', emoji: '🎲', dadi: [], isAI: false, personalita: 'random' },
				...avversari
			];
			avviaPartita();
		} else {
			// Multiplayer: mostra selezione animali
			setupGiocatori = Array.from({ length: numGiocatori }, () => null);
			setupIdx = 0;
			fase = 'setup_animali';
		}
	}

	function selezionaAnimaleSetup(membro) {
		setupGiocatori[setupIdx] = {
			nome: membro.nome,
			emoji: membro.emoji,
			dadi: [],
			isAI: false,
			personalita: 'random',
			membro
		};
		if (setupIdx < numGiocatori - 1) {
			setupIdx++;
		} else {
			// Tutti i giocatori scelti
			giocatori = setupGiocatori.map((g) => ({ ...g }));
			avviaPartita();
		}
	}

	function avviaPartita() {
		// Addebita quota a tutti (per multiplayer) o solo al player (singolo)
		if (modalita === 'singolo') {
			spendSaldo(betAmount);
			pot = betAmount * giocatori.length; // quota × (player + AI)
		} else {
			// In multiplayer tutti pagano — ma siccome è locale, addebitiamo dal wallet del device
			spendSaldo(betAmount * giocatori.length);
			pot = betAmount * giocatori.length;
		}
		saldo = getSaldo();
		unlock('bluff_debutto');
		checkEconomyAchievements();

		iniziaRound();
	}

	function iniziaRound() {
		// Lancia dadi per tutti
		giocatori = giocatori.map((g) => ({ ...g, dadi: lanciaDadi(g.dadi.length === 0 ? 5 : g.dadi.length) }));
		dadiTotali = giocatori.reduce((s, g) => s + g.dadi.length, 0);
		puntataCorrente = { quantita: 0, valore: 0, giocatoreIdx: -1 };
		dadiVisibili = false;
		subfase = 'lancio';
		fase = 'gioco';

		lancioAnimazione = true;
		lancioTimeout = setTimeout(() => {
			lancioAnimazione = false;
			subfase = 'puntata';
			inizializzaBid();
			// Se il primo turno è AI, fa mossa automatica
			if (giocatori[turnoIdx]?.isAI) {
				setTimeout(mossaAIAutomatica, 1200);
			}
		}, 1800);
	}

	function inizializzaBid() {
		// Bid minima: 1 dado del valore 2
		bidQuantita = Math.max(1, puntataCorrente.quantita);
		bidValore = puntataCorrente.valore === 0 ? 2 : puntataCorrente.valore;
	}

	// ── AI Logic ───────────────────────────────────────────────────────
	function mossaAI(giocatore, puntataAttuale) {
		const miei = giocatore.dadi;
		const valore = puntataAttuale.valore || 2;
		const quantita = puntataAttuale.quantita || 0;

		// Conta i miei dadi che matchano
		const mieMatch = contaDadi(miei, valore);
		// Stima totale atteso: ogni dado ha probabilità ~1/3 di matchare (valore X + jolly)
		const probPerDado = valore === 1 ? 1 / 6 : 2 / 6; // jolly solo per non-1
		const atteso = dadiTotali * probPerDado;

		// Probabilità che la bid attuale sia valida
		const probValida = quantita <= atteso + 1 ? 0.65 : quantita <= atteso + 2 ? 0.35 : 0.15;

		let sogliaChallenge;
		if (giocatore.personalita === 'aggressivo') {
			sogliaChallenge = 0.2; // sfida raramente
		} else if (giocatore.personalita === 'conservativo') {
			sogliaChallenge = 0.5; // sfida più spesso
		} else {
			sogliaChallenge = 0.35; // random
		}

		// Decisione: sfida o alza?
		if (puntataAttuale.quantita > 0 && Math.random() > probValida + (1 - sogliaChallenge)) {
			return { azione: 'sfida' };
		}

		// Alza la bid
		let nuovaQ = quantita;
		let nuovoV = valore;

		if (giocatore.personalita === 'aggressivo') {
			// Alza di più
			const rand = Math.random();
			if (rand < 0.4) {
				nuovaQ += 2;
			} else if (rand < 0.7) {
				nuovaQ += 1;
			} else {
				// Cambia valore
				nuovoV = nuovoV < 6 ? nuovoV + 1 : 2;
				nuovaQ += 1;
			}
		} else if (giocatore.personalita === 'conservativo') {
			// Alza di poco
			if (nuovoV < 6) {
				nuovoV++;
			} else {
				nuovaQ++;
				nuovoV = 2;
			}
		} else {
			// Random
			if (Math.random() < 0.5 && nuovoV < 6) {
				nuovoV++;
			} else {
				nuovaQ++;
			}
		}

		// Valida la bid
		if (nuovaQ === quantita && nuovoV <= valore) {
			nuovaQ = quantita + 1;
		}

		return { azione: 'alza', quantita: nuovaQ, valore: nuovoV };
	}

	function mossaAIAutomatica() {
		const g = giocatori[turnoIdx];
		if (!g || !g.isAI) return;

		const mossa = mossaAI(g, puntataCorrente);
		if (mossa.azione === 'sfida') {
			eseguiSfida(turnoIdx);
		} else {
			piazzaPuntata(mossa.quantita, mossa.valore);
		}
	}

	// ── Azioni giocatore umano ─────────────────────────────────────────
	function confermaPuntata() {
		if (!isBidValida(bidQuantita, bidValore)) return;
		piazzaPuntata(bidQuantita, bidValore);
	}

	function piazzaPuntata(q, v) {
		puntataCorrente = { quantita: q, valore: v, giocatoreIdx: turnoIdx };
		avanzaTurno();
	}

	function sfidaUmano() {
		eseguiSfida(turnoIdx);
	}

	function eseguiSfida(sfidanteIdx) {
		// Rivela tutti i dadi
		subfase = 'rivela';

		const bid = puntataCorrente;
		const dadiValidi = contaDadiTotali(giocatori, bid.valore);
		const bidValida = dadiValidi >= bid.quantita;

		sfidaEsito = {
			sfidante: giocatori[sfidanteIdx],
			sfidanteIdx,
			puntatore: giocatori[bid.giocatoreIdx],
			puntatoreIdx: bid.giocatoreIdx,
			dadiValidi,
			bidValida,
			bid
		};

		// Chi perde un dado?
		perdenteSfida = bidValida ? sfidanteIdx : bid.giocatoreIdx;

		setTimeout(() => {
			subfase = 'risultato';
			applicaRisultatoSfida();
		}, 2500);
	}

	function applicaRisultatoSfida() {
		// Achievement: bluff riuscito (bid valida, sfidante sbaglia)
		if (sfidaEsito.bidValida && sfidaEsito.puntatoreIdx === 0) {
			// Il player ha bluffato con successo
			bluffSuccessi++;
			localStorage.setItem('zoo_bluff_successi', String(bluffSuccessi));
			if (bluffSuccessi >= 5) unlock('bluff_bugiardo');
		}
		// Achievement: sfida riuscita (bid invalida, sfidante vince)
		if (!sfidaEsito.bidValida && sfidaEsito.sfidanteIdx === 0) {
			unlock('bluff_sfidante');
		}

		// Il perdente perde un dado
		giocatori = giocatori.map((g, i) => {
			if (i === perdenteSfida) {
				const nuoviDadi = g.dadi.slice(0, -1);
				return { ...g, dadi: nuoviDadi };
			}
			return g;
		});

		// Controlla se qualcuno è eliminato
		const eliminati = giocatori
			.map((g, i) => ({ g, i }))
			.filter(({ g }) => g.dadi.length === 0);

		if (eliminati.length > 0) {
			giocatori = giocatori.filter((g) => g.dadi.length > 0);
		}

		// Controlla vittoria
		if (giocatori.length === 1) {
			setTimeout(finePartita, 1200);
			return;
		}

		// Nuovo round: chi ha perso il dado inizia (se ancora in gioco)
		const perdenteName = giocatori[perdenteSfida]?.nome;
		if (perdenteSfida < giocatori.length) {
			turnoIdx = perdenteSfida % giocatori.length;
		} else {
			turnoIdx = 0;
		}

		setTimeout(() => {
			if (modalita === 'locale' && !giocatori[turnoIdx]?.isAI) {
				fase = 'passaggio';
			} else {
				iniziaRound();
			}
		}, 1500);
	}

	function finePartita() {
		vincitore = giocatori[0];
		const isPlayerWin = vincitore.nome === 'Tu' || (!vincitore.isAI && modalita === 'locale');

		if (isPlayerWin) {
			addSaldo(pot, 'bluff_vincita');
			saldo = getSaldo();
			vittorieBluff++;
			localStorage.setItem('zoo_bluff_vittorie', String(vittorieBluff));
			unlock('bluff_vincitore');
			if (vittorieBluff >= 5) unlock('bluff_campione');
			if (vittorieBluff >= 10) unlock('bluff_master');
			// Achievement dado singolo: vince con 1 dado rimasto
			const dadoRimasto = vincitore.dadi.length;
			if (dadoRimasto === 1) unlock('bluff_ultimo_dado');
			checkEconomyAchievements();
			generaParticelle();
		}

		fase = 'fine';
	}

	function avanzaTurno() {
		const next = (turnoIdx + 1) % giocatori.length;
		turnoIdx = next;

		if (modalita === 'locale' && !giocatori[next]?.isAI) {
			subfase = 'puntata';
			fase = 'passaggio';
		} else {
			subfase = 'puntata';
			inizializzaBid();
			if (giocatori[next]?.isAI) {
				setTimeout(mossaAIAutomatica, 1200);
			}
		}
	}

	function confermPassaggio() {
		fase = 'gioco';
		subfase = 'puntata';
		inizializzaBid();
	}

	// ── Validazione bid ────────────────────────────────────────────────
	function isBidValida(q, v) {
		const prev = puntataCorrente;
		if (prev.quantita === 0) return q >= 1 && v >= 1 && v <= 6;
		// Deve essere più alta: o stessa quantità con valore più alto, o più quantità
		if (q > prev.quantita) return v >= 1 && v <= 6;
		if (q === prev.quantita && v > prev.valore) return true;
		return false;
	}

	function incrementaBidQ() {
		bidQuantita = bidQuantita + 1;
	}
	function decrementaBidQ() {
		if (bidQuantita > 1) bidQuantita = bidQuantita - 1;
	}
	function incrementaBidV() {
		if (bidValore < 6) bidValore = bidValore + 1;
	}
	function decrementaBidV() {
		if (bidValore > 1) bidValore = bidValore - 1;
	}

	// ── Particelle vittoria ────────────────────────────────────────────
	function generaParticelle() {
		particelle = Array.from({ length: 22 }, (_, i) => ({
			id: ++partIdCnt,
			x: 5 + Math.random() * 90,
			delay: Math.random() * 0.9,
			dur: 1.8 + Math.random() * 1.4,
			size: 1.1 + Math.random() * 0.9,
			fromBottom: i % 2 === 0,
			emoji: ['🎲', '🏆', '🎉', '⭐', '💰', '🎊'][Math.floor(Math.random() * 6)]
		}));
	}

	// ── Reset ──────────────────────────────────────────────────────────
	function nuovaPartita() {
		if (lancioTimeout) clearTimeout(lancioTimeout);
		giocatori = [];
		turnoIdx = 0;
		puntataCorrente = { quantita: 0, valore: 0, giocatoreIdx: -1 };
		dadiTotali = 0;
		pot = 0;
		sfidaEsito = null;
		perdenteSfida = null;
		vincitore = null;
		particelle = [];
		dadiVisibili = false;
		lancioAnimazione = false;
		fase = 'menu';
		subfase = 'lancio';
		saldo = getSaldo();
	}

	// ── Helpers ────────────────────────────────────────────────────────
	function diceUnicode(val) {
		return DICE_UNICODE[val - 1] || '🎲';
	}

	function giocatoreCorrente() {
		return giocatori[turnoIdx];
	}

	function isPlayerTurn() {
		return !giocatori[turnoIdx]?.isAI;
	}

	function nomiAltriGiocatori() {
		return giocatori.filter((_, i) => i !== turnoIdx).map((g) => g.nome).join(', ');
	}
</script>

<!-- Particelle vittoria -->
{#each particelle as p (p.id)}
	<div
		class="particle"
		class:from-bottom={p.fromBottom}
		style="left:{p.x}%;font-size:{p.size}rem;animation-delay:{p.delay}s;animation-duration:{p.dur}s"
		aria-hidden="true"
	>{p.emoji}</div>
{/each}

<!-- BG blobs -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<!-- ── HEADER ── -->
	<header>
		<button class="back-btn" onclick={() => goto('/minigiochi')}>← Minigiochi</button>
		<h1>
			<span class="title-icon">🎲</span>
			<span class="title-text">Dati del Bluff<br />allo Zoo</span>
		</h1>
		<p class="subtitle">Bluffa, sfida, sopravvivi · Liar's Dice</p>
	</header>

	<!-- ── WALLET ── -->
	<div class="wallet-bar">
		<span>💰</span>
		<span class="wallet-saldo">€{saldo.toFixed(2)}</span>
		<span class="wallet-label">saldo</span>
	</div>

	<!-- ════════════════ FASE: MENU ════════════════ -->
	{#if fase === 'menu'}
		<section class="menu-section fade-in">
			<div class="menu-card glass-card">
				<p class="menu-intro">2–6 giocatori, 5 dadi a testa. Bluffa sulla quantità di dadi nascosti o sfida l'avversario!</p>
				<div class="mode-buttons">
					<button class="mode-btn mode-single" onclick={() => iniziaSetup('singolo')}>
						<span class="mode-icon">🤖</span>
						<span class="mode-name">Singolo</span>
						<span class="mode-desc">Contro animali AI</span>
					</button>
					<button class="mode-btn mode-multi" onclick={() => iniziaSetup('locale')}>
						<span class="mode-icon">👥</span>
						<span class="mode-name">Locale</span>
						<span class="mode-desc">Passa il telefono</span>
					</button>
				</div>
				<button class="regole-btn" onclick={() => { fase = 'regole'; }}>
					📜 Leggi il Regolamento
				</button>
			</div>
		</section>

	<!-- ════════════════ FASE: REGOLE ════════════════ -->
	{:else if fase === 'regole'}
		<section class="regole-section fade-in">
			<div class="glass-card">
				<h2 class="regole-title">📜 Regolamento</h2>
				<div class="regola-block">
					<h3>🎯 Obiettivo</h3>
					<p>Essere l'ultimo giocatore ad avere dadi. Chi perde tutti i dadi è eliminato.</p>
				</div>
				<div class="regola-block">
					<h3>🎲 Il Round</h3>
					<p>All'inizio di ogni round, ogni giocatore lancia i propri dadi in segreto. A turno, si fanno puntate sulla quantità totale di dadi con un certo valore visibili su tutti i tavoli.</p>
				</div>
				<div class="regola-block">
					<h3>🗣️ Le Puntate</h3>
					<p>Ogni puntata deve essere più alta della precedente: <strong>più quantità</strong> oppure <strong>stessa quantità con valore più alto</strong>.</p>
					<p>Esempio: dopo "3 dadi con ⚃" puoi dire "4 dadi con ⚃" oppure "3 dadi con ⚄".</p>
				</div>
				<div class="regola-block">
					<h3>🫵 La Sfida ("Bugiardo!")</h3>
					<p>Invece di alzare, puoi sfidare la puntata precedente. Si rivelano tutti i dadi:</p>
					<ul>
						<li>Se la puntata era <strong>valida</strong> → chi ha sfidato perde 1 dado</li>
						<li>Se la puntata era <strong>esagerata</strong> → chi aveva puntato perde 1 dado</li>
					</ul>
				</div>
				<div class="regola-block">
					<h3>⚀ I Jolly</h3>
					<p>I dadi con valore <strong>1 (asso)</strong> sono jolly e contano come qualsiasi valore. Se punti "3 dadi con ⚄", anche gli assi contano!</p>
					<p><em>Eccezione: se punti sul valore 1, i jolly valgono solo come 1.</em></p>
				</div>
				<button class="back-regole-btn" onclick={() => { fase = 'menu'; }}>← Torna al menu</button>
			</div>
		</section>

	<!-- ════════════════ FASE: SETUP ════════════════ -->
	{:else if fase === 'setup'}
		<section class="setup-section fade-in">
			<div class="glass-card">
				<h2 class="setup-title">
					{modalita === 'singolo' ? '🤖 Partita Singola' : '👥 Partita Locale'}
				</h2>

				{#if modalita === 'locale'}
					<div class="field-group">
						<label class="field-label">Quanti giocatori?</label>
						<div class="num-stepper">
							<button class="stepper-btn" onclick={() => { if (numGiocatori > 2) numGiocatori--; }} disabled={numGiocatori <= 2}>−</button>
							<span class="stepper-val">{numGiocatori}</span>
							<button class="stepper-btn" onclick={() => { if (numGiocatori < 6) numGiocatori++; }} disabled={numGiocatori >= 6}>+</button>
						</div>
					</div>
				{/if}

				<div class="field-group">
					<label class="field-label">
						{modalita === 'singolo' ? 'La tua quota' : `Quota per giocatore`}
					</label>
					<div class="bet-grid">
						{#each PRESET_IMPORTI as imp}
							<button
								class="bet-chip"
								class:active={betAmount === imp}
								onclick={() => { betAmount = imp; }}
								disabled={saldo < imp}
							>€{imp}</button>
						{/each}
					</div>
					{#if modalita === 'locale'}
						<p class="pot-preview">Pot totale: <strong>€{(betAmount * numGiocatori).toFixed(2)}</strong></p>
					{:else}
						<p class="pot-preview">Pot potenziale: <strong>€{(betAmount * 3).toFixed(2)}–€{(betAmount * 5).toFixed(2)}</strong></p>
					{/if}
				</div>

				<div class="wallet-small">Saldo: €{saldo.toFixed(2)}</div>

				<button
					class="cta-btn"
					onclick={confermaBet}
					disabled={saldo < betAmount || (modalita === 'locale' && saldo < betAmount * numGiocatori)}
				>
					{modalita === 'singolo' ? 'Paga e Inizia →' : 'Continua →'}
				</button>
				<button class="ghost-btn" onclick={() => { fase = 'menu'; }}>← Annulla</button>
			</div>
		</section>

	<!-- ════════════════ FASE: SETUP ANIMALI (multiplayer) ════════════════ -->
	{:else if fase === 'setup_animali'}
		<section class="setup-section fade-in">
			<div class="glass-card">
				<h2 class="setup-title">Giocatore {setupIdx + 1}: scegli il tuo animale</h2>
				<p class="setup-hint">Poi passa il telefono al prossimo</p>
				<div class="animali-grid">
					{#each membri as m}
						{@const giaUsato = setupGiocatori.some((g) => g && g.nome === m.nome)}
						<button
							class="animale-chip"
							class:usato={giaUsato}
							disabled={giaUsato}
							onclick={() => selezionaAnimaleSetup(m)}
						>
							<span class="chip-emoji">{m.emoji}</span>
							<span class="chip-nome">{m.nome}</span>
						</button>
					{/each}
				</div>
			</div>
		</section>

	<!-- ════════════════ FASE: PASSAGGIO TELEFONO ════════════════ -->
	{:else if fase === 'passaggio'}
		<section class="passaggio-section fade-in">
			<div class="glass-card passaggio-card">
				<div class="passaggio-emoji">{giocatori[turnoIdx]?.emoji ?? '🎲'}</div>
				<h2 class="passaggio-title">Passa il telefono a</h2>
				<p class="passaggio-nome">{giocatori[turnoIdx]?.nome ?? '...'}</p>
				<p class="passaggio-hint">Assicurati che gli altri non vedano i tuoi dadi!</p>
				<button class="cta-btn" onclick={confermPassaggio}>Sono pronto →</button>
			</div>
		</section>

	<!-- ════════════════ FASE: GIOCO ════════════════ -->
	{:else if fase === 'gioco'}
		<!-- Tabella dadi giocatori (sempre visibile) -->
		<section class="gioco-section">
			<div class="giocatori-bar">
				{#each giocatori as g, i}
					<div class="giocatore-chip" class:active={i === turnoIdx} class:ai={g.isAI}>
						<span class="giocat-emoji">{g.emoji}</span>
						<span class="giocat-nome">{g.nome === 'Tu' ? 'Tu' : g.nome.split(' ')[0]}</span>
						<span class="giocat-dadi">
							{#each g.dadi as _}🎲{/each}
						</span>
					</div>
				{/each}
			</div>

			<!-- LANCIO -->
			{#if subfase === 'lancio'}
				<div class="lancio-screen fade-in">
					<div class="lancio-dadi" class:animating={lancioAnimazione}>
						{#each ['⚀','⚁','⚂','⚃','⚄','⚅'] as d}
							<span class="lancio-die">{d}</span>
						{/each}
					</div>
					<p class="lancio-label">Lancio in corso...</p>
				</div>

			<!-- PUNTATA -->
			{:else if subfase === 'puntata'}
				<div class="puntata-screen fade-in">
					<!-- Puntata corrente -->
					{#if puntataCorrente.quantita > 0}
						<div class="bid-display">
							<span class="bid-who">{giocatori[puntataCorrente.giocatoreIdx]?.nome ?? '?'}</span>
							<span class="bid-text"> ha puntato: </span>
							<strong class="bid-val">{puntataCorrente.quantita} × {diceUnicode(puntataCorrente.valore)}</strong>
						</div>
					{:else}
						<div class="bid-display bid-empty">Prima puntata del round</div>
					{/if}

					<!-- Dadi del giocatore corrente (se non AI) -->
					{#if !giocatori[turnoIdx]?.isAI}
						<div class="tuoi-dadi-wrap">
							<button class="guarda-btn" onclick={() => { dadiVisibili = !dadiVisibili; }}>
								{dadiVisibili ? '🙈 Nascondi' : '👁️ Guarda i tuoi dadi'}
							</button>
							{#if dadiVisibili}
								<div class="tuoi-dadi fade-in">
									{#each giocatori[turnoIdx]?.dadi ?? [] as d}
										<span class="my-die">{diceUnicode(d)}</span>
									{/each}
								</div>
							{:else}
								<div class="tuoi-dadi-hidden">
									{#each giocatori[turnoIdx]?.dadi ?? [] as _}
										<span class="cup">🥤</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Input puntata -->
						<div class="bid-input-wrap">
							<p class="bid-input-label">La tua puntata:</p>
							<div class="bid-input-row">
								<div class="bid-field">
									<label>Quantità</label>
									<div class="input-stepper">
										<button class="stepper-btn" onclick={decrementaBidQ}>−</button>
										<span class="stepper-val">{bidQuantita}</span>
										<button class="stepper-btn" onclick={incrementaBidQ}>+</button>
									</div>
								</div>
								<div class="bid-separator">×</div>
								<div class="bid-field">
									<label>Valore</label>
									<div class="input-stepper">
										<button class="stepper-btn" onclick={decrementaBidV}>−</button>
										<span class="stepper-val die-large">{diceUnicode(bidValore)}</span>
										<button class="stepper-btn" onclick={incrementaBidV}>+</button>
									</div>
								</div>
							</div>

							<div class="bid-actions">
								<button
									class="cta-btn bid-btn"
									onclick={confermaPuntata}
									disabled={!isBidValida(bidQuantita, bidValore)}
								>
									Punta →
								</button>
								{#if puntataCorrente.quantita > 0}
									<button class="sfida-btn" onclick={sfidaUmano}>
										🫵 Bugiardo!
									</button>
								{/if}
							</div>
						</div>
					{:else}
						<!-- Turno AI -->
						<div class="ai-thinking">
							<div class="ai-spinner"></div>
							<p>{giocatori[turnoIdx]?.nome ?? '?'} sta pensando...</p>
						</div>
					{/if}
				</div>

			<!-- RIVELA -->
			{:else if subfase === 'rivela'}
				<div class="rivela-screen fade-in">
					<h3 class="rivela-title">🫵 SFIDA!</h3>
					{#if sfidaEsito}
						<p class="rivela-sfidante">
							<strong>{sfidaEsito.sfidante.nome}</strong> sfida la puntata di <strong>{sfidaEsito.puntatore.nome}</strong>
						</p>
						<div class="rivela-bid">
							La puntata era: <strong>{sfidaEsito.bid.quantita} × {diceUnicode(sfidaEsito.bid.valore)}</strong>
						</div>
						<p class="rivela-contando">Contando i dadi...</p>
						<div class="tutti-dadi">
							{#each giocatori as g}
								<div class="dadi-giocatore">
									<span class="dg-nome">{g.emoji} {g.nome}</span>
									<div class="dg-dadi">
										{#each g.dadi as d}
											<span
												class="reveal-die"
												class:match={d === sfidaEsito.bid.valore || (sfidaEsito.bid.valore !== 1 && d === 1)}
											>{diceUnicode(d)}</span>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			<!-- RISULTATO SFIDA -->
			{:else if subfase === 'risultato'}
				<div class="risultato-screen fade-in">
					{#if sfidaEsito}
						<div class="risultato-card" class:bid-valida={sfidaEsito.bidValida} class:bid-invalida={!sfidaEsito.bidValida}>
							{#if sfidaEsito.bidValida}
								<div class="res-icon">✅</div>
								<h3>La puntata era valida!</h3>
								<p>C'erano <strong>{sfidaEsito.dadiValidi}</strong> dadi con {diceUnicode(sfidaEsito.bid.valore)} (servivano {sfidaEsito.bid.quantita})</p>
								<p class="perdente-label"><strong>{sfidaEsito.sfidante.nome}</strong> perde 1 dado 🎲</p>
							{:else}
								<div class="res-icon">❌</div>
								<h3>Bugiardo smascherato!</h3>
								<p>C'erano solo <strong>{sfidaEsito.dadiValidi}</strong> dadi con {diceUnicode(sfidaEsito.bid.valore)} (servivano {sfidaEsito.bid.quantita})</p>
								<p class="perdente-label"><strong>{sfidaEsito.puntatore.nome}</strong> perde 1 dado 🎲</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Pot e info -->
			<div class="pot-info">
				<span class="pot-label">🏆 Pot:</span>
				<span class="pot-val">€{pot.toFixed(2)}</span>
				<span class="dadi-totali">· {dadiTotali} dadi in campo</span>
			</div>

			<!-- Bottone regole accessibile durante il gioco -->
			<button class="regole-mini-btn" onclick={() => { fase = 'regole'; }}>📜 Regole</button>
		</section>

	<!-- ════════════════ FASE: FINE ════════════════ -->
	{:else if fase === 'fine'}
		<section class="fine-section fade-in">
			<div class="glass-card fine-card">
				{#if vincitore}
					{@const isPlayer = vincitore.nome === 'Tu' || (!vincitore.isAI && modalita === 'locale')}
					<div class="fine-emoji">{vincitore.emoji}</div>
					<h2 class="fine-title">{isPlayer ? '🏆 Hai vinto!' : `${vincitore.nome} vince!`}</h2>
					{#if isPlayer}
						<p class="fine-premio">Guadagno: <strong class="premio-amt">+€{pot.toFixed(2)}</strong></p>
						<p class="fine-hint">Saldo aggiornato: €{saldo.toFixed(2)}</p>
					{:else}
						<p class="fine-sconfitta">Meglio la prossima volta!</p>
					{/if}
				{/if}

				<div class="fine-actions">
					<button class="cta-btn" onclick={nuovaPartita}>🎲 Nuova Partita</button>
					<button class="ghost-btn" onclick={() => goto('/minigiochi')}>← Minigiochi</button>
				</div>
			</div>
		</section>
	{/if}
</main>

<style>
	/* ── PARTICELLE ── */
	.particle {
		position: fixed;
		top: 0;
		pointer-events: none;
		z-index: 999;
		animation: fall-down 2.5s ease-in forwards;
		user-select: none;
	}
	.particle.from-bottom {
		top: auto;
		bottom: 0;
		animation-name: rise-up;
	}
	@keyframes fall-down {
		from { transform: translateY(-20px) rotate(0deg); opacity: 1; }
		to   { transform: translateY(110vh) rotate(720deg); opacity: 0; }
	}
	@keyframes rise-up {
		from { transform: translateY(20px) rotate(0deg); opacity: 1; }
		to   { transform: translateY(-110vh) rotate(-720deg); opacity: 0; }
	}

	/* ── BG BLOBS ── */
	.bg-blobs {
		position: fixed; inset: 0;
		pointer-events: none; z-index: 0; overflow: hidden;
	}
	.blob {
		position: absolute; border-radius: 50%; filter: blur(90px);
	}
	.blob-1 {
		width: 500px; height: 500px;
		background: radial-gradient(circle, #6d28d9 0%, transparent 70%);
		top: -130px; left: -90px; opacity: 0.16;
		animation: drift 20s ease-in-out infinite;
	}
	.blob-2 {
		width: 420px; height: 420px;
		background: radial-gradient(circle, #4f46e5 0%, transparent 70%);
		bottom: -100px; right: -80px; opacity: 0.13;
		animation: drift 24s ease-in-out infinite reverse;
	}
	.blob-3 {
		width: 260px; height: 260px;
		background: radial-gradient(circle, #a855f7 0%, transparent 70%);
		top: 42%; left: 58%; opacity: 0.10;
		animation: drift 28s ease-in-out infinite 5s;
	}
	@keyframes drift {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33%       { transform: translate(45px, -35px) scale(1.06); }
		66%       { transform: translate(-28px, 44px) scale(0.93); }
	}

	/* ── LAYOUT ── */
	main {
		position: relative; z-index: 1;
		max-width: 600px; margin: 0 auto;
		padding: 0 1.2rem 5rem;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 1.5rem 1rem 1.2rem;
		animation: fade-down 0.6s ease both;
	}
	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-16px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.back-btn {
		display: inline-flex; align-items: center; gap: 0.4rem;
		padding: 0.35rem 0.85rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.05);
		color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; font-size: 0.78rem;
		cursor: pointer; transition: all 0.18s ease;
		margin-bottom: 1rem;
	}
	.back-btn:hover {
		background: rgba(255,255,255,0.1); color: rgba(240,240,250,0.9);
		border-color: rgba(255,255,255,0.2);
	}
	h1 {
		display: flex; align-items: center; justify-content: center;
		gap: 0.5rem; line-height: 1;
	}
	.title-icon {
		font-size: clamp(2rem, 5vw, 3.5rem);
		animation: rock 4s ease-in-out infinite;
	}
	@keyframes rock {
		0%, 100% { transform: rotate(-5deg) scale(1); }
		50%       { transform: rotate(6deg) scale(1.07); }
	}
	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.2rem, 6.5vw, 4rem);
		letter-spacing: 0.04em; color: #fff;
		text-align: left;
	}
	.subtitle {
		margin-top: 0.6rem; font-size: 0.8rem;
		color: rgba(240,240,250,0.38);
	}

	/* ── WALLET BAR ── */
	.wallet-bar {
		display: flex; align-items: center; justify-content: center;
		gap: 0.5rem; margin-bottom: 1.5rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.09);
		border-radius: 999px; padding: 0.45rem 1.2rem;
		width: fit-content; margin-left: auto; margin-right: auto;
	}
	.wallet-saldo { font-weight: 700; color: #ffd700; font-size: 1.05rem; }
	.wallet-label { font-size: 0.72rem; color: rgba(240,240,250,0.4); }

	/* ── GLASS CARD ── */
	.glass-card {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 20px; padding: 1.8rem 1.4rem;
	}

	/* ── FADE IN ── */
	.fade-in { animation: fade-down 0.4s ease both; }

	/* ── MENU ── */
	.menu-section { margin-bottom: 1.5rem; }
	.menu-intro {
		font-size: 0.85rem; color: rgba(240,240,250,0.55);
		text-align: center; line-height: 1.6; margin-bottom: 1.5rem;
	}
	.mode-buttons {
		display: grid; grid-template-columns: 1fr 1fr;
		gap: 1rem; margin-bottom: 1.2rem;
	}
	.mode-btn {
		display: flex; flex-direction: column; align-items: center;
		gap: 0.4rem; padding: 1.4rem 1rem; border-radius: 16px;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.05);
		color: #f0f0fa; cursor: pointer; transition: all 0.2s ease;
	}
	.mode-btn:hover { transform: translateY(-3px); }
	.mode-single:hover {
		background: rgba(109,40,217,0.15);
		border-color: rgba(109,40,217,0.4);
		box-shadow: 0 8px 28px rgba(109,40,217,0.2);
	}
	.mode-multi:hover {
		background: rgba(79,70,229,0.15);
		border-color: rgba(79,70,229,0.4);
		box-shadow: 0 8px 28px rgba(79,70,229,0.2);
	}
	.mode-icon { font-size: 2.2rem; }
	.mode-name {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.3rem; letter-spacing: 0.06em;
	}
	.mode-desc { font-size: 0.72rem; color: rgba(240,240,250,0.4); }
	.regole-btn {
		width: 100%; padding: 0.65rem; border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.12);
		background: transparent; color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; font-size: 0.8rem;
		cursor: pointer; transition: all 0.18s ease;
	}
	.regole-btn:hover {
		background: rgba(255,255,255,0.07);
		color: rgba(240,240,250,0.85);
	}

	/* ── REGOLE ── */
	.regole-section .glass-card { max-width: 520px; margin: 0 auto; }
	.regole-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.8rem; letter-spacing: 0.05em;
		margin-bottom: 1.2rem; text-align: center;
	}
	.regola-block {
		margin-bottom: 1.2rem;
		padding-bottom: 1.2rem;
		border-bottom: 1px solid rgba(255,255,255,0.07);
	}
	.regola-block:last-of-type { border-bottom: none; }
	.regola-block h3 {
		font-size: 0.9rem; font-weight: 700;
		color: #a78bfa; margin-bottom: 0.4rem;
	}
	.regola-block p, .regola-block ul {
		font-size: 0.82rem; color: rgba(240,240,250,0.65);
		line-height: 1.6; margin: 0.25rem 0;
	}
	.regola-block ul { padding-left: 1.2rem; }
	.regola-block strong { color: rgba(240,240,250,0.9); }
	.back-regole-btn {
		margin-top: 1rem; width: 100%; padding: 0.7rem;
		border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
		background: transparent; color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; cursor: pointer;
		transition: all 0.18s ease;
	}
	.back-regole-btn:hover {
		background: rgba(255,255,255,0.07); color: rgba(240,240,250,0.85);
	}

	/* ── SETUP ── */
	.setup-section .glass-card { max-width: 440px; margin: 0 auto; }
	.setup-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem; letter-spacing: 0.05em;
		text-align: center; margin-bottom: 1.4rem;
	}
	.field-group { margin-bottom: 1.4rem; }
	.field-label {
		display: block; font-size: 0.75rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.1em;
		color: rgba(240,240,250,0.4); margin-bottom: 0.7rem;
	}
	.num-stepper {
		display: flex; align-items: center; gap: 1rem;
		justify-content: center;
	}
	.stepper-btn {
		width: 36px; height: 36px; border-radius: 50%;
		border: 1px solid rgba(255,255,255,0.15);
		background: rgba(255,255,255,0.07);
		color: #f0f0fa; font-size: 1.2rem; cursor: pointer;
		transition: all 0.15s ease; display: flex;
		align-items: center; justify-content: center;
	}
	.stepper-btn:hover:not(:disabled) { background: rgba(109,40,217,0.25); }
	.stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.stepper-val {
		font-size: 1.4rem; font-weight: 700; color: #a78bfa;
		min-width: 2rem; text-align: center;
	}
	.bet-grid {
		display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;
	}
	.bet-chip {
		padding: 0.45rem 0.9rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.06);
		color: rgba(240,240,250,0.7); font-size: 0.85rem;
		cursor: pointer; transition: all 0.15s ease;
	}
	.bet-chip:hover:not(:disabled) {
		background: rgba(109,40,217,0.2);
		border-color: rgba(109,40,217,0.45);
	}
	.bet-chip.active {
		background: rgba(109,40,217,0.3);
		border-color: rgba(167,139,250,0.6);
		color: #c4b5fd; font-weight: 700;
	}
	.bet-chip:disabled { opacity: 0.3; cursor: not-allowed; }
	.pot-preview {
		text-align: center; font-size: 0.78rem;
		color: rgba(240,240,250,0.4); margin-top: 0.6rem;
	}
	.pot-preview strong { color: #a78bfa; }
	.wallet-small {
		text-align: center; font-size: 0.78rem;
		color: rgba(240,240,250,0.3); margin-bottom: 1rem;
	}
	.setup-hint {
		text-align: center; font-size: 0.78rem;
		color: rgba(240,240,250,0.4); margin-bottom: 1rem;
	}

	/* ── SETUP ANIMALI GRID ── */
	.animali-grid {
		display: grid; grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem; max-height: 420px; overflow-y: auto;
		padding-right: 0.2rem;
	}
	.animale-chip {
		display: flex; flex-direction: column; align-items: center;
		gap: 0.2rem; padding: 0.6rem 0.3rem; border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.05);
		color: #f0f0fa; cursor: pointer;
		transition: all 0.15s ease; font-size: 0.7rem;
	}
	.animale-chip:hover:not(:disabled) {
		background: rgba(109,40,217,0.2);
		border-color: rgba(109,40,217,0.4);
		transform: scale(1.05);
	}
	.animale-chip.usato { opacity: 0.25; cursor: not-allowed; }
	.chip-emoji { font-size: 1.6rem; }
	.chip-nome { font-size: 0.65rem; color: rgba(240,240,250,0.5); }

	/* ── PASSAGGIO ── */
	.passaggio-section { display: flex; justify-content: center; }
	.passaggio-card {
		max-width: 380px; text-align: center;
		padding: 2.5rem 2rem;
	}
	.passaggio-emoji { font-size: 4rem; margin-bottom: 0.5rem; }
	.passaggio-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem; letter-spacing: 0.05em;
		color: rgba(240,240,250,0.7); margin-bottom: 0.2rem;
	}
	.passaggio-nome {
		font-size: 2rem; font-weight: 700; color: #a78bfa;
		margin-bottom: 0.8rem;
	}
	.passaggio-hint {
		font-size: 0.75rem; color: rgba(240,240,250,0.35);
		margin-bottom: 1.5rem;
	}

	/* ── GIOCO ── */
	.gioco-section { animation: fade-down 0.4s ease both; }

	/* Barra giocatori */
	.giocatori-bar {
		display: flex; flex-wrap: wrap; gap: 0.5rem;
		justify-content: center; margin-bottom: 1.2rem;
	}
	.giocatore-chip {
		display: flex; flex-direction: column; align-items: center;
		gap: 0.15rem; padding: 0.5rem 0.7rem; border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.04);
		transition: all 0.2s ease; min-width: 65px;
	}
	.giocatore-chip.active {
		background: rgba(109,40,217,0.2);
		border-color: rgba(167,139,250,0.5);
		box-shadow: 0 0 12px rgba(109,40,217,0.3);
	}
	.giocat-emoji { font-size: 1.4rem; }
	.giocat-nome { font-size: 0.65rem; color: rgba(240,240,250,0.6); }
	.giocat-dadi { font-size: 0.7rem; letter-spacing: 0.05rem; }

	/* Lancio */
	.lancio-screen {
		text-align: center; padding: 2.5rem 1rem;
	}
	.lancio-dadi {
		font-size: 2.5rem; letter-spacing: 0.3rem;
		margin-bottom: 1rem;
	}
	.lancio-dadi.animating span {
		display: inline-block;
		animation: spin-die 0.2s linear infinite;
	}
	.lancio-dadi.animating span:nth-child(2) { animation-delay: 0.05s; }
	.lancio-dadi.animating span:nth-child(3) { animation-delay: 0.10s; }
	.lancio-dadi.animating span:nth-child(4) { animation-delay: 0.15s; }
	.lancio-dadi.animating span:nth-child(5) { animation-delay: 0.20s; }
	.lancio-dadi.animating span:nth-child(6) { animation-delay: 0.25s; }
	@keyframes spin-die {
		0%   { transform: rotateY(0deg); }
		100% { transform: rotateY(360deg); }
	}
	.lancio-label { font-size: 0.85rem; color: rgba(240,240,250,0.4); }
	.lancio-die { display: inline-block; }

	/* Puntata */
	.puntata-screen { padding: 0.5rem 0; }
	.bid-display {
		text-align: center; padding: 0.8rem 1rem; border-radius: 12px;
		background: rgba(109,40,217,0.12);
		border: 1px solid rgba(109,40,217,0.25);
		margin-bottom: 1.2rem; font-size: 0.88rem;
		color: rgba(240,240,250,0.75);
	}
	.bid-display.bid-empty {
		background: rgba(255,255,255,0.04);
		border-color: rgba(255,255,255,0.08);
	}
	.bid-who { font-weight: 700; color: #a78bfa; }
	.bid-val { color: #c4b5fd; font-size: 1.05rem; }

	.tuoi-dadi-wrap { margin-bottom: 1.2rem; text-align: center; }
	.guarda-btn {
		padding: 0.45rem 1.1rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.14);
		background: rgba(255,255,255,0.06);
		color: rgba(240,240,250,0.65); font-size: 0.8rem;
		cursor: pointer; transition: all 0.15s ease;
		margin-bottom: 0.8rem;
	}
	.guarda-btn:hover {
		background: rgba(109,40,217,0.18);
		border-color: rgba(109,40,217,0.4);
		color: #c4b5fd;
	}
	.tuoi-dadi, .tuoi-dadi-hidden {
		display: flex; gap: 0.5rem; justify-content: center;
		flex-wrap: wrap;
	}
	.my-die, .cup {
		font-size: 2rem; cursor: default;
	}
	.my-die { color: #ffd700; }

	.bid-input-wrap {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.09);
		border-radius: 16px; padding: 1.2rem 1rem;
	}
	.bid-input-label {
		font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.1em; color: rgba(240,240,250,0.4);
		margin-bottom: 0.8rem; text-align: center;
	}
	.bid-input-row {
		display: flex; align-items: center;
		justify-content: center; gap: 1rem; margin-bottom: 1.2rem;
	}
	.bid-field {
		display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
	}
	.bid-field label { font-size: 0.7rem; color: rgba(240,240,250,0.35); }
	.input-stepper {
		display: flex; align-items: center; gap: 0.5rem;
	}
	.die-large { font-size: 1.8rem; }
	.bid-separator {
		font-size: 1.5rem; color: rgba(240,240,250,0.25);
		padding-top: 1.2rem;
	}
	.bid-actions {
		display: flex; gap: 0.7rem; justify-content: center;
	}
	.bid-btn { min-width: 100px; }
	.sfida-btn {
		padding: 0.65rem 1.2rem; border-radius: 12px;
		border: 1px solid rgba(239,68,68,0.4);
		background: rgba(239,68,68,0.12);
		color: #fca5a5; font-size: 0.9rem; font-weight: 700;
		cursor: pointer; transition: all 0.18s ease;
		font-family: 'Outfit', sans-serif;
	}
	.sfida-btn:hover {
		background: rgba(239,68,68,0.22);
		border-color: rgba(239,68,68,0.6);
		box-shadow: 0 4px 16px rgba(239,68,68,0.25);
	}

	/* AI thinking */
	.ai-thinking {
		text-align: center; padding: 2rem 1rem;
		color: rgba(240,240,250,0.5); font-size: 0.85rem;
	}
	.ai-spinner {
		width: 32px; height: 32px; border: 3px solid rgba(167,139,250,0.2);
		border-top-color: #a78bfa; border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto 0.8rem;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Rivela */
	.rivela-screen { padding: 0.5rem 0; text-align: center; }
	.rivela-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2rem; letter-spacing: 0.05em;
		color: #fca5a5; margin-bottom: 0.5rem;
	}
	.rivela-sfidante {
		font-size: 0.82rem; color: rgba(240,240,250,0.55);
		margin-bottom: 0.6rem;
	}
	.rivela-bid {
		font-size: 0.88rem; color: rgba(240,240,250,0.6);
		margin-bottom: 0.8rem;
	}
	.rivela-contando {
		font-size: 0.78rem; color: rgba(240,240,250,0.35);
		margin-bottom: 1rem;
	}
	.tutti-dadi { display: flex; flex-direction: column; gap: 0.8rem; }
	.dadi-giocatore {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 12px; padding: 0.7rem 1rem;
		display: flex; align-items: center; gap: 0.8rem;
		flex-wrap: wrap;
	}
	.dg-nome { font-size: 0.78rem; color: rgba(240,240,250,0.5); min-width: 80px; }
	.dg-dadi { display: flex; gap: 0.3rem; flex-wrap: wrap; }
	.reveal-die {
		font-size: 1.5rem; transition: transform 0.2s ease;
	}
	.reveal-die.match {
		color: #ffd700;
		text-shadow: 0 0 10px rgba(255,215,0,0.6);
		transform: scale(1.2);
	}

	/* Risultato sfida */
	.risultato-screen { padding: 0.5rem 0; }
	.risultato-card {
		border-radius: 16px; padding: 1.5rem; text-align: center;
	}
	.bid-valida {
		background: rgba(34,197,94,0.1);
		border: 1px solid rgba(34,197,94,0.3);
	}
	.bid-invalida {
		background: rgba(239,68,68,0.1);
		border: 1px solid rgba(239,68,68,0.3);
	}
	.res-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
	.risultato-card h3 {
		font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;
	}
	.bid-valida h3 { color: #86efac; }
	.bid-invalida h3 { color: #fca5a5; }
	.risultato-card p { font-size: 0.82rem; color: rgba(240,240,250,0.6); }
	.perdente-label { margin-top: 0.6rem; color: rgba(240,240,250,0.8) !important; }

	/* Pot info */
	.pot-info {
		display: flex; align-items: center; justify-content: center;
		gap: 0.5rem; margin-top: 1.2rem;
		font-size: 0.78rem; color: rgba(240,240,250,0.4);
	}
	.pot-label { color: rgba(240,240,250,0.35); }
	.pot-val { color: #ffd700; font-weight: 700; font-size: 0.9rem; }
	.dadi-totali { color: rgba(240,240,250,0.3); }

	/* Bottone regole mini */
	.regole-mini-btn {
		display: block; margin: 0.8rem auto 0;
		padding: 0.35rem 0.9rem; border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.08);
		background: transparent; color: rgba(240,240,250,0.3);
		font-size: 0.72rem; cursor: pointer; transition: all 0.15s ease;
	}
	.regole-mini-btn:hover {
		background: rgba(255,255,255,0.06);
		color: rgba(240,240,250,0.6);
	}

	/* Fine */
	.fine-section { display: flex; justify-content: center; }
	.fine-card {
		max-width: 380px; text-align: center;
		padding: 2.5rem 1.8rem;
	}
	.fine-emoji { font-size: 4rem; margin-bottom: 0.5rem; }
	.fine-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2.2rem; letter-spacing: 0.05em;
		color: #ffd700; margin-bottom: 0.6rem;
	}
	.fine-premio {
		font-size: 1rem; color: rgba(240,240,250,0.7);
		margin-bottom: 0.3rem;
	}
	.premio-amt { color: #86efac; font-size: 1.3rem; }
	.fine-hint { font-size: 0.78rem; color: rgba(240,240,250,0.35); margin-bottom: 1.5rem; }
	.fine-sconfitta {
		font-size: 0.9rem; color: rgba(240,240,250,0.4);
		margin-bottom: 1.5rem;
	}
	.fine-actions {
		display: flex; flex-direction: column; gap: 0.6rem;
	}

	/* ── CTA BUTTON ── */
	.cta-btn {
		padding: 0.7rem 1.5rem; border-radius: 12px;
		border: none; background: linear-gradient(135deg, #7c3aed, #4f46e5);
		color: #fff; font-family: 'Outfit', sans-serif;
		font-size: 0.92rem; font-weight: 700;
		cursor: pointer; transition: all 0.2s ease;
		letter-spacing: 0.03em;
	}
	.cta-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(124,58,237,0.4);
	}
	.cta-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	/* ── GHOST BUTTON ── */
	.ghost-btn {
		padding: 0.65rem 1.4rem; border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.12);
		background: transparent; color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif; font-size: 0.85rem;
		cursor: pointer; transition: all 0.18s ease;
	}
	.ghost-btn:hover {
		background: rgba(255,255,255,0.07);
		color: rgba(240,240,250,0.85);
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 480px) {
		main { padding: 0 0.8rem 3rem; }
		.animali-grid { grid-template-columns: repeat(3, 1fr); }
		.mode-buttons { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
		.bid-input-row { gap: 0.6rem; }
		.title-text { font-size: 2rem; }
	}
</style>

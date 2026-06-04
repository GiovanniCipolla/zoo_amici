<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import { getSaldo, addSaldo } from '$lib/economia.js';
	import { unlock } from '$lib/achievements.js';

	// ── Costanti ──────────────────────────────────────────────────────
	const PASSO       = 0.35;  // % per step alternato — molto lento, serve ~285 passi
	const MIN_STEP_MS = 130;   // cooldown minimo tra step (cap ~7.7 step/sec su mobile)
	const TICK        = 55;    // ms per tick AI
	const PREMIO      = 3;     // W per vittoria

	const FRASI_MARTINA = [
		'Fermoooo! {nome}, HAI MOSSO! Fuori immediatamente, che vergogna!',
		'{nome}! Li ho visti quei piedini muoversi! Eliminato subito!',
		'Ahahah {nome}! Pensavi che non guardassi? SBAGLIATO di grosso.',
		'Ma {nome}... stai tremando? Fuori! SUBITO! Non si fa così!',
		'{nome}, con quella faccia credevi di passarla liscia? GIAMMAI!',
		'HO VISTO TUTTO {nome}! TUTTO! Anche quando hai respirato storto!',
		'{nome}! Anche le statue sono più ferme di te! Esci dal campo!',
		'No no no no, {nome}! Questo non è assolutamente accettabile!',
		'{nome}, ti avevo avvertito. Io vedo sempre. SEMPRE. Ciao ciao!',
		'Ridicolo {nome}! Hai mosso pure le orecchie! Fuori!',
		'{nome}... stavi ballando?! Ti sembra il momento?! ELIMINATO!',
		'Oh {nome}! Pensavi che fossi distratta? MAI nella vita. FUORI.',
		'{nome} ma che roba! Nemmeno il vento si muove così tanto! Via!',
		'BECCATO {nome}! Non puoi nasconderti da questi occhi! Fuori!',
		'{nome}, mi dispiace... no aspetta, non mi dispiace per niente!',
		'Ehi {nome}! Dove pensi di andare?! FERMO HO DETTO FERMO!',
		'{nome}... ho contato tre movimenti. TRE. Come ti permetti?!',
		'Povero {nome}! Così non si fa. Torna a casa e allenati meglio!',
		'{nome}!! Grido perché SONO DELUSA. Eliminato immediatamente!',
		'Ma {nome}, sul serio? SUL SERIO?! Neanche ci provi! Via!',
		'{nome}, il mio gatto fa meglio di te e dorme 20 ore al giorno!',
		'FERMOOO dicevo! {nome} ha capito \'corri il più veloce possibile\'!',
		'{nome}... lo sapevo dall\'inizio. Non avevo dubbi. Eliminato.',
		'AH! Ti ho beccato {nome}! Che soddisfazione! Fuori dal campo!',
		'{nome}, questo comportamento non lo tollero. Esci e rifletti!',
		'Hai mosso il naso {nome}! IL NASO! Come si fa?! ELIMINATO!',
		'{nome}!! Più rumoroso di un elefante in cristalleria! Via!',
		'No {nome}, no. No no no. Non va bene per niente. Esci ora.',
		'{nome}... con che coraggio ti muovi sotto i miei occhi?! FUORI!',
		'Avevi una possibilità {nome}. UNA. E l\'hai sprecata miseramente.',
		'{nome}, non c\'è abbastanza delusione per descrivere questo. Esci!',
		'Ti ho visto da lontanissimo {nome}! Avevo quasi speranza in te.',
		'{nome}! Stavi tremando! Non è stare fermi, è un disastro! Via!',
		'Ehm... {nome}? EHMMM?! Ti sembra normale?! ELIMINATO!',
		'{nome}, ogni volta che mi giro ci sei tu a fare il solito errore.',
		'Guarda un po\' {nome}! Credeva di essere invisibile! ELIMINATO!',
		'{nome}... mi fai quasi tenerezza. QUASI. Ma fuori lo stesso!',
		'Oh no {nome}, oh no no. Non hai capito proprio niente! Via!',
		'{nome}! Con quei movimenti pensavi di ingannarmi?! IMPOSSIBILE!',
		'Rido {nome}, rido! Come si fa ad essere così prevedibili?!',
		'{nome}, hai mosso un sopracciglio. Un SOPRACCIGLIO. Inaccettabile.',
		'Adesso basta {nome}! Finisce qui! Stai a casa la prossima volta!',
		'{nome}... mi chiedo come fai anche ad alzarti la mattina. Eliminato!',
		'FERMOOOO! {nome}! Non \'un pochino fermi\', FERMI FERMI! Esci!',
		'{nome}, sul podio delle delusioni sei stabilmente in cima. Fuori!',
		'Non ho parole {nome}. Davvero. Zero parole. Solo: FUORI.',
		'{nome}!! Sembrava che stessi facendo ginnastica lì in mezzo!',
		'Lo vedi {nome}? Lo vedi cosa succede quando non stai fermo? ELIMINATO.',
		'{nome}, hai fallito in modo così spettacolare che quasi mi congratulo.',
		'E così finisce il cammino di {nome}! Che sconfitta memorabile! Arrivederci!'
	];

	function fraseMartina(nome) {
		const f = FRASI_MARTINA[Math.floor(Math.random() * FRASI_MARTINA.length)];
		return f.replace(/\{nome\}/g, nome);
	}

	// ── Stato principale ──────────────────────────────────────────────
	let fase      = $state('menu');   // 'menu' | 'gioco' | 'fine'
	let faseGioco = $state('verde');  // 'verde' | 'countdown' | 'fermi'
	let cdNum     = $state(3);

	let animaleScelta  = $state(null);
	let concorrenti    = $state([]);

	let pieSx          = $state(false);
	let pieDx          = $state(false);
	let ultimoPiede    = $state(null);   // 'sx' | 'dx'
	let playerElim     = $state(false);

	let popup          = $state(null);   // { nome, emoji, frase }
	let saldo          = $state(0);
	let classifica     = $state([]);
	let playerVinto    = $state(false);
	let rulesOpen      = $state(false);

	let cicloNum       = $state(0);     // round corrente (per difficoltà progressiva)
	let trapFlash      = $state(false); // flash rosso bastardatata
	let fermiSuperati  = $state(0);     // fermi sopravvissuti in questa partita
	let trappoleSuperate = $state(0);   // bastardatate superate in questa partita

	let terminato   = false;
	let postoCount  = 0;
	let ultimoStepMs = 0;  // timestamp dell'ultimo step (per cooldown mobile)
	let cicloIsTrap  = false; // il ciclo corrente è una bastardatata?

	// ── Timer refs ────────────────────────────────────────────────────
	let aiInt    = null;
	let cicloT   = null;
	let cdTs     = [];
	let fermiT   = null;
	let fermiETs = [];
	let popupT   = null;
	let terminaT  = null;
	let trapFlashT = null;

	// ── Derived ───────────────────────────────────────────────────────
	const pool = $derived(
		membri.filter(m => !(m.nome === 'Martina' && m.animale === 'Puma'))
	);

	// ── Lifecycle ─────────────────────────────────────────────────────
	onMount(() => {
		if (!browser) return;
		saldo = getSaldo();
		window.addEventListener('keydown', onKD);
		window.addEventListener('keyup',   onKU);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('keydown', onKD);
			window.removeEventListener('keyup',   onKU);
		}
		pulisci();
	});

	function pulisci() {
		clearInterval(aiInt);       aiInt      = null;
		clearTimeout(cicloT);       cicloT     = null;
		clearTimeout(fermiT);       fermiT     = null;
		clearTimeout(popupT);       popupT     = null;
		clearTimeout(terminaT);     terminaT   = null;
		clearTimeout(trapFlashT);   trapFlashT = null;
		cdTs.forEach(clearTimeout);     cdTs     = [];
		fermiETs.forEach(clearTimeout); fermiETs = [];
	}

	// ── Keyboard ──────────────────────────────────────────────────────
	function onKD(e) {
		if (fase !== 'gioco') return;
		const sx = e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A';
		const dx = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
		if (!sx && !dx) return;
		e.preventDefault();
		if (sx && !pieSx) { pieSx = true; onPiede('sx'); }
		if (dx && !pieDx) { pieDx = true; onPiede('dx'); }
	}

	function onKU(e) {
		if (fase !== 'gioco') return;
		const sx = e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A';
		const dx = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
		if (!sx && !dx) return;
		if (sx) pieSx = false;
		if (dx) pieDx = false;
		if (faseGioco === 'fermi' && !playerElim) eliminaPlayer();
	}

	// ── Movimento player ──────────────────────────────────────────────
	function onPiede(piede) {
		if (playerElim) return;
		if (faseGioco !== 'verde' && faseGioco !== 'countdown') return;
		if (ultimoPiede === piede) return; // deve alternare
		const now = Date.now();
		if (now - ultimoStepMs < MIN_STEP_MS) return; // cooldown anti-spam
		ultimoStepMs = now;
		ultimoPiede = piede;
		stepPlayer();
	}

	function stepPlayer() {
		concorrenti = concorrenti.map(c => {
			if (!c.isPlayer) return c;
			const np = Math.min(100, c.pos + PASSO);
			if (np >= 100 && c.posto === null) {
				return { ...c, pos: 100, posto: ++postoCount };
			}
			return { ...c, pos: np };
		});
		checkFine();
	}

	function eliminaPlayer() {
		if (playerElim) return;
		playerElim = true;
		const p = concorrenti.find(c => c.isPlayer);
		if (p) {
			concorrenti = concorrenti.map(c => c.isPlayer ? { ...c, eliminato: true } : c);
			mostraPopup(p.nome, p.emoji, fraseMartina(p.nome), true);
		}
		// termina() viene chiamato quando l'utente chiude il popup
	}

	// ── AI tick ───────────────────────────────────────────────────────
	function tickAI() {
		if (faseGioco !== 'verde' && faseGioco !== 'countdown') return;
		let nuovi = 0;
		const tmp = concorrenti.map(c => {
			if (c.isPlayer || c.eliminato || c.posto !== null) return c;
			const np = Math.min(100, c.pos + c.vel);
			if (np >= 100) {
				nuovi++;
				return { ...c, pos: 100, posto: postoCount + nuovi };
			}
			return { ...c, pos: np };
		});
		postoCount += nuovi;
		concorrenti = tmp;
		checkFine();
	}

	function checkFine() {
		const attivi = concorrenti.filter(c => !c.eliminato && c.posto === null);
		if (attivi.length === 0) termina();
	}

	// ── Ciclo fasi ────────────────────────────────────────────────────
	function avviaCiclo() {
		cicloNum++;

		// ── Durate progressive ──────────────────────────────────────
		// Verde: parte da 2.6s, scende fino a 1.2s — subito tanti countdown
		const durV = Math.max(1200, 2600 - cicloNum * 80) + Math.random() * 500;
		// Fermi: parte da 2s, sale fino a 4.5s
		const durF = Math.min(4500, 2000 + cicloNum * 75) + Math.random() * 400;

		// ── Bastardatata ────────────────────────────────────────────
		// I primi 3 round sono "normali" per insegnare la meccanica.
		// Poi la probabilità di trappola sale fino al 45%.
		const probTrap = cicloNum < 4 ? 0 : Math.min(0.45, (cicloNum - 3) * 0.07);
		const isTrap   = Math.random() < probTrap;
		cicloIsTrap    = isTrap;

		faseGioco = 'verde';

		cicloT = setTimeout(() => {
			faseGioco = 'countdown';
			cdNum = 3;

			if (isTrap) {
				// Bastardatata: il countdown parte ma Martina si gira prima del tempo
				// Stop tra 0.3s (mostrando solo il 3) e 1.8s (arrivando magari al 2)
				const stopMs = 300 + Math.random() * 1500;

				cdTs = [];
				if (stopMs > 1100) {
					// Fa in tempo a mostrare il 2
					cdTs.push(setTimeout(() => (cdNum = 2), 1000));
				}

				cdTs.push(
					setTimeout(() => {
						// Flash rosso trappola
						trapFlash = true;
						clearTimeout(trapFlashT);
						trapFlashT = setTimeout(() => (trapFlash = false), 700);

						faseGioco = 'fermi';
						avviaFermi(durF);
					}, stopMs)
				);
			} else {
				// Countdown normale 3 → 2 → 1
				cdTs = [
					setTimeout(() => (cdNum = 2), 1000),
					setTimeout(() => (cdNum = 1), 2000),
					setTimeout(() => {
						faseGioco = 'fermi';
						avviaFermi(durF);
					}, 3000)
				];
			}
		}, durV);
	}

	// ── Logica fermi (separata per riusarla) ──────────────────────────
	function avviaFermi(durF) {
		// Elimina AI casuali durante il fermi
		// Probabilità aumenta con i round (più round = Martina più attenta)
		const probElimAI = Math.min(0.35, 0.08 + cicloNum * 0.012);
		const cand = concorrenti.filter(c => !c.isPlayer && !c.eliminato && c.posto === null);
		fermiETs = [];
		cand.forEach(c => {
			if (Math.random() < probElimAI) {
				const delay = 300 + Math.random() * Math.max(200, durF - 500);
				fermiETs.push(
					setTimeout(() => {
						if (faseGioco !== 'fermi' || terminato) return;
						concorrenti = concorrenti.map(x =>
							x.id === c.id ? { ...x, eliminato: true } : x
						);
						mostraPopup(c.nome, c.emoji, fraseMartina(c.nome), false);
					}, delay)
				);
			}
		});

		fermiT = setTimeout(() => {
			if (terminato || fase !== 'gioco') return;
			const attivi = concorrenti.filter(x => !x.eliminato && x.posto === null);
			if (attivi.length === 0) { termina(); return; }
			if (!playerElim) {
				// Sopravvissuto a un fermi
				fermiSuperati++;
				if (cicloIsTrap) {
					trappoleSuperate++;
					if (trappoleSuperate >= 5) unlock('martina_bastardatata');
				}
				if (fermiSuperati >= 10) unlock('martina_10_fermi');
				if (fermiSuperati >= 15) unlock('martina_15_fermi');
				avviaCiclo();
			}
		}, durF);
	}

	// ── Popup — pausa il gioco finché l'utente non chiude ────────────
	function mostraPopup(nome, emoji, frase, isPlayer = false) {
		if (popup !== null) return; // già uno popup aperto, ignora
		clearTimeout(popupT);
		popup = { nome, emoji, frase, isPlayer };
		// Ferma TUTTO: AI, ciclo, countdown, fermi, eliminazioni
		clearInterval(aiInt);       aiInt    = null;
		clearTimeout(cicloT);       cicloT   = null;
		cdTs.forEach(clearTimeout); cdTs     = [];
		clearTimeout(fermiT);       fermiT   = null;
		fermiETs.forEach(clearTimeout); fermiETs = [];
		clearTimeout(trapFlashT);   trapFlash = false;
	}

	function chiudiPopup() {
		popup = null;
		if (fase !== 'gioco' || terminato) return;
		if (playerElim) {
			termina();
			return;
		}
		// Riprendi: riavvia AI e inizia nuovo ciclo verde
		if (!aiInt) aiInt = setInterval(tickAI, TICK);
		avviaCiclo();
	}

	// ── Avvio / Fine ──────────────────────────────────────────────────
	function avvia() {
		if (!animaleScelta) return;
		pulisci();
		terminato      = false;
		postoCount     = 0;
		cicloNum       = 0;
		trapFlash      = false;
		playerElim     = false;
		pieSx          = false;
		pieDx          = false;
		ultimoPiede    = null;
		ultimoStepMs   = 0;
		cicloIsTrap    = false;
		popup          = null;
		classifica     = [];
		playerVinto    = false;
		fermiSuperati  = 0;
		trappoleSuperate = 0;
		unlock('martina_debutto');

		const avv = [...pool]
			.filter(m => !(m.nome === animaleScelta.nome && m.animale === animaleScelta.animale))
			.sort(() => Math.random() - 0.5)
			.slice(0, 6);

		concorrenti = [
			{ ...animaleScelta, id: 'player', pos: 0, eliminato: false, isPlayer: true,  vel: 0,                           posto: null },
			...avv.map((a, i) => ({ ...a, id: `ai_${i}`, pos: 0, eliminato: false, isPlayer: false, vel: 0.07 + Math.random() * 0.05, posto: null }))
		].sort(() => Math.random() - 0.5);

		fase = 'gioco';
		aiInt = setInterval(tickAI, TICK);
		avviaCiclo();
	}

	function termina() {
		if (terminato) return;
		terminato = true;
		pulisci();

		let cnt = postoCount;
		const nonFiniti = [...concorrenti]
			.filter(c => !c.eliminato && c.posto === null)
			.sort((a, b) => b.pos - a.pos);
		nonFiniti.forEach(c => { c.posto = ++cnt; });
		postoCount = cnt;

		concorrenti = concorrenti.map(c => {
			const nf = nonFiniti.find(x => x.id === c.id);
			return nf ?? c;
		});

		classifica = [...concorrenti].sort((a, b) => {
			if (a.eliminato !== b.eliminato) return a.eliminato ? 1 : -1;
			if (a.posto !== null && b.posto !== null) return a.posto - b.posto;
			if (a.posto !== null) return -1;
			if (b.posto !== null) return 1;
			return b.pos - a.pos;
		});

		const p = concorrenti.find(c => c.isPlayer);
		playerVinto = !!(p && !p.eliminato && p.posto === 1);
		if (playerVinto) {
			addSaldo(PREMIO, 'martina_vittoria');
			saldo = getSaldo();
			unlock('martina_vittoria');
			// Tutti e 6 gli avversari eliminati?
			const tuttiElim = concorrenti.filter(c => !c.isPlayer).every(c => c.eliminato);
			if (tuttiElim) unlock('martina_tutti_elim');
			// Conta vittorie totali
			const vinte = (parseInt(localStorage.getItem('zoo_martina_vinte') ?? '0', 10) || 0) + 1;
			localStorage.setItem('zoo_martina_vinte', String(vinte));
			if (vinte >= 3) unlock('martina_3_vittorie');
		}

		fase = 'fine';
	}

	function ricomincia() {
		pulisci();
		terminato = false;
		fase      = 'menu';
		popup     = null;
	}

	// ── Touch helpers ────────────────────────────────────────────────
	function touchSxDown(e) { e.preventDefault(); pieSx = true; onPiede('sx'); }
	function touchSxUp(e)   { e.preventDefault(); pieSx = false; if (faseGioco === 'fermi' && !playerElim) eliminaPlayer(); }
	function touchDxDown(e) { e.preventDefault(); pieDx = true; onPiede('dx'); }
	function touchDxUp(e)   { e.preventDefault(); pieDx = false; if (faseGioco === 'fermi' && !playerElim) eliminaPlayer(); }

	function mouseSxDown()  { pieSx = true;  onPiede('sx'); }
	function mouseSxUp()    { pieSx = false; if (faseGioco === 'fermi' && !playerElim) eliminaPlayer(); }
	function mouseSxLeave() { if (pieSx) mouseSxUp(); }
	function mouseDxDown()  { pieDx = true;  onPiede('dx'); }
	function mouseDxUp()    { pieDx = false; if (faseGioco === 'fermi' && !playerElim) eliminaPlayer(); }
	function mouseDxLeave() { if (pieDx) mouseDxUp(); }
</script>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- POPUP — sempre sopra tutto                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
{#if popup}
	<div class="popup-overlay" role="dialog" aria-modal="true">
		<div class="popup-box">
			<div class="popup-martina">🐆</div>
			<div class="popup-target">{popup.emoji}</div>
			<p class="popup-frase">"{popup.frase}"</p>
			<button class="popup-btn" class:btn-player={popup.isPlayer} onclick={chiudiPopup}>
				{popup.isPlayer ? 'ok va bene... 😔' : '▶ Riprendi'}
			</button>
		</div>
	</div>
{/if}

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- WRAPPER                                                           -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="wrap">
	<div class="bg-blobs" aria-hidden="true">
		<div class="blob b1"></div>
		<div class="blob b2"></div>
	</div>

	<!-- ────────────────────────────────────────────────────────── -->
	<!-- MENU                                                        -->
	<!-- ────────────────────────────────────────────────────────── -->
	{#if fase === 'menu'}
		<div class="schermata menu-screen">
			<a href="/minigiochi" class="back-btn">← Minigiochi</a>

			<header class="menu-header">
				<p class="pre-title">Minigioco competitivo · 7 giocatori</p>
				<h1>
					<span class="title-em">🐆</span>
					Non farti vedere<br>da Martina!
				</h1>
				<p class="menu-desc">
					Non farti vedere muovere da Martina altrimenti ti attaccherà e ti sgriderà!
				</p>
			</header>

			<!-- Come si gioca -->
			<div class="rules-card">
				<button class="rules-toggle" onclick={() => (rulesOpen = !rulesOpen)}>
					{rulesOpen ? '▲' : '▼'} Come si gioca
				</button>
				{#if rulesOpen}
					<div class="rules-body">
						<div class="rule-item">
							<span class="rule-icon">🟢</span>
							<div>
								<strong>VIA!</strong> — Premi i tasti SIN e DES in fondo allo schermo, alternandoli: sin, des, sin, des…
							</div>
						</div>
						<div class="rule-item">
							<span class="rule-icon">🟡</span>
							<div>
								<strong>3... 2... 1...</strong> — Martina sta per girarsi! Preparati a fermarti.
							</div>
						</div>
						<div class="rule-item">
							<span class="rule-icon">🔴</span>
							<div>
								<strong>FERMI!</strong> — Tieni premuti ENTRAMBI i tasti contemporaneamente.<br>
								Rilasci uno? Sei eliminato. È come trattenere il respiro.
							</div>
						</div>
						<div class="rule-item">
							<span class="rule-icon">🏆</span>
							<div>
								Raggiungi il traguardo prima degli altri. <strong>Vinci +{PREMIO}W!</strong>
							</div>
						</div>
						<div class="rule-item">
							<span class="rule-icon">💀</span>
							<div>
								Se vieni eliminato, Martina ti dedica un discorso personalizzato.
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Selezione animale -->
			<h2 class="pick-title">Scegli il tuo animale</h2>
			<div class="animali-grid">
				{#each pool as m (m.nome + m.animale)}
					<button
						class="animale-btn"
						class:selezionato={animaleScelta?.nome === m.nome && animaleScelta?.animale === m.animale}
						onclick={() => (animaleScelta = m)}
					>
						<span class="a-em">{m.emoji}</span>
						<span class="a-nm">{m.nome}</span>
					</button>
				{/each}
			</div>

			<button
				class="btn-avvia"
				disabled={!animaleScelta}
				onclick={avvia}
			>
				{animaleScelta ? `Vai con ${animaleScelta.nome}! →` : 'Scegli un animale'}
			</button>
		</div>

	<!-- ────────────────────────────────────────────────────────── -->
	<!-- GIOCO                                                       -->
	<!-- ────────────────────────────────────────────────────────── -->
	{:else if fase === 'gioco'}
		<div class="schermata gioco-screen">

			<!-- Top bar -->
			<div class="top-bar">
				<div class="fase-badge" class:verde={faseGioco === 'verde'} class:countdown={faseGioco === 'countdown'} class:fermi={faseGioco === 'fermi'}>
					{#if faseGioco === 'verde'}
						🟢 VIA! — Corri!
					{:else if faseGioco === 'countdown'}
						🟡 {cdNum}...
					{:else}
						🔴 FERMI!
					{/if}
				</div>
				<div class="top-right">
					<span class="round-badge">
						Giro {cicloNum}{cicloNum >= 15 ? ' 🔥' : cicloNum >= 8 ? ' ⚡' : cicloNum >= 4 ? ' 😬' : ''}
					</span>
					<span class="saldo-mini">💰 {saldo.toFixed(1)}W</span>
				</div>
			</div>

			<!-- Overlay countdown grande -->
			{#if faseGioco === 'countdown'}
				<div class="cd-overlay" aria-live="assertive">
					<div class="cd-numero">{cdNum}</div>
				</div>
			{/if}

			<!-- Flash bastardatata -->
			{#if trapFlash}
				<div class="trap-flash" aria-hidden="true"></div>
			{/if}

			<!-- Road -->
			<div class="road" class:verde={faseGioco === 'verde'} class:countdown-phase={faseGioco === 'countdown'} class:fermi-phase={faseGioco === 'fermi'}>
				<!-- Corsie -->
				<div class="corsie">
					{#each concorrenti as c (c.id)}
						<div
							class="corsia"
							class:dead={c.eliminato}
							class:player-lane={c.isPlayer}
							class:finished={c.posto !== null && !c.eliminato}
						>
							<!-- Personaggio -->
							<div
								class="char"
								style="left: {Math.min(c.pos * 0.87, 87)}%"
							>
								<span class="char-em" class:bounce={!c.eliminato && c.posto === null}>{c.emoji}</span>
								<span class="char-nm" class:player-nm={c.isPlayer}>{c.isPlayer ? '👤 ' + c.nome : c.nome}</span>
							</div>

							<!-- Badge stato -->
							{#if c.eliminato}
								<span class="badge badge-dead">💀</span>
							{:else if c.posto === 1}
								<span class="badge badge-win">🏆 1°!</span>
							{:else if c.posto !== null}
								<span class="badge badge-pos">{c.posto}°</span>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Martina Guardian -->
				<div class="martina-col">
					<div class="guardiana" class:guarda={faseGioco === 'fermi'} class:spalle={faseGioco !== 'fermi'}>
						🐆
					</div>
					<span class="martina-label">Martina</span>
				</div>
			</div>

			<!-- Fermi warning banner -->
			{#if faseGioco === 'fermi' && !playerElim}
				<div class="fermi-banner" class:safe={pieSx && pieDx}>
					{pieSx && pieDx ? '🫁 Fermo! Trattieni il respiro...' : '⚠️ TIENI ENTRAMBI I TASTI!'}
				</div>
			{/if}

			<!-- Controlli -->
			<div class="controls" class:fermi-ctrl={faseGioco === 'fermi'}>
				<!-- Piede sinistro -->
				<button
					type="button"
					class="foot-btn"
					class:pressed={pieSx}
					class:fermi-btn={faseGioco === 'fermi'}
					ontouchstart={touchSxDown}
					ontouchend={touchSxUp}
					ontouchcancel={touchSxUp}
					onmousedown={mouseSxDown}
					onmouseup={mouseSxUp}
					onmouseleave={mouseSxLeave}
					oncontextmenu={(e) => e.preventDefault()}
				>
					<span class="foot-icon">🦶</span>
					<span class="foot-label">SIN</span>
					
				</button>

				<!-- Centro info -->
				<div class="ctrl-mid">
					{#if faseGioco === 'fermi'}
						{#if pieSx && pieDx}
							<span class="mid-ok">✅</span>
						{:else}
							<span class="mid-warn">❗</span>
						{/if}
					{:else if faseGioco === 'countdown'}
						<span class="mid-cd">{cdNum}</span>
					{:else}
						<span class="mid-hint">↔</span>
					{/if}
				</div>

				<!-- Piede destro -->
				<button
					type="button"
					class="foot-btn"
					class:pressed={pieDx}
					class:fermi-btn={faseGioco === 'fermi'}
					ontouchstart={touchDxDown}
					ontouchend={touchDxUp}
					ontouchcancel={touchDxUp}
					onmousedown={mouseDxDown}
					onmouseup={mouseDxUp}
					onmouseleave={mouseDxLeave}
					oncontextmenu={(e) => e.preventDefault()}
				>
					<span class="foot-icon">🦶</span>
					<span class="foot-label">DES</span>
					
				</button>
			</div>
		</div>

	<!-- ────────────────────────────────────────────────────────── -->
	<!-- FINE                                                        -->
	<!-- ────────────────────────────────────────────────────────── -->
	{:else if fase === 'fine'}
		<div class="schermata fine-screen">
			{#if playerVinto}
				<div class="esito vittoria">
					<div class="esito-em">🏆</div>
					<h1 class="esito-titolo">HAI VINTO!</h1>
					<p class="esito-desc">Hai raggiunto il traguardo! Martina è furiosa.</p>
					<div class="premio-badge">+{PREMIO}W incassati!</div>
				</div>
			{:else}
				<div class="esito sconfitta">
					<div class="esito-em">🐆</div>
					<h1 class="esito-titolo">ELIMINATO</h1>
					<p class="esito-desc martina-quote">"Impara."</p>
					<p class="esito-sub">— Martina, Puma</p>
				</div>
			{/if}

			<!-- Classifica finale -->
			<div class="class-finale">
				<h2 class="class-titolo">Classifica finale</h2>
				<div class="class-lista">
					{#each classifica as c, i (c.id)}
						<div
							class="class-row"
							class:player-row={c.isPlayer}
							class:elim-row={c.eliminato}
						>
							<span class="class-pos">
								{#if c.eliminato}
									💀
								{:else if i === 0}
									🥇
								{:else if i === 1}
									🥈
								{:else if i === 2}
									🥉
								{:else}
									{i + 1}°
								{/if}
							</span>
							<span class="class-em">{c.emoji}</span>
							<span class="class-nm">{c.nome}</span>
							{#if c.isPlayer}<span class="tu-badge">TU</span>{/if}
							{#if c.eliminato}<span class="elim-label">eliminato</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="fine-actions">
				<button class="btn-ricomincia" onclick={ricomincia}>Rigioca</button>
				<a href="/minigiochi" class="btn-mini">← Minigiochi</a>
			</div>
		</div>
	{/if}
</div>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- STYLE                                                             -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<style>
	/* ── Reset & base ── */
	:global(body) { overflow-x: hidden; }

	.wrap {
		min-height: 100dvh;
		background: #07070f;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		position: relative;
		overflow: hidden;
	}

	/* ── BG blobs ── */
	.bg-blobs {
		position: fixed; inset: 0;
		pointer-events: none; z-index: 0; overflow: hidden;
	}
	.blob {
		position: absolute; border-radius: 50%;
		filter: blur(100px);
	}
	.b1 {
		width: 500px; height: 500px;
		background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
		top: -150px; left: -120px; opacity: 0.1;
		animation: drift 22s ease-in-out infinite;
	}
	.b2 {
		width: 400px; height: 400px;
		background: radial-gradient(circle, #c87830 0%, transparent 70%);
		bottom: -100px; right: -80px; opacity: 0.1;
		animation: drift 28s ease-in-out infinite reverse;
	}
	@keyframes drift {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33%       { transform: translate(40px, -30px) scale(1.05); }
		66%       { transform: translate(-30px, 40px) scale(0.95); }
	}

	/* ── Schermata ── */
	.schermata {
		position: relative; z-index: 1;
		max-width: 700px; margin: 0 auto;
		padding: 0 1.2rem 2rem;
	}

	/* ══════════════════ MENU ══════════════════ */
	.menu-screen { padding-top: 1rem; }

	.back-btn {
		display: inline-flex; align-items: center; gap: 0.4rem;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.05);
		color: rgba(240,240,250,0.5);
		font-size: 0.78rem; text-decoration: none;
		transition: all 0.18s;
	}
	.back-btn:hover {
		background: rgba(255,255,255,0.1);
		color: rgba(240,240,250,0.9);
	}

	.menu-header { text-align: center; padding: 1.8rem 0.5rem 1rem; }
	.pre-title {
		font-size: 0.68rem; text-transform: uppercase;
		letter-spacing: 0.2em; color: rgba(240,240,250,0.3);
		margin-bottom: 0.6rem;
	}
	.menu-header h1 {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.2rem, 8vw, 4rem);
		line-height: 1.05; color: #fff;
		text-shadow: 0 0 40px rgba(200, 120, 48, 0.5);
	}
	.title-em { font-size: 3rem; display: block; margin-bottom: 0.3rem; animation: wobble 3s ease-in-out infinite; }
	@keyframes wobble {
		0%, 100% { transform: rotate(-5deg) scale(1); }
		50%       { transform: rotate(5deg) scale(1.1); }
	}
	.menu-desc {
		margin-top: 0.8rem;
		font-size: 0.85rem; color: rgba(240,240,250,0.5);
		line-height: 1.6;
	}

	/* Rules */
	.rules-card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 16px; margin-bottom: 1.5rem;
		overflow: hidden;
	}
	.rules-toggle {
		width: 100%; padding: 0.85rem 1.2rem;
		background: none; border: none; color: rgba(240,240,250,0.65);
		font-family: 'Outfit', sans-serif; font-size: 0.85rem;
		cursor: pointer; text-align: left; font-weight: 600;
		transition: color 0.2s;
	}
	.rules-toggle:hover { color: #fff; }
	.rules-body { padding: 0 1.2rem 1.2rem; display: flex; flex-direction: column; gap: 0.75rem; }
	.rule-item {
		display: flex; gap: 0.8rem; align-items: flex-start;
		font-size: 0.82rem; color: rgba(240,240,250,0.7);
		line-height: 1.5;
	}
	.rule-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 0.05rem; }
	.rule-item strong { color: #fff; }

	/* Pick title */
	.pick-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.5rem; letter-spacing: 0.06em;
		color: rgba(240,240,250,0.7); margin-bottom: 0.8rem;
		text-align: center;
	}

	/* Animali grid */
	.animali-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 0.5rem; margin-bottom: 1.5rem;
	}
	.animale-btn {
		display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		padding: 0.65rem 0.3rem;
		background: rgba(255,255,255,0.04);
		border: 1.5px solid rgba(255,255,255,0.08);
		border-radius: 12px; cursor: pointer;
		color: #f0f0fa; font-family: 'Outfit', sans-serif;
		transition: all 0.15s; user-select: none;
	}
	.animale-btn:hover {
		background: rgba(200,120,48,0.1);
		border-color: rgba(200,120,48,0.3);
	}
	.animale-btn.selezionato {
		background: rgba(200,120,48,0.2);
		border-color: #c87830;
		box-shadow: 0 0 16px rgba(200,120,48,0.3);
	}
	.a-em { font-size: 1.6rem; line-height: 1; }
	.a-nm { font-size: 0.62rem; color: rgba(240,240,250,0.6); text-align: center; line-height: 1.2; }

	.btn-avvia {
		width: 100%; padding: 1rem;
		font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 0.06em;
		background: linear-gradient(135deg, #c87830, #a05820);
		border: none; border-radius: 14px; color: #fff;
		cursor: pointer; transition: all 0.2s;
		box-shadow: 0 4px 20px rgba(200,120,48,0.3);
	}
	.btn-avvia:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(200,120,48,0.5);
	}
	.btn-avvia:disabled {
		opacity: 0.35; cursor: not-allowed;
		background: rgba(255,255,255,0.08);
	}

	/* ══════════════════ GIOCO ══════════════════ */
	.gioco-screen {
		max-width: none;
		padding: 0;
		display: flex; flex-direction: column;
		height: 100dvh;
	}

	/* Top bar */
	.top-bar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.6rem 1rem;
		background: rgba(0,0,0,0.4);
		border-bottom: 1px solid rgba(255,255,255,0.06);
		flex-shrink: 0;
		position: relative; z-index: 5;
	}
	.fase-badge {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.1rem; letter-spacing: 0.06em;
		padding: 0.3rem 0.8rem; border-radius: 999px;
		transition: all 0.25s;
	}
	.fase-badge.verde    { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
	.fase-badge.countdown { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); animation: cd-pulse 0.9s ease-in-out infinite; }
	.fase-badge.fermi    { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); animation: fermi-blink 0.4s ease-in-out infinite; }
	@keyframes cd-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
	@keyframes fermi-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.7; box-shadow: 0 0 20px rgba(239,68,68,0.6); } }

	.top-right {
		display: flex; align-items: center; gap: 0.7rem;
	}
	.round-badge {
		font-size: 0.72rem; color: rgba(240,240,250,0.35);
		font-weight: 700; letter-spacing: 0.05em;
	}
	.saldo-mini {
		font-size: 0.78rem; color: rgba(240,240,250,0.4);
		font-weight: 600;
	}

	/* Flash bastardatata */
	.trap-flash {
		position: fixed; inset: 0; z-index: 25;
		background: rgba(239, 68, 68, 0.35);
		pointer-events: none;
		animation: trap-in 0.7s ease-out forwards;
	}
	@keyframes trap-in {
		0%   { opacity: 1; }
		40%  { opacity: 0.8; }
		100% { opacity: 0; }
	}

	/* Countdown overlay */
	.cd-overlay {
		position: fixed; inset: 0; z-index: 20;
		display: flex; align-items: center; justify-content: center;
		pointer-events: none;
	}
	.cd-numero {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(8rem, 30vw, 14rem);
		color: #fbbf24;
		text-shadow: 0 0 60px rgba(245,158,11,0.8), 0 0 120px rgba(245,158,11,0.4);
		animation: pop 0.15s ease-out;
		line-height: 1;
	}
	@keyframes pop {
		from { transform: scale(1.4); opacity: 0.7; }
		to   { transform: scale(1); opacity: 1; }
	}

	/* Road */
	.road {
		flex: 1;
		display: flex;
		overflow: hidden;
		transition: box-shadow 0.3s;
		position: relative;
	}
	.road.verde        { box-shadow: inset 0 0 30px rgba(34,197,94,0.06); }
	.road.countdown-phase { box-shadow: inset 0 0 30px rgba(245,158,11,0.08); }
	.road.fermi-phase  {
		box-shadow: inset 0 0 40px rgba(239,68,68,0.12);
		animation: fermi-road 0.5s ease-in-out infinite alternate;
	}
	@keyframes fermi-road {
		from { box-shadow: inset 0 0 30px rgba(239,68,68,0.08); }
		to   { box-shadow: inset 0 0 60px rgba(239,68,68,0.18); }
	}

	/* Corsie */
	.corsie {
		flex: 1; display: flex; flex-direction: column;
		padding: 0.3rem 0;
	}

	.corsia {
		flex: 1;
		position: relative;
		display: flex; align-items: center;
		border-bottom: 1px solid rgba(255,255,255,0.04);
		min-height: 44px;
		padding: 0 0.4rem;
		transition: background 0.2s;
		overflow: hidden;
	}
	.corsia:last-child { border-bottom: none; }
	.corsia.player-lane {
		background: rgba(200,120,48,0.06);
		border-bottom-color: rgba(200,120,48,0.1);
	}
	.corsia.dead {
		background: rgba(239,68,68,0.04);
		opacity: 0.6;
	}
	.corsia.finished {
		background: rgba(34,197,94,0.05);
	}

	/* Personaggio */
	.char {
		position: absolute;
		display: flex; flex-direction: column; align-items: center;
		gap: 1px;
		transition: left 0.08s linear;
		pointer-events: none;
	}
	.char-em {
		font-size: 1.4rem; line-height: 1;
		display: block;
	}
	.char-em.bounce { animation: bob 0.8s ease-in-out infinite; }
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50%       { transform: translateY(-3px); }
	}
	.char-nm {
		font-size: 0.52rem;
		color: rgba(240,240,250,0.45);
		white-space: nowrap;
		line-height: 1;
	}
	.player-nm { color: #fbbf24; font-weight: 700; }

	/* Badge */
	.badge {
		position: absolute; right: 0.4rem;
		font-size: 0.7rem; font-weight: 700;
		white-space: nowrap;
	}
	.badge-dead  { color: rgba(239,68,68,0.6); }
	.badge-win   { color: #fbbf24; font-size: 0.8rem; }
	.badge-pos   { color: rgba(240,240,250,0.4); }

	/* Martina column */
	.martina-col {
		width: 56px; flex-shrink: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: rgba(200,120,48,0.08);
		border-left: 2px solid rgba(200,120,48,0.25);
		gap: 0.3rem;
		position: relative;
	}
	.guardiana {
		font-size: 2.4rem; line-height: 1;
		transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
		display: block; text-align: center;
	}
	.guardiana.spalle { transform: scaleX(1); }
	.guardiana.guarda {
		transform: scaleX(-1);
		animation: martina-angry 0.5s ease-in-out;
		filter: drop-shadow(0 0 8px rgba(239,68,68,0.6));
	}
	@keyframes martina-angry {
		0%   { transform: scaleX(-1) scale(1); }
		40%  { transform: scaleX(-1) scale(1.35); }
		100% { transform: scaleX(-1) scale(1); }
	}
	.martina-label {
		font-size: 0.5rem; color: rgba(200,120,48,0.6);
		text-transform: uppercase; letter-spacing: 0.1em;
		writing-mode: vertical-rl; text-orientation: mixed;
	}

	/* Fermi banner */
	.fermi-banner {
		flex-shrink: 0;
		text-align: center;
		padding: 0.4rem 1rem;
		font-size: 0.8rem; font-weight: 700;
		background: rgba(239,68,68,0.15);
		color: #f87171;
		border-top: 1px solid rgba(239,68,68,0.2);
		letter-spacing: 0.04em;
		animation: blink-warn 0.5s ease-in-out infinite;
		transition: background 0.2s, color 0.2s;
	}
	.fermi-banner.safe {
		background: rgba(34,197,94,0.12);
		color: #4ade80;
		animation: none;
	}
	@keyframes blink-warn {
		0%,100% { opacity: 1; }
		50%      { opacity: 0.6; }
	}

	/* Controls */
	.controls {
		flex-shrink: 0;
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.5rem 0.8rem;
		background: rgba(0,0,0,0.5);
		border-top: 1px solid rgba(255,255,255,0.06);
	}

	.foot-btn {
		flex: 1;
		display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
		padding: 0.7rem 0.5rem;
		background: rgba(255,255,255,0.07);
		border: 2px solid rgba(255,255,255,0.12);
		border-radius: 14px; cursor: pointer;
		color: #f0f0fa; font-family: 'Outfit', sans-serif;
		transition: all 0.08s;
		user-select: none; touch-action: none;
		-webkit-tap-highlight-color: transparent;
	}
	.foot-btn:active, .foot-btn.pressed {
		background: rgba(200,120,48,0.3);
		border-color: #c87830;
		transform: scale(0.96);
		box-shadow: 0 0 16px rgba(200,120,48,0.4);
	}
	.foot-btn.fermi-btn {
		border-color: rgba(239,68,68,0.4);
	}
	.foot-btn.fermi-btn.pressed {
		background: rgba(34,197,94,0.25);
		border-color: #4ade80;
		box-shadow: 0 0 16px rgba(34,197,94,0.4);
	}
	.foot-icon  { font-size: 1.6rem; line-height: 1; }
	.foot-label { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 0.05em; }

	/* Ctrl mid */
	.ctrl-mid {
		width: 52px; flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
	}
	.mid-ok   { font-size: 1.8rem; }
	.mid-warn { font-size: 1.8rem; animation: shake 0.3s ease-in-out infinite; }
	@keyframes shake {
		0%,100% { transform: translateX(0); }
		25%      { transform: translateX(-3px); }
		75%      { transform: translateX(3px); }
	}
	.mid-cd   { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #fbbf24; }
	.mid-hint { font-size: 1.4rem; color: rgba(240,240,250,0.3); }

	/* ══════════════════ POPUP ══════════════════ */
	.popup-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: rgba(0,0,0,0.75);
		display: flex; align-items: center; justify-content: center;
		padding: 1.5rem;
		animation: fade-in 0.2s ease;
	}
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	.popup-box {
		background: #12121e;
		border: 2px solid rgba(239,68,68,0.4);
		border-radius: 20px;
		padding: 2rem 1.5rem 1.5rem;
		max-width: 380px; width: 100%;
		text-align: center;
		box-shadow: 0 20px 60px rgba(239,68,68,0.2);
		animation: pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
	}
	@keyframes pop-in {
		from { transform: scale(0.5) translateY(40px); opacity: 0; }
		to   { transform: scale(1) translateY(0); opacity: 1; }
	}
	.popup-martina {
		font-size: 3.5rem; line-height: 1;
		animation: angry-bob 0.4s ease-in-out infinite alternate;
	}
	@keyframes angry-bob {
		from { transform: rotate(-10deg) scale(1); }
		to   { transform: rotate(10deg) scale(1.1); }
	}
	.popup-target {
		font-size: 2.5rem; margin: 0.5rem 0;
	}
	.popup-frase {
		font-size: 0.88rem; color: rgba(240,240,250,0.85);
		line-height: 1.6; margin: 0.8rem 0 1.2rem;
		font-style: italic;
	}
	.popup-btn {
		padding: 0.55rem 1.5rem;
		background: rgba(239,68,68,0.15);
		border: 1px solid rgba(239,68,68,0.3);
		border-radius: 999px; color: #f87171;
		font-family: 'Outfit', sans-serif; font-size: 0.8rem;
		cursor: pointer; transition: all 0.2s;
	}
	.popup-btn:hover {
		background: rgba(239,68,68,0.25);
	}
	.popup-btn:not(.btn-player) {
		background: rgba(34,197,94,0.12);
		border-color: rgba(34,197,94,0.3);
		color: #4ade80;
	}
	.popup-btn:not(.btn-player):hover {
		background: rgba(34,197,94,0.22);
	}

	/* ══════════════════ FINE ══════════════════ */
	.fine-screen {
		max-width: 500px;
		padding-top: 2rem;
	}

	.esito {
		text-align: center; padding: 2rem 1rem;
		border-radius: 20px; margin-bottom: 1.5rem;
	}
	.esito.vittoria {
		background: rgba(34,197,94,0.06);
		border: 1px solid rgba(34,197,94,0.2);
	}
	.esito.sconfitta {
		background: rgba(239,68,68,0.06);
		border: 1px solid rgba(239,68,68,0.2);
	}
	.esito-em { font-size: 3.5rem; line-height: 1; margin-bottom: 0.5rem; }
	.esito-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2rem, 8vw, 3.5rem); letter-spacing: 0.05em;
	}
	.vittoria .esito-titolo { color: #4ade80; text-shadow: 0 0 30px rgba(34,197,94,0.5); }
	.sconfitta .esito-titolo { color: #f87171; text-shadow: 0 0 30px rgba(239,68,68,0.5); }
	.esito-desc { font-size: 0.85rem; color: rgba(240,240,250,0.5); margin-top: 0.4rem; }
	.martina-quote { font-style: italic; font-size: 1.1rem; color: rgba(240,240,250,0.7); }
	.esito-sub { font-size: 0.72rem; color: rgba(240,240,250,0.3); margin-top: 0.2rem; }
	.premio-badge {
		display: inline-block; margin-top: 0.8rem;
		background: rgba(34,197,94,0.15);
		border: 1px solid rgba(34,197,94,0.3);
		border-radius: 999px; padding: 0.35rem 1rem;
		font-size: 0.85rem; color: #4ade80; font-weight: 700;
	}

	/* Classifica finale */
	.class-finale {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 16px; padding: 1.2rem;
		margin-bottom: 1.5rem;
	}
	.class-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem; letter-spacing: 0.06em;
		color: rgba(240,240,250,0.5); margin-bottom: 0.8rem;
		text-align: center;
	}
	.class-lista { display: flex; flex-direction: column; gap: 0.4rem; }
	.class-row {
		display: flex; align-items: center; gap: 0.6rem;
		padding: 0.45rem 0.6rem; border-radius: 10px;
		background: rgba(255,255,255,0.03);
		font-size: 0.82rem;
	}
	.class-row.player-row {
		background: rgba(200,120,48,0.1);
		border: 1px solid rgba(200,120,48,0.2);
	}
	.class-row.elim-row { opacity: 0.5; }
	.class-pos { width: 28px; text-align: center; font-size: 0.9rem; flex-shrink: 0; }
	.class-em  { font-size: 1.2rem; flex-shrink: 0; }
	.class-nm  { flex: 1; color: rgba(240,240,250,0.8); }
	.tu-badge  {
		font-size: 0.6rem; font-weight: 700;
		background: rgba(200,120,48,0.3); color: #c87830;
		border-radius: 4px; padding: 0.1em 0.4em;
	}
	.elim-label {
		font-size: 0.6rem; color: rgba(239,68,68,0.5);
	}

	/* Fine actions */
	.fine-actions {
		display: flex; gap: 0.8rem; align-items: center;
	}
	.btn-ricomincia {
		flex: 1; padding: 0.85rem;
		font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.06em;
		background: linear-gradient(135deg, #c87830, #a05820);
		border: none; border-radius: 12px; color: #fff;
		cursor: pointer; transition: all 0.2s;
	}
	.btn-ricomincia:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,120,48,0.4); }
	.btn-mini {
		padding: 0.85rem 1.2rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 12px; color: rgba(240,240,250,0.5);
		text-decoration: none; font-size: 0.8rem;
		transition: all 0.2s;
	}
	.btn-mini:hover { background: rgba(255,255,255,0.09); color: #fff; }

	/* ══════════════════ RESPONSIVE ══════════════════ */
	@media (max-width: 480px) {
		.animali-grid { grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 0.4rem; }
		.a-em  { font-size: 1.4rem; }
		.a-nm  { font-size: 0.55rem; }
		.char-em { font-size: 1.2rem; }
		.char-nm { font-size: 0.45rem; }
		.martina-col { width: 44px; }
		.guardiana { font-size: 1.8rem; }
		.foot-icon { font-size: 1.3rem; }
		.ctrl-mid { width: 40px; }
		.cd-numero { font-size: clamp(6rem, 28vw, 10rem); }
	}
</style>

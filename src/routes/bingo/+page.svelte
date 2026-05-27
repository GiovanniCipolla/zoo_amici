<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { unlock } from '$lib/achievements.js';

	const ANIMALI = membri.map((m, i) => ({ ...m, id: i }));
	const MAX_CARTELLE = 5;
	const JACKPOT_IMPORTO = 500;
	const JACKPOT_PROB = 0.05;
	const INTERVALLO = 2600;
	const PREZZI = [0.10, 0.25, 0.50, 1, 2, 5, 10, 25, 50];

	function prezzoRandom(escludi = null) {
		const lista = escludi !== null ? PREZZI.filter((p) => p !== escludi) : PREZZI;
		return lista[Math.floor(Math.random() * lista.length)];
	}

	let fase = $state('setup');
	let cartelle = $state([]);
	let tavolo = $state([]);
	let sacchetto = $state([]);
	let estratti = $state([]);
	let ultimo = $state(null);
	let vincitore = $state(null);
	let premio = $state(0);
	let jackpot = $state(false);
	let costoCartella = $state(prezzoRandom());
	let saldo = $state(0);
	let timerHandle = null;

	const scommessa = $derived(cartelle.length * costoCartella);

	// Totale cartelle in gioco (esatto durante partita, stima in setup)
	const totCartelle = $derived(
		tavolo.length > 0
			? cartelle.length + tavolo.reduce((s, e) => s + e.cartelle.length, 0)
			: cartelle.length
	);
	const totPot = $derived(totCartelle * costoCartella);

	// Stima range per setup (animali comprano 1–3 cartelle ciascuno)
	const stimaMin = $derived(cartelle.length + 32);
	const stimaMax = $derived(cartelle.length + 96);

	function shuffle(arr) {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function nuovaCartella() {
		return shuffle(ANIMALI)
			.slice(0, 5)
			.map((a) => ({ ...a, marcata: false }));
	}

	function compra() {
		if (cartelle.length >= MAX_CARTELLE) return;
		if (!spendSaldo(costoCartella)) return;
		saldo = getSaldo();
		cartelle = [...cartelle, nuovaCartella()];
	}

	function rimuovi(i) {
		addSaldo(costoCartella);
		saldo = getSaldo();
		cartelle = cartelle.filter((_, idx) => idx !== i);
	}

	function saltaPrezzo() {
		if (cartelle.length > 0) {
			addSaldo(cartelle.length * costoCartella);
			cartelle = [];
			saldo = getSaldo();
		}
		costoCartella = prezzoRandom(costoCartella);
	}

	function inizia() {
		if (cartelle.length === 0) return;

		tavolo = ANIMALI.map((animale) => {
			const n = 1 + Math.floor(Math.random() * 3);
			const tCartelle = Array.from({ length: n }, () =>
				shuffle(ANIMALI)
					.slice(0, 5)
					.map((a) => ({ ...a, marcata: false }))
			);
			return { animale, cartelle: tCartelle, prog: 0, vinto: false, reaz: '' };
		});

		sacchetto = shuffle(ANIMALI);
		estratti = [];
		ultimo = null;
		vincitore = null;
		premio = 0;
		jackpot = Math.random() < JACKPOT_PROB;
		fase = 'gioco';

		unlock('bingo_debutto');
		if (cartelle.length === MAX_CARTELLE) unlock('bingo_full_house');

		timerHandle = setTimeout(estrai, 1000);
	}

	function estrai() {
		if (sacchetto.length === 0) return;

		const [pescato, ...resto] = sacchetto;
		sacchetto = resto;
		ultimo = pescato;
		estratti = [pescato, ...estratti];

		// Marca cartelle giocatore
		let giocatoreVince = false;
		cartelle = cartelle.map((cartella) => {
			const nuova = cartella.map((slot) =>
				slot.id === pescato.id ? { ...slot, marcata: true } : slot
			);
			if (nuova.every((s) => s.marcata)) giocatoreVince = true;
			return nuova;
		});

		// Marca cartelle al tavolo
		let animaleVince = null;
		tavolo = tavolo.map((entry) => {
			if (entry.vinto) return entry;
			const tCartelle = entry.cartelle.map((c) =>
				c.map((slot) => (slot.id === pescato.id ? { ...slot, marcata: true } : slot))
			);
			const prog = Math.max(...tCartelle.map((c) => c.filter((s) => s.marcata).length));
			const vinto = tCartelle.some((c) => c.every((s) => s.marcata));
			if (vinto && !animaleVince) animaleVince = entry.animale;
			const reaz = vinto ? 'vinto' : prog >= 4 ? 'vicino' : '';
			return { ...entry, cartelle: tCartelle, prog, vinto, reaz };
		});

		if (giocatoreVince) {
			fine('giocatore');
			return;
		}
		if (animaleVince) {
			fine(animaleVince.nome);
			return;
		}

		if (sacchetto.length > 0) {
			timerHandle = setTimeout(estrai, INTERVALLO);
		}
	}

	function fine(chi) {
		if (timerHandle) clearTimeout(timerHandle);
		vincitore = chi;
		if (chi === 'giocatore') {
			premio = jackpot ? JACKPOT_IMPORTO : Math.round(totPot * 100) / 100;
			addSaldo(premio);
			saldo = getSaldo();
			unlock('bingo_vittoria');
			if (jackpot) unlock('bingo_jackpot');
			if (costoCartella >= 10) unlock('bingo_caro');
		}
		fase = 'fine';
	}

	function reset() {
		if (timerHandle) clearTimeout(timerHandle);
		cartelle = [];
		tavolo = [];
		sacchetto = [];
		estratti = [];
		ultimo = null;
		vincitore = null;
		premio = 0;
		jackpot = false;
		costoCartella = prezzoRandom();
		fase = 'setup';
		saldo = getSaldo();
	}

	onMount(() => {
		if (browser) saldo = getSaldo();
	});

	onDestroy(() => {
		if (timerHandle) clearTimeout(timerHandle);
	});
</script>

<!-- BG BLOBS -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<div class="back-wrap">
	<a href="/minigiochi" class="back-btn">← Minigiochi</a>
</div>

<main>
	<!-- ── SETUP ─────────────────────────────────────────────────────── -->
	{#if fase === 'setup'}
		<header>
			<p class="pre-title">Minigiochi</p>
			<h1>
				<span class="title-icon">🎱</span>
				<span class="title-text">Bingo a Pescara</span>
			</h1>
			<p class="subtitle">Sfida tutti e 32 gli animali del zoo · primo che fa bingo vince</p>
		</header>

		<div class="info-row">
			<span class="pill-info">Saldo: <strong>€{saldo.toFixed(2)}</strong></span>
			<span class="pill-info">max {MAX_CARTELLE} cartelle</span>
		</div>

		<!-- Prezzo della partita -->
		{#key costoCartella}
			<div class="prezzo-card">
				<p class="prezzo-label">In questa partita una cartella costa</p>
				<p class="prezzo-importo">€{costoCartella.toFixed(2)}</p>
				<p class="prezzo-sub">Chi fa bingo vince l'intero pot · jackpot 5%</p>
			</div>
		{/key}

		<!-- Stima pot a questo prezzo -->
		<div class="stima-box">
			<div class="stima-riga">
				<span class="stima-label">Cartelle totali stimate</span>
				<span class="stima-val">{stimaMin} – {stimaMax}</span>
			</div>
			<div class="stima-riga">
				<span class="stima-label">Pot stimato</span>
				<span class="stima-val stima-pot">
					€{(stimaMin * costoCartella).toFixed(2)} – €{(stimaMax * costoCartella).toFixed(2)}
				</span>
			</div>
			<div class="stima-riga stima-jackpot-riga">
				<span class="stima-label">🎰 Jackpot (5% di probabilità)</span>
				<span class="stima-val stima-jackpot">€{JACKPOT_IMPORTO}</span>
			</div>
			<p class="stima-nota">Ogni animale compra 1–3 cartelle · il vincitore prende tutto</p>
		</div>

		<!-- Azioni -->
		<div class="azioni-setup">
			<button
				class="btn-compra"
				onclick={compra}
				disabled={cartelle.length >= MAX_CARTELLE || saldo < costoCartella}
			>
				{#if cartelle.length >= MAX_CARTELLE}
					Massimo {MAX_CARTELLE} cartelle
				{:else}
					+ Cartella €{costoCartella.toFixed(2)}
				{/if}
			</button>
			<button class="btn-salta" onclick={saltaPrezzo}>
				Prossima partita →
			</button>
		</div>

		<!-- Cartelle comprate -->
		{#if cartelle.length > 0}
			<div class="pot-info">
				<span class="pot-item">Puntata: <strong>€{scommessa.toFixed(2)}</strong></span>
				<span class="pot-sep">·</span>
				<span class="pot-item pot-range">{cartelle.length} cartell{cartelle.length === 1 ? 'a' : 'e'}</span>
			</div>

			<div class="cartelle-setup">
				{#each cartelle as cartella, i}
					<div class="cartella-preview">
						<div class="cartella-slots-preview">
							{#each cartella as slot}
								<div class="slot-prev">
									<span class="slot-emoji-prev">{slot.emoji}</span>
									<span class="slot-nome-prev">{slot.nome}</span>
								</div>
							{/each}
						</div>
						<button class="btn-rimuovi" onclick={() => rimuovi(i)} title="Rimuovi cartella">×</button>
					</div>
				{/each}
			</div>

			<button class="btn-inizia" onclick={inizia}>Inizia partita →</button>
		{/if}
	{/if}

	<!-- ── GIOCO / FINE ───────────────────────────────────────────────── -->
	{#if fase === 'gioco' || fase === 'fine'}
		<!-- Overlay fine partita -->
		{#if fase === 'fine'}
			<div class="fine-overlay">
				<div class="fine-card">
					{#if vincitore === 'giocatore'}
						{#if jackpot}
							<p class="fine-icon">🎰</p>
							<h2 class="fine-titolo jackpot">JACKPOT!</h2>
							<p class="fine-sub">Hai fatto bingo sulla partita jackpot</p>
						{:else}
							<p class="fine-icon">🎉</p>
							<h2 class="fine-titolo win">BINGO!</h2>
							<p class="fine-sub">Hai vinto l'intero pot</p>
						{/if}
						<p class="fine-premio {jackpot ? 'jackpot-premio' : ''}">+€{premio.toFixed(2)}</p>
					{:else}
						<p class="fine-icon">😢</p>
						<h2 class="fine-titolo lose">Bingo di {vincitore}</h2>
						<p class="fine-sub">Ha vinto il pot · tu hai perso la puntata</p>
						<p class="fine-perso">-€{scommessa.toFixed(2)}</p>
					{/if}
					<p class="fine-saldo">Saldo attuale: €{saldo.toFixed(2)}</p>
					<button class="btn-reset" onclick={reset}>Nuova partita</button>
				</div>
			</div>
		{/if}

		<!-- Jackpot banner -->
		{#if jackpot}
			<div class="jackpot-banner">
				<span class="jk-icon">🎰</span>
				<span class="jk-testo">JACKPOT ATTIVO</span>
				<span class="jk-importo">€{JACKPOT_IMPORTO}</span>
				<span class="jk-icon">🎰</span>
			</div>
		{/if}

		<!-- Statistiche partita -->
		<div class="stats-bar {jackpot ? 'stats-jackpot' : ''}">
			<div class="stat-item">
				<span class="stat-label">Cartelle vendute</span>
				<span class="stat-val">{totCartelle}</span>
			</div>
			<div class="stat-sep"></div>
			<div class="stat-item">
				<span class="stat-label">Tue cartelle</span>
				<span class="stat-val">{cartelle.length}</span>
			</div>
			<div class="stat-sep"></div>
			<div class="stat-item">
				<span class="stat-label">Pot totale</span>
				<span class="stat-val stat-pot">€{totPot.toFixed(2)}</span>
			</div>
			<div class="stat-sep"></div>
			<div class="stat-item">
				<span class="stat-label">{jackpot ? '🎰 Premio jackpot' : 'Premio se vinci'}</span>
				<span class="stat-val {jackpot ? 'stat-jackpot' : 'stat-premio'}">
					{jackpot ? `€${JACKPOT_IMPORTO}` : `€${totPot.toFixed(2)}`}
				</span>
			</div>
		</div>

		<!-- Estrazione -->
		<div class="estrazione-area">
			<p class="contatore">{estratti.length}/32 estratti</p>
			{#key ultimo}
				{#if ultimo}
					<div class="ultimo-box">
						<span class="ultimo-emoji">{ultimo.emoji}</span>
						<p class="ultimo-nome">{ultimo.nome}</p>
						<p class="ultimo-animale">{ultimo.animale}</p>
					</div>
				{:else}
					<div class="ultimo-placeholder">
						<span class="wait-icon">⏳</span>
						<p>Prossima estrazione...</p>
					</div>
				{/if}
			{/key}
		</div>

		<!-- Cartelle giocatore -->
		<div class="sezione-cartelle">
			<h3 class="sezione-titolo">Le tue cartelle</h3>
			<div class="cartelle-gioco-wrap">
				{#each cartelle as cartella, ci}
					<div class="cartella-gioco {cartella.every((s) => s.marcata) ? 'bingo' : ''}">
						<p class="cartella-num">#{ci + 1}</p>
						{#each cartella as slot}
							<div class="slot-gioco {slot.marcata ? 'marcato' : ''}">
								<span class="slot-g-emoji">{slot.emoji}</span>
								<span class="slot-g-nome">{slot.nome}</span>
								{#if slot.marcata}<span class="slot-check">✓</span>{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Tavolo 32 animali -->
		<div class="sezione-tavolo">
			<h3 class="sezione-titolo">
				Tavolo
				<span class="tavolo-stats">
					{tavolo.filter((e) => e.vinto).length} bingo · {estratti.length}/32 estratti
				</span>
			</h3>
			<div class="tavolo-grid">
				{#each tavolo as entry}
					<div class="tavolo-cella {entry.reaz}">
						<span class="t-emoji">{entry.animale.emoji}</span>
						<span class="t-nome">{entry.animale.nome}</span>
						<div class="t-dots">
							{#each Array(5).fill(null) as _, d}
								<span class="dot {d < entry.prog ? 'pieno' : ''}"></span>
							{/each}
						</div>
						{#if entry.vinto}<span class="t-crown">👑</span>{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Estratti scrollabili -->
		<div class="sezione-estratti">
			<h3 class="sezione-titolo">Estratti in ordine</h3>
			<div class="estratti-wrap">
				{#each estratti as e}
					<span
						class="pill-e"
						style="background:{e.colore}22; border-color:{e.colore}55; color:{e.colore}"
					>
						{e.emoji} {e.nome}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</main>

<style>
	/* ── BG BLOBS ── */
	.bg-blobs {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(90px);
	}

	.blob-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #6d28d9 0%, transparent 70%);
		top: -120px;
		left: -80px;
		opacity: 0.15;
		animation: drift 20s ease-in-out infinite;
	}

	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #1d4ed8 0%, transparent 70%);
		bottom: -80px;
		right: -60px;
		opacity: 0.12;
		animation: drift 26s ease-in-out infinite reverse;
	}

	.blob-3 {
		width: 260px;
		height: 260px;
		background: radial-gradient(circle, #d97706 0%, transparent 70%);
		top: 40%;
		left: 60%;
		opacity: 0.1;
		animation: drift 30s ease-in-out infinite 8s;
	}

	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(40px, -30px) scale(1.06);
		}
		66% {
			transform: translate(-25px, 40px) scale(0.95);
		}
	}

	/* ── BACK ── */
	.back-wrap {
		position: relative;
		z-index: 10;
		padding: 1rem 1.5rem 0;
		max-width: 960px;
		margin: 0 auto;
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(240, 240, 250, 0.5);
		font-family: 'Outfit', sans-serif;
		font-size: 0.78rem;
		text-decoration: none;
		transition: all 0.18s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(240, 240, 250, 0.9);
		border-color: rgba(255, 255, 255, 0.2);
	}

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		max-width: 960px;
		margin: 0 auto;
		padding: 0 1.5rem 6rem;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 2.5rem 1rem 2rem;
		animation: fade-down 0.55s ease both;
	}

	.pre-title {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: rgba(240, 240, 250, 0.32);
		margin-bottom: 0.7rem;
		font-weight: 600;
	}

	h1 {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		line-height: 1;
	}

	.title-icon {
		font-size: clamp(2rem, 5vw, 3.5rem);
		display: inline-block;
		animation: rock 4s ease-in-out infinite;
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.4rem, 7vw, 5rem);
		letter-spacing: 0.04em;
		color: #fff;
	}

	.subtitle {
		margin-top: 0.8rem;
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.36);
	}

	@keyframes fade-down {
		from {
			opacity: 0;
			transform: translateY(-16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes rock {
		0%,
		100% {
			transform: rotate(-5deg) scale(1);
		}
		50% {
			transform: rotate(6deg) scale(1.08);
		}
	}

	/* ── INFO ROW ── */
	.info-row {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.pill-info {
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 0.8rem;
		color: rgba(240, 240, 250, 0.65);
	}

	.pill-info strong {
		color: #fff;
	}

	/* ── CARTELLE SETUP ── */
	.cartelle-setup {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.no-cartelle {
		text-align: center;
		color: rgba(240, 240, 250, 0.3);
		font-size: 0.82rem;
		padding: 1.5rem 0;
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 14px;
	}

	.cartella-preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 14px;
		padding: 0.75rem 1rem;
		animation: fade-down 0.3s ease both;
	}

	.cartella-slots-preview {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.slot-prev {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 8px;
		padding: 0.3rem 0.55rem;
	}

	.slot-emoji-prev {
		font-size: 1.1rem;
	}

	.slot-nome-prev {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.7);
		max-width: 56px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-rimuovi {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(255, 80, 80, 0.3);
		background: rgba(255, 80, 80, 0.08);
		color: rgba(255, 100, 100, 0.7);
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.18s ease;
		line-height: 1;
	}

	.btn-rimuovi:hover {
		background: rgba(255, 80, 80, 0.2);
		color: #ff6666;
		border-color: rgba(255, 80, 80, 0.6);
	}

	/* ── AZIONI SETUP ── */
	.azioni-setup {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}

	.btn-salta {
		padding: 0.75rem 1.6rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(240, 240, 250, 0.5);
		font-family: 'Outfit', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-salta:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.22);
		color: rgba(240, 240, 250, 0.85);
		transform: translateY(-2px);
	}

	.btn-compra {
		padding: 0.75rem 2rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 215, 0, 0.3);
		background: rgba(255, 215, 0, 0.08);
		color: rgba(255, 215, 0, 0.85);
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-compra:hover:not(:disabled) {
		background: rgba(255, 215, 0, 0.16);
		border-color: rgba(255, 215, 0, 0.6);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(255, 215, 0, 0.15);
	}

	.btn-compra:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ── POT INFO ── */
	.pot-info {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.55);
	}

	.pot-item strong {
		color: #fff;
	}

	.pot-range {
		color: rgba(34, 197, 94, 0.75);
	}

	.pot-sep {
		color: rgba(255, 255, 255, 0.2);
	}

	/* ── PREZZO CARD ── */
	@keyframes prezzo-in {
		from { opacity: 0; transform: scale(0.85) translateY(12px); }
		60%  { transform: scale(1.04) translateY(-3px); opacity: 1; }
		to   { transform: scale(1) translateY(0); opacity: 1; }
	}

	.prezzo-card {
		text-align: center;
		padding: 1.75rem 1.5rem 1.5rem;
		margin-bottom: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 20px;
		animation: prezzo-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	.prezzo-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: rgba(240, 240, 250, 0.38);
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.prezzo-importo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(3rem, 10vw, 5.5rem);
		letter-spacing: 0.04em;
		color: #ffd700;
		line-height: 1;
		margin-bottom: 0.4rem;
	}

	.prezzo-sub {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.32);
	}

	/* ── STIMA BOX (setup) ── */
	.stima-box {
		margin: 0 auto 1.25rem;
		max-width: 360px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.9rem 1.2rem;
	}

	.stima-riga {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.2rem 0;
	}

	.stima-label {
		font-size: 0.75rem;
		color: rgba(240, 240, 250, 0.42);
	}

	.stima-val {
		font-size: 0.82rem;
		font-weight: 700;
		color: rgba(240, 240, 250, 0.75);
	}

	.stima-pot {
		color: rgba(251, 191, 36, 0.85);
	}

	.stima-nota {
		margin-top: 0.5rem;
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.25);
		text-align: center;
	}

	/* ── JACKPOT BANNER ── */
	@keyframes jackpot-glow {
		0%, 100% { box-shadow: 0 0 12px rgba(255, 215, 0, 0.4), 0 0 32px rgba(255, 165, 0, 0.2); }
		50%       { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 165, 0, 0.4); }
	}

	@keyframes jackpot-text {
		0%, 100% { letter-spacing: 0.12em; }
		50%       { letter-spacing: 0.2em; }
	}

	.jackpot-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		margin-bottom: 0.75rem;
		border-radius: 14px;
		background: linear-gradient(135deg, rgba(255,140,0,0.15), rgba(255,215,0,0.15));
		border: 1px solid rgba(255, 215, 0, 0.5);
		animation: jackpot-glow 1.8s ease-in-out infinite;
	}

	.jk-icon {
		font-size: 1.4rem;
	}

	.jk-testo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.3rem;
		letter-spacing: 0.14em;
		color: #ffd700;
		animation: jackpot-text 1.8s ease-in-out infinite;
	}

	.jk-importo {
		font-size: 1.3rem;
		font-weight: 800;
		color: #ffd700;
	}

	.stat-jackpot {
		color: #ffd700 !important;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	.stima-jackpot-riga {
		margin-top: 0.25rem;
		padding-top: 0.4rem;
		border-top: 1px solid rgba(255, 215, 0, 0.15);
	}

	.stima-jackpot {
		color: #ffd700 !important;
	}

	/* Fine card jackpot */
	.fine-titolo.jackpot {
		background: linear-gradient(90deg, #ff8c00, #ffd700, #ff8c00);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: shine 2s linear infinite;
	}

	@keyframes shine {
		from { background-position: 200% center; }
		to   { background-position: -200% center; }
	}

	.jackpot-premio {
		font-size: 2.8rem !important;
		background: linear-gradient(90deg, #ff8c00, #ffd700, #ff8c00);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: shine 1.5s linear infinite;
	}

	.stats-jackpot {
		border-color: rgba(255, 215, 0, 0.3);
		background: rgba(255, 215, 0, 0.04);
	}

	/* ── STATS BAR (partita) ── */
	.stats-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0 1rem;
	}

	.stat-sep {
		width: 1px;
		height: 28px;
		background: rgba(255, 255, 255, 0.1);
	}

	.stat-label {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(240, 240, 250, 0.32);
		font-weight: 600;
	}

	.stat-val {
		font-size: 1.05rem;
		font-weight: 700;
		color: rgba(240, 240, 250, 0.85);
	}

	.stat-pot {
		color: rgba(251, 191, 36, 0.9);
	}

	.stat-premio {
		color: rgba(74, 222, 128, 0.9);
	}

	.btn-inizia {
		display: block;
		margin: 0 auto 2rem;
		padding: 1rem 2.8rem;
		border-radius: 999px;
		border: 1px solid rgba(34, 197, 94, 0.5);
		background: rgba(34, 197, 94, 0.12);
		color: rgba(34, 197, 94, 0.9);
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.35rem;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: all 0.22s ease;
	}

	.btn-inizia:hover {
		background: rgba(34, 197, 94, 0.22);
		border-color: rgba(34, 197, 94, 0.8);
		transform: translateY(-3px);
		box-shadow: 0 8px 28px rgba(34, 197, 94, 0.2);
	}

	/* ── FINE OVERLAY ── */
	.fine-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		animation: fade-in 0.3s ease;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.fine-card {
		background: rgba(15, 15, 28, 0.97);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 28px;
		padding: 3rem 2.5rem;
		text-align: center;
		max-width: 380px;
		width: 90%;
		animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	.fine-icon {
		font-size: 4rem;
		margin-bottom: 0.5rem;
	}

	.fine-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 3rem;
		letter-spacing: 0.06em;
		margin-bottom: 0.5rem;
	}

	.fine-titolo.win {
		color: #ffd700;
	}

	.fine-titolo.lose {
		color: rgba(240, 240, 250, 0.8);
	}

	.fine-sub {
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.45);
		margin-bottom: 0.5rem;
	}

	.fine-premio {
		font-size: 2.2rem;
		font-weight: 700;
		color: #4ade80;
		margin-bottom: 1rem;
	}

	.fine-perso {
		font-size: 2rem;
		font-weight: 700;
		color: #f87171;
		margin-bottom: 1rem;
	}

	.fine-saldo {
		font-size: 0.8rem;
		color: rgba(240, 240, 250, 0.35);
		margin-bottom: 1.75rem;
	}

	.btn-reset {
		padding: 0.8rem 2.2rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.07);
		color: rgba(240, 240, 250, 0.8);
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-reset:hover {
		background: rgba(255, 255, 255, 0.13);
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}

	/* ── ESTRAZIONE ── */
	.estrazione-area {
		text-align: center;
		padding: 1.5rem 0 1rem;
	}

	.contatore {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(240, 240, 250, 0.3);
		margin-bottom: 1rem;
		font-weight: 600;
	}

	@keyframes pop {
		from {
			transform: scale(0.5) translateY(10px);
			opacity: 0;
		}
		65% {
			transform: scale(1.1) translateY(-4px);
			opacity: 1;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.ultimo-box {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 20px;
		padding: 1.25rem 2.5rem;
		animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	.ultimo-emoji {
		font-size: 3.5rem;
		line-height: 1;
	}

	.ultimo-nome {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.ultimo-animale {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.4);
		margin: 0;
	}

	.ultimo-placeholder {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1.25rem 2.5rem;
		color: rgba(240, 240, 250, 0.3);
		font-size: 0.82rem;
	}

	.wait-icon {
		font-size: 2rem;
	}

	/* ── SEZIONE TITOLI ── */
	.sezione-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.25rem;
		letter-spacing: 0.08em;
		color: rgba(240, 240, 250, 0.55);
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.tavolo-stats {
		font-size: 0.72rem;
		font-family: 'Outfit', sans-serif;
		font-weight: 400;
		letter-spacing: 0.05em;
		color: rgba(240, 240, 250, 0.3);
	}

	/* ── CARTELLE GIOCO ── */
	.sezione-cartelle {
		margin-bottom: 2rem;
	}

	.cartelle-gioco-wrap {
		display: flex;
		gap: 0.75rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}

	.cartella-gioco {
		flex-shrink: 0;
		min-width: 140px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 16px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition: all 0.3s ease;
	}

	.cartella-gioco.bingo {
		border-color: rgba(255, 215, 0, 0.7);
		background: rgba(255, 215, 0, 0.06);
		box-shadow: 0 0 20px rgba(255, 215, 0, 0.18);
	}

	.cartella-num {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(240, 240, 250, 0.3);
		margin-bottom: 0.15rem;
		font-weight: 600;
	}

	.slot-gioco {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.5rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid transparent;
		transition: all 0.25s ease;
		position: relative;
	}

	.slot-gioco.marcato {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.35);
	}

	.slot-g-emoji {
		font-size: 1.05rem;
		flex-shrink: 0;
	}

	.slot-g-nome {
		font-size: 0.7rem;
		color: rgba(240, 240, 250, 0.6);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.slot-gioco.marcato .slot-g-nome {
		color: rgba(74, 222, 128, 0.85);
	}

	.slot-check {
		font-size: 0.65rem;
		color: rgba(74, 222, 128, 0.8);
		flex-shrink: 0;
	}

	/* ── TAVOLO ── */
	.sezione-tavolo {
		margin-bottom: 2rem;
	}

	.tavolo-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.45rem;
	}

	.tavolo-cella {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.5rem 0.25rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 10px;
		transition:
			border-color 0.3s ease,
			background 0.3s ease,
			box-shadow 0.3s ease;
	}

	.tavolo-cella.vicino {
		border-color: rgba(255, 215, 0, 0.65);
		background: rgba(255, 215, 0, 0.04);
		animation: pulse-border 1.3s ease-in-out infinite;
	}

	.tavolo-cella.vinto {
		border-color: rgba(34, 197, 94, 0.7);
		background: rgba(34, 197, 94, 0.07);
		animation: none;
	}

	@keyframes pulse-border {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.45);
		}
		50% {
			box-shadow: 0 0 0 4px rgba(255, 215, 0, 0);
		}
	}

	.t-emoji {
		font-size: 1.3rem;
		line-height: 1;
	}

	.t-nome {
		font-size: 0.52rem;
		color: rgba(240, 240, 250, 0.45);
		text-align: center;
		max-width: 52px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.t-dots {
		display: flex;
		gap: 2px;
		margin-top: 0.15rem;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		transition: background 0.2s ease;
	}

	.dot.pieno {
		background: rgba(255, 215, 0, 0.7);
	}

	.tavolo-cella.vinto .dot.pieno {
		background: rgba(34, 197, 94, 0.8);
	}

	.t-crown {
		font-size: 0.7rem;
		line-height: 1;
	}

	/* ── ESTRATTI ── */
	.sezione-estratti {
		margin-bottom: 2rem;
	}

	.estratti-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pill-e {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid;
		font-size: 0.72rem;
		font-weight: 600;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main {
			padding: 0 0.9rem 4rem;
		}

		.back-wrap {
			padding: 0.7rem 0.9rem 0;
		}

		header {
			padding: 1.8rem 0.5rem 1.5rem;
		}

		h1 {
			flex-direction: column;
			gap: 0.2rem;
		}

		.tavolo-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 0.35rem;
		}

		.t-emoji {
			font-size: 1.1rem;
		}

		.t-nome {
			font-size: 0.46rem;
			max-width: 44px;
		}

		.dot {
			width: 4px;
			height: 4px;
		}

		.cartella-preview {
			flex-wrap: wrap;
		}

		.slot-nome-prev {
			max-width: 44px;
		}

		.fine-card {
			padding: 2rem 1.5rem;
		}
	}
</style>

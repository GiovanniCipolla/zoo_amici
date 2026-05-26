<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { membri } from '$lib/membri.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { unlock, checkEconomyAchievements } from '$lib/achievements.js';

	const N = 7; // numero animali in gara
	const FINISH = 84; // % — posizione traguardo nel lane-track
	const PRESET_IMPORTI = [1, 2, 5, 10, 20, 50];

	// ── Stato ─────────────────────────────────────────────────────────
	let fase = $state('scommessa'); // 'scommessa' | 'countdown' | 'corsa' | 'risultato'
	let animali = $state([]);
	let scelto = $state(null); // animale scommesso
	let importo = $state(2);
	let saldo = $state(0);
	let winnerId = $state(-1);
	let posizioni = $state(Array(N).fill(0));
	let finitOrdine = $state([]); // ordine di arrivo (indici)
	let cdNum = $state(3); // countdown number
	let particelle = $state([]);

	const saldoInsuff = $derived(saldo < importo);
	const potPremio = $derived(scelto ? Math.round(importo * scelto.quota * 100) / 100 : 0);
	const guadagnoNetto = $derived(potPremio - importo);
	const haVinto = $derived(fase === 'risultato' && scelto?.id === winnerId);
	const pagamento = $derived(haVinto ? Math.round(importo * scelto.quota * 100) / 100 : 0);
	const posFinale = $derived(
		haVinto ? finitOrdine.indexOf(winnerId) + 1 : finitOrdine.indexOf(scelto?.id ?? -1) + 1
	);

	let raceFinishTimes = [];
	let raceStartTime = 0;
	let raceInterval = null;
	let cdTimeouts = [];
	let partIdCnt = 0;

	onMount(() => {
		if (!browser) return;
		saldo = getSaldo();
		generaCorsa();
	});

	onDestroy(() => {
		if (raceInterval) clearInterval(raceInterval);
		cdTimeouts.forEach(clearTimeout);
	});

	// ── Genera nuova corsa ─────────────────────────────────────────────
	function generaCorsa() {
		const shuffled = [...membri].sort(() => Math.random() - 0.5);
		const scelti = shuffled.slice(0, N);

		const pesi = scelti.map(() => 0.5 + Math.random() * 2.5);
		const totPesi = pesi.reduce((a, b) => a + b, 0);

		animali = scelti.map((m, i) => {
			const prob = pesi[i] / totPesi;
			let quota = 1 / prob;
			quota = Math.round(quota * 4) / 4; // arrotonda a 0.25
			quota = Math.max(1.5, Math.min(20.0, quota));
			return { ...m, id: i, quota, prob };
		});
	}

	function determinaVincitore() {
		const tot = animali.reduce((s, a) => s + a.prob, 0);
		let r = Math.random() * tot;
		for (let i = 0; i < animali.length; i++) {
			r -= animali[i].prob;
			if (r <= 0) return i;
		}
		return animali.length - 1;
	}

	// ── Piazza scommessa + countdown ─────────────────────────────────
	function piazzaScommessa() {
		if (!scelto || saldoInsuff) return;

		spendSaldo(importo);
		saldo = getSaldo();

		const wId = determinaVincitore();
		winnerId = wId;
		const winTime = 5500 + Math.random() * 1500;
		raceFinishTimes = animali.map((_, i) =>
			i === wId ? winTime : winTime + 500 + Math.random() * 3000
		);

		unlock('corsa_debutto');
		const nCorse = parseInt(localStorage.getItem('zoo_corsa_count') ?? '0', 10) + 1;
		localStorage.setItem('zoo_corsa_count', String(nCorse));
		if (nCorse >= 10) unlock('corsa_veterano');
		checkEconomyAchievements();

		fase = 'countdown';
		cdNum = 3;
		cdTimeouts = [
			setTimeout(() => { cdNum = 2; }, 1000),
			setTimeout(() => { cdNum = 1; }, 2000),
			setTimeout(() => { cdNum = 0; }, 3000),
			setTimeout(() => { iniziaCorsa(); }, 3700)
		];
	}

	// ── Corsa ─────────────────────────────────────────────────────────
	function iniziaCorsa() {
		fase = 'corsa';
		posizioni = Array(N).fill(0);
		finitOrdine = [];
		raceStartTime = Date.now();

		raceInterval = setInterval(() => {
			const el = Date.now() - raceStartTime;

			// Aggiorna posizioni con leggero rumore sinusoidale per drammaticità
			posizioni = animali.map((_, i) => {
				const base = (el / raceFinishTimes[i]) * FINISH;
				const noise = Math.sin(el * 0.0055 + i * 2.3) * 1.5;
				return Math.max(0, Math.min(FINISH, base + noise));
			});

			// Rileva arrivi (usa base senza rumore per correttezza)
			for (let i = 0; i < animali.length; i++) {
				const base = (el / raceFinishTimes[i]) * FINISH;
				if (base >= FINISH && !finitOrdine.includes(i)) {
					finitOrdine = [...finitOrdine, i];
				}
			}

			// Il vincitore ha tagliato il traguardo → termina corsa
			if (finitOrdine.includes(winnerId)) {
				clearInterval(raceInterval);
				raceInterval = null;
				posizioni = posizioni.map((p, i) =>
					i === winnerId ? FINISH : Math.min(FINISH - 4, p)
				);
				cdTimeouts.push(setTimeout(terminaCorsa, 1300));
			}
		}, 33);
	}

	function terminaCorsa() {
		fase = 'risultato';

		if (scelto?.id === winnerId) {
			const premio = Math.round(importo * scelto.quota * 100) / 100;
			addSaldo(premio, 'corsa_vincita');
			saldo = getSaldo();
			unlock('corsa_vittoria');
			if (scelto.quota > 8) unlock('corsa_outsider');
			if (premio - importo >= 50) unlock('corsa_riccone');
			checkEconomyAchievements();
			generaParticelle();
		}
	}

	// ── Particelle vittoria ───────────────────────────────────────────
	function generaParticelle() {
		particelle = Array.from({ length: 20 }, (_, i) => ({
			id: ++partIdCnt,
			x: 5 + Math.random() * 90,
			delay: Math.random() * 0.8,
			dur: 1.8 + Math.random() * 1.2,
			size: 1.1 + Math.random() * 0.9,
			fromBottom: i % 2 === 0,
			emoji: ['🏆', '🥇', '🎉', '⭐', '💰'][Math.floor(Math.random() * 5)]
		}));
	}

	// ── Reset ─────────────────────────────────────────────────────────
	function nuovaCorsa() {
		if (raceInterval) { clearInterval(raceInterval); raceInterval = null; }
		cdTimeouts.forEach(clearTimeout);
		cdTimeouts = [];

		generaCorsa();
		scelto = null;
		posizioni = Array(N).fill(0);
		finitOrdine = [];
		winnerId = -1;
		particelle = [];
		fase = 'scommessa';
	}

	// ── Helpers ───────────────────────────────────────────────────────
	function quotaLabel(q) {
		if (q < 2.5) return { txt: 'Favorito', cls: 'fav' };
		if (q < 5) return null;
		if (q < 9) return { txt: 'Outsider', cls: 'out' };
		return { txt: 'Longshot', cls: 'long' };
	}

	function posLabel(n) {
		if (n === 1) return '1°';
		if (n === 2) return '2°';
		if (n === 3) return '3°';
		return `${n}°`;
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
			<span class="title-icon">🏇</span>
			<span class="title-text">200 metri<br />in Via Muraverde</span>
		</h1>
		<p class="subtitle">7 animali · quote casuali · scommetti sul vincitore</p>
	</header>

	<!-- ── WALLET ── -->
	<div class="wallet-bar">
		<span>💰</span>
		<span class="wallet-saldo">€{saldo.toFixed(2)}</span>
		<span class="wallet-label">saldo</span>
	</div>

	<!-- ════════════════ FASE: SCOMMESSA ════════════════ -->
	{#if fase === 'scommessa'}
		<section class="scommessa-section">
			<p class="section-label">🐾 Scegli il tuo campione</p>

			<div class="animals-grid">
				{#each animali as a}
					{@const badge = quotaLabel(a.quota)}
					<button
						class="animal-card"
						class:selected={scelto?.id === a.id}
						onclick={() => (scelto = a)}
					>
						{#if badge}
							<span class="ac-badge {badge.cls}">{badge.txt}</span>
						{/if}
						<span class="ac-emoji">{a.emoji}</span>
						<span class="ac-nome">{a.nome}</span>
						<span class="ac-quota" class:quota-hot={a.quota < 3} class:quota-long={a.quota > 8}>
							{a.quota.toFixed(2)}x
						</span>
					</button>
				{/each}
			</div>

			{#if scelto}
				<div class="bet-area">
					<p class="bet-label">Importo scommessa</p>
					<div class="importo-grid">
						{#each PRESET_IMPORTI as imp}
							<button
								class="imp-btn"
								class:active={importo === imp}
								onclick={() => (importo = imp)}
							>€{imp}</button>
						{/each}
					</div>

					<div class="pot-win-bar" style="--quot-col: {scelto.quota > 8 ? '#22c55e' : scelto.quota > 4 ? '#eab308' : '#60a5fa'}">
						<span class="pot-label">Vincita potenziale</span>
						<span class="pot-val">€{potPremio.toFixed(2)}</span>
						<span class="pot-netto">(+€{guadagnoNetto.toFixed(2)} netti)</span>
					</div>
				</div>
			{/if}

			<button
				class="scommetti-btn"
				class:disabled={!scelto || saldoInsuff}
				disabled={!scelto || saldoInsuff}
				onclick={piazzaScommessa}
			>
				{#if !scelto}
					Scegli un animale
				{:else if saldoInsuff}
					💸 Saldo insufficiente
				{:else}
					🏁 Scommetti €{importo} su {scelto.nome}
				{/if}
			</button>
		</section>
	{/if}

	<!-- ════════════════ COUNTDOWN ════════════════ -->
	{#if fase === 'countdown'}
		<div class="countdown-screen">
			{#if cdNum > 0}
				{#key cdNum}
					<div class="cd-num">{cdNum}</div>
				{/key}
			{:else}
				<div class="cd-via">🚀 VIA!</div>
			{/if}
			<p class="cd-sub">
				Hai scommesso €{importo} su {scelto?.emoji} {scelto?.nome} · quota {scelto?.quota.toFixed(2)}x
			</p>
		</div>
	{/if}

	<!-- ════════════════ PISTA (corsa + risultato) ════════════════ -->
	{#if fase === 'corsa' || fase === 'risultato'}
		<div class="pista-wrap">

			<!-- Intestazione pista -->
			<div class="pista-header">
				<span class="ph-start">START</span>
				<span class="ph-title">Via Muraverde — 200m</span>
				<span class="ph-finish">🏁 FINISH</span>
			</div>

			<!-- Pista -->
			<div class="pista">
				<!-- Linea del traguardo -->
				<div class="traguardo" style="left: calc(68px + (100% - 68px) * {FINISH / 100})">
					<div class="traguardo-flag">🏁</div>
				</div>

				{#each animali as a, i}
					{@const isWinner = fase === 'risultato' && i === winnerId}
					{@const isScelto = scelto?.id === i}
					{@const posArrivo = finitOrdine.indexOf(i)}
					<div
						class="lane"
						class:lane-scelto={isScelto}
						class:lane-winner={isWinner}
					>
						<!-- Info corsia -->
						<div class="lane-info">
							<span class="lane-num">{i + 1}</span>
							<span class="lane-quota">{a.quota.toFixed(2)}x</span>
						</div>

						<!-- Track -->
						<div class="lane-track">
							<!-- Runner -->
							<span
								class="runner"
								class:runner-running={fase === 'corsa'}
								class:runner-winner={isWinner}
								class:runner-scelto={isScelto}
								style="left: {posizioni[i]}%"
								style:animation-delay="{-i * 0.05}s"
							>{a.emoji}</span>

							<!-- Badge arrivo -->
							{#if posArrivo >= 0}
								<span
									class="arrivo-badge"
									class:arrivo-primo={posArrivo === 0}
									style="left: {FINISH + 2}%"
								>{posLabel(posArrivo + 1)}</span>
							{/if}
						</div>

						<!-- Nome animale -->
						<span class="lane-nome" class:nome-scelto={isScelto}>{a.nome}</span>
					</div>
				{/each}
			</div>

			<!-- Scommessa recap -->
			<div class="scommessa-recap" class:recap-win={haVinto} class:recap-loss={fase === 'risultato' && !haVinto}>
				{#if fase === 'corsa'}
					<span>Scommesso €{importo} su {scelto?.emoji} {scelto?.nome} ({scelto?.quota.toFixed(2)}x)</span>
				{:else if haVinto}
					<span>✅ {scelto?.emoji} {scelto?.nome} arriva {posLabel(posFinale)}! Hai vinto!</span>
				{:else}
					<span>❌ {scelto?.emoji} {scelto?.nome} arriva {posFinale > 0 ? posLabel(posFinale) : '—'}. Hai perso.</span>
				{/if}
			</div>

			<!-- Risultato box -->
			{#if fase === 'risultato'}
				<div class="risultato-box">
					<!-- Vincitore -->
					<div class="winner-podio">
						<span class="winner-emoji">{animali[winnerId]?.emoji}</span>
						<div class="winner-info">
							<span class="winner-crown">🏆 1° posto</span>
							<span class="winner-nome">{animali[winnerId]?.nome}</span>
							<span class="winner-quota">quota {animali[winnerId]?.quota.toFixed(2)}x</span>
						</div>
					</div>

					{#if haVinto}
						<div class="esito esito-vinto">
							<div class="esito-title">HAI VINTO! 🎉</div>
							<div class="esito-premio">+€{(pagamento - importo).toFixed(2)} netti</div>
							<div class="esito-sub">Puntata €{importo} × {scelto?.quota.toFixed(2)} = €{pagamento.toFixed(2)}</div>
						</div>
					{:else}
						<div class="esito esito-perso">
							<div class="esito-title">Hai perso</div>
							<div class="esito-premio">-€{importo.toFixed(2)}</div>
							<div class="esito-sub">Avevi scommesso su {scelto?.nome} (quota {scelto?.quota.toFixed(2)}x)</div>
						</div>
					{/if}

					<button class="nuova-btn" onclick={nuovaCorsa}>
						🔄 Nuova corsa
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── ACHIEVEMENT PREVIEW ── -->
	<div class="achiev-preview">
		<div class="achiev-header">🏆 Achievement della corsa</div>
		<div class="achiev-list">
			<div class="achiev-item"><span>🏁</span><div><span class="an">Al Via!</span><span class="ad">Prima scommessa</span></div><span class="ar">+€0.25</span></div>
			<div class="achiev-item"><span>🥇</span><div><span class="an">Sul Podio</span><span class="ad">Prima vincita</span></div><span class="ar">+€1.00</span></div>
			<div class="achiev-item"><span>🎲</span><div><span class="an">Colpo di Fortuna</span><span class="ad">Vinci con quota &gt; 8x</span></div><span class="ar">+€5.00</span></div>
			<div class="achiev-item"><span>💰</span><div><span class="an">Grande Scommettitore</span><span class="ad">Vinci €50+ netti</span></div><span class="ar">+€5.00</span></div>
			<div class="achiev-item"><span>🏆</span><div><span class="an">Habitué del Trotto</span><span class="ad">10 corse partecipate</span></div><span class="ar">+€2.00</span></div>
		</div>
	</div>

	<p class="disclaimer">🐾 Nessun animale è stato veramente messo in gara senza consenso</p>
</main>

<style>
	/* ── BG BLOBS ── */
	.bg-blobs {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.14;
	}
	.blob-1 {
		width: 500px; height: 500px;
		background: radial-gradient(circle, #22c55e, transparent);
		top: -130px; left: -100px;
		animation: bd1 18s ease-in-out infinite alternate;
	}
	.blob-2 {
		width: 400px; height: 400px;
		background: radial-gradient(circle, #166534, transparent);
		bottom: 0; right: -80px;
		animation: bd2 22s ease-in-out infinite alternate;
	}
	.blob-3 {
		width: 340px; height: 340px;
		background: radial-gradient(circle, #eab308, transparent);
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		animation: bd3 16s ease-in-out infinite alternate;
	}
	@keyframes bd1 { to { transform: translate(60px, 40px); } }
	@keyframes bd2 { to { transform: translate(-50px, -30px); } }
	@keyframes bd3 { to { transform: translate(-45%, -55%); } }

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 1.5rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
		color: #f0f0f0;
	}

	/* ── HEADER ── */
	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		text-align: center;
	}
	.back-btn {
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		color: #bbb;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
		align-self: flex-start;
	}
	.back-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
	h1 { display: flex; align-items: center; gap: 0.6rem; margin: 0; }
	.title-icon {
		font-size: 2.5rem;
		animation: horseGallop 1s ease-in-out infinite alternate;
	}
	@keyframes horseGallop {
		from { transform: rotate(-4deg) translateY(0); }
		to { transform: rotate(4deg) translateY(-4px); }
	}
	.title-text {
		font-size: 1.9rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.1;
		background: linear-gradient(135deg, #4ade80, #22c55e, #16a34a);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.subtitle { color: #999; font-size: 0.85rem; margin: 0; }

	/* ── WALLET ── */
	.wallet-bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 1.2rem;
		background: rgba(34, 197, 94, 0.08);
		border: 1px solid rgba(34, 197, 94, 0.25);
		border-radius: 12px;
		width: 100%;
		max-width: 560px;
	}
	.wallet-saldo {
		font-size: 1.3rem;
		font-weight: 900;
		color: #4ade80;
		flex: 1;
	}
	.wallet-label { font-size: 0.72rem; color: rgba(74, 222, 128, 0.5); }

	/* ════════════ SCOMMESSA ════════════ */
	.scommessa-section {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		width: 100%;
		max-width: 560px;
	}
	.section-label {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(74, 222, 128, 0.6);
		margin: 0;
	}

	/* Grid animali */
	.animals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
		gap: 0.6rem;
	}
	.animal-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.85rem 0.5rem 0.75rem;
		background: rgba(255,255,255,0.04);
		border: 1.5px solid rgba(255,255,255,0.09);
		border-radius: 14px;
		cursor: pointer;
		transition: all 0.18s;
		text-align: center;
	}
	.animal-card:hover {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.3);
		transform: translateY(-2px);
	}
	.animal-card.selected {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.6);
		box-shadow: 0 0 18px rgba(34, 197, 94, 0.25);
		transform: translateY(-3px);
	}
	.ac-badge {
		position: absolute;
		top: -7px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.52rem;
		font-weight: 900;
		letter-spacing: 0.07em;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.ac-badge.fav { background: #1d4ed8; color: #bfdbfe; }
	.ac-badge.out { background: #92400e; color: #fde68a; }
	.ac-badge.long { background: #7f1d1d; color: #fecaca; }
	.ac-emoji { font-size: 2.4rem; line-height: 1; }
	.ac-nome { font-size: 0.68rem; color: rgba(255,255,255,0.6); font-weight: 600; }
	.ac-quota {
		font-size: 0.95rem;
		font-weight: 900;
		color: #f0f0f0;
	}
	.ac-quota.quota-hot { color: #60a5fa; }
	.ac-quota.quota-long { color: #4ade80; }

	/* Bet area */
	.bet-area {
		background: rgba(0,0,0,0.25);
		border: 1px solid rgba(34, 197, 94, 0.15);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		animation: fadeIn 0.25s ease;
	}
	.bet-label {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255,255,255,0.35);
		margin: 0;
		text-transform: uppercase;
	}
	.importo-grid {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.imp-btn {
		padding: 0.45rem 0.85rem;
		border-radius: 10px;
		border: 1.5px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.04);
		color: #e2e8f0;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
	}
	.imp-btn:hover { background: rgba(255,255,255,0.1); }
	.imp-btn.active {
		background: rgba(34, 197, 94, 0.18);
		border-color: rgba(34, 197, 94, 0.6);
		color: #4ade80;
	}
	.pot-win-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: color-mix(in srgb, var(--quot-col) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--quot-col) 30%, transparent);
		border-radius: 10px;
	}
	.pot-label { font-size: 0.72rem; color: rgba(255,255,255,0.45); flex: 1; }
	.pot-val {
		font-size: 1.1rem;
		font-weight: 900;
		color: var(--quot-col);
	}
	.pot-netto { font-size: 0.7rem; color: rgba(255,255,255,0.3); }

	.scommetti-btn {
		width: 100%;
		padding: 1.1rem;
		border-radius: 14px;
		border: none;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		cursor: pointer;
		background: linear-gradient(135deg, #22c55e, #16a34a);
		color: #052e16;
		box-shadow: 0 4px 20px rgba(34, 197, 94, 0.35);
		transition: all 0.15s;
	}
	.scommetti-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 28px rgba(34, 197, 94, 0.5);
	}
	.scommetti-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: rgba(255,255,255,0.06);
		color: rgba(255,255,255,0.4);
		box-shadow: none;
	}

	/* ════════════ COUNTDOWN ════════════ */
	.countdown-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		min-height: 260px;
		width: 100%;
		max-width: 560px;
	}
	.cd-num {
		font-size: 9rem;
		font-weight: 900;
		color: #4ade80;
		text-shadow: 0 0 40px rgba(74, 222, 128, 0.6);
		animation: cdPop 0.9s ease-out forwards;
		line-height: 1;
	}
	.cd-via {
		font-size: 4rem;
		font-weight: 900;
		color: #ffd700;
		text-shadow: 0 0 30px rgba(255, 215, 0, 0.7);
		animation: cdPop 0.6s ease-out forwards;
	}
	@keyframes cdPop {
		0% { transform: scale(0.2); opacity: 0; }
		40% { transform: scale(1.2); opacity: 1; }
		70% { transform: scale(1); opacity: 1; }
		100% { transform: scale(0.85); opacity: 0; }
	}
	.cd-sub {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.45);
		text-align: center;
		margin: 0;
	}

	/* ════════════ PISTA ════════════ */
	.pista-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 620px;
	}
	.pista-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 0.25rem;
	}
	.ph-start, .ph-finish {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: rgba(255,255,255,0.35);
	}
	.ph-title {
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(255,255,255,0.4);
	}

	/* La pista vera */
	.pista {
		position: relative;
		background: linear-gradient(160deg, #052e16 0%, #14532d 50%, #052e16 100%);
		border: 1.5px solid rgba(34, 197, 94, 0.25);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 0 30px rgba(34, 197, 94, 0.08), inset 0 1px 0 rgba(255,255,255,0.06);
	}

	/* Traguardo verticale */
	.traguardo {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 4px;
		background: repeating-linear-gradient(
			to bottom,
			#000 0px, #000 7px,
			#fff 7px, #fff 14px
		);
		z-index: 10;
		pointer-events: none;
		transform: translateX(-50%);
	}
	.traguardo-flag {
		position: absolute;
		top: -2px;
		left: 4px;
		font-size: 1rem;
	}

	/* Corsia */
	.lane {
		display: grid;
		grid-template-columns: 68px 1fr 55px;
		align-items: center;
		height: 50px;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		transition: background 0.3s;
	}
	.lane:last-child { border-bottom: none; }
	.lane.lane-scelto {
		background: rgba(34, 197, 94, 0.07);
		border-left: 2px solid rgba(34, 197, 94, 0.5);
	}
	.lane.lane-winner {
		background: rgba(255, 215, 0, 0.06);
		border-left: 2px solid rgba(255, 215, 0, 0.6);
		animation: laneWinnerGlow 1s ease-in-out infinite alternate;
	}
	@keyframes laneWinnerGlow {
		from { background: rgba(255, 215, 0, 0.06); }
		to { background: rgba(255, 215, 0, 0.13); }
	}

	.lane-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		border-right: 1px solid rgba(255,255,255,0.06);
		gap: 2px;
		padding: 0 4px;
	}
	.lane-num {
		font-size: 0.6rem;
		color: rgba(255,255,255,0.3);
		font-weight: 700;
	}
	.lane-quota {
		font-size: 0.68rem;
		font-weight: 800;
		color: rgba(255,255,255,0.55);
	}

	/* Track dove si muove il runner */
	.lane-track {
		position: relative;
		height: 100%;
		overflow: visible;
	}

	/* Runner emoji */
	.runner {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 1.7rem;
		line-height: 1;
		z-index: 5;
		pointer-events: none;
		/* transizione leggera per smoothness */
		transition: left 0.03s linear;
	}
	.runner.runner-running {
		animation: gallop 0.28s ease-in-out infinite alternate;
	}
	@keyframes gallop {
		0%   { transform: translateY(-50%); }
		100% { transform: translateY(calc(-50% - 5px)) scaleX(1.05); }
	}
	.runner.runner-scelto {
		filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.8));
	}
	.runner.runner-winner {
		filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.9));
		animation: winnerPulse 0.6s ease-in-out infinite alternate;
	}
	@keyframes winnerPulse {
		from { filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.7)); transform: translateY(-50%) scale(1); }
		to   { filter: drop-shadow(0 0 16px rgba(255, 215, 0, 1)); transform: translateY(-50%) scale(1.15); }
	}

	/* Badge ordine di arrivo */
	.arrivo-badge {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.55rem;
		font-weight: 900;
		background: rgba(255,215,0,0.9);
		color: #000;
		padding: 0.1rem 0.35rem;
		border-radius: 999px;
		z-index: 8;
		white-space: nowrap;
	}
	.arrivo-badge.arrivo-primo {
		background: #ffd700;
		font-size: 0.6rem;
	}

	/* Nome animale (destra) */
	.lane-nome {
		font-size: 0.62rem;
		color: rgba(255,255,255,0.35);
		padding: 0 6px;
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.nome-scelto {
		color: rgba(74, 222, 128, 0.7);
		font-weight: 700;
	}

	/* Recap scommessa */
	.scommessa-recap {
		padding: 0.6rem 1rem;
		border-radius: 10px;
		font-size: 0.8rem;
		text-align: center;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.5);
		transition: all 0.3s;
	}
	.recap-win {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.35);
		color: #4ade80;
	}
	.recap-loss {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.25);
		color: #fca5a5;
	}

	/* Risultato */
	.risultato-box {
		background: rgba(0,0,0,0.35);
		border: 1px solid rgba(255,215,0,0.2);
		border-radius: 18px;
		padding: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: fadeIn 0.35s ease;
	}
	.winner-podio {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.winner-emoji {
		font-size: 3rem;
		filter: drop-shadow(0 0 12px rgba(255,215,0,0.6));
		animation: winnerFloat 1s ease-in-out infinite alternate;
	}
	@keyframes winnerFloat {
		from { transform: translateY(0); }
		to { transform: translateY(-6px); }
	}
	.winner-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.winner-crown {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #ffd700;
	}
	.winner-nome {
		font-size: 1.2rem;
		font-weight: 800;
		color: #f0f0f0;
	}
	.winner-quota {
		font-size: 0.72rem;
		color: rgba(255,255,255,0.4);
	}

	.esito {
		border-radius: 14px;
		padding: 1.1rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.esito-vinto {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.35);
	}
	.esito-perso {
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.25);
	}
	.esito-title {
		font-size: 1.1rem;
		font-weight: 800;
	}
	.esito-vinto .esito-title { color: #4ade80; }
	.esito-perso .esito-title { color: #fca5a5; }
	.esito-premio {
		font-size: 1.6rem;
		font-weight: 900;
	}
	.esito-vinto .esito-premio { color: #22c55e; }
	.esito-perso .esito-premio { color: #ef4444; }
	.esito-sub { font-size: 0.72rem; color: rgba(255,255,255,0.35); }

	.nuova-btn {
		width: 100%;
		padding: 0.95rem;
		border-radius: 12px;
		border: 1px solid rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.1);
		color: #4ade80;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}
	.nuova-btn:hover {
		background: rgba(34, 197, 94, 0.2);
		transform: translateY(-1px);
	}

	/* ── ACHIEVEMENT PREVIEW ── */
	.achiev-preview {
		width: 100%;
		max-width: 560px;
		background: rgba(0,0,0,0.28);
		border: 1px solid rgba(34, 197, 94, 0.14);
		border-radius: 18px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.achiev-header {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: rgba(34, 197, 94, 0.7);
		text-transform: uppercase;
	}
	.achiev-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.achiev-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.65rem;
		background: rgba(34, 197, 94, 0.04);
		border: 1px solid rgba(34, 197, 94, 0.1);
		border-radius: 10px;
		font-size: 1.1rem;
	}
	.achiev-item > div {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.an { font-size: 0.75rem; font-weight: 700; color: #f0f0f0; }
	.ad { font-size: 0.62rem; color: rgba(255,255,255,0.35); }
	.ar { font-size: 0.72rem; font-weight: 800; color: #4ade80; }

	.disclaimer {
		color: rgba(255,255,255,0.2);
		font-size: 0.72rem;
		text-align: center;
	}

	/* ── PARTICELLE ── */
	.particle {
		position: fixed;
		top: -5%;
		z-index: 999;
		pointer-events: none;
		animation: particleFall linear both;
	}
	.particle.from-bottom {
		top: auto;
		bottom: -5%;
		animation-name: particleRise;
	}
	@keyframes particleFall {
		0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
		10% { opacity: 1; transform: translateY(10vh) rotate(30deg) scale(1); }
		80% { opacity: 0.9; }
		100% { transform: translateY(110vh) rotate(720deg) scale(0.8); opacity: 0; }
	}
	@keyframes particleRise {
		0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
		10% { opacity: 1; transform: translateY(-10vh) rotate(-30deg) scale(1); }
		80% { opacity: 0.9; }
		100% { transform: translateY(-110vh) rotate(-720deg) scale(0.8); opacity: 0; }
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 480px) {
		.title-text { font-size: 1.5rem; }
		.animals-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
		.ac-emoji { font-size: 2rem; }
		.lane { grid-template-columns: 54px 1fr 40px; height: 44px; }
		.runner { font-size: 1.45rem; }
		.lane-nome { font-size: 0.55rem; }
		.cd-num { font-size: 7rem; }
	}
</style>

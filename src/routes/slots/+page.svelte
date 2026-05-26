<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { SLOT_SIMBOLI, WIN_PARTICLES, COSTO_GIRO, TIER_GROUPS, gira } from '$lib/slots.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { logSlotGiro } from '$lib/logger.js';
	import { unlock, checkEconomyAchievements } from '$lib/achievements.js';

	// ── Stato ─────────────────────────────────────────────────────────
	// reels[reel][posizione]: ogni reel è una colonna con 3 simboli [top, mid, bot]
	let reels = $state([
		[SLOT_SIMBOLI[0], SLOT_SIMBOLI[3], SLOT_SIMBOLI[6]],
		[SLOT_SIMBOLI[1], SLOT_SIMBOLI[4], SLOT_SIMBOLI[7]],
		[SLOT_SIMBOLI[2], SLOT_SIMBOLI[5], SLOT_SIMBOLI[8]]
	]);

	let reelSpinning = $state([false, false, false]);
	let reelSettled = $state([false, false, false]);
	let spinning = $state(false);
	let vincita = $state(false);
	let vinciteLinee = $state([]); // [{ linea: 0|1|2, animale }]
	let animaleVincente = $state(null); // animale più prezioso per l'overlay
	let showWin = $state(false);
	let saldo = $state(0);
	const saldoInsuff = $derived(saldo < COSTO_GIRO);
	let particles = $state([]);
	let girato = $state(false);
	const totalPremioVinto = $derived(vinciteLinee.reduce((s, v) => s + v.animale.premio, 0));

	const intervals = [null, null, null];

	onMount(() => {
		if (!browser) return;
		saldo = getSaldo();
	});

	onDestroy(() => {
		intervals.forEach((id) => id && clearInterval(id));
	});

	function randomSym() {
		return SLOT_SIMBOLI[Math.floor(Math.random() * SLOT_SIMBOLI.length)];
	}

	function startReel(i) {
		reelSpinning[i] = true;
		reelSettled[i] = false;
		intervals[i] = setInterval(() => {
			reels[i] = [randomSym(), randomSym(), randomSym()];
		}, 65);
	}

	function stopReel(i, finalSymbols) {
		clearInterval(intervals[i]);
		intervals[i] = null;
		reels[i] = finalSymbols;
		reelSpinning[i] = false;
		setTimeout(() => {
			reelSettled[i] = true;
			setTimeout(() => {
				reelSettled[i] = false;
			}, 500);
		}, 10);
	}

	function buildParticles(animale) {
		const cfg = WIN_PARTICLES[animale.animale] ?? { emoji: '✨', extra: '⭐' };
		return Array.from({ length: 24 }, (_, i) => ({
			id: i,
			emoji: i % 3 === 0 ? cfg.extra : cfg.emoji,
			x: 5 + Math.random() * 90,
			delay: Math.random() * 1.2,
			dur: 1.8 + Math.random() * 1.4,
			size: 1.2 + Math.random() * 1.2,
			fromBottom: i % 2 === 0
		}));
	}

	function lineaVince(row) {
		return vinciteLinee.some((v) => v.linea === row);
	}

	async function handleGira() {
		if (spinning || saldoInsuff) return;

		spendSaldo(COSTO_GIRO);
		saldo = getSaldo();

		// Reset
		vincita = false;
		vinciteLinee = [];
		animaleVincente = null;
		showWin = false;
		particles = [];
		girato = true;

		const risultato = gira();

		// Achievement giri
		unlock('giocatore');
		const nGiri = parseInt(localStorage.getItem('zoo_slots_count') ?? '0', 10) + 1;
		localStorage.setItem('zoo_slots_count', String(nGiri));
		if (nGiri >= 10) unlock('spendaccione');
		if (nGiri >= 50) unlock('slot_veteran');
		checkEconomyAchievements();

		spinning = true;
		startReel(0);
		startReel(1);
		startReel(2);

		// griglia[riga][colonna] → reel[col] = [griglia[0][col], griglia[1][col], griglia[2][col]]
		const g = risultato.griglia;

		setTimeout(() => {
			stopReel(0, [g[0][0], g[1][0], g[2][0]]);
		}, 1500);

		setTimeout(() => {
			stopReel(1, [g[0][1], g[1][1], g[2][1]]);
		}, 2300);

		setTimeout(async () => {
			stopReel(2, [g[0][2], g[1][2], g[2][2]]);
			spinning = false;

			vinciteLinee = risultato.vincite;
			vincita = risultato.vincita;
			animaleVincente = risultato.animale;

			if (vincita) {
				unlock('fortunello');
				for (const v of vinciteLinee) {
					addSaldo(v.animale.premio, 'slot_vincita');
				}
				saldo = getSaldo();

				const nVincite = parseInt(localStorage.getItem('zoo_slots_wins') ?? '0', 10) + 1;
				localStorage.setItem('zoo_slots_wins', String(nVincite));
				if (nVincite >= 2) unlock('doppio_tris');
				if (nVincite >= 3) unlock('hat_trick');
				if (nVincite >= 5) unlock('maniaco');
				checkEconomyAchievements();

				particles = buildParticles(animaleVincente);
				setTimeout(() => {
					showWin = true;
				}, 350);
			}

			logSlotGiro({
				simboli: risultato.simboli,
				vincita: risultato.vincita,
				animale: risultato.animale,
				vincite: risultato.vincite,
				saldo
			});
		}, 3100);
	}

	function chiudiWin() {
		showWin = false;
		particles = [];
	}
</script>

<!-- Sfondo blob -->
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
			<span class="title-icon">🎰</span>
			<span class="title-text">Slot Machine<br />Animalesca</span>
		</h1>
		<p class="subtitle">3 paylines attive &middot; tris su una riga = vincita &middot; €{COSTO_GIRO} a giro</p>
	</header>

	<!-- ── WALLET BAR ── -->
	<div class="wallet-bar">
		<span class="wallet-icon">💰</span>
		<span class="wallet-saldo">€{saldo.toFixed(2)}</span>
		<span class="wallet-costo">Costo: €{COSTO_GIRO}/giro</span>
	</div>

	<!-- ── MACHINE ── -->
	<div class="machine-wrap">
		<div class="machine">
			<!-- Luci decorative in cima -->
			<div class="machine-lights" aria-hidden="true">
				{#each Array(9) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>

			<!-- REELS + PAYLINE OVERLAY -->
			<div class="reels-area">
				<!-- Etichette payline (sinistra) -->
				<div class="payline-labels" aria-hidden="true">
					{#each [0, 1, 2] as row}
						<div class="pl-row" class:pl-win={lineaVince(row)}>
							<span class="pl-num">L{row + 1}</span>
						</div>
					{/each}
				</div>

				<!-- I 3 reel (colonne) -->
				<div class="reels-row">
					{#each reels as reel, ri}
						<div
							class="reel"
							class:spinning={reelSpinning[ri]}
							class:settled={reelSettled[ri]}
						>
							{#each reel as sym, si}
								<div class="sym-cell" class:row-win={girato && lineaVince(si)}>
									<span class="sym-emoji">{sym.emoji}</span>
								</div>
							{/each}
						</div>
					{/each}

					<!-- Linee orizzontali overlay (sopra i reel) -->
					<div class="paylines-overlay" aria-hidden="true">
						{#each [0, 1, 2] as row}
							<div class="overlay-row" class:overlay-win={girato && lineaVince(row)}>
								<div class="overlay-line"></div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Badge vincita (destra) -->
				<div class="payline-wins" aria-hidden="true">
					{#each [0, 1, 2] as row}
						<div class="pl-win-badge" class:visible={girato && lineaVince(row)}>
							WIN!
						</div>
					{/each}
				</div>
			</div>

			<!-- CONTROLLI -->
			<div class="controls">
				<button
					class="spin-btn"
					class:spinning
					class:disabled={saldoInsuff}
					onclick={handleGira}
					disabled={spinning || saldoInsuff}
					aria-label="Gira la slot machine"
				>
					{#if spinning}
						<span class="spin-icon">⟳</span> Girando...
					{:else if saldoInsuff}
						💸 Saldo insufficiente
					{:else}
						🎰 GIRA! — €{COSTO_GIRO.toFixed(2)}
					{/if}
				</button>
			</div>

			<!-- Messaggio risultato senza vincita -->
			{#if girato && !vincita && !spinning}
				<div class="lose-msg">
					<span>Quasi... riprova!</span>
				</div>
			{/if}

			<!-- Luci decorative in fondo -->
			<div class="machine-lights bottom-lights" aria-hidden="true">
				{#each Array(9) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>
		</div>

		<!-- ── LEGENDA PREMI ── -->
		<div class="paytable">
			<div class="paytable-header">
				<span>📋</span>
				<span>TABELLA PREMI</span>
			</div>
			<p class="paytable-sub">3 simboli uguali su qualsiasi riga = vincita</p>

			<div class="paytable-tiers">
				{#each TIER_GROUPS as tier}
					{#if tier.simboli.length > 0}
						<div class="tier-row" class:tier-luisa={tier.label === 'LUISA'} style="--tier-color: {tier.colore}">
							<div class="tier-left">
								<span class="tier-icon">{tier.icon}</span>
								<div class="tier-info">
									<span class="tier-label">{tier.label}</span>
									<span class="tier-prob">{tier.prob}</span>
								</div>
							</div>
							<div class="tier-symbols">
								{#each tier.simboli as s}
									<span class="tier-sym" title={s.nome}>{s.emoji}</span>
								{/each}
							</div>
							<div class="tier-prize">+€{tier.premio}</div>
						</div>
					{/if}
				{/each}
			</div>

			<div class="paytable-note">
				🎲 Ogni riga è indipendente &middot; Si può vincere su più righe contemporaneamente
			</div>
		</div>

		<p class="disclaimer">
			🐾 Gli animali ringraziano per le donazioni &nbsp;·&nbsp; Nessun animale è stato ferito durante questo gioco
		</p>
	</div>
</main>

<!-- ── WIN OVERLAY ── -->
{#if showWin && vinciteLinee.length > 0}
	{#each particles as p (p.id)}
		<div
			class="particle"
			class:from-bottom={p.fromBottom}
			style="
				left: {p.x}%;
				font-size: {p.size}rem;
				animation-delay: {p.delay}s;
				animation-duration: {p.dur}s;
			"
		>
			{p.emoji}
		</div>
	{/each}

	<div
		class="win-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Hai vinto!"
		onclick={chiudiWin}
		onkeydown={(e) => e.key === 'Enter' && chiudiWin()}
		tabindex="0"
		style="--win-colore: {animaleVincente.colore}"
	>
		<div class="win-box" onclick={(e) => e.stopPropagation()}>
			{#if vinciteLinee.length === 1}
				<!-- Vincita singola -->
				<div class="win-tris">
					{vinciteLinee[0].animale.emoji}{vinciteLinee[0].animale.emoji}{vinciteLinee[0].animale.emoji}
				</div>
				<div class="win-line-tag">LINEA {vinciteLinee[0].linea + 1}</div>
				{#if vinciteLinee[0].animale.premio === 500}
					<div class="win-jackpot win-luisa">🦁 LEGGENDA ASSOLUTA 🦁</div>
					<div class="win-grido">LUISA REGNA!</div>
					<div class="win-nome">La Leonessa ha colpito — praticamente impossibile</div>
				{:else}
					<div class="win-jackpot">✨ JACKPOT! ✨</div>
					<div class="win-grido">{vinciteLinee[0].animale.grido}</div>
					<div class="win-nome">{vinciteLinee[0].animale.nome} porta fortuna!</div>
				{/if}
			{:else}
				<!-- Multi vincita -->
				<div class="win-multi-title">🎊 MULTI WIN! 🎊</div>
				<div class="win-multi-list">
					{#each vinciteLinee as v}
						<div class="win-multi-row">
							<span class="win-multi-tris">{v.animale.emoji}{v.animale.emoji}{v.animale.emoji}</span>
							<span class="win-multi-info">
								<span class="win-multi-nome">{v.animale.nome}</span>
								<span class="win-multi-linea">Linea {v.linea + 1}</span>
							</span>
							<span class="win-multi-prize">+€{v.animale.premio}</span>
						</div>
					{/each}
				</div>
			{/if}

			<div class="win-sub">Sei un animale fortunato! 🐾</div>
			<div class="win-premio">+€{totalPremioVinto}.00 vinti! 💰</div>
			<button class="win-close" onclick={chiudiWin}>Continua a giocare →</button>
		</div>
	</div>
{/if}

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
		opacity: 0.18;
	}
	.blob-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #e8b84b, transparent);
		top: -120px;
		left: -100px;
		animation: blobDrift1 18s ease-in-out infinite alternate;
	}
	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #4a90e8, transparent);
		bottom: 0;
		right: -80px;
		animation: blobDrift2 22s ease-in-out infinite alternate;
	}
	.blob-3 {
		width: 350px;
		height: 350px;
		background: radial-gradient(circle, #c84a4a, transparent);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: blobDrift3 16s ease-in-out infinite alternate;
	}
	@keyframes blobDrift1 {
		to { transform: translate(60px, 40px); }
	}
	@keyframes blobDrift2 {
		to { transform: translate(-50px, -30px); }
	}
	@keyframes blobDrift3 {
		to { transform: translate(-45%, -55%); }
	}

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 2rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
		color: #f0f0f0;
	}

	/* ── HEADER ── */
	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}
	.back-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #bbb;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
		align-self: flex-start;
	}
	.back-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
	}
	.title-icon {
		font-size: 2.5rem;
		animation: iconPulse 2s ease-in-out infinite;
	}
	@keyframes iconPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.12); }
	}
	.title-text {
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.1;
		background: linear-gradient(135deg, #ffd700, #e8b84b, #ff9a00);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.subtitle {
		color: #999;
		font-size: 0.85rem;
		margin: 0;
	}

	/* ── WALLET BAR ── */
	.wallet-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1.2rem;
		background: rgba(255, 215, 0, 0.08);
		border: 1px solid rgba(255, 215, 0, 0.25);
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
	}
	.wallet-icon { font-size: 1.2rem; }
	.wallet-saldo {
		font-size: 1.3rem;
		font-weight: 900;
		color: #ffd700;
		letter-spacing: 0.02em;
		flex: 1;
	}
	.wallet-costo {
		font-size: 0.75rem;
		color: rgba(255, 215, 0, 0.5);
	}

	/* ── MACHINE ── */
	.machine-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 480px;
	}
	.machine {
		background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		border: 2px solid rgba(255, 215, 0, 0.3);
		border-radius: 24px;
		padding: 1.5rem;
		width: 100%;
		box-shadow:
			0 0 40px rgba(232, 184, 75, 0.15),
			0 0 80px rgba(232, 184, 75, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── LUCI ── */
	.machine-lights {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}
	.light {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ffd700;
		box-shadow: 0 0 8px #ffd700;
		animation: lightBlink 1.2s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.13s);
	}
	@keyframes lightBlink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.15; }
	}
	.bottom-lights .light {
		animation-direction: reverse;
	}

	/* ── REELS AREA (3 paylines) ── */
	.reels-area {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 0.4rem;
	}

	/* Etichette numeriche sinistra */
	.payline-labels {
		display: flex;
		flex-direction: column;
		justify-content: stretch;
	}
	.pl-row {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80px;
	}
	.pl-num {
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: rgba(255, 215, 0, 0.3);
		transition: color 0.3s, text-shadow 0.3s;
		writing-mode: horizontal-tb;
	}
	.pl-row.pl-win .pl-num {
		color: #ffd700;
		text-shadow: 0 0 10px #ffd700, 0 0 20px rgba(255, 215, 0, 0.5);
		animation: plNumPulse 0.6s ease-in-out infinite alternate;
	}
	@keyframes plNumPulse {
		from { transform: scale(1); }
		to { transform: scale(1.15); }
	}

	/* Badge vincita destra */
	.payline-wins {
		display: flex;
		flex-direction: column;
		justify-content: stretch;
	}
	.pl-win-badge {
		flex: 1;
		min-height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #ffd700;
		opacity: 0;
		transition: opacity 0.2s;
		min-width: 32px;
	}
	.pl-win-badge.visible {
		opacity: 1;
		text-shadow: 0 0 10px #ffd700;
		animation: winBadgePulse 0.5s ease-in-out infinite alternate;
	}
	@keyframes winBadgePulse {
		from { opacity: 0.7; }
		to { opacity: 1; transform: scale(1.08); }
	}

	/* ── REELS ── */
	.reels-row {
		display: flex;
		gap: 0.6rem;
		justify-content: center;
		position: relative;
		flex: 1;
	}

	/* Overlay linee orizzontali */
	.paylines-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		pointer-events: none;
		z-index: 2;
	}
	.overlay-row {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 0 0.3rem;
	}
	.overlay-line {
		width: 100%;
		height: 1px;
		background: linear-gradient(
			90deg,
			rgba(255, 215, 0, 0.25) 0%,
			transparent 15%,
			transparent 85%,
			rgba(255, 215, 0, 0.25) 100%
		);
		transition: all 0.3s;
	}
	.overlay-row.overlay-win .overlay-line {
		height: 2px;
		background: linear-gradient(
			90deg,
			rgba(255, 215, 0, 0.8) 0%,
			rgba(255, 215, 0, 0.2) 12%,
			rgba(255, 215, 0, 0.2) 88%,
			rgba(255, 215, 0, 0.8) 100%
		);
		box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
	}

	/* Singolo reel */
	.reel {
		flex: 1;
		max-width: 96px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		transition: border-color 0.3s;
	}
	.reel.spinning {
		border-color: rgba(255, 215, 0, 0.4);
		animation: reelShake 0.07s linear infinite;
	}
	.reel.settled {
		animation: reelBounce 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}
	@keyframes reelShake {
		0%, 100% { transform: translateY(0); }
		25% { transform: translateY(-2px); }
		75% { transform: translateY(2px); }
	}
	@keyframes reelBounce {
		0% { transform: translateY(-10px); }
		40% { transform: translateY(4px); }
		70% { transform: translateY(-2px); }
		100% { transform: translateY(0); }
	}

	.sym-cell {
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		transition: background 0.3s, border-color 0.3s;
		position: relative;
	}
	.sym-cell:last-child {
		border-bottom: none;
	}
	.sym-cell.row-win {
		background: rgba(255, 215, 0, 0.12);
		border-top: 2px solid rgba(255, 215, 0, 0.55) !important;
		border-bottom: 2px solid rgba(255, 215, 0, 0.55) !important;
	}

	.sym-emoji {
		font-size: 2.6rem;
		line-height: 1;
		display: block;
		transition: filter 0.1s;
		position: relative;
		z-index: 3;
	}
	.spinning .sym-emoji {
		filter: blur(1.5px);
	}

	/* ── CONTROLLI ── */
	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.spin-btn {
		width: 100%;
		padding: 1rem 1.5rem;
		border-radius: 14px;
		border: none;
		font-size: 1.2rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		cursor: pointer;
		background: linear-gradient(135deg, #ffd700, #e8961a);
		color: #1a1a1a;
		box-shadow:
			0 4px 20px rgba(255, 215, 0, 0.4),
			0 1px 0 rgba(255, 255, 255, 0.3) inset;
		transition: all 0.15s;
		position: relative;
		overflow: hidden;
	}
	.spin-btn::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.spin-btn:hover:not(:disabled)::after { opacity: 1; }
	.spin-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow:
			0 6px 28px rgba(255, 215, 0, 0.5),
			0 1px 0 rgba(255, 255, 255, 0.3) inset;
	}
	.spin-btn:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow: 0 2px 10px rgba(255, 215, 0, 0.3);
	}
	.spin-btn.spinning,
	.spin-btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}
	.spin-icon {
		display: inline-block;
		animation: rotate 0.7s linear infinite;
	}
	@keyframes rotate { to { transform: rotate(360deg); } }

	/* Messaggio perdita */
	.lose-msg {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		background: rgba(255, 80, 80, 0.08);
		border: 1px solid rgba(255, 80, 80, 0.2);
		border-radius: 10px;
		font-size: 0.88rem;
		color: #ff9999;
		animation: fadeIn 0.3s ease;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── TABELLA PREMI ── */
	.paytable {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 215, 0, 0.18);
		border-radius: 18px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.paytable-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: rgba(255, 215, 0, 0.8);
		text-transform: uppercase;
	}
	.paytable-sub {
		margin: 0;
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.paytable-tiers {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.tier-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.8rem;
		background: color-mix(in srgb, var(--tier-color) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--tier-color) 30%, transparent);
		border-radius: 12px;
		transition: background 0.2s;
	}
	.tier-row:hover {
		background: color-mix(in srgb, var(--tier-color) 14%, transparent);
	}
	.tier-luisa {
		border-width: 2px;
		background: color-mix(in srgb, #d4a020 14%, transparent);
		animation: luisaGlow 2s ease-in-out infinite alternate;
	}
	.tier-luisa .tier-prize {
		font-size: 1.1rem;
	}
	@keyframes luisaGlow {
		from { box-shadow: 0 0 6px rgba(212, 160, 32, 0.2); }
		to   { box-shadow: 0 0 22px rgba(212, 160, 32, 0.55); }
	}
	.tier-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 110px;
	}
	.tier-icon { font-size: 1.1rem; }
	.tier-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.tier-label {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: var(--tier-color);
	}
	.tier-prob {
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.tier-symbols {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
		flex: 1;
	}
	.tier-sym {
		font-size: 1.15rem;
		line-height: 1;
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--tier-color) 50%, transparent));
	}
	.tier-prize {
		font-size: 0.9rem;
		font-weight: 900;
		color: var(--tier-color);
		text-shadow: 0 0 10px color-mix(in srgb, var(--tier-color) 50%, transparent);
		min-width: 38px;
		text-align: right;
	}
	.paytable-note {
		font-size: 0.67rem;
		color: rgba(255, 255, 255, 0.25);
		text-align: center;
		line-height: 1.5;
	}

	.disclaimer {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.72rem;
		text-align: center;
		line-height: 1.6;
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

	/* ── WIN OVERLAY ── */
	.win-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: overlayIn 0.3s ease;
	}
	@keyframes overlayIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.win-box {
		background: linear-gradient(160deg, #1a1a2e, #16213e);
		border: 2px solid var(--win-colore);
		border-radius: 28px;
		padding: 2.5rem 2rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		box-shadow:
			0 0 60px color-mix(in srgb, var(--win-colore) 40%, transparent),
			0 0 120px color-mix(in srgb, var(--win-colore) 20%, transparent);
		animation: winBoxIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes winBoxIn {
		from { opacity: 0; transform: scale(0.5) rotate(-5deg); }
		to { opacity: 1; transform: scale(1) rotate(0deg); }
	}

	/* Vincita singola */
	.win-tris {
		font-size: 3.5rem;
		line-height: 1;
		letter-spacing: 0.1em;
		animation: trisPulse 0.8s ease-in-out infinite alternate;
	}
	@keyframes trisPulse {
		from { transform: scale(1); filter: drop-shadow(0 0 8px var(--win-colore)); }
		to { transform: scale(1.12); filter: drop-shadow(0 0 24px var(--win-colore)); }
	}
	.win-line-tag {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: rgba(255, 215, 0, 0.7);
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.3);
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
	}
	.win-jackpot {
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		background: linear-gradient(135deg, #ffd700, #ff9a00, #ffd700);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: shimmer 1.5s linear infinite;
	}
	@keyframes shimmer {
		0% { background-position: 0% 50%; }
		100% { background-position: 200% 50%; }
	}
	.win-luisa {
		font-size: 1.6rem;
		background: linear-gradient(135deg, #d4a020, #ffd700, #fff8dc, #ffd700, #d4a020);
		background-size: 300% 300%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: luisaShimmer 1.2s linear infinite;
		text-shadow: none;
	}
	@keyframes luisaShimmer {
		0% { background-position: 0% 50%; }
		100% { background-position: 300% 50%; }
	}
	.win-grido {
		font-size: 1.8rem;
		font-weight: 900;
		color: var(--win-colore);
		text-shadow: 0 0 20px var(--win-colore);
		animation: gridoPulse 0.6s ease-in-out infinite alternate;
	}
	@keyframes gridoPulse {
		from { transform: scale(1); }
		to { transform: scale(1.06); }
	}
	.win-nome {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f0f0f0;
	}

	/* Multi vincita */
	.win-multi-title {
		font-size: 1.8rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		background: linear-gradient(135deg, #ffd700, #ff9a00, #ffd700);
		background-size: 200%;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: shimmer 1.5s linear infinite;
	}
	.win-multi-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}
	.win-multi-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 215, 0, 0.2);
		border-radius: 12px;
		padding: 0.5rem 0.75rem;
	}
	.win-multi-tris {
		font-size: 1.4rem;
		letter-spacing: 0.05em;
	}
	.win-multi-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1;
		text-align: left;
	}
	.win-multi-nome {
		font-size: 0.8rem;
		font-weight: 700;
		color: #f0f0f0;
	}
	.win-multi-linea {
		font-size: 0.65rem;
		color: rgba(255, 215, 0, 0.6);
	}
	.win-multi-prize {
		font-size: 1rem;
		font-weight: 900;
		color: #ffd700;
	}

	.win-sub {
		font-size: 0.78rem;
		color: #666;
	}
	.win-premio {
		font-size: 1.2rem;
		font-weight: 800;
		color: #ffd700;
		text-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
		animation: gridoPulse 0.6s ease-in-out infinite alternate;
	}
	.win-close {
		margin-top: 0.5rem;
		padding: 0.75rem 2rem;
		background: linear-gradient(135deg, var(--win-colore), color-mix(in srgb, var(--win-colore) 70%, #000));
		border: none;
		border-radius: 12px;
		color: #fff;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 16px color-mix(in srgb, var(--win-colore) 40%, transparent);
	}
	.win-close:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 24px color-mix(in srgb, var(--win-colore) 60%, transparent);
	}

	@media (max-width: 480px) {
		.title-text { font-size: 1.6rem; }
		.reel { max-width: 78px; }
		.sym-emoji { font-size: 2.1rem; }
		.sym-cell { height: 70px; }
		.pl-row { min-height: 70px; }
		.pl-win-badge { min-height: 70px; }
		.reels-row { gap: 0.4rem; }
		.tier-left { min-width: 90px; }
	}
</style>

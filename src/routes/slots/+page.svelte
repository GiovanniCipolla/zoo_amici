<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { SLOT_SIMBOLI, WIN_PARTICLES, MAX_GIRI, gira, giriRimasti } from '$lib/slots.js';
	import { logSlotGiro } from '$lib/logger.js';
	import { unlock } from '$lib/achievements.js';

	// ── Stato ─────────────────────────────────────────────────────────
	// Ogni reel mostra 3 simboli: [top, middle(payline), bottom]
	let reels = $state([
		[SLOT_SIMBOLI[0], SLOT_SIMBOLI[3], SLOT_SIMBOLI[6]],
		[SLOT_SIMBOLI[1], SLOT_SIMBOLI[4], SLOT_SIMBOLI[7]],
		[SLOT_SIMBOLI[2], SLOT_SIMBOLI[5], SLOT_SIMBOLI[8]]
	]);

	let reelSpinning = $state([false, false, false]);
	let reelSettled = $state([false, false, false]);
	let spinning = $state(false);
	let vincita = $state(false);
	let animaleVincente = $state(null);
	let showWin = $state(false);
	let giriOggi = $state(MAX_GIRI);
	let esaurito = $state(false);
	let particles = $state([]);
	let ultimoRisultato = $state(null); // [sym, sym, sym] dell'ultimo giro

	const intervals = [null, null, null];

	onMount(() => {
		if (!browser) return;
		giriOggi = giriRimasti();
		esaurito = giriOggi <= 0;
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
		// Animazione rimbalzo alla fermata
		setTimeout(() => {
			reelSettled[i] = true;
			setTimeout(() => {
				reelSettled[i] = false;
			}, 500);
		}, 10);
	}

	function buildParticles(animale) {
		const cfg = WIN_PARTICLES[animale.tipo] ?? { emoji: '✨', extra: '⭐' };
		return Array.from({ length: 20 }, (_, i) => ({
			id: i,
			emoji: i % 3 === 0 ? cfg.extra : cfg.emoji,
			x: 5 + Math.random() * 90,
			delay: Math.random() * 1.2,
			dur: 1.8 + Math.random() * 1.4,
			size: 1.2 + Math.random() * 1.2,
			fromBottom: i % 2 === 0
		}));
	}

	async function handleGira() {
		if (spinning || esaurito) return;

		// Reset stato precedente
		vincita = false;
		animaleVincente = null;
		showWin = false;
		ultimoRisultato = null;
		particles = [];

		const risultato = gira();

		if (risultato.esaurito) {
			esaurito = true;
			return;
		}

		giriOggi = giriRimasti();
		esaurito = giriOggi <= 0;

		unlock('giocatore');

		spinning = true;

		// Avvia tutti e 3 i reel
		startReel(0);
		startReel(1);
		startReel(2);

		const s = risultato.simboli;

		// Ferma i reel in cascata: 1.5s → 2.3s → 3.1s
		setTimeout(() => {
			stopReel(0, [randomSym(), s[0], randomSym()]);
		}, 1500);

		setTimeout(() => {
			stopReel(1, [randomSym(), s[1], randomSym()]);
		}, 2300);

		setTimeout(async () => {
			stopReel(2, [randomSym(), s[2], randomSym()]);
			spinning = false;
			ultimoRisultato = s;

			vincita = risultato.vincita;
			animaleVincente = risultato.animale;

			if (vincita) {
				unlock('fortunello');
				particles = buildParticles(animaleVincente);
				setTimeout(() => {
					showWin = true;
				}, 350);
			}

			// Log Discord (fire-and-forget)
			logSlotGiro({
				simboli: risultato.simboli,
				vincita: risultato.vincita,
				animale: risultato.animale,
				giriRimasti: giriOggi
			});
		}, 3100);
	}

	function chiudiWin() {
		showWin = false;
		particles = [];
	}
</script>

<!-- Sfondo blob identico alla main page -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<!-- ── HEADER ── -->
	<header>
		<button class="back-btn" onclick={() => goto('/')}>← Torna alla classifica</button>
		<h1>
			<span class="title-icon">🎰</span>
			<span class="title-text">Slot Machine<br />Animalesca</span>
		</h1>
		<p class="subtitle">Tris = vincita &middot; 2% di probabilità &middot; {MAX_GIRI} giri al giorno</p>
	</header>

	<!-- ── MACHINE ── -->
	<div class="machine-wrap">
		<div class="machine">
			<!-- Luce decorativa in cima -->
			<div class="machine-lights" aria-hidden="true">
				{#each Array(7) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>

			<!-- REELS -->
			<div class="reels-area">
				<!-- Indicatore payline -->
				<div class="payline-bar" aria-hidden="true">
					<div class="payline-line"></div>
					<span class="payline-label">PAYLINE</span>
					<div class="payline-line"></div>
				</div>

				<div class="reels-row">
					{#each reels as reel, ri}
						<div
							class="reel"
							class:spinning={reelSpinning[ri]}
							class:settled={reelSettled[ri]}
							class:won={vincita && ultimoRisultato !== null}
						>
							{#each reel as sym, si}
								<div
									class="sym-cell"
									class:payline-cell={si === 1}
									class:top-cell={si === 0}
									class:bot-cell={si === 2}
								>
									<span class="sym-emoji">{sym.emoji}</span>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>

			<!-- CONTROLLI -->
			<div class="controls">
				<button
					class="spin-btn"
					class:spinning
					class:disabled={esaurito}
					onclick={handleGira}
					disabled={spinning || esaurito}
					aria-label="Gira la slot machine"
				>
					{#if spinning}
						<span class="spin-icon">⟳</span> Girando...
					{:else if esaurito}
						🚫 Giri esauriti
					{:else}
						🎰 GIRA!
					{/if}
				</button>

				<!-- Contatore giri -->
				<div class="giri-counter">
					<div class="giri-dots">
						{#each Array(MAX_GIRI) as _, i}
							<div class="dot" class:used={i >= giriOggi}></div>
						{/each}
					</div>
					<span class="giri-label">
						{#if esaurito}
							Torni domani! 🌙
						{:else}
							{giriOggi} gir{giriOggi === 1 ? 'o' : 'i'} rimast{giriOggi === 1 ? 'o' : 'i'} oggi
						{/if}
					</span>
				</div>
			</div>

			<!-- Risultato ultimo giro (senza vincita) -->
			{#if ultimoRisultato && !vincita}
				<div class="lose-msg">
					<span>Quasi...</span>
					<span class="lose-syms">{ultimoRisultato.map((s) => s.emoji).join('  ')}</span>
				</div>
			{/if}

			<!-- Luce decorativa in fondo -->
			<div class="machine-lights bottom-lights" aria-hidden="true">
				{#each Array(7) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>
		</div>

		<p class="disclaimer">
			🐾 Gli animali ringraziano per le donazioni &nbsp;·&nbsp; Nessun animale è stato ferito durante questo gioco
		</p>
	</div>
</main>

<!-- ── WIN OVERLAY ── -->
{#if showWin && animaleVincente}
	<!-- particelle -->
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
		<div class="win-box" onclick|stopPropagation>
			<div class="win-tris">
				{animaleVincente.emoji}{animaleVincente.emoji}{animaleVincente.emoji}
			</div>
			<div class="win-jackpot">✨ JACKPOT! ✨</div>
			<div class="win-grido">{animaleVincente.grido}</div>
			<div class="win-nome">{animaleVincente.nome} porta fortuna!</div>
			<div class="win-sub">Probabilità: 2% &middot; Sei un animale fortunato</div>
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
		to {
			transform: translate(60px, 40px);
		}
	}
	@keyframes blobDrift2 {
		to {
			transform: translate(-50px, -30px);
		}
	}
	@keyframes blobDrift3 {
		to {
			transform: translate(-45%, -55%);
		}
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
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.12);
		}
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

	/* ── MACHINE ── */
	.machine-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 440px;
	}
	.machine {
		background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		border: 2px solid rgba(255, 215, 0, 0.3);
		border-radius: 24px;
		padding: 1.5rem 1.5rem 1.5rem;
		width: 100%;
		box-shadow:
			0 0 40px rgba(232, 184, 75, 0.15),
			0 0 80px rgba(232, 184, 75, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Luci decorative */
	.machine-lights {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}
	.light {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ffd700;
		box-shadow: 0 0 8px #ffd700;
		animation: lightBlink 1.2s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.17s);
	}
	@keyframes lightBlink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.2;
		}
	}
	.bottom-lights .light {
		animation-direction: reverse;
	}

	/* ── REELS ── */
	.reels-area {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.payline-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}
	.payline-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent);
	}
	.payline-label {
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: rgba(255, 215, 0, 0.6);
		font-weight: 700;
	}
	.reels-row {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	/* Singolo reel */
	.reel {
		width: 96px;
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
	.reel.won .payline-cell {
		background: rgba(255, 215, 0, 0.15);
		border-color: rgba(255, 215, 0, 0.7);
	}

	@keyframes reelShake {
		0%,
		100% {
			transform: translateY(0);
		}
		25% {
			transform: translateY(-2px);
		}
		75% {
			transform: translateY(2px);
		}
	}
	@keyframes reelBounce {
		0% {
			transform: translateY(-10px);
		}
		40% {
			transform: translateY(4px);
		}
		70% {
			transform: translateY(-2px);
		}
		100% {
			transform: translateY(0);
		}
	}

	.sym-cell {
		height: 88px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		transition: background 0.2s;
	}
	.sym-cell:last-child {
		border-bottom: none;
	}
	.payline-cell {
		border-top: 2px solid rgba(255, 215, 0, 0.35);
		border-bottom: 2px solid rgba(255, 215, 0, 0.35);
		background: rgba(255, 215, 0, 0.04);
	}
	.top-cell,
	.bot-cell {
		opacity: 0.38;
	}

	.sym-emoji {
		font-size: 2.8rem;
		line-height: 1;
		display: block;
		transition: filter 0.1s;
	}
	.spinning .sym-emoji {
		filter: blur(1.5px);
	}
	.spinning .payline-cell .sym-emoji {
		filter: blur(0.6px);
	}

	/* ── CONTROLLI ── */
	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
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
	.spin-btn:hover:not(:disabled)::after {
		opacity: 1;
	}
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
	@keyframes rotate {
		to {
			transform: rotate(360deg);
		}
	}

	/* Giri counter */
	.giri-counter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.giri-dots {
		display: flex;
		gap: 0.4rem;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ffd700;
		box-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
		transition: all 0.3s;
	}
	.dot.used {
		background: rgba(255, 255, 255, 0.12);
		box-shadow: none;
	}
	.giri-label {
		font-size: 0.8rem;
		color: #999;
	}

	/* Messaggio perdita */
	.lose-msg {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: rgba(255, 80, 80, 0.08);
		border: 1px solid rgba(255, 80, 80, 0.2);
		border-radius: 10px;
		font-size: 0.9rem;
		color: #ff9999;
		animation: fadeIn 0.3s ease;
	}
	.lose-syms {
		font-size: 1.1rem;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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
		0% {
			transform: translateY(0) rotate(0deg) scale(0.5);
			opacity: 0;
		}
		10% {
			opacity: 1;
			transform: translateY(10vh) rotate(30deg) scale(1);
		}
		80% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(110vh) rotate(720deg) scale(0.8);
			opacity: 0;
		}
	}
	@keyframes particleRise {
		0% {
			transform: translateY(0) rotate(0deg) scale(0.5);
			opacity: 0;
		}
		10% {
			opacity: 1;
			transform: translateY(-10vh) rotate(-30deg) scale(1);
		}
		80% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(-110vh) rotate(-720deg) scale(0.8);
			opacity: 0;
		}
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
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.win-box {
		background: linear-gradient(160deg, #1a1a2e, #16213e);
		border: 2px solid var(--win-colore);
		border-radius: 28px;
		padding: 2.5rem 2rem;
		max-width: 380px;
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
		from {
			opacity: 0;
			transform: scale(0.5) rotate(-5deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	.win-tris {
		font-size: 3.5rem;
		line-height: 1;
		animation: trisPulse 0.8s ease-in-out infinite alternate;
		letter-spacing: 0.1em;
	}
	@keyframes trisPulse {
		from {
			transform: scale(1);
			filter: drop-shadow(0 0 8px var(--win-colore));
		}
		to {
			transform: scale(1.12);
			filter: drop-shadow(0 0 24px var(--win-colore));
		}
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
		0% {
			background-position: 0% 50%;
		}
		100% {
			background-position: 200% 50%;
		}
	}

	.win-grido {
		font-size: 1.8rem;
		font-weight: 900;
		color: var(--win-colore);
		text-shadow: 0 0 20px var(--win-colore);
		animation: gridoPulse 0.6s ease-in-out infinite alternate;
	}
	@keyframes gridoPulse {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.06);
		}
	}

	.win-nome {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f0f0f0;
	}

	.win-sub {
		font-size: 0.78rem;
		color: #666;
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
		.title-text {
			font-size: 1.6rem;
		}
		.reel {
			width: 82px;
		}
		.sym-emoji {
			font-size: 2.3rem;
		}
		.sym-cell {
			height: 76px;
		}
		.reels-row {
			gap: 0.5rem;
		}
	}
</style>

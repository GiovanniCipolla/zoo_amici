<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import { unlock } from '$lib/achievements.js';

	// ── COSTANTI DI GIOCO ────────────────────────────────────
	const CW = 360;
	const CH = 580;
	const BIRD_X = 80;
	const BIRD_R = 14;      // raggio collisione
	const GRAVITY = 0.52;
	const FLAP_V = -10;
	const PIPE_W = 54;
	const BASE_SPD = 2.8;   // velocità iniziale tubi
	const BASE_GAP = 152;   // apertura iniziale tubi
	const MIN_GAP = 95;     // apertura minima
	const ACCEL = 0.06;     // aumento velocità per punto
	const GAP_SHRINK = 1.3; // riduzione gap per punto
	const SPAWN_INT = 88;   // frame tra un tubo e l'altro

	// ── STATO SVELTE ────────────────────────────────────────
	let phase = $state('select'); // 'select' | 'game'
	let membro = $state(null);
	let score = $state(0);
	let bests = $state({});

	// ── REF CANVAS ──────────────────────────────────────────
	let canvas;
	let ctx = null;
	let raf = null;

	// ── STATO INTERNO GIOCO (non reattivo) ──────────────────
	let gState = 'ready'; // 'ready' | 'playing' | 'dead'
	let birdY = CH * 0.42;
	let birdVel = 0;
	let pipes = [];
	let frame = 0;
	let pts = 0;
	let stars = [];
	let deadScore = 0;
	let isNewRecord = false;

	// ── STELLE DI SFONDO ─────────────────────────────────────
	function initStars() {
		stars = Array.from({ length: 55 }, () => ({
			x: Math.random() * CW,
			y: Math.random() * CH * 0.75,
			r: Math.random() * 1.4 + 0.3,
			a: Math.random() * 0.6 + 0.3,
			spd: Math.random() * 0.18 + 0.08
		}));
	}

	// ── AVVIO GIOCO (quando canvas è pronto) ─────────────────
	$effect(() => {
		if (phase === 'game' && membro) {
			tick().then(() => {
				if (canvas) {
					ctx = canvas.getContext('2d');
					initGame();
				}
			});
		}
	});

	function initGame() {
		birdY = CH * 0.42;
		birdVel = 0;
		pipes = [];
		frame = 0;
		pts = 0;
		score = 0;
		deadScore = 0;
		isNewRecord = false;
		gState = 'ready';
		initStars();
		if (raf) cancelAnimationFrame(raf);
		raf = requestAnimationFrame(loop);
	}

	// ── AZIONE FLAP ─────────────────────────────────────────
	function flap() {
		if (gState === 'ready') {
			gState = 'playing';
			birdVel = FLAP_V;
		} else if (gState === 'playing') {
			birdVel = FLAP_V;
		} else if (gState === 'dead') {
			birdY = CH * 0.42;
			birdVel = FLAP_V;
			pipes = [];
			frame = 0;
			pts = 0;
			score = 0;
			deadScore = 0;
			isNewRecord = false;
			gState = 'playing';
		}
	}

	// ── GAME LOOP ────────────────────────────────────────────
	function loop() {
		if (gState === 'playing') update();
		draw();
		raf = requestAnimationFrame(loop);
	}

	function update() {
		frame++;

		// Fisica
		birdVel += GRAVITY;
		birdY += birdVel;

		// Scorrimento stelle
		for (const s of stars) {
			s.x -= s.spd;
			if (s.x < 0) s.x = CW;
		}

		// Spawn tubi
		if (frame % SPAWN_INT === 1) {
			const gap = Math.max(MIN_GAP, BASE_GAP - pts * GAP_SHRINK);
			const top = 55 + Math.random() * (CH - 75 - gap - 50);
			pipes.push({ x: CW + PIPE_W, top, gap, scored: false });
		}

		// Movimento tubi + punteggio
		const spd = BASE_SPD + pts * ACCEL;
		for (const p of pipes) {
			p.x -= spd;
			if (!p.scored && p.x + PIPE_W < BIRD_X) {
				p.scored = true;
				pts++;
				score = pts;
				handleScore(pts);
			}
		}
		pipes = pipes.filter((p) => p.x > -PIPE_W - 4);

		// Collisione soffitto/pavimento
		if (birdY + BIRD_R > CH - 34 || birdY - BIRD_R < 4) {
			die();
			return;
		}

		// Collisione tubi
		for (const p of pipes) {
			if (BIRD_X + BIRD_R > p.x + 4 && BIRD_X - BIRD_R < p.x + PIPE_W - 4) {
				if (birdY - BIRD_R < p.top || birdY + BIRD_R > p.top + p.gap) {
					die();
					return;
				}
			}
		}
	}

	function handleScore(s) {
		if (s === 1) unlock('primo_volo');
		if (s === 10) unlock('volatile');
		if (s === 50) unlock('acrobata_del_cielo');
		if (s === 100) unlock('dio_del_volo');
	}

	function die() {
		gState = 'dead';
		deadScore = pts;
		saveBest(membro.nome, pts);
	}

	function saveBest(nome, s) {
		if (!browser) return;
		try {
			const saved = JSON.parse(localStorage.getItem('zoo_flappy_scores') ?? '{}');
			isNewRecord = s > 0 && s >= (saved[nome] ?? 0);
			if (s > (saved[nome] ?? 0)) saved[nome] = s;
			localStorage.setItem('zoo_flappy_scores', JSON.stringify(saved));
			bests = { ...saved };
			if (membri.every((m) => (saved[m.nome] ?? 0) >= 10)) unlock('zoo_volante');
		} catch {}
	}

	// ── DISEGNO ──────────────────────────────────────────────
	function draw() {
		if (!ctx) return;

		// Sfondo
		const bg = ctx.createLinearGradient(0, 0, 0, CH);
		bg.addColorStop(0, '#050d1a');
		bg.addColorStop(0.65, '#0d1f38');
		bg.addColorStop(1, '#091525');
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, CW, CH);

		// Stelle
		for (const s of stars) {
			ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(frame * 0.025 + s.x * 0.05));
			ctx.beginPath();
			ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
			ctx.fillStyle = '#fff';
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// Luna
		ctx.font = '28px serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('🌕', CW - 52, 52);

		// Terreno
		ctx.fillStyle = '#0f2a08';
		ctx.fillRect(0, CH - 34, CW, 34);
		const grassGrad = ctx.createLinearGradient(0, CH - 40, 0, CH - 32);
		grassGrad.addColorStop(0, '#2d6420');
		grassGrad.addColorStop(1, '#1a3d10');
		ctx.fillStyle = grassGrad;
		ctx.fillRect(0, CH - 40, CW, 8);

		// Tubi
		for (const p of pipes) drawPipe(p);

		// Uccello
		drawBird();

		// Punteggio corrente (centro)
		if (gState !== 'ready') {
			ctx.font = 'bold 42px "Bebas Neue", Impact, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.fillStyle = 'rgba(0,0,0,0.4)';
			ctx.fillText(pts, CW / 2 + 2, 57);
			ctx.fillStyle = '#ffffff';
			ctx.fillText(pts, CW / 2, 55);
		}

		// Miglior punteggio (alto destra)
		const currentBest = bests[membro?.nome] ?? 0;
		if (currentBest > 0) {
			ctx.textAlign = 'right';
			ctx.textBaseline = 'alphabetic';
			ctx.font = '10px Outfit, sans-serif';
			ctx.fillStyle = 'rgba(255,215,0,0.38)';
			ctx.fillText('RECORD', CW - 12, 34);
			ctx.font = 'bold 24px "Bebas Neue", Impact, sans-serif';
			ctx.fillStyle = pts > currentBest ? '#ffd700' : 'rgba(255,215,0,0.65)';
			ctx.fillText(currentBest, CW - 12, 56);
		}

		// Overlay
		if (gState === 'ready') drawReadyOverlay();
		else if (gState === 'dead') drawDeadOverlay();
	}

	function drawPipe(p) {
		const { x, top, gap } = p;

		const pg = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
		pg.addColorStop(0, '#1a5210');
		pg.addColorStop(0.35, '#3a9e22');
		pg.addColorStop(0.7, '#2d8018');
		pg.addColorStop(1, '#163e0c');

		const cg = ctx.createLinearGradient(x - 5, 0, x + PIPE_W + 5, 0);
		cg.addColorStop(0, '#236014');
		cg.addColorStop(0.35, '#4abe28');
		cg.addColorStop(0.7, '#3aaa1e');
		cg.addColorStop(1, '#1a4a0e');

		// Tubo superiore
		ctx.fillStyle = pg;
		ctx.fillRect(x, 0, PIPE_W, top - 14);
		ctx.fillStyle = cg;
		ctx.fillRect(x - 5, top - 27, PIPE_W + 10, 15);

		// Tubo inferiore
		const botY = top + gap;
		ctx.fillStyle = pg;
		ctx.fillRect(x, botY + 15, PIPE_W, CH - 34 - botY - 15);
		ctx.fillStyle = cg;
		ctx.fillRect(x - 5, botY, PIPE_W + 10, 15);

		// Luccichio
		ctx.fillStyle = 'rgba(255,255,255,0.07)';
		ctx.fillRect(x + 5, 0, 7, top - 14);
		ctx.fillRect(x + 5, botY + 15, 7, CH);
	}

	function drawBird() {
		if (!membro) return;
		const angle = Math.min(Math.max(birdVel * 0.065, -0.45), 1.1);
		ctx.save();
		ctx.translate(BIRD_X, birdY);
		ctx.rotate(angle);
		ctx.shadowColor = membro.colore || '#f59e0b';
		ctx.shadowBlur = 20;
		ctx.font = '32px serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(membro.emoji, 0, 0);
		ctx.shadowBlur = 0;
		ctx.restore();
	}

	function drawReadyOverlay() {
		ctx.fillStyle = 'rgba(0,0,0,0.45)';
		ctx.fillRect(0, 0, CW, CH);
		ctx.textAlign = 'center';
		ctx.font = '52px serif';
		ctx.textBaseline = 'middle';
		ctx.fillText(membro?.emoji ?? '🐾', CW / 2, CH / 2 - 30);
		ctx.font = 'bold 26px "Bebas Neue", sans-serif';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = membro?.colore ?? '#f59e0b';
		ctx.fillText(membro?.nome?.toUpperCase() ?? '', CW / 2, CH / 2 + 20);
		ctx.font = 'bold 20px "Bebas Neue", sans-serif';
		ctx.fillStyle = '#ffffff';
		ctx.fillText('TOCCA PER VOLARE', CW / 2, CH / 2 + 52);
		ctx.font = '12px Outfit, sans-serif';
		ctx.fillStyle = 'rgba(255,255,255,0.28)';
		ctx.fillText('è più difficile di quanto pensi...', CW / 2, CH / 2 + 76);
	}

	function drawDeadOverlay() {
		ctx.fillStyle = 'rgba(0,0,0,0.65)';
		ctx.fillRect(0, 0, CW, CH);
		ctx.textAlign = 'center';
		ctx.font = 'bold 54px "Bebas Neue", sans-serif';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = '#e84b4b';
		ctx.fillText('GAME OVER', CW / 2, CH / 2 - 65);
		ctx.font = '38px serif';
		ctx.textBaseline = 'middle';
		ctx.fillText(membro?.emoji ?? '', CW / 2, CH / 2 - 16);
		ctx.font = 'bold 24px "Bebas Neue", sans-serif';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(`PUNTEGGIO: ${deadScore}`, CW / 2, CH / 2 + 26);
		const best = bests[membro?.nome] ?? 0;
		ctx.font = '13px Outfit, sans-serif';
		ctx.fillStyle = isNewRecord && deadScore > 0 ? '#ffd700' : 'rgba(255,255,255,0.42)';
		ctx.fillText(
			isNewRecord && deadScore > 0 ? `⭐ Nuovo record: ${best}!` : `Record: ${best}`,
			CW / 2,
			CH / 2 + 50
		);
		ctx.fillStyle = 'rgba(255,255,255,0.28)';
		ctx.fillText('tocca per riprovare', CW / 2, CH / 2 + 78);
	}

	// ── LIFECYCLE ────────────────────────────────────────────
	onMount(() => {
		if (!browser) return;
		try {
			bests = JSON.parse(localStorage.getItem('zoo_flappy_scores') ?? '{}');
		} catch {}
	});

	onDestroy(() => {
		if (raf) cancelAnimationFrame(raf);
	});

	// ── INPUT ────────────────────────────────────────────────
	function handleKey(e) {
		if (['Space', 'ArrowUp', 'KeyW'].includes(e.code) || e.key === ' ') {
			e.preventDefault();
			if (phase === 'game') flap();
		}
		if (e.code === 'Escape') backToSelect();
	}

	function backToSelect() {
		if (raf) { cancelAnimationFrame(raf); raf = null; }
		phase = 'select';
	}

	function selectMembro(m) {
		membro = m;
		phase = 'game';
	}

	const zooProgress = $derived(membri.filter((m) => (bests[m.nome] ?? 0) >= 10).length);
</script>

<svelte:window onkeydown={handleKey} />

<!-- Sfondo decorativo -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
</div>

{#if phase === 'select'}

	<!-- ── SCHERMATA SELEZIONE ─────────────────────────────── -->
	<div class="back-wrap">
		<a href="/minigiochi" class="back-btn">← Minigiochi</a>
	</div>

	<main class="select-main">
		<header>
			<p class="pre-title">Minigioco</p>
			<h1>
				<span class="title-icon">🦅</span>
				<span class="title-text">Flappy Zoo</span>
			</h1>
			<p class="subtitle">Scegli il tuo animale e sopravvivi il più a lungo possibile</p>

			<div class="progress-bar-wrap">
				<span class="prog-label">Zoo Volante: {zooProgress}/32</span>
				<div class="prog-track">
					<div class="prog-fill" style="width: {(zooProgress / 32) * 100}%"></div>
				</div>
				<span class="prog-hint">Supera 10 punti con ogni animale per sbloccare l'achievement</span>
			</div>
		</header>

		<div class="animal-grid">
			{#each membri as m}
				{@const best = bests[m.nome] ?? 0}
				<button
					class="animal-card"
					onclick={() => selectMembro(m)}
					style="--color: {m.colore}"
				>
					<span class="a-emoji">{m.emoji}</span>
					<span class="a-name">{m.nome}</span>
					<span class="a-best" class:has-score={best > 0} class:ten-plus={best >= 10}>
						{#if best >= 10}✓ {best}{:else if best > 0}{best}{:else}—{/if}
					</span>
				</button>
			{/each}
		</div>
	</main>

{:else}

	<!-- ── SCHERMATA DI GIOCO ──────────────────────────────── -->
	<div class="game-wrap">
		<div class="game-header">
			<button class="back-game-btn" onclick={backToSelect}>← Cambia</button>
			<span class="game-animal-info">
				<span>{membro?.emoji}</span>
				<span class="game-animal-name">{membro?.nome}</span>
			</span>
			<span class="game-best-label">Record: {bests[membro?.nome] ?? 0}</span>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="canvas-wrap" onclick={flap}>
			<canvas bind:this={canvas} width={CW} height={CH}></canvas>
		</div>

		<p class="hint-text">Clicca · Tocca · Spazio per saltare</p>
	</div>

{/if}

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
		background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
		top: -150px;
		left: -100px;
		opacity: 0.1;
		animation: drift 22s ease-in-out infinite;
	}
	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #1a56db 0%, transparent 70%);
		bottom: -100px;
		right: -80px;
		opacity: 0.08;
		animation: drift 28s ease-in-out infinite reverse;
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
			transform: translate(-20px, 40px) scale(0.95);
		}
	}

	/* ── BACK BUTTON ── */
	.back-wrap {
		position: relative;
		z-index: 10;
		padding: 1rem 1.5rem 0;
		max-width: 900px;
		margin: 0 auto;
	}
	.back-btn {
		display: inline-flex;
		align-items: center;
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
	}

	/* ── SELECT SCREEN ── */
	.select-main {
		position: relative;
		z-index: 1;
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
	}
	header {
		text-align: center;
		padding: 2.5rem 1rem 2rem;
		animation: fade-down 0.6s ease both;
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
	.pre-title {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: rgba(240, 240, 250, 0.35);
		margin-bottom: 0.75rem;
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
	@keyframes rock {
		0%,
		100% {
			transform: rotate(-5deg) scale(1);
		}
		50% {
			transform: rotate(6deg) scale(1.08);
		}
	}
	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.6rem, 7vw, 5rem);
		letter-spacing: 0.04em;
		color: #fff;
	}
	.subtitle {
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── PROGRESS BAR ── */
	.progress-bar-wrap {
		margin: 1.5rem auto 0;
		max-width: 320px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: center;
	}
	.prog-label {
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(240, 240, 250, 0.55);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.prog-track {
		width: 100%;
		height: 5px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		overflow: hidden;
	}
	.prog-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #f59e0b, #ffd700);
		transition: width 0.5s ease;
	}
	.prog-hint {
		font-size: 0.63rem;
		color: rgba(240, 240, 250, 0.22);
	}

	/* ── ANIMAL GRID ── */
	.animal-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
		gap: 0.85rem;
		animation: fade-down 0.6s ease 0.1s both;
	}
	.animal-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1rem 0.5rem 0.8rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: 'Outfit', sans-serif;
		position: relative;
		overflow: hidden;
	}
	.animal-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at 50% 0%,
			color-mix(in srgb, var(--color) 15%, transparent),
			transparent 70%
		);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.animal-card:hover {
		border-color: color-mix(in srgb, var(--color) 60%, transparent);
		transform: translateY(-3px) scale(1.05);
		box-shadow: 0 8px 28px color-mix(in srgb, var(--color) 18%, transparent);
	}
	.animal-card:hover::before {
		opacity: 1;
	}
	.a-emoji {
		font-size: 2.2rem;
		line-height: 1;
	}
	.a-name {
		font-size: 0.68rem;
		font-weight: 600;
		color: rgba(240, 240, 250, 0.7);
		line-height: 1.2;
		text-align: center;
	}
	.a-best {
		font-size: 0.62rem;
		color: rgba(240, 240, 250, 0.22);
		font-weight: 500;
	}
	.a-best.has-score {
		color: rgba(240, 240, 250, 0.52);
	}
	.a-best.ten-plus {
		color: #4ade80;
		font-weight: 700;
	}

	/* ── GAME SCREEN ── */
	.game-wrap {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100dvh;
		padding: 0.75rem 1rem 1.5rem;
		gap: 0.65rem;
	}
	.game-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		max-width: 360px;
	}
	.back-game-btn {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		color: rgba(240, 240, 250, 0.52);
		font-family: 'Outfit', sans-serif;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.18s;
	}
	.back-game-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #f0f0fa;
	}
	.game-animal-info {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.1rem;
	}
	.game-animal-name {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.1rem;
		letter-spacing: 0.06em;
		color: rgba(240, 240, 250, 0.8);
	}
	.game-best-label {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.32);
		font-family: 'Outfit', sans-serif;
	}
	.canvas-wrap {
		cursor: pointer;
		border-radius: 18px;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.07);
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		width: 100%;
		max-width: 360px;
	}
	canvas {
		display: block;
		width: 100%;
		height: auto;
	}
	.hint-text {
		font-size: 0.68rem;
		color: rgba(240, 240, 250, 0.18);
		font-family: 'Outfit', sans-serif;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		.select-main {
			padding: 0 0.8rem 3rem;
		}
		.back-wrap {
			padding: 0.7rem 0.9rem 0;
		}
		.animal-grid {
			grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
			gap: 0.6rem;
		}
		h1 {
			flex-direction: column;
			gap: 0.2rem;
		}
	}
</style>

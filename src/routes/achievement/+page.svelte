<script>
	import { onMount } from 'svelte';
	import { ACHIEVEMENTS, getUnlocked } from '$lib/achievements.js';

	let unlocked = $state([]);

	onMount(() => {
		unlocked = getUnlocked();

		// Aggiorna se un achievement viene sbloccato mentre si è su questa pagina
		function onUnlock() {
			unlocked = getUnlocked();
		}
		window.addEventListener('achievement-unlocked', onUnlock);
		return () => window.removeEventListener('achievement-unlocked', onUnlock);
	});
</script>

<!-- bg blobs decorativi -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<div class="back-wrap">
	<a href="/" class="back-btn">← Home</a>
</div>

<main>
	<header>
		<p class="pre-title">I tuoi progressi</p>
		<h1>
			<span class="title-icon">🏆</span>
			<span class="title-text">Achievement</span>
		</h1>
		<p class="subtitle">
			{unlocked.length} / {ACHIEVEMENTS.length} badge sbloccati
		</p>
	</header>

	<div class="achievements-grid">
		{#each ACHIEVEMENTS as ach}
			{@const isUnlocked = unlocked.includes(ach.id)}
			<div class="ach-card" class:unlocked={isUnlocked} class:locked={!isUnlocked}>
				<div class="ach-emoji-wrap">
					<span class="ach-emoji" class:blurred={!isUnlocked}>{ach.emoji}</span>
					{#if isUnlocked}
						<span class="ach-check" aria-label="Sbloccato">✓</span>
					{/if}
				</div>
				<p class="ach-name">{ach.nome}</p>
				<p class="ach-desc">{ach.desc}</p>
				{#if !isUnlocked}
					<p class="ach-locked-hint">🔒 Non ancora sbloccato</p>
				{/if}
			</div>
		{/each}
	</div>

	<footer>
		<p>🐾 Gli achievement si sbloccano esplorando lo zoo</p>
	</footer>
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
		width: 520px;
		height: 520px;
		background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
		top: -140px;
		left: -100px;
		opacity: 0.14;
		animation: drift 20s ease-in-out infinite;
	}

	.blob-2 {
		width: 420px;
		height: 420px;
		background: radial-gradient(circle, #1a56db 0%, transparent 70%);
		bottom: -100px;
		right: -80px;
		opacity: 0.12;
		animation: drift 24s ease-in-out infinite reverse;
	}

	.blob-3 {
		width: 280px;
		height: 280px;
		background: radial-gradient(circle, #e8b84b 0%, transparent 70%);
		top: 40%;
		left: 55%;
		opacity: 0.1;
		animation: drift 28s ease-in-out infinite 6s;
	}

	@keyframes drift {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33%       { transform: translate(50px, -40px) scale(1.07); }
		66%       { transform: translate(-30px, 50px) scale(0.94); }
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
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 3rem 1rem 2.5rem;
		animation: fade-down 0.65s ease both;
	}

	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-18px); }
		to   { opacity: 1; transform: translateY(0); }
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
		font-size: clamp(2.2rem, 5vw, 4rem);
		display: inline-block;
		animation: trophy-rock 4s ease-in-out infinite;
	}

	@keyframes trophy-rock {
		0%, 100% { transform: rotate(-4deg) scale(1); }
		50%       { transform: rotate(5deg) scale(1.06); }
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.8rem, 7.5vw, 5.5rem);
		letter-spacing: 0.04em;
		color: #fff;
	}

	.subtitle {
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── ACHIEVEMENTS GRID ── */
	.achievements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.2rem;
		animation: fade-down 0.65s ease 0.1s both;
	}

	/* ── ACH CARD ── */
	.ach-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.8rem 1.4rem 1.5rem;
		border-radius: 22px;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background: rgba(255, 255, 255, 0.04);
		text-align: center;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.ach-card.unlocked {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(232, 184, 75, 0.4);
		box-shadow: 0 4px 24px rgba(232, 184, 75, 0.1);
	}

	.ach-card.unlocked:hover {
		transform: translateY(-4px);
		box-shadow: 0 10px 36px rgba(232, 184, 75, 0.18);
	}

	.ach-card.locked {
		opacity: 0.55;
	}

	/* ── EMOJI WRAP ── */
	.ach-emoji-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.ach-emoji {
		font-size: 3rem;
		line-height: 1;
		display: block;
	}

	.ach-emoji.blurred {
		filter: grayscale(1) opacity(0.4);
	}

	.ach-check {
		position: absolute;
		bottom: -4px;
		right: -8px;
		background: #22c55e;
		color: #fff;
		font-size: 0.6rem;
		font-weight: 900;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #07070f;
	}

	/* ── TEXT ── */
	.ach-name {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		margin: 0;
	}

	.ach-card.locked .ach-name {
		color: rgba(240, 240, 250, 0.45);
	}

	.ach-desc {
		font-size: 0.75rem;
		color: rgba(240, 240, 250, 0.45);
		line-height: 1.5;
		margin: 0;
	}

	.ach-card.unlocked .ach-desc {
		color: rgba(240, 240, 250, 0.6);
	}

	.ach-locked-hint {
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.25);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
	}

	/* ── FOOTER ── */
	footer {
		text-align: center;
		color: rgba(240, 240, 250, 0.2);
		font-size: 0.75rem;
		padding-top: 3rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main { padding: 0 0.9rem 3rem; }
		.back-wrap { padding: 0.7rem 0.9rem 0; }
		.achievements-grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 0.8rem;
		}
		h1 { flex-direction: column; gap: 0.3rem; }
		.title-text { text-align: center; }
	}
</style>

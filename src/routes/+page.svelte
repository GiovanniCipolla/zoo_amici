<script>
	// Hub landing — no logic needed, pure navigation
</script>

<!-- bg blobs decorativi -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<header>
		<p class="pre-title">Benvenuto nel</p>
		<h1>
			<span class="title-icon">🐾</span>
			<span class="title-text">Zoo degli<br />Amici</span>
		</h1>
		<p class="subtitle">Scegli dove vuoi andare</p>
	</header>

	<div class="hub-grid">
		<!-- Classifica -->
		<a href="/classifica" class="hub-card card-classifica">
			<span class="card-emoji">🏅</span>
			<p class="card-title">Classifica</p>
			<p class="card-desc">Chi è l'animaletto del momento?</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Torneo -->
		<a href="/torneo" class="hub-card card-torneo">
			<span class="card-emoji">⚔️</span>
			<p class="card-title">Torneo</p>
			<p class="card-desc">Vota il tuo campione</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Minigiochi -->
		<a href="/minigiochi" class="hub-card card-minigiochi">
			<span class="card-emoji">🎰</span>
			<p class="card-title">Minigiochi</p>
			<p class="card-desc">Tenta la fortuna</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Achievement -->
		<a href="/achievement" class="hub-card card-achievement">
			<span class="card-emoji">🏆</span>
			<p class="card-title">Achievement</p>
			<p class="card-desc">Scopri i tuoi badge</p>
			<span class="card-cta">Vai →</span>
		</a>
	</div>

	<footer>
		<p>🐾 Classifica non impugnabile · Decisioni finali e inappellabili</p>
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

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
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
		font-size: clamp(2.5rem, 6vw, 5rem);
		animation: paw-rock 4s ease-in-out infinite;
		display: inline-block;
	}

	@keyframes paw-rock {
		0%, 100% { transform: rotate(-5deg) scale(1); }
		50%       { transform: rotate(6deg) scale(1.08); }
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.8rem, 7.5vw, 6rem);
		letter-spacing: 0.04em;
		color: #fff;
		text-shadow: 0 0 60px rgba(124, 58, 237, 0.2);
		text-align: left;
	}

	.subtitle {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── HUB GRID ── */
	.hub-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4rem;
		animation: fade-down 0.65s ease 0.12s both;
	}

	/* ── HUB CARD BASE ── */
	.hub-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		padding: 2.4rem 1.5rem 2rem;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 22px;
		text-decoration: none;
		color: #f0f0fa;
		text-align: center;
		transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease;
	}

	.card-emoji {
		font-size: 3.2rem;
		line-height: 1;
		transition: transform 0.22s ease;
	}

	.hub-card:hover .card-emoji {
		transform: scale(1.18) rotate(6deg);
	}

	.card-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.7rem;
		letter-spacing: 0.06em;
		color: #fff;
		margin: 0;
	}

	.card-desc {
		font-size: 0.78rem;
		color: rgba(240, 240, 250, 0.42);
		line-height: 1.5;
		margin: 0;
	}

	.card-cta {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		opacity: 0;
		transform: translateY(5px);
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.hub-card:hover .card-cta {
		opacity: 1;
		transform: translateY(0);
	}

	/* ── PER-CARD HOVER COLORS ── */
	.card-classifica:hover {
		background: rgba(124, 58, 237, 0.1);
		border-color: rgba(124, 58, 237, 0.4);
		box-shadow: 0 12px 44px rgba(124, 58, 237, 0.18);
		transform: translateY(-5px) scale(1.02);
	}
	.card-classifica .card-cta { color: #a78bfa; }

	.card-torneo:hover {
		background: rgba(232, 75, 75, 0.1);
		border-color: rgba(232, 75, 75, 0.4);
		box-shadow: 0 12px 44px rgba(232, 75, 75, 0.18);
		transform: translateY(-5px) scale(1.02);
	}
	.card-torneo .card-cta { color: #f87171; }

	.card-minigiochi:hover {
		background: rgba(255, 215, 0, 0.08);
		border-color: rgba(255, 215, 0, 0.35);
		box-shadow: 0 12px 44px rgba(255, 215, 0, 0.15);
		transform: translateY(-5px) scale(1.02);
	}
	.card-minigiochi .card-cta { color: #fbbf24; }

	.card-achievement:hover {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.35);
		box-shadow: 0 12px 44px rgba(34, 197, 94, 0.15);
		transform: translateY(-5px) scale(1.02);
	}
	.card-achievement .card-cta { color: #4ade80; }

	/* ── FOOTER ── */
	footer {
		text-align: center;
		color: rgba(240, 240, 250, 0.2);
		font-size: 0.75rem;
		padding-top: 3rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main {
			padding: 0 0.9rem 3rem;
			justify-content: flex-start;
		}
		.hub-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		header { padding: 2.5rem 1rem 2rem; }
		h1 { flex-direction: column; gap: 0.3rem; }
		.title-text { text-align: center; }
		.hub-card { padding: 1.8rem 1.4rem 1.5rem; }
		.card-emoji { font-size: 2.6rem; }
		.card-title { font-size: 1.5rem; }
	}
</style>

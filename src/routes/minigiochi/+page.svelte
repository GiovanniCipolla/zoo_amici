<script>
	import CompatibilitaAnimali from '$lib/components/CompatibilitaAnimali.svelte';
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
		<p class="pre-title">Sezione divertimento</p>
		<h1>
			<span class="title-icon">🎮</span>
			<span class="title-text">Minigiochi</span>
		</h1>
		<p class="subtitle">Sfida la fortuna con i giochi dello zoo</p>
	</header>

	<div class="cards-grid">
		<a href="/slots" class="game-card">
			<span class="card-emoji">🎰</span>
			<p class="card-title">Slot Machine</p>
			<p class="card-desc">€2 a giro · vinci premi in base al rank</p>
			<span class="card-cta">Gioca →</span>
		</a>
		<a href="/flappy" class="game-card">
			<span class="card-emoji">🦅</span>
			<p class="card-title">Flappy Zoo</p>
			<p class="card-desc">Scegli un animale · sopravvivi il più a lungo possibile</p>
			<span class="card-cta">Vola →</span>
		</a>
		<a href="/corsa" class="game-card card-corsa">
			<span class="card-emoji">🏇</span>
			<p class="card-title">Via Muraverde</p>
			<p class="card-desc">7 animali · quote random · scommetti sul vincitore</p>
			<span class="card-cta">Corri →</span>
		</a>
		<a href="/cenzino" class="game-card card-cenzino">
			<span class="card-emoji">🍺</span>
			<p class="card-title">Zoo a Cenzino</p>
			<p class="card-desc">€1 a partita · ritirati prima che l'animale sviene</p>
			<span class="card-cta">Bevi →</span>
		</a>
		<a href="/bingo" class="game-card card-bingo">
			<span class="card-emoji">🎱</span>
			<p class="card-title">Bingo a Pescara</p>
			<p class="card-desc">€0.50 a cartella · sfida i 32 animali al tavolo</p>
			<span class="card-cta">Gioca →</span>
		</a>
		<a href="/bluff" class="game-card card-bluff">
			<span class="card-emoji">🎲</span>
			<p class="card-title">Dati del Bluff</p>
			<p class="card-desc">€1–€50 · Bluffa o sfida</p>
			<span class="card-cta">Bluffa →</span>
		</a>
	</div>

	<div class="compat-section">
		<CompatibilitaAnimali />
	</div>

	<footer>
		<p>🐾 Altri minigiochi in arrivo · Resta sintonizzato</p>
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
		background: radial-gradient(circle, #ffd700 0%, transparent 70%);
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
		animation: rock 4s ease-in-out infinite;
	}

	@keyframes rock {
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

	/* ── CARDS GRID ── */
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1.4rem;
		animation: fade-down 0.65s ease 0.1s both;
	}

	/* ── GAME CARD ── */
	.game-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2.2rem 1.5rem 1.8rem;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 22px;
		text-decoration: none;
		color: #f0f0fa;
		cursor: pointer;
		transition: all 0.22s ease;
		text-align: center;
	}

	.game-card:hover {
		background: rgba(255, 215, 0, 0.08);
		border-color: rgba(255, 215, 0, 0.35);
		transform: translateY(-5px) scale(1.02);
		box-shadow: 0 12px 40px rgba(255, 215, 0, 0.15);
	}

	.card-corsa:hover {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.35);
		box-shadow: 0 12px 40px rgba(34, 197, 94, 0.15);
	}
	.card-corsa:hover .card-cta {
		color: rgba(34, 197, 94, 0.8);
	}
	.card-cenzino:hover {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.4);
		box-shadow: 0 12px 40px rgba(245, 158, 11, 0.18);
	}
	.card-cenzino:hover .card-cta {
		color: rgba(245, 158, 11, 0.8);
	}
	.card-bingo:hover {
		background: rgba(109, 40, 217, 0.1);
		border-color: rgba(109, 40, 217, 0.4);
		box-shadow: 0 12px 40px rgba(109, 40, 217, 0.18);
	}
	.card-bingo:hover .card-cta {
		color: rgba(167, 139, 250, 0.9);
	}
	.card-bluff:hover {
		background: rgba(124, 58, 237, 0.1);
		border-color: rgba(124, 58, 237, 0.4);
		box-shadow: 0 12px 40px rgba(124, 58, 237, 0.18);
	}
	.card-bluff:hover .card-cta {
		color: rgba(167, 139, 250, 0.9);
	}

	.card-emoji {
		font-size: 3.5rem;
		line-height: 1;
		transition: transform 0.22s ease;
	}

	.game-card:hover .card-emoji {
		transform: scale(1.15) rotate(5deg);
	}

	.card-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem;
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
		color: rgba(255, 215, 0, 0.6);
		opacity: 0;
		transform: translateY(4px);
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.game-card:hover .card-cta {
		opacity: 1;
		transform: translateY(0);
	}

	/* ── COMPAT SECTION ── */
	.compat-section {
		margin-top: 2rem;
		animation: fade-down 0.65s ease 0.2s both;
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
		.cards-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.8rem;
		}
		h1 { flex-direction: column; gap: 0.3rem; }
		.title-text { text-align: center; }
		header { padding: 2rem 0.5rem 1.5rem; }
		.game-card {
			padding: 1.5rem 0.8rem 1.3rem;
			gap: 0.5rem;
			border-radius: 16px;
		}
		.card-emoji { font-size: 2.4rem; }
		.card-title { font-size: 1.25rem; }
		.card-desc { font-size: 0.7rem; }
	}
</style>

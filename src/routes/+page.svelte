<script>
	import { membri } from '$lib/membri.js';
	import CardAnimal from '$lib/components/CardAnimal.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let selected = $state(null);
	let search = $state('');

	let filtered = $derived(
		search.trim() === ''
			? null
			: membri.filter(
					(m) =>
						m.nome.toLowerCase().includes(search.toLowerCase()) ||
						m.animale.toLowerCase().includes(search.toLowerCase())
				)
	);

	const podio = membri.slice(0, 3);
	const resto = membri.slice(3);

	function openModal(membro) {
		selected = membro;
	}

	function closeModal() {
		selected = null;
	}
</script>

<!-- bg blobs decorativi -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<!-- ── HEADER ── -->
	<header>
		<p class="pre-title">La classifica definitiva</p>
		<h1>
			<span class="title-icon">🏆</span>
			<span class="title-text">Classifica<br />Animalacci</span>
		</h1>
		<p class="subtitle">
			{membri.length} esemplari catalogati · Premi su un animale per scoprire di chi è
		</p>
	</header>

	<!-- ── SEARCH ── -->
	<div class="search-wrap">
		<div class="search-box">
			<span class="search-icon">🔍</span>
			<input
				type="text"
				placeholder="Cerca per nome o animale..."
				bind:value={search}
				autocomplete="off"
			/>
			{#if search}
				<button class="clear-btn" onclick={() => (search = '')} aria-label="Cancella ricerca">
					✕
				</button>
			{/if}
		</div>
	</div>

	<!-- ── RISULTATI RICERCA ── -->
	{#if filtered !== null}
		<section class="section">
			{#if filtered.length > 0}
				<p class="section-label">
					{filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'} per "{search}"
				</p>
				<div class="grid-base">
					{#each filtered as membro}
						{@const rank = membri.indexOf(membro) + 1}
						<CardAnimal {membro} {rank} onselect={openModal} />
					{/each}
				</div>
			{:else}
				<div class="empty">
					<span class="empty-emoji">🤔</span>
					<p>Nessun animalaccio trovato per "{search}"</p>
				</div>
			{/if}
		</section>

	<!-- ── VISTA CLASSIFICA NORMALE ── -->
	{:else}
		<!-- PODIO -->
		<section class="section podio-section">
			<div class="section-header">
				<span class="section-label">Il Podio</span>
				<div class="section-line"></div>
			</div>
			<div class="podio-grid">
				<!-- silver a sinistra, gold al centro, bronze a destra -->
				<div class="podio-slot podio-second">
					<CardAnimal membro={podio[1]} rank={2} onselect={openModal} />
				</div>
				<div class="podio-slot podio-first">
					<div class="crown-wrap" aria-hidden="true">👑</div>
					<CardAnimal membro={podio[0]} rank={1} onselect={openModal} />
				</div>
				<div class="podio-slot podio-third">
					<CardAnimal membro={podio[2]} rank={3} onselect={openModal} />
				</div>
			</div>
		</section>

		<!-- SEPARATORE -->
		<div class="sep" aria-hidden="true">
			<div class="sep-line"></div>
			<span class="sep-text">Classifica completa</span>
			<div class="sep-line"></div>
		</div>

		<!-- GRID RESTO -->
		<section class="section grid-section">
			<div class="cards-grid">
				{#each resto as membro, i}
					<CardAnimal {membro} rank={i + 4} onselect={openModal} />
				{/each}
			</div>
		</section>
	{/if}

	<!-- FOOTER -->
	<footer>
		<p>🐾 Classifica non impugnabile · Decisioni finali e inappellabili</p>
	</footer>
</main>

<!-- MODAL -->
{#if selected}
	<Modal membro={selected} onclose={closeModal} />
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
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 3.5rem 1rem 2rem;
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
		animation: trophy-rock 4s ease-in-out infinite;
		display: inline-block;
	}

	@keyframes trophy-rock {
		0%, 100% { transform: rotate(-4deg) scale(1); }
		50%       { transform: rotate(5deg) scale(1.06); }
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.8rem, 7.5vw, 6rem);
		letter-spacing: 0.04em;
		color: #fff;
		text-shadow: 0 0 60px rgba(232, 184, 75, 0.2);
		text-align: left;
	}

	.subtitle {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── SEARCH ── */
	.search-wrap {
		max-width: 440px;
		margin: 0 auto 2.5rem;
		animation: fade-down 0.65s ease 0.1s both;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		font-size: 0.88rem;
		pointer-events: none;
	}

	input {
		width: 100%;
		background: rgba(255, 255, 255, 0.055);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		padding: 0.7rem 2.8rem;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.88rem;
		outline: none;
		transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
	}

	input::placeholder {
		color: rgba(240, 240, 250, 0.3);
	}

	input:focus {
		border-color: rgba(255, 255, 255, 0.22);
		background: rgba(255, 255, 255, 0.08);
		box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
	}

	.clear-btn {
		position: absolute;
		right: 0.8rem;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: rgba(240, 240, 250, 0.5);
		cursor: pointer;
		font-size: 0.65rem;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ── SECTIONS ── */
	.section {
		margin-bottom: 1.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.4rem;
	}

	.section-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(240, 240, 250, 0.3);
		font-weight: 700;
		white-space: nowrap;
		margin-bottom: 1.2rem;
	}

	.section-header .section-label {
		margin-bottom: 0;
	}

	.section-line {
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.07);
	}

	/* ── PODIO ── */
	.podio-grid {
		display: grid;
		grid-template-columns: 1fr 1.12fr 1fr;
		gap: 0.9rem;
		max-width: 560px;
		margin: 0 auto;
		align-items: end;
	}

	.podio-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.podio-first {
		/* leggermente più in alto */
		margin-bottom: -10px;
	}

	.podio-second {
		padding-top: 24px;
	}

	.podio-third {
		padding-top: 40px;
	}

	.crown-wrap {
		font-size: 1.5rem;
		margin-bottom: -4px;
		animation: crown-float 2.5s ease-in-out infinite;
		display: block;
		text-align: center;
	}

	@keyframes crown-float {
		0%, 100% { transform: translateY(0) rotate(-5deg); }
		50%       { transform: translateY(-5px) rotate(5deg); }
	}

	/* ── SEPARATORE ── */
	.sep {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0 1.8rem;
	}

	.sep-line {
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.07);
	}

	.sep-text {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(240, 240, 250, 0.25);
		font-weight: 700;
		white-space: nowrap;
	}

	/* ── GRID RESTO ── */
	.grid-base,
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.9rem;
	}

	/* ── EMPTY ── */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 0;
		color: rgba(240, 240, 250, 0.35);
		font-size: 0.9rem;
	}

	.empty-emoji {
		font-size: 2.5rem;
	}

	/* ── FOOTER ── */
	footer {
		text-align: center;
		color: rgba(240, 240, 250, 0.2);
		font-size: 0.75rem;
		padding-top: 2rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main {
			padding: 0 0.9rem 3rem;
		}

		.podio-grid {
			gap: 0.6rem;
		}

		.grid-base,
		.cards-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
			gap: 0.65rem;
		}

		.title-text {
			text-align: center;
		}

		h1 {
			flex-direction: column;
			gap: 0.3rem;
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import CardAnimal from '$lib/components/CardAnimal.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import QuizSettimanale from '$lib/components/QuizSettimanale.svelte';
	import SfidaGiornaliera from '$lib/components/SfidaGiornaliera.svelte';
	import StatisticheGruppo from '$lib/components/StatisticheGruppo.svelte';
	import CompatibilitaAnimali from '$lib/components/CompatibilitaAnimali.svelte';
	import Achievements from '$lib/components/Achievements.svelte';
	import { logVisita } from '$lib/logger.js';
	import { unlock } from '$lib/achievements.js';
	import { goto } from '$app/navigation';

	onMount(() => {
		logVisita();
	});

	let selected = $state(null);
	let search = $state('');
	let categoriaAttiva = $state(null);

	const categorie = [
		{ id: 'Felini', emoji: '🐱' },
		{ id: 'Canidi', emoji: '🐺' },
		{ id: 'Uccelli', emoji: '🐦' },
		{ id: 'Erbivori', emoji: '🌿' },
		{ id: 'Rettili', emoji: '🦎' },
		{ id: 'Insetti', emoji: '🐛' },
		{ id: 'Roditori', emoji: '🐭' },
		{ id: 'Acquatici', emoji: '🌊' },
		{ id: 'Esotici', emoji: '🌍' }
	];

	// Animale del giorno — deterministico, cambia ogni giorno
	const oggi = new Date();
	const seed = oggi.getFullYear() * 10000 + (oggi.getMonth() + 1) * 100 + oggi.getDate();
	const animaledelgiorno = membri[seed % membri.length];
	const dataFormattata = oggi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

	// Citazione del giorno — diversa dall'animale del giorno (offset +7)
	const quoteMembro = membri[(seed + 7) % membri.length];

	// Achievement: traccia ricerca
	$effect(() => {
		if (search.trim()) unlock('cercatore');
	});

	let filtered = $derived(
		search.trim() === '' && categoriaAttiva === null
			? null
			: membri.filter((m) => {
					const matchSearch =
						search.trim() === '' ||
						m.nome.toLowerCase().includes(search.toLowerCase()) ||
						m.animale.toLowerCase().includes(search.toLowerCase());
					const matchCategoria = categoriaAttiva === null || m.categoria === categoriaAttiva;
					return matchSearch && matchCategoria;
				})
	);

	const filteredLabel = $derived.by(() => {
		if (filtered === null) return '';
		const n = filtered.length;
		const unit = n === 1 ? 'esemplare' : 'esemplari';
		if (search.trim() && categoriaAttiva) {
			return `${n} ${unit} in ${categoriaAttiva} per "${search}"`;
		} else if (search.trim()) {
			return `${n} risultat${n === 1 ? 'o' : 'i'} per "${search}"`;
		} else {
			return `${n} ${unit} · ${categoriaAttiva}`;
		}
	});

	// Mini-podio per categoria (solo quando filtro solo per categoria, senza testo)
	const categoriaMembers = $derived(
		categoriaAttiva && !search.trim()
			? membri.filter((m) => m.categoria === categoriaAttiva)
			: null
	);

	const podio = membri.slice(0, 3);
	const resto = membri.slice(3);

	function openModal(membro) {
		selected = membro;
		// Achievement curioso: traccia aperture uniche
		if (browser) {
			try {
				const seen = new Set(JSON.parse(localStorage.getItem('zoo_seen_membri') ?? '[]'));
				seen.add(membro.nome);
				localStorage.setItem('zoo_seen_membri', JSON.stringify([...seen]));
				if (seen.size >= 10) unlock('curioso');
			} catch {}
		}
	}

	function closeModal() {
		selected = null;
	}

	function toggleCategoria(id) {
		categoriaAttiva = categoriaAttiva === id ? null : id;
		// Achievement esploratore: traccia categorie viste
		if (id && browser) {
			try {
				const seen = new Set(JSON.parse(localStorage.getItem('zoo_cats_seen') ?? '[]'));
				seen.add(id);
				localStorage.setItem('zoo_cats_seen', JSON.stringify([...seen]));
				if (seen.size >= 9) unlock('esploratore');
			} catch {}
		}
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
		<!-- Citazione del giorno -->
		<p class="quote-of-day">
			<span class="quote-mark">"</span>{quoteMembro.tagline}<span class="quote-mark">"</span>
			<span class="quote-author">— {quoteMembro.disambig ? `${quoteMembro.animale} ${quoteMembro.disambig}` : quoteMembro.animale}</span>
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

	<!-- ── SLOT CTA ── -->
	<button class="slots-cta" onclick={() => goto('/slots')}>
		<span class="slots-cta-icon">🎰</span>
		<span class="slots-cta-text">
			<span class="slots-cta-title">Slot Machine Animalesca</span>
			<span class="slots-cta-sub">10 giri al giorno · 2% di probabilità di vincere</span>
		</span>
		<span class="slots-cta-arrow">›</span>
	</button>

	<!-- ── CHIP CATEGORIE ── -->
	<div class="chip-bar">
		<button
			class="chip"
			class:active={categoriaAttiva === null}
			onclick={() => (categoriaAttiva = null)}
		>
			Tutti
		</button>
		{#each categorie as cat}
			<button
				class="chip"
				class:active={categoriaAttiva === cat.id}
				onclick={() => toggleCategoria(cat.id)}
			>
				{cat.emoji} {cat.id}
			</button>
		{/each}
	</div>

	<!-- ── RISULTATI FILTRATI ── -->
	{#if filtered !== null}
		<section class="section">
			{#if filtered.length > 0}
				<p class="section-label">{filteredLabel}</p>

				<!-- Mini-podio per categoria (senza ricerca testo) -->
				{#if categoriaMembers && categoriaMembers.length >= 3}
					<div class="mini-podio">
						<div class="mini-slot mini-second">
							<CardAnimal membro={categoriaMembers[1]} rank={membri.indexOf(categoriaMembers[1]) + 1} onselect={openModal} />
						</div>
						<div class="mini-slot mini-first">
							<div class="mini-crown">👑</div>
							<CardAnimal membro={categoriaMembers[0]} rank={membri.indexOf(categoriaMembers[0]) + 1} onselect={openModal} />
						</div>
						<div class="mini-slot mini-third">
							<CardAnimal membro={categoriaMembers[2]} rank={membri.indexOf(categoriaMembers[2]) + 1} onselect={openModal} />
						</div>
					</div>
					{#if categoriaMembers.length > 3}
						<div class="sep-mini" aria-hidden="true">
							<div class="sep-line"></div>
							<span class="sep-text">Resto della categoria</span>
							<div class="sep-line"></div>
						</div>
						<div class="grid-base">
							{#each categoriaMembers.slice(3) as membro}
								{@const rank = membri.indexOf(membro) + 1}
								<CardAnimal {membro} {rank} onselect={openModal} />
							{/each}
						</div>
					{/if}
				{:else}
					<div class="grid-base">
						{#each filtered as membro}
							{@const rank = membri.indexOf(membro) + 1}
							<CardAnimal {membro} {rank} onselect={openModal} />
						{/each}
					</div>
				{/if}
			{:else}
				<div class="empty">
					<span class="empty-emoji">🤔</span>
					<p>
						Nessun esemplare trovato{search ? ` per "${search}"` : ''}{categoriaAttiva
							? ` nella categoria ${categoriaAttiva}`
							: ''}
					</p>
				</div>
			{/if}
		</section>

	<!-- ── VISTA CLASSIFICA NORMALE ── -->
	{:else}
		<!-- SFIDA DEL GIORNO -->
		<SfidaGiornaliera />

		<!-- QUIZ SETTIMANALE -->
		<QuizSettimanale />

		<!-- ANIMALE DEL GIORNO -->
		<div
			class="spotlight"
			role="button"
			tabindex="0"
			onclick={() => openModal(animaledelgiorno)}
			onkeydown={(e) => e.key === 'Enter' && openModal(animaledelgiorno)}
			aria-label="Scopri l'animale del giorno: {animaledelgiorno.animale}"
		>
			<div class="spotlight-meta">
				<span class="spotlight-tag">✨ Animale del giorno</span>
				<span class="spotlight-date">{dataFormattata}</span>
			</div>
			<div class="spotlight-body">
				<span class="spotlight-emoji">{animaledelgiorno.emoji}</span>
				<div class="spotlight-info">
					<p class="spotlight-animal">{animaledelgiorno.animale}</p>
					<p class="spotlight-hint">Tocca per scoprire di chi si tratta</p>
				</div>
				<span class="spotlight-arrow">›</span>
			</div>
		</div>

		<!-- PODIO -->
		<section class="section podio-section">
			<div class="section-header">
				<span class="section-label">Il Podio</span>
				<div class="section-line"></div>
			</div>
			<div class="podio-grid">
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

		<!-- SEPARATORE SEZIONI EXTRA -->
		<div class="sep" aria-hidden="true">
			<div class="sep-line"></div>
			<span class="sep-text">Esplora il gruppo</span>
			<div class="sep-line"></div>
		</div>

		<!-- STATISTICHE GRUPPO -->
		<StatisticheGruppo />

		<!-- COMPATIBILITÀ -->
		<CompatibilitaAnimali />

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

<!-- ACHIEVEMENTS (flottante) -->
<Achievements />

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

	/* ── SLOT CTA ── */
	.slots-cta {
		width: 100%;
		max-width: 560px;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(232, 150, 26, 0.08));
		border: 1px solid rgba(255, 215, 0, 0.4);
		border-radius: 16px;
		color: #ffd700;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
		animation: slotsCTAGlow 2.5s ease-in-out infinite alternate;
	}
	.slots-cta:hover {
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(232, 150, 26, 0.14));
		border-color: rgba(255, 215, 0, 0.7);
		transform: translateY(-2px);
		box-shadow: 0 6px 24px rgba(255, 215, 0, 0.2);
	}
	.slots-cta-icon {
		font-size: 2rem;
		flex-shrink: 0;
		animation: slotIconSpin 3s ease-in-out infinite;
	}
	@keyframes slotIconSpin {
		0%, 100% { transform: rotate(-5deg) scale(1); }
		50%       { transform: rotate(5deg) scale(1.12); }
	}
	.slots-cta-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
	}
	.slots-cta-title {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}
	.slots-cta-sub {
		font-size: 0.75rem;
		color: rgba(255, 215, 0, 0.55);
		font-weight: 400;
	}
	.slots-cta-arrow {
		font-size: 1.5rem;
		color: rgba(255, 215, 0, 0.4);
		flex-shrink: 0;
	}
	@keyframes slotsCTAGlow {
		from { box-shadow: 0 0 10px rgba(255, 215, 0, 0.08); }
		to   { box-shadow: 0 0 24px rgba(255, 215, 0, 0.25); }
	}

	/* ── CITAZIONE DEL GIORNO ── */
	.quote-of-day {
		margin-top: 1.1rem;
		font-size: 0.78rem;
		color: rgba(240, 240, 250, 0.3);
		font-style: italic;
		max-width: 480px;
		margin-inline: auto;
		line-height: 1.55;
	}

	.quote-mark {
		color: rgba(232, 184, 75, 0.4);
		font-style: normal;
		font-size: 1rem;
	}

	.quote-author {
		display: block;
		margin-top: 0.3rem;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(232, 184, 75, 0.35);
		font-style: normal;
	}

	/* ── SEARCH ── */
	.search-wrap {
		max-width: 440px;
		margin: 0 auto 1.2rem;
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

	input::placeholder { color: rgba(240, 240, 250, 0.3); }

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

	/* ── CHIP CATEGORIE ── */
	.chip-bar {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		justify-content: center;
		max-width: 700px;
		margin: 0 auto 2rem;
		animation: fade-down 0.65s ease 0.15s both;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.32rem 0.8rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(240, 240, 250, 0.45);
		font-family: 'Outfit', sans-serif;
		font-size: 0.72rem;
		cursor: pointer;
		transition: all 0.18s ease;
		white-space: nowrap;
	}

	.chip:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(240, 240, 250, 0.85);
		border-color: rgba(255, 255, 255, 0.18);
	}

	.chip.active {
		background: rgba(124, 58, 237, 0.22);
		border-color: rgba(124, 58, 237, 0.5);
		color: #f0f0fa;
	}

	/* ── MINI-PODIO CATEGORIA ── */
	.mini-podio {
		display: grid;
		grid-template-columns: 1fr 1.1fr 1fr;
		gap: 0.8rem;
		max-width: 460px;
		margin: 0.5rem auto 1.5rem;
		align-items: end;
	}

	.mini-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.mini-first { margin-bottom: -8px; }
	.mini-second { padding-top: 20px; }
	.mini-third { padding-top: 36px; }

	.mini-crown {
		font-size: 1.1rem;
		margin-bottom: -2px;
		animation: crown-float 2.5s ease-in-out infinite;
		text-align: center;
	}

	/* ── ANIMALE DEL GIORNO ── */
	.spotlight {
		max-width: 480px;
		margin: 0 auto 2.5rem;
		background: rgba(232, 184, 75, 0.06);
		border: 1px solid rgba(232, 184, 75, 0.18);
		border-radius: 20px;
		padding: 1.1rem 1.4rem;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
		animation: fade-down 0.65s ease 0.2s both;
	}

	.spotlight:hover {
		background: rgba(232, 184, 75, 0.11);
		border-color: rgba(232, 184, 75, 0.32);
		transform: translateY(-3px);
		box-shadow: 0 10px 32px rgba(232, 184, 75, 0.12);
	}

	.spotlight-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.8rem;
	}

	.spotlight-tag {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
		color: #e8b84b;
	}

	.spotlight-date {
		font-size: 0.68rem;
		color: rgba(240, 240, 250, 0.3);
	}

	.spotlight-body {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.spotlight-emoji {
		font-size: 2.8rem;
		line-height: 1;
		filter: drop-shadow(0 4px 12px rgba(232, 184, 75, 0.35));
	}

	.spotlight-info { flex: 1; }

	.spotlight-animal {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.35rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		margin-bottom: 0.15rem;
	}

	.spotlight-hint {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(240, 240, 250, 0.28);
		transition: color 0.2s;
	}

	.spotlight:hover .spotlight-hint { color: rgba(232, 184, 75, 0.65); }

	.spotlight-arrow {
		font-size: 1.4rem;
		color: rgba(232, 184, 75, 0.4);
		transition: transform 0.2s ease, color 0.2s;
		line-height: 1;
	}

	.spotlight:hover .spotlight-arrow {
		transform: translateX(4px);
		color: rgba(232, 184, 75, 0.8);
	}

	/* ── SECTIONS ── */
	.section { margin-bottom: 1.5rem; }

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

	.section-header .section-label { margin-bottom: 0; }

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

	.podio-first { margin-bottom: -10px; }
	.podio-second { padding-top: 24px; }
	.podio-third { padding-top: 40px; }

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

	/* ── SEPARATORI ── */
	.sep {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0 1.8rem;
	}

	.sep-mini {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1.5rem 0 1rem;
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

	/* ── GRIDS ── */
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

	.empty-emoji { font-size: 2.5rem; }

	/* ── FOOTER ── */
	footer {
		text-align: center;
		color: rgba(240, 240, 250, 0.2);
		font-size: 0.75rem;
		padding-top: 2rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main { padding: 0 0.9rem 3rem; }
		.podio-grid { gap: 0.6rem; }
		.grid-base, .cards-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
			gap: 0.65rem;
		}
		.title-text { text-align: center; }
		h1 { flex-direction: column; gap: 0.3rem; }
		.chip-bar { gap: 0.35rem; }
		.chip { font-size: 0.68rem; padding: 0.28rem 0.65rem; }
		.mini-podio { max-width: 340px; gap: 0.5rem; }
	}
</style>

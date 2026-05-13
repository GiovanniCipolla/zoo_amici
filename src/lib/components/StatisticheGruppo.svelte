<script>
	import { membri } from '$lib/membri.js';

	const categorie = [
		{ id: 'Felini', emoji: '🐱' },
		{ id: 'Erbivori', emoji: '🌿' },
		{ id: 'Uccelli', emoji: '🐦' },
		{ id: 'Canidi', emoji: '🐺' },
		{ id: 'Acquatici', emoji: '🌊' },
		{ id: 'Rettili', emoji: '🦎' },
		{ id: 'Roditori', emoji: '🐭' },
		{ id: 'Esotici', emoji: '🌍' },
		{ id: 'Insetti', emoji: '🐛' }
	];

	const conteggi = categorie.map((cat) => ({
		...cat,
		count: membri.filter((m) => m.categoria === cat.id).length
	}));

	const maxCount = Math.max(...conteggi.map((c) => c.count));

	const piuNumerosa = conteggi.reduce((a, b) => (a.count >= b.count ? a : b));
	const piuRara = conteggi.reduce((a, b) => (a.count <= b.count ? a : b));

	let aperto = $state(false);
</script>

<div class="stats-wrap">
	<button class="stats-toggle" onclick={() => (aperto = !aperto)} aria-expanded={aperto}>
		<span class="toggle-left">
			<span class="toggle-icon">📊</span>
			<span class="toggle-label">Statistiche del gruppo</span>
		</span>
		<span class="toggle-arrow" class:ruota={aperto}>›</span>
	</button>

	{#if aperto}
		<div class="stats-body">
			<!-- Fun facts -->
			<div class="facts-row">
				<div class="fact">
					<span class="fact-value">{membri.length}</span>
					<span class="fact-label">esemplari catalogati</span>
				</div>
				<div class="fact">
					<span class="fact-value">{piuNumerosa.emoji} {piuNumerosa.id}</span>
					<span class="fact-label">categoria dominante</span>
				</div>
				<div class="fact">
					<span class="fact-value">{piuRara.emoji} {piuRara.id}</span>
					<span class="fact-label">specie più rara</span>
				</div>
			</div>

			<!-- Barre per categoria -->
			<div class="bars">
				{#each conteggi.sort((a, b) => b.count - a.count) as cat}
					<div class="bar-row">
						<span class="bar-label">{cat.emoji} {cat.id}</span>
						<div class="bar-track">
							<div
								class="bar-fill"
								style="width: {(cat.count / maxCount) * 100}%; background: var(--bar-color)"
							></div>
						</div>
						<span class="bar-count">{cat.count}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.stats-wrap {
		max-width: 640px;
		margin: 0 auto 2rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 18px;
		overflow: hidden;
	}

	.stats-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.4rem;
		background: none;
		border: none;
		cursor: pointer;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		transition: background 0.18s ease;
	}

	.stats-toggle:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.toggle-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.toggle-icon {
		font-size: 1rem;
	}

	.toggle-label {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-weight: 700;
		color: rgba(240, 240, 250, 0.45);
	}

	.toggle-arrow {
		font-size: 1.2rem;
		color: rgba(240, 240, 250, 0.3);
		transition: transform 0.25s ease;
		line-height: 1;
	}

	.toggle-arrow.ruota {
		transform: rotate(90deg);
	}

	/* ── BODY ── */
	.stats-body {
		padding: 0 1.4rem 1.4rem;
		animation: expand 0.25s ease both;
	}

	@keyframes expand {
		from { opacity: 0; transform: translateY(-8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── FACTS ── */
	.facts-row {
		display: flex;
		gap: 0.8rem;
		margin-bottom: 1.4rem;
		flex-wrap: wrap;
	}

	.fact {
		flex: 1;
		min-width: 100px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
		padding: 0.7rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.fact-value {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.15rem;
		letter-spacing: 0.04em;
		color: #f0f0fa;
		line-height: 1.1;
	}

	.fact-label {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(240, 240, 250, 0.3);
	}

	/* ── BARRE ── */
	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.bar-row {
		display: grid;
		grid-template-columns: 110px 1fr 28px;
		align-items: center;
		gap: 0.7rem;
	}

	.bar-label {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.55);
		white-space: nowrap;
	}

	.bar-track {
		height: 6px;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
		background: rgba(124, 58, 237, 0.7);
		transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
		animation: grow 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes grow {
		from { width: 0 !important; }
	}

	.bar-count {
		font-size: 0.7rem;
		color: rgba(240, 240, 250, 0.35);
		text-align: right;
	}

	@media (max-width: 480px) {
		.stats-toggle {
			padding: 0.9rem 1.1rem;
		}
		.stats-body {
			padding: 0 1.1rem 1.1rem;
		}
		.bar-row {
			grid-template-columns: 90px 1fr 24px;
		}
	}
</style>

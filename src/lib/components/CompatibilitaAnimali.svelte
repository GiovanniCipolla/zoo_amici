<script>
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import { compatScore, compatInfo } from '$lib/compatibilita.js';
	import { unlock } from '$lib/achievements.js';

	const opzioni = membri.map((m) => ({
		nome: m.nome,
		label: m.disambig ? `${m.animale} ${m.disambig}` : m.animale,
		emoji: m.emoji,
		colore: m.colore
	}));

	let sel1 = $state('');
	let sel2 = $state('');
	let revealed = $state(false);
	let animating = $state(false);

	const result = $derived.by(() => {
		if (!sel1 || !sel2 || sel1 === sel2) return null;
		const score = compatScore(sel1, sel2);
		const info = compatInfo(score, sel1, sel2);
		return { score, ...info };
	});

	function calcola() {
		if (!result) return;
		animating = true;
		revealed = false;
		setTimeout(() => {
			revealed = true;
			animating = false;
		}, 80);

		// Achievement chimico: conta i test
		if (browser) {
			try {
				const n = parseInt(localStorage.getItem('zoo_compat_count') ?? '0', 10) + 1;
				localStorage.setItem('zoo_compat_count', String(n));
				if (n >= 5) unlock('chimico');
			} catch {}
		}
	}

	function reset() {
		sel1 = '';
		sel2 = '';
		revealed = false;
	}

	const m1 = $derived(membri.find((m) => m.nome === sel1));
	const m2 = $derived(membri.find((m) => m.nome === sel2));
</script>

<div class="compat-wrap">
	<!-- Header -->
	<div class="compat-header">
		<span class="compat-badge">💘 Compatibilità Animalacci</span>
		<span class="compat-sub">Scopri l'alchimia tra due membri del gruppo</span>
	</div>

	<!-- Selettori -->
	<div class="selectors">
		<div class="selector-slot">
			{#if m1}
				<span class="sel-emoji">{m1.emoji}</span>
			{:else}
				<span class="sel-placeholder">?</span>
			{/if}
			<select bind:value={sel1} onchange={() => (revealed = false)}>
				<option value="">— Primo animale —</option>
				{#each opzioni as op}
					<option value={op.nome} disabled={op.nome === sel2}>
						{op.emoji} {op.label} ({op.nome})
					</option>
				{/each}
			</select>
		</div>

		<div class="vs-badge">⚡</div>

		<div class="selector-slot">
			{#if m2}
				<span class="sel-emoji">{m2.emoji}</span>
			{:else}
				<span class="sel-placeholder">?</span>
			{/if}
			<select bind:value={sel2} onchange={() => (revealed = false)}>
				<option value="">— Secondo animale —</option>
				{#each opzioni as op}
					<option value={op.nome} disabled={op.nome === sel1}>
						{op.emoji} {op.label} ({op.nome})
					</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Bottoni -->
	<div class="actions">
		<button
			class="btn-calcola"
			onclick={calcola}
			disabled={!sel1 || !sel2 || sel1 === sel2}
		>
			Calcola compatibilità
		</button>
		{#if sel1 || sel2}
			<button class="btn-reset" onclick={reset}>✕</button>
		{/if}
	</div>

	<!-- Risultato -->
	{#if revealed && result}
		<div class="result" style="--accent: {result.colore}">
			<!-- Punteggio -->
			<div class="score-display">
				<span class="score-num" style="color: {result.colore}">{result.score}</span>
				<span class="score-den">/10</span>
			</div>

			<!-- Barra animata -->
			<div class="bar-track">
				<div
					class="bar-fill"
					style="width: {result.score * 10}%; background: {result.colore}"
				></div>
			</div>

			<!-- Label + commento -->
			<p class="result-label" style="color: {result.colore}">{result.label}</p>
			<p class="result-comment">"{result.commento}"</p>
		</div>
	{/if}
</div>

<style>
	.compat-wrap {
		max-width: 560px;
		margin: 0 auto 2rem;
		background: rgba(255, 182, 30, 0.04);
		border: 1px solid rgba(255, 182, 30, 0.13);
		border-radius: 22px;
		padding: 1.4rem 1.6rem;
	}

	/* ── HEADER ── */
	.compat-header {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-bottom: 1.4rem;
	}

	.compat-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
		color: #f59e0b;
	}

	.compat-sub {
		font-size: 0.78rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── SELECTORS ── */
	.selectors {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.8rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.selector-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.sel-emoji {
		font-size: 2rem;
		line-height: 1;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.4));
		animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes pop-in {
		from { transform: scale(0.5); opacity: 0; }
		to   { transform: scale(1); opacity: 1; }
	}

	.sel-placeholder {
		font-size: 2rem;
		color: rgba(240, 240, 250, 0.1);
		line-height: 1;
	}

	select {
		width: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 0.5rem 0.7rem;
		color: rgba(240, 240, 250, 0.8);
		font-family: 'Outfit', sans-serif;
		font-size: 0.75rem;
		cursor: pointer;
		outline: none;
		transition: border-color 0.18s, background 0.18s;
		appearance: none;
		text-align: center;
	}

	select:focus {
		border-color: rgba(245, 158, 11, 0.4);
		background: rgba(255, 255, 255, 0.09);
	}

	.vs-badge {
		font-size: 1.4rem;
		opacity: 0.4;
		text-align: center;
	}

	/* ── ACTIONS ── */
	.actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.2rem;
	}

	.btn-calcola {
		flex: 1;
		background: rgba(245, 158, 11, 0.2);
		border: 1px solid rgba(245, 158, 11, 0.4);
		border-radius: 999px;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.6rem 1.2rem;
		cursor: pointer;
		transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
	}

	.btn-calcola:not(:disabled):hover {
		background: rgba(245, 158, 11, 0.32);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(245, 158, 11, 0.2);
	}

	.btn-calcola:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-reset {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		width: 34px;
		height: 34px;
		color: rgba(240, 240, 250, 0.4);
		cursor: pointer;
		font-size: 0.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.18s, color 0.18s;
		flex-shrink: 0;
	}

	.btn-reset:hover {
		background: rgba(255, 255, 255, 0.13);
		color: #f0f0fa;
	}

	/* ── RESULT ── */
	.result {
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		padding-top: 1.2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		animation: result-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes result-enter {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.score-display {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
		line-height: 1;
	}

	.score-num {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 4rem;
		letter-spacing: 0.04em;
		filter: drop-shadow(0 0 20px color-mix(in srgb, var(--accent) 50%, transparent));
		animation: score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes score-pop {
		from { transform: scale(0.5); opacity: 0; }
		to   { transform: scale(1); opacity: 1; }
	}

	.score-den {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.8rem;
		color: rgba(240, 240, 250, 0.25);
		letter-spacing: 0.04em;
	}

	.bar-track {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		animation: bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
	}

	@keyframes bar-grow {
		from { width: 0 !important; }
	}

	.result-label {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		letter-spacing: 0.1em;
		margin-top: 0.2rem;
	}

	.result-comment {
		font-size: 0.8rem;
		color: rgba(240, 240, 250, 0.45);
		font-style: italic;
		text-align: center;
		line-height: 1.55;
		max-width: 380px;
		animation: fade-in 0.4s ease 0.3s both;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@media (max-width: 480px) {
		.compat-wrap {
			padding: 1.1rem 1.1rem;
		}
		.selectors {
			gap: 0.5rem;
		}
		select {
			font-size: 0.7rem;
			padding: 0.45rem 0.5rem;
		}
		.score-num {
			font-size: 3.2rem;
		}
	}
</style>

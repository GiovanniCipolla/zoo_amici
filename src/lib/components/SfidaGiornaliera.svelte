<script>
	import { browser } from '$app/environment';
	import { membri } from '$lib/membri.js';
	import { getSfidaDati, oggiFormattato } from '$lib/sfide.js';

	const { sfida, formato, lato1, lato2, voteKey } = getSfidaDati(membri);
	const data = oggiFormattato();

	// Voto salvato per oggi ('1' | '2' | null)
	let voto = $state(browser ? localStorage.getItem(voteKey) : null);

	function vota(lato) {
		if (voto) return;
		voto = lato;
		if (browser) localStorage.setItem(voteKey, lato);
	}

	const animalLabel = (m) => (m.disambig ? `${m.animale} ${m.disambig}` : m.animale);
</script>

<div class="sfida-card">
	<!-- Header -->
	<div class="sfida-meta">
		<span class="sfida-tag">⚔️ Sfida del Giorno</span>
		<span class="sfida-date">{data}</span>
	</div>

	<!-- Tema + descrizione -->
	<div class="sfida-intro">
		<span class="sfida-emoji">{sfida.emoji}</span>
		<div>
			<p class="sfida-tema">{sfida.tema}</p>
			<p class="sfida-desc">{sfida.descrizione}</p>
		</div>
	</div>

	<!-- Badge formato -->
	<div class="formato-badge">{formato === '1v1' ? '1 VS 1' : '2 VS 2'}</div>

	<!-- Arena -->
	<div class="arena">
		<!-- Lato 1 -->
		<button
			class="lato lato-1"
			class:vincitore={voto === '1'}
			class:perdente={voto === '2'}
			class:idle={!voto}
			onclick={() => vota('1')}
			disabled={!!voto}
			aria-label="Vota lato 1"
		>
			{#if voto === '1'}
				<span class="scelta-badge">La tua scelta ✓</span>
			{/if}
			<div class="lato-members">
				{#each lato1 as m}
					<div class="member-card">
						<span class="member-emoji">{m.emoji}</span>
						<span class="member-animal">{animalLabel(m)}</span>
						<span class="member-nome">{m.nome}</span>
					</div>
				{/each}
			</div>
		</button>

		<!-- VS centrale -->
		<div class="vs-center" class:voted={!!voto}>
			<span class="vs-text">VS</span>
		</div>

		<!-- Lato 2 -->
		<button
			class="lato lato-2"
			class:vincitore={voto === '2'}
			class:perdente={voto === '1'}
			class:idle={!voto}
			onclick={() => vota('2')}
			disabled={!!voto}
			aria-label="Vota lato 2"
		>
			{#if voto === '2'}
				<span class="scelta-badge">La tua scelta ✓</span>
			{/if}
			<div class="lato-members">
				{#each lato2 as m}
					<div class="member-card">
						<span class="member-emoji">{m.emoji}</span>
						<span class="member-animal">{animalLabel(m)}</span>
						<span class="member-nome">{m.nome}</span>
					</div>
				{/each}
			</div>
		</button>
	</div>

	{#if !voto}
		<p class="hint">Tocca un lato per votare il tuo vincitore</p>
	{/if}
</div>

<style>
	.sfida-card {
		max-width: 560px;
		margin: 0 auto 2rem;
		background: rgba(26, 176, 232, 0.04);
		border: 1px solid rgba(26, 176, 232, 0.15);
		border-radius: 22px;
		padding: 1.2rem 1.4rem 1.4rem;
		animation: fade-down 0.65s ease 0.18s both;
	}

	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── HEADER ── */
	.sfida-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.9rem;
	}

	.sfida-tag {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
		color: #1ab0e8;
	}

	.sfida-date {
		font-size: 0.68rem;
		color: rgba(240, 240, 250, 0.3);
	}

	/* ── INTRO ── */
	.sfida-intro {
		display: flex;
		gap: 0.9rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.sfida-emoji {
		font-size: 2.2rem;
		line-height: 1;
		flex-shrink: 0;
		filter: drop-shadow(0 3px 8px rgba(26, 176, 232, 0.3));
		margin-top: 0.1rem;
	}

	.sfida-tema {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		margin-bottom: 0.3rem;
		line-height: 1.1;
	}

	.sfida-desc {
		font-size: 0.76rem;
		color: rgba(240, 240, 250, 0.45);
		line-height: 1.55;
	}

	/* ── FORMATO BADGE ── */
	.formato-badge {
		text-align: center;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 700;
		color: rgba(26, 176, 232, 0.5);
		margin-bottom: 0.9rem;
	}

	/* ── ARENA ── */
	.arena {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.6rem;
		align-items: stretch;
	}

	/* ── LATO (bottone) ── */
	.lato {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem 0.7rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease,
			box-shadow 0.18s ease, opacity 0.25s ease;
		font-family: 'Outfit', sans-serif;
		min-height: 110px;
	}

	.lato.idle:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(26, 176, 232, 0.35);
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(26, 176, 232, 0.15);
	}

	.lato:disabled {
		cursor: default;
	}

	.lato.vincitore {
		background: rgba(26, 176, 232, 0.12);
		border-color: rgba(26, 176, 232, 0.45);
		box-shadow: 0 0 28px rgba(26, 176, 232, 0.18);
		animation: winner-glow 0.5s ease both;
	}

	@keyframes winner-glow {
		0%   { transform: scale(1); }
		40%  { transform: scale(1.04); }
		100% { transform: scale(1); }
	}

	.lato.perdente {
		opacity: 0.35;
		filter: grayscale(0.5);
	}

	/* ── SCELTA BADGE ── */
	.scelta-badge {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		background: #1ab0e8;
		color: #07070f;
		font-size: 0.58rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.18rem 0.6rem;
		border-radius: 999px;
		white-space: nowrap;
		animation: badge-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes badge-in {
		from { opacity: 0; transform: translateX(-50%) scale(0.7) translateY(6px); }
		to   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
	}

	/* ── MEMBER CARDS ── */
	.lato-members {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		align-items: center;
		width: 100%;
	}

	.member-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.member-emoji {
		font-size: 2.2rem;
		line-height: 1;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.4));
		display: block;
	}

	.member-animal {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.88rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		line-height: 1.1;
		text-align: center;
	}

	.member-nome {
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.38);
		text-align: center;
	}

	/* ── VS CENTRALE ── */
	.vs-center {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		flex-shrink: 0;
		transition: opacity 0.25s ease;
	}

	.vs-center.voted {
		opacity: 0.3;
	}

	.vs-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1rem;
		letter-spacing: 0.1em;
		color: rgba(240, 240, 250, 0.25);
	}

	/* ── HINT ── */
	.hint {
		text-align: center;
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.22);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin-top: 0.9rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 480px) {
		.sfida-card {
			padding: 1rem 1rem 1.2rem;
		}
		.arena {
			gap: 0.4rem;
		}
		.lato {
			padding: 0.85rem 0.5rem;
			min-height: 96px;
		}
		.member-emoji {
			font-size: 1.9rem;
		}
		.member-animal {
			font-size: 0.78rem;
		}
		.vs-center {
			width: 28px;
		}
	}
</style>

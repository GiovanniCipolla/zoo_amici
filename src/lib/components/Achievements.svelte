<script>
	import { browser } from '$app/environment';
	import { ACHIEVEMENTS, getUnlocked } from '$lib/achievements.js';
	import { onMount, onDestroy } from 'svelte';

	let aperto = $state(false);
	let sbloccati = $state(getUnlocked());
	let toast = $state(null); // { emoji, nome } oppure null
	let toastTimer = null;

	function aggiorna() {
		sbloccati = getUnlocked();
	}

	function onAchievementUnlocked(e) {
		aggiorna();
		// Mostra toast
		clearTimeout(toastTimer);
		toast = e.detail;
		toastTimer = setTimeout(() => (toast = null), 3200);
	}

	onMount(() => {
		if (!browser) return;
		window.addEventListener('achievement-unlocked', onAchievementUnlocked);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('achievement-unlocked', onAchievementUnlocked);
		clearTimeout(toastTimer);
	});

	const totale = ACHIEVEMENTS.length;
	const count = $derived(sbloccati.length);
</script>

<!-- Toast notifica achievement -->
{#if toast}
	<div class="toast" role="status" aria-live="polite">
		<span class="toast-emoji">{toast.emoji}</span>
		<div class="toast-text">
			<span class="toast-title">Achievement sbloccato!</span>
			<span class="toast-nome">{toast.nome}</span>
		</div>
	</div>
{/if}

<!-- Pill flottante -->
<button
	class="pill"
	onclick={() => (aperto = !aperto)}
	aria-label="Achievement: {count}/{totale} sbloccati"
	title="I tuoi achievement"
>
	🏅 {count}/{totale}
</button>

<!-- Panel -->
{#if aperto}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={() => (aperto = false)}></div>
	<div class="panel" role="dialog" aria-label="Achievement">
		<div class="panel-header">
			<span class="panel-title">Achievement</span>
			<button class="panel-close" onclick={() => (aperto = false)} aria-label="Chiudi">✕</button>
		</div>
		<div class="panel-list">
			{#each ACHIEVEMENTS as ach}
				{@const unlocked = sbloccati.includes(ach.id)}
				<div class="ach-item" class:locked={!unlocked}>
					<span class="ach-emoji">{ach.emoji}</span>
					<div class="ach-info">
						<span class="ach-nome">{ach.nome}</span>
						<span class="ach-desc">{unlocked ? ach.desc : '???'}</span>
					</div>
					{#if unlocked}
						<span class="ach-check">✓</span>
					{/if}
				</div>
			{/each}
		</div>
		<p class="panel-footer">{count}/{totale} sbloccati</p>
	</div>
{/if}

<style>
	/* ── TOAST ── */
	.toast {
		position: fixed;
		bottom: 5.5rem;
		right: 1.2rem;
		background: rgba(12, 12, 24, 0.97);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-left: 3px solid #f59e0b;
		border-radius: 14px;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		z-index: 300;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
		animation: toast-slide 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
		max-width: 260px;
	}

	@keyframes toast-slide {
		from { opacity: 0; transform: translateX(30px) scale(0.95); }
		to   { opacity: 1; transform: translateX(0) scale(1); }
	}

	.toast-emoji {
		font-size: 1.6rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.toast-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.toast-title {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: #f59e0b;
		font-weight: 700;
	}

	.toast-nome {
		font-size: 0.88rem;
		color: #f0f0fa;
		font-weight: 600;
	}

	/* ── PILL ── */
	.pill {
		position: fixed;
		bottom: 1.4rem;
		right: 1.2rem;
		background: rgba(12, 12, 24, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		color: rgba(240, 240, 250, 0.7);
		font-family: 'Outfit', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.5rem 1rem;
		cursor: pointer;
		z-index: 200;
		transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease, box-shadow 0.18s;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.pill:hover {
		background: rgba(20, 20, 40, 0.97);
		color: #f0f0fa;
		transform: translateY(-2px);
		box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
	}

	/* ── BACKDROP ── */
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 199;
	}

	/* ── PANEL ── */
	.panel {
		position: fixed;
		bottom: 4.5rem;
		right: 1.2rem;
		width: 280px;
		background: rgba(10, 10, 22, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		overflow: hidden;
		z-index: 200;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
		animation: panel-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes panel-pop {
		from { opacity: 0; transform: translateY(12px) scale(0.96); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.1rem 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}

	.panel-title {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
		color: rgba(240, 240, 250, 0.45);
	}

	.panel-close {
		background: rgba(255, 255, 255, 0.07);
		border: none;
		color: rgba(240, 240, 250, 0.4);
		border-radius: 50%;
		width: 24px;
		height: 24px;
		font-size: 0.6rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
	}

	.panel-close:hover {
		background: rgba(255, 255, 255, 0.13);
		color: #f0f0fa;
	}

	/* ── LISTA ── */
	.panel-list {
		padding: 0.6rem 0;
		max-height: 340px;
		overflow-y: auto;
	}

	.ach-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1.1rem;
		transition: background 0.15s;
	}

	.ach-item:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.ach-item.locked {
		opacity: 0.35;
		filter: grayscale(1);
	}

	.ach-emoji {
		font-size: 1.3rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.ach-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.ach-nome {
		font-size: 0.82rem;
		font-weight: 600;
		color: #f0f0fa;
	}

	.ach-desc {
		font-size: 0.68rem;
		color: rgba(240, 240, 250, 0.38);
	}

	.ach-check {
		color: #4ade80;
		font-size: 0.85rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	/* ── FOOTER ── */
	.panel-footer {
		text-align: center;
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.22);
		padding: 0.6rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	@media (max-width: 480px) {
		.panel {
			right: 0.8rem;
			width: calc(100vw - 1.6rem);
			max-width: 320px;
		}
		.pill {
			right: 0.8rem;
			bottom: 1rem;
		}
		.toast {
			right: 0.8rem;
			bottom: 5rem;
			max-width: calc(100vw - 1.6rem);
		}
	}
</style>

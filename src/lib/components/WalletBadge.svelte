<script>
	import { browser } from '$app/environment';
	import { getSaldo } from '$lib/economia.js';
	import { onMount, onDestroy } from 'svelte';

	let saldo = $state(0);

	function aggiorna() {
		saldo = getSaldo();
	}

	onMount(() => {
		aggiorna();
		window.addEventListener('wallet-updated', aggiorna);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('wallet-updated', aggiorna);
	});
</script>

<div class="wallet-badge" aria-label="Saldo: €{saldo.toFixed(2)}">
	<span class="wallet-icon">💰</span>
	<span class="wallet-amount">€{saldo.toFixed(2)}</span>
</div>

<style>
	.wallet-badge {
		position: fixed;
		bottom: 1.4rem;
		left: 1.2rem;
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.95rem;
		background: rgba(12, 12, 24, 0.92);
		border: 1px solid rgba(255, 215, 0, 0.28);
		border-radius: 999px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		pointer-events: none;
		user-select: none;
	}

	.wallet-icon {
		font-size: 0.9rem;
		line-height: 1;
	}

	.wallet-amount {
		font-family: 'Outfit', sans-serif;
		font-size: 0.8rem;
		font-weight: 700;
		color: #ffd700;
		letter-spacing: 0.03em;
	}
</style>

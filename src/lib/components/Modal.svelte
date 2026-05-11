<script>
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';

	let { membro, onclose } = $props();

	let nameVisible = $state(false);

	function onkeydown(e) {
		if (e.key === 'Escape') onclose();
	}

	function onbackdrop(e) {
		if (e.target === e.currentTarget) onclose();
	}

	// reveal the name after the emoji animates in
	$effect(() => {
		const t = setTimeout(() => {
			nameVisible = true;
		}, 400);
		return () => clearTimeout(t);
	});
</script>

<svelte:window {onkeydown} />

<div
	class="backdrop"
	role="dialog"
	aria-modal="true"
	onclick={onbackdrop}
	transition:fade={{ duration: 220 }}
>
	<div
		class="modal"
		style="--accent: {membro.colore}"
		transition:scale={{ duration: 340, easing: cubicOut, start: 0.86 }}
	>
		<!-- close -->
		<button class="close" onclick={onclose} aria-label="Chiudi">✕</button>

		<!-- glow behind emoji -->
		<div class="glow-blob" aria-hidden="true"></div>

		<!-- emoji -->
		<div class="emoji-container">
			<span class="emoji">{membro.emoji}</span>
		</div>

		<!-- animal badge -->
		<div class="animal-badge">
			{membro.disambig ? `${membro.animale} ${membro.disambig}` : membro.animale}
		</div>

		<!-- REVEAL sezione -->
		<div class="reveal-section">
			<p class="reveal-label">Questo esemplare appartiene a...</p>

			{#if nameVisible}
				<h2
					class="nome"
					in:fly={{ y: 16, duration: 380, easing: backOut }}
				>
					{membro.nome}
				</h2>
			{:else}
				<div class="nome-placeholder">· · ·</div>
			{/if}
		</div>

		<!-- tagline -->
		{#if nameVisible}
			<p class="tagline" in:fade={{ duration: 400, delay: 200 }}>
				"{membro.tagline}"
			</p>
		{/if}

		<!-- bottom accent line -->
		<div class="bottom-line" aria-hidden="true"></div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(4, 4, 14, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1.5rem;
	}

	.modal {
		position: relative;
		background: rgba(12, 12, 24, 0.97);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-top: 2px solid var(--accent);
		border-radius: 28px;
		padding: 2.2rem 2rem 1.8rem;
		width: min(400px, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		overflow: hidden;
		box-shadow:
			0 32px 80px rgba(0, 0, 0, 0.75),
			0 0 50px color-mix(in srgb, var(--accent) 22%, transparent);
	}

	/* close */
	.close {
		position: absolute;
		top: 0.9rem;
		right: 0.9rem;
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(240, 240, 250, 0.55);
		border-radius: 50%;
		width: 30px;
		height: 30px;
		font-size: 0.7rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s, color 0.2s;
		line-height: 1;
	}
	.close:hover {
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
	}

	/* glow blob */
	.glow-blob {
		position: absolute;
		top: 3.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 180px;
		height: 180px;
		background: radial-gradient(
			circle,
			color-mix(in srgb, var(--accent) 45%, transparent),
			transparent 70%
		);
		border-radius: 50%;
		filter: blur(30px);
		pointer-events: none;
		animation: pulse-glow 2.4s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
		50%       { opacity: 1;    transform: translateX(-50%) scale(1.18); }
	}

	/* emoji */
	.emoji-container {
		position: relative;
		z-index: 1;
		margin-top: 0.4rem;
	}

	.emoji {
		font-size: 5.8rem;
		line-height: 1;
		display: block;
		filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.55));
		animation: emoji-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes emoji-bounce {
		from { transform: scale(0.4); opacity: 0; }
		to   { transform: scale(1);   opacity: 1; }
	}

	/* animal badge */
	.animal-badge {
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 38%, transparent);
		color: var(--accent);
		padding: 0.22rem 0.9rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		z-index: 1;
	}

	/* reveal */
	.reveal-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.4rem;
		min-height: 6rem;
		justify-content: center;
	}

	.reveal-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(240, 240, 250, 0.35);
		font-weight: 600;
	}

	.nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 3.4rem;
		letter-spacing: 0.08em;
		color: #fff;
		line-height: 1;
		text-shadow:
			0 0 40px color-mix(in srgb, var(--accent) 60%, transparent),
			0 0 80px color-mix(in srgb, var(--accent) 30%, transparent);
		text-align: center;
	}

	.nome-placeholder {
		font-size: 1.4rem;
		color: rgba(240, 240, 250, 0.15);
		letter-spacing: 0.5rem;
		animation: dots-blink 0.8s ease-in-out infinite;
	}

	@keyframes dots-blink {
		0%, 100% { opacity: 0.15; }
		50%       { opacity: 0.5; }
	}

	/* tagline */
	.tagline {
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.42);
		font-style: italic;
		text-align: center;
		line-height: 1.5;
		padding: 0 0.5rem;
	}

	/* bottom line */
	.bottom-line {
		width: 100%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--accent) 45%, transparent),
			transparent
		);
		margin-top: 0.8rem;
	}
</style>

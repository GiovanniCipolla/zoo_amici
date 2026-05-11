<script>
	let { membro, rank, onselect } = $props();

	let card = $state(null);
	let tiltX = $state(0);
	let tiltY = $state(0);
	let shineX = $state(50);
	let shineY = $state(50);
	let hovered = $state(false);

	const rankColor = $derived(
		rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : membro.colore
	);
	const isTop3 = $derived(rank <= 3);
	const rankLabel = $derived(rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);
	const animalDisplay = $derived(
		membro.disambig ? `${membro.animale} ${membro.disambig}` : membro.animale
	);

	function onmousemove(e) {
		if (!card) return;
		const rect = card.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		tiltX = ((y - rect.height / 2) / (rect.height / 2)) * -10;
		tiltY = ((x - rect.width / 2) / (rect.width / 2)) * 10;
		shineX = (x / rect.width) * 100;
		shineY = (y / rect.height) * 100;
	}

	function onmouseleave() {
		tiltX = 0;
		tiltY = 0;
		shineX = 50;
		shineY = 50;
		hovered = false;
	}

	function onmouseenter() {
		hovered = true;
	}
</script>

<div
	class="card-wrapper"
	style="--i: {rank - 1}"
	bind:this={card}
	{onmousemove}
	{onmouseleave}
	{onmouseenter}
	role="button"
	tabindex="0"
	onclick={() => onselect(membro)}
	onkeydown={(e) => e.key === 'Enter' && onselect(membro)}
	aria-label="Scopri chi è {animalDisplay}"
>
	<div
		class="card"
		class:top3={isTop3}
		style="
			--accent: {rankColor};
			--tilt-x: {tiltX}deg;
			--tilt-y: {tiltY}deg;
			--shine-x: {shineX}%;
			--shine-y: {shineY}%;
		"
	>
		<!-- shine overlay -->
		<div class="shine" class:visible={hovered}></div>

		<!-- rank -->
		<div class="rank-badge" class:is-medal={isTop3}>
			{rankLabel}
		</div>

		<!-- emoji -->
		<div class="emoji-wrap">
			<span class="emoji" style="--float-delay: {(rank * 137) % 3000}ms">{membro.emoji}</span>
		</div>

		<!-- animal name -->
		<div class="animal-name">
			{animalDisplay}
		</div>

		<!-- tap hint -->
		<div class="hint">Tocca per scoprire</div>
	</div>
</div>

<style>
	.card-wrapper {
		perspective: 1000px;
		cursor: pointer;
		animation: card-enter 0.45s ease both;
		animation-delay: calc(var(--i) * 50ms);
	}

	@keyframes card-enter {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.card {
		position: relative;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-top: 2px solid var(--accent);
		border-radius: 20px;
		padding: 1.1rem 0.8rem 0.9rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		overflow: hidden;
		transition:
			transform 0.15s ease,
			box-shadow 0.2s ease,
			background 0.2s ease,
			border-color 0.2s ease;
		transform-style: preserve-3d;
		transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
		will-change: transform;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
	}

	.card-wrapper:hover .card {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(255, 255, 255, 0.15);
		border-top-color: var(--accent);
		box-shadow:
			0 14px 42px rgba(0, 0, 0, 0.5),
			0 0 28px color-mix(in srgb, var(--accent) 30%, transparent);
		transform: translateY(-7px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
	}

	.card.top3 {
		border-top-width: 3px;
	}

	/* shine */
	.shine {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at var(--shine-x) var(--shine-y),
			rgba(255, 255, 255, 0.1) 0%,
			transparent 55%
		);
		border-radius: inherit;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.shine.visible {
		opacity: 1;
	}

	/* rank badge */
	.rank-badge {
		position: absolute;
		top: 0.55rem;
		left: 0.65rem;
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.8rem;
		color: var(--accent);
		letter-spacing: 0.05em;
		line-height: 1;
		opacity: 0.85;
	}

	.rank-badge.is-medal {
		font-size: 1rem;
	}

	/* emoji */
	.emoji-wrap {
		margin: 0.5rem 0 0.1rem;
	}

	.emoji {
		font-size: 3.2rem;
		line-height: 1;
		display: block;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
		animation: emoji-float 3.8s ease-in-out infinite;
		animation-delay: var(--float-delay);
		transition: transform 0.2s ease;
	}

	@keyframes emoji-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	.card-wrapper:hover .emoji {
		animation-play-state: paused;
		transform: scale(1.14) translateY(-3px);
	}

	.top3 .emoji {
		font-size: 4rem;
	}

	/* animal name */
	.animal-name {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.05rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		text-align: center;
		line-height: 1.1;
	}

	.top3 .animal-name {
		font-size: 1.2rem;
	}

	/* hint */
	.hint {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(240, 240, 250, 0.22);
		transition: color 0.2s;
	}

	.card-wrapper:hover .hint {
		color: color-mix(in srgb, var(--accent) 60%, rgba(240, 240, 250, 0.4));
	}
</style>

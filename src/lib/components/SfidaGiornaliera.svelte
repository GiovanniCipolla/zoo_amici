<script>
	import { getSfidaDelGiorno, oggiFormattato } from '$lib/sfide.js';

	const sfida = getSfidaDelGiorno();
	const data = oggiFormattato();
</script>

<div class="sfida-card">
	<div class="sfida-meta">
		<span class="sfida-tag">⚔️ Sfida del Giorno</span>
		<span class="sfida-date">{data}</span>
	</div>

	<div class="sfida-body">
		<span class="sfida-emoji">{sfida.emoji}</span>
		<div class="sfida-content">
			<p class="sfida-tema">{sfida.tema}</p>
			<p class="sfida-desc">{sfida.descrizione}</p>
		</div>
	</div>
</div>

<style>
	.sfida-card {
		max-width: 520px;
		margin: 0 auto 2rem;
		background: rgba(26, 176, 232, 0.05);
		border: 1px solid rgba(26, 176, 232, 0.16);
		border-radius: 20px;
		padding: 1.1rem 1.4rem 1.3rem;
		animation: fade-down 0.65s ease 0.18s both;
	}

	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.sfida-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
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

	.sfida-body {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.sfida-emoji {
		font-size: 2.4rem;
		line-height: 1;
		flex-shrink: 0;
		filter: drop-shadow(0 4px 10px rgba(26, 176, 232, 0.3));
		margin-top: 0.1rem;
	}

	.sfida-content {
		flex: 1;
		min-width: 0;
	}

	.sfida-tema {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.25rem;
		letter-spacing: 0.06em;
		color: #f0f0fa;
		margin-bottom: 0.45rem;
		line-height: 1.1;
	}

	.sfida-desc {
		font-size: 0.8rem;
		color: rgba(240, 240, 250, 0.5);
		line-height: 1.6;
	}

	@media (max-width: 480px) {
		.sfida-card {
			padding: 1rem 1.1rem 1.1rem;
		}
		.sfida-emoji {
			font-size: 2rem;
		}
	}
</style>

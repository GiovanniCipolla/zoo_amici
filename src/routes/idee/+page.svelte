<script>
	import { logIdeaZoo } from '$lib/logger.js';

	let testo = $state('');
	let stato = $state('idle'); // 'idle' | 'invio' | 'ok' | 'errore'

	const MAX = 500;

	async function invia() {
		const t = testo.trim();
		if (!t || stato === 'invio') return;

		stato = 'invio';
		try {
			await logIdeaZoo(t);
			stato = 'ok';
			testo = '';
		} catch {
			stato = 'errore';
		}
	}

	function reset() {
		stato = 'idle';
		testo = '';
	}
</script>

<!-- bg blobs decorativi -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<!-- back button -->
<div class="back-wrap">
	<a href="/" class="back-btn">← Home</a>
</div>

<main>
	<header>
		<p class="pre-title">Un canale diretto col trono</p>
		<h1>
			<span class="title-icon">💡</span>
			<span class="title-text">Idee per<br />lo Zoo</span>
		</h1>
		<p class="subtitle">
			Il Re degli Animali ha aperto le orecchie.<br />
			Sfrutta questa rara opportunità.
		</p>
	</header>

	<div class="info-box">
		<p class="info-line">
			<span class="info-icon">🦁</span>
			<span>Questo messaggio arriverà direttamente al <strong>Re indiscusso dello Zoo</strong>.</span>
		</p>
		<p class="info-line">
			<span class="info-icon">🕵️</span>
			<span>Il messaggio è <strong>completamente anonimo</strong>. Lui saprà solo quello che scrivi.</span>
		</p>
		<p class="info-line">
			<span class="info-icon">✍️</span>
			<span>Puoi salutarlo, dargli un'idea, un consiglio, una lamentela, un complimento immeritato.</span>
		</p>
		<p class="info-line">
			<span class="info-icon">⚠️</span>
			<span>Le decisioni restano comunque finali e non impugnabili.</span>
		</p>
	</div>

	{#if stato === 'ok'}
		<div class="esito-ok">
			<div class="esito-emoji">👑</div>
			<p class="esito-titolo">Messaggio recapitato al Re</p>
			<p class="esito-sub">Yayà lo leggerà sul suo trono dorato, probabilmente mentre ignora tutto il resto.</p>
			<button class="btn-secondary" onclick={reset}>Manda un altro →</button>
		</div>
	{:else if stato === 'errore'}
		<div class="esito-errore">
			<div class="esito-emoji">😿</div>
			<p class="esito-titolo">Qualcosa è andato storto</p>
			<p class="esito-sub">Il piccione viaggiatore si è perso. Riprova tra poco.</p>
			<button class="btn-secondary" onclick={reset}>Riprova →</button>
		</div>
	{:else}
		<div class="form-wrap">
			<label class="form-label" for="idea-input">Il tuo messaggio al Re</label>
			<textarea
				id="idea-input"
				class="form-textarea"
				placeholder="Scrivi qui la tua idea, un saluto, un'osservazione zoologica…"
				bind:value={testo}
				maxlength={MAX}
				rows="5"
				disabled={stato === 'invio'}
			></textarea>
			<div class="form-footer">
				<span class="char-count" class:warn={testo.length > MAX * 0.85}>
					{testo.length}/{MAX}
				</span>
				<button
					class="btn-invia"
					class:loading={stato === 'invio'}
					disabled={!testo.trim() || stato === 'invio'}
					onclick={invia}
				>
					{#if stato === 'invio'}
						<span class="spinner">⏳</span> Invio in corso…
					{:else}
						Invia al Re 🦁
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<footer>
		<p>🐾 Anonimato garantito · Il Re legge tutto · Risponde a nessuno</p>
	</footer>
</main>

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

	/* ── BACK ── */
	.back-wrap {
		position: relative;
		z-index: 10;
		padding: 1rem 1.5rem 0;
		max-width: 600px;
		margin: 0 auto;
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(240, 240, 250, 0.5);
		font-family: 'Outfit', sans-serif;
		font-size: 0.78rem;
		text-decoration: none;
		transition: all 0.18s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(240, 240, 250, 0.9);
		border-color: rgba(255, 255, 255, 0.2);
	}

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		max-width: 600px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 3rem 1rem 2rem;
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
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		display: inline-block;
		animation: bob 3s ease-in-out infinite;
	}

	@keyframes bob {
		0%, 100% { transform: translateY(0) rotate(-4deg); }
		50%       { transform: translateY(-6px) rotate(4deg); }
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.8rem, 7.5vw, 5.5rem);
		letter-spacing: 0.04em;
		color: #fff;
		text-shadow: 0 0 60px rgba(124, 58, 237, 0.25);
		text-align: left;
	}

	.subtitle {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.4);
		line-height: 1.6;
	}

	/* ── INFO BOX ── */
	.info-box {
		background: rgba(124, 58, 237, 0.07);
		border: 1px solid rgba(124, 58, 237, 0.2);
		border-radius: 18px;
		padding: 1.2rem 1.4rem;
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		animation: fade-down 0.65s ease 0.1s both;
	}

	.info-line {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.55);
		line-height: 1.55;
		margin: 0;
	}

	.info-icon {
		font-size: 1rem;
		flex-shrink: 0;
		margin-top: 0.05rem;
	}

	.info-line strong {
		color: rgba(240, 240, 250, 0.85);
		font-weight: 600;
	}

	/* ── FORM ── */
	.form-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		animation: fade-down 0.65s ease 0.15s both;
	}

	.form-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: rgba(240, 240, 250, 0.35);
		font-weight: 700;
	}

	.form-textarea {
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 1rem 1.2rem;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		line-height: 1.6;
		resize: vertical;
		outline: none;
		transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
		box-sizing: border-box;
	}

	.form-textarea::placeholder {
		color: rgba(240, 240, 250, 0.25);
	}

	.form-textarea:focus {
		border-color: rgba(124, 58, 237, 0.45);
		background: rgba(255, 255, 255, 0.07);
		box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
	}

	.form-textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.char-count {
		font-size: 0.72rem;
		color: rgba(240, 240, 250, 0.25);
		font-variant-numeric: tabular-nums;
		transition: color 0.2s;
	}

	.char-count.warn {
		color: rgba(251, 191, 36, 0.7);
	}

	.btn-invia {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem 1.6rem;
		border-radius: 999px;
		border: none;
		background: linear-gradient(135deg, #7c3aed, #6d28d9);
		color: #fff;
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
		box-shadow: 0 4px 20px rgba(124, 58, 237, 0.35);
		white-space: nowrap;
	}

	.btn-invia:hover:not(:disabled) {
		transform: translateY(-2px) scale(1.03);
		box-shadow: 0 8px 28px rgba(124, 58, 237, 0.5);
	}

	.btn-invia:active:not(:disabled) {
		transform: scale(0.97);
	}

	.btn-invia:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-invia.loading {
		opacity: 0.7;
		cursor: wait;
	}

	.spinner {
		animation: spin 1s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	/* ── ESITO OK ── */
	.esito-ok,
	.esito-errore {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		text-align: center;
		padding: 3rem 1rem;
		animation: fade-down 0.5s ease both;
	}

	.esito-emoji {
		font-size: 3.5rem;
		line-height: 1;
		margin-bottom: 0.3rem;
	}

	.esito-titolo {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.8rem;
		letter-spacing: 0.06em;
		color: #fff;
		margin: 0;
	}

	.esito-sub {
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.45);
		max-width: 360px;
		line-height: 1.6;
		margin: 0;
	}

	.btn-secondary {
		margin-top: 0.5rem;
		padding: 0.55rem 1.4rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(240, 240, 250, 0.65);
		font-family: 'Outfit', sans-serif;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #f0f0fa;
		border-color: rgba(255, 255, 255, 0.25);
	}

	/* ── FOOTER ── */
	footer {
		margin-top: auto;
		text-align: center;
		color: rgba(240, 240, 250, 0.18);
		font-size: 0.72rem;
		padding-top: 3rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main { padding: 0 0.9rem 3rem; }
		.back-wrap { padding: 0.7rem 0.9rem 0; }
		h1 { flex-direction: column; gap: 0.3rem; }
		.title-text { text-align: center; }
		.form-footer { flex-direction: column; align-items: flex-end; }
	}
</style>

<script>
	import { browser } from '$app/environment';
	import {
		getCurrentQuiz,
		getOptions,
		quizStorageKey,
		msUntilNextMonday,
		formatCountdown,
		scoreInfo
	} from '$lib/quiz.js';
	import { logQuiz } from '$lib/logger.js';

	const quiz = getCurrentQuiz();
	const storageKey = quiz ? quizStorageKey(quiz.weekStart) : null;

	// Leggi risultato salvato (solo browser)
	const savedResult =
		browser && storageKey
			? (() => {
					try {
						return JSON.parse(localStorage.getItem(storageKey) ?? 'null');
					} catch {
						return null;
					}
				})()
			: null;

	// stato: 'intro' | 'playing' | 'result' | 'empty'
	let stato = $state(!quiz ? 'empty' : savedResult ? 'result' : 'intro');
	let domandaIndex = $state(0);
	let risposte = $state(savedResult?.risposte ?? []);
	let sceltaFatta = $state(null); // oggetto membro scelto
	let mostraFeedback = $state(false);
	let countdown = $state('');

	$effect(() => {
		const tick = () => {
			countdown = formatCountdown(msUntilNextMonday());
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const domandaCorrente = $derived(
		quiz && stato === 'playing' ? quiz.domande[domandaIndex] : null
	);

	const opzioni = $derived(
		domandaCorrente
			? getOptions(domandaIndex, domandaCorrente.risposta, quiz.weekStart)
			: []
	);

	const punteggio = $derived(risposte.filter(Boolean).length);
	const totale = quiz?.domande.length ?? 5;
	const info = $derived(scoreInfo(punteggio, totale));

	const progressWidth = $derived(
		stato === 'playing' ? `${(domandaIndex / totale) * 100}%` : '0%'
	);

	function inizia() {
		domandaIndex = 0;
		risposte = [];
		sceltaFatta = null;
		mostraFeedback = false;
		stato = 'playing';
	}

	function rispondi(opzione) {
		if (sceltaFatta !== null) return;
		const esatta = opzione.nome === domandaCorrente.risposta;
		sceltaFatta = opzione;
		mostraFeedback = true;

		setTimeout(() => {
			const nuove = [...risposte, esatta];
			if (domandaIndex + 1 < quiz.domande.length) {
				risposte = nuove;
				domandaIndex = domandaIndex + 1;
				sceltaFatta = null;
				mostraFeedback = false;
			} else {
				risposte = nuove;
				if (browser && storageKey) {
					try {
						localStorage.setItem(storageKey, JSON.stringify({ risposte: nuove }));
					} catch {}
				}
				logQuiz(nuove.filter(Boolean).length, quiz.domande.length, nuove);
				stato = 'result';
			}
		}, 1600);
	}

	function optionState(opzione) {
		if (!mostraFeedback) return 'idle';
		if (opzione.nome === domandaCorrente?.risposta) return 'correct';
		if (sceltaFatta === opzione) return 'wrong';
		return 'faded';
	}

	const animalDisplay = (m) => (m.disambig ? `${m.animale} ${m.disambig}` : m.animale);
</script>

<!-- ── QUIZ DELLA SETTIMANA ── -->
<div class="quiz-card">

	<!-- ══ STATO: INTRO ══ -->
	{#if stato === 'intro'}
		<div class="quiz-intro" role="presentation">
			<div class="quiz-header">
				<span class="quiz-badge">🎯 Quiz della Settimana</span>
				<span class="quiz-meta">{totale} domande</span>
			</div>
			<p class="quiz-desc">
				Conosci davvero tutti gli animalacci del gruppo? Leggi la descrizione e indovina di chi si tratta. Una sola chance — poi il quiz si blocca fino alla settimana prossima.
			</p>
			<button class="btn-start" onclick={inizia}>
				Inizia il quiz <span class="btn-arrow">→</span>
			</button>
			<p class="quiz-countdown">
				<span class="countdown-label">Prossimo quiz tra</span>
				<span class="countdown-value">{countdown}</span>
			</p>
		</div>

	<!-- ══ STATO: PLAYING ══ -->
	{:else if stato === 'playing' && domandaCorrente}
		<div class="quiz-playing">
			<!-- Progress -->
			<div class="quiz-header">
				<span class="quiz-badge">🎯 Quiz della Settimana</span>
				<span class="quiz-meta">Domanda {domandaIndex + 1} di {totale}</span>
			</div>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {progressWidth}"></div>
			</div>

			<!-- Domanda (key per animazione al cambio) -->
			{#key domandaIndex}
				<p class="quiz-question">{domandaCorrente.testo}</p>
			{/key}

			<!-- Opzioni -->
			<div class="options-grid">
				{#each opzioni as opzione}
					{@const state = optionState(opzione)}
					<button
						class="option option-{state}"
						onclick={() => rispondi(opzione)}
						disabled={mostraFeedback}
						aria-label={animalDisplay(opzione)}
					>
						<span class="option-emoji">{opzione.emoji}</span>
						<span class="option-name">{animalDisplay(opzione)}</span>
						{#if mostraFeedback && state === 'correct'}
							<span class="option-reveal">→ {opzione.nome}</span>
						{/if}
						{#if state === 'correct'}
							<span class="option-check">✓</span>
						{:else if state === 'wrong'}
							<span class="option-x">✗</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

	<!-- ══ STATO: RESULT ══ -->
	{:else if stato === 'result'}
		<div class="quiz-result">
			<div class="quiz-header">
				<span class="quiz-badge">🎯 Quiz della Settimana</span>
				<span class="quiz-meta">Risultato</span>
			</div>

			<div class="result-score">
				<span class="score-emoji">{info.emoji}</span>
				<span class="score-number">{punteggio}<span class="score-total">/{totale}</span></span>
			</div>

			<p class="result-msg">{info.msg}</p>

			<!-- Badge risposta per risposta -->
			<div class="badges-row">
				{#each risposte as corretta, i}
					<div
						class="badge {corretta ? 'badge-ok' : 'badge-no'}"
						style="animation-delay: {i * 120}ms"
						aria-label={corretta ? 'Corretta' : 'Sbagliata'}
					>
						{corretta ? '✅' : '❌'}
					</div>
				{/each}
			</div>

			<p class="quiz-countdown">
				<span class="countdown-label">Prossimo quiz tra</span>
				<span class="countdown-value">{countdown}</span>
			</p>
		</div>

	<!-- ══ STATO: EMPTY (nessun quiz questa settimana) ══ -->
	{:else if stato === 'empty'}
		<div class="quiz-empty">
			<div class="quiz-header">
				<span class="quiz-badge">🎯 Quiz della Settimana</span>
			</div>
			<p class="quiz-desc">Nessun quiz questa settimana. Torna presto.</p>
			<p class="quiz-countdown">
				<span class="countdown-label">Prossimo lunedì tra</span>
				<span class="countdown-value">{countdown}</span>
			</p>
		</div>
	{/if}

</div>

<style>
	/* ── CARD CONTENITORE ── */
	.quiz-card {
		max-width: 520px;
		margin: 0 auto 2.5rem;
		background: rgba(124, 58, 237, 0.07);
		border: 1px solid rgba(124, 58, 237, 0.2);
		border-radius: 22px;
		padding: 1.4rem 1.6rem;
		animation: fade-down 0.65s ease 0.22s both;
	}

	@keyframes fade-down {
		from { opacity: 0; transform: translateY(-14px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── HEADER INTERNO ── */
	.quiz-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.quiz-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
		color: #a78bfa;
	}

	.quiz-meta {
		font-size: 0.68rem;
		color: rgba(240, 240, 250, 0.3);
	}

	/* ── DESCRIZIONE / INTRO ── */
	.quiz-desc {
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.55);
		line-height: 1.6;
		margin-bottom: 1.3rem;
	}

	/* ── BOTTONE START ── */
	.btn-start {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(124, 58, 237, 0.3);
		border: 1px solid rgba(124, 58, 237, 0.5);
		border-radius: 999px;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.6rem 1.4rem;
		cursor: pointer;
		transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
		margin-bottom: 1.1rem;
	}

	.btn-start:hover {
		background: rgba(124, 58, 237, 0.45);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
	}

	.btn-arrow {
		transition: transform 0.18s ease;
	}

	.btn-start:hover .btn-arrow {
		transform: translateX(4px);
	}

	/* ── COUNTDOWN ── */
	.quiz-countdown {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
	}

	.countdown-label {
		color: rgba(240, 240, 250, 0.25);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.countdown-value {
		color: rgba(167, 139, 250, 0.7);
		font-family: 'Bebas Neue', sans-serif;
		letter-spacing: 0.08em;
		font-size: 0.8rem;
	}

	/* ── PROGRESS BAR ── */
	.progress-bar {
		height: 3px;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: 1.3rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #7c3aed, #a78bfa);
		border-radius: 999px;
		transition: width 0.4s ease;
	}

	/* ── DOMANDA ── */
	.quiz-question {
		font-size: 0.9rem;
		color: rgba(240, 240, 250, 0.85);
		line-height: 1.65;
		margin-bottom: 1.3rem;
		font-style: italic;
		animation: question-enter 0.35s ease both;
	}

	@keyframes question-enter {
		from { opacity: 0; transform: translateY(10px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── OPZIONI ── */
	.options-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}

	.option {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.75rem 0.6rem 0.6rem;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
		overflow: hidden;
	}

	.option:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.16);
		transform: translateY(-2px);
	}

	.option:disabled {
		cursor: default;
	}

	.option-emoji {
		font-size: 1.8rem;
		line-height: 1;
		filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
	}

	.option-name {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
		text-align: center;
	}

	.option-reveal {
		font-size: 0.65rem;
		color: rgba(240, 240, 250, 0.5);
		letter-spacing: 0.05em;
		animation: fade-in 0.3s ease;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.option-check,
	.option-x {
		position: absolute;
		top: 0.4rem;
		right: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
	}

	/* ── STATI OPZIONI ── */
	.option-correct {
		background: rgba(34, 197, 94, 0.18) !important;
		border-color: rgba(34, 197, 94, 0.5) !important;
		animation: correct-pop 0.45s ease both;
	}

	.option-check {
		color: #4ade80;
	}

	@keyframes correct-pop {
		0%   { transform: scale(1); }
		35%  { transform: scale(1.06); }
		100% { transform: scale(1); }
	}

	.option-wrong {
		background: rgba(239, 68, 68, 0.18) !important;
		border-color: rgba(239, 68, 68, 0.5) !important;
		animation: wrong-shake 0.45s ease both;
	}

	.option-x {
		color: #f87171;
	}

	@keyframes wrong-shake {
		0%, 100% { transform: translateX(0); }
		20%      { transform: translateX(-7px); }
		40%      { transform: translateX(7px); }
		60%      { transform: translateX(-5px); }
		80%      { transform: translateX(5px); }
	}

	.option-faded {
		opacity: 0.3;
	}

	/* ── RISULTATO ── */
	.result-score {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.6rem;
	}

	.score-emoji {
		font-size: 2.2rem;
		line-height: 1;
		animation: score-enter 0.5s ease both;
	}

	.score-number {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 3rem;
		color: #f0f0fa;
		letter-spacing: 0.04em;
		line-height: 1;
		animation: score-enter 0.5s ease 0.1s both;
	}

	.score-total {
		font-size: 1.6rem;
		color: rgba(240, 240, 250, 0.35);
	}

	@keyframes score-enter {
		from { opacity: 0; transform: scale(0.6); }
		to   { opacity: 1; transform: scale(1); }
	}

	.result-msg {
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.5);
		margin-bottom: 1.2rem;
		line-height: 1.5;
	}

	/* ── BADGES ── */
	.badges-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.2rem;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 1.4rem;
		line-height: 1;
		opacity: 0;
		animation: badge-pop 0.4s ease forwards;
	}

	@keyframes badge-pop {
		0%   { opacity: 0; transform: scale(0) translateY(8px); }
		65%  { transform: scale(1.25) translateY(-2px); }
		100% { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 480px) {
		.quiz-card {
			padding: 1.1rem 1.1rem;
		}

		.options-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.option-emoji {
			font-size: 1.5rem;
		}

		.score-number {
			font-size: 2.4rem;
		}
	}
</style>

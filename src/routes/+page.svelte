<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { puoRiscuotiBonus, riscuotiBonus, getSecondiAlProssimoRiscuoti } from '$lib/economia.js';
	import { getFingerprint } from '$lib/fingerprint.js';

	// Giornale — visibile dal 29/05/2026 per 3 giorni
	const GIORNALE_SCADE = new Date('2026-06-01T23:59:59').getTime();
	const mostraGiornale = Date.now() < GIORNALE_SCADE;
	let giornaleAperto = $state(
		browser ? localStorage.getItem('zoo_giornale_aperto') !== '0' : true
	);
	function toggleGiornale() {
		giornaleAperto = !giornaleAperto;
		if (browser) localStorage.setItem('zoo_giornale_aperto', giornaleAperto ? '1' : '0');
	}

	let puoRiscuotire = $state(false);
	let secondiRimasti = $state(0);
	let flashSuccesso = $state(false);
	let timer = null;

	function pad(n) {
		return String(n).padStart(2, '0');
	}

	function formatCountdown(sec) {
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		const s = sec % 60;
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	}

	function aggiorna() {
		puoRiscuotire = puoRiscuotiBonus();
		secondiRimasti = getSecondiAlProssimoRiscuoti();
	}

	async function claimBonus() {
		if (!puoRiscuotire) return;
		const fp = await getFingerprint();
		const ok = await riscuotiBonus(fp);
		if (ok) {
			flashSuccesso = true;
			setTimeout(() => (flashSuccesso = false), 2000);
			aggiorna();
		}
	}

	onMount(() => {
		aggiorna();
		timer = setInterval(aggiorna, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<!-- bg blobs decorativi -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<header>
		<p class="pre-title">Benvenuto nel</p>
		<h1>
			<span class="title-icon">🐾</span>
			<span class="title-text">Zoo degli<br />Amici</span>
		</h1>
		<p class="subtitle">Scegli dove vuoi andare</p>

		<!-- Bottone Riscuoti -->
		<div class="riscuoti-wrap">
			{#if puoRiscuotire}
				<button
					class="riscuoti-btn riscuoti-attivo"
					class:flash={flashSuccesso}
					onclick={claimBonus}
				>
					{#if flashSuccesso}
						<span>✅ +5W riscossi!</span>
					{:else}
						<span>🪙 Riscuoti 5W</span>
					{/if}
				</button>
			{:else}
				<div class="riscuoti-countdown">
					<span class="riscuoti-icon">⏳</span>
					<span class="riscuoti-timer">{formatCountdown(secondiRimasti)}</span>
					<span class="riscuoti-label">al prossimo bonus</span>
				</div>
			{/if}
		</div>
	</header>

	<!-- ── GIORNALE ── -->
	{#if mostraGiornale}
	<div class="giornale">
		<div class="giornale-testata">
			<div class="giornale-data">Venerdì 29 Maggio 2026 · Anno I · N. 1</div>
			<div class="giornale-titolo-testata">La Gazzetta dello Zoo</div>
			<div class="giornale-sottotitolo-testata">Il quotidiano degli animalacci · «La verità, tutta la verità, quasi tutta la verità»</div>
			<button class="giornale-toggle" onclick={toggleGiornale} title={giornaleAperto ? 'Comprimi' : 'Espandi'}>
				{giornaleAperto ? '▲ Chiudi' : '▼ Leggi'}
			</button>
		</div>

		{#if giornaleAperto}
		<div class="giornale-manchette">
			<span class="manchette-badge">🔥 EDIZIONE STRAORDINARIA</span>
			<span class="manchette-sep">·</span>
			<span>CLASSIFICA RIVOLUZIONATA · DUE NEW ENTRY · IL TORNEO INFIAMMA LO ZOO</span>
		</div>

		<div class="giornale-headline">
			YAYÀ SFONDA IL PODIO, NICOLA PRECIPITA ALL'INFERNO
		</div>
		<div class="giornale-occhiello">
			Il Leone scalza Peppe dal terzo gradino. La Cimice di Di Menna stupisce tutti. Due nuovi arrivati scuotono le fondamenta dello zoo.
		</div>

		<div class="giornale-columns">
			<div class="giornale-col">
				<h3 class="col-title">📈 I GRANDI SALTI</h3>
				<p>È stata una settimana di terremoti. <strong>Yayà</strong>, il Leone dal portamento regale, compie il balzo più atteso: dal settimo al terzo posto, conquistando il podio con la naturalezza di chi sa di meritarlo da sempre. "Re indiscusso", recita la sua scheda. Finalmente la classifica si adegua.</p>
				<p><strong>Fetente</strong> incalza subito dietro, stabile al quarto: il Cavallo che corre quando vuole si è evidentemente deciso a volerlo. <strong>Di Menna</strong> è la vera sorpresa: la Cimice passa dal 14° all'8° posto in un sol colpo. Non invitata, ma sempre presente — e ora anche temuta.</p>
				<p><strong>Angelone</strong> il Delfino balza dal 19° al 10°, <strong>Geremia</strong> il Canguro dal 27° al 19°. E il clamoroso caso <strong>Giancarlo</strong>: il Pavone, che era ultimo, si ritrova al 21° posto. Ha aperto la coda, evidentemente, nel posto giusto.</p>

				<h3 class="col-title" style="margin-top:1rem">📉 LE CADUTE ILLUSTRI</h3>
				<p>Ma la classifica dà e la classifica toglie. <strong>Peppe</strong> la Pecora precipita dal podio al 9° posto. Il "Beeeeh" si è trasformato in un bel "Baah" di delusione. <strong>Alessia</strong> la Varana scivola dal 6° al 13°, <strong>Concetta</strong> lo Squalo dal 12° al 23°.</p>
				<p>Il caso più clamoroso, però, è <strong>Nicola</strong>: l'Ululatore Professionista crolla dall'11° al 33° posto. Ventidué posizioni in caduta libera. Fonti vicine al lupo parlano di «distrazione stagionale». Rimane da capire di quale stagione.</p>
			</div>

			<div class="giornale-col">
				<h3 class="col-title">🆕 I NUOVI ARRIVATI</h3>
				<p>Lo zoo accoglie due new entry che promettono di fare rumore. <strong>Matteo il Pipistrello</strong> 🦇 entra direttamente al 12° posto: vola di notte, dorme di giorno, e non si scusa con nessuno. Una presenza silenziosa ma inquietante.</p>
				<p>Al 14° posto debutta <strong>Chiara la Coyote</strong> 🦊, più furba di quanto sembri — e lo sa benissimo. Con l'arrivo di una seconda Chiara nello zoo, la redazione precisa: la veterana dello Struzzo è ora ufficialmente riconoscibile dalla propria disambiguazione anagrafica. Nessuna confusione sarà tollerata.</p>

				<div class="giornale-box-torneo">
					<h3 class="col-title">⚔️ SPECIALE TORNEO</h3>
					<p><em>La partita più sottovalutata del turno?</em> <strong>Nunzia vs Vincenzina</strong>. Cavalla contro Antilope: pochi si aspettavano qualcosa di memorabile, e invece la sfida ha regalato un match tecnicamente sopraffino, tiratissimo, con picchi di visualizzazioni inaspettati. La Cavalla ha prevalso, ma l'Antilope ha lasciato il segno.</p>
					<p>Poi ci sono i dominatori: <strong>Yayà</strong> ha demolito il suo avversario con quella che le cronache definiscono "supremazia devastante". Stesso copione per <strong>Fetente</strong> e <strong>Marcò</strong> la Cozza, che ha sorpreso tutti con una solidità degna di un mollusco di rango. <strong>Di Menna</strong> — a sorpresa, ma poi neanche tanto — si è rivelata una forza della natura.</p>
					<p>Note di merito per <strong>Pompoff</strong> lo Scoiattolo e <strong>Anthony</strong> la Gazza Ladra: consapevoli della propria forza, hanno affrontato rispettivamente il Pavone Giancarlo e il Delfino Angelone in match brutali, al limite delle proprie possibilità. Hanno vinto, ma ci hanno lasciato le piume — e qualche noce.</p>
					<p>La <strong>Leonessa Luisa</strong>, regina indiscussa, ha semplicemente annientato Geremia il Canguro. Navigato avversario, certo. Ma la differenza di classe era siderale.</p>
					<p><strong>Prossimi incontri:</strong> Tutti attendono <strong>Bea vs Senza Nome</strong> (l'Ornitorinco). La Leonessa entrerà in campo con l'appetito di chi non ha ancora mangiato abbastanza. Il glitch della creazione divina verrà sbranato, è solo questione di tempo e di minuti.</p>
					<p>Più aperto il confronto tra <strong>Nicola</strong> il Lupo — che sembra in vacanza permanente, con tutto quello che comporta — e <strong>Jacopo</strong> il Grillo, che ci metterà tutto e anche di più. Cri cri cri, ma con determinazione.</p>
					<p>E poi c'è <strong>il Derby dei Lupetti</strong>: <strong>Nico Nico</strong> contro <strong>Tevez</strong>. Lupo in miniatura contro lupo in miniatura. Una sfida di famiglia, di orgoglio, di territorialità del divano. Lo zoo intero trattiene il fiato.</p>
				</div>
			</div>
		</div>

		<div class="giornale-footer">
			<span>© La Gazzetta dello Zoo · Tutti i diritti riservati · La classifica è non impugnabile</span>
		</div>
		{/if}
	</div>
	{/if}

	<div class="hub-grid">
		<!-- Classifica -->
		<a href="/classifica" class="hub-card card-classifica">
			<span class="card-emoji">🏅</span>
			<p class="card-title">Classifica</p>
			<p class="card-desc">Chi è l'animaletto del momento?</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Torneo -->
		<a href="/torneo" class="hub-card card-torneo">
			<span class="card-emoji">⚔️</span>
			<p class="card-title">Torneo</p>
			<p class="card-desc">Vota il tuo campione</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Minigiochi -->
		<a href="/minigiochi" class="hub-card card-minigiochi">
			<span class="card-emoji">🎮</span>
			<p class="card-title">Minigiochi</p>
			<p class="card-desc">Flappy Zoo · nessuna puntata</p>
			<span class="card-cta">Vai →</span>
		</a>

		<!-- Sala Ludopatia -->
		<a href="/ludopatia" class="hub-card card-ludopatia">
			<span class="card-emoji">🎰</span>
			<p class="card-title">Sala Ludopatia</p>
			<p class="card-desc">Slot, scommesse e bluff · a tuo rischio</p>
			<span class="card-cta">Entra →</span>
		</a>

		<!-- Achievement -->
		<a href="/achievement" class="hub-card card-achievement">
			<span class="card-emoji">🏆</span>
			<p class="card-title">Achievement</p>
			<p class="card-desc">Scopri i tuoi badge</p>
			<span class="card-cta">Vai →</span>
		</a>
	</div>

	<footer>
		<p>🐾 Classifica non impugnabile · Decisioni finali e inappellabili</p>
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

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 1.5rem 5rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	/* ── HEADER ── */
	header {
		text-align: center;
		padding: 3rem 1rem 2.5rem;
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
		font-size: clamp(2.5rem, 6vw, 5rem);
		animation: paw-rock 4s ease-in-out infinite;
		display: inline-block;
	}

	@keyframes paw-rock {
		0%, 100% { transform: rotate(-5deg) scale(1); }
		50%       { transform: rotate(6deg) scale(1.08); }
	}

	.title-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.8rem, 7.5vw, 6rem);
		letter-spacing: 0.04em;
		color: #fff;
		text-shadow: 0 0 60px rgba(124, 58, 237, 0.2);
		text-align: left;
	}

	.subtitle {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(240, 240, 250, 0.38);
	}

	/* ── RISCUOTI ── */
	.riscuoti-wrap {
		display: flex;
		justify-content: center;
		margin-top: 1.4rem;
	}

	.riscuoti-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.5rem;
		border-radius: 999px;
		border: none;
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
	}

	.riscuoti-attivo {
		background: linear-gradient(135deg, #f59e0b, #fbbf24);
		color: #1a1200;
		box-shadow: 0 4px 24px rgba(251, 191, 36, 0.4);
	}

	.riscuoti-attivo:hover {
		transform: translateY(-2px) scale(1.04);
		box-shadow: 0 8px 32px rgba(251, 191, 36, 0.55);
	}

	.riscuoti-attivo:active {
		transform: scale(0.97);
	}

	.riscuoti-attivo.flash {
		background: linear-gradient(135deg, #22c55e, #4ade80);
		color: #002200;
		box-shadow: 0 6px 28px rgba(34, 197, 94, 0.5);
	}

	.riscuoti-countdown {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1.2rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		font-family: 'Outfit', sans-serif;
		font-size: 0.82rem;
		color: rgba(240, 240, 250, 0.45);
	}

	.riscuoti-timer {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: rgba(240, 240, 250, 0.7);
		letter-spacing: 0.05em;
	}

	.riscuoti-icon {
		font-size: 0.9rem;
	}

	/* ── GIORNALE ── */
	.giornale {
		background: #fdf6e3;
		border: 2px solid #c8a84b;
		border-radius: 4px;
		padding: 0;
		margin-bottom: 2rem;
		color: #1a1008;
		font-family: 'Georgia', 'Times New Roman', serif;
		box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 4px rgba(200,168,75,0.15);
		animation: fade-down 0.65s ease 0.05s both;
		overflow: hidden;
	}

	.giornale-testata {
		background: #1a1008;
		padding: 0.9rem 1.2rem 0.8rem;
		text-align: center;
		border-bottom: 3px double #c8a84b;
	}
	.giornale-data {
		font-size: 0.6rem;
		letter-spacing: 0.18em;
		color: rgba(253,246,227,0.5);
		text-transform: uppercase;
		margin-bottom: 0.3rem;
	}
	.giornale-titolo-testata {
		font-family: 'Bebas Neue', serif;
		font-size: clamp(1.8rem, 5vw, 3.2rem);
		letter-spacing: 0.06em;
		color: #f0d060;
		line-height: 1;
		text-shadow: 0 2px 8px rgba(240,208,96,0.3);
	}
	.giornale-sottotitolo-testata {
		font-size: 0.62rem;
		color: rgba(253,246,227,0.4);
		font-style: italic;
		margin-top: 0.25rem;
	}

	.giornale-toggle {
		margin-top: 0.5rem;
		padding: 0.25rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(240, 208, 96, 0.35);
		background: transparent;
		color: rgba(240, 208, 96, 0.65);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.18s ease;
		font-family: 'Outfit', sans-serif;
	}
	.giornale-toggle:hover {
		background: rgba(240, 208, 96, 0.1);
		color: #f0d060;
		border-color: rgba(240, 208, 96, 0.6);
	}

	.giornale-manchette {
		background: #c8a84b;
		color: #1a1008;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.3rem 1rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.manchette-badge {
		background: #1a1008;
		color: #f0d060;
		padding: 0.1rem 0.5rem;
		border-radius: 2px;
	}
	.manchette-sep { opacity: 0.5; }

	.giornale-headline {
		font-family: 'Bebas Neue', serif;
		font-size: clamp(1.4rem, 4vw, 2.2rem);
		letter-spacing: 0.04em;
		color: #1a1008;
		text-align: center;
		padding: 1rem 1.2rem 0.3rem;
		line-height: 1.15;
		border-bottom: 1px solid #c8a84b;
	}

	.giornale-occhiello {
		font-size: 0.82rem;
		color: #3a2808;
		text-align: center;
		padding: 0.5rem 1.4rem 0.8rem;
		font-style: italic;
		border-bottom: 3px double #c8a84b;
		line-height: 1.55;
	}

	.giornale-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		padding: 0;
	}

	.giornale-col {
		padding: 1rem 1.1rem;
		font-size: 0.78rem;
		line-height: 1.65;
		color: #2a1a08;
	}
	.giornale-col:first-child {
		border-right: 1px solid #c8a84b;
	}
	.giornale-col p {
		margin-bottom: 0.6rem;
		text-align: justify;
	}
	.giornale-col strong { color: #1a1008; font-weight: 700; }

	.col-title {
		font-family: 'Bebas Neue', serif;
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		color: #1a1008;
		border-bottom: 1px solid #c8a84b;
		padding-bottom: 0.25rem;
		margin-bottom: 0.6rem;
	}

	.giornale-box-torneo {
		background: rgba(200,168,75,0.1);
		border: 1px solid #c8a84b;
		border-radius: 3px;
		padding: 0.7rem 0.8rem;
		margin-top: 0.5rem;
	}
	.giornale-box-torneo .col-title { margin-top: 0; }
	.giornale-box-torneo p em { color: #7a4a08; }

	.giornale-footer {
		background: #1a1008;
		color: rgba(253,246,227,0.35);
		font-size: 0.58rem;
		text-align: center;
		padding: 0.4rem 1rem;
		letter-spacing: 0.1em;
		border-top: 1px solid #c8a84b;
	}

	@media (max-width: 600px) {
		.giornale-columns { grid-template-columns: 1fr; }
		.giornale-col:first-child { border-right: none; border-bottom: 1px solid #c8a84b; }
		.giornale-col { font-size: 0.74rem; padding: 0.8rem; }
		.giornale-headline { font-size: 1.3rem; padding: 0.8rem 0.8rem 0.25rem; }
		.giornale-occhiello { font-size: 0.75rem; padding: 0.4rem 0.8rem 0.6rem; }
	}

	/* ── HUB GRID ── */
	.hub-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4rem;
		animation: fade-down 0.65s ease 0.12s both;
	}

	/* ── HUB CARD BASE ── */
	.hub-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		padding: 2.4rem 1.5rem 2rem;
		background: rgba(255, 255, 255, 0.045);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 22px;
		text-decoration: none;
		color: #f0f0fa;
		text-align: center;
		transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease;
	}

	.card-emoji {
		font-size: 3.2rem;
		line-height: 1;
		transition: transform 0.22s ease;
	}

	.hub-card:hover .card-emoji {
		transform: scale(1.18) rotate(6deg);
	}

	.card-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.7rem;
		letter-spacing: 0.06em;
		color: #fff;
		margin: 0;
	}

	.card-desc {
		font-size: 0.78rem;
		color: rgba(240, 240, 250, 0.42);
		line-height: 1.5;
		margin: 0;
	}

	.card-cta {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		opacity: 0;
		transform: translateY(5px);
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.hub-card:hover .card-cta {
		opacity: 1;
		transform: translateY(0);
	}

	/* ── PER-CARD HOVER COLORS ── */
	.card-classifica:hover {
		background: rgba(124, 58, 237, 0.1);
		border-color: rgba(124, 58, 237, 0.4);
		box-shadow: 0 12px 44px rgba(124, 58, 237, 0.18);
		transform: translateY(-5px) scale(1.02);
	}
	.card-classifica .card-cta { color: #a78bfa; }

	.card-torneo:hover {
		background: rgba(232, 75, 75, 0.1);
		border-color: rgba(232, 75, 75, 0.4);
		box-shadow: 0 12px 44px rgba(232, 75, 75, 0.18);
		transform: translateY(-5px) scale(1.02);
	}
	.card-torneo .card-cta { color: #f87171; }

	.card-minigiochi:hover {
		background: rgba(255, 215, 0, 0.08);
		border-color: rgba(255, 215, 0, 0.35);
		box-shadow: 0 12px 44px rgba(255, 215, 0, 0.15);
		transform: translateY(-5px) scale(1.02);
	}
	.card-minigiochi .card-cta { color: #fbbf24; }

	.card-ludopatia:hover {
		background: rgba(220, 38, 38, 0.1);
		border-color: rgba(220, 38, 38, 0.4);
		box-shadow: 0 12px 44px rgba(220, 38, 38, 0.18);
		transform: translateY(-5px) scale(1.02);
	}
	.card-ludopatia .card-cta { color: #f87171; }

	.card-achievement {
		grid-column: 1 / -1;
		width: calc(50% - 0.7rem);
		margin: 0 auto;
	}

	.card-achievement:hover {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.35);
		box-shadow: 0 12px 44px rgba(34, 197, 94, 0.15);
		transform: translateY(-5px) scale(1.02);
	}
	.card-achievement .card-cta { color: #4ade80; }

	/* ── FOOTER ── */
	footer {
		text-align: center;
		color: rgba(240, 240, 250, 0.2);
		font-size: 0.75rem;
		padding-top: 3rem;
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		main {
			padding: 0 0.9rem 3rem;
			justify-content: flex-start;
		}
		.hub-grid {
			gap: 0.9rem;
		}
		header { padding: 2rem 0.5rem 1.5rem; }
		h1 { flex-direction: column; gap: 0.3rem; }
		.title-text { text-align: center; }
		.hub-card {
			padding: 1.6rem 1rem 1.4rem;
			gap: 0.5rem;
		}
		.card-emoji { font-size: 2.4rem; }
		.card-title { font-size: 1.3rem; }
		.card-desc { font-size: 0.72rem; }
		.card-achievement {
			width: 100%;
		}
	}
</style>

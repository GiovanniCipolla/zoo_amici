<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { membri } from '$lib/membri.js';
	import { getSaldo, spendSaldo, addSaldo } from '$lib/economia.js';
	import { unlock, checkEconomyAchievements } from '$lib/achievements.js';

	const PUNTATA = 1;
	const STORIA_MAX = 10;

	// ── Stato ─────────────────────────────────────────────────────────
	let fase = $state('attesa'); // 'attesa' | 'gioco' | 'ritirato' | 'svenuto'
	let animale = $state(null);
	let moltiplicatore = $state(1.0);
	let crashPoint = $state(0);
	let saldo = $state(0);
	let storia = $state([]); // [{ val, esito: 'cashout'|'crash' }]
	let beers = $state([]);
	let showInfo = $state(false);
	let screenFlash = $state(false);
	let beerIdCounter = 0;
	let maxMolt = $state(1.0); // massimo mult raggiunto nel round corrente

	const saldoInsuff = $derived(saldo < PUNTATA);

	const statoAnimale = $derived(
		fase !== 'gioco'
			? 'idle'
			: moltiplicatore >= 6
				? 'fuori'
				: moltiplicatore >= 3
					? 'ubriaco'
					: moltiplicatore >= 1.5
						? 'brillo'
						: 'sobrio'
	);

	const multColore = $derived(
		moltiplicatore >= 10
			? '#ef4444'
			: moltiplicatore >= 5
				? '#f97316'
				: moltiplicatore >= 2
					? '#eab308'
					: '#e2e8f0'
	);

	const guadagnoNetto = $derived(moltiplicatore - PUNTATA);

	let tickerId = null;
	let beerTick = 0;

	onMount(() => {
		if (!browser) return;
		saldo = getSaldo();
		try {
			storia = JSON.parse(localStorage.getItem('zoo_cenzino_storia') ?? '[]');
		} catch {
			storia = [];
		}
	});

	onDestroy(() => {
		if (tickerId) clearInterval(tickerId);
	});

	function generaCrashPoint() {
		const r = Math.random();
		if (r < 0.01) return 1.0; // 1% crash istantaneo
		return Math.max(1.0, parseFloat((0.99 / (1 - r)).toFixed(2)));
	}

	function spawnBeer() {
		const id = ++beerIdCounter;
		beers = [
			...beers,
			{
				id,
				x: 8 + Math.random() * 84,
				y: 6 + Math.random() * 22,
				size: 1.3 + Math.random() * 0.7
			}
		];
		setTimeout(() => {
			beers = beers.filter((b) => b.id !== id);
		}, 950);
	}

	function inizia() {
		if (saldoInsuff || fase === 'gioco') return;

		spendSaldo(PUNTATA);
		saldo = getSaldo();

		animale = membri[Math.floor(Math.random() * membri.length)];
		crashPoint = generaCrashPoint();
		moltiplicatore = 1.0;
		maxMolt = 1.0;
		beers = [];
		beerTick = 0;
		fase = 'gioco';

		unlock('cenzino_debutto');
		checkEconomyAchievements();

		tickerId = setInterval(() => {
			const nm = parseFloat((moltiplicatore * 1.012).toFixed(2));
			moltiplicatore = nm;
			if (nm > maxMolt) maxMolt = nm;

			beerTick++;
			if (beerTick % 7 === 0) spawnBeer(); // ~ogni 350ms

			if (nm >= crashPoint) {
				eseguiCrash();
			}
		}, 50);
	}

	function ritirati() {
		if (fase !== 'gioco') return;
		clearInterval(tickerId);
		tickerId = null;

		const vincita = moltiplicatore;
		addSaldo(vincita, 'cenzino_vincita');
		saldo = getSaldo();
		beers = [];
		fase = 'ritirato';

		if (vincita < 2) unlock('cenzino_moderato');
		verificaAchievements();
		checkEconomyAchievements();
		aggiornastoria(vincita, 'cashout');
	}

	function eseguiCrash() {
		clearInterval(tickerId);
		tickerId = null;
		moltiplicatore = crashPoint; // mostra il punto esatto di crash
		beers = [];
		fase = 'svenuto';

		screenFlash = true;
		setTimeout(() => {
			screenFlash = false;
		}, 380);

		verificaAchievements();
		aggiornastoria(crashPoint, 'crash');
	}

	function verificaAchievements() {
		if (maxMolt >= 20) unlock('cenzino_leggenda');
		if (maxMolt >= 10) unlock('cenzino_temerario');
		if (maxMolt >= 5) unlock('cenzino_coraggioso');
	}

	function aggiornastoria(val, esito) {
		storia = [{ val: parseFloat(val.toFixed(2)), esito }, ...storia].slice(0, STORIA_MAX);
		if (browser) {
			localStorage.setItem('zoo_cenzino_storia', JSON.stringify(storia));
		}
	}

	function nuovaPartita() {
		fase = 'attesa';
		beers = [];
		moltiplicatore = 1.0;
		animale = null;
	}

	function pillColore(item) {
		if (item.esito === 'crash') return '#dc2626';
		if (item.val >= 10) return '#22c55e';
		if (item.val >= 5) return '#84cc16';
		if (item.val >= 2) return '#f59e0b';
		return '#6b7280';
	}
</script>

<!-- Flash schermo su crash -->
{#if screenFlash}
	<div class="screen-flash" aria-hidden="true"></div>
{/if}

<!-- BG blobs -->
<div class="bg-blobs" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<main>
	<!-- ── HEADER ── -->
	<header>
		<button class="back-btn" onclick={() => goto('/minigiochi')}>← Minigiochi</button>
		<h1>
			<span class="title-icon">🍺</span>
			<span class="title-text">Zoo a Cenzino</span>
		</h1>
		<p class="subtitle">Scegli quando ritirarti · prima che l'animale sviene</p>
	</header>

	<!-- ── WALLET BAR ── -->
	<div class="wallet-bar">
		<span class="wallet-icon">💰</span>
		<span class="wallet-saldo">€{saldo.toFixed(2)}</span>
		<span class="wallet-costo">Puntata: €{PUNTATA}/partita</span>
	</div>

	<!-- ── STORIA CRASH ── -->
	{#if storia.length > 0}
		<div class="storia-wrap">
			<span class="storia-label">Ultimi:</span>
			<div class="storia-bar">
				{#each storia as item}
					<div
						class="storia-pill"
						style="background: {pillColore(item)}"
						title="{item.esito === 'crash' ? 'Crash' : 'Ritirato'} a {item.val.toFixed(2)}x"
					>
						{item.val.toFixed(2)}x
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── MACHINE ── -->
	<div class="machine-wrap">
		<div class="machine">
			<!-- Luci in cima (ambra) -->
			<div class="machine-lights" aria-hidden="true">
				{#each Array(9) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>

			<!-- ── INFO PANEL ── -->
			<div class="info-panel">
				<button class="info-toggle" onclick={() => (showInfo = !showInfo)}>
					<span>ℹ️ Come si gioca</span>
					<span class="info-arrow">{showInfo ? '▲' : '▼'}</span>
				</button>
				{#if showInfo}
					<div class="info-content">
						<div class="info-grid">
							<div class="info-item">
								<span>🍺</span>
								<div>
									<strong>Punta €1</strong><br />
									<small>Un animale dello Zoo inizia a bere birra</small>
								</div>
							</div>
							<div class="info-item">
								<span>📈</span>
								<div>
									<strong>Il moltiplicatore sale</strong><br />
									<small>Più aspetti, più guadagni se ti ritiri</small>
								</div>
							</div>
							<div class="info-item">
								<span>💰</span>
								<div>
									<strong>Ritirati in tempo</strong><br />
									<small>Incassi €1 × moltiplicatore attuale</small>
								</div>
							</div>
							<div class="info-item">
								<span>💀</span>
								<div>
									<strong>Attento!</strong><br />
									<small>Se sviene prima che ti ritiri, perdi €1</small>
								</div>
							</div>
						</div>
						<div class="info-prob">
							~50% crash prima di 2x · ~80% prima di 5x · ~90% prima di 10x · ~99% prima di 100x
						</div>
					</div>
				{/if}
			</div>

			<!-- ── GAME DISPLAY ── -->
			<div class="game-display">
				<!-- Zona animale -->
				<div class="animal-zone">
					{#if animale}
						<div class="animal-wrap" class:crash-wrap={fase === 'svenuto'}>
							<!-- Birre volanti -->
							{#each beers as beer (beer.id)}
								<div
									class="beer-fly"
									style="left:{beer.x}%;top:{beer.y}%;font-size:{beer.size}rem"
									aria-hidden="true"
								>
									🍺
								</div>
							{/each}

							<!-- Bolla stato -->
							{#if fase === 'gioco' && statoAnimale !== 'sobrio'}
								<div class="stato-bubble">
									{statoAnimale === 'brillo' ? '😊' : statoAnimale === 'ubriaco' ? '🥴' : '😵'}
								</div>
							{/if}
							{#if fase === 'svenuto'}
								<div class="stato-bubble">💫</div>
							{/if}
							{#if fase === 'ritirato'}
								<div class="stato-bubble win-bubble">🎉</div>
							{/if}

							<!-- Emoji animale -->
							<span
								class="animal-emoji"
								class:sway-brillo={statoAnimale === 'brillo'}
								class:sway-ubriaco={statoAnimale === 'ubriaco'}
								class:sway-fuori={statoAnimale === 'fuori'}
								class:anim-crash={fase === 'svenuto'}
								class:anim-happy={fase === 'ritirato'}
							>{animale.emoji}</span>
						</div>
						<p class="animale-nome">{animale.nome} · {animale.animale}</p>
					{:else}
						<div class="animal-placeholder">
							<span class="placeholder-q">?</span>
						</div>
						<p class="animale-nome">Chi berrà oggi?</p>
					{/if}
				</div>

				<!-- Moltiplicatore grande -->
				<div
					class="mult-display"
					style="color: {multColore}; --glow: {multColore}"
					class:mult-pulsing={fase === 'gioco'}
					class:mult-crashed={fase === 'svenuto'}
				>
					{fase === 'attesa' ? '1.00x' : moltiplicatore.toFixed(2) + 'x'}
				</div>

				<!-- Info puntata durante il gioco -->
				{#if fase === 'gioco'}
					<div class="puntata-info" style="color: {multColore}">
						Se ti ritiri ora: <strong>€{moltiplicatore.toFixed(2)}</strong>
						<span class="netto">({guadagnoNetto >= 0 ? '+' : ''}€{guadagnoNetto.toFixed(2)} netti)</span>
					</div>
				{/if}

				<!-- Controlli -->
				<div class="controls">
					{#if fase === 'attesa'}
						<button
							class="start-btn"
							class:disabled={saldoInsuff}
							onclick={inizia}
							disabled={saldoInsuff}
						>
							{saldoInsuff ? '💸 Saldo insufficiente' : '🍺 Punta €' + PUNTATA + ' e Inizia!'}
						</button>
					{:else if fase === 'gioco'}
						<button class="ritirati-btn" style="--mc: {multColore}" onclick={ritirati}>
							💰 RITIRATI — €{moltiplicatore.toFixed(2)}
						</button>
					{:else if fase === 'ritirato'}
						<div class="esito-box esito-vinto">
							<div class="esito-icon">✅</div>
							<div class="esito-title">Ritirato a {moltiplicatore.toFixed(2)}x</div>
							<div class="esito-premio">+€{(moltiplicatore - PUNTATA).toFixed(2)} guadagnati!</div>
						</div>
						<button class="play-again-btn" onclick={nuovaPartita}>Gioca ancora →</button>
					{:else if fase === 'svenuto'}
						<div class="esito-box esito-perso">
							<div class="esito-icon">💀</div>
							<div class="esito-title">Svenuto a {crashPoint.toFixed(2)}x</div>
							<div class="esito-premio">-€{PUNTATA.toFixed(2)} persi</div>
						</div>
						<button class="play-again-btn" onclick={nuovaPartita}>Riprova →</button>
					{/if}
				</div>
			</div>

			<!-- Luci in fondo -->
			<div class="machine-lights bottom-lights" aria-hidden="true">
				{#each Array(9) as _, i}
					<div class="light" style="--i:{i}"></div>
				{/each}
			</div>
		</div>

		<!-- ── ACHIEVEMENT PREVIEW ── -->
		<div class="achiev-preview">
			<div class="achiev-header">🏆 Achievement del gioco</div>
			<div class="achiev-list">
				<div class="achiev-item">
					<span>🍺</span>
					<div>
						<span class="achiev-nome">Prima Sbornia</span>
						<span class="achiev-desc">Prima partita</span>
					</div>
					<span class="achiev-reward">+€0.25</span>
				</div>
				<div class="achiev-item">
					<span>🧊</span>
					<div>
						<span class="achiev-nome">Moderato</span>
						<span class="achiev-desc">Ritirati &lt; 2x</span>
					</div>
					<span class="achiev-reward">+€0.50</span>
				</div>
				<div class="achiev-item">
					<span>💪</span>
					<div>
						<span class="achiev-nome">Duro di Costituzione</span>
						<span class="achiev-desc">Raggiunge 5x</span>
					</div>
					<span class="achiev-reward">+€2.00</span>
				</div>
				<div class="achiev-item">
					<span>🔥</span>
					<div>
						<span class="achiev-nome">Bevitore Professionista</span>
						<span class="achiev-desc">Raggiunge 10x</span>
					</div>
					<span class="achiev-reward">+€5.00</span>
				</div>
				<div class="achiev-item">
					<span>👑</span>
					<div>
						<span class="achiev-nome">Campione di Cenzino</span>
						<span class="achiev-desc">Raggiunge 20x</span>
					</div>
					<span class="achiev-reward">+€20.00</span>
				</div>
			</div>
		</div>

		<p class="disclaimer">🐾 Nessun animale è stato realmente ubriacato durante questo gioco</p>
	</div>
</main>

<style>
	/* ── BG BLOBS ── */
	.bg-blobs {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.16;
	}
	.blob-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #f59e0b, transparent);
		top: -130px;
		left: -100px;
		animation: blobDrift1 18s ease-in-out infinite alternate;
	}
	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #92400e, transparent);
		bottom: 0;
		right: -80px;
		animation: blobDrift2 22s ease-in-out infinite alternate;
	}
	.blob-3 {
		width: 350px;
		height: 350px;
		background: radial-gradient(circle, #dc2626, transparent);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: blobDrift3 16s ease-in-out infinite alternate;
	}
	@keyframes blobDrift1 {
		to { transform: translate(60px, 40px); }
	}
	@keyframes blobDrift2 {
		to { transform: translate(-50px, -30px); }
	}
	@keyframes blobDrift3 {
		to { transform: translate(-45%, -55%); }
	}

	/* ── SCREEN FLASH ── */
	.screen-flash {
		position: fixed;
		inset: 0;
		background: rgba(239, 68, 68, 0.45);
		z-index: 9999;
		pointer-events: none;
		animation: flashFade 0.38s ease-out forwards;
	}
	@keyframes flashFade {
		from { opacity: 1; }
		to { opacity: 0; }
	}

	/* ── LAYOUT ── */
	main {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 1.5rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
		color: #f0f0f0;
	}

	/* ── HEADER ── */
	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		text-align: center;
	}
	.back-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #bbb;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s;
		align-self: flex-start;
	}
	.back-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
	}
	.title-icon {
		font-size: 2.5rem;
		animation: beerBounce 1.8s ease-in-out infinite;
	}
	@keyframes beerBounce {
		0%, 100% { transform: scale(1) rotate(-5deg); }
		50% { transform: scale(1.1) rotate(5deg); }
	}
	.title-text {
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.1;
		background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.subtitle {
		color: #999;
		font-size: 0.85rem;
		margin: 0;
	}

	/* ── WALLET BAR ── */
	.wallet-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1.2rem;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.25);
		border-radius: 12px;
		width: 100%;
		max-width: 480px;
	}
	.wallet-icon { font-size: 1.2rem; }
	.wallet-saldo {
		font-size: 1.3rem;
		font-weight: 900;
		color: #f59e0b;
		letter-spacing: 0.02em;
		flex: 1;
	}
	.wallet-costo {
		font-size: 0.75rem;
		color: rgba(245, 158, 11, 0.5);
	}

	/* ── STORIA CRASH ── */
	.storia-wrap {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		max-width: 480px;
		flex-wrap: wrap;
	}
	.storia-label {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.3);
		font-weight: 700;
		white-space: nowrap;
	}
	.storia-bar {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.storia-pill {
		font-size: 0.62rem;
		font-weight: 800;
		padding: 0.18rem 0.45rem;
		border-radius: 999px;
		color: #fff;
		letter-spacing: 0.03em;
	}

	/* ── MACHINE ── */
	.machine-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		max-width: 480px;
	}
	.machine {
		background: linear-gradient(160deg, #1c1007 0%, #1a1a2e 50%, #0f1a10 100%);
		border: 2px solid rgba(245, 158, 11, 0.3);
		border-radius: 24px;
		padding: 1.5rem;
		width: 100%;
		box-shadow:
			0 0 40px rgba(245, 158, 11, 0.12),
			0 0 80px rgba(245, 158, 11, 0.05),
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	/* ── LUCI AMBRA ── */
	.machine-lights {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}
	.light {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #f59e0b;
		box-shadow: 0 0 8px #f59e0b;
		animation: lightBlink 1.2s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.13s);
	}
	@keyframes lightBlink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.15; }
	}
	.bottom-lights .light {
		animation-direction: reverse;
	}

	/* ── INFO PANEL ── */
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.info-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(245, 158, 11, 0.07);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 10px;
		padding: 0.5rem 0.8rem;
		color: rgba(245, 158, 11, 0.75);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		width: 100%;
		text-align: left;
		transition: background 0.2s;
	}
	.info-toggle:hover {
		background: rgba(245, 158, 11, 0.13);
	}
	.info-arrow {
		font-size: 0.7rem;
		opacity: 0.6;
	}
	.info-content {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(245, 158, 11, 0.12);
		border-radius: 10px;
		padding: 1rem;
		animation: fadeIn 0.2s ease;
	}
	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.info-item {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		font-size: 0.73rem;
		color: rgba(255, 255, 255, 0.65);
		line-height: 1.4;
	}
	.info-item > span:first-child {
		font-size: 1.2rem;
		flex-shrink: 0;
		margin-top: 1px;
	}
	.info-prob {
		font-size: 0.66rem;
		color: rgba(255, 255, 255, 0.3);
		text-align: center;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		padding-top: 0.6rem;
		line-height: 1.5;
	}

	/* ── GAME DISPLAY ── */
	.game-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.2rem;
	}

	/* ── ZONA ANIMALE ── */
	.animal-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.animal-wrap {
		position: relative;
		width: 150px;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 50%;
		border: 2px solid rgba(245, 158, 11, 0.18);
		transition: border-color 0.3s;
	}
	.crash-wrap {
		border-color: rgba(239, 68, 68, 0.4);
		background: rgba(239, 68, 68, 0.06);
	}

	/* Birre volanti */
	.beer-fly {
		position: absolute;
		pointer-events: none;
		animation: beerFly 0.95s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		z-index: 5;
	}
	@keyframes beerFly {
		0% {
			transform: scale(1.1) translate(0, 0);
			opacity: 1;
		}
		55% {
			transform: scale(0.75) translate(-12px, 22px);
			opacity: 0.85;
		}
		100% {
			transform: scale(0.1) translate(-18px, 48px);
			opacity: 0;
		}
	}

	/* Bolla stato */
	.stato-bubble {
		position: absolute;
		top: -8px;
		right: 2px;
		font-size: 1.5rem;
		animation: bubbleFloat 1s ease-in-out infinite alternate;
		z-index: 6;
	}
	.win-bubble {
		animation: bubbleFloat 0.5s ease-in-out infinite alternate;
	}
	@keyframes bubbleFloat {
		from { transform: translateY(0) scale(1); }
		to { transform: translateY(-6px) scale(1.12); }
	}

	/* Emoji animale */
	.animal-emoji {
		font-size: 5.5rem;
		line-height: 1;
		display: block;
		position: relative;
		z-index: 3;
		transform-origin: bottom center;
	}
	/* Animazioni bere */
	.sway-brillo {
		animation: swayBrillo 1.3s ease-in-out infinite;
	}
	@keyframes swayBrillo {
		0%, 100% { transform: rotate(-4deg); }
		50% { transform: rotate(4deg); }
	}
	.sway-ubriaco {
		animation: swayUbriaco 0.85s ease-in-out infinite;
	}
	@keyframes swayUbriaco {
		0%, 100% { transform: rotate(-9deg) translateY(3px); }
		50% { transform: rotate(9deg) translateY(-3px); }
	}
	.sway-fuori {
		animation: swayFuori 0.42s ease-in-out infinite;
	}
	@keyframes swayFuori {
		0%, 100% { transform: rotate(-15deg) translateY(5px); }
		50% { transform: rotate(15deg) translateY(-5px); }
	}
	.anim-crash {
		animation: crashAnim 0.55s ease-in forwards;
	}
	@keyframes crashAnim {
		0% { transform: rotate(0deg) scale(1); }
		25% { transform: rotate(-18deg) scale(1.08); }
		55% { transform: rotate(55deg) translateY(18px) scale(0.92); }
		100% { transform: rotate(95deg) translateY(38px) scale(0.72); opacity: 0.55; }
	}
	.anim-happy {
		animation: happyBounce 0.55s ease-in-out infinite alternate;
	}
	@keyframes happyBounce {
		from { transform: scale(1) rotate(-4deg); }
		to { transform: scale(1.1) rotate(4deg); }
	}

	.animal-placeholder {
		width: 150px;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 50%;
		border: 2px dashed rgba(245, 158, 11, 0.2);
		animation: placeholderPulse 2s ease-in-out infinite alternate;
	}
	.placeholder-q {
		font-size: 4.5rem;
		color: rgba(245, 158, 11, 0.28);
		font-weight: 900;
	}
	@keyframes placeholderPulse {
		from { border-color: rgba(245, 158, 11, 0.12); }
		to { border-color: rgba(245, 158, 11, 0.38); }
	}
	.animale-nome {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
		text-align: center;
	}

	/* ── MOLTIPLICATORE ── */
	.mult-display {
		font-size: 4.5rem;
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.03em;
		text-shadow: 0 0 24px var(--glow, rgba(255, 255, 255, 0.2));
		transition:
			color 0.3s,
			text-shadow 0.3s;
		font-variant-numeric: tabular-nums;
	}
	.mult-pulsing {
		animation: multGlow 0.9s ease-in-out infinite alternate;
	}
	@keyframes multGlow {
		from { filter: brightness(1); }
		to { filter: brightness(1.25) drop-shadow(0 0 12px var(--glow)); }
	}
	.mult-crashed {
		animation: crashShake 0.5s ease both;
	}
	@keyframes crashShake {
		0%, 100% { transform: translateX(0); }
		15% { transform: translateX(-8px); }
		30% { transform: translateX(8px); }
		45% { transform: translateX(-5px); }
		65% { transform: translateX(5px); }
		80% { transform: translateX(-3px); }
	}

	/* Info puntata */
	.puntata-info {
		font-size: 0.88rem;
		text-align: center;
		font-weight: 600;
		transition: color 0.3s;
	}
	.netto {
		font-weight: 400;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.35);
		margin-left: 0.3rem;
	}

	/* ── CONTROLLI ── */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.start-btn {
		width: 100%;
		padding: 1.1rem 1.5rem;
		border-radius: 14px;
		border: none;
		font-size: 1.2rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		cursor: pointer;
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: #1a0f00;
		box-shadow:
			0 4px 20px rgba(245, 158, 11, 0.4),
			0 1px 0 rgba(255, 255, 255, 0.25) inset;
		transition: all 0.15s;
	}
	.start-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 28px rgba(245, 158, 11, 0.55);
	}
	.start-btn:active:not(:disabled) {
		transform: translateY(1px);
	}
	.start-btn.disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.ritirati-btn {
		width: 100%;
		padding: 1.2rem 1.5rem;
		border-radius: 16px;
		border: 2px solid var(--mc, #e2e8f0);
		background: color-mix(in srgb, var(--mc, #e2e8f0) 14%, transparent);
		color: var(--mc, #e2e8f0);
		font-size: 1.3rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			background 0.25s,
			border-color 0.25s;
		animation: ritiratiPulse 0.9s ease-in-out infinite;
	}
	.ritirati-btn:hover {
		background: color-mix(in srgb, var(--mc, #e2e8f0) 26%, transparent);
	}
	@keyframes ritiratiPulse {
		0%,
		100% {
			box-shadow: 0 0 14px color-mix(in srgb, var(--mc) 30%, transparent);
		}
		50% {
			box-shadow:
				0 0 32px color-mix(in srgb, var(--mc) 60%, transparent),
				0 0 60px color-mix(in srgb, var(--mc) 22%, transparent);
		}
	}

	/* Esito box */
	.esito-box {
		padding: 1.2rem;
		border-radius: 16px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		animation: fadeIn 0.3s ease;
	}
	.esito-vinto {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}
	.esito-perso {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	.esito-icon { font-size: 2rem; }
	.esito-title {
		font-size: 1rem;
		font-weight: 700;
		color: #f0f0f0;
	}
	.esito-premio {
		font-size: 1.3rem;
		font-weight: 900;
	}
	.esito-vinto .esito-premio { color: #22c55e; }
	.esito-perso .esito-premio { color: #ef4444; }

	.play-again-btn {
		width: 100%;
		padding: 0.85rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: #f0f0f0;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}
	.play-again-btn:hover {
		background: rgba(255, 255, 255, 0.13);
	}

	/* ── ACHIEVEMENT PREVIEW ── */
	.achiev-preview {
		width: 100%;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(245, 158, 11, 0.16);
		border-radius: 18px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.achiev-header {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: rgba(245, 158, 11, 0.7);
		text-transform: uppercase;
	}
	.achiev-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.achiev-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.65rem;
		background: rgba(245, 158, 11, 0.05);
		border: 1px solid rgba(245, 158, 11, 0.12);
		border-radius: 10px;
		font-size: 1.1rem;
	}
	.achiev-item > div {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.achiev-nome {
		font-size: 0.75rem;
		font-weight: 700;
		color: #f0f0f0;
	}
	.achiev-desc {
		font-size: 0.62rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.achiev-reward {
		font-size: 0.72rem;
		font-weight: 800;
		color: #f59e0b;
	}

	.disclaimer {
		color: rgba(255, 255, 255, 0.22);
		font-size: 0.72rem;
		text-align: center;
		line-height: 1.6;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (max-width: 480px) {
		.title-text { font-size: 1.7rem; }
		.animal-emoji { font-size: 4.5rem; }
		.animal-wrap, .animal-placeholder { width: 130px; height: 130px; }
		.mult-display { font-size: 3.8rem; }
		.info-grid { grid-template-columns: 1fr; }
	}
</style>

<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { addSaldo } from '$lib/economia.js';
	import { unlock } from '$lib/achievements.js';
	import { getFingerprint } from '$lib/fingerprint.js';
	import {
		getSessionId,
		getTorneoAttivo,
		creaTorneo,
		getPartite,
		getVoti,
		getVotiMultiple,
		vota,
		haVotato,
		getMembro,
		getStatoPartita,
		getVincitoreCalcolato,
		getPercent,
		formatCountdown,
		formatOra,
		formatData,
		getNomeRound,
		checkEAvanzaRound
	} from '$lib/torneo.js';

	// ── STATE ──────────────────────────────────────────────────────────────
	let torneo = $state(null);
	let partite = $state([]);
	let partitaAttiva = $state(null);
	let votiAttivi = $state([]);
	let mioVoto = $state(null);
	let loading = $state(true);
	let errore = $state(null);

	// Fasi voto: 'vota' → 'conferma' → 'risultati'
	let fase = $state('vota');
	let selezionato = $state(null);
	let nominativo = $state('');
	let votando = $state(false);

	// Dettaglio partita passata
	let dettaglioPartita = $state(null);
	let dettaglioVoti = $state([]);
	let loadingDettaglio = $state(false);

	// Campione finale e cache vincitori per la visualizzazione bracket
	let campione = $state(null);
	let vincitoriCache = $state({});

	// Countdown live
	let countdownStr = $state('');
	let interval = null;

	// ── LOAD ───────────────────────────────────────────────────────────────
	async function carica() {
		loading = true;
		errore = null;
		try {
			let t = await getTorneoAttivo();
			if (!t) t = await creaTorneo();
			torneo = t;

			// Avanza al round successivo se quello corrente è completato
			await checkEAvanzaRound(t.id);

			// Ricarica tutte le partite (include eventuale nuovo round)
			partite = await getPartite(t.id);

			const now = Date.now();
			partitaAttiva =
				partite.find((p) => {
					const i = new Date(p.data_inizio).getTime();
					const f = new Date(p.data_fine).getTime();
					return now >= i && now < f;
				}) || null;

			if (partitaAttiva) {
				votiAttivi = await getVoti(partitaAttiva.id);
				const sid = getSessionId();
				const fp = await getFingerprint();
				mioVoto = await haVotato(partitaAttiva.id, sid, fp);
				fase = mioVoto ? 'risultati' : 'vota';
			}

			// Pre-carica i vincitori di tutte le partite completate (1 sola query)
			campione = null;
			const completate = partite.filter((p) => now >= new Date(p.data_fine).getTime());
			if (completate.length > 0) {
				const tuttiVoti = await getVotiMultiple(completate.map((p) => p.id));
				const cache = {};
				for (const p of completate) {
					const vp = tuttiVoti.filter((v) => v.partita_id === p.id);
					if (vp.length === 0) continue;
					const v1 = vp.filter((v) => v.votato === p.membro1).length;
					const v2 = vp.filter((v) => v.votato === p.membro2).length;
					cache[p.id] = v1 >= v2 ? p.membro1 : p.membro2;
				}
				vincitoriCache = cache;

				// Verifica campione: finale = round massimo con 1 sola partita
				if (partite.length > 0) {
					const roundMax = Math.max(...partite.map((p) => p.round));
					const partiteFinale = partite.filter((p) => p.round === roundMax);
					if (partiteFinale.length === 1) {
						const finale = partiteFinale[0];
						if (now >= new Date(finale.data_fine).getTime()) {
							campione = cache[finale.id] || finale.membro1;
						}
					}
				}
			}
		} catch (e) {
			errore = e.message;
		} finally {
			loading = false;
		}
	}

	// ── VOTO ───────────────────────────────────────────────────────────────
	function scegli(nome) {
		selezionato = nome;
		fase = 'conferma';
	}

	function annullaScelta() {
		selezionato = null;
		nominativo = '';
		fase = 'vota';
	}

	async function conferma() {
		if (!selezionato || !partitaAttiva || votando) return;
		votando = true;
		try {
			const sid = getSessionId();
			const fp = await getFingerprint();

			// Ottieni l'IP reale dal server (Layer 2)
			let ip = null;
			try {
				const res = await fetch('/api/identify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fingerprint: fp })
				});
				const d = await res.json();
				ip = d.ip;
			} catch {}

			await vota(partitaAttiva.id, selezionato, sid, nominativo.trim() || null, fp, ip);
			mioVoto = { votato: selezionato, nominativo: nominativo.trim() || null };
			votiAttivi = await getVoti(partitaAttiva.id);
			fase = 'risultati';
			addSaldo(5, 'voto_torneo');
			// Salva voto per check predizione futura
			try {
				const storico = JSON.parse(localStorage.getItem('zoo_torneo_storico') ?? '{}');
				storico[String(partitaAttiva.id)] = selezionato;
				localStorage.setItem('zoo_torneo_storico', JSON.stringify(storico));
			} catch {}
			// Achievement voto
			const nVoti = parseInt(localStorage.getItem('zoo_torneo_voti') ?? '0', 10) + 1;
			localStorage.setItem('zoo_torneo_voti', String(nVoti));
			unlock('votante');
			if (nVoti >= 5) unlock('tifoso');
		} catch (e) {
			if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
				const sid = getSessionId();
				const fp = await getFingerprint();
				mioVoto = await haVotato(partitaAttiva.id, sid, fp);
				votiAttivi = await getVoti(partitaAttiva.id);
				fase = 'risultati';
			} else {
				errore = e.message;
			}
		} finally {
			votando = false;
		}
	}

	// ── PREDIZIONE VINCITORE ───────────────────────────────────────────────
	function checkPredizione(partita, voti) {
		if (!browser) return;
		try {
			const storico = JSON.parse(localStorage.getItem('zoo_torneo_storico') ?? '{}');
			const rewarded = new Set(JSON.parse(localStorage.getItem('zoo_torneo_rewarded') ?? '[]'));
			const mioVotoPred = storico[String(partita.id)];
			if (!mioVotoPred || rewarded.has(String(partita.id))) return;
			const vincitore = getVincitoreCalcolato(partita, voti);
			if (vincitore === mioVotoPred) {
				rewarded.add(String(partita.id));
				localStorage.setItem('zoo_torneo_rewarded', JSON.stringify([...rewarded]));
				addSaldo(1, 'predizione_corretta');
				unlock('indovino');
				if (rewarded.size >= 10) unlock('oracolo');
			}
		} catch {}
	}

	// ── DETTAGLIO PASSATE ──────────────────────────────────────────────────
	async function apriDettaglio(partita) {
		if (dettaglioPartita?.id === partita.id) {
			dettaglioPartita = null;
			return;
		}
		loadingDettaglio = true;
		dettaglioPartita = partita;
		dettaglioVoti = await getVoti(partita.id);
		loadingDettaglio = false;
		checkPredizione(partita, dettaglioVoti);
	}

	// ── COUNTDOWN ─────────────────────────────────────────────────────────
	function tick() {
		if (!partitaAttiva) { countdownStr = ''; return; }
		const ms = new Date(partitaAttiva.data_fine).getTime() - Date.now();
		countdownStr = formatCountdown(ms);
		if (ms <= 0) carica();
	}

	onMount(() => {
		carica();
		interval = setInterval(tick, 1000);
	});
	onDestroy(() => clearInterval(interval));

	// ── DERIVED ────────────────────────────────────────────────────────────
	const passate = $derived(
		partite
			.filter((p) => Date.now() >= new Date(p.data_fine).getTime())
			.sort((a, b) => b.posizione - a.posizione)
	);

	const inAttesa = $derived(
		partite.filter((p) => Date.now() < new Date(p.data_inizio).getTime())
	);

	const prossima = $derived(inAttesa[0] || null);

	const mem1 = $derived(partitaAttiva ? getMembro(partitaAttiva.membro1) : null);
	const mem2 = $derived(partitaAttiva ? getMembro(partitaAttiva.membro2) : null);
	const p1 = $derived(getPercent(partitaAttiva?.membro1 ?? '', votiAttivi));
	const p2 = $derived(getPercent(partitaAttiva?.membro2 ?? '', votiAttivi));
	const selMembro = $derived(selezionato ? getMembro(selezionato) : null);

	// Raggruppamento per round
	const partitePerRound = $derived(
		partite.reduce((acc, p) => {
			if (!acc[p.round]) acc[p.round] = [];
			acc[p.round].push(p);
			return acc;
		}, {})
	);
	const rounds = $derived(Object.keys(partitePerRound).map(Number).sort((a, b) => a - b));
	const roundAttuale = $derived(rounds.length > 0 ? Math.max(...rounds) : 1);
</script>

<!-- ── BG BLOBS ── -->
<div class="bg" aria-hidden="true">
	<div class="blob b1"></div>
	<div class="blob b2"></div>
	<div class="blob b3"></div>
</div>

<div class="page">
	<!-- ── NAV ── -->
	<nav>
		<button class="back-btn" onclick={() => goto('/')}>
			<span>←</span> Classifica
		</button>
		<span class="nav-badge">🏆 CHAMPIONSHIP</span>
	</nav>

	<!-- ── HERO ── -->
	<header class="hero">
		<p class="hero-pre">Zoo Amici · Stagione 2025</p>
		<h1 class="hero-title">
			<span class="hero-emoji">🏟️</span>
			CHAMPIONSHIP
		</h1>
		<p class="hero-sub">{getNomeRound(roundAttuale)} · 32 bestie, 1 solo vincitore</p>
		<div class="hero-trofei" aria-hidden="true">
			<span>🥇</span><span>🥈</span><span>🥉</span>
		</div>
	</header>

	{#if loading}
		<!-- ── LOADING ── -->
		<div class="loading-wrap">
			<div class="spinner"></div>
			<p>Caricamento arena...</p>
		</div>

	{:else if errore}
		<!-- ── ERRORE ── -->
		<div class="errore-wrap">
			<span class="errore-icon">⚠️</span>
			<p>{errore}</p>
			<button class="btn-retry" onclick={carica}>Riprova</button>
		</div>

	{:else if partitaAttiva}
		<!-- ══════════════════════════════════════════════════════════════
		     SFIDA ATTIVA
		══════════════════════════════════════════════════════════════ -->
		<section class="arena">
			<div class="arena-meta">
				<span class="arena-tag">⚔️ Sfida #{partitaAttiva.posizione} · In corso ora</span>
				<span class="arena-countdown">{countdownStr}</span>
			</div>
			<p class="arena-label">Partita {partitaAttiva.posizione} di {partitePerRound[partitaAttiva.round]?.length ?? '?'} · {getNomeRound(partitaAttiva.round)}</p>

			{#if fase === 'vota'}
				<!-- PRE-VOTO: scegli il tuo campione -->
				<p class="vota-prompt">Chi vince questa sfida? Vota per scoprire i dettagli!</p>
				<div class="vs-wrap">
					<!-- Card 1 -->
					<button
						class="fighter-card"
						style="--accent: {mem1?.colore || '#888'}"
						onclick={() => scegli(partitaAttiva.membro1)}
					>
						<span class="fighter-emoji">{mem1?.emoji}</span>
						<span class="fighter-nome">{partitaAttiva.membro1}</span>
						<span class="fighter-animale">{mem1?.animale}</span>
						<span class="fighter-tagline blurred">???</span>
						<span class="fighter-cta">VOTA →</span>
					</button>

					<!-- VS -->
					<div class="vs-divider">
						<span class="vs-text">VS</span>
						<div class="vs-line"></div>
					</div>

					<!-- Card 2 -->
					<button
						class="fighter-card"
						style="--accent: {mem2?.colore || '#888'}"
						onclick={() => scegli(partitaAttiva.membro2)}
					>
						<span class="fighter-emoji">{mem2?.emoji}</span>
						<span class="fighter-nome">{partitaAttiva.membro2}</span>
						<span class="fighter-animale">{mem2?.animale}</span>
						<span class="fighter-tagline blurred">???</span>
						<span class="fighter-cta">VOTA →</span>
					</button>
				</div>
				<p class="vota-footer">
					🔒 I dettagli si sbloccano solo dopo aver votato
				</p>

			{:else if fase === 'conferma'}
				<!-- CONFERMA VOTO -->
				<div class="conferma-wrap">
					<div class="conferma-card" style="--accent: {selMembro?.colore || '#888'}">
						<span class="conferma-emoji">{selMembro?.emoji}</span>
						<p class="conferma-nome">{selezionato}</p>
						<p class="conferma-animale">{selMembro?.animale}</p>
					</div>
					<p class="conferma-testo">Hai scelto il tuo campione!</p>
					<div class="nominativo-wrap">
						<label for="nominativo">Il tuo nome (facoltativo)</label>
						<input
							id="nominativo"
							type="text"
							placeholder="Es. Luca, La Tigre, Anonimo..."
							bind:value={nominativo}
							maxlength="30"
						/>
					</div>
					<div class="conferma-btns">
						<button class="btn-back" onclick={annullaScelta}>← Cambia</button>
						<button class="btn-vota" onclick={conferma} disabled={votando}>
							{votando ? '⏳ Votando...' : '✓ Conferma voto'}
						</button>
					</div>
				</div>

			{:else if fase === 'risultati'}
				<!-- RISULTATI LIVE -->
				<div class="risultati-wrap">
					<p class="risultati-tag">
						{#if mioVoto}
							✅ Hai votato per <strong>{mioVoto.votato}</strong>
							{#if mioVoto.nominativo} · come <em>{mioVoto.nominativo}</em>{/if}
						{/if}
					</p>
					<p class="risultati-bonus">+€5.00 guadagnati per il voto 💰</p>

					<!-- Barre percentuali -->
					<div class="barre-wrap">
						<div class="barra-lato left">
							<div class="barra-info">
								<span class="barra-emoji">{mem1?.emoji}</span>
								<span class="barra-nome">{partitaAttiva.membro1}</span>
								<span class="barra-pct">{p1}%</span>
							</div>
							<div class="barra-track">
								<div
									class="barra-fill"
									class:leading={p1 > p2}
									style="width: {p1}%; --accent: {mem1?.colore || '#888'}"
								></div>
							</div>
							<p class="barra-tagline">{mem1?.tagline}</p>
						</div>

						<div class="barre-center">
							<span class="barre-vs">VS</span>
							<span class="barre-tot">{votiAttivi.length} {votiAttivi.length === 1 ? 'voto' : 'voti'}</span>
						</div>

						<div class="barra-lato right">
							<div class="barra-info reverse">
								<span class="barra-pct">{p2}%</span>
								<span class="barra-nome">{partitaAttiva.membro2}</span>
								<span class="barra-emoji">{mem2?.emoji}</span>
							</div>
							<div class="barra-track">
								<div
									class="barra-fill right-fill"
									class:leading={p2 > p1}
									style="width: {p2}%; --accent: {mem2?.colore || '#888'}"
								></div>
							</div>
							<p class="barra-tagline right-tagline">{mem2?.tagline}</p>
						</div>
					</div>

					<!-- Chi ha votato -->
					{#if votiAttivi.length > 0}
						<div class="votanti-wrap">
							<p class="votanti-title">📋 Chi ha votato</p>
							<div class="votanti-list">
								{#each votiAttivi as v}
									{@const vm = getMembro(v.votato)}
									<div class="votante-row" style="--accent: {vm?.colore || '#888'}">
										<span class="votante-emoji">{vm?.emoji}</span>
										<div class="votante-info">
											<span class="votante-nome">{v.nominativo || 'Anonimo'}</span>
											<span class="votante-scelta">{vm?.emoji} {v.votato}</span>
										</div>
										<span class="votante-ora">{formatOra(v.created_at)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</section>

	{:else if prossima}
		<!-- ══════════════════════════════════════════════════════════════
		     PROSSIMA SFIDA
		══════════════════════════════════════════════════════════════ -->
		{@const pm1 = getMembro(prossima.membro1)}
		{@const pm2 = getMembro(prossima.membro2)}
		<section class="prossima-wrap">
			<span class="prossima-tag">⏳ {getNomeRound(prossima.round)} · Sfida #{prossima.posizione}</span>
			<p class="prossima-data">
				{formatData(prossima.data_inizio)} · {new Date(prossima.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
			</p>
			<div class="prossima-vs">
				<span>{pm1?.emoji} {prossima.membro1}</span>
				<span class="prossima-vs-text">VS</span>
				<span>{pm2?.emoji} {prossima.membro2}</span>
			</div>
			<p class="prossima-hint">Torna domani per votare!</p>
		</section>

	{:else if campione}
		<!-- ══════════════════════════════════════════════════════════════
		     CAMPIONE
		══════════════════════════════════════════════════════════════ -->
		{@const campMembro = getMembro(campione)}
		<section class="campione-wrap">
			<div class="campione-rays" aria-hidden="true"></div>
			<span class="campione-trofeo">🏆</span>
			<p class="campione-label">CAMPIONE ZOO AMICI 2025</p>
			<div class="campione-card" style="--accent: {campMembro?.colore || '#e8b84b'}">
				<span class="campione-emoji">{campMembro?.emoji}</span>
				<h2 class="campione-nome">{campione}</h2>
				<p class="campione-animale">{campMembro?.animale}</p>
				<p class="campione-tagline">"{campMembro?.tagline}"</p>
			</div>
		</section>

	{:else if passate.length === partite.length && partite.length > 0}
		<!-- Round completato, prossima fase in arrivo -->
		<section class="completo-wrap">
			<span class="completo-emoji">⚔️</span>
			<h2>{getNomeRound(roundAttuale)} Completato!</h2>
			<p>Il prossimo round verrà generato automaticamente al prossimo aggiornamento.</p>
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════════
	     TABELLONE MULTI-ROUND
	══════════════════════════════════════════════════════════════ -->
	{#if partite.length > 0}
		<section class="tabellone">
			{#each rounds.slice().reverse() as round}
				{@const pr = partitePerRound[round]}
				{@const nComplete = pr.filter((p) => Date.now() >= new Date(p.data_fine).getTime()).length}
				{@const isRoundAttuale = round === roundAttuale}

				<div class="round-section" class:round-corrente={isRoundAttuale}>
					<!-- Round header -->
					<div class="round-hdr">
						<div class="round-hdr-left">
							<span class="round-badge" class:round-badge-gold={isRoundAttuale}>R{round}</span>
							<div>
								<span class="round-nome">{getNomeRound(round)}</span>
								<span class="round-count">{nComplete}/{pr.length} disputate</span>
							</div>
						</div>
						<span
							class="round-stato"
							class:round-stato-ok={nComplete === pr.length}
							class:round-stato-live={nComplete < pr.length && nComplete > 0}
							class:round-stato-wait={nComplete === 0}
						>
							{nComplete === pr.length ? '✓ Completo' : nComplete > 0 ? '⚔️ In corso' : '⏳ In attesa'}
						</span>
					</div>

					<!-- Match cards -->
					<div class="bk-grid" class:bk-grid-wide={pr.length <= 2}>
						{#each pr as p}
							{@const pm1 = getMembro(p.membro1)}
							{@const pm2 = getMembro(p.membro2)}
							{@const isPassata = Date.now() >= new Date(p.data_fine).getTime()}
							{@const isAttiva = partitaAttiva?.id === p.id}
							{@const vincitore = vincitoriCache[p.id] ?? null}

							<div class="bk-wrap">
								<!-- Card principale -->
								{#if isPassata}
									<button class="bk-card bk-done" onclick={() => apriDettaglio(p)}>
										<div class="bk-side" class:bk-winner={vincitore === p.membro1} class:bk-loser={vincitore !== null && vincitore !== p.membro1}>
											<span class="bk-emoji">{pm1?.emoji}</span>
											<span class="bk-nome">{p.membro1}</span>
											{#if vincitore === p.membro1}<span class="bk-crown">👑</span>{/if}
										</div>
										<div class="bk-center">
											<span class="bk-vs">VS</span>
											<span class="bk-data">{formatData(p.data_inizio)}</span>
										</div>
										<div class="bk-side bk-right" class:bk-winner={vincitore === p.membro2} class:bk-loser={vincitore !== null && vincitore !== p.membro2}>
											{#if vincitore === p.membro2}<span class="bk-crown">👑</span>{/if}
											<span class="bk-nome">{p.membro2}</span>
											<span class="bk-emoji">{pm2?.emoji}</span>
										</div>
										<span class="bk-stato bk-done-badge">
											{vincitore ? '👑' : '✓'}
										</span>
										<span class="bk-chevron" class:open={dettaglioPartita?.id === p.id}>›</span>
									</button>
								{:else if isAttiva}
									<div class="bk-card bk-live">
										<div class="bk-side">
											<span class="bk-emoji">{pm1?.emoji}</span>
											<span class="bk-nome">{p.membro1}</span>
										</div>
										<div class="bk-center">
											<span class="bk-vs bk-vs-live">VS</span>
											<span class="bk-data">Oggi</span>
										</div>
										<div class="bk-side bk-right">
											<span class="bk-nome">{p.membro2}</span>
											<span class="bk-emoji">{pm2?.emoji}</span>
										</div>
										<span class="bk-stato bk-live-badge">⚡ Live</span>
									</div>
								{:else}
									<div class="bk-card bk-future">
										<div class="bk-side bk-muted">
											<span class="bk-emoji">{pm1?.emoji}</span>
											<span class="bk-nome">{p.membro1}</span>
										</div>
										<div class="bk-center">
											<span class="bk-vs">VS</span>
											<span class="bk-data">{formatData(p.data_inizio)}</span>
										</div>
										<div class="bk-side bk-right bk-muted">
											<span class="bk-nome">{p.membro2}</span>
											<span class="bk-emoji">{pm2?.emoji}</span>
										</div>
										<span class="bk-stato bk-future-badge">⏳</span>
									</div>
								{/if}

								<!-- Dettaglio espandibile -->
								{#if dettaglioPartita?.id === p.id}
									<div class="cal-dettaglio">
										{#if loadingDettaglio}
											<p class="det-loading">Caricamento...</p>
										{:else}
											{@const dp1 = getPercent(p.membro1, dettaglioVoti)}
											{@const dp2 = getPercent(p.membro2, dettaglioVoti)}
											{@const vinc = getVincitoreCalcolato(p, dettaglioVoti)}
											<div class="det-risultato">
												<div class="det-lato" class:vincitore={vinc === p.membro1}>
													<span class="det-emoji">{pm1?.emoji}</span>
													<span class="det-nome">{p.membro1}</span>
													{#if vinc === p.membro1}<span class="det-crown">👑</span>{/if}
													<span class="det-pct">{dp1}%</span>
												</div>
												<div class="det-center">
													<span class="det-vs">VS</span>
													<span class="det-tot">{dettaglioVoti.length} voti</span>
												</div>
												<div class="det-lato" class:vincitore={vinc === p.membro2}>
													<span class="det-emoji">{pm2?.emoji}</span>
													<span class="det-nome">{p.membro2}</span>
													{#if vinc === p.membro2}<span class="det-crown">👑</span>{/if}
													<span class="det-pct">{dp2}%</span>
												</div>
											</div>
											{#if dettaglioVoti.length > 0}
												<div class="det-votanti">
													{#each dettaglioVoti as v}
														{@const vm = getMembro(v.votato)}
														<span class="det-votante" style="--accent: {vm?.colore || '#888'}">
															{v.nominativo || 'Anonimo'} → {vm?.emoji} {v.votato}
														</span>
													{/each}
												</div>
											{:else}
												<p class="det-nessuno">Nessun voto registrato per questa sfida.</p>
											{/if}
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	/* ── BG ── */
	.bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
	}
	.b1 {
		width: 600px; height: 600px;
		background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
		top: -200px; left: -150px;
		opacity: 0.12;
		animation: drift 22s ease-in-out infinite;
	}
	.b2 {
		width: 500px; height: 500px;
		background: radial-gradient(circle, #e8b84b 0%, transparent 70%);
		bottom: -100px; right: -120px;
		opacity: 0.1;
		animation: drift 26s ease-in-out infinite reverse;
	}
	.b3 {
		width: 350px; height: 350px;
		background: radial-gradient(circle, #e84b4b 0%, transparent 70%);
		top: 45%; left: 50%;
		opacity: 0.08;
		animation: drift 30s ease-in-out infinite 8s;
	}
	@keyframes drift {
		0%,100% { transform: translate(0,0) scale(1); }
		33%      { transform: translate(60px,-50px) scale(1.08); }
		66%      { transform: translate(-40px,60px) scale(0.93); }
	}

	/* ── LAYOUT ── */
	.page {
		position: relative;
		z-index: 1;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 1.5rem 6rem;
	}

	/* ── NAV ── */
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 0 0;
	}
	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 999px;
		color: rgba(240,240,250,0.6);
		font-family: 'Outfit', sans-serif;
		font-size: 0.8rem;
		padding: 0.45rem 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.back-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0fa; }
	.nav-badge {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1rem;
		letter-spacing: 0.12em;
		color: #e8b84b;
		opacity: 0.7;
	}

	/* ── HERO ── */
	.hero {
		text-align: center;
		padding: 3rem 1rem 2.5rem;
		animation: fade-up 0.6s ease both;
	}
	.hero-pre {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: rgba(240,240,250,0.3);
		margin-bottom: 0.8rem;
	}
	.hero-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(3.5rem, 10vw, 7rem);
		letter-spacing: 0.06em;
		color: #fff;
		text-shadow:
			0 0 80px rgba(232,184,75,0.35),
			0 0 160px rgba(232,184,75,0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		line-height: 0.95;
	}
	.hero-emoji {
		font-size: clamp(2.5rem, 6vw, 5rem);
		animation: rock 3s ease-in-out infinite;
		display: inline-block;
	}
	@keyframes rock {
		0%,100% { transform: rotate(-6deg) scale(1); }
		50%      { transform: rotate(6deg) scale(1.08); }
	}
	.hero-sub {
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(240,240,250,0.38);
	}
	.hero-trofei {
		display: flex;
		justify-content: center;
		gap: 0.6rem;
		margin-top: 1.2rem;
		font-size: 1.4rem;
		opacity: 0.5;
	}

	/* ── LOADING / ERRORE ── */
	.loading-wrap, .errore-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 0;
		color: rgba(240,240,250,0.4);
		font-size: 0.9rem;
	}
	.spinner {
		width: 36px; height: 36px;
		border: 3px solid rgba(255,255,255,0.1);
		border-top-color: #e8b84b;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.errore-icon { font-size: 2rem; }
	.btn-retry {
		padding: 0.5rem 1.5rem;
		background: rgba(232,184,75,0.15);
		border: 1px solid rgba(232,184,75,0.35);
		border-radius: 999px;
		color: #e8b84b;
		font-family: 'Outfit', sans-serif;
		cursor: pointer;
	}

	/* ── ARENA ── */
	.arena {
		margin-bottom: 3rem;
		animation: fade-up 0.5s ease 0.1s both;
	}
	.arena-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}
	.arena-tag {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-weight: 700;
		color: #e84b4b;
		animation: pulse-text 2s ease-in-out infinite;
	}
	@keyframes pulse-text {
		0%,100% { opacity: 1; }
		50%      { opacity: 0.55; }
	}
	.arena-countdown {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem;
		letter-spacing: 0.08em;
		color: rgba(240,240,250,0.55);
	}
	.arena-label {
		font-size: 0.68rem;
		color: rgba(240,240,250,0.25);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		margin-bottom: 1.5rem;
	}

	/* ── VS CARDS (pre-voto) ── */
	.vota-prompt {
		text-align: center;
		font-size: 0.9rem;
		color: rgba(240,240,250,0.45);
		margin-bottom: 1.5rem;
	}
	.vs-wrap {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
	}
	.fighter-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem 1.2rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 24px;
		cursor: pointer;
		transition: all 0.22s ease;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		text-align: center;
		position: relative;
		overflow: hidden;
	}
	.fighter-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 70%);
		opacity: 0;
		transition: opacity 0.3s;
		pointer-events: none;
	}
	.fighter-card:hover {
		border-color: var(--accent);
		transform: translateY(-6px) scale(1.02);
		box-shadow: 0 16px 48px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.fighter-card:hover::before { opacity: 1; }
	.fighter-emoji {
		font-size: 3.5rem;
		display: block;
		filter: drop-shadow(0 4px 16px color-mix(in srgb, var(--accent) 50%, transparent));
		transition: transform 0.2s;
	}
	.fighter-card:hover .fighter-emoji { transform: scale(1.15); }
	.fighter-nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem;
		letter-spacing: 0.06em;
		color: #fff;
	}
	.fighter-animale {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: rgba(240,240,250,0.35);
	}
	.fighter-tagline {
		font-size: 0.75rem;
		color: rgba(240,240,250,0.45);
		font-style: italic;
		line-height: 1.4;
	}
	.fighter-tagline.blurred {
		filter: blur(5px);
		user-select: none;
		color: rgba(240,240,250,0.25);
		letter-spacing: 0.3em;
		font-size: 1.2rem;
	}
	.fighter-cta {
		margin-top: 0.5rem;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		color: var(--accent);
		text-transform: uppercase;
		opacity: 0;
		transition: opacity 0.2s;
	}
	.fighter-card:hover .fighter-cta { opacity: 1; }

	/* ── VS DIVIDER ── */
	.vs-divider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.vs-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2.5rem;
		letter-spacing: 0.1em;
		color: #e84b4b;
		text-shadow: 0 0 30px rgba(232,75,75,0.6);
		animation: vs-pulse 1.5s ease-in-out infinite;
	}
	@keyframes vs-pulse {
		0%,100% { transform: scale(1); text-shadow: 0 0 30px rgba(232,75,75,0.6); }
		50%      { transform: scale(1.08); text-shadow: 0 0 50px rgba(232,75,75,0.9); }
	}
	.vs-line {
		width: 2px;
		height: 40px;
		background: linear-gradient(to bottom, rgba(232,75,75,0.5), transparent);
	}

	.vota-footer {
		text-align: center;
		margin-top: 1.2rem;
		font-size: 0.72rem;
		color: rgba(240,240,250,0.25);
	}

	/* ── CONFERMA ── */
	.conferma-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.2rem;
		padding: 2rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 24px;
		animation: fade-up 0.3s ease both;
	}
	.conferma-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 1.5rem 2.5rem;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 2px solid var(--accent);
		border-radius: 20px;
	}
	.conferma-emoji { font-size: 3rem; }
	.conferma-nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2rem;
		letter-spacing: 0.06em;
		color: #fff;
	}
	.conferma-animale {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(240,240,250,0.4);
	}
	.conferma-testo {
		font-size: 1rem;
		color: rgba(240,240,250,0.6);
		font-style: italic;
	}
	.nominativo-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 100%;
		max-width: 320px;
	}
	.nominativo-wrap label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(240,240,250,0.35);
	}
	.nominativo-wrap input {
		width: 100%;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 12px;
		padding: 0.65rem 1rem;
		color: #f0f0fa;
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.2s;
		text-align: center;
	}
	.nominativo-wrap input::placeholder { color: rgba(240,240,250,0.2); }
	.nominativo-wrap input:focus { border-color: rgba(232,184,75,0.5); }
	.conferma-btns {
		display: flex;
		gap: 0.75rem;
	}
	.btn-back {
		padding: 0.65rem 1.4rem;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 12px;
		color: rgba(240,240,250,0.5);
		font-family: 'Outfit', sans-serif;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-back:hover { background: rgba(255,255,255,0.1); color: #f0f0fa; }
	.btn-vota {
		padding: 0.65rem 2rem;
		background: linear-gradient(135deg, #e8b84b, #e87a1a);
		border: none;
		border-radius: 12px;
		color: #000;
		font-family: 'Outfit', sans-serif;
		font-size: 0.9rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
		letter-spacing: 0.04em;
	}
	.btn-vota:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,184,75,0.4); }
	.btn-vota:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── RISULTATI ── */
	.risultati-wrap {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		animation: fade-up 0.4s ease both;
	}
	.risultati-tag {
		text-align: center;
		font-size: 0.85rem;
		color: rgba(240,240,250,0.55);
		padding: 0.6rem 1.2rem;
		background: rgba(255,255,255,0.04);
		border-radius: 999px;
		align-self: center;
	}
	.risultati-tag strong { color: #e8b84b; }
	.risultati-tag em { color: rgba(240,240,250,0.7); }
	.risultati-bonus {
		text-align: center;
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffd700;
		align-self: center;
	}

	.barre-wrap {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		padding: 1.5rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 24px;
	}
	.barra-lato {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.barra-lato.right { align-items: flex-end; text-align: right; }
	.barra-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.barra-info.reverse { flex-direction: row-reverse; }
	.barra-emoji { font-size: 1.8rem; }
	.barra-nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		letter-spacing: 0.06em;
		color: #fff;
	}
	.barra-pct {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem;
		letter-spacing: 0.04em;
		color: #e8b84b;
	}
	.barra-track {
		height: 8px;
		background: rgba(255,255,255,0.08);
		border-radius: 999px;
		overflow: hidden;
	}
	.barra-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
		opacity: 0.7;
	}
	.barra-fill.leading { opacity: 1; }
	.right-fill { margin-left: auto; }
	.barra-tagline {
		font-size: 0.72rem;
		font-style: italic;
		color: rgba(240,240,250,0.35);
		line-height: 1.4;
	}
	.right-tagline { text-align: right; }
	.barre-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.barre-vs {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.5rem;
		color: rgba(240,240,250,0.25);
	}
	.barre-tot {
		font-size: 0.68rem;
		color: rgba(240,240,250,0.3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		white-space: nowrap;
	}

	/* Votanti */
	.votanti-wrap {
		background: rgba(255,255,255,0.025);
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 20px;
		padding: 1.2rem 1.4rem;
	}
	.votanti-title {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: rgba(240,240,250,0.3);
		margin-bottom: 0.9rem;
		font-weight: 700;
	}
	.votanti-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.votante-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.7rem;
		padding: 0.55rem 0.9rem;
		background: rgba(255,255,255,0.03);
		border-radius: 10px;
		border-left: 3px solid var(--accent);
	}
	.votante-emoji { font-size: 1.4rem; flex-shrink: 0; }
	.votante-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.votante-nome { color: #f0f0fa; font-weight: 600; font-size: 0.82rem; }
	.votante-scelta { color: var(--accent); font-size: 0.72rem; font-weight: 600; }
	.votante-ora {
		color: rgba(240,240,250,0.25);
		font-size: 0.7rem;
		white-space: nowrap;
	}

	/* ── PROSSIMA ── */
	.prossima-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		padding: 3rem 2rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 24px;
		text-align: center;
		margin-bottom: 3rem;
	}
	.prossima-tag {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(232,184,75,0.6);
		font-weight: 700;
	}
	.prossima-data {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.4rem;
		letter-spacing: 0.08em;
		color: rgba(240,240,250,0.5);
	}
	.prossima-vs {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: #f0f0fa;
	}
	.prossima-vs-text {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.6rem;
		color: #e84b4b;
	}
	.prossima-hint {
		font-size: 0.8rem;
		color: rgba(240,240,250,0.28);
		font-style: italic;
	}

	/* ── COMPLETATO ── */
	.completo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 2rem;
		text-align: center;
		margin-bottom: 3rem;
	}
	.completo-emoji { font-size: 4rem; }
	.completo-wrap h2 {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2.5rem;
		letter-spacing: 0.06em;
	}

	/* ── CALENDARIO ── */
	.calendario {
		margin-top: 1rem;
	}
	.cal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid rgba(255,255,255,0.07);
	}
	.cal-title {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-weight: 700;
		color: rgba(240,240,250,0.35);
	}
	.cal-sub {
		font-size: 0.7rem;
		color: rgba(240,240,250,0.22);
	}

	.cal-partita { margin-bottom: 0.4rem; }
	.cal-row {
		display: grid;
		grid-template-columns: 28px 70px 1fr auto auto;
		align-items: center;
		gap: 0.8rem;
		padding: 0.75rem 1rem;
		border-radius: 14px;
		width: 100%;
		text-align: left;
		font-family: 'Outfit', sans-serif;
		cursor: pointer;
		transition: background 0.2s;
	}
	.cal-partita.completata .cal-row {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
	}
	.cal-partita.completata .cal-row:hover { background: rgba(255,255,255,0.06); }
	.cal-row.no-btn { cursor: default; }
	.cal-partita.attiva-cal .cal-row {
		background: rgba(232,75,75,0.07);
		border: 1px solid rgba(232,75,75,0.2);
	}
	.cal-partita.futura .cal-row {
		background: rgba(255,255,255,0.015);
		border: 1px solid rgba(255,255,255,0.04);
	}
	.cal-pos {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.9rem;
		color: rgba(240,240,250,0.25);
		letter-spacing: 0.06em;
	}
	.cal-data-small {
		font-size: 0.7rem;
		color: rgba(240,240,250,0.28);
		white-space: nowrap;
	}
	.cal-matchup {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		color: rgba(240,240,250,0.7);
		min-width: 0;
	}
	.cal-vs {
		font-size: 0.68rem;
		color: rgba(240,240,250,0.3);
		font-weight: 700;
		flex-shrink: 0;
	}
	.cal-lato { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.cal-lato.muted { color: rgba(240,240,250,0.3); }
	.cal-stato {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.completata-badge {
		background: rgba(74,222,128,0.12);
		color: #4ade80;
	}
	.attiva-badge {
		background: rgba(232,75,75,0.15);
		color: #e84b4b;
		animation: pulse-text 1.5s ease-in-out infinite;
	}
	.futura-badge {
		background: rgba(232,184,75,0.1);
		color: rgba(232,184,75,0.5);
	}
	.cal-chevron {
		font-size: 1.2rem;
		color: rgba(240,240,250,0.3);
		transition: transform 0.25s;
		flex-shrink: 0;
	}
	.cal-chevron.open { transform: rotate(90deg); color: #e8b84b; }

	/* Dettaglio espandibile */
	.cal-dettaglio {
		padding: 1rem 1rem 1.2rem;
		background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.06);
		border-top: none;
		border-radius: 0 0 14px 14px;
		animation: fade-up 0.25s ease both;
	}
	.det-loading { font-size: 0.8rem; color: rgba(240,240,250,0.3); text-align: center; }
	.det-risultato {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 1rem;
	}
	.det-lato {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.75rem;
		border-radius: 12px;
		transition: background 0.2s;
	}
	.det-lato.vincitore {
		background: rgba(232,184,75,0.08);
		border: 1px solid rgba(232,184,75,0.2);
	}
	.det-emoji { font-size: 1.8rem; }
	.det-nome {
		font-size: 0.82rem;
		font-weight: 700;
		color: rgba(240,240,250,0.7);
		text-align: center;
	}
	.det-crown { font-size: 1rem; }
	.det-pct {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.4rem;
		color: #e8b84b;
		letter-spacing: 0.04em;
	}
	.det-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}
	.det-vs {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.2rem;
		color: rgba(240,240,250,0.25);
	}
	.det-tot {
		font-size: 0.65rem;
		color: rgba(240,240,250,0.22);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		white-space: nowrap;
	}
	.det-votanti {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.det-votante {
		font-size: 0.72rem;
		color: rgba(240,240,250,0.45);
		padding: 0.25rem 0.7rem;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		border-radius: 999px;
	}
	.det-nessuno {
		font-size: 0.78rem;
		color: rgba(240,240,250,0.25);
		text-align: center;
		font-style: italic;
	}

	/* ── CAMPIONE ── */
	.campione-wrap {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3.5rem 2rem;
		text-align: center;
		margin-bottom: 3rem;
		overflow: hidden;
		border-radius: 28px;
		background: rgba(232,184,75,0.05);
		border: 1px solid rgba(232,184,75,0.2);
	}
	.campione-rays {
		position: absolute;
		inset: 0;
		background: conic-gradient(
			from 0deg at 50% 40%,
			transparent 0deg,
			rgba(232,184,75,0.06) 10deg,
			transparent 20deg,
			rgba(232,184,75,0.04) 30deg,
			transparent 40deg,
			rgba(232,184,75,0.06) 50deg,
			transparent 60deg
		);
		animation: rotate-rays 20s linear infinite;
		pointer-events: none;
	}
	@keyframes rotate-rays { to { transform: rotate(360deg); } }
	.campione-trofeo {
		font-size: 4rem;
		animation: bounce-trofeo 2s ease-in-out infinite;
		display: block;
		position: relative;
		z-index: 1;
	}
	@keyframes bounce-trofeo {
		0%,100% { transform: translateY(0) scale(1); }
		50%      { transform: translateY(-10px) scale(1.08); }
	}
	.campione-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: rgba(232,184,75,0.6);
		font-weight: 700;
		position: relative;
		z-index: 1;
	}
	.campione-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 2rem 3rem;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		border: 2px solid var(--accent);
		border-radius: 24px;
		position: relative;
		z-index: 1;
		box-shadow: 0 0 60px color-mix(in srgb, var(--accent) 20%, transparent);
	}
	.campione-emoji {
		font-size: 4rem;
		filter: drop-shadow(0 0 20px color-mix(in srgb, var(--accent) 60%, transparent));
	}
	.campione-nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(2.5rem, 8vw, 4rem);
		letter-spacing: 0.08em;
		color: var(--accent);
		margin: 0;
	}
	.campione-animale {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(240,240,250,0.35);
	}
	.campione-tagline {
		font-size: 0.85rem;
		font-style: italic;
		color: rgba(240,240,250,0.45);
		margin-top: 0.2rem;
	}

	/* ── TABELLONE MULTI-ROUND ── */
	.tabellone {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.round-section {
		border-radius: 20px;
		overflow: hidden;
		border: 1px solid rgba(255,255,255,0.06);
		background: rgba(255,255,255,0.015);
	}
	.round-section.round-corrente {
		border-color: rgba(232,184,75,0.2);
		background: rgba(232,184,75,0.03);
	}

	.round-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.1rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.round-corrente .round-hdr {
		border-bottom-color: rgba(232,184,75,0.12);
	}
	.round-hdr-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.round-badge {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		padding: 0.25rem 0.65rem;
		background: rgba(255,255,255,0.07);
		border-radius: 999px;
		color: rgba(240,240,250,0.4);
		flex-shrink: 0;
	}
	.round-badge-gold {
		background: rgba(232,184,75,0.15);
		color: #e8b84b;
	}
	.round-nome {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.05rem;
		letter-spacing: 0.06em;
		color: rgba(240,240,250,0.75);
		display: block;
	}
	.round-corrente .round-nome { color: #e8b84b; }
	.round-count {
		font-size: 0.68rem;
		color: rgba(240,240,250,0.3);
		display: block;
	}
	.round-stato {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.round-stato-ok  { background: rgba(74,222,128,0.1); color: #4ade80; }
	.round-stato-live { background: rgba(232,75,75,0.12); color: #e84b4b; animation: pulse-text 1.5s ease-in-out infinite; }
	.round-stato-wait { background: rgba(232,184,75,0.1); color: rgba(232,184,75,0.45); }

	/* Bracket grid — 2 colonne su desktop per round con molte partite */
	.bk-grid {
		padding: 0.75rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}
	.bk-grid.bk-grid-wide {
		grid-template-columns: 1fr;
	}

	.bk-wrap { display: flex; flex-direction: column; }

	/* Card partita */
	.bk-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.06);
		background: rgba(255,255,255,0.03);
		font-family: 'Outfit', sans-serif;
		cursor: default;
		width: 100%;
		text-align: left;
		transition: background 0.18s;
	}
	.bk-card.bk-done {
		cursor: pointer;
	}
	.bk-card.bk-done:hover {
		background: rgba(255,255,255,0.06);
	}
	.bk-card.bk-live {
		border-color: rgba(232,75,75,0.28);
		background: rgba(232,75,75,0.05);
	}
	.bk-card.bk-future {
		opacity: 0.55;
	}

	.bk-side {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}
	.bk-side.bk-right {
		justify-content: flex-end;
		flex-direction: row-reverse;
	}
	.bk-emoji { font-size: 1.25rem; flex-shrink: 0; }
	.bk-nome {
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(240,240,250,0.65);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bk-side.bk-winner .bk-nome {
		color: #e8b84b;
		font-weight: 700;
	}
	.bk-side.bk-loser .bk-nome {
		color: rgba(240,240,250,0.3);
		text-decoration: line-through;
		text-decoration-color: rgba(240,240,250,0.15);
	}
	.bk-side.bk-muted .bk-nome { color: rgba(240,240,250,0.3); }
	.bk-crown { font-size: 0.9rem; flex-shrink: 0; }

	.bk-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		flex-shrink: 0;
		padding: 0 0.2rem;
	}
	.bk-vs {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 0.9rem;
		letter-spacing: 0.1em;
		color: rgba(240,240,250,0.2);
	}
	.bk-vs-live { color: rgba(232,75,75,0.7); animation: vs-pulse 1.5s ease-in-out infinite; }
	.bk-data {
		font-size: 0.58rem;
		color: rgba(240,240,250,0.22);
		white-space: nowrap;
	}

	.bk-stato {
		flex-shrink: 0;
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
	}
	.bk-done-badge  { background: rgba(232,184,75,0.1); color: #e8b84b; }
	.bk-live-badge  { background: rgba(232,75,75,0.15); color: #e84b4b; animation: pulse-text 1.5s ease-in-out infinite; }
	.bk-future-badge { background: rgba(255,255,255,0.05); color: rgba(240,240,250,0.3); }

	.bk-chevron {
		font-size: 1.1rem;
		color: rgba(240,240,250,0.3);
		transition: transform 0.25s;
		flex-shrink: 0;
	}
	.bk-chevron.open { transform: rotate(90deg); color: #e8b84b; }

	/* ── ANIM ── */
	@keyframes fade-up {
		from { opacity: 0; transform: translateY(16px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── RESPONSIVE ── */
	@media (max-width: 600px) {
		.page { padding: 0 0.9rem 4rem; }

		/* Fighter cards */
		.vs-wrap { grid-template-columns: 1fr auto 1fr; gap: 0.4rem; }
		.fighter-card { padding: 1rem 0.5rem; border-radius: 16px; }
		.fighter-emoji { font-size: 2.2rem; }
		.fighter-nome { font-size: 1rem; }
		.fighter-animale { font-size: 0.62rem; }
		.vs-text { font-size: 1.6rem; }

		/* Barre risultati */
		.barre-wrap { grid-template-columns: 1fr auto 1fr; gap: 0.5rem; padding: 0.9rem; }
		.barra-nome { font-size: 0.82rem; }
		.barra-pct { font-size: 1.1rem; }
		.barra-emoji { font-size: 1.4rem; }
		.barra-tagline { display: none; }

		/* Votanti — nessuna override */
		.votanti-wrap { padding: 0.9rem 0.9rem; }

		/* Bracket mobile: 1 colonna sempre */
		.bk-grid { grid-template-columns: 1fr; gap: 0.35rem; padding: 0.5rem; }
		.bk-card { padding: 0.6rem 0.7rem; }
		.bk-emoji { font-size: 1.1rem; }
		.bk-nome { font-size: 0.76rem; }
		.bk-vs { font-size: 0.8rem; }

		/* Round header mobile */
		.round-nome { font-size: 0.9rem; }
		.round-stato { font-size: 0.6rem; padding: 0.2rem 0.5rem; }

		/* Campione mobile */
		.campione-card { padding: 1.5rem 1.5rem; }
		.campione-nome { font-size: clamp(2rem, 10vw, 3rem); }
	}
</style>

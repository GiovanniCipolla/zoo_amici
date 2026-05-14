import { PUBLIC_DISCORD_WEBHOOK } from '$env/static/public';

const WEBHOOK = PUBLIC_DISCORD_WEBHOOK || '';

function ora() {
	return new Date().toLocaleString('it-IT', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

function dispositivo() {
	const ua = navigator.userAgent;
	if (/iPad/i.test(ua)) return '📱 Tablet';
	if (/Android|iPhone|iPod/i.test(ua)) return '📱 Mobile';
	return '🖥️ Desktop';
}

function browser() {
	const ua = navigator.userAgent;
	if (/Edg\//i.test(ua)) return 'Edge';
	if (/OPR\//i.test(ua)) return 'Opera';
	if (/Chrome\//i.test(ua)) return 'Chrome';
	if (/Firefox\//i.test(ua)) return 'Firefox';
	if (/Safari\//i.test(ua)) return 'Safari';
	return '—';
}

function os() {
	const ua = navigator.userAgent;
	if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
	if (/Windows/i.test(ua)) return 'Windows';
	if (/iPhone OS/i.test(ua)) return 'iOS';
	if (/Android/i.test(ua)) return 'Android';
	if (/Mac OS X/i.test(ua)) return 'macOS';
	if (/Linux/i.test(ua)) return 'Linux';
	return '—';
}

async function geoip() {
	try {
		const res = await fetch('https://ipapi.co/json/');
		if (!res.ok) return null;
		const d = await res.json();
		return {
			ip: d.ip ?? '—',
			citta: d.city ?? '—',
			paese: d.country_name ?? '—',
			provider: d.org ?? '—'
		};
	} catch {
		return null;
	}
}

/** Incrementa il contatore visite in localStorage e restituisce il numero — mai mostrato all'utente. */
function visitaCount() {
	if (typeof localStorage === 'undefined') return '?';
	try {
		const n = parseInt(localStorage.getItem('zoo_visit_count') ?? '0', 10) + 1;
		localStorage.setItem('zoo_visit_count', String(n));
		return n;
	} catch {
		return '?';
	}
}

async function send(payload) {
	if (!WEBHOOK) return;
	try {
		await fetch(WEBHOOK, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
	} catch {
		// silenzioso — il log non deve mai rompere l'app
	}
}

/** Logga una visita al sito. Una sola volta per sessione. */
export async function logVisita() {
	if (typeof sessionStorage === 'undefined') return;
	if (sessionStorage.getItem('zoo_visit_logged')) return;
	sessionStorage.setItem('zoo_visit_logged', '1');

	const geo = await geoip();
	const n = visitaCount();

	send({
		embeds: [
			{
				title: '🐾 Nuova visita allo Zoo degli Animalacci',
				color: 0xe8b84b,
				fields: [
					{ name: '📅 Quando', value: ora(), inline: true },
					{ name: '💻 Dispositivo', value: dispositivo(), inline: true },
					{ name: '🌐 Browser', value: browser(), inline: true },
					{ name: '💿 OS', value: os(), inline: true },
					{ name: '📍 Posizione', value: geo ? `${geo.citta}, ${geo.paese}` : '—', inline: true },
					{ name: '🔌 Provider', value: geo ? geo.provider : '—', inline: true },
					{ name: '🕵️ IP', value: geo ? `\`${geo.ip}\`` : '—', inline: true },
					{ name: '🔢 Visita n°', value: String(n), inline: true }
				]
			}
		]
	});
}

/** Logga un giro alle slot machine. */
export async function logSlotGiro({ simboli, vincita, animale, giriRimasti }) {
	const simboliStr = simboli.map((s) => s.emoji).join('  ');
	const colore = vincita ? 0xffd700 : 0x2a2a3a;
	const titolo = vincita
		? `🎰 JACKPOT! Tris di ${animale.emoji} ${animale.nome}!`
		: `🎰 Giro alle Slot`;

	const geo = await geoip();

	send({
		embeds: [
			{
				title: titolo,
				color: colore,
				fields: [
					{ name: '🎡 Risultato', value: `**${simboliStr}**`, inline: true },
					{
						name: vincita ? '🏆 Vincita' : '💸 Esito',
						value: vincita ? `**${animale.grido} ${animale.nome}!**` : 'Niente da fare',
						inline: true
					},
					{ name: '🔄 Giri rimasti', value: String(giriRimasti), inline: true },
					{ name: '📅 Quando', value: ora(), inline: true },
					{ name: '💻 Dispositivo', value: dispositivo(), inline: true },
					{ name: '🌐 Browser', value: browser(), inline: true },
					{ name: '💿 OS', value: os(), inline: true },
					{
						name: '📍 Posizione',
						value: geo ? `${geo.citta}, ${geo.paese}` : '—',
						inline: true
					},
					{ name: '🕵️ IP', value: geo ? `\`${geo.ip}\`` : '—', inline: true }
				]
			}
		]
	});
}

/** Logga il completamento di un quiz con punteggio e risposte. */
export async function logQuiz(punteggio, totale, risposte) {
	const badges = risposte.map((r) => (r ? '✅' : '❌')).join('  ');
	const colore = punteggio === totale ? 0xffd700 : punteggio >= totale / 2 ? 0x22c55e : 0xef4444;

	const geo = await geoip();

	send({
		embeds: [
			{
				title: '🎯 Quiz della Settimana completato',
				color: colore,
				fields: [
					{ name: '📅 Quando', value: ora(), inline: true },
					{ name: '🏆 Punteggio', value: `**${punteggio}/${totale}**`, inline: true },
					{ name: '💻 Dispositivo', value: dispositivo(), inline: true },
					{ name: '🌐 Browser', value: browser(), inline: true },
					{ name: '💿 OS', value: os(), inline: true },
					{ name: '📍 Posizione', value: geo ? `${geo.citta}, ${geo.paese}` : '—', inline: true },
					{ name: '🔌 Provider', value: geo ? geo.provider : '—', inline: true },
					{ name: '🕵️ IP', value: geo ? `\`${geo.ip}\`` : '—', inline: true },
					{ name: '📊 Risposte', value: badges, inline: false }
				]
			}
		]
	});
}

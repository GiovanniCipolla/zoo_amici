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
export function logVisita() {
	if (typeof sessionStorage === 'undefined') return;
	if (sessionStorage.getItem('zoo_visit_logged')) return;
	sessionStorage.setItem('zoo_visit_logged', '1');

	send({
		embeds: [
			{
				title: '🐾 Nuova visita allo Zoo degli Animalacci',
				color: 0xe8b84b,
				fields: [
					{ name: '📅 Quando', value: ora(), inline: true },
					{ name: '💻 Dispositivo', value: dispositivo(), inline: true }
				]
			}
		]
	});
}

/** Logga il completamento di un quiz con punteggio e risposte. */
export function logQuiz(punteggio, totale, risposte) {
	const badges = risposte.map((r) => (r ? '✅' : '❌')).join('  ');
	const colore = punteggio === totale ? 0xffd700 : punteggio >= totale / 2 ? 0x22c55e : 0xef4444;

	send({
		embeds: [
			{
				title: '🎯 Quiz della Settimana completato',
				color: colore,
				fields: [
					{ name: '📅 Quando', value: ora(), inline: true },
					{ name: '🏆 Punteggio', value: `**${punteggio}/${totale}**`, inline: true },
					{ name: '💻 Dispositivo', value: dispositivo(), inline: true },
					{ name: '📊 Risposte', value: badges, inline: false }
				]
			}
		]
	});
}

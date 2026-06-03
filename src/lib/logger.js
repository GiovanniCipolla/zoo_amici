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

/** Invia un'idea anonima al Re degli Animali via Discord. */
export async function logIdeaZoo(testo) {
	send({
		embeds: [
			{
				title: '💡 Nuova idea per lo Zoo',
				color: 0x7c3aed,
				fields: [
					{ name: '📝 Messaggio', value: testo.slice(0, 1024), inline: false },
					{ name: '📅 Quando', value: ora(), inline: true }
				],
				footer: { text: 'Messaggio anonimo · Zoo degli Amici' }
			}
		]
	});
}

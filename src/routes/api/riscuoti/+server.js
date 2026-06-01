/**
 * POST /api/riscuoti
 * Valida server-side il claim del bonus da 5W ogni 5 ore.
 * Controlla tabella `bonus_claims` su Supabase per fingerprint + IP.
 * Un device non può riscuotire più di una volta ogni 5 ore, anche
 * se cancella localStorage o apre una finestra privata.
 */
import { json } from '@sveltejs/kit'
import { supabase } from '$lib/supabase.js'
import { getClientIP } from '$lib/server/ip.js'

const INTERVALLO_MS = 5 * 60 * 60 * 1000 // 5 ore

export async function POST({ request }) {
	const { fingerprint } = await request.json()
	const ip = getClientIP(request)

	if (!fingerprint) {
		return json({ ok: false, motivo: 'fingerprint_mancante' })
	}

	// Cerca l'ultimo claim nelle ultime 5 ore per questo fingerprint
	const cinqueOreFa = new Date(Date.now() - INTERVALLO_MS).toISOString()

	const { data: lastClaim } = await supabase
		.from('bonus_claims')
		.select('claimed_at')
		.eq('fingerprint', fingerprint)
		.gt('claimed_at', cinqueOreFa)
		.order('claimed_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (lastClaim) {
		const rimanente_ms =
			new Date(lastClaim.claimed_at).getTime() + INTERVALLO_MS - Date.now()
		return json({ ok: false, motivo: 'troppo_presto', rimanente_ms })
	}

	// Approva il claim e registralo
	await supabase.from('bonus_claims').insert({ fingerprint, ip })

	return json({ ok: true })
}

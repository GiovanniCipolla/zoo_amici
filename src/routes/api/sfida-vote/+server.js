/**
 * GET  /api/sfida-vote?fingerprint=X&date=YYYY-MM-DD
 *   → { lato: '1'|'2'|null }
 *   Controlla se il device ha già votato oggi.
 *
 * POST /api/sfida-vote  { fingerprint, data_voto, lato }
 *   → { ok: true } oppure { ok: false, lato_precedente: '1'|'2' }
 *   Registra il voto; se già votato restituisce il voto precedente.
 */
import { json } from '@sveltejs/kit'
import { supabase } from '$lib/supabase.js'
import { getClientIP } from '$lib/server/ip.js'

export async function GET({ url }) {
	const fingerprint = url.searchParams.get('fingerprint')
	const date = url.searchParams.get('date')

	if (!fingerprint || !date) return json({ lato: null })

	const { data } = await supabase
		.from('sfide_voti')
		.select('lato')
		.eq('fingerprint', fingerprint)
		.eq('data_voto', date)
		.maybeSingle()

	return json({ lato: data?.lato ?? null })
}

export async function POST({ request }) {
	const { fingerprint, data_voto, lato } = await request.json()
	const ip = getClientIP(request)

	if (!fingerprint || !data_voto || !lato) {
		return json({ ok: false, motivo: 'dati_mancanti' })
	}

	// Controlla se esiste già un voto per questo fingerprint oggi
	const { data: existing } = await supabase
		.from('sfide_voti')
		.select('lato')
		.eq('fingerprint', fingerprint)
		.eq('data_voto', data_voto)
		.maybeSingle()

	if (existing) {
		return json({ ok: false, lato_precedente: existing.lato })
	}

	await supabase.from('sfide_voti').insert({ fingerprint, ip, data_voto, lato })

	return json({ ok: true })
}

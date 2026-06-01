/**
 * POST /api/identify
 * Riceve il fingerprint dal client e restituisce l'IP reale (letto server-side).
 * Il client non può falsificare il proprio IP perché viene letto dagli headers.
 */
import { json } from '@sveltejs/kit'
import { getClientIP } from '$lib/server/ip.js'

export async function POST({ request }) {
	const { fingerprint } = await request.json()
	const ip = getClientIP(request)
	return json({ fingerprint: fingerprint || null, ip })
}

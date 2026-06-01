/**
 * Utility server-side: estrae l'IP reale del client dagli headers HTTP.
 * Supporta Cloudflare, Nginx, Vercel e deploy diretti.
 */
export function getClientIP(request) {
	const cf = request.headers.get('cf-connecting-ip')
	if (cf) return cf

	const forwarded = request.headers.get('x-forwarded-for')
	if (forwarded) return forwarded.split(',')[0].trim()

	const real = request.headers.get('x-real-ip')
	if (real) return real

	return 'unknown'
}

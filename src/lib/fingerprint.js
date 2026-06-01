/**
 * Singleton FingerprintJS — Layer 1 anti-cheat.
 * Genera un visitorId stabile su ~50 segnali hardware/software.
 * Resiste a: incognito, clear cache, cambio browser sullo stesso device.
 * Non resiste a: secondo device fisico, Tor Browser, Brave con shields max.
 */
import { browser } from '$app/environment'

let fpPromise = null

/**
 * Restituisce il visitorId univoco del device, o null se non disponibile.
 * Il risultato è cachato in memoria per tutta la sessione.
 */
export async function getFingerprint() {
	if (!browser) return null
	if (!fpPromise) {
		fpPromise = import('@fingerprintjs/fingerprintjs')
			.then((FingerprintJS) => FingerprintJS.default.load())
			.then((fp) => fp.get())
			.then((result) => result.visitorId)
			.catch(() => null)
	}
	return fpPromise
}

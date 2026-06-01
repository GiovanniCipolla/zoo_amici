/**
 * Portafoglio virtuale — gestione saldo in localStorage.
 */

function dispatchWalletUpdate() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('wallet-updated'));
	}
}

export function getSaldo() {
	if (typeof localStorage === 'undefined') return 10;
	const val = parseFloat(localStorage.getItem('zoo_wallet'));
	if (isNaN(val)) {
		localStorage.setItem('zoo_wallet', '10');
		return 10;
	}
	return val;
}

export function addSaldo(importo, _motivo) {
	if (typeof localStorage === 'undefined') return;
	const attuale = getSaldo();
	const nuovo = Math.round((attuale + importo) * 100) / 100;
	localStorage.setItem('zoo_wallet', String(nuovo));
	dispatchWalletUpdate();
}

export function spendSaldo(importo) {
	if (typeof localStorage === 'undefined') return false;
	const attuale = getSaldo();
	if (attuale < importo) return false;
	const nuovo = Math.round((attuale - importo) * 100) / 100;
	localStorage.setItem('zoo_wallet', String(nuovo));
	dispatchWalletUpdate();
	return true;
}

export function getStreak() {
	if (typeof localStorage === 'undefined') return 0;
	return parseInt(localStorage.getItem('zoo_streak') ?? '0', 10);
}

export function bonusVisitaOggi() {
	if (typeof localStorage === 'undefined') return false;
	const oggi = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	const dataOggi = `${oggi.getFullYear()}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`;
	const ultimaVisita = localStorage.getItem('zoo_wallet_visita');
	if (ultimaVisita === dataOggi) return false;

	// Calcola streak giorni consecutivi
	const ieri = new Date(oggi);
	ieri.setDate(ieri.getDate() - 1);
	const dataIeri = `${ieri.getFullYear()}-${pad(ieri.getMonth() + 1)}-${pad(ieri.getDate())}`;
	const streakAttuale = parseInt(localStorage.getItem('zoo_streak') ?? '0', 10);
	const nuovoStreak = ultimaVisita === dataIeri ? streakAttuale + 1 : 1;
	localStorage.setItem('zoo_streak', String(nuovoStreak));

	localStorage.setItem('zoo_wallet_visita', dataOggi);
	addSaldo(0.5, 'bonus_visita');
	return true;
}

// ── BONUS RISCUOTI (ogni 5 ore) ──────────────────────────────────────────────
const RISCUOTI_KEY = 'zoo_riscuoti_ts';
const RISCUOTI_INTERVALLO_MS = 5 * 60 * 60 * 1000; // 5 ore
const RISCUOTI_IMPORTO = 5;

export function getSecondiAlProssimoRiscuoti() {
	if (typeof localStorage === 'undefined') return 0;
	const ts = parseInt(localStorage.getItem(RISCUOTI_KEY) ?? '0', 10);
	if (!ts) return 0;
	const rimanente = RISCUOTI_INTERVALLO_MS - (Date.now() - ts);
	return rimanente > 0 ? Math.ceil(rimanente / 1000) : 0;
}

export function puoRiscuotiBonus() {
	return getSecondiAlProssimoRiscuoti() === 0;
}

/**
 * Riscuote il bonus da 5W.
 * Valida server-side tramite fingerprint: blocca lo stesso device
 * anche se l'utente cancella localStorage o usa modalità privata.
 * @param {string|null} fingerprint — visitorId da FingerprintJS
 */
export async function riscuotiBonus(fingerprint) {
	if (typeof localStorage === 'undefined') return false;
	// Check locale veloce: se il timer non è scaduto, blocca subito
	if (!puoRiscuotiBonus()) return false;

	// Se abbiamo il fingerprint, valida sul server
	if (fingerprint) {
		try {
			const res = await fetch('/api/riscuoti', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fingerprint })
			});
			const data = await res.json();

			if (!data.ok) {
				// Il server dice che abbiamo già riscosso — sincronizza localStorage
				if (data.rimanente_ms && data.rimanente_ms > 0) {
					const fakeTs = Date.now() - RISCUOTI_INTERVALLO_MS + data.rimanente_ms;
					localStorage.setItem(RISCUOTI_KEY, String(fakeTs));
				}
				return false;
			}
		} catch {
			// Se il server non risponde, prosegui con il check locale
			// (degradazione graceful — non blocca l'utente per problemi di rete)
		}
	}

	// Approva il claim
	localStorage.setItem(RISCUOTI_KEY, String(Date.now()));
	addSaldo(RISCUOTI_IMPORTO, 'riscuoti_bonus');
	return true;
}

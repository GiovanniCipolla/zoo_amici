/**
 * Portafoglio virtuale — gestione saldo in localStorage.
 */

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
}

export function spendSaldo(importo) {
	if (typeof localStorage === 'undefined') return false;
	const attuale = getSaldo();
	if (attuale < importo) return false;
	const nuovo = Math.round((attuale - importo) * 100) / 100;
	localStorage.setItem('zoo_wallet', String(nuovo));
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

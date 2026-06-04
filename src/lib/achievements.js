import { browser } from '$app/environment';
import { addSaldo, getSaldo } from './economia.js';

export const ACHIEVEMENTS = [
	// ── ESPLORAZIONE ──
	{ id: 'benvenuto',      emoji: '🎉', nome: 'Benvenuto',        desc: 'Prima visita al sito' },
	{ id: 'cercatore',      emoji: '🔍', nome: 'Cercatore',        desc: 'Hai usato la barra di ricerca' },
	{ id: 'curioso',        emoji: '👀', nome: 'Curioso',          desc: 'Hai aperto 10 schede animale' },
	{ id: 'investigatore',  emoji: '🕵️', nome: 'Investigatore',   desc: 'Hai aperto 20 schede animale' },
	{ id: 'animalologo',    emoji: '🐾', nome: 'Animalologo',      desc: 'Hai aperto tutte le 32 schede animale' },
	{ id: 'esploratore',    emoji: '🌍', nome: 'Esploratore',      desc: 'Hai filtrato tutte le 9 categorie' },
	// ── COMPATIBILITÀ ──
	{ id: 'chimico',        emoji: '⚗️', nome: 'Chimico',         desc: 'Hai testato 5 compatibilità' },
	{ id: 'alchimista',     emoji: '🧪', nome: 'Alchimista',       desc: 'Hai testato 20 compatibilità' },
	{ id: 'dottor_zoo',     emoji: '🧬', nome: 'Dottor Zoo',       desc: 'Hai testato 50 compatibilità' },
	// ── TORNEO ──
	{ id: 'votante',        emoji: '🗳️', nome: 'Votante',         desc: 'Primo voto al torneo' },
	{ id: 'tifoso',         emoji: '⚽', nome: 'Tifoso',           desc: 'Hai votato 5 volte al torneo' },
	{ id: 'indovino',       emoji: '🔮', nome: 'Indovino',         desc: 'Hai predetto il vincitore di una sfida' },
	{ id: 'oracolo',        emoji: '✨', nome: 'Oracolo',          desc: 'Hai predetto 10 vincitori — impossibile!' },
	// ── SLOT ──
	{ id: 'giocatore',      emoji: '🎰', nome: 'Giocatore',        desc: 'Primo giro alle slot' },
	{ id: 'spendaccione',   emoji: '💸', nome: 'Spendaccione',     desc: 'Hai girato le slot 10 volte' },
	{ id: 'slot_veteran',   emoji: '🎲', nome: 'Slot Veteran',     desc: 'Hai girato le slot 50 volte' },
	{ id: 'fortunello',     emoji: '🍀', nome: 'Fortunello',       desc: 'Hai vinto alle slot! (2% di probabilità...)' },
	{ id: 'doppio_tris',    emoji: '🎊', nome: 'Doppio Tris',      desc: 'Hai vinto 2 volte alle slot' },
	{ id: 'hat_trick',      emoji: '🎩', nome: 'Hat-Trick',        desc: 'Hai vinto 3 volte alle slot' },
	{ id: 'maniaco',        emoji: '🎮', nome: 'Maniaco',          desc: 'Hai vinto 5 volte alle slot — sei ossessionato' },
	// ── 200 METRI IN VIA MURAVERDE ──
	{ id: 'corsa_debutto',   emoji: '🏁', nome: 'Al Via!',                desc: 'Prima scommessa alla corsa degli animali' },
	{ id: 'corsa_vittoria',  emoji: '🥇', nome: 'Sul Podio',              desc: 'Prima vincita alla corsa' },
	{ id: 'corsa_outsider',  emoji: '🎲', nome: 'Colpo di Fortuna',       desc: 'Vinci scommettendo su un animale con quota > 8x' },
	{ id: 'corsa_riccone',   emoji: '💰', nome: 'Grande Scommettitore',   desc: 'Vinci €50+ netti in una singola corsa' },
	{ id: 'corsa_veterano',  emoji: '🏆', nome: 'Habitué del Trotto',     desc: 'Partecipa a 10 corse' },
	// ── ZOO A CENZINO ──
	{ id: 'cenzino_debutto',    emoji: '🍺', nome: 'Prima Sbornia',           desc: 'Prima partita a Zoo a Cenzino' },
	{ id: 'cenzino_moderato',   emoji: '🧊', nome: 'Moderato',                desc: 'Ritirati a meno di 2x — almeno sei prudente' },
	{ id: 'cenzino_coraggioso', emoji: '💪', nome: 'Duro di Costituzione',    desc: "L'animale regge fino a 5x birre bevute" },
	{ id: 'cenzino_temerario',  emoji: '🔥', nome: 'Bevitore Professionista', desc: "L'animale supera 10x — quasi impossibile!" },
	{ id: 'cenzino_leggenda',   emoji: '👑', nome: 'Campione di Cenzino',     desc: "L'animale supera 20x — leggendario!" },
	// ── BINGO A PESCARA ──
	{ id: 'bingo_debutto',    emoji: '🎱', nome: 'Prima Cartella',       desc: 'Prima partita a Bingo a Pescara' },
	{ id: 'bingo_vittoria',   emoji: '🎊', nome: 'Tombola!',             desc: 'Vinci la tua prima partita a Bingo' },
	{ id: 'bingo_jackpot',    emoji: '🎰', nome: 'Un Milione di Sogni',  desc: 'Vinci una partita jackpot da €500' },
	{ id: 'bingo_full_house', emoji: '📋', nome: 'All-in al Bingo',      desc: 'Compra 5 cartelle in una sola partita' },
	{ id: 'bingo_caro',       emoji: '💎', nome: 'Giocare in Grande',    desc: 'Vinci una partita con cartelle da €10 o più' },
	// ── DATI DEL BLUFF ──
	{ id: 'bluff_debutto',     emoji: '🎲', nome: 'Primo Lancio',      desc: 'Prima partita a Dati del Bluff allo Zoo' },
	{ id: 'bluff_sfidante',    emoji: '🫵', nome: 'Sfidante',          desc: 'Prima sfida riuscita al Bluff' },
	{ id: 'bluff_vincitore',   emoji: '🏆', nome: 'Vincitore al Bluff',desc: 'Vinci la prima partita a Dati del Bluff' },
	{ id: 'bluff_bugiardo',    emoji: '🤥', nome: 'Bugiardo Seriale',  desc: 'Bluffa con successo 5 volte' },
	{ id: 'bluff_campione',    emoji: '👑', nome: 'Campione del Bluff',desc: 'Vinci 5 partite a Dati del Bluff' },
	{ id: 'bluff_ultimo_dado', emoji: '🎯', nome: 'All-in',            desc: 'Vinci con un solo dado rimasto' },
	{ id: 'bluff_master',      emoji: '🧠', nome: 'Maestro del Bluff', desc: 'Vinci 10 partite a Dati del Bluff' },
	// ── FLAPPY ZOO ──
	{ id: 'primo_volo',        emoji: '🐦', nome: 'Primo Volo',        desc: 'Supera il primo ostacolo nel Flappy Zoo' },
	{ id: 'volatile',          emoji: '🌤️', nome: 'Volatile',          desc: 'Raggiungi 10 punti in un solo volo' },
	{ id: 'acrobata_del_cielo',emoji: '🌪️', nome: 'Acrobata del Cielo',desc: 'Raggiungi 50 punti — quasi impossibile' },
	{ id: 'dio_del_volo',      emoji: '⚡', nome: 'Dio del Volo',       desc: 'Raggiungi 100 punti — praticamente impossibile' },
	{ id: 'zoo_volante',       emoji: '🦅', nome: 'Zoo Volante',        desc: 'Supera 10 punti con ogni singolo animale del gruppo' },
	// ── NON FARTI VEDERE DA MARTINA ──
	{ id: 'martina_debutto',      emoji: '🐆', nome: 'Caccia Aperta',      desc: 'Prima partita a Non farti vedere da Martina' },
	{ id: 'martina_vittoria',     emoji: '🏃', nome: 'Fantasma',           desc: 'Vinci per la prima volta contro Martina' },
	{ id: 'martina_10_fermi',     emoji: '🫁', nome: "Respiro d'Acciaio",  desc: 'Sopravvivi a 10 fermi in una singola partita' },
	{ id: 'martina_15_fermi',     emoji: '🗿', nome: 'Monolite',           desc: 'Sopravvivi a 15 fermi in una singola partita' },
	{ id: 'martina_bastardatata', emoji: '😏', nome: 'Me lo aspettavo',    desc: 'Sopravvivi a 5 bastardatate in una partita' },
	{ id: 'martina_tutti_elim',   emoji: '💀', nome: 'Solo Superstite',    desc: 'Vinci mentre tutti e 6 gli avversari vengono eliminati' },
	{ id: 'martina_3_vittorie',   emoji: '😤', nome: 'Incubo di Martina',  desc: 'Vinci 3 partite contro Martina' },
	// ── FEDELTÀ ──
	{ id: 'abituale',       emoji: '📆', nome: 'Abituale',         desc: 'Primo bonus visita giornaliera riscosso' },
	{ id: 'fedele',         emoji: '❤️', nome: 'Fedele',           desc: '7 giorni di fila sul sito' },
	{ id: 'paziente',       emoji: '🏅', nome: 'Paziente',         desc: '30 giorni di fila sul sito' },
	// ── ECONOMIA ──
	{ id: 'paperone',       emoji: '💰', nome: 'Paperone',         desc: 'Raggiungi €20 di saldo' },
	{ id: 'benestante',     emoji: '💎', nome: 'Benestante',       desc: 'Raggiungi €50 di saldo' },
	{ id: 'bankroll',       emoji: '💵', nome: 'Bankroll',         desc: 'Raggiungi €100 di saldo' },
	{ id: 'grande_ricco',   emoji: '🤑', nome: 'Grande Ricco',     desc: 'Raggiungi €200 di saldo — premio: altri €200!' },
	// ── META ──
	{ id: 'collezionista',     emoji: '🎖️', nome: 'Collezionista',    desc: 'Sblocca 10 achievement' },
	{ id: 'tuttofare',         emoji: '📚', nome: 'Enciclopedico',     desc: 'Sblocca 20 achievement' },
	{ id: 'leggenda_assoluta', emoji: '👑', nome: 'Leggenda Assoluta', desc: 'Sblocca tutti gli achievement' }
];

const ACHIEVEMENT_REWARDS = {
	benvenuto:         0.10,
	cercatore:         0.25,
	curioso:           0.50,
	investigatore:     1.00,
	animalologo:       2.00,
	esploratore:       1.00,
	chimico:           0.75,
	alchimista:        1.50,
	dottor_zoo:        3.00,
	votante:           0.50,
	tifoso:            1.00,
	indovino:          1.00,
	oracolo:          50.00,
	corsa_debutto:   0.25,
	corsa_vittoria:  1.00,
	corsa_outsider:  5.00,
	corsa_riccone:   5.00,
	corsa_veterano:  2.00,
	cenzino_debutto:    0.25,
	cenzino_moderato:   0.50,
	cenzino_coraggioso: 2.00,
	cenzino_temerario:  5.00,
	cenzino_leggenda:  20.00,
	giocatore:         0.25,
	spendaccione:      1.00,
	slot_veteran:      2.00,
	fortunello:        5.00,
	doppio_tris:       5.00,
	hat_trick:        10.00,
	maniaco:          15.00,
	bluff_debutto:     0.25,
	bluff_sfidante:    0.50,
	bluff_vincitore:   2.00,
	bluff_bugiardo:    3.00,
	bluff_campione:   10.00,
	bluff_ultimo_dado:15.00,
	bluff_master:     25.00,
	bingo_debutto:    0.25,
	bingo_vittoria:   1.00,
	bingo_jackpot:   50.00,
	bingo_full_house: 2.00,
	bingo_caro:       5.00,
	primo_volo:          0.50,
	volatile:            1.00,
	acrobata_del_cielo:  3.00,
	dio_del_volo:       10.00,
	zoo_volante:        25.00,
	martina_debutto:      0.25,
	martina_vittoria:     2.00,
	martina_10_fermi:     1.00,
	martina_15_fermi:     3.00,
	martina_bastardatata: 3.00,
	martina_tutti_elim:   8.00,
	martina_3_vittorie:   5.00,
	abituale:            0.25,
	fedele:            5.00,
	paziente:        100.00,
	paperone:          0.50,
	benestante:        1.00,
	bankroll:          5.00,
	grande_ricco:    200.00,
	collezionista:     2.00,
	tuttofare:         5.00,
	leggenda_assoluta: 20.00
};

const META = ['collezionista', 'tuttofare', 'leggenda_assoluta'];

/** Restituisce l'array degli id sbloccati. */
export function getUnlocked() {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem('zoo_achievements') ?? '[]');
	} catch {
		return [];
	}
}

/** Controlla e sblocca achievement economici in base al saldo attuale. */
export function checkEconomyAchievements() {
	if (!browser) return;
	const s = getSaldo();
	if (s >= 20)  unlock('paperone');
	if (s >= 50)  unlock('benestante');
	if (s >= 100) unlock('bankroll');
	if (s >= 200) unlock('grande_ricco');
}

/**
 * Sblocca un achievement. Restituisce true se era nuovo (appena sbloccato).
 * Emette l'evento globale 'achievement-unlocked' per il toast.
 */
export function unlock(id) {
	if (!browser) return false;
	const current = getUnlocked();
	if (current.includes(id)) return false;
	const updated = [...current, id];
	localStorage.setItem('zoo_achievements', JSON.stringify(updated));
	addSaldo(ACHIEVEMENT_REWARDS[id] ?? 0, 'achievement');
	const def = ACHIEVEMENTS.find((a) => a.id === id);
	if (def) {
		window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: def }));
	}
	// Auto-check meta achievement (solo per achievement non-meta, evita ricorsione)
	if (!META.includes(id)) {
		if (!updated.includes('collezionista') && updated.length >= 10) unlock('collezionista');
		if (!updated.includes('tuttofare') && updated.length >= 20) unlock('tuttofare');
		const nonMeta = ACHIEVEMENTS.filter((a) => !META.includes(a.id)).map((a) => a.id);
		if (!updated.includes('leggenda_assoluta') && nonMeta.every((a) => updated.includes(a))) {
			unlock('leggenda_assoluta');
		}
	}
	return true;
}

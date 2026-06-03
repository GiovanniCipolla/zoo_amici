import { supabase } from './supabase.js'
import { membri, nomeDisplay, trovaMembro } from './membri.js'
import { browser } from '$app/environment'

// ── SESSION ────────────────────────────────────────────────────────────
export function getSessionId() {
	if (!browser) return 'server'
	let sid = localStorage.getItem('zoo_session_id')
	if (!sid) {
		sid = crypto.randomUUID()
		localStorage.setItem('zoo_session_id', sid)
	}
	return sid
}

// ── SHUFFLE con seed ────────────────────────────────────────────────────
function shuffle(arr, seed) {
	const a = [...arr]
	let s = seed >>> 0
	for (let i = a.length - 1; i > 0; i--) {
		s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
		s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
		s ^= s >>> 16
		const j = Math.abs(s) % (i + 1);
		[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

// ── NOMI ROUND ──────────────────────────────────────────────────────────
const NOMI_ROUND = {
	1: '16esimi di Finale',
	2: 'Ottavi di Finale',
	3: 'Quarti di Finale',
	4: 'Semifinali',
	5: 'Finale'
}

export function getNomeRound(round) {
	return NOMI_ROUND[round] || `Round ${round}`
}

// ── TORNEO ──────────────────────────────────────────────────────────────
export async function getTorneoAttivo() {
	const { data } = await supabase
		.from('torneo')
		.select('*')
		.eq('stato', 'attivo')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	return data
}

export async function creaTorneo() {
	// Prima controlla di nuovo (evita doppia creazione)
	const existing = await getTorneoAttivo()
	if (existing) return existing

	const seed = Date.now()
	const shuffled = shuffle(membri, seed)

	const { data: torneo, error } = await supabase
		.from('torneo')
		.insert({ nome: 'Zoo Amici Championship 2025', round_corrente: 1 })
		.select()
		.single()
	if (error) throw error

	// Allinea le partite alla mezzanotte di oggi
	const now = new Date()
	const mezzanotte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

	const partiteData = []
	for (let i = 0; i < 16; i++) {
		const dataInizio = new Date(mezzanotte.getTime() + i * 24 * 60 * 60 * 1000)
		const dataFine = new Date(dataInizio.getTime() + 24 * 60 * 60 * 1000)
		partiteData.push({
			torneo_id: torneo.id,
			round: 1,
			posizione: i + 1,
			membro1: nomeDisplay(shuffled[i * 2]),
			membro2: nomeDisplay(shuffled[i * 2 + 1]),
			data_inizio: dataInizio.toISOString(),
			data_fine: dataFine.toISOString(),
			stato: i === 0 ? 'attivo' : 'in_attesa'
		})
	}

	const { error: err2 } = await supabase.from('partite').insert(partiteData)
	if (err2) throw err2

	return torneo
}

// ── AVANZAMENTO ROUND ───────────────────────────────────────────────────
export async function checkEAvanzaRound(torneoId) {
	const { data: tuttePartite } = await supabase
		.from('partite')
		.select('*')
		.eq('torneo_id', torneoId)
		.order('round', { ascending: true })
		.order('posizione', { ascending: true })

	if (!tuttePartite || tuttePartite.length === 0) return false

	const roundMax = Math.max(...tuttePartite.map((p) => p.round))
	const partiteRound = tuttePartite.filter((p) => p.round === roundMax)

	// Tutte le partite del round corrente devono essere scadute
	const now = Date.now()
	const tutteComplete = partiteRound.every((p) => now >= new Date(p.data_fine).getTime())
	if (!tutteComplete) return false

	// Il round successivo esiste già?
	if (tuttePartite.some((p) => p.round === roundMax + 1)) return false

	// Se c'è solo 1 partita nel round corrente → è la Finale, torneo finito
	if (partiteRound.length === 1) return false

	// Calcola i vincitori (in caso di pareggio/0 voti: avanza membro1)
	const partiteIds = partiteRound.map((p) => p.id)
	const { data: tuttiVoti } = await supabase
		.from('voti')
		.select('partita_id, votato')
		.in('partita_id', partiteIds)

	const votiMap = {}
	for (const v of tuttiVoti || []) {
		if (!votiMap[v.partita_id]) votiMap[v.partita_id] = []
		votiMap[v.partita_id].push(v.votato)
	}

	const vincitori = partiteRound.map((partita) => {
		const votiPartita = votiMap[partita.id] || []
		const v1 = votiPartita.filter((v) => v === partita.membro1).length
		const v2 = votiPartita.filter((v) => v === partita.membro2).length
		return v1 >= v2 ? partita.membro1 : partita.membro2
	})

	// Programma il nuovo round a partire da domani mezzanotte
	const nowDate = new Date()
	const mezzanotte = new Date(
		nowDate.getFullYear(),
		nowDate.getMonth(),
		nowDate.getDate() + 1,
		0,
		0,
		0
	)

	const nuovoRound = roundMax + 1
	const nNuove = vincitori.length / 2
	const partiteData = []

	for (let i = 0; i < nNuove; i++) {
		const dataInizio = new Date(mezzanotte.getTime() + i * 24 * 60 * 60 * 1000)
		const dataFine = new Date(dataInizio.getTime() + 24 * 60 * 60 * 1000)
		partiteData.push({
			torneo_id: torneoId,
			round: nuovoRound,
			posizione: i + 1,
			membro1: vincitori[i * 2],
			membro2: vincitori[i * 2 + 1],
			data_inizio: dataInizio.toISOString(),
			data_fine: dataFine.toISOString(),
			stato: i === 0 ? 'attivo' : 'in_attesa'
		})
	}

	const { error } = await supabase.from('partite').insert(partiteData)
	if (error) throw error

	await supabase.from('torneo').update({ round_corrente: nuovoRound }).eq('id', torneoId)

	return true
}

// ── PARTITE ─────────────────────────────────────────────────────────────
export async function getPartite(torneoId) {
	const { data } = await supabase
		.from('partite')
		.select('*')
		.eq('torneo_id', torneoId)
		.order('round', { ascending: true })
		.order('posizione', { ascending: true })
	return data || []
}

// ── VOTI ────────────────────────────────────────────────────────────────
export async function getVoti(partitaId) {
	const { data } = await supabase
		.from('voti')
		.select('votato, nominativo, created_at')
		.eq('partita_id', partitaId)
		.order('created_at')
	return data || []
}

// Carica voti di più partite in una sola query (per la cache vincitori)
export async function getVotiMultiple(partitaIds) {
	if (!partitaIds || partitaIds.length === 0) return []
	const { data } = await supabase
		.from('voti')
		.select('partita_id, votato')
		.in('partita_id', partitaIds)
	return data || []
}

export async function vota(partitaId, votato, sessionId, nominativo, fingerprint, ip) {
	const { data, error } = await supabase
		.from('voti')
		.insert({
			partita_id: partitaId,
			votato,
			session_id: sessionId,
			nominativo: nominativo || null,
			fingerprint: fingerprint || null,
			ip: ip || null
		})
		.select()
		.single()
	if (error) throw error
	return data
}

export async function haVotato(partitaId, sessionId, fingerprint) {
	let query = supabase
		.from('voti')
		.select('votato, nominativo')
		.eq('partita_id', partitaId)

	// Controlla per session_id OPPURE fingerprint — stesso device, sessione diversa
	if (fingerprint) {
		query = query.or(`session_id.eq.${sessionId},fingerprint.eq.${fingerprint}`)
	} else {
		query = query.eq('session_id', sessionId)
	}

	const { data } = await query.limit(1).maybeSingle()
	return data
}

// ── HELPERS ─────────────────────────────────────────────────────────────
export function getMembro(nome) {
	return trovaMembro(nome)
}

export function getStatoPartita(partita) {
	const now = Date.now()
	const inizio = new Date(partita.data_inizio).getTime()
	const fine = new Date(partita.data_fine).getTime()
	if (now < inizio) return 'in_attesa'
	if (now >= fine) return 'completato'
	return 'attivo'
}

export function getVincitoreCalcolato(partita, voti) {
	if (getStatoPartita(partita) !== 'completato') return null
	const v1 = voti.filter((v) => v.votato === partita.membro1).length
	const v2 = voti.filter((v) => v.votato === partita.membro2).length
	if (v1 === 0 && v2 === 0) return null
	if (v1 === v2) return 'pareggio'
	return v1 > v2 ? partita.membro1 : partita.membro2
}

export function getPercent(membro, voti) {
	const tot = voti.length
	if (tot === 0) return 0
	return Math.round((voti.filter((v) => v.votato === membro).length / tot) * 100)
}

export function formatCountdown(ms) {
	if (ms <= 0) return '00:00:00'
	const h = Math.floor(ms / 3600000)
	const m = Math.floor((ms % 3600000) / 60000)
	const s = Math.floor((ms % 60000) / 1000)
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatOra(iso) {
	return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatData(iso) {
	return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

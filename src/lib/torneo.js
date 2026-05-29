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

// ── PARTITE ─────────────────────────────────────────────────────────────
export async function getPartite(torneoId) {
	const { data } = await supabase
		.from('partite')
		.select('*')
		.eq('torneo_id', torneoId)
		.order('posizione')
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

export async function vota(partitaId, votato, sessionId, nominativo) {
	const { data, error } = await supabase
		.from('voti')
		.insert({
			partita_id: partitaId,
			votato,
			session_id: sessionId,
			nominativo: nominativo || null
		})
		.select()
		.single()
	if (error) throw error
	return data
}

export async function haVotato(partitaId, sessionId) {
	const { data } = await supabase
		.from('voti')
		.select('votato, nominativo')
		.eq('partita_id', partitaId)
		.eq('session_id', sessionId)
		.maybeSingle()
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

/**
 * Classifica ufficiale degli animalacci.
 * L'ordine dell'array è l'ordine in classifica (rank 1 = primo).
 * disambig: per animali uguali, mostra solo l'iniziale del nome a fianco.
 */
export const membri = [
	{
		nome: 'Luisa',
		animale: 'Leonessa',
		emoji: '🦁',
		colore: '#d4a020',
		tagline: 'Più pericolosa del Leone, senza nemmeno provarci',
		disambig: 'L.'
	},
	{
		nome: 'Bea',
		animale: 'Leonessa',
		emoji: '🦁',
		colore: '#daa828',
		tagline: 'Regna nel silenzio. Teme nessuno.',
		disambig: 'B.'
	},
	{
		nome: 'Peppe',
		animale: 'Pecora',
		emoji: '🐑',
		colore: '#b0b8c8',
		tagline: 'Beeeeh.'
	},
	{
		nome: 'Pompoff',
		animale: 'Scoiattolo',
		emoji: '🐿️',
		colore: '#a0582a',
		tagline: 'Ha nascosto le noci e non le trova più'
	},
	{
		nome: 'Nunzia',
		animale: 'Cavalla',
		emoji: '🐴',
		colore: '#c8961b',
		tagline: 'Elegante, fiera, e ha sempre ragione'
	},
	{
		nome: 'Alessia',
		animale: 'Varana',
		emoji: '🦎',
		colore: '#4aae6a',
		tagline: 'Rettile di lusso (edizione limitata)',
		disambig: 'Ale.'
	},
	{
		nome: 'Yayà',
		animale: 'Leone',
		emoji: '🦁',
		colore: '#e8b84b',
		tagline: 'Re indiscusso del divano'
	},
	{
		nome: 'Fetente',
		animale: 'Cavallo',
		emoji: '🐴',
		colore: '#b8860b',
		tagline: 'Veloce come il vento... di tanto in tanto'
	},
	{
		nome: 'Anthony',
		animale: 'Gazza Ladra',
		emoji: '🐦‍⬛',
		colore: '#9a9aaa',
		tagline: 'Occhio ai vostri oggetti preziosi'
	},
	{
		nome: 'Marcò',
		animale: 'Cozza',
		emoji: '🦪',
		colore: '#2a5fa0',
		tagline: 'Sapidità partenopea allo stato puro'
	},
	{
		nome: 'Nicola',
		animale: 'Lupo',
		emoji: '🐺',
		colore: '#8b9ab0',
		tagline: 'Ululatore professionista'
	},
	{
		nome: 'Concetta',
		animale: 'Squalo',
		emoji: '🦈',
		colore: '#1840b0',
		tagline: 'Non fare mosse sbagliate'
	},
	{
		nome: 'Nico Nico',
		animale: 'Lupetto',
		emoji: '🐺',
		colore: '#9aacbf',
		tagline: 'Lupo in miniatura vol.2',
		disambig: 'N.'
	},
	{
		nome: 'Di Menna',
		animale: 'Cimice',
		emoji: '🪲',
		colore: '#5a8c1a',
		tagline: 'Non invitato, ma sempre presente'
	},
	{
		nome: 'Martina',
		animale: 'Puma',
		emoji: '🐆',
		colore: '#c87830',
		tagline: 'Agile, feroce, lo sa benissimo'
	},
	{
		nome: 'Chiara',
		animale: 'Struzzo',
		emoji: '🦤',
		colore: '#c0b8a0',
		tagline: 'Esperta in tecniche di negazione della realtà'
	},
	{
		nome: 'Tevez',
		animale: 'Lupetto',
		emoji: '🐺',
		colore: '#a0aec0',
		tagline: 'Lupo in miniatura, ma non fatelo sapere',
		disambig: 'T.'
	},
	{
		nome: 'Aquilino',
		animale: 'Orso',
		emoji: '🐻',
		colore: '#8a5020',
		tagline: 'In letargo 9 mesi su 12'
	},
	{
		nome: 'Angelone',
		animale: 'Delfino',
		emoji: '🐬',
		colore: '#1ab0e8',
		tagline: 'Il più intelligente del gruppo (parole sue)'
	},
	{
		nome: 'Alice',
		animale: 'Coniglio Nero',
		emoji: '🐇',
		colore: '#2a2a2a',
		tagline: 'Innamorata di un Varano dal sangue caldo: un amore che sfida ogni legge della natura'
	},
	{
		nome: 'Vincenzina',
		animale: 'Antilope',
		emoji: '🦌',
		colore: '#b09030',
		tagline: 'Sempre in fuga da qualcosa'
	},
	{
		nome: 'Micaela',
		animale: 'Lince',
		emoji: '🐱',
		colore: '#a06828',
		tagline: 'Ti vede. Anche adesso. Anche al buio'
	},
	{
		nome: 'Jacopo',
		animale: 'Grillo',
		emoji: '🦗',
		colore: '#6a9a20',
		tagline: 'Cri cri cri cri cri'
	},
	{
		nome: 'Pasquale',
		animale: 'Topo',
		emoji: '🐭',
		colore: '#9a9a9a',
		tagline: 'Silenzioso, furtivo, e sa dove tieni il formaggio'
	},
	{
		nome: 'Annalina',
		animale: 'Rondine',
		emoji: '🐦',
		colore: '#3060d0',
		tagline: 'Annuncia la primavera, poi sparisce'
	},
	{
		nome: 'Claudia',
		animale: 'Giraffa',
		emoji: '🦒',
		colore: '#e89a30',
		tagline: 'Vede lontano. I problemi li ignora'
	},
	{
		nome: 'Geremia',
		animale: 'Canguro',
		emoji: '🦘',
		colore: '#d4820a',
		tagline: 'Porta tutto nel marsupio, tranne le responsabilità'
	},
	{
		nome: 'Pietro',
		animale: 'Fagiano',
		emoji: '🐦',
		colore: '#c83020',
		tagline: 'Un uccello dal portamento leggendario'
	},
	{
		nome: 'Senza Nome',
		animale: 'Ornitorinco',
		emoji: '🦆',
		colore: '#8060b0',
		tagline: 'Il glitch della creazione divina'
	},
	{
		nome: 'Alexia',
		animale: 'Varana',
		emoji: '🦎',
		colore: '#3a9e5a',
		tagline: 'Rettile di lusso (versione deluxe)',
		disambig: 'Alx.'
	},
	{
		nome: 'Downtonio',
		animale: 'Varano',
		emoji: '🦎',
		colore: '#4a9e6a',
		tagline: 'Rettile di classe superiore'
	}
];

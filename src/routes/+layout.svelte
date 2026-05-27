<script>
	import '../app.css';
	import Achievements from '$lib/components/Achievements.svelte';
	import WalletBadge from '$lib/components/WalletBadge.svelte';

	let { children } = $props();
</script>

{@render children()}
<Achievements />
<WalletBadge />

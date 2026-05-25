<script>
	import '../app.css';
	import Achievements from '$lib/components/Achievements.svelte';

	let { children } = $props();
</script>

{@render children()}
<Achievements />

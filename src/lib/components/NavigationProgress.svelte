<script lang="ts">
    import { navigating } from "$app/state";

    /**
     * Navegação mais rápida que isso termina antes do olho registrar a barra, e o flash
     * parece defeito. Esperar faz o caso comum não mostrar nada.
     */
    const DELAY_MS = 200;

    let visible = $state(false);

    $effect(() => {
        if (!navigating.to) {
            visible = false;
            return;
        }

        const timer = setTimeout(() => (visible = true), DELAY_MS);
        return () => clearTimeout(timer);
    });
</script>

{#if visible}
    <div
        role="status"
        aria-label="Carregando"
        class="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden"
    >
        <div
            class="h-full w-2/5 animate-nav-progress bg-primary motion-reduce:w-full motion-reduce:animate-none"
        ></div>
    </div>
{/if}

<script lang="ts">
    import Button from "./Button.svelte";
    import { clearPendingLink, getPendingLink } from "#lib/state/link.svelte";

    const url = $derived(getPendingLink());

    function open() {
        const target = url;
        clearPendingLink();
        // Aberto só aqui, pelo clique de quem leu o endereço na tela.
        if (target !== null) window.open(target, "_blank", "noopener,noreferrer");
    }
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && clearPendingLink()} />

{#if url !== null}
    <!-- Acima de qualquer modal de página: o link pode ser clicado de dentro de um deles. -->
    <div class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3">
        <div
            class="flex w-full max-w-md flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 class="text-base font-bold text-content">Você está saindo do Tukro</h2>

            <p class="text-sm text-muted">Você está prestes a abrir este link:</p>
            <p
                class="rounded-theme border border-line bg-canvas p-2 text-sm break-all text-content"
            >
                {url}
            </p>
            <p class="text-xs text-muted">
                Confira o endereço antes de continuar. Links escritos por outras pessoas podem levar
                a páginas maliciosas.
            </p>

            <div class="flex justify-end gap-2">
                <Button size="sm" variant="outline" onclick={clearPendingLink}>não</Button>
                <Button size="sm" onclick={open}>sim, abrir</Button>
            </div>
        </div>
    </div>
{/if}

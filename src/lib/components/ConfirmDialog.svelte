<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import Button from "#lib/components/Button.svelte";

    interface Props {
        title: string;
        /** Texto explicando o que a confirmação faz. */
        children: Snippet;
        confirmLabel: string;
        /** Trava os dois botões enquanto a requisição está rodando. */
        busy?: boolean;
        onconfirm: () => void;
        oncancel: () => void;
    }

    let { title, children, confirmLabel, busy = false, onconfirm, oncancel }: Props = $props();

    /** Só um diálogo desses fica aberto por vez, então um id fixo dá conta do aria. */
    const TITLE_ID = "confirm-dialog-title";

    let box = $state<HTMLElement | null>(null);
    let cancelButton = $state<HTMLButtonElement | null>(null);

    // O foco entra no "cancelar", que é a saída segura de uma ação destrutiva, e volta para
    // quem abriu o diálogo quando ele fecha.
    onMount(() => {
        const opener = document.activeElement;
        cancelButton?.focus();
        return () => {
            if (opener instanceof HTMLElement) opener.focus();
        };
    });

    /** Tab não pode sair do diálogo: a página continua ali atrás, e não é ela que responde. */
    function keepFocusInside(event: KeyboardEvent) {
        const buttons = [...(box?.querySelectorAll("button:not([disabled])") ?? [])];
        if (buttons.length === 0) return;

        const first = buttons.at(0) as HTMLElement;
        const last = buttons.at(-1) as HTMLElement;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        // Enquanto a requisição roda os botões estão travados, e o Esc não pode furar isso.
        if (event.key === "Escape" && !busy) oncancel();
        if (event.key === "Tab") keepFocusInside(event);
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div
        bind:this={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        class="flex w-full max-w-sm flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <h2 id={TITLE_ID} class="text-base font-bold text-content">{title}</h2>
        <p class="text-sm text-muted">{@render children()}</p>

        <div class="flex justify-end gap-2">
            <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onclick={oncancel}
                bind:element={cancelButton}
            >
                cancelar
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onclick={onconfirm}>
                {confirmLabel}
            </Button>
        </div>
    </div>
</div>

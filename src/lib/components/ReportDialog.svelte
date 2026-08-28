<script lang="ts">
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import { ApiError, NON_FIELD } from "#lib/error";
    import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, submitReport } from "#lib/report";
    import { toastApiError } from "#lib/toast";
    import type { ReportKind, ReportReason } from "#lib/types";

    interface Props {
        /** Controla a abertura. O componente fecha sozinho no sucesso e no cancelar. */
        open: boolean;
        kind: ReportKind;
        /** Slug para `profile` e `community`, uuid do conteúdo para os demais. */
        reference: string;
        /** Nome do alvo, vai no título: "Denunciar {name}". */
        name: string;
        /** Chamado no sucesso e no 409, para o pai lembrar que já denunciou. */
        onreported?: () => void;
    }

    let { open = $bindable(), kind, reference, name, onreported }: Props = $props();

    const TITLE_ID = "report-dialog-title";

    let reason = $state<ReportReason>("spam");
    let details = $state("");
    let busy = $state(false);
    let retryAfter = $state(0);

    // Cada abertura começa limpa.
    $effect(() => {
        if (open) {
            reason = "spam";
            details = "";
            retryAfter = 0;
        }
    });

    function close() {
        open = false;
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        // A regra do backend é só o motivo, mas "outro" sem texto não ajuda ninguém.
        if (reason === "other" && details.trim() === "") return;

        busy = true;
        try {
            const text = details.trim();
            await submitReport(kind, reference, {
                reason,
                ...(text === "" ? {} : { details: text }),
            });
            onreported?.();
            open = false;
            toast.success("Denúncia enviada");
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                // Já ter denunciado é um estado, não uma falha. Só acontece em perfil.
                onreported?.();
                open = false;
                toast.info("Você já denunciou isto");
            } else if (error instanceof ApiError && error.status === 404) {
                open = false;
                toast.error("Este conteúdo não está mais disponível");
            } else if (error instanceof ApiError && error.status === 429) {
                const seconds = error.errorsAt(NON_FIELD).at(0)?.params?.retry_after_seconds;
                retryAfter = typeof seconds === "number" ? seconds : 0;
                if (retryAfter > 0) setTimeout(() => (retryAfter = 0), retryAfter * 1000);
                toastApiError(error);
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    function onKeyDown(event: KeyboardEvent) {
        if (open && !busy && event.key === "Escape") close();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            class="w-full max-w-md rounded-theme border border-line bg-surface p-4"
        >
            <form onsubmit={submit} class="flex flex-col gap-3">
                <h2 id={TITLE_ID} class="text-base font-bold text-content">Denunciar {name}</h2>
                <p class="text-sm text-muted">
                    A denúncia é anônima: quem foi denunciado não vê quem denunciou.
                </p>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">Motivo</span>
                    <select
                        bind:value={reason}
                        class="h-9 rounded-theme border border-line bg-canvas px-2 text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        {#each REPORT_REASONS as item}
                            <option value={item.value}>{item.label}</option>
                        {/each}
                    </select>
                </label>

                <label class="flex flex-col gap-1 text-sm">
                    <span class="text-muted">
                        Detalhes {reason === "other" ? "(obrigatório)" : "(opcional)"}
                    </span>
                    <Textarea bind:value={details} rows={4} maxlength={REPORT_DETAILS_MAX_LENGTH} />
                </label>

                {#if retryAfter > 0}
                    <p class="text-sm text-muted">
                        Muitas tentativas seguidas. Tente de novo em {retryAfter} segundos.
                    </p>
                {/if}

                <div class="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onclick={close}>
                        cancelar
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        type="submit"
                        disabled={busy ||
                            retryAfter > 0 ||
                            (reason === "other" && details.trim() === "")}
                    >
                        enviar denúncia
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

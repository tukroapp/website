<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import Input from "#lib/components/Input.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import {
        SUSPEND_REASON_MAX_LENGTH,
        accountStatusLabel,
        suspendUser,
        unsuspendUser,
    } from "#lib/moderation";
    import {
        dismissReport,
        reportReasonLabel,
        reportStatusLabel,
        resolveReport,
        setReportReviewing,
    } from "#lib/report";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let busy = $state(false);
    let suspending = $state(false);
    let suspendReason = $state("");
    let suspendUntil = $state("");

    const report = $derived(data.report);
    const reported = $derived(report.reported);
    /** O sinal de abuso mais barato de olhar, vale destacar quando cresce. */
    const heavilyBlocked = $derived((reported?.blocked_by_count ?? 0) >= 5);

    async function act(action: (id: string) => Promise<void>, message: string) {
        busy = true;
        try {
            await action(report.id);
            await refreshAll();
            toast.success(message);
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function submitSuspension(event: SubmitEvent) {
        event.preventDefault();
        if (busy || !reported) return;
        busy = true;

        try {
            await suspendUser(reported.slug, {
                reason: suspendReason,
                until: suspendUntil ? new Date(suspendUntil).toISOString() : null,
            });
            await refreshAll();
            suspending = false;
            suspendReason = "";
            suspendUntil = "";
            toast.success("Conta suspensa");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function revokeSuspension() {
        if (busy || !reported) return;
        busy = true;

        try {
            await unsuspendUser(reported.slug);
            await refreshAll();
            toast.success("Suspensão revogada");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>Denúncia | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            {reportReasonLabel(report.reason)}
        </h1>
        <a href="/admin/reports" class="text-sm text-primary underline underline-offset-2">
            voltar para a fila
        </a>
    </div>

    <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3 text-sm">
        <p class="text-muted">
            {reportStatusLabel(report.status)}, aberta em {formatDateTime(report.created_at)}
        </p>

        {#if report.reviewed_by}
            <p class="text-muted">
                {#if report.reviewed_at}
                    Decidida por {report.reviewed_by.name} em {formatDateTime(report.reviewed_at)}
                {:else}
                    Em análise por {report.reviewed_by.name}
                {/if}
            </p>
        {/if}

        <p class="text-content">
            Denunciado por
            <a href="/@{report.reporter.slug}" class="text-primary underline underline-offset-2">
                {report.reporter.name}
            </a>
        </p>

        {#if report.details}
            <p class="break-words whitespace-pre-wrap text-content">{report.details}</p>
        {:else}
            <p class="text-muted">Sem detalhes.</p>
        {/if}

        <div class="flex flex-wrap gap-2">
            <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onclick={() => act(setReportReviewing, "Denúncia marcada como em análise")}
            >
                assumir análise
            </Button>
            <Button
                size="sm"
                disabled={busy}
                onclick={() => act(resolveReport, "Denúncia marcada como procedente")}
            >
                procedente
            </Button>
            <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onclick={() => act(dismissReport, "Denúncia marcada como improcedente")}
            >
                improcedente
            </Button>
        </div>

        <p class="text-xs text-muted">
            Registrar a decisão não desativa a conta nem apaga conteúdo.
        </p>
    </div>

    {#if reported}
        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
            <h2 class="border-b border-line pb-1 text-base font-bold text-content">
                Conta denunciada
            </h2>

            <div class="flex items-center gap-3">
                <Avatar src={reported.avatar_url} name={reported.name} class="size-12 shrink-0" />
                <div class="min-w-0">
                    <a
                        href="/@{reported.slug}"
                        class="block truncate font-medium text-primary underline underline-offset-2"
                    >
                        {reported.name}
                    </a>
                    <span class="block truncate text-xs text-muted">@{reported.slug}</span>
                </div>
            </div>

            <p class="text-xs text-muted">
                Dados internos, visíveis só para a moderação: {reported.email}, cadastro em
                {formatDateTime(reported.registered_at)},
                {accountStatusLabel(reported.account_status)},
                {reported.is_email_verified ? "e-mail verificado" : "e-mail não verificado"}.
            </p>

            {#if reported.account_status === "suspended"}
                <p class="rounded-theme bg-danger px-2 py-1 text-xs text-on-danger">
                    {reported.suspended_until
                        ? `Suspensa até ${formatDateTime(reported.suspended_until)}`
                        : "Suspensa por tempo indeterminado"}
                </p>
            {/if}

            <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-3">
                <dt class="text-muted">amigos</dt>
                <dd class="text-content">{reported.friends_count}</dd>
                <dt class="text-muted">recados escritos</dt>
                <dd class="text-content">{reported.scraps_written_count}</dd>
                <dt class="text-muted">recados recebidos</dt>
                <dd class="text-content">{reported.scraps_received_count}</dd>
                <dt class="text-muted">depoimentos escritos</dt>
                <dd class="text-content">{reported.testimonials_written_count}</dd>
                <dt class="text-muted">bloqueado por</dt>
                <dd class={heavilyBlocked ? "font-bold text-danger" : "text-content"}>
                    {reported.blocked_by_count}
                </dd>
                <dt class="text-muted">denúncias</dt>
                <dd class="text-content">{reported.reports_count}</dd>
            </dl>

            {#if reported.account_status === "suspended"}
                <div>
                    <Button size="sm" variant="outline" disabled={busy} onclick={revokeSuspension}>
                        revogar suspensão
                    </Button>
                </div>
            {:else if suspending}
                <form class="flex flex-col gap-2" onsubmit={submitSuspension}>
                    <label class="text-sm text-muted" for="suspend-reason">
                        Motivo registrado na conta
                    </label>
                    <Textarea
                        id="suspend-reason"
                        variant="form"
                        required
                        maxlength={SUSPEND_REASON_MAX_LENGTH}
                        bind:value={suspendReason}
                    />

                    <label class="text-sm text-muted" for="suspend-until">
                        Fim da suspensão, vazio para permanente
                    </label>
                    <Input id="suspend-until" type="datetime-local" bind:value={suspendUntil} />

                    <div class="flex flex-wrap gap-2">
                        <Button size="sm" variant="danger" type="submit" disabled={busy}>
                            confirmar suspensão
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onclick={() => (suspending = false)}
                        >
                            cancelar
                        </Button>
                    </div>
                </form>
            {:else}
                <div>
                    <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onclick={() => (suspending = true)}
                    >
                        suspender conta
                    </Button>
                </div>
            {/if}
        </div>
    {/if}

    <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">
            Últimos recados escritos
        </h2>

        {#if report.recent_scraps.length === 0}
            <p class="text-sm text-muted">Nenhum recado.</p>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each report.recent_scraps as scrap (scrap.id)}
                    <li class="rounded-theme border border-line p-2 text-sm">
                        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>
                                no mural de
                                <a
                                    href="/@{scrap.wall_slug}"
                                    class="text-primary underline underline-offset-2"
                                >
                                    @{scrap.wall_slug}
                                </a>
                            </span>
                            <span>{formatDateTime(scrap.created_at)}</span>
                            {#if scrap.is_reply}<span>resposta</span>{/if}
                            {#if scrap.is_deleted}
                                <span class="rounded-theme bg-danger px-1.5 py-0.5 text-on-danger">
                                    apagado pelo autor
                                </span>
                            {/if}
                        </div>
                        <p
                            class="break-words whitespace-pre-wrap text-content {scrap.is_deleted
                                ? 'line-through opacity-70'
                                : ''}"
                        >
                            {scrap.body}
                        </p>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">
            Últimos depoimentos escritos
        </h2>

        {#if report.recent_testimonials.length === 0}
            <p class="text-sm text-muted">Nenhum depoimento.</p>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each report.recent_testimonials as testimonial (testimonial.id)}
                    <li class="rounded-theme border border-line p-2 text-sm">
                        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>
                                para
                                <a
                                    href="/@{testimonial.profile_slug}"
                                    class="text-primary underline underline-offset-2"
                                >
                                    @{testimonial.profile_slug}
                                </a>
                            </span>
                            <span>{testimonial.status}</span>
                            {#if testimonial.is_deleted}
                                <span class="rounded-theme bg-danger px-1.5 py-0.5 text-on-danger">
                                    apagado pelo autor
                                </span>
                            {/if}
                        </div>
                        <p
                            class="break-words whitespace-pre-wrap text-content {testimonial.is_deleted
                                ? 'line-through opacity-70'
                                : ''}"
                        >
                            {testimonial.body}
                        </p>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">
            Outras denúncias contra a mesma conta
        </h2>

        {#if report.other_reports.length === 0}
            <p class="text-sm text-muted">Nenhuma.</p>
        {:else}
            <ul class="flex flex-col gap-1 text-sm">
                {#each report.other_reports as other (other.id)}
                    <li>
                        <a
                            href="/admin/reports/{other.id}"
                            class="text-primary underline underline-offset-2"
                        >
                            {reportReasonLabel(other.reason)}
                        </a>
                        <span class="text-xs text-muted">
                            {reportStatusLabel(other.status)}, por @{other.reporter_slug},
                            {formatDateTime(other.created_at)}
                        </span>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</main>

<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { accountStatusLabel } from "#lib/moderation";
    import {
        REPORT_KINDS,
        REPORT_STATUSES,
        fetchReports,
        reportKindLabel,
        reportReasonLabel,
        reportStatusLabel,
    } from "#lib/report";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { ReportListItem } from "#lib/types";

    let { data } = $props();

    let reports = $derived(data.reports);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchReports(data.status, data.kind, nextCursor);
            reports = [...reports, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    /** Monta a query preservando o outro filtro. */
    function queueHref(params: { status?: string; kind?: string }): string {
        const status = params.status ?? data.status ?? "all";
        const kind = params.kind ?? data.kind ?? "all";
        return `/admin/reports?status=${status}&kind=${kind}`;
    }

    /** O texto do conteúdo denunciado: corpo quando existe, senão o título. */
    function targetPreview(report: ReportListItem): string | null {
        return report.target.excerpt ?? report.target.title;
    }
</script>

<svelte:head><title>Denúncias | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Denúncias</h1>

    <div class="flex flex-wrap gap-2">
        {#each REPORT_STATUSES as item}
            <TabPill href={queueHref({ status: item.value })} active={data.status === item.value}>
                {item.label}
            </TabPill>
        {/each}
        <TabPill href={queueHref({ status: "all" })} active={data.status === null}>todas</TabPill>
    </div>

    <div class="flex flex-wrap gap-2">
        <TabPill href={queueHref({ kind: "all" })} active={data.kind === null}>tudo</TabPill>
        {#each REPORT_KINDS as item}
            <TabPill href={queueHref({ kind: item.value })} active={data.kind === item.value}>
                {item.label}
            </TabPill>
        {/each}
    </div>

    {#if reports.length === 0}
        <EmptyState>Nenhuma denúncia nesse filtro.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each reports as report (report.id)}
                <li class="rounded-theme border border-line bg-surface p-3">
                    <a href="/admin/reports/{report.id}" class="flex flex-col gap-2">
                        <div class="flex items-center gap-3">
                            <Avatar
                                src={report.accountable?.profile.avatar_url ?? null}
                                name={report.accountable?.profile.name ??
                                    report.target.title ??
                                    "?"}
                                class="size-12 shrink-0"
                            />

                            <div class="min-w-0 flex-1">
                                <span class="block truncate font-medium text-content">
                                    {report.accountable?.profile.name ??
                                        report.target.title ??
                                        "conteúdo denunciado"}
                                </span>
                                <span class="block truncate text-xs text-muted">
                                    {reportKindLabel(report.target.kind)} · {reportReasonLabel(
                                        report.reason,
                                    )} · por {report.reporter.name}
                                </span>
                                <span class="block text-xs text-muted">
                                    {formatDateTime(report.created_at)}
                                </span>
                            </div>

                            <span class="shrink-0 text-xs text-muted">
                                {reportStatusLabel(report.status)}
                            </span>
                        </div>

                        {#if targetPreview(report)}
                            <p class="line-clamp-2 text-sm text-content">
                                {targetPreview(report)}
                            </p>
                        {/if}

                        <div class="flex flex-wrap gap-1.5 text-xs">
                            {#if report.target.is_deleted}
                                <span class="rounded-theme bg-danger px-1.5 py-0.5 text-on-danger">
                                    fora do ar
                                </span>
                            {/if}
                            {#if report.accountable && report.accountable.account_status !== "active"}
                                <span class="rounded-theme bg-danger px-1.5 py-0.5 text-on-danger">
                                    {accountStatusLabel(report.accountable.account_status)}
                                </span>
                            {/if}
                            {#if report.accountable}
                                <span
                                    class="rounded-theme border border-line px-1.5 py-0.5 text-muted"
                                >
                                    {report.accountable.profile_reports_count} denúncias na conta
                                </span>
                                <span
                                    class="rounded-theme border border-line px-1.5 py-0.5 text-muted"
                                >
                                    bloqueado por {report.accountable.blocked_by_count}
                                </span>
                            {/if}
                        </div>
                    </a>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

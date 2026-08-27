<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import {
        REPORT_STATUSES,
        fetchReports,
        reportReasonLabel,
        reportStatusLabel,
    } from "#lib/report";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let reports = $derived(data.reports);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchReports(data.status, nextCursor);
            reports = [...reports, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Denúncias | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Denúncias</h1>

    <div class="flex flex-wrap gap-2">
        {#each REPORT_STATUSES as item}
            <TabPill href="/admin/reports?status={item.value}" active={data.status === item.value}>
                {item.label}
            </TabPill>
        {/each}
        <TabPill href="/admin/reports?status=all" active={data.status === null}>todas</TabPill>
    </div>

    {#if reports.length === 0}
        <EmptyState>Nenhuma denúncia nesse status.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each reports as report (report.id)}
                <li class="rounded-theme border border-line bg-surface p-3">
                    <a href="/admin/reports/{report.id}" class="flex items-center gap-3">
                        <Avatar
                            src={report.reported?.avatar_url ?? null}
                            name={report.reported?.name ?? "?"}
                            class="size-12 shrink-0"
                        />

                        <div class="min-w-0 flex-1">
                            <span class="block truncate font-medium text-content">
                                {report.reported?.name}
                            </span>
                            <span class="block truncate text-xs text-muted">
                                {reportReasonLabel(report.reason)}, denunciado por
                                {report.reporter.name}
                            </span>
                            <span class="block text-xs text-muted">
                                {formatDateTime(report.created_at)}
                            </span>
                        </div>

                        <span class="shrink-0 text-xs text-muted">
                            {reportStatusLabel(report.status)}
                        </span>
                    </a>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

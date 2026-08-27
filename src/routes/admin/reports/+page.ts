import { fetchReports } from "#lib/report";
import type { ReportStatus } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

/** Ausente significa a caixa padrão, "abertas". O literal "all" é o único jeito de ver todas. */
function readStatus(value: string | null): ReportStatus | null {
    if (value === null) return "open";
    return STATUSES.find((status) => status === value) ?? null;
}

export async function load({ fetch, url }: PageLoadEvent) {
    const status = readStatus(url.searchParams.get("status"));
    const page = await fetchReports(status, null, undefined, fetch);
    return { status, reports: page.results, nextCursor: page.next_cursor };
}

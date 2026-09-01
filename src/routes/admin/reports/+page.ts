import { REPORT_KINDS, fetchReports } from "#lib/report";
import type { ReportKind, ReportStatus } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];
// Sai da mesma lista que desenha os filtros na tela: separar as duas já deixou
// os tipos novos aparecendo como pill e caindo fora do filtro.
const KINDS: ReportKind[] = REPORT_KINDS.map((item) => item.value);

/** Ausente significa a caixa padrão, "abertas". O literal "all" é o único jeito de ver todas. */
function readStatus(value: string | null): ReportStatus | null {
    if (value === null) return "open";
    return STATUSES.find((status) => status === value) ?? null;
}

/** Sem filtro de tipo por padrão. "all" e valor inválido caem no mesmo lugar: todos. */
function readKind(value: string | null): ReportKind | null {
    return KINDS.find((kind) => kind === value) ?? null;
}

export async function load({ fetch, url }: PageLoadEvent) {
    const status = readStatus(url.searchParams.get("status"));
    const kind = readKind(url.searchParams.get("kind"));
    const page = await fetchReports(status, kind, null, undefined, fetch);
    return { status, kind, reports: page.results, nextCursor: page.next_cursor };
}

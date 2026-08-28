import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    ReportCreated,
    ReportDetail,
    ReportKind,
    ReportListItem,
    ReportReason,
    ReportRequest,
    ReportStatus,
} from "./types";

export const REPORT_DETAILS_MAX_LENGTH = 2000;
export const REMOVE_REASON_MAX_LENGTH = 500;
const REPORT_PAGE_SIZE = 20;

/** O valor vai para a API em inglês, o rótulo é só para a interface. */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: "spam", label: "Spam ou propaganda" },
    { value: "harassment", label: "Assédio ou perseguição" },
    { value: "hate_speech", label: "Discurso de ódio" },
    { value: "nudity", label: "Nudez ou conteúdo sexual" },
    { value: "impersonation", label: "Fingir ser outra pessoa" },
    { value: "other", label: "Outro motivo" },
];

export const REPORT_STATUSES: { value: ReportStatus; label: string }[] = [
    { value: "open", label: "abertas" },
    { value: "reviewing", label: "em análise" },
    { value: "resolved", label: "procedentes" },
    { value: "dismissed", label: "improcedentes" },
];

/** Rótulo curto do tipo de alvo, para os filtros e os cards da fila. */
export const REPORT_KINDS: { value: ReportKind; label: string }[] = [
    { value: "profile", label: "perfil" },
    { value: "scrap", label: "recado" },
    { value: "testimonial", label: "depoimento" },
    { value: "community", label: "comunidade" },
    { value: "topic", label: "tópico" },
    { value: "comment", label: "comentário" },
    { value: "poll", label: "enquete" },
];

export function reportReasonLabel(reason: ReportReason): string {
    return REPORT_REASONS.find((item) => item.value === reason)?.label ?? reason;
}

export function reportStatusLabel(status: ReportStatus): string {
    return REPORT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function reportKindLabel(kind: ReportKind): string {
    return REPORT_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

/**
 * Denuncia qualquer um dos sete alvos. `reference` é o slug para `profile` e
 * `community`, o uuid do conteúdo para os demais. Só denúncia de perfil responde
 * 409 (uma por pessoa); conteúdo pode ser denunciado quantas vezes for.
 */
export function submitReport(
    kind: ReportKind,
    reference: string,
    payload: ReportRequest,
    fetchFn: typeof fetch = fetch,
): Promise<ReportCreated> {
    return apiFetch
        .post<ApiResponse<ReportCreated>>(
            `/api/v1/report/${kind}/${encodeURIComponent(reference)}`,
            payload,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function fetchReports(
    status: ReportStatus | null = null,
    kind: ReportKind | null = null,
    cursor: string | null = null,
    limit: number = REPORT_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ReportListItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ReportListItem>>(
        "/api/v1/admin/report",
        { query: { status, kind, limit, cursor } },
        fetchFn,
    );
}

export function fetchReport(id: string, fetchFn: typeof fetch = fetch): Promise<ReportDetail> {
    return apiFetch
        .get<ApiResponse<ReportDetail>>(`/api/v1/admin/report/${id}`, {}, fetchFn)
        .then((res) => res.results);
}

/** Idempotente e sem ordem: resolver pode vir sem passar por em análise. */
export function setReportReviewing(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/admin/report/${id}/reviewing`, undefined, {}, fetchFn);
}

export function resolveReport(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/admin/report/${id}/resolve`, undefined, {}, fetchFn);
}

export function dismissReport(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/admin/report/${id}/dismiss`, undefined, {}, fetchFn);
}

/**
 * Numa transação: tira o conteúdo do ar (soft delete), grava o histórico e
 * encerra a denúncia como procedente. `400` em denúncia de perfil, `409` quando
 * o conteúdo já estava fora do ar.
 */
export function removeReportContent(
    id: string,
    reason: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    const body = reason.trim() === "" ? {} : { reason: reason.trim() };
    return apiFetch.post<void>(`/api/v1/admin/report/${id}/remove`, body, {}, fetchFn);
}

import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    ReportCreated,
    ReportDetail,
    ReportListItem,
    ReportReason,
    ReportRequest,
    ReportStatus,
} from "./types";

export const REPORT_DETAILS_MAX_LENGTH = 2000;
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

export function reportReasonLabel(reason: ReportReason): string {
    return REPORT_REASONS.find((item) => item.value === reason)?.label ?? reason;
}

export function reportStatusLabel(status: ReportStatus): string {
    return REPORT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

/** Uma denúncia por perfil por pessoa, a segunda tentativa responde 409. */
export function reportProfile(
    slug: string,
    payload: ReportRequest,
    fetchFn: typeof fetch = fetch,
): Promise<ReportCreated> {
    return apiFetch
        .post<ApiResponse<ReportCreated>>(
            `/api/v1/report/${encodeURIComponent(slug)}`,
            payload,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function fetchReports(
    status: ReportStatus | null = null,
    cursor: string | null = null,
    limit: number = REPORT_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ReportListItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ReportListItem>>(
        "/api/v1/admin/report",
        { query: { status, limit, cursor } },
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

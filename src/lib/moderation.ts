import { apiFetch } from "./api";
import type {
    AccountStatus,
    ApiCursorPaginatedResponse,
    ModerationActionKind,
    ModerationHistoryItem,
    ReportContentKind,
    SuspendRequest,
} from "./types";

export const SUSPEND_REASON_MAX_LENGTH = 500;
const HISTORY_PAGE_SIZE = 20;

const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
    { value: "active", label: "conta ativa" },
    { value: "suspended", label: "conta suspensa" },
    { value: "deactivated", label: "conta desativada" },
];

const MODERATION_ACTIONS: { value: ModerationActionKind; label: string }[] = [
    { value: "content_removed", label: "conteúdo removido" },
    { value: "content_restored", label: "conteúdo restaurado" },
    { value: "user_suspended", label: "conta suspensa" },
    { value: "user_unsuspended", label: "suspensão revogada" },
];

export function accountStatusLabel(status: AccountStatus): string {
    return ACCOUNT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function moderationActionLabel(action: ModerationActionKind): string {
    return MODERATION_ACTIONS.find((item) => item.value === action)?.label ?? action;
}

/** Derruba toda sessão aberta da conta, para a suspensão valer na hora. */
export function suspendUser(
    slug: string,
    payload: SuspendRequest,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.post<void>(
        `/api/v1/admin/user/${encodeURIComponent(slug)}/suspend`,
        payload,
        {},
        fetchFn,
    );
}

export function unsuspendUser(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(
        `/api/v1/admin/user/${encodeURIComponent(slug)}/suspend`,
        {},
        fetchFn,
    );
}

/**
 * Devolve um conteúdo ao ar. `404` quando ele já está no ar ou quando quem
 * apagou foi o próprio autor: a moderação só desfaz o que ela mesma fez.
 */
export function restoreContent(
    kind: ReportContentKind,
    id: string,
    reason: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    const body = reason.trim() === "" ? {} : { reason: reason.trim() };
    // O enum usa `_`, a rota usa `-`.
    const segment = kind === "media_comment" ? "media-comment" : kind;
    return apiFetch.post<void>(`/api/v1/admin/content/${segment}/${id}/restore`, body, {}, fetchFn);
}

/** Ações de moderação sobre uma conta, da mais nova para a mais antiga. */
export function fetchAccountHistory(
    slug: string,
    cursor: string | null = null,
    limit: number = HISTORY_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ModerationHistoryItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ModerationHistoryItem>>(
        `/api/v1/admin/user/${encodeURIComponent(slug)}/history`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

import { apiFetch } from "./api";
import type { AccountStatus, SuspendRequest } from "./types";

export const SUSPEND_REASON_MAX_LENGTH = 500;

const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
    { value: "active", label: "conta ativa" },
    { value: "suspended", label: "conta suspensa" },
    { value: "deactivated", label: "conta desativada" },
];

export function accountStatusLabel(status: AccountStatus): string {
    return ACCOUNT_STATUSES.find((item) => item.value === status)?.label ?? status;
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

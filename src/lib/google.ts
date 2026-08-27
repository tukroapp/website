import { suspensionMessage } from "#lib/state/suspension.svelte";
import type { Suspension } from "#lib/types";

const GOOGLE_GENERIC_ERROR = "Não foi possível entrar com o Google. Tente novamente.";

export interface GoogleLoginFailure {
    message: string;
    suspension: Suspension | null;
}

/**
 * O callback do OAuth é um redirect, não uma resposta JSON, então a falha só chega no
 * front como query param. `error=account_suspended` traz `until` (ausente significa
 * permanente) e `reason`; qualquer outro valor é `login_failed`.
 */
export function googleLoginFailure(
    error: string | null | undefined,
    until: string | null | undefined,
    reason: string | null | undefined,
): GoogleLoginFailure {
    if (error !== "account_suspended") {
        return { message: GOOGLE_GENERIC_ERROR, suspension: null };
    }

    const suspension: Suspension = { until: until ?? null, reason: reason ?? null };
    return { message: suspensionMessage(suspension), suspension };
}

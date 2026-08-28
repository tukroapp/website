import { toast } from "svelte-sonner";
import { ApiError, GENERIC_ERROR_MESSAGE, toApiError } from "./error";
import { isEmailNotVerified, resendVerificationEmail } from "./verification";

/** Mostra cada mensagem de uma requisição que falhou como toast e devolve o erro para quem quiser tratar. */
export function toastApiError(error: unknown): ApiError {
    const apiError = toApiError(error);

    // Gate de e-mail: em vez do erro cru, o convite a confirmar com o botão de reenviar.
    if (isEmailNotVerified(apiError)) {
        toast.error("Confirme seu e-mail para fazer isso.", {
            action: { label: "reenviar", onClick: () => void resendVerificationEmail() },
        });
        return apiError;
    }

    const messages = apiError.allMessages();

    if (messages.length === 0) {
        toast.error(GENERIC_ERROR_MESSAGE);
        return apiError;
    }

    for (const message of messages) toast.error(message);
    return apiError;
}

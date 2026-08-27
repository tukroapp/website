import { toast } from "svelte-sonner";
import { ApiError, GENERIC_ERROR_MESSAGE, toApiError } from "./error";

/** Mostra cada mensagem de uma requisição que falhou como toast e devolve o erro para quem quiser tratar. */
export function toastApiError(error: unknown): ApiError {
    const apiError = toApiError(error);
    const messages = apiError.allMessages();

    if (messages.length === 0) {
        toast.error(GENERIC_ERROR_MESSAGE);
        return apiError;
    }

    for (const message of messages) toast.error(message);
    return apiError;
}

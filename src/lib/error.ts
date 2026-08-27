import type { ApiErrorBody, ApiErrorNode, ApiValidationError } from "./types/error";

export const NON_FIELD = "non_field";
const GENERIC_ERROR_CODE = "unknown";
export const GENERIC_ERROR_MESSAGE = "Ocorreu um erro inesperado. Tente novamente mais tarde.";

/**
 * Texto para os códigos que o backend pode responder sem mensagem própria, como o
 * `length` do validator. Sem isso a tela cai no erro genérico e a pessoa não descobre
 * o que precisa corrigir.
 */
const CODE_MESSAGES: Record<string, string> = {
    length: "O texto está fora do tamanho permitido.",
    empty_or_whitespace: "O texto não pode ficar vazio.",
    required: "Preencha este campo.",
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
    if (typeof value !== "object" || value === null || !("error" in value)) return false;

    const error = (value as { error: unknown }).error;
    return typeof error === "object" && error !== null && !Array.isArray(error);
}

function normalizeApiError(payload: unknown, fallback = GENERIC_ERROR_MESSAGE): ApiErrorBody {
    if (isApiErrorBody(payload)) return payload;

    return {
        error: {
            [NON_FIELD]: [{ code: GENERIC_ERROR_CODE, message: fallback, params: {} }],
        },
    };
}

export class ApiError extends Error {
    readonly status: number;
    /** Payload cru da resposta, guardado para log e depuração. */
    readonly payload: unknown;
    readonly body: ApiErrorBody;

    constructor(status: number, payload: unknown, message?: string) {
        super(message ?? `A requisição falhou com o status ${status}`);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
        this.body = normalizeApiError(payload, message ?? GENERIC_ERROR_MESSAGE);
    }

    /** Erros de um campo, como "email", ou de "non_field" para a requisição inteira. */
    errorsAt(field: string): ApiValidationError[] {
        const node = this.body.error[field];
        return Array.isArray(node) ? node : [];
    }

    /** Mensagens de um campo, pulando os erros que o backend mandou sem texto. */
    messagesAt(field: string): string[] {
        const messages = this.errorsAt(field).map((error) => error.message);
        return messages.filter((message) => message !== null);
    }

    firstMessageAt(field: string): string | null {
        return this.messagesAt(field).at(0) ?? null;
    }

    /** Mensagens só dos campos de primeiro nível, prontas para ligar nos inputs do formulário. */
    fieldMessages(): Record<string, string[]> {
        const messages: Record<string, string[]> = {};
        for (const field of Object.keys(this.body.error)) {
            const fieldMessages = this.messagesAt(field);
            if (fieldMessages.length > 0) messages[field] = fieldMessages;
        }
        return messages;
    }

    /** Todas as mensagens da resposta, prontas para mostrar, com os códigos preenchidos. */
    allMessages(): string[] {
        const messages: string[] = [];

        // O backend aninha os erros de uma lista ou de um objeto um nível mais fundo.
        function collect(node: ApiErrorNode) {
            if (Array.isArray(node)) {
                for (const error of node) {
                    messages.push(
                        error.message ?? CODE_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE,
                    );
                }
                return;
            }

            for (const child of Object.values(node)) collect(child);
        }

        collect(this.body.error);
        return [...new Set(messages)];
    }
}

/** Transforma qualquer coisa lançada pelo `apiFetch` (ou pelo código ao redor) em `ApiError`. */
export function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    return new ApiError(0, null, GENERIC_ERROR_MESSAGE);
}

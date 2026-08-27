export interface ApiResponse<T> {
    results: T;
}

export interface ApiCursorPaginatedResponse<T> {
    results: T[];
    next_cursor: string | null;
}

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
    body?: unknown;
    query?: QueryParams;
    /** Passe false nos fluxos deslogados que não podem mandar o token guardado. */
    auth?: boolean;
    /** Milissegundos até a requisição ser abortada. Passe 0 para desligar. */
    timeout?: number;
};

export interface HealthCheckResponse {
    status: string;
}

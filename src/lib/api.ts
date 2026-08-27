import { PUBLIC_API_BASE_URL } from "$app/env/public";
import { ApiError } from "./error";
import { getToken } from "./token";
import type { ApiFetchOptions, QueryParams } from "./types/api";

const DEFAULT_TIMEOUT_MS = 30_000;

function isRawBody(body: unknown): body is BodyInit {
    return (
        typeof body === "string" ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        body instanceof ArrayBuffer ||
        ArrayBuffer.isView(body) ||
        body instanceof ReadableStream
    );
}

function buildUrl(path: string, query?: QueryParams): string {
    const url = `${PUBLIC_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return url;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
            for (const item of value) params.append(key, String(item));
        } else {
            params.append(key, String(value));
        }
    }

    const search = params.toString();
    return search ? `${url}?${search}` : url;
}

function parsePayload(text: string, contentType: string | null): unknown {
    if (text === "") return null;
    if (!(contentType ?? "").includes("application/json")) return text;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function request<T>(
    path: string,
    options: ApiFetchOptions,
    fetchFn: typeof fetch = fetch,
): Promise<T> {
    const { body, query, auth = true, timeout = DEFAULT_TIMEOUT_MS, ...rest } = options;
    const headers = new Headers(rest.headers);
    headers.set("Accept", "application/json");

    const token = auth ? getToken() : null;
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Token ${token}`);
    }

    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
        if (isRawBody(body)) {
            requestBody = body;
        } else {
            requestBody = JSON.stringify(body);
            if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        }
    }

    // Uma requisição é abortada por quem chamou ou pelo tempo limite.
    const signals: AbortSignal[] = [];
    if (rest.signal) signals.push(rest.signal);
    if (timeout > 0) signals.push(AbortSignal.timeout(timeout));

    let response: Response;
    try {
        response = await fetchFn(buildUrl(path, query), {
            ...rest,
            credentials: "include",
            headers,
            body: requestBody,
            signal: signals.length > 0 ? AbortSignal.any(signals) : null,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (error instanceof DOMException && error.name === "TimeoutError") {
            throw new ApiError(0, null, "A requisição demorou demais e foi cancelada");
        }
        throw new ApiError(0, null, "Não foi possível conectar ao servidor");
    }

    const payload = parsePayload(await response.text(), response.headers.get("content-type"));
    if (!response.ok) throw new ApiError(response.status, payload);

    return payload as T;
}

export const apiFetch = {
    get<T>(path: string, options: ApiFetchOptions = {}, fetchFn?: typeof fetch) {
        return request<T>(path, { ...options, method: "GET" }, fetchFn);
    },

    post<T>(path: string, body?: unknown, options: ApiFetchOptions = {}, fetchFn?: typeof fetch) {
        return request<T>(path, { ...options, method: "POST", body }, fetchFn);
    },

    put<T>(path: string, body?: unknown, options: ApiFetchOptions = {}, fetchFn?: typeof fetch) {
        return request<T>(path, { ...options, method: "PUT", body }, fetchFn);
    },

    patch<T>(path: string, body?: unknown, options: ApiFetchOptions = {}, fetchFn?: typeof fetch) {
        return request<T>(path, { ...options, method: "PATCH", body }, fetchFn);
    },

    delete<T>(path: string, options: ApiFetchOptions = {}, fetchFn?: typeof fetch) {
        return request<T>(path, { ...options, method: "DELETE" }, fetchFn);
    },
};

/**
 * Upload multipart com progresso, coisa que o `fetch` não sabe informar. Mesma URL base,
 * mesmo token e mesmo `ApiError` do `apiFetch`, só o transporte muda.
 */
export function apiUpload<T>(
    path: string,
    body: FormData,
    onProgress?: (ratio: number) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", buildUrl(path));
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/json");

        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Token ${token}`);

        // Content-Type fica intocado: o navegador escreve o boundary do multipart.
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        };

        xhr.onload = () => {
            const payload = parsePayload(xhr.responseText, xhr.getResponseHeader("content-type"));

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(payload as T);
            } else {
                reject(new ApiError(xhr.status, payload));
            }
        };

        xhr.onerror = () => reject(new ApiError(0, null, "Não foi possível conectar ao servidor"));
        xhr.ontimeout = () =>
            reject(new ApiError(0, null, "A requisição demorou demais e foi cancelada"));

        xhr.send(body);
    });
}

export const NEXT_PARAM = "next";

/** Só caminhos absolutos da mesma origem passam, para `next` não mandar a pessoa para outro site. */
export function safeRedirectPath(path: string | null | undefined, fallback = "/"): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
    return path;
}

export function loginUrl(next: string): string {
    return `/login?${NEXT_PARAM}=${encodeURIComponent(next)}`;
}

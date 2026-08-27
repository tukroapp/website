/** Cookie que o backend escreve no callback do OAuth, legível por JS de propósito. */
export const SESSION_COOKIE = "sessionid";

export function readCookie(name: string): string | null {
    const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function deleteCookie(name: string): void {
    document.cookie = `${name}=; path=/; max-age=0`;
}

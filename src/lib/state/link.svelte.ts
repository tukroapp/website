/**
 * Endereço que quem lê clicou dentro de um texto escrito por outra pessoa. Nada navega
 * até a pessoa confirmar: um link num mural ou no fórum pode levar a qualquer lugar.
 */
let pending = $state<string | null>(null);

export function getPendingLink(): string | null {
    return pending;
}

export function askLink(url: string): void {
    pending = url;
}

export function clearPendingLink(): void {
    pending = null;
}

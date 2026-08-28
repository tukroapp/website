/**
 * Os contadores do `/me/unread` param em 100 no backend (a consulta é pollada a
 * cada 30s e não pode crescer junto da caixa). Quando chega a 100, o número não
 * é exato, então mostra "99+" em vez do valor cru.
 */
export function unreadBadge(count: number): string {
    return count >= 100 ? "99+" : String(count);
}

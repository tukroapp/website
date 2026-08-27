function amountLabel(amount: number, singular: string, plural: string): string {
    return `há ${amount} ${amount === 1 ? singular : plural}`;
}

/** Distância até agora para uma data de feed: recados, notificações, pedidos. */
export function relativeTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return amountLabel(seconds, "segundo", "segundos");

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return amountLabel(minutes, "minuto", "minutos");

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return amountLabel(hours, "hora", "horas");

    const days = Math.floor(hours / 24);
    if (days < 30) return amountLabel(days, "dia", "dias");

    return new Date(value).toLocaleDateString("pt-BR");
}

/** Idade de algo antigo, como um perfil ou uma entrada em comunidade. Meses de 30 dias, anos de 365. */
export function timeSince(value: string): string {
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (days < 1) return "há menos de 1 dia";
    if (days < 30) return amountLabel(days, "dia", "dias");

    const months = Math.floor(days / 30);
    if (months < 12) return amountLabel(months, "mês", "meses");

    const years = Math.floor(days / 365);
    return amountLabel(years, "ano", "anos");
}

/** Data e hora de um evento, como "27/08/2026 14:32". */
export function formatDateTime(value: string): string {
    return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Data por extenso, como "27 de agosto de 2026". */
export function formatDate(value: string): string {
    return new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

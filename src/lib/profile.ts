import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    BirthdayResponse,
    ProfileResponse,
    ProfileSearchResult,
    RelationshipStatus,
} from "./types";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 20;

/** Limite de itens por lista do perfil: idiomas aceita menos que as outras. */
export const LIST_ITEM_MAX_LENGTH = 80;
export const LANGUAGES_MAX_ITEMS = 20;
export const LIST_MAX_ITEMS = 30;

/** Valores do enum de estado civil com o rótulo em pt-BR para o select fechado. */
export const RELATIONSHIP_STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
    { value: "single", label: "Solteiro(a)" },
    { value: "dating", label: "Namorando" },
    { value: "engaged", label: "Noivo(a)" },
    { value: "married", label: "Casado(a)" },
    { value: "stable_union", label: "União estável" },
    { value: "open_relationship", label: "Relação aberta" },
    { value: "complicated", label: "É complicado" },
    { value: "separated", label: "Separado(a)" },
    { value: "widowed", label: "Viúvo(a)" },
];

export function relationshipStatusLabel(value: RelationshipStatus | null): string | null {
    return RELATIONSHIP_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

/**
 * Conta excluída e anonimizada: o slug vira `deleted-xxxx`, o nome "Usuário
 * excluído" e a página do perfil responde `404`. Serve para não linkar o autor
 * de um recado, depoimento ou comentário que sobreviveu à exclusão.
 */
export function isDeletedProfile(slug: string): boolean {
    return slug.startsWith("deleted-");
}

/** Anos completos, descontando o aniversário que ainda não chegou neste ano. */
export function ageFromBirthdate(birthdate: string): number {
    const [year, month, day] = birthdate.split("-").map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const hadBirthday =
        today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!hadBirthday) age -= 1;
    return age;
}

export function ageLabel(birthdate: string): string {
    const age = ageFromBirthdate(birthdate);
    return `${age} ${age === 1 ? "ano" : "anos"}`;
}

export function fetchProfile(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<ProfileResponse> {
    return apiFetch
        .get<ApiResponse<ProfileResponse>>(
            `/api/v1/profile/${encodeURIComponent(slug)}`,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/**
 * Aniversariantes do mês corrente entre os amigos, do dia 1 ao 31. O "hoje" é o do
 * navegador: manda-se o fuso IANA que o `Intl` reporta, e o backend devolve o dia certo.
 */
export function fetchBirthdays(fetchFn: typeof fetch = fetch): Promise<BirthdayResponse> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return apiFetch
        .get<ApiResponse<BirthdayResponse>>("/api/v1/me/birthday", { query: { tz } }, fetchFn)
        .then((res) => res.results);
}

export interface ProfileSearchFilters {
    q?: string;
    city?: string;
    min_age?: number;
    max_age?: number;
    interest?: string;
    cursor?: string | null;
    limit?: number;
}

export function searchProfiles(
    filters: ProfileSearchFilters,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSearchResult>> {
    const { limit = SEARCH_PAGE_SIZE, ...rest } = filters;
    // O buildUrl do api.ts ignora undefined e null, então filtro vazio não vira query.
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSearchResult>>(
        "/api/v1/profile",
        { query: { ...rest, limit } },
        fetchFn,
    );
}

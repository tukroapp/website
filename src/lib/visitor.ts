import { apiFetch } from "./api";
import type { ApiResponse, ProfileVisitorsResponse } from "./types";

/**
 * Só o próprio dono enxerga. O registro da visita acontece sozinho no `GET` de um perfil,
 * o front não precisa avisar nada.
 */
export function fetchProfileVisitors(
    fetchFn: typeof fetch = fetch,
): Promise<ProfileVisitorsResponse> {
    return apiFetch
        .get<ApiResponse<ProfileVisitorsResponse>>("/api/v1/me/visitor", {}, fetchFn)
        .then((res) => res.results);
}

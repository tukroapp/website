import { ApiError } from "#lib/error";
import { searchProfiles } from "#lib/profile";
import type { ProfileSearchFilters } from "#lib/profile";
import type { PageLoadEvent } from "./$types";

function readText(value: string | null): string | undefined {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? undefined : trimmed;
}

export async function load({ url, fetch }: PageLoadEvent) {
    const filters: ProfileSearchFilters = {
        q: readText(url.searchParams.get("q")),
        city: readText(url.searchParams.get("city")),
        interest: readText(url.searchParams.get("interest")),
    };

    try {
        const page = await searchProfiles(filters, fetch);
        return { filters, results: page.results, nextCursor: page.next_cursor, tooShort: false };
    } catch (error) {
        // `q` com menos de 2 caracteres: mostra o aviso em vez de quebrar a tela.
        if (error instanceof ApiError && error.errorsAt("q").at(0)?.code === "too_short") {
            return { filters, results: [], nextCursor: null, tooShort: true };
        }
        throw error;
    }
}

import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchReport } from "#lib/report";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    try {
        return { report: await fetchReport(params.id, fetch) };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Denúncia não encontrada");
        }
        throw err;
    }
}

<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import RichTextarea from "#lib/components/RichTextarea.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { isBlankBbcode } from "#lib/bbcode";
    import { ApiError } from "#lib/error";
    import { auth } from "#lib/state/user.svelte";
    import {
        TESTIMONIAL_MAX_LENGTH,
        acceptTestimonial,
        deleteTestimonial,
        fetchTestimonials,
        rejectTestimonial,
        updateTestimonial,
    } from "#lib/testimonial";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { Testimonial, TestimonialStatus } from "#lib/types";

    let { data } = $props();

    let testimonials = $derived(data.testimonials);
    let nextCursor = $derived(data.nextCursor);
    let editingId = $state<string | null>(null);
    let editingBody = $state("");
    let loading = $state(false);
    let busy = $state(false);

    const statusLabels: Record<TestimonialStatus, string> = {
        pending: "aguardando aprovação",
        accepted: "aceito",
        rejected: "recusado",
    };

    const statusTabs: { value: TestimonialStatus | null; label: string }[] = [
        { value: null, label: "todos" },
        { value: "pending", label: "aguardando" },
        { value: "accepted", label: "aceitos" },
        { value: "rejected", label: "recusados" },
    ];

    /** Mantém o outro filtro intocado quando só uma das duas pills muda. */
    function filterHref(direction: string, status: TestimonialStatus | null): string {
        const params = new URLSearchParams({ direction });
        if (status !== null) params.set("status", status);
        return `/testimonials?${params}`;
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchTestimonials(data.direction, data.status, nextCursor);
            testimonials = [...testimonials, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function respond(testimonial: Testimonial, accept: boolean) {
        busy = true;
        try {
            if (accept) {
                await acceptTestimonial(testimonial.id);
                toast.success("Depoimento aceito, já aparece no seu perfil");
            } else {
                await rejectTestimonial(testimonial.id);
                toast.success("Depoimento recusado");
            }
            await refreshAll();
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse depoimento não está mais aguardando resposta");
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    function startEditing(testimonial: Testimonial) {
        editingId = testimonial.id;
        editingBody = testimonial.body;
    }

    async function saveEditing(testimonial: Testimonial) {
        if (isBlankBbcode(editingBody)) return;

        busy = true;
        try {
            await updateTestimonial(testimonial.id, editingBody.trim());
            editingId = null;
            await refreshAll();
            toast.success("Depoimento editado, voltou para aprovação");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse depoimento não existe mais");
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function remove(testimonial: Testimonial) {
        busy = true;
        try {
            await deleteTestimonial(testimonial.id);
            testimonials = testimonials.filter((item) => item.id !== testimonial.id);
            // Apagar o depoimento apaga em cascata a notificação dele, então o contador muda.
            await auth.fetchUser();
            toast.success("Depoimento apagado");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>Depoimentos | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Depoimentos</h1>

    <div class="flex flex-wrap gap-2">
        <TabPill href={filterHref("received", data.status)} active={data.direction === "received"}>
            recebidos
        </TabPill>
        <TabPill href={filterHref("sent", data.status)} active={data.direction === "sent"}>
            que eu escrevi
        </TabPill>
    </div>

    <div class="flex flex-wrap gap-2">
        {#each statusTabs as tab}
            <TabPill
                href={filterHref(data.direction, tab.value)}
                active={data.status === tab.value}
            >
                {tab.label}
            </TabPill>
        {/each}
    </div>

    {#if data.direction === "received"}
        <p class="text-sm text-muted">
            Um depoimento só aparece no seu perfil depois que você aceita.
        </p>
    {:else}
        <p class="text-sm text-muted">
            Editar um depoimento que você escreveu volta ele para aprovação do dono do perfil.
        </p>
    {/if}

    {#if testimonials.length === 0}
        <EmptyState>Nenhum depoimento por aqui.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each testimonials as testimonial (testimonial.id)}
                <li class="flex gap-3 rounded-theme border border-line bg-surface p-3">
                    <a href="/@{testimonial.profile.slug}" class="shrink-0">
                        <Avatar
                            src={testimonial.profile.avatar_url}
                            name={testimonial.profile.name}
                            class="size-12"
                        />
                    </a>

                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <div class="flex flex-wrap items-baseline justify-between gap-2">
                            <a
                                href="/@{testimonial.profile.slug}"
                                class="font-bold text-primary underline underline-offset-2"
                            >
                                {data.direction === "received" ? "de" : "para"}
                                {testimonial.profile.name}
                            </a>
                            <span class="text-xs text-muted">
                                {formatDateTime(testimonial.created_at)}
                            </span>
                        </div>

                        <span class="w-fit text-xs text-muted">
                            {statusLabels[testimonial.status]}
                        </span>

                        {#if editingId === testimonial.id}
                            <RichTextarea
                                bind:value={editingBody}
                                rows={4}
                                maxlength={TESTIMONIAL_MAX_LENGTH}
                            />
                            <div class="flex gap-2">
                                <Button
                                    size="sm"
                                    disabled={busy || isBlankBbcode(editingBody)}
                                    onclick={() => saveEditing(testimonial)}
                                >
                                    salvar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onclick={() => (editingId = null)}
                                >
                                    cancelar
                                </Button>
                            </div>
                        {:else}
                            <RichText value={testimonial.body} class="text-sm text-content" />

                            <div class="flex flex-wrap items-center gap-2">
                                {#if data.direction === "received" && testimonial.status === "pending"}
                                    <Button
                                        size="sm"
                                        disabled={busy}
                                        onclick={() => respond(testimonial, true)}
                                    >
                                        aceitar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={busy}
                                        onclick={() => respond(testimonial, false)}
                                    >
                                        recusar
                                    </Button>
                                {/if}

                                {#if data.direction === "sent"}
                                    <button
                                        type="button"
                                        class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                        disabled={busy}
                                        onclick={() => startEditing(testimonial)}
                                    >
                                        editar
                                    </button>
                                {/if}

                                <button
                                    type="button"
                                    class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => remove(testimonial)}
                                >
                                    apagar
                                </button>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

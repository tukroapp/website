<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import AuthorLink from "#lib/components/AuthorLink.svelte";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ReportDialog from "#lib/components/ReportDialog.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import RichTextarea from "#lib/components/RichTextarea.svelte";
    import { isBlankBbcode } from "#lib/bbcode";
    import { ApiError } from "#lib/error";
    import { auth } from "#lib/state/user.svelte";
    import {
        TESTIMONIAL_MAX_LENGTH,
        createTestimonial,
        deleteTestimonial,
        fetchProfileTestimonials,
    } from "#lib/testimonial";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { Testimonial } from "#lib/types";

    let { data } = $props();

    let testimonials = $derived(data.testimonials);
    let nextCursor = $derived(data.nextCursor);
    let body = $state("");
    let writing = $state(false);
    let loading = $state(false);
    let busy = $state(false);

    let profile = $derived(data.profile);
    const firstName = $derived(profile.name.split(" ")[0]);
    const isOwner = $derived(auth.user?.slug === profile.slug);
    const remaining = $derived(TESTIMONIAL_MAX_LENGTH - body.length);

    // Depende do slug de propósito: trocar de perfil apaga o rascunho, que era para outra pessoa.
    $effect(() => {
        profile.slug;
        body = "";
        writing = false;
    });

    function canDelete(testimonial: Testimonial): boolean {
        return isOwner || auth.user?.id === testimonial.profile.id;
    }

    /** Não faz sentido denunciar o próprio depoimento nem sem estar logado. */
    function canReport(testimonial: Testimonial): boolean {
        return !!auth.user && auth.user.id !== testimonial.profile.id;
    }

    let reporting = $state(false);
    let reportRef = $state("");
    let reportName = $state("");

    function openReport(testimonial: Testimonial) {
        reportRef = testimonial.id;
        reportName = `o depoimento de ${testimonial.profile.name}`;
        reporting = true;
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchProfileTestimonials(profile.slug, nextCursor);
            testimonials = [...testimonials, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (isBlankBbcode(body)) return;

        busy = true;
        try {
            await createTestimonial(profile.slug, body.trim());
            body = "";
            writing = false;
            // Ele nasce aguardando aprovação, então ainda não aparece na lista pública.
            toast.success(`Depoimento enviado, aguardando a aprovação de ${firstName}`);
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function remove(testimonial: Testimonial) {
        busy = true;
        try {
            await deleteTestimonial(testimonial.id);
            testimonials = testimonials.filter((item) => item.id !== testimonial.id);
            // O contador do cabeçalho vem do load, então ele desce junto com a lista. Escrever
            // um depoimento não soma aqui: ele nasce pendente e só entra depois de aceito.
            profile = {
                ...profile,
                testimonials_count: Math.max(0, profile.testimonials_count - 1),
            };
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

<svelte:head><title>Depoimentos de {profile.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-bold text-content">
            Depoimentos de {profile.name} ({profile.testimonials_count})
        </h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if profile.can_write_testimonial}
        {#if writing}
            <form
                onsubmit={submit}
                class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3"
            >
                <RichTextarea
                    bind:value={body}
                    rows={5}
                    maxlength={TESTIMONIAL_MAX_LENGTH}
                    placeholder="Escreva um depoimento sobre {firstName}"
                />

                <p class="text-xs text-muted">
                    O depoimento só aparece no perfil depois que {firstName} aprovar.
                </p>

                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex gap-2">
                        <Button size="sm" type="submit" disabled={busy || isBlankBbcode(body)}>
                            enviar depoimento
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onclick={() => (writing = false)}
                        >
                            cancelar
                        </Button>
                    </div>
                    <span class="text-xs text-muted">{remaining} caracteres restantes</span>
                </div>
            </form>
        {:else}
            <div>
                <Button size="sm" onclick={() => (writing = true)}>escrever depoimento</Button>
            </div>
        {/if}
    {/if}

    {#if testimonials.length === 0}
        <EmptyState>{loading ? "Carregando..." : "Nenhum depoimento ainda."}</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each testimonials as testimonial (testimonial.id)}
                <li class="flex gap-3 rounded-theme border border-line bg-surface p-3">
                    <AuthorLink slug={testimonial.profile.slug} class="shrink-0">
                        <Avatar
                            src={testimonial.profile.avatar_url}
                            name={testimonial.profile.name}
                            class="size-12"
                        />
                    </AuthorLink>

                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <div class="flex flex-wrap items-baseline justify-between gap-2">
                            <AuthorLink
                                slug={testimonial.profile.slug}
                                class="font-bold text-primary underline underline-offset-2"
                            >
                                {testimonial.profile.name}
                            </AuthorLink>
                            <span class="text-xs text-muted">
                                {formatDateTime(testimonial.created_at)}
                            </span>
                        </div>

                        <RichText value={testimonial.body} class="text-sm text-content" />

                        <div class="flex flex-wrap gap-3">
                            {#if canDelete(testimonial)}
                                <button
                                    type="button"
                                    class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => remove(testimonial)}
                                >
                                    apagar
                                </button>
                            {/if}
                            {#if canReport(testimonial)}
                                <button
                                    type="button"
                                    class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                                    onclick={() => openReport(testimonial)}
                                >
                                    denunciar
                                </button>
                            {/if}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

<ReportDialog bind:open={reporting} kind="testimonial" reference={reportRef} name={reportName} />

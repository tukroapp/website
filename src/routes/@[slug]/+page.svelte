<script lang="ts">
    import { goto, refreshAll } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import RatingIcon from "#lib/components/RatingIcon.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import { blockProfile } from "#lib/block";
    import { ApiError, NON_FIELD, toApiError } from "#lib/error";
    import { becomeFan, stopBeingFan } from "#lib/fan";
    import {
        acceptFriendRequest,
        cancelFriendRequest,
        findReceivedRequestId,
        rejectFriendRequest,
        removeFriend,
        sendFriendRequest,
    } from "#lib/friend";
    import { RATING_AXES, RATING_MAX, deleteRating, rateProfile } from "#lib/rating";
    import { loginUrl } from "#lib/redirect";
    import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, reportProfile } from "#lib/report";
    import { auth } from "#lib/state/user.svelte";
    import { formatDate, relativeTime, timeSince } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { MyRating, RatingAxisKey, ReportReason } from "#lib/types";

    type Confirmation = "remove_friend" | "block";

    const EMPTY_RATING: MyRating = { trusty: 0, cool: 0, sexy: 0 };

    let { data } = $props();

    let profile = $derived(data.profile);
    let busy = $state(false);
    let confirming = $state<Confirmation | null>(null);
    let reporting = $state(false);
    let reportReason = $state<ReportReason>("spam");
    let reportDetails = $state("");
    /** Não existe endpoint para perguntar, então isto só lembra do que aconteceu aqui. */
    let reported = $state(false);
    let retryAfter = $state(0);

    let ratingForm = $state<MyRating>({ ...EMPTY_RATING });
    let savingRating = $state(false);
    let fanBusy = $state(false);

    // O formulário de avaliação e os avisos pertencem ao perfil aberto, e trocam junto com ele.
    $effect(() => {
        confirming = null;
        reporting = false;
        reported = false;
        ratingForm = { ...(data.profile.my_rating ?? EMPTY_RATING) };
    });

    const ratingChanged = $derived(
        RATING_AXES.some((axis) => ratingForm[axis.key] !== (profile.my_rating?.[axis.key] ?? 0)),
    );
    const ratingEmpty = $derived(RATING_AXES.every((axis) => ratingForm[axis.key] === 0));

    /** Clicar de novo no ícone preenchido zera o item, que é como se desfaz um voto. */
    function setAxis(key: RatingAxisKey, value: number) {
        ratingForm[key] = ratingForm[key] === value ? 0 : value;
    }

    async function saveRating() {
        savingRating = true;
        try {
            const rating = await rateProfile(profile.slug, ratingForm);
            profile = { ...profile, rating, my_rating: { ...ratingForm } };
            toast.success("Avaliação registrada");
        } catch (error) {
            toastApiError(error);
        } finally {
            savingRating = false;
        }
    }

    async function removeRating() {
        savingRating = true;
        try {
            const rating = await deleteRating(profile.slug);
            profile = { ...profile, rating, my_rating: null };
            ratingForm = { ...EMPTY_RATING };
            toast.success("Avaliação removida");
        } catch (error) {
            toastApiError(error);
        } finally {
            savingRating = false;
        }
    }

    async function toggleFan() {
        fanBusy = true;
        try {
            const status = profile.is_fan
                ? await stopBeingFan(profile.slug)
                : await becomeFan(profile.slug);
            profile = { ...profile, is_fan: status.is_fan, fans_count: status.fans_count };
        } catch (error) {
            const apiError = toApiError(error);
            if (apiError.status === 401) {
                await goto(loginUrl(page.url.pathname));
            } else if (apiError.status === 404) {
                toast.error("Este perfil não está mais disponível");
                await goto("/");
            } else {
                toastApiError(error);
            }
        } finally {
            fanBusy = false;
        }
    }

    const relationship = $derived(profile.relationship);
    const isOwner = $derived(relationship === "self");
    const firstName = $derived(profile.name.split(" ")[0]);

    const sections = $derived([
        { label: "perfil", href: `/@${profile.slug}`, count: undefined },
        { label: "recados", href: `/@${profile.slug}/scraps`, count: profile.scraps_count },
        {
            label: "fotos",
            href: `/@${profile.slug}/album?kind=photo`,
            count: data.media?.photo,
        },
        {
            label: "vídeos",
            href: `/@${profile.slug}/album?kind=video`,
            count: data.media?.video,
        },
        {
            label: "depoimentos",
            href: `/@${profile.slug}/testimonials`,
            count: profile.testimonials_count,
        },
    ]);

    /** A faixa de contadores abaixo do nome, na mesma ordem do menu da esquerda. */
    const counters = $derived([
        { label: "recados", value: profile.scraps_count?.toString() ?? "mural privado" },
        { label: "fotos", value: data.media?.photo.toString() ?? "álbum privado" },
        { label: "vídeos", value: data.media?.video.toString() ?? "álbum privado" },
        { label: "depoimentos", value: profile.testimonials_count.toString() },
        { label: "amigos", value: profile.friends_count?.toString() ?? "lista privada" },
        { label: "fãs", value: profile.fans_count.toString() },
    ]);

    const details = $derived([
        { label: "aniversário", value: formatBirthdate(profile.birthdate) },
        ...(profile.birthdate ? [{ label: "idade", value: ageLabel(profile.birthdate) }] : []),
        { label: "cidade natal", value: profile.city ?? "não informado" },
        {
            label: "no tukro desde",
            value: `${formatDate(profile.created_at)} (${timeSince(profile.created_at)})`,
        },
        { label: "quem sou eu", value: profile.bio ?? "não informado" },
    ]);

    /** Anos completos, descontando o aniversário que ainda não chegou neste ano. */
    function ageFrom(birthdate: string): number {
        const [year, month, day] = birthdate.split("-").map(Number);
        const today = new Date();
        let age = today.getFullYear() - year;
        const hadBirthday =
            today.getMonth() + 1 > month ||
            (today.getMonth() + 1 === month && today.getDate() >= day);
        if (!hadBirthday) age -= 1;
        return age;
    }

    function ageLabel(birthdate: string): string {
        const age = ageFrom(birthdate);
        return `${age} ${age === 1 ? "ano" : "anos"}`;
    }

    /**
     * A data de nascimento é um YYYY-MM-DD puro, então ela é montada no horário local.
     * Ler com `new Date(value)` pegaria a meia-noite UTC e mostraria o dia anterior.
     */
    function formatBirthdate(value: string | null): string {
        if (!value) return "não informado";
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }

    async function addFriend() {
        busy = true;
        try {
            const result = await sendFriendRequest(profile.slug);
            if (result.status === "accepted") {
                await refreshAll();
                toast.success("Vocês agora são amigos");
            } else {
                profile = { ...profile, relationship: "request_sent" };
                toast.success("Pedido de amizade enviado");
            }
        } catch (error) {
            const code =
                error instanceof ApiError && error.status === 409
                    ? (error.errorsAt("friend_request").at(0)?.code ?? null)
                    : null;

            if (code === "request_pending") {
                profile = { ...profile, relationship: "request_sent" };
            } else if (code === "already_friends") {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function respondToRequest(accept: boolean) {
        busy = true;
        try {
            const id = await findReceivedRequestId(profile.slug);
            if (id === null) {
                await refreshAll();
                return;
            }

            if (accept) {
                await acceptFriendRequest(id);
                await refreshAll();
                toast.success("Pedido aceito");
            } else {
                await rejectFriendRequest(id);
                profile = { ...profile, relationship: "none" };
                toast.success("Pedido recusado");
            }
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

    async function cancelRequest() {
        busy = true;
        try {
            await cancelFriendRequest(profile.slug);
            profile = { ...profile, relationship: "none" };
            toast.success("Pedido cancelado");
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

    async function confirmRemoveFriend() {
        busy = true;
        try {
            await removeFriend(profile.slug);
            // Desfazer a amizade apaga as avaliações dos dois lados, e a média
            // nova não dá para calcular aqui, então o perfil vem inteiro de novo.
            await refreshAll();
            toast.success("Amizade desfeita");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
            confirming = null;
        }
    }

    function openReport() {
        reporting = true;
        reportReason = "spam";
        reportDetails = "";
        retryAfter = 0;
    }

    async function submitReport(event: SubmitEvent) {
        event.preventDefault();
        // A regra do backend é só o motivo, mas "outro" sem texto não ajuda ninguém.
        if (reportReason === "other" && reportDetails.trim() === "") return;

        busy = true;
        try {
            const details = reportDetails.trim();
            await reportProfile(profile.slug, {
                reason: reportReason,
                ...(details === "" ? {} : { details }),
            });
            reported = true;
            reporting = false;
            toast.success("Denúncia enviada");
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                // Já ter denunciado é um estado, não uma falha.
                reported = true;
                reporting = false;
                toast.info("Você já denunciou este perfil");
            } else if (error instanceof ApiError && error.status === 429) {
                const seconds = error.errorsAt(NON_FIELD).at(0)?.params?.retry_after_seconds;
                retryAfter = typeof seconds === "number" ? seconds : 0;
                if (retryAfter > 0) setTimeout(() => (retryAfter = 0), retryAfter * 1000);
                toastApiError(error);
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function confirmBlock() {
        busy = true;
        try {
            await blockProfile(profile.slug);
            // Bloquear esconde as notificações causadas por aquela pessoa, contador incluído.
            await auth.fetchUser();
            toast.success("Perfil bloqueado");
            // O perfil responde 404 daqui em diante, então esta tela não pode continuar aberta.
            await goto("/");
        } catch (error) {
            toastApiError(error);
            busy = false;
            confirming = null;
        }
    }
</script>

<svelte:head><title>{profile.name} | Tukro</title></svelte:head>

{#snippet relationshipActions()}
    {#if relationship === "none"}
        <Button size="sm" disabled={busy} onclick={addFriend}>adicionar aos amigos</Button>
    {:else if relationship === "request_sent"}
        <Button size="sm" variant="outline" disabled={busy} onclick={cancelRequest}>
            pedido enviado, cancelar
        </Button>
    {:else if relationship === "request_received"}
        <Button size="sm" disabled={busy} onclick={() => respondToRequest(true)}>aceitar</Button>
        <Button size="sm" variant="outline" disabled={busy} onclick={() => respondToRequest(false)}>
            recusar
        </Button>
    {:else if relationship === "anonymous"}
        <a
            href={loginUrl(page.url.pathname)}
            class="text-sm text-primary underline underline-offset-2"
        >
            entre para adicionar
        </a>
    {:else if relationship === "friends"}
        <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onclick={() => (confirming = "remove_friend")}
        >
            desfazer amizade
        </Button>
    {/if}
{/snippet}

<main
    class="mx-auto grid w-full max-w-7xl gap-4 p-3 lg:grid-cols-[13rem_minmax(0,1fr)_15rem] lg:items-start"
>
    <aside class="flex flex-col gap-3">
        <div class="rounded-theme border border-line bg-surface p-3 text-center lg:text-start">
            <div class="mx-auto w-40 sm:w-48 lg:w-full">
                <Avatar
                    src={profile.avatar_url}
                    name={profile.name}
                    class="aspect-square w-full"
                    textClass="text-5xl"
                />
            </div>

            <h1 class="mt-2 text-base font-bold text-content">{profile.name}</h1>
            <p class="text-xs text-muted">@{profile.slug}</p>
            {#if profile.city}
                <p class="text-xs text-muted">{profile.city}</p>
            {/if}
            <a
                href="/@{profile.slug}/fans"
                class="mt-0.5 block text-xs text-primary underline underline-offset-2"
            >
                {profile.fans_count}
                {profile.fans_count === 1 ? "fã" : "fãs"}
            </a>

            <div class="mt-3 flex flex-col items-stretch gap-2">
                {#if isOwner}
                    <a
                        href="/settings"
                        class="text-sm text-primary underline underline-offset-2 lg:text-start"
                    >
                        editar perfil
                    </a>
                {:else}
                    {@render relationshipActions()}
                {/if}
                {#if profile.can_be_fan}
                    <Button
                        size="sm"
                        variant={profile.is_fan ? "outline" : "accent"}
                        disabled={fanBusy}
                        onclick={toggleFan}
                    >
                        {profile.is_fan ? "sou fã" : "tornar-se fã"}
                    </Button>
                {/if}
            </div>
        </div>

        <nav class="rounded-theme border border-line bg-surface">
            <ul class="flex flex-col text-sm">
                {#each sections as section}
                    <li
                        class="flex items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0"
                    >
                        {#if section.href}
                            <a
                                href={section.href}
                                class="text-primary underline underline-offset-2"
                            >
                                {section.label}
                            </a>
                        {:else}
                            <span class="text-muted">{section.label}</span>
                        {/if}
                        {#if section.count != null}
                            <span class="text-xs text-muted">{section.count}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </nav>

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
            {#if isOwner}
                <ul class="flex flex-col gap-1 text-sm text-primary">
                    <li>
                        <a href="/settings" class="underline underline-offset-2">editar perfil</a>
                    </li>
                    <li>
                        <a href="/friends/requests" class="underline underline-offset-2">
                            pedidos de amizade
                        </a>
                    </li>
                    <li>
                        <a href="/testimonials" class="underline underline-offset-2">
                            moderar depoimentos
                        </a>
                    </li>
                    <li>
                        <a href="/settings/blocks" class="underline underline-offset-2">
                            perfis bloqueados
                        </a>
                    </li>
                </ul>
            {:else}
                <ul class="flex flex-col gap-1 text-sm text-primary">
                    {#if profile.can_write_scrap}
                        <li>
                            <a href="/@{profile.slug}/scraps" class="underline underline-offset-2">
                                deixar recado
                            </a>
                        </li>
                    {/if}
                    {#if relationship !== "anonymous"}
                        <li>
                            <a href="/messages/{profile.slug}" class="underline underline-offset-2">
                                enviar mensagem
                            </a>
                        </li>
                    {/if}
                    {#if relationship !== "anonymous"}
                        <li>
                            {#if reported}
                                <span class="text-muted">perfil já denunciado</span>
                            {:else}
                                <button
                                    type="button"
                                    class="cursor-pointer underline underline-offset-2"
                                    disabled={busy}
                                    onclick={openReport}
                                >
                                    denunciar perfil
                                </button>
                            {/if}
                        </li>
                    {/if}
                    {#if relationship !== "anonymous"}
                        <li>
                            <button
                                type="button"
                                class="cursor-pointer underline underline-offset-2"
                                disabled={busy}
                                onclick={() => (confirming = "block")}
                            >
                                bloquear perfil
                            </button>
                        </li>
                    {/if}
                </ul>
            {/if}
        </div>
    </aside>

    <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
            <h2 class="text-2xl font-bold text-content">{profile.name}</h2>

            {#if profile.status}
                <p
                    class="rounded-theme border border-line bg-surface px-3 py-2 text-sm text-accent"
                >
                    {profile.status}
                </p>
            {/if}

            <!-- Rótulo em cima, valor embaixo: contadores e avaliações formam uma
                 faixa só de duas linhas, com as duas alinhadas entre as colunas. -->
            <ul class="flex flex-wrap items-start gap-x-5 gap-y-2 text-xs text-muted">
                {#each counters as counter}
                    <li class="flex flex-col gap-0.5 whitespace-nowrap">
                        <span>{counter.label}</span>
                        <span class="flex min-h-5 items-center font-bold text-content">
                            {counter.value}
                        </span>
                    </li>
                {/each}

                {#each RATING_AXES as axis}
                    {@const value = profile.rating[axis.key]}
                    <li class="flex flex-col gap-0.5 whitespace-nowrap">
                        <span>{axis.label}</span>
                        <span class="flex min-h-5 items-center gap-px">
                            {#each { length: RATING_MAX }, index}
                                <RatingIcon
                                    axis={axis.key}
                                    filled={index < Math.round(value.average ?? 0)}
                                    class="size-5"
                                />
                            {/each}
                        </span>
                    </li>
                {/each}
            </ul>
        </div>

        {#if profile.can_rate}
            <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
                <h2 class="border-b border-line pb-1 text-base font-bold text-content">
                    Avaliar {firstName}
                </h2>

                {#each RATING_AXES as axis}
                    <div class="flex items-center gap-2 text-sm">
                        <span class="w-20 text-muted">{axis.label}</span>
                        <div class="flex gap-px">
                            {#each { length: RATING_MAX }, index}
                                <button
                                    type="button"
                                    disabled={savingRating}
                                    aria-label="{axis.label} {index + 1}"
                                    aria-pressed={ratingForm[axis.key] === index + 1}
                                    onclick={() => setAxis(axis.key, index + 1)}
                                    class="cursor-pointer rounded-theme hover:bg-surface-hover disabled:cursor-default disabled:opacity-50"
                                >
                                    <RatingIcon
                                        axis={axis.key}
                                        filled={index < ratingForm[axis.key]}
                                        class="size-5"
                                    />
                                </button>
                            {/each}
                        </div>
                    </div>
                {/each}

                <p class="text-xs text-muted">
                    Clique de novo na mesma bolinha para zerar o item. A avaliação é anônima e some
                    se a amizade acabar.
                </p>

                <div class="flex flex-wrap justify-end gap-2">
                    {#if profile.my_rating}
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={savingRating}
                            onclick={removeRating}
                        >
                            remover minha avaliação
                        </Button>
                    {/if}
                    <Button
                        size="sm"
                        disabled={savingRating || ratingEmpty || !ratingChanged}
                        onclick={saveRating}
                    >
                        {profile.my_rating ? "atualizar avaliação" : "avaliar"}
                    </Button>
                </div>
            </div>
        {/if}

        <div class="flex flex-col">
            <span
                class="w-fit rounded-t-theme border border-b-0 border-line bg-surface px-4 py-1 text-sm font-bold text-content"
            >
                social
            </span>

            <dl
                class="grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-theme rounded-tl-none border border-line bg-surface text-sm"
            >
                {#each details as row, index}
                    <dt class="px-3 py-1.5 text-end text-muted {index % 2 ? 'bg-canvas' : ''}">
                        {row.label}:
                    </dt>
                    <dd class="px-3 py-1.5 text-content {index % 2 ? 'bg-canvas' : ''}">
                        {row.value}
                    </dd>
                {/each}
            </dl>
        </div>

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <div class="flex items-center justify-between border-b border-line pb-1">
                <h2 class="text-base font-bold text-content">
                    Depoimentos de {firstName} ({profile.testimonials_count})
                </h2>
                <a
                    href="/@{profile.slug}/testimonials"
                    class="text-xs text-primary underline underline-offset-2"
                >
                    ver todos
                </a>
            </div>

            {#if data.testimonials.length === 0}
                <p class="text-sm text-muted">Nenhum depoimento ainda.</p>
            {:else}
                <ul class="flex flex-col gap-3">
                    {#each data.testimonials as testimonial (testimonial.id)}
                        <li class="flex gap-3">
                            <a href="/@{testimonial.profile.slug}" class="shrink-0">
                                <Avatar
                                    src={testimonial.profile.avatar_url}
                                    name={testimonial.profile.name}
                                    class="size-10"
                                    textClass="text-sm"
                                />
                            </a>

                            <div class="min-w-0">
                                <a
                                    href="/@{testimonial.profile.slug}"
                                    class="text-sm font-bold text-primary underline underline-offset-2"
                                >
                                    {testimonial.profile.name}
                                </a>
                                <RichText value={testimonial.body} class="text-sm text-content" />
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </section>

    <aside class="flex flex-col gap-3">
        {#if isOwner && data.visitors}
            <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
                <div class="flex items-center justify-between border-b border-line pb-1">
                    <h2 class="text-sm font-bold text-content">visitas recentes</h2>
                    <a href="/visitors" class="text-xs text-primary underline underline-offset-2">
                        ver todas
                    </a>
                </div>

                {#if !data.visitors.enabled}
                    <p class="text-sm text-muted">
                        Registro de visitas desligado.
                        <a href="/settings" class="text-primary underline underline-offset-2">
                            ligar
                        </a>
                    </p>
                {:else if data.visitors.recent.length === 0}
                    <p class="text-sm text-muted">Ninguém nos últimos 7 dias.</p>
                {:else}
                    <ul class="flex flex-col gap-2">
                        {#each data.visitors.recent.slice(0, 6) as visitor (visitor.profile.id)}
                            <li class="flex items-center gap-2">
                                <a href="/@{visitor.profile.slug}" class="shrink-0">
                                    <Avatar
                                        src={visitor.profile.avatar_url}
                                        name={visitor.profile.name}
                                        class="size-8"
                                        textClass="text-xs"
                                    />
                                </a>
                                <div class="min-w-0">
                                    <a
                                        href="/@{visitor.profile.slug}"
                                        class="block truncate text-sm text-primary underline underline-offset-2"
                                    >
                                        {visitor.profile.name}
                                    </a>
                                    <span class="block truncate text-xs text-muted">
                                        {relativeTime(visitor.visited_at)}
                                    </span>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/if}

        {#if profile.friends_visible}
            <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
                <div class="flex items-center justify-between border-b border-line pb-1">
                    <h2 class="text-sm font-bold text-content">
                        amigos ({profile.friends_count ?? 0})
                    </h2>
                    <a
                        href="/@{profile.slug}/friends"
                        class="text-xs text-primary underline underline-offset-2"
                    >
                        ver todos
                    </a>
                </div>

                {#if profile.friends.length === 0}
                    <p class="text-sm text-muted">Ninguém por aqui ainda.</p>
                {:else}
                    <ul class="grid grid-cols-3 gap-2">
                        {#each profile.friends as friend (friend.id)}
                            <li>
                                <a href="/@{friend.slug}" class="block text-center">
                                    <Avatar
                                        src={friend.avatar_url}
                                        name={friend.name}
                                        class="aspect-square w-full"
                                    />
                                    <span class="mt-1 block truncate text-xs text-content">
                                        {friend.name}
                                    </span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/if}

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
            <div class="flex items-center justify-between border-b border-line pb-1">
                <h2 class="text-sm font-bold text-content">
                    comunidades ({data.communities.length})
                </h2>
                {#if isOwner}
                    <a
                        href="/community/mine"
                        class="text-xs text-primary underline underline-offset-2"
                    >
                        ver todas
                    </a>
                {/if}
            </div>

            {#if data.communities.length === 0}
                <p class="text-sm text-muted">Nenhuma comunidade ainda.</p>
            {:else}
                <ul class="grid grid-cols-3 gap-2">
                    {#each data.communities as community (community.id)}
                        <li>
                            <a href="/community/{community.slug}" class="block text-center">
                                <Avatar
                                    src={community.avatar_url}
                                    name={community.name}
                                    class="aspect-square w-full"
                                />
                                <span class="mt-1 block truncate text-xs text-content">
                                    {community.name}
                                </span>
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </aside>
</main>

{#if confirming === "remove_friend"}
    <ConfirmDialog
        title="Desfazer amizade"
        confirmLabel="desfazer"
        {busy}
        onconfirm={confirmRemoveFriend}
        oncancel={() => (confirming = null)}
    >
        Tem certeza que deseja desfazer a amizade com {profile.name}?
    </ConfirmDialog>
{:else if confirming === "block"}
    <ConfirmDialog
        title="Bloquear perfil"
        confirmLabel="bloquear"
        {busy}
        onconfirm={confirmBlock}
        oncancel={() => (confirming = null)}
    >
        Bloquear {profile.name} desfaz a amizade, apaga os pedidos pendentes entre vocês e esconde o perfil.
        Tem certeza?
    </ConfirmDialog>
{/if}

{#if reporting}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
            onsubmit={submitReport}
            class="flex w-full max-w-md flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 class="text-base font-bold text-content">Denunciar {profile.name}</h2>
            <p class="text-sm text-muted">
                A denúncia é anônima: {firstName} não vê quem denunciou. Bloquear é uma ação separada
                e continua disponível.
            </p>

            <label class="flex flex-col gap-1 text-sm">
                <span class="text-muted">Motivo</span>
                <select
                    bind:value={reportReason}
                    class="h-9 rounded-theme border border-line bg-canvas px-2 text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    {#each REPORT_REASONS as reason}
                        <option value={reason.value}>{reason.label}</option>
                    {/each}
                </select>
            </label>

            <label class="flex flex-col gap-1 text-sm">
                <span class="text-muted">
                    Detalhes {reportReason === "other" ? "(obrigatório)" : "(opcional)"}
                </span>
                <Textarea
                    bind:value={reportDetails}
                    rows={4}
                    maxlength={REPORT_DETAILS_MAX_LENGTH}
                />
            </label>

            {#if retryAfter > 0}
                <p class="text-sm text-muted">
                    Muitas tentativas seguidas. Tente de novo em {retryAfter} segundos.
                </p>
            {/if}

            <div class="flex justify-end gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onclick={() => (reporting = false)}
                >
                    cancelar
                </Button>
                <Button
                    size="sm"
                    variant="danger"
                    type="submit"
                    disabled={busy ||
                        retryAfter > 0 ||
                        (reportReason === "other" && reportDetails.trim() === "")}
                >
                    enviar denúncia
                </Button>
            </div>
        </form>
    </div>
{/if}

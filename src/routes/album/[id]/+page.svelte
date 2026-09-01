<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { ALBUM_PHOTOS_LIMIT, albumVisibilityLabel, deleteAlbum, updateAlbum } from "#lib/album";
    import AlbumFormDialog from "#lib/components/AlbumFormDialog.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import MediaComments from "#lib/components/MediaComments.svelte";
    import ReportDialog from "#lib/components/ReportDialog.svelte";
    import { ApiError } from "#lib/error";
    import {
        MEDIA_CAPTION_MAX_LENGTH,
        MEDIA_COUNT_LIMIT,
        deleteMedia,
        fetchProfileMedia,
        updateMedia,
    } from "#lib/media";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import type { AlbumDetail, Media } from "#lib/types";

    let { data } = $props();

    // Derivado, mas reatribuível: editar o álbum, definir capa ou apagar foto
    // sobrescreve até o próximo `load`.
    let album = $derived<AlbumDetail>(data.album);
    let photos = $state<Media[]>([]);
    let viewerIndex = $state<number | null>(null);
    let editingAlbum = $state(false);
    let confirmingDelete = $state(false);
    let confirmingPhoto = $state<Media | null>(null);
    let reordering = $state(false);
    let busy = $state(false);
    let editingCaption = $state(false);
    let captionDraft = $state("");
    let reportingPhoto = $state(false);

    let picking = $state(false);
    let loose = $state<Media[]>([]);
    let loadingLoose = $state(false);
    let picked = $state<string[]>([]);

    function bumpCommentCount(mediaId: string, delta: number) {
        photos = photos.map((entry) =>
            entry.id === mediaId
                ? { ...entry, comments_count: Math.max(0, entry.comments_count + delta) }
                : entry,
        );
    }

    // Semeia o buffer de reordenação a cada carga.
    $effect(() => {
        photos = [...data.album.photos];
        viewerIndex = null;
        reordering = false;
        editingCaption = false;
    });

    const isOwner = $derived(data.isOwner);
    const orderChanged = $derived(photos.some((photo, index) => photo.position !== index));
    const freeSlots = $derived(ALBUM_PHOTOS_LIMIT - photos.length);

    /**
     * Fotos que ainda não estão em álbum nenhum. O limite de fotos por perfil é
     * baixo, então uma página só já traz todas.
     */
    async function openPicker() {
        picking = true;
        picked = [];
        loadingLoose = true;
        try {
            const page = await fetchProfileMedia(
                album.owner_slug,
                "photo",
                null,
                MEDIA_COUNT_LIMIT,
            );
            loose = page.results.filter((item) => item.album_id === null);
        } catch (error) {
            toastApiError(error);
        } finally {
            loadingLoose = false;
        }
    }

    function togglePick(id: string) {
        picked = picked.includes(id) ? picked.filter((entry) => entry !== id) : [...picked, id];
    }

    async function addPicked() {
        const chosen = loose.filter((item) => picked.includes(item.id));
        busy = true;
        try {
            // A posição vai junto para a foto entrar no fim da ordem já salva.
            await Promise.all(
                chosen.map((photo, offset) =>
                    updateMedia(photo.id, {
                        album_id: album.id,
                        position: photos.length + offset,
                    }),
                ),
            );
            photos = [
                ...photos,
                ...chosen.map((photo, offset) => ({
                    ...photo,
                    album_id: album.id,
                    position: photos.length + offset,
                })),
            ];
            album = { ...album, photos_count: album.photos_count + chosen.length };
            picking = false;
            toast.success(chosen.length === 1 ? "Foto adicionada" : "Fotos adicionadas");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    function move(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= photos.length) return;
        const next = [...photos];
        [next[index], next[target]] = [next[target], next[index]];
        photos = next;
    }

    async function saveOrder() {
        busy = true;
        try {
            await Promise.all(
                photos
                    .map((photo, index) => ({ photo, index }))
                    .filter(({ photo, index }) => photo.position !== index)
                    .map(({ photo, index }) => updateMedia(photo.id, { position: index })),
            );
            photos = photos.map((photo, index) => ({ ...photo, position: index }));
            reordering = false;
            toast.success("Ordem salva");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function setCover(mediaId: string) {
        busy = true;
        try {
            // A resposta é só o resumo: as fotos e o dono continuam sendo os de agora.
            const saved = await updateAlbum(album.id, {
                title: album.title,
                description: album.description,
                visibility: album.visibility,
                cover_media_id: mediaId,
            });
            album = { ...album, ...saved };
            toast.success("Capa definida");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function removePhoto(photo: Media) {
        busy = true;
        try {
            await deleteMedia(photo.id);
        } catch (error) {
            if (!(error instanceof ApiError && error.status === 404)) {
                toastApiError(error);
                busy = false;
                confirmingPhoto = null;
                return;
            }
        }
        photos = photos.filter((entry) => entry.id !== photo.id);
        album = { ...album, photos_count: Math.max(0, album.photos_count - 1) };
        viewerIndex = null;
        confirmingPhoto = null;
        busy = false;
    }

    function startCaption() {
        if (viewerIndex === null) return;
        captionDraft = photos[viewerIndex].caption ?? "";
        editingCaption = true;
    }

    async function saveCaption() {
        if (viewerIndex === null) return;
        const photo = photos[viewerIndex];
        const value = captionDraft.trim() === "" ? null : captionDraft.trim();
        busy = true;
        try {
            await updateMedia(photo.id, { caption: value });
            photos = photos.map((entry) =>
                entry.id === photo.id ? { ...entry, caption: value } : entry,
            );
            editingCaption = false;
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function confirmDeleteAlbum() {
        busy = true;
        try {
            await deleteAlbum(album.id);
            toast.success("Álbum excluído");
            await goto(`/@${album.owner_slug}/album`);
        } catch (error) {
            toastApiError(error);
            busy = false;
            confirmingDelete = false;
        }
    }

    function step(offset: number) {
        if (viewerIndex === null || photos.length === 0) return;
        editingCaption = false;
        viewerIndex = (viewerIndex + offset + photos.length) % photos.length;
    }

    function onKeyDown(event: KeyboardEvent) {
        if (viewerIndex === null || editingCaption) return;
        if (event.key === "Escape") viewerIndex = null;
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<svelte:head><title>{album.title} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
            <h1 class="text-lg font-bold text-content">{album.title}</h1>
            <p class="text-xs text-muted">
                {album.photos_count}
                {album.photos_count === 1 ? "foto" : "fotos"}
                {#if isOwner}· {albumVisibilityLabel(album.visibility)}{/if}
            </p>
        </div>
        <a
            href="/@{album.owner_slug}/album"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar aos álbuns
        </a>
    </div>

    {#if album.description}
        <p class="text-sm whitespace-pre-wrap text-content">{album.description}</p>
    {/if}

    {#if isOwner}
        <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onclick={() => (editingAlbum = true)}>
                editar álbum
            </Button>
            {#if !reordering}
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || freeSlots <= 0}
                    title={freeSlots > 0
                        ? undefined
                        : `O álbum já tem ${ALBUM_PHOTOS_LIMIT} fotos.`}
                    onclick={openPicker}
                >
                    adicionar fotos
                </Button>
            {/if}
            {#if photos.length > 1 && !reordering}
                <Button size="sm" variant="outline" onclick={() => (reordering = true)}>
                    reordenar fotos
                </Button>
            {/if}
            {#if reordering}
                <Button size="sm" disabled={busy || !orderChanged} onclick={saveOrder}>
                    {busy ? "salvando..." : "salvar ordem"}
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onclick={() => {
                        photos = [...data.album.photos];
                        reordering = false;
                    }}
                >
                    cancelar
                </Button>
            {/if}
            <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onclick={() => (confirmingDelete = true)}
            >
                excluir álbum
            </Button>
        </div>
    {/if}

    {#if photos.length === 0}
        <EmptyState>Nenhuma foto neste álbum ainda.</EmptyState>
    {:else}
        <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {#each photos as photo, index (photo.id)}
                <li class="flex flex-col gap-1">
                    <button
                        type="button"
                        onclick={() => (viewerIndex = index)}
                        class="cursor-pointer"
                        aria-label="Abrir foto"
                    >
                        <img
                            src={photo.url}
                            alt={photo.caption ?? "Foto do álbum"}
                            loading="lazy"
                            class="aspect-square w-full border border-line object-cover"
                        />
                    </button>

                    {#if isOwner && reordering}
                        <div class="flex items-center gap-1 text-xs">
                            <button
                                type="button"
                                class="cursor-pointer px-1 text-muted disabled:opacity-30"
                                disabled={index === 0}
                                aria-label="Mover para tras"
                                onclick={() => move(index, -1)}
                            >
                                ←
                            </button>
                            <button
                                type="button"
                                class="cursor-pointer px-1 text-muted disabled:opacity-30"
                                disabled={index === photos.length - 1}
                                aria-label="Mover para frente"
                                onclick={() => move(index, 1)}
                            >
                                →
                            </button>
                        </div>
                    {:else if isOwner}
                        <button
                            type="button"
                            disabled={busy}
                            onclick={() => setCover(photo.id)}
                            class="cursor-pointer text-xs text-primary underline underline-offset-2"
                        >
                            definir capa
                        </button>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</main>

{#if viewerIndex !== null && photos[viewerIndex]}
    {@const photo = photos[viewerIndex]}
    <div
        class="fixed inset-0 z-50 flex flex-col items-center gap-3 overflow-y-auto bg-black/80 p-4"
    >
        <div class="flex w-full max-w-2xl items-center justify-between gap-2 text-sm text-white">
            <span>{viewerIndex + 1} de {photos.length}</span>
            <button
                type="button"
                onclick={() => (viewerIndex = null)}
                class="cursor-pointer underline underline-offset-2"
            >
                fechar
            </button>
        </div>

        <img
            src={photo.url}
            alt={photo.caption ?? "Foto do álbum"}
            class="max-h-[65vh] max-w-full object-contain"
        />

        <div class="flex w-full max-w-2xl items-center justify-between gap-2">
            <Button size="sm" variant="outline" onclick={() => step(-1)}>anterior</Button>
            {#if auth.user}
                <button
                    type="button"
                    class="cursor-pointer text-xs text-white underline underline-offset-2"
                    onclick={() => (reportingPhoto = true)}
                >
                    denunciar foto
                </button>
            {/if}
            <Button size="sm" variant="outline" onclick={() => step(1)}>próxima</Button>
        </div>

        <div class="flex w-full max-w-2xl flex-col gap-2 rounded-theme bg-surface p-3">
            {#if editingCaption}
                <textarea
                    bind:value={captionDraft}
                    rows="2"
                    maxlength={MEDIA_CAPTION_MAX_LENGTH}
                    class="w-full rounded-theme border border-line bg-canvas px-2 py-1 text-sm text-content"
                ></textarea>
                <div class="flex gap-2">
                    <Button size="sm" disabled={busy} onclick={saveCaption}>salvar legenda</Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onclick={() => (editingCaption = false)}
                    >
                        cancelar
                    </Button>
                </div>
            {:else}
                {#if photo.caption}
                    <p class="text-sm whitespace-pre-wrap text-content">{photo.caption}</p>
                {:else if isOwner}
                    <p class="text-sm text-muted italic">Sem legenda.</p>
                {/if}
                {#if isOwner}
                    <div class="flex flex-wrap gap-3 text-xs">
                        <button
                            type="button"
                            class="cursor-pointer text-primary underline underline-offset-2"
                            onclick={startCaption}
                        >
                            editar legenda
                        </button>
                        <button
                            type="button"
                            class="cursor-pointer text-danger underline underline-offset-2"
                            disabled={busy}
                            onclick={() => (confirmingPhoto = photo)}
                        >
                            apagar foto
                        </button>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="w-full max-w-2xl rounded-theme bg-surface p-3">
            <MediaComments
                mediaId={photo.id}
                ownerSlug={album.owner_slug}
                oncountchange={(delta) => bumpCommentCount(photo.id, delta)}
            />
        </div>
    </div>
{/if}

{#if confirmingPhoto}
    {@const photo = confirmingPhoto}
    <ConfirmDialog
        title="Apagar foto"
        confirmLabel="apagar"
        {busy}
        onconfirm={() => removePhoto(photo)}
        oncancel={() => (confirmingPhoto = null)}
    >
        O arquivo sai do álbum e do servidor. Não dá para desfazer.
    </ConfirmDialog>
{/if}

{#if confirmingDelete}
    <ConfirmDialog
        title="Excluir álbum"
        confirmLabel="excluir"
        {busy}
        onconfirm={confirmDeleteAlbum}
        oncancel={() => (confirmingDelete = false)}
    >
        As {album.photos_count}
        {album.photos_count === 1 ? "foto vai" : "fotos vão"} junto, com os arquivos. Não dá para desfazer.
    </ConfirmDialog>
{/if}

{#if picking}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="album-picker-title"
            class="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 id="album-picker-title" class="text-base font-bold text-content">
                Adicionar fotos ao álbum
            </h2>
            <p class="text-xs text-muted">
                Só aparecem as fotos que ainda não estão em nenhum álbum. Cabem mais {freeSlots}
                {freeSlots === 1 ? "foto" : "fotos"} aqui.
            </p>

            {#if loadingLoose}
                <p class="text-sm text-muted">Carregando fotos...</p>
            {:else if loose.length === 0}
                <p class="text-sm text-muted">
                    Nenhuma foto solta. Envie uma nova pelo seu álbum, escolhendo este álbum na hora
                    do envio.
                </p>
            {:else}
                <ul class="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                    {#each loose as item (item.id)}
                        {@const chosen = picked.includes(item.id)}
                        <li>
                            <button
                                type="button"
                                aria-pressed={chosen}
                                disabled={!chosen && picked.length >= freeSlots}
                                onclick={() => togglePick(item.id)}
                                class="relative block w-full cursor-pointer ring-2 disabled:opacity-40 {chosen
                                    ? 'ring-primary'
                                    : 'opacity-60 ring-line'}"
                            >
                                <img
                                    src={item.url}
                                    alt={item.caption ?? "Foto solta"}
                                    loading="lazy"
                                    class="aspect-square w-full object-cover"
                                />
                                {#if chosen}
                                    <span
                                        class="absolute end-1 top-1 rounded-full bg-primary px-1.5 text-xs text-white"
                                    >
                                        &check;
                                    </span>
                                {/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}

            <div class="flex justify-end gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onclick={() => (picking = false)}
                >
                    cancelar
                </Button>
                <Button size="sm" disabled={busy || picked.length === 0} onclick={addPicked}>
                    {busy ? "adicionando..." : "adicionar"}
                </Button>
            </div>
        </div>
    </div>
{/if}

<AlbumFormDialog
    bind:open={editingAlbum}
    {album}
    onsaved={(saved) => (album = { ...album, ...saved })}
/>

{#if viewerIndex !== null && photos[viewerIndex]}
    <ReportDialog
        bind:open={reportingPhoto}
        kind="media"
        reference={photos[viewerIndex].id}
        name="esta foto"
    />
{/if}

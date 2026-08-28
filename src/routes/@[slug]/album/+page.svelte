<script lang="ts">
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { ApiError } from "#lib/error";
    import { compressImage } from "#lib/image";
    import {
        MEDIA_KINDS,
        MEDIA_LIMITS,
        deleteMedia,
        fetchProfileMedia,
        mediaKindLabel,
        mediaKindOf,
        mediaProblem,
        uploadMedia,
    } from "#lib/media";
    import { toastApiError } from "#lib/toast";
    import type { Media, MediaKind } from "#lib/types";

    let { data } = $props();

    let media = $derived(data.media);
    let nextCursor = $derived(data.nextCursor);
    let counts = $derived(data.counts);
    let loading = $state(false);
    let busy = $state(false);

    let viewerIndex = $state<number | null>(null);
    let confirmingDelete = $state<Media | null>(null);

    let file = $state<File | null>(null);
    let preview = $state<string | null>(null);
    let uploadError = $state<string | null>(null);
    let uploading = $state(false);
    let compressing = $state(false);
    let progress = $state(0);

    const profile = $derived(data.profile);
    const kind = $derived(data.kind);
    const isOwner = $derived(profile.relationship === "self");
    const selectedKind = $derived(file ? mediaKindOf(file) : null);
    const quotaFull = $derived(
        selectedKind !== null && (counts?.[selectedKind] ?? 0) >= MEDIA_LIMITS[selectedKind],
    );

    const tabs = $derived([
        { label: "tudo", value: null as MediaKind | null },
        ...MEDIA_KINDS.map((item) => ({ label: item.plural, value: item.value })),
    ]);

    // Depende da aba de propósito: trocar de aba fecha o visualizador e descarta a escolha.
    $effect(() => {
        kind;
        viewerIndex = null;
        confirmingDelete = null;
        // `clearFile` lê `preview`, e rastrear isso aqui faria escolher um arquivo
        // disparar o efeito de novo, que jogaria a escolha fora.
        untrack(clearFile);
    });

    function tabHref(value: MediaKind | null): string {
        return value === null ? `/@${profile.slug}/album` : `/@${profile.slug}/album?kind=${value}`;
    }

    function formatSize(bytes: number): string {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function countLabel(value: MediaKind): string {
        return `${counts?.[value] ?? 0}/${MEDIA_LIMITS[value]} ${mediaKindLabel(value, true)}`;
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchProfileMedia(profile.slug, kind, nextCursor);
            media = [...media, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function clearFile() {
        if (preview) URL.revokeObjectURL(preview);
        file = null;
        preview = null;
        uploadError = null;
        progress = 0;
    }

    async function pickFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const chosen = input.files?.[0];
        input.value = "";
        if (!chosen) return;

        const problem = mediaProblem(chosen);
        clearFile();
        if (problem) {
            uploadError = problem;
            return;
        }

        let picked = chosen;
        if (mediaKindOf(chosen) === "photo") {
            const tabAtPick = kind;
            compressing = true;
            try {
                picked = await compressImage(chosen);
            } finally {
                compressing = false;
            }
            // Trocar de aba durante a compressão descarta a escolha: o `$effect` do
            // `kind` já rodou `clearFile`, então aqui é só sair sem ressuscitar nada.
            if (kind !== tabAtPick) return;
        }

        file = picked;
        preview = URL.createObjectURL(picked);
    }

    async function upload() {
        if (!file) return;

        uploading = true;
        progress = 0;
        uploadError = null;
        try {
            const created = await uploadMedia(file, (ratio) => (progress = ratio));
            // A lista misturada e a lista daquele tipo recebem o item novo.
            if (kind === null || kind === created.kind) media = [created, ...media];
            if (counts) counts[created.kind] += 1;
            clearFile();
            toast.success(created.kind === "photo" ? "Foto enviada" : "Vídeo enviado");
        } catch (error) {
            const code =
                error instanceof ApiError && error.status === 409
                    ? (error.errorsAt("file").at(0)?.code ?? null)
                    : null;

            // A cota é do servidor: o contador local passa a valer o que ele acabou de dizer.
            if (code === "photo_limit_reached" && counts) counts.photo = MEDIA_LIMITS.photo;
            if (code === "video_limit_reached" && counts) counts.video = MEDIA_LIMITS.video;

            toastApiError(error);
        } finally {
            uploading = false;
        }
    }

    async function confirmDelete(item: Media) {
        busy = true;
        try {
            await deleteMedia(item.id);
            toast.success(item.kind === "photo" ? "Foto apagada" : "Vídeo apagado");
        } catch (error) {
            // Um 404 significa que já sumiu, que é o estado que a gente queria de todo jeito.
            if (!(error instanceof ApiError && error.status === 404)) {
                toastApiError(error);
                busy = false;
                confirmingDelete = null;
                return;
            }
        }

        media = media.filter((entry) => entry.id !== item.id);
        if (counts) counts[item.kind] = Math.max(0, counts[item.kind] - 1);
        viewerIndex = null;
        busy = false;
        confirmingDelete = null;
    }

    function step(offset: number) {
        if (viewerIndex === null || media.length === 0) return;
        viewerIndex = (viewerIndex + offset + media.length) % media.length;
    }

    function onKeyDown(event: KeyboardEvent) {
        if (viewerIndex === null) return;
        if (event.key === "Escape") viewerIndex = null;
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<svelte:head><title>Álbum de {profile.name} | Tukro</title></svelte:head>

{#snippet thumbnail(item: Media)}
    {#if item.kind === "photo"}
        <img
            src={item.url}
            alt="Foto de {profile.name}"
            loading="lazy"
            class="aspect-square w-full border border-line object-cover"
        />
    {:else}
        <video
            src={item.url}
            preload="metadata"
            muted
            class="pointer-events-none aspect-square w-full border border-line object-cover"
        ></video>
    {/if}
{/snippet}

<main class="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Álbum de {profile.name}</h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if data.isPrivate}
        <EmptyState>Este perfil mantém o álbum privado.</EmptyState>
    {:else}
        <nav class="flex flex-wrap gap-2">
            {#each tabs as tab}
                <TabPill href={tabHref(tab.value)} active={kind === tab.value}>
                    {tab.label}
                </TabPill>
            {/each}
        </nav>

        {#if isOwner}
            <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
                <div
                    class="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-1"
                >
                    <h2 class="text-base font-bold text-content">Enviar foto ou vídeo</h2>
                    <p class="text-xs text-muted">
                        {countLabel("photo")} · {countLabel("video")}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <label
                        for="media"
                        class="inline-flex h-9 cursor-pointer items-center justify-center rounded-theme border border-line bg-surface px-4 text-sm font-medium text-content hover:bg-surface-hover"
                    >
                        {compressing ? "comprimindo..." : "escolher arquivo"}
                    </label>
                    <input
                        id="media"
                        type="file"
                        accept="image/*,video/*"
                        disabled={uploading || compressing}
                        onchange={pickFile}
                        class="sr-only"
                    />
                    <p class="text-xs text-muted">
                        JPEG, PNG, WebP, GIF, MP4, MOV ou WebM, até 25 MB.
                    </p>
                </div>

                {#if file && preview}
                    <div class="flex flex-wrap items-start gap-3">
                        {#if selectedKind === "photo"}
                            <img
                                src={preview}
                                alt="Prévia do arquivo escolhido"
                                class="size-32 border border-line object-cover"
                            />
                        {:else}
                            <!-- svelte-ignore a11y_media_has_caption -->
                            <video
                                src={preview}
                                controls
                                preload="metadata"
                                class="size-32 border border-line object-cover"
                            ></video>
                        {/if}

                        <div class="flex min-w-0 flex-col gap-1">
                            <p class="truncate text-sm text-content">{file.name}</p>
                            <p class="text-xs text-muted">
                                {selectedKind ? mediaKindLabel(selectedKind) : "arquivo"} · {formatSize(
                                    file.size,
                                )}
                            </p>

                            {#if quotaFull && selectedKind}
                                <p class="text-xs text-danger">
                                    Você já tem {MEDIA_LIMITS[selectedKind]}
                                    {mediaKindLabel(selectedKind, true)}. Apague algum item antes de
                                    enviar outro.
                                </p>
                            {/if}

                            <div class="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    disabled={uploading || quotaFull}
                                    onclick={upload}
                                >
                                    {uploading ? "enviando..." : "enviar"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={uploading}
                                    onclick={clearFile}
                                >
                                    cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                {/if}

                {#if uploading}
                    <div
                        role="progressbar"
                        aria-valuenow={Math.round(progress * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        class="h-2 w-full overflow-hidden rounded-theme border border-line bg-canvas"
                    >
                        <div
                            class="h-full bg-primary transition-[width]"
                            style="width: {Math.round(progress * 100)}%"
                        ></div>
                    </div>
                {/if}

                {#if uploadError}
                    <p class="text-xs text-danger">{uploadError}</p>
                {/if}
            </section>
        {/if}

        {#if media.length === 0}
            <EmptyState>{loading ? "Carregando..." : "Nada no álbum ainda."}</EmptyState>
        {:else}
            <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {#each media as item, index (item.id)}
                    <li class="flex flex-col gap-1">
                        <button
                            type="button"
                            onclick={() => (viewerIndex = index)}
                            aria-label="Abrir {mediaKindLabel(item.kind)}"
                            class="relative cursor-pointer"
                        >
                            {@render thumbnail(item)}
                            {#if item.kind === "video"}
                                <span
                                    class="absolute end-1 bottom-1 rounded-theme bg-black/60 px-1.5 py-0.5 text-xs text-white"
                                >
                                    vídeo
                                </span>
                            {/if}
                        </button>

                        {#if isOwner}
                            <button
                                type="button"
                                disabled={busy}
                                onclick={() => (confirmingDelete = item)}
                                class="cursor-pointer text-xs text-primary underline underline-offset-2"
                            >
                                apagar
                            </button>
                        {/if}
                    </li>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

{#if viewerIndex !== null && media[viewerIndex]}
    {@const item = media[viewerIndex]}
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4">
        <div class="flex w-full max-w-4xl items-center justify-between gap-2 text-sm text-white">
            <span>{viewerIndex + 1} de {media.length}</span>
            <button
                type="button"
                onclick={() => (viewerIndex = null)}
                class="cursor-pointer underline underline-offset-2"
            >
                fechar
            </button>
        </div>

        {#if item.kind === "photo"}
            <img
                src={item.url}
                alt="Foto de {profile.name}"
                class="max-h-[70vh] max-w-full object-contain"
            />
        {:else}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
                src={item.url}
                controls
                autoplay
                preload="metadata"
                class="max-h-[70vh] max-w-full"
            ></video>
        {/if}

        <div class="flex w-full max-w-4xl items-center justify-between gap-2">
            <Button size="sm" variant="outline" onclick={() => step(-1)}>anterior</Button>
            {#if isOwner}
                <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onclick={() => (confirmingDelete = item)}
                >
                    apagar
                </Button>
            {/if}
            <Button size="sm" variant="outline" onclick={() => step(1)}>próximo</Button>
        </div>
    </div>
{/if}

{#if confirmingDelete}
    {@const item = confirmingDelete}
    <ConfirmDialog
        title="Apagar {mediaKindLabel(item.kind)}"
        confirmLabel="apagar"
        {busy}
        onconfirm={() => confirmDelete(item)}
        oncancel={() => (confirmingDelete = null)}
    >
        O arquivo sai do álbum e do servidor. Não dá para desfazer.
    </ConfirmDialog>
{/if}

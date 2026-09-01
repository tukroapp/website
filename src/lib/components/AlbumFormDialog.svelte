<script lang="ts">
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import {
        ALBUM_DESCRIPTION_MAX_LENGTH,
        ALBUM_TITLE_MAX_LENGTH,
        ALBUM_VISIBILITY_OPTIONS,
        createAlbum,
        updateAlbum,
    } from "#lib/album";
    import { toastApiError } from "#lib/toast";
    import type { AlbumSummary, AlbumVisibility } from "#lib/types";

    interface Props {
        open: boolean;
        /** Null cria; preenchido edita esse álbum. */
        album?: AlbumSummary | null;
        onsaved: (album: AlbumSummary) => void;
    }

    let { open = $bindable(), album = null, onsaved }: Props = $props();

    const TITLE_ID = "album-form-title";

    let title = $state("");
    let description = $state("");
    let visibility = $state<AlbumVisibility>("everyone");
    let errors = $state<Record<string, string[]>>({});
    let saving = $state(false);

    // Cada abertura parte do álbum atual, ou do zero.
    $effect(() => {
        if (open) {
            title = album?.title ?? "";
            description = album?.description ?? "";
            visibility = album?.visibility ?? "everyone";
            errors = {};
        }
    });

    const currentHint = $derived(
        ALBUM_VISIBILITY_OPTIONS.find((item) => item.value === visibility)?.hint ?? "",
    );

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (saving || title.trim() === "") return;

        saving = true;
        errors = {};
        try {
            const payload = {
                title: title.trim(),
                description: description.trim() === "" ? null : description.trim(),
                visibility,
            };
            const saved = album ? await updateAlbum(album.id, payload) : await createAlbum(payload);
            toast.success(album ? "Álbum atualizado" : "Álbum criado");
            onsaved(saved);
            open = false;
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
        } finally {
            saving = false;
        }
    }
</script>

{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            class="w-full max-w-md rounded-theme border border-line bg-surface p-4"
        >
            <form onsubmit={submit} class="flex flex-col gap-3">
                <h2 id={TITLE_ID} class="text-base font-bold text-content">
                    {album ? "Editar álbum" : "Novo álbum"}
                </h2>

                <div class="flex flex-col gap-1.5">
                    <label for="album-title" class="text-sm font-medium text-content">Título</label>
                    <Input
                        id="album-title"
                        type="text"
                        maxlength={ALBUM_TITLE_MAX_LENGTH}
                        required
                        bind:value={title}
                    />
                    <FieldError messages={errors.title} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="album-description" class="text-sm font-medium text-content">
                        Descrição
                    </label>
                    <Textarea
                        id="album-description"
                        variant="form"
                        rows={3}
                        maxlength={ALBUM_DESCRIPTION_MAX_LENGTH}
                        bind:value={description}
                    />
                    <FieldError messages={errors.description} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="album-visibility" class="text-sm font-medium text-content">
                        Quem vê
                    </label>
                    <select
                        id="album-visibility"
                        bind:value={visibility}
                        class="w-full rounded-theme border-line bg-canvas px-3 py-2 text-base text-content focus:border-primary focus:ring-primary sm:text-sm"
                    >
                        {#each ALBUM_VISIBILITY_OPTIONS as item}
                            <option value={item.value}>{item.label}</option>
                        {/each}
                    </select>
                    <p class="text-xs text-muted">
                        {currentHint} O perfil privado ainda esconde tudo por cima.
                    </p>
                </div>

                <div class="flex justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onclick={() => (open = false)}
                    >
                        cancelar
                    </Button>
                    <Button size="sm" type="submit" disabled={saving || title.trim() === ""}>
                        {saving ? "salvando..." : album ? "salvar" : "criar álbum"}
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import {
        COMMUNITY_AVATAR_TYPES,
        COMMUNITY_DESCRIPTION_MAX_LENGTH,
        COMMUNITY_NAME_MAX_LENGTH,
        communityAvatarProblem,
        deleteCommunity,
        removeCommunityAvatar,
        updateCommunity,
        uploadCommunityAvatar,
    } from "#lib/community";
    import { toApiError } from "#lib/error";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let community = $derived(data.community);
    let form = $state({ name: "", description: "", is_private: false });
    let errors = $state<Record<string, string[]>>({});
    let avatarError = $state<string | null>(null);
    let saving = $state(false);
    let savingAvatar = $state(false);
    let deleting = $state(false);
    let confirmingDelete = $state(false);
    let confirmationName = $state("");

    // O formulário começa com o que está salvo, e volta a ele a cada comunidade aberta.
    $effect(() => {
        form = {
            name: data.community.name,
            description: data.community.description ?? "",
            is_private: data.community.is_private,
        };
        errors = {};
        avatarError = null;
        confirmingDelete = false;
        confirmationName = "";
    });

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (form.name.trim() === "") return;

        saving = true;
        errors = {};
        try {
            // O PUT substitui a comunidade, então os três campos sempre viajam juntos.
            community = await updateCommunity(community.slug, {
                name: form.name.trim(),
                description: form.description.trim() === "" ? null : form.description.trim(),
                is_private: form.is_private,
            });
            toast.success("Comunidade atualizada");
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
        } finally {
            saving = false;
        }
    }

    async function pickAvatar(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        const problem = communityAvatarProblem(file);
        if (problem) {
            avatarError = problem;
            return;
        }

        avatarError = null;
        savingAvatar = true;
        try {
            community = await uploadCommunityAvatar(community.slug, file);
            toast.success("Imagem atualizada");
        } catch (error) {
            const apiError = toApiError(error);
            if (apiError.status === 413) {
                avatarError = "A imagem precisa ter no máximo 2 MB.";
            } else {
                avatarError = apiError.firstMessageAt("file") ?? null;
                if (avatarError === null) toastApiError(error);
            }
        } finally {
            savingAvatar = false;
        }
    }

    async function removeAvatar() {
        avatarError = null;
        savingAvatar = true;
        try {
            community = await removeCommunityAvatar(community.slug);
            toast.success("Imagem removida");
        } catch (error) {
            toastApiError(error);
        } finally {
            savingAvatar = false;
        }
    }

    async function confirmDelete() {
        deleting = true;
        try {
            await deleteCommunity(community.slug);
            toast.success("Comunidade excluída");
            await goto("/community", { replaceState: true });
        } catch (error) {
            toastApiError(error);
            deleting = false;
            confirmingDelete = false;
        }
    }
</script>

<svelte:head><title>Editar {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Editar comunidade</h1>
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para a comunidade
        </a>
    </div>

    <form
        onsubmit={submit}
        class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <div class="flex flex-wrap items-center gap-4">
            <Avatar
                src={community.avatar_url}
                name={community.name}
                class="size-24 shrink-0"
                textClass="text-3xl"
            />

            <div class="flex flex-col gap-2">
                <label
                    for="avatar"
                    class="inline-flex h-9 cursor-pointer items-center justify-center rounded-theme border border-line bg-surface px-4 text-sm font-medium text-content hover:bg-surface-hover"
                >
                    {savingAvatar ? "enviando..." : "escolher imagem"}
                </label>
                <input
                    id="avatar"
                    type="file"
                    accept={COMMUNITY_AVATAR_TYPES.join(",")}
                    disabled={savingAvatar}
                    onchange={pickAvatar}
                    class="sr-only"
                />

                {#if community.avatar_url}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={savingAvatar}
                        onclick={removeAvatar}
                    >
                        remover imagem
                    </Button>
                {/if}

                <p class="text-xs text-muted">JPEG, PNG, WebP ou GIF, até 2 MB.</p>
                {#if avatarError}
                    <p class="text-xs text-danger">{avatarError}</p>
                {/if}
            </div>
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="name" class="text-sm font-medium text-content">Nome</label>
            <Input
                id="name"
                type="text"
                maxlength={COMMUNITY_NAME_MAX_LENGTH}
                required
                bind:value={form.name}
            />
            <p class="text-xs text-muted">
                O endereço /community/{community.slug} continua o mesmo depois de renomear.
            </p>
            <FieldError messages={errors.name} />
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="description" class="text-sm font-medium text-content">Descrição</label>
            <Textarea
                id="description"
                variant="form"
                rows={5}
                maxlength={COMMUNITY_DESCRIPTION_MAX_LENGTH}
                bind:value={form.description}
            />
            <FieldError messages={errors.description} />
        </div>

        <label class="flex items-start gap-2 text-sm text-content">
            <input
                type="checkbox"
                bind:checked={form.is_private}
                class="mt-0.5 rounded-theme border-line text-primary focus:ring-primary"
            />
            <span>
                Comunidade privada
                <span class="block text-xs text-muted">
                    Entrar passa a depender de aprovação e só quem participa vê a lista de membros.
                </span>
            </span>
        </label>

        <div class="flex justify-end">
            <Button type="submit" disabled={saving || form.name.trim() === ""}>
                salvar alterações
            </Button>
        </div>
    </form>

    <section class="flex flex-col gap-3 rounded-theme border border-danger bg-surface p-4">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">
            Excluir comunidade
        </h2>
        <p class="text-sm text-muted">
            A exclusão é definitiva e leva junto os membros e os pedidos de entrada. Não dá para
            desfazer.
        </p>
        <div class="flex justify-end">
            <Button variant="danger" disabled={deleting} onclick={() => (confirmingDelete = true)}>
                excluir comunidade
            </Button>
        </div>
    </section>
</main>

{#if confirmingDelete}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
            class="flex w-full max-w-md flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 class="text-base font-bold text-content">Excluir {community.name}</h2>
            <p class="text-sm text-muted">
                Para confirmar, digite o nome da comunidade exatamente como ele aparece acima.
            </p>

            <Input type="text" bind:value={confirmationName} placeholder={community.name} />

            <div class="flex justify-end gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={deleting}
                    onclick={() => (confirmingDelete = false)}
                >
                    cancelar
                </Button>
                <Button
                    size="sm"
                    variant="danger"
                    disabled={deleting || confirmationName !== community.name}
                    onclick={confirmDelete}
                >
                    excluir para sempre
                </Button>
            </div>
        </div>
    </div>
{/if}

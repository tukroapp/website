<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import { EMAIL_GATE_HINT } from "#lib/verification";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import { compressImage } from "#lib/image";
    import {
        COMMUNITY_AVATAR_TYPES,
        COMMUNITY_DESCRIPTION_MAX_LENGTH,
        COMMUNITY_NAME_MAX_LENGTH,
        communityAvatarProblem,
        createCommunity,
        uploadCommunityAvatar,
    } from "#lib/community";

    let form = $state({ name: "", description: "", is_private: false });
    let errors = $state<Record<string, string[]>>({});
    let saving = $state(false);

    /** O endpoint de avatar precisa de uma comunidade existente, então o arquivo espera a criação. */
    let avatarFile = $state<File | null>(null);
    let avatarPreview = $state<string | null>(null);
    let avatarError = $state<string | null>(null);
    let compressingAvatar = $state(false);

    async function pickAvatar(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const chosen = input.files?.[0];
        input.value = "";
        if (!chosen) return;

        // O limite vale para o arquivo cru; a compressão depois só alivia o bucket.
        const problem = communityAvatarProblem(chosen);
        if (problem) {
            avatarError = problem;
            return;
        }

        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        avatarError = null;
        avatarFile = null;
        avatarPreview = null;
        compressingAvatar = true;
        try {
            avatarFile = await compressImage(chosen);
        } finally {
            compressingAvatar = false;
        }
        avatarPreview = URL.createObjectURL(avatarFile);
    }

    function clearAvatar() {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        avatarFile = null;
        avatarPreview = null;
        avatarError = null;
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (form.name.trim() === "") return;

        saving = true;
        errors = {};
        try {
            const community = await createCommunity({
                name: form.name.trim(),
                description: form.description.trim() === "" ? null : form.description.trim(),
                is_private: form.is_private,
            });

            if (avatarFile) {
                try {
                    await uploadCommunityAvatar(community.slug, avatarFile);
                } catch (error) {
                    // A comunidade já existe, então o upload falhar não é um beco sem saída.
                    toastApiError(error);
                }
            }

            toast.success("Comunidade criada");
            await goto(`/community/${community.slug}`, { replaceState: true });
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
            saving = false;
        }
    }
</script>

<svelte:head><title>Criar comunidade | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Criar comunidade</h1>
        <a href="/community" class="text-sm text-primary underline underline-offset-2">
            voltar para comunidades
        </a>
    </div>

    <form
        onsubmit={submit}
        class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <div class="flex flex-wrap items-center gap-4">
            <Avatar
                src={avatarPreview}
                name={form.name || "?"}
                class="size-24 shrink-0"
                textClass="text-3xl"
            />

            <div class="flex flex-col gap-2">
                <label
                    for="avatar"
                    class="inline-flex h-9 cursor-pointer items-center justify-center rounded-theme border border-line bg-surface px-4 text-sm font-medium text-content hover:bg-surface-hover"
                >
                    {compressingAvatar ? "comprimindo..." : "escolher imagem"}
                </label>
                <input
                    id="avatar"
                    type="file"
                    accept={COMMUNITY_AVATAR_TYPES.join(",")}
                    disabled={compressingAvatar}
                    onchange={pickAvatar}
                    class="sr-only"
                />

                {#if avatarFile}
                    <Button size="sm" variant="outline" onclick={clearAvatar}>
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
                O endereço da comunidade vem do nome e não muda depois, nem se você renomear.
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
                    Todo mundo vê o nome, a descrição e o total de membros, mas entrar depende da
                    aprovação de um moderador e só quem participa vê a lista de membros.
                </span>
            </span>
        </label>

        <div class="flex justify-end">
            <Button
                type="submit"
                disabled={saving || form.name.trim() === "" || !auth.canWrite}
                title={auth.canWrite ? undefined : EMAIL_GATE_HINT}
            >
                criar comunidade
            </Button>
        </div>
    </form>
</main>

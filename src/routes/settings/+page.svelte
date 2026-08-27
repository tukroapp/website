<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { ApiError, toApiError } from "#lib/error";
    import { toastApiError } from "#lib/toast";
    import { sendVerificationEmail } from "#lib/account";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import ThemeSwitcher from "#lib/components/ThemeSwitcher.svelte";
    import { auth } from "#lib/state/user.svelte";
    import type { MeResponse, PrivacySettings, Visibility } from "#lib/types";

    const MIN_PASSWORD_LENGTH = 8;
    const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
    const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
        { value: "everyone", label: "Todos" },
        { value: "friends", label: "Somente amigos" },
        { value: "nobody", label: "Somente eu" },
    ];

    type VisibilityKey = Exclude<keyof PrivacySettings, "show_profile_visits">;

    const PRIVACY_FIELDS: { key: VisibilityKey; label: string; hint: string }[] = [
        {
            key: "profile_visibility",
            label: "Quem vê meu perfil",
            hint: "Vale para o perfil completo, incluindo a lista de amigos.",
        },
        { key: "scrap_read", label: "Quem lê meus recados", hint: "" },
        { key: "scrap_write", label: "Quem escreve no meu mural", hint: "" },
        { key: "testimonial_write", label: "Quem envia depoimentos", hint: "" },
        { key: "message_receive", label: "Quem me manda mensagem", hint: "" },
    ];

    const user = $derived(auth.user as MeResponse);

    let profileForm = $state({
        name: "",
        status: "",
        city: "",
        birthdate: "",
        bio: "",
    });
    let privacyForm = $state<PrivacySettings>({
        profile_visibility: "everyone",
        scrap_read: "everyone",
        scrap_write: "friends",
        testimonial_write: "friends",
        show_profile_visits: true,
        message_receive: "friends",
    });
    let passwordForm = $state({
        old_password: "",
        new_password: "",
        new_password_confirmation: "",
    });

    let profileErrors = $state<Record<string, string[]>>({});
    let privacyErrors = $state<Record<string, string[]>>({});
    let passwordErrors = $state<Record<string, string[]>>({});

    let avatarError = $state<string | null>(null);
    let savingAvatar = $state(false);
    let savingProfile = $state(false);
    let savingPrivacy = $state(false);
    let savingPassword = $state(false);
    let sendingEmail = $state(false);
    let confirmingLogoutAll = $state(false);
    let loggingOutAll = $state(false);

    $effect(() => {
        hydrate(auth.user);
    });

    function hydrate(me: MeResponse | null) {
        if (!me) return;
        profileForm = {
            name: me.name,
            status: me.status ?? "",
            city: me.city ?? "",
            birthdate: me.birthdate ?? "",
            bio: me.bio ?? "",
        };
        privacyForm = {
            profile_visibility: me.profile_visibility,
            scrap_read: me.scrap_read,
            scrap_write: me.scrap_write,
            testimonial_write: me.testimonial_write,
            show_profile_visits: me.show_profile_visits,
            message_receive: me.message_receive,
        };
    }

    /** Input vazio significa "sem valor" para o backend, que grava null. */
    function orNull(value: string): string | null {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }

    function handleError(error: unknown): Record<string, string[]> {
        return toastApiError(error).fieldMessages();
    }

    async function saveProfile(event: SubmitEvent) {
        event.preventDefault();
        savingProfile = true;
        profileErrors = {};
        try {
            await auth.updateProfile({
                name: profileForm.name.trim(),
                status: orNull(profileForm.status),
                city: orNull(profileForm.city),
                birthdate: orNull(profileForm.birthdate),
                bio: orNull(profileForm.bio),
                // PUT /me substitui tudo, então a foto atual tem que ir junto.
                avatar_url: user.avatar_url,
            });
            toast.success("Perfil atualizado");
        } catch (error) {
            profileErrors = handleError(error);
        } finally {
            savingProfile = false;
        }
    }

    async function pickAvatar(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        if (!AVATAR_TYPES.includes(file.type)) {
            avatarError = "Formato não aceito. Use JPEG, PNG, WebP ou GIF.";
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            avatarError = "A imagem precisa ter no máximo 2 MB.";
            return;
        }

        avatarError = null;
        savingAvatar = true;
        try {
            await auth.uploadAvatar(file);
            toast.success("Foto atualizada");
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
            await auth.removeAvatar();
            toast.success("Foto removida");
        } catch (error) {
            toastApiError(error);
        } finally {
            savingAvatar = false;
        }
    }

    async function savePrivacy(event: SubmitEvent) {
        event.preventDefault();
        savingPrivacy = true;
        privacyErrors = {};
        try {
            // Mandar só os campos de privacidade mais o nome obrigatório deixa o perfil intacto.
            await auth.updateProfile({ name: user.name, ...privacyForm });
            toast.success("Privacidade atualizada");
        } catch (error) {
            privacyErrors = handleError(error);
        } finally {
            savingPrivacy = false;
        }
    }

    async function resendVerification() {
        sendingEmail = true;
        try {
            await sendVerificationEmail();
            toast.success("E-mail enviado, confira sua caixa de entrada");
        } catch (error) {
            if (error instanceof ApiError && error.status === 429) {
                toast.error("Aguarde alguns instantes antes de pedir outro e-mail");
            } else if (
                error instanceof ApiError &&
                error.errorsAt("email").at(0)?.code === "already_verified"
            ) {
                await auth.fetchUser();
            } else {
                toastApiError(error);
            }
        } finally {
            sendingEmail = false;
        }
    }

    async function changePassword(event: SubmitEvent) {
        event.preventDefault();
        passwordErrors = {};

        if (passwordForm.new_password.length < MIN_PASSWORD_LENGTH) {
            passwordErrors = {
                new_password: [`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`],
            };
            return;
        }
        if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
            passwordErrors = { new_password_confirmation: ["As senhas não coincidem"] };
            return;
        }

        savingPassword = true;
        try {
            await auth.changePassword({ ...passwordForm });
            passwordForm = { old_password: "", new_password: "", new_password_confirmation: "" };
            toast.success("Senha alterada, os outros dispositivos foram desconectados");
        } catch (error) {
            passwordErrors = handleError(error);
        } finally {
            savingPassword = false;
        }
    }

    async function logoutAll() {
        loggingOutAll = true;
        try {
            await auth.logoutAll();
            toast.success("Todas as sessões foram encerradas");
            await goto("/login");
        } catch (error) {
            toastApiError(error);
            loggingOutAll = false;
            confirmingLogoutAll = false;
        }
    }
</script>

<svelte:head><title>Configurações | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <h1 class="text-lg font-bold text-content">Configurações</h1>

    <form
        onsubmit={saveProfile}
        class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">Perfil</h2>

        <div class="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
            <span class="text-muted">endereço</span>
            <span class="text-content">/@{user.slug}</span>
            <span class="text-muted">e-mail</span>
            <span class="text-content">{user.email}</span>
        </div>

        <div class="flex flex-wrap items-center gap-4">
            <Avatar
                src={user.avatar_url}
                name={user.name}
                class="size-24 shrink-0"
                textClass="text-3xl"
            />

            <div class="flex flex-col gap-2">
                <label
                    for="avatar"
                    class="inline-flex h-9 cursor-pointer items-center justify-center rounded-theme border border-line bg-surface px-4 text-sm font-medium text-content hover:bg-surface-hover"
                >
                    {savingAvatar ? "enviando..." : "escolher foto"}
                </label>
                <input
                    id="avatar"
                    type="file"
                    accept={AVATAR_TYPES.join(",")}
                    disabled={savingAvatar}
                    onchange={pickAvatar}
                    class="sr-only"
                />

                {#if user.avatar_url}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={savingAvatar}
                        onclick={removeAvatar}
                    >
                        remover foto
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
            <Input id="name" type="text" maxlength={80} required bind:value={profileForm.name} />
            <FieldError messages={profileErrors.name} />
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="status" class="text-sm font-medium text-content">Status</label>
            <Input
                id="status"
                type="text"
                placeholder="Uma frase boba"
                bind:value={profileForm.status}
            />
            <FieldError messages={profileErrors.status} />
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="city" class="text-sm font-medium text-content">Cidade</label>
            <Input id="city" type="text" bind:value={profileForm.city} />
            <FieldError messages={profileErrors.city} />
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="birthdate" class="text-sm font-medium text-content">
                Data de nascimento
            </label>
            <Input id="birthdate" type="date" bind:value={profileForm.birthdate} />
            <FieldError messages={profileErrors.birthdate} />
        </div>

        <div class="flex flex-col gap-1.5">
            <label for="bio" class="text-sm font-medium text-content">Sobre você</label>
            <Textarea id="bio" variant="form" rows={4} bind:value={profileForm.bio} />
            <FieldError messages={profileErrors.bio} />
        </div>

        <div class="flex justify-end">
            <Button type="submit" disabled={savingProfile}>salvar perfil</Button>
        </div>
    </form>

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">Aparência</h2>
        <ThemeSwitcher />
    </section>

    <form
        onsubmit={savePrivacy}
        class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">Privacidade</h2>

        {#each PRIVACY_FIELDS as field}
            <div class="flex flex-col gap-1.5">
                <label for={field.key} class="text-sm font-medium text-content">{field.label}</label
                >
                <select
                    id={field.key}
                    bind:value={privacyForm[field.key]}
                    class="w-full rounded-theme border-line bg-canvas px-3 py-2 text-base text-content focus:border-primary focus:ring-primary sm:text-sm"
                >
                    {#each VISIBILITY_OPTIONS as option}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
                {#if field.hint}
                    <p class="text-xs text-muted">{field.hint}</p>
                {/if}
                <FieldError messages={privacyErrors[field.key]} />
            </div>
        {/each}

        <label class="flex items-start gap-2 text-sm text-content">
            <input
                type="checkbox"
                bind:checked={privacyForm.show_profile_visits}
                class="mt-0.5 rounded-theme border-line text-primary focus:ring-primary"
            />
            <span>
                Mostrar visitas ao perfil
                <span class="block text-xs text-muted">
                    Vale dos dois lados: você vê quem visitou seu perfil e suas visitas aparecem
                    para os perfis que você visita. Desligado, nenhuma visita é registrada.
                </span>
            </span>
        </label>
        <FieldError messages={privacyErrors.show_profile_visits} />

        <div class="flex justify-end">
            <Button type="submit" disabled={savingPrivacy}>salvar privacidade</Button>
        </div>
    </form>

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">E-mail</h2>

        <p class="text-sm text-content">{user.email}</p>

        {#if user.is_email_verified}
            <p class="text-sm text-muted">E-mail verificado.</p>
        {:else}
            <p class="text-sm text-muted">
                Seu e-mail ainda não foi verificado. O link vale por 30 minutos e pode demorar
                alguns segundos para chegar.
            </p>
            <div class="flex justify-end">
                <Button variant="outline" disabled={sendingEmail} onclick={resendVerification}>
                    reenviar e-mail de verificação
                </Button>
            </div>
        {/if}
    </section>

    {#if user.is_google}
        <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
            <h2 class="border-b border-line pb-1 text-base font-bold text-content">Senha</h2>
            <p class="text-sm text-muted">
                Esta conta entra pelo Google e não usa senha. Quem cuida do acesso é a sua conta
                Google, e é lá que a senha se troca.
            </p>
        </section>
    {:else}
        <form
            onsubmit={changePassword}
            class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 class="border-b border-line pb-1 text-base font-bold text-content">Senha</h2>

            <div class="flex flex-col gap-1.5">
                <label for="old_password" class="text-sm font-medium text-content">
                    Senha atual
                </label>
                <Input
                    id="old_password"
                    type="password"
                    autocomplete="current-password"
                    required
                    bind:value={passwordForm.old_password}
                />
                <FieldError messages={passwordErrors.old_password} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="new_password" class="text-sm font-medium text-content">Nova senha</label
                >
                <Input
                    id="new_password"
                    type="password"
                    autocomplete="new-password"
                    minlength={MIN_PASSWORD_LENGTH}
                    required
                    bind:value={passwordForm.new_password}
                />
                <FieldError messages={passwordErrors.new_password} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="new_password_confirmation" class="text-sm font-medium text-content">
                    Repita a nova senha
                </label>
                <Input
                    id="new_password_confirmation"
                    type="password"
                    autocomplete="new-password"
                    required
                    bind:value={passwordForm.new_password_confirmation}
                />
                <FieldError messages={passwordErrors.new_password_confirmation} />
            </div>

            <div class="flex justify-end">
                <Button type="submit" disabled={savingPassword}>alterar senha</Button>
            </div>
        </form>
    {/if}

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
        <h2 class="border-b border-line pb-1 text-base font-bold text-content">Sessões</h2>
        <p class="text-sm text-muted">
            Encerra o acesso em todos os aparelhos, inclusive neste. Você vai precisar entrar de
            novo.
        </p>
        <div class="flex flex-wrap justify-between gap-2">
            <a href="/settings/blocks" class="text-sm text-primary underline underline-offset-2">
                perfis bloqueados
            </a>
            <Button
                variant="outline"
                disabled={loggingOutAll}
                onclick={() => (confirmingLogoutAll = true)}
            >
                sair de todos os dispositivos
            </Button>
        </div>
    </section>
</main>

{#if confirmingLogoutAll}
    <ConfirmDialog
        title="Sair de todos os dispositivos"
        confirmLabel="encerrar tudo"
        busy={loggingOutAll}
        onconfirm={logoutAll}
        oncancel={() => (confirmingLogoutAll = false)}
    >
        Todas as sessões serão encerradas, inclusive esta. Tem certeza?
    </ConfirmDialog>
{/if}

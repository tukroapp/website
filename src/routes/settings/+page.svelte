<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { toApiError } from "#lib/error";
    import { compressImage } from "#lib/image";
    import { toastApiError } from "#lib/toast";
    import { deactivateAccount, scheduleAccountDeletion } from "#lib/account";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import TagInput from "#lib/components/TagInput.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import ThemeSwitcher from "#lib/components/ThemeSwitcher.svelte";
    import { LANGUAGES_MAX_ITEMS, LIST_MAX_ITEMS, RELATIONSHIP_STATUS_OPTIONS } from "#lib/profile";
    import { emailResend } from "#lib/state/emailResend.svelte";
    import { auth } from "#lib/state/user.svelte";
    import { formatDate } from "#lib/time";
    import { resendVerificationEmail } from "#lib/verification";
    import type { MeResponse, PrivacySettings, RelationshipStatus, Visibility } from "#lib/types";

    type ProfileTab = "social" | "professional" | "personal";

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

    let profileTab = $state<ProfileTab>("social");

    /** Espelha o perfil inteiro: o PUT substitui, então tudo precisa ir junto em cada gravação. */
    let profileForm = $state({
        name: "",
        status: "",
        city: "",
        birthdate: "",
        bio: "",
        relationship_status: "" as RelationshipStatus | "",
        country: "",
        state: "",
        languages: [] as string[],
        interests: [] as string[],
        who_i_want_to_meet: "",
        occupation: "",
        company: "",
        education: "",
        music: [] as string[],
        movies: [] as string[],
        books: [] as string[],
        tv_shows: [] as string[],
        foods: [] as string[],
        sports: [] as string[],
        pets: "",
        fashion_style: "",
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

    let accountAction = $state<"deactivate" | "delete" | null>(null);
    let accountPassword = $state("");
    let accountBusy = $state(false);
    let accountError = $state<string | null>(null);
    /** Depois do 200 da exclusão a tela troca para a confirmação com a data. */
    let deletionScheduledFor = $state<string | null>(null);

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
            relationship_status: me.relationship_status ?? "",
            country: me.country ?? "",
            state: me.state ?? "",
            languages: [...me.languages],
            interests: [...me.interests],
            who_i_want_to_meet: me.who_i_want_to_meet ?? "",
            occupation: me.occupation ?? "",
            company: me.company ?? "",
            education: me.education ?? "",
            music: [...me.music],
            movies: [...me.movies],
            books: [...me.books],
            tv_shows: [...me.tv_shows],
            foods: [...me.foods],
            sports: [...me.sports],
            pets: me.pets ?? "",
            fashion_style: me.fashion_style ?? "",
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
                relationship_status: profileForm.relationship_status || null,
                country: orNull(profileForm.country),
                state: orNull(profileForm.state),
                languages: profileForm.languages,
                interests: profileForm.interests,
                who_i_want_to_meet: orNull(profileForm.who_i_want_to_meet),
                occupation: orNull(profileForm.occupation),
                company: orNull(profileForm.company),
                education: orNull(profileForm.education),
                music: profileForm.music,
                movies: profileForm.movies,
                books: profileForm.books,
                tv_shows: profileForm.tv_shows,
                foods: profileForm.foods,
                sports: profileForm.sports,
                pets: orNull(profileForm.pets),
                fashion_style: orNull(profileForm.fashion_style),
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
        const chosen = input.files?.[0];
        input.value = "";
        if (!chosen) return;

        if (!AVATAR_TYPES.includes(chosen.type)) {
            avatarError = "Formato não aceito. Use JPEG, PNG, WebP ou GIF.";
            return;
        }
        if (chosen.size > AVATAR_MAX_BYTES) {
            avatarError = "A imagem precisa ter no máximo 2 MB.";
            return;
        }

        avatarError = null;
        savingAvatar = true;
        try {
            // O limite vale para o arquivo cru; a compressão depois só alivia o bucket.
            const compressed = await compressImage(chosen);
            await auth.uploadAvatar(compressed);
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

    // A contagem regressiva do botão de reenviar só precisa andar se o e-mail não foi confirmado.
    $effect(() => {
        if (auth.user && !auth.user.is_email_verified) return emailResend.watch();
    });

    async function resendVerification() {
        if (sendingEmail || emailResend.secondsLeft > 0) return;
        sendingEmail = true;
        try {
            await resendVerificationEmail();
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

    function openAccountAction(action: "deactivate" | "delete") {
        accountAction = action;
        accountPassword = "";
        accountError = null;
    }

    async function confirmAccountAction() {
        if (accountBusy) return;
        // Conta com senha precisa informar; conta Google manda vazio, a sessão já prova.
        if (!user.is_google && accountPassword.trim() === "") {
            accountError = "Digite sua senha atual para confirmar.";
            return;
        }

        accountBusy = true;
        accountError = null;
        try {
            if (accountAction === "deactivate") {
                await deactivateAccount(accountPassword);
                auth.clear();
                toast.success("Conta desativada. Entre de novo quando quiser voltar.");
                await goto("/login");
            } else {
                const scheduled = await scheduleAccountDeletion(accountPassword);
                auth.clear();
                accountAction = null;
                deletionScheduledFor = scheduled.scheduled_for;
            }
        } catch (error) {
            const apiError = toApiError(error);
            if (apiError.status === 400) {
                accountError = apiError.firstMessageAt("password") ?? "Senha inválida.";
            } else {
                toastApiError(error);
            }
        } finally {
            accountBusy = false;
        }
    }
</script>

<svelte:head><title>Configurações | Tukro</title></svelte:head>

{#if deletionScheduledFor}
    <main class="mx-auto flex w-full max-w-md flex-col gap-3 p-3">
        <h1 class="text-lg font-bold text-content">Exclusão agendada</h1>
        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4 text-sm">
            <p class="text-content">
                Sua conta será excluída em {formatDate(deletionScheduledFor)}. Até lá o perfil fica
                fora do ar.
            </p>
            <p class="text-muted">
                Não existe botão de cancelar: para desistir, basta entrar de novo antes dessa data,
                e o login desfaz o agendamento.
            </p>
            <div>
                <Button onclick={() => goto("/login")}>ir para o login</Button>
            </div>
        </div>
    </main>
{:else if auth.user}
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
                <Input
                    id="name"
                    type="text"
                    maxlength={80}
                    required
                    bind:value={profileForm.name}
                />
                <FieldError messages={profileErrors.name} />
            </div>

            <div class="flex flex-wrap gap-2 border-b border-line pb-3">
                <TabPill active={profileTab === "social"} onclick={() => (profileTab = "social")}>
                    social
                </TabPill>
                <TabPill
                    active={profileTab === "professional"}
                    onclick={() => (profileTab = "professional")}
                >
                    profissional
                </TabPill>
                <TabPill
                    active={profileTab === "personal"}
                    onclick={() => (profileTab = "personal")}
                >
                    pessoal
                </TabPill>
            </div>

            {#if profileTab === "social"}
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
                    <label for="bio" class="text-sm font-medium text-content">Quem sou eu</label>
                    <Textarea id="bio" variant="form" rows={4} bind:value={profileForm.bio} />
                    <FieldError messages={profileErrors.bio} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="relationship_status" class="text-sm font-medium text-content">
                        Estado civil
                    </label>
                    <select
                        id="relationship_status"
                        bind:value={profileForm.relationship_status}
                        class="w-full rounded-theme border-line bg-canvas px-3 py-2 text-base text-content focus:border-primary focus:ring-primary sm:text-sm"
                    >
                        <option value="">Não informado</option>
                        {#each RELATIONSHIP_STATUS_OPTIONS as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <FieldError messages={profileErrors.relationship_status} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="birthdate" class="text-sm font-medium text-content">
                        Data de nascimento
                    </label>
                    <Input id="birthdate" type="date" bind:value={profileForm.birthdate} />
                    <FieldError messages={profileErrors.birthdate} />
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="flex flex-col gap-1.5">
                        <label for="country" class="text-sm font-medium text-content">País</label>
                        <Input
                            id="country"
                            type="text"
                            maxlength={80}
                            bind:value={profileForm.country}
                        />
                        <FieldError messages={profileErrors.country} />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="state" class="text-sm font-medium text-content">Estado</label>
                        <Input
                            id="state"
                            type="text"
                            maxlength={80}
                            bind:value={profileForm.state}
                        />
                        <FieldError messages={profileErrors.state} />
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="city" class="text-sm font-medium text-content">Cidade</label>
                    <Input id="city" type="text" bind:value={profileForm.city} />
                    <FieldError messages={profileErrors.city} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="languages" class="text-sm font-medium text-content">Idiomas</label>
                    <TagInput
                        id="languages"
                        maxItems={LANGUAGES_MAX_ITEMS}
                        placeholder="Português, Inglês..."
                        bind:value={profileForm.languages}
                    />
                    <FieldError messages={profileErrors.languages} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="interests" class="text-sm font-medium text-content"
                        >Interesses</label
                    >
                    <TagInput
                        id="interests"
                        maxItems={LIST_MAX_ITEMS}
                        placeholder="Fliperama, rock progressivo..."
                        bind:value={profileForm.interests}
                    />
                    <FieldError messages={profileErrors.interests} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="who_i_want_to_meet" class="text-sm font-medium text-content">
                        Quem eu quero conhecer
                    </label>
                    <Textarea
                        id="who_i_want_to_meet"
                        variant="form"
                        rows={3}
                        bind:value={profileForm.who_i_want_to_meet}
                    />
                    <FieldError messages={profileErrors.who_i_want_to_meet} />
                </div>
            {:else if profileTab === "professional"}
                <div class="flex flex-col gap-1.5">
                    <label for="occupation" class="text-sm font-medium text-content">Ocupação</label
                    >
                    <Input
                        id="occupation"
                        type="text"
                        maxlength={120}
                        bind:value={profileForm.occupation}
                    />
                    <FieldError messages={profileErrors.occupation} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="company" class="text-sm font-medium text-content">Empresa</label>
                    <Input
                        id="company"
                        type="text"
                        maxlength={120}
                        bind:value={profileForm.company}
                    />
                    <FieldError messages={profileErrors.company} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="education" class="text-sm font-medium text-content">Formação</label>
                    <Input
                        id="education"
                        type="text"
                        maxlength={200}
                        bind:value={profileForm.education}
                    />
                    <FieldError messages={profileErrors.education} />
                </div>
            {:else}
                <div class="flex flex-col gap-1.5">
                    <label for="music" class="text-sm font-medium text-content">Músicas</label>
                    <TagInput id="music" maxItems={LIST_MAX_ITEMS} bind:value={profileForm.music} />
                    <FieldError messages={profileErrors.music} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="movies" class="text-sm font-medium text-content">Filmes</label>
                    <TagInput
                        id="movies"
                        maxItems={LIST_MAX_ITEMS}
                        bind:value={profileForm.movies}
                    />
                    <FieldError messages={profileErrors.movies} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="books" class="text-sm font-medium text-content">Livros</label>
                    <TagInput id="books" maxItems={LIST_MAX_ITEMS} bind:value={profileForm.books} />
                    <FieldError messages={profileErrors.books} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="tv_shows" class="text-sm font-medium text-content">Séries</label>
                    <TagInput
                        id="tv_shows"
                        maxItems={LIST_MAX_ITEMS}
                        bind:value={profileForm.tv_shows}
                    />
                    <FieldError messages={profileErrors.tv_shows} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="foods" class="text-sm font-medium text-content">Comidas</label>
                    <TagInput id="foods" maxItems={LIST_MAX_ITEMS} bind:value={profileForm.foods} />
                    <FieldError messages={profileErrors.foods} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="sports" class="text-sm font-medium text-content">Esportes</label>
                    <TagInput
                        id="sports"
                        maxItems={LIST_MAX_ITEMS}
                        bind:value={profileForm.sports}
                    />
                    <FieldError messages={profileErrors.sports} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="pets" class="text-sm font-medium text-content">Bichos</label>
                    <Input id="pets" type="text" maxlength={120} bind:value={profileForm.pets} />
                    <FieldError messages={profileErrors.pets} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="fashion_style" class="text-sm font-medium text-content"
                        >Estilo</label
                    >
                    <Input
                        id="fashion_style"
                        type="text"
                        maxlength={120}
                        bind:value={profileForm.fashion_style}
                    />
                    <FieldError messages={profileErrors.fashion_style} />
                </div>
            {/if}

            <div class="flex justify-end border-t border-line pt-3">
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
                    <label for={field.key} class="text-sm font-medium text-content"
                        >{field.label}</label
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
                    <Button
                        variant="outline"
                        disabled={sendingEmail || emailResend.secondsLeft > 0}
                        onclick={resendVerification}
                    >
                        {emailResend.secondsLeft > 0
                            ? `reenviar em ${emailResend.secondsLeft}s`
                            : "reenviar e-mail de verificação"}
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
                    <label for="new_password" class="text-sm font-medium text-content"
                        >Nova senha</label
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
                <a
                    href="/settings/blocks"
                    class="text-sm text-primary underline underline-offset-2"
                >
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

        <section class="flex flex-col gap-3 rounded-theme border border-danger bg-surface p-4">
            <h2 class="border-b border-line pb-1 text-base font-bold text-content">Conta</h2>

            <div class="flex flex-col gap-1">
                <p class="text-sm font-medium text-content">Desativar</p>
                <p class="text-sm text-muted">
                    O perfil some do site e as sessões caem. Nada é apagado: é só entrar de novo
                    para reativar.
                </p>
                <div class="mt-1">
                    <Button
                        variant="outline"
                        disabled={accountBusy}
                        onclick={() => openAccountAction("deactivate")}
                    >
                        desativar conta
                    </Button>
                </div>
            </div>

            <div class="flex flex-col gap-1 border-t border-line pt-3">
                <p class="text-sm font-medium text-content">Excluir</p>
                <p class="text-sm text-muted">
                    Agenda a exclusão para daqui a 30 dias. Dá para desistir entrando de novo antes
                    do prazo. Passado o prazo, a conta é anonimizada e não volta mais.
                </p>
                <div class="mt-1">
                    <Button
                        variant="danger"
                        disabled={accountBusy}
                        onclick={() => openAccountAction("delete")}
                    >
                        excluir conta
                    </Button>
                </div>
            </div>
        </section>
    </main>
{/if}

{#if accountAction && auth.user}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form
            onsubmit={(event) => {
                event.preventDefault();
                confirmAccountAction();
            }}
            class="flex w-full max-w-md flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <h2 class="text-base font-bold text-content">
                {accountAction === "deactivate" ? "Desativar conta" : "Excluir conta"}
            </h2>

            {#if accountAction === "deactivate"}
                <p class="text-sm text-muted">
                    Seu perfil sai do ar e você é desconectado de todos os aparelhos. Para voltar, é
                    só entrar de novo: nada é perdido.
                </p>
            {:else}
                <p class="text-sm text-muted">
                    A exclusão é agendada para daqui a 30 dias e seu perfil sai do ar agora. Você é
                    desconectado de todos os aparelhos. Para cancelar, basta entrar de novo antes do
                    prazo. Depois disso, a conta é anonimizada de forma definitiva.
                </p>
            {/if}

            {#if !user.is_google}
                <div class="flex flex-col gap-1.5">
                    <label for="account-password" class="text-sm font-medium text-content">
                        Senha atual
                    </label>
                    <Input
                        id="account-password"
                        type="password"
                        autocomplete="current-password"
                        bind:value={accountPassword}
                    />
                </div>
            {/if}

            {#if accountError}
                <p class="text-sm text-danger">{accountError}</p>
            {/if}

            <div class="flex justify-end gap-2">
                <Button
                    variant="outline"
                    disabled={accountBusy}
                    onclick={() => (accountAction = null)}
                >
                    cancelar
                </Button>
                <Button
                    variant={accountAction === "deactivate" ? "primary" : "danger"}
                    type="submit"
                    disabled={accountBusy}
                >
                    {accountAction === "deactivate" ? "desativar" : "excluir conta"}
                </Button>
            </div>
        </form>
    </div>
{/if}

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

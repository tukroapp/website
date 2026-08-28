<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import { toastApiError } from "#lib/toast";
    import { EMAIL_GATE_HINT } from "#lib/verification";
    import { isBlankBbcode } from "#lib/bbcode";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import RichTextarea from "#lib/components/RichTextarea.svelte";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import { TOPIC_BODY_MAX_LENGTH, TOPIC_TITLE_MAX_LENGTH, createTopic } from "#lib/topic";

    let { data } = $props();

    let form = $state({ title: "", body: "" });
    let errors = $state<Record<string, string[]>>({});
    let saving = $state(false);

    const community = $derived(data.community);
    const isMember = $derived(community.my_role !== null);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (form.title.trim() === "" || isBlankBbcode(form.body)) return;

        saving = true;
        errors = {};
        try {
            const topic = await createTopic(community.slug, {
                title: form.title.trim(),
                body: form.body.trim(),
            });
            toast.success("Tópico criado");
            await goto(`/community/${community.slug}/topic/${topic.id}`, { replaceState: true });
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
            saving = false;
        }
    }
</script>

<svelte:head><title>Novo tópico em {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Novo tópico em {community.name}</h1>
        <a
            href="/community/{community.slug}/topic"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para o fórum
        </a>
    </div>

    {#if !isMember}
        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <p class="text-sm text-muted">Entre na comunidade para abrir um tópico no fórum.</p>
            {#if auth.isAuthenticated}
                <a
                    href="/community/{community.slug}"
                    class="text-sm text-primary underline underline-offset-2"
                >
                    participar da comunidade
                </a>
            {:else}
                <a
                    href={loginUrl(page.url.pathname)}
                    class="text-sm text-primary underline underline-offset-2"
                >
                    entrar na sua conta
                </a>
            {/if}
        </div>
    {:else}
        <form
            onsubmit={submit}
            class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-3"
        >
            <div class="flex flex-col gap-1">
                <label for="title" class="text-sm font-bold text-content">Título</label>
                <input
                    id="title"
                    bind:value={form.title}
                    maxlength={TOPIC_TITLE_MAX_LENGTH}
                    placeholder="Sobre o que é o tópico"
                    class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
                <FieldError messages={errors.title} />
            </div>

            <div class="flex flex-col gap-1">
                <label for="body" class="text-sm font-bold text-content">Mensagem</label>
                <RichTextarea
                    id="body"
                    bind:value={form.body}
                    rows={10}
                    maxlength={TOPIC_BODY_MAX_LENGTH}
                    placeholder="Escreva a mensagem de abertura"
                />
                <FieldError messages={errors.body} />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <Button
                    type="submit"
                    size="sm"
                    disabled={saving ||
                        form.title.trim() === "" ||
                        isBlankBbcode(form.body) ||
                        !auth.canWrite}
                    title={auth.canWrite ? undefined : EMAIL_GATE_HINT}
                >
                    {saving ? "publicando..." : "publicar tópico"}
                </Button>
                <span class="text-xs text-muted">
                    {TOPIC_BODY_MAX_LENGTH - form.body.length} caracteres restantes
                </span>
            </div>
        </form>
    {/if}
</main>

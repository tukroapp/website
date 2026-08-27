# Contribuindo com o Tukro

Obrigado pelo interesse. O Tukro é um projeto pessoal, então algumas coisas funcionam
diferente de um projeto de empresa: o rumo do produto é meu, e prefiro dizer isso logo na
entrada a recusar o seu trabalho depois de pronto.

## Abra uma issue antes de mandar código

Pull request sem issue discutida antes é fechado, mesmo com o código bom. É para você não
perder um fim de semana numa mudança que eu não quero no produto.

O caminho é: abra uma issue, a gente combina o que fazer, aí você manda o PR.

Correção de erro de digitação e de texto quebrado pode vir direto, sem issue.

## Antes de começar

Leia a seção Backend do [README](README.md). O backend é fechado, mas existe um staging
real contra o qual o front funciona inteiro. A URL e o seu login não estão no
repositório: quando a gente combinar o escopo na issue, eu te passo o endereço e as
credenciais. O staging desliga upload de arquivo e cadastro, e o banco é resetado todo
dia, então trabalhe assumindo que o que você criar some de manhã.

## Antes de abrir o PR

Estes dois comandos precisam passar limpos:

```sh
bun run check    # svelte-check, tem que dar 0 erros e 0 avisos
bun run lint     # Prettier, tem que dizer que está tudo formatado
```

Se o `lint` reclamar, `bun run format` resolve.

## Idioma

Esta é a regra que mais pega quem chega:

- Comentário de código em pt-BR.
- Identificador sempre em inglês: variável, função, tipo, componente, arquivo.
- Texto que a pessoa usuária lê em pt-BR. Chave de JSON e valor que vai para a API
  continuam em inglês.
- Mensagem de commit em inglês.

```ts
// O contador do cabeçalho vem do load, então ele desce junto com a lista.
function countScraps(delta: number) { ... }
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/pt-br/), em inglês, com pelo
menos uma linha de corpo explicando o porquê:

```
fix(profile): keep the member counter in sync after a kick

The header reads members_count from the load, so removing someone from the
list left the number one too high until the next navigation.
```

## Convenções do código

A codebase é pequena de propósito e a prioridade é ser fácil de ler. Nada de abstração em
cima de abstração, nada de atalho esperto, nada de ternário aninhado. Prefira o código
mais verboso se ele for mais claro.

Svelte 5 com runes, sem stores. Estado global é `$state` num módulo de `src/lib/state/`.

Dado que vem do servidor é `$derived`, não `$state` com `$effect`:

```ts
// certo: reatribuir vale localmente e a navegação volta a seguir a fonte
let requests = $derived(data.requests);

// errado
let requests = $state(untrack(() => data.requests));
$effect(() => {
    requests = data.requests;
});
```

Guarde `$effect` para o que ele resolve de verdade, como zerar um rascunho de formulário
quando a rota muda, e comente o porquê quando usar.

Import direto do módulo. O barrel foi removido de propósito, para o leitor ver de onde
cada função vem:

```ts
import { acceptFriendRequest } from "#lib/friend"; // certo
import { acceptFriendRequest } from "#lib"; // não existe mais
```

Filtro de aba mora na URL, não em estado local. Assim o botão voltar funciona e o link
pode ser compartilhado. Veja `src/routes/friends/requests/` como exemplo.

Reuse os componentes que já existem em vez de recolar o markup:

| Componente          | Para                                   |
| ------------------- | -------------------------------------- |
| `LoadMore`          | Botão de carregar a próxima página     |
| `EmptyState`        | Aviso de lista vazia                   |
| `TabPill`           | Aba ou filtro, como link ou como botão |
| `ProfileRow`        | Linha com avatar, nome, @slug e ações  |
| `Card`              | Bloco com título e link de "ver todos" |
| `ConfirmDialog`     | Confirmação de ação destrutiva         |
| `Input`, `Textarea` | Campos de formulário e caixa de busca  |
| `FieldError`        | Mensagens de erro de um campo          |
| `NotificationRow`   | Conteúdo de uma linha de notificação   |

Dependência nova precisa de justificativa na issue. O projeto tem uma única dependência
de runtime, e a ideia é continuar assim.

Sem emoji em texto de interface.

Acessibilidade não é opcional. Botão é `<button>`, link é `<a>`, imagem tem `alt`,
diálogo fecha no Esc e devolve o foco para quem o abriu. O `ConfirmDialog` já faz isso,
use ele.

## O que este projeto ainda não tem

Sendo honesto, para você não procurar o que não existe:

- Não há testes automatizados nem runner instalado. Mudança grande é conferida na mão,
  rodando a aplicação.
- Não há CI. Os comandos acima são responsabilidade de quem abre o PR.
- Não há ESLint. O `svelte-check` cobre parte disso e o Prettier cuida do resto.

Se você quiser atacar algum desses três, abra uma issue: é contribuição bem-vinda.

## Relatando um bug

Diga o que você esperava, o que aconteceu, e o passo a passo para chegar lá. Navegador e
sistema ajudam. Print ajuda mais ainda.

## Falha de segurança

Não abra issue pública para falha de segurança. É uma rede social, tem dado de gente de
verdade no meio. Me procure em particular primeiro, no e-mail
[contributing@tukro.app](mailto:contributing@tukro.app).

## Convivência

Trate as outras pessoas bem. Crítica é sobre o código, nunca sobre quem escreveu. Quem
não conseguir fazer isso fica de fora, sem discussão longa.

# Acha&Busca-Varejo

Crie uma aplicação web de e-commerce responsiva e completa para uma marca de roupas. A arquitetura deve incluir uma vitrine pública e um painel administrativo seguro. Utilize React, Tailwind CSS e integre com o Supabase para o banco de dados backend, autenticação e armazenamento de imagens.

**1. Design Visual e Tema**

* Estética minimalista, limpa e moderna.

* Paleta de cores: Fundo branco, bordas em cinza claro, texto em preto e efeitos sutis de transição. Utilize uma cor de destaque vermelha para as etiquetas de "ESGOTADO".

* Tipografia: Fontes sans-serif com alta legibilidade.

**2. Vitrine Pública - Página Principal do Catálogo**

* Cabeçalho: Logotipo posicionado à esquerda, barra de pesquisa central, opções de login e carrinho à direita, acompanhados de um menu horizontal de categorias (Camisa, Calça, Acessórios, Gola polo, Bermudas, Conjuntos, Regata, Casaco, Camisa infantil).

* Barra Lateral Esquerda: Sistema de filtragem contendo ordenação de resultados, seleção de categorias, filtros para "Novidades" e "Promoção", controle deslizante para faixa de preço e seções expansíveis para Marcas, Tamanhos e Cores.

* Grade de Produtos: Exibição responsiva apresentando a imagem do produto, título em caixa alta e preço. A ausência de estoque deve acionar uma faixa vermelha com a inscrição "ESGOTADO" sobreposta à imagem.

**3. Vitrine Pública - Página de Detalhes do Produto**

* Layout: Visão em colunas, com a área esquerda contendo um carrossel vertical de miniaturas e a imagem principal em destaque.

* Seleção de Variações: A coluna direita deve exibir título e preço, além de um seletor em formato de matriz. As linhas representam as Cores disponíveis (com amostra visual em círculo) e as colunas representam os Tamanhos (P, M, G, GG).

* Interação de Compra: Cada interseção na matriz de cor e tamanho deve possuir um botão de adição ("+") para quantificar os itens, calculando o subtotal em tempo real, finalizando com um botão de ação para adicionar ao carrinho.

* Rodapé: Áreas informativas para "Quem Somos", "Políticas de venda e privacidade" e "Contato", incluindo a exibição do número de atendimento.

**4. Fluxo de Compra - Integração com WhatsApp**

* Interface do Carrinho: Elemento deslizante lateral ou página dedicada que sumarize os itens (Nome, Cor, Tamanho, Quantidade e Preço).

* Ação de Checkout: Substituição do gateway de pagamento padrão por um botão "Finalizar Compra via WhatsApp".

* Redirecionamento: O sistema deve formatar os dados do pedido em uma string de texto estruturada (ex: "Olá! Gostaria de fazer o pedido: 1x Camisa Preta Tamanho M - R$ 47,99") e enviar o usuário para a API do aplicativo (`https://wa.me/<NUMERO>?text=<MENSAGEM_CODIFICADA>`).

**5. Painel Administrativo Seguro**

* Acesso: Rota protegida exigindo autenticação do administrador.

* Funcionalidades de Catálogo: Interface para criar, ler, atualizar e excluir produtos.

* Formulário de Inserção: Campos obrigatórios para Nome do Produto, Preço Base e Categoria, com ferramenta de upload para múltiplas imagens vinculada ao armazenamento do Supabase.

* Gerenciamento de Estoque: Entradas dinâmicas no formulário que permitam ao administrador adicionar Cores, associar os Tamanhos disponíveis para cada respectiva cor e estipular as quantidades exatas de estoque.

**6. Estrutura de Banco de Dados (Supabase)**

* Tabela produtos: id, nome, preco, categoria, criado_em.

* Tabela imagens_produto: id, produto_id, url_imagem, principal.

* Tabela variacoes_produto: id, produto_id, nome_cor, hex_cor, tamanho, quantidade_estoque.

Certifique-se de que a aplicação possua um gerenciamento de estado robusto para assegurar a sincronização adequada dos dados do carrinho e da matriz de seleção de variações.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/07a0350e-8d9e-45a8-accc-22bbc9ef3783).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

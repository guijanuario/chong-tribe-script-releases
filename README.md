# Apoios por nick — BR143

Na tela **Praça de reunião → Tropas** (`screen=place&mode=units`) de qualquer aldeia do BR143, o script agrupa os apoios pelo nick de origem. Ele mostra as tropas selecionadas, o total atual da aldeia e a previsão de quantas ficarão após a devolução. O botão **Enviar de volta** aciona o botão original do jogo apenas quando você clicar nele.

## Barra de acesso rápido

Crie um atalho na barra de acesso rápido do Tribal Wars e cole este código no campo do script:

```javascript
javascript:$.getScript('https://cdn.jsdelivr.net/gh/guijanuario/chong-tribe-script-releases@e057e4a2b857a4821ef8322780a318a3fa79cc0f/SelecionarApoiosPorNick.quickbar.js');
```

Você pode clicar no atalho em qualquer tela de uma aldeia do BR143. Se ainda não estiver em **Praça de reunião → Tropas**, ele avisa e abre essa tela da aldeia atual. **Depois que a página carregar, clique no atalho novamente** para mostrar o painel. Se já estiver na tela Tropas, o painel abre no primeiro clique. A seleção de um nick é feita em lote para evitar travamentos.

O atalho usa um carregador próprio, que verifica a tela antes de abrir o painel. O endereço acima aponta para o commit publicado, para evitar que o cache da CDN carregue uma versão anterior. Substitua o código antigo do atalho **Retirar Apoio** por este. Ao publicar uma nova versão, atualize o endereço do atalho para o novo commit.

O script atua somente no mundo **br143** e nessa tela de tropas. Ele não envia nada ao selecionar um nick; revise as tropas e a previsão antes de clicar em **Enviar de volta**.

Também é possível instalar diretamente o arquivo [`SelecionarApoiosPorNick.user.js`](./SelecionarApoiosPorNick.user.js) no Tampermonkey. Nesse caso, o painel abre automaticamente na tela de tropas; não é necessário usar também o atalho.

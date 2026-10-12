# Apoios por nick — BR143

Na tela **Praça de reunião → Tropas** (`screen=place&mode=units`) de qualquer aldeia do BR143, o script agrupa os apoios pelo nick de origem. Ele mostra as tropas selecionadas, o total atual da aldeia e a previsão de quantas ficarão após a devolução. O botão **Enviar de volta** aciona o botão original do jogo apenas quando você clicar nele.

## Barra de acesso rápido

Crie um atalho na barra de acesso rápido do Tribal Wars e cole este código no campo do script:

```javascript
javascript:$.getScript('https://cdn.jsdelivr.net/gh/guijanuario/chong-tribe-script-releases@main/SelecionarApoiosPorNick.user.js');
```

Abra a tela de tropas da aldeia desejada e clique no atalho. O painel aparece à direita. Se a página tiver muitos apoios, a seleção de um nick é feita em lote para evitar travamentos.

O script atua somente no mundo **br143** e nessa tela de tropas. Ele não envia nada ao selecionar um nick; revise as tropas e a previsão antes de clicar em **Enviar de volta**.

Também é possível instalar diretamente o arquivo [`SelecionarApoiosPorNick.user.js`](./SelecionarApoiosPorNick.user.js) no Tampermonkey. Nesse caso, o painel abre automaticamente na tela de tropas; não é necessário usar também o atalho.

// Carregador para a barra de acesso rápido do Tribal Wars (BR143).
(() => {
    'use strict';

    const pagina = new URL(window.location.href);
    if (pagina.hostname !== 'br143.tribalwars.com.br') {
        window.alert('Retirar Apoio funciona apenas no mundo BR143.');
        return;
    }

    const aldeia = pagina.searchParams.get('village');
    if (!/^\d+$/.test(aldeia || '')) {
        window.alert('Abra uma aldeia antes de usar Retirar Apoio.');
        return;
    }

    if (pagina.searchParams.get('screen') !== 'place' || pagina.searchParams.get('mode') !== 'units') {
        const destino = new URL('/game.php', pagina.origin);
        destino.searchParams.set('village', aldeia);
        destino.searchParams.set('screen', 'place');
        destino.searchParams.set('mode', 'units');
        if (pagina.searchParams.has('t')) destino.searchParams.set('t', pagina.searchParams.get('t'));
        window.alert('Abrindo Praça de reunião → Tropas da aldeia atual. Após carregar, clique novamente em Retirar Apoio.');
        window.location.assign(destino.href);
        return;
    }

    if (document.getElementById('apoios-por-nick')) return;

    const jquery = window.jQuery || window.$;
    if (!jquery || typeof jquery.getScript !== 'function') {
        window.alert('Não foi possível carregar Retirar Apoio: a biblioteca do jogo não está disponível. Atualize a página e tente novamente.');
        return;
    }

    const script = 'https://cdn.jsdelivr.net/gh/guijanuario/chong-tribe-script-releases@2c60d713afcc0dc9bca2ce91180e5061632f8752/SelecionarApoiosPorNick.user.js';
    jquery.getScript(script).fail(() => {
        window.alert('Não foi possível carregar Retirar Apoio. Verifique a conexão e tente novamente.');
    });
})();

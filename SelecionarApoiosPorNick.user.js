// ==UserScript==
// @name         BR143 - Selecionar apoios por nick
// @namespace    local.tribalwars.apoios
// @version      1.2.1
// @description  Agrupa apoios por nick, mostra tropas atuais e previstas e aciona o botão de devolução do jogo.
// @match        https://br143.tribalwars.com.br/game.php*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    const url = new URL(location.href);
    const aldeia = url.searchParams.get('village');
    if (url.hostname !== 'br143.tribalwars.com.br' || url.searchParams.get('screen') !== 'place' || url.searchParams.get('mode') !== 'units' || !/^\d+$/.test(aldeia || '')) return;
    if (document.getElementById('apoios-por-nick')) return;

    const ID = 'apoios-por-nick';
    const painel = document.createElement('section');
    painel.id = ID;
    painel.setAttribute('aria-label', 'Selecionar apoios por nick');
    painel.innerHTML = `
        <div class="ap-top"><div><strong>🛡️ Apoios por nick</strong><small>Aldeia ${aldeia} · BR143</small></div><button type="button" class="ap-min" aria-label="Minimizar painel" title="Minimizar">−</button></div>
        <div class="ap-body"><p class="ap-help">Clique no nick para marcar os apoios. Clique novamente para desmarcá-los.</p><div class="ap-list"></div>
        <div class="ap-status" role="status"></div><div class="ap-troop-summary"><strong class="ap-troop-total">0 tropas selecionadas</strong><div class="ap-troop-types"></div></div>
        <div class="ap-garrison"><strong>🏰 Tropas na aldeia</strong><small class="ap-garrison-source"></small><div class="ap-garrison-head"><span>Unidade</span><span>Agora → Depois</span></div><div class="ap-garrison-list"></div></div>
        <div class="ap-actions"><button type="button" class="ap-clear">Limpar seleção</button><button type="button" class="ap-refresh">Atualizar lista</button></div>
        <button type="button" class="ap-return" disabled>↩ Enviar de volta</button>
        <small class="ap-note">O envio usa o botão original do jogo. Confira as tropas antes de clicar.</small></div>
        <button type="button" class="ap-restore" aria-label="Abrir painel de apoios" title="Abrir apoios por nick">🛡️</button>`;
    const estilo = document.createElement('style');
    estilo.textContent = `
        #${ID}{position:fixed;top:12px;right:18px;z-index:9999;width:315px;max-width:calc(100vw - 36px);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid #8c6940;border-radius:13px;background:linear-gradient(145deg,#372a1b,#211a13);color:#f7e8ca;font:13px/1.4 Arial,sans-serif;box-shadow:0 12px 32px #0006}
        #${ID} *{box-sizing:border-box}
        #${ID} .ap-top{display:flex;justify-content:space-between;gap:12px;align-items:start}
        #${ID} .ap-top strong{display:block;font-size:16px;color:#ffe1a6}
        #${ID} small{display:block;color:#c7b794;font-size:11px}
        #${ID} button{cursor:pointer;border:1px solid #84653d;border-radius:7px;background:#4c3924;color:#ffe5b7;font:600 12px Arial;padding:8px}
        #${ID} button:hover{background:#65482b}
        #${ID} button:focus-visible{outline:2px solid #ffd88a;outline-offset:2px}
        #${ID} .ap-min{width:26px;height:26px;padding:0;font-size:18px;line-height:1}
        #${ID} .ap-help{margin:14px 0 10px;color:#dbc9a8;font-size:12px}
        #${ID} .ap-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:48vh;overflow:auto;padding:1px}
        #${ID} .ap-nick{text-align:left;min-width:0;overflow-wrap:anywhere}
        #${ID} .ap-nick small{margin-top:3px;color:#dbcaab}
        #${ID} .ap-nick[data-all="true"]{background:#426039;border-color:#729154;color:#f2ffe9}
        #${ID} .ap-status{margin:13px 0 10px;padding-top:10px;border-top:1px solid #ffffff20;color:#e1d1b3;font-size:12px}
        #${ID} .ap-troop-summary{padding:11px;background:#ffffff0a;border:1px solid #ffffff17;border-radius:9px;margin-bottom:12px}
        #${ID} .ap-troop-total{display:block;color:#ffe1a6;font-size:15px}
        #${ID} .ap-troop-types{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin-top:7px;color:#dbc9a8;font-size:11px}
        #${ID} .ap-troop-type{display:flex;justify-content:space-between;gap:5px}
        #${ID} .ap-garrison{padding:11px;background:#ffffff0a;border:1px solid #ffffff17;border-radius:9px;margin-bottom:12px}
        #${ID} .ap-garrison strong{display:block;color:#ffe1a6;font-size:14px}
        #${ID} .ap-garrison-source{margin:3px 0 9px}
        #${ID} .ap-garrison-head,#${ID} .ap-garrison-row{display:flex;justify-content:space-between;gap:8px;align-items:center}
        #${ID} .ap-garrison-head{border-bottom:1px solid #ffffff20;padding-bottom:4px;color:#c7b794;font-size:10px}
        #${ID} .ap-garrison-list{overflow:visible}
        #${ID} .ap-garrison-row{padding:5px 0;border-bottom:1px solid #ffffff0d;font-size:11px}
        #${ID} .ap-garrison-row b{color:#d5efbc;font-variant-numeric:tabular-nums;white-space:nowrap}
        #${ID} .ap-actions{display:flex;gap:7px}
        #${ID} .ap-actions button{flex:1}
        #${ID} .ap-return{display:block;width:100%;margin-top:10px;background:#48643a;border-color:#729154;color:#f4ffe9;font-size:13px}
        #${ID} .ap-return:hover:not(:disabled){background:#5b8047}
        #${ID} .ap-return:disabled{opacity:.48;cursor:not-allowed}
        #${ID} .ap-note{margin-top:10px}
        #${ID} .ap-restore{display:none}
        #${ID}.ap-collapsed{width:54px;height:54px;padding:0;overflow:visible}
        #${ID}.ap-collapsed .ap-top,#${ID}.ap-collapsed .ap-body{display:none}
        #${ID}.ap-collapsed .ap-restore{display:block;width:52px;height:52px;padding:0;border:0;background:transparent;font-size:25px}
    `;
    document.head.append(estilo);
    document.body.append(painel);

    const lista = painel.querySelector('.ap-list');
    const status = painel.querySelector('.ap-status');
    const totalTropas = painel.querySelector('.ap-troop-total');
    const tiposTropas = painel.querySelector('.ap-troop-types');
    const efetivoLista = painel.querySelector('.ap-garrison-list');
    const efetivoFonte = painel.querySelector('.ap-garrison-source');
    const botaoDevolver = painel.querySelector('.ap-return');
    let grupos = new Map();
    let enviando = false;
    const cabecalhos = new WeakMap();
    let efetivoAtual = null;

    const nomesUnidades = {
        spear: 'Lanceiros', sword: 'Espadachins', axe: 'Bárbaros', archer: 'Arqueiros', spy: 'Batedores',
        light: 'Cavalaria leve', marcher: 'Arqueiros montados', heavy: 'Cavalaria pesada', ram: 'Aríetes',
        catapult: 'Catapultas', knight: 'Paladinos', snob: 'Nobres', militia: 'Milícias'
    };

    function nomeDaUnidade(tabela, coluna) {
        let colunas = cabecalhos.get(tabela);
        if (!colunas) {
            const cabecalho = [...tabela.querySelectorAll('tr')].find(linha => linha.querySelector('th'));
            colunas = [];
            for (const celula of cabecalho?.cells || []) {
                for (let i = 0; i < celula.colSpan; i++) colunas.push(celula);
            }
            cabecalhos.set(tabela, colunas);
        }
        const celula = colunas[coluna]?.tagName === 'TH' ? colunas[coluna] : null;
        const icone = celula?.querySelector('img');
        const chave = icone?.getAttribute('src')?.match(/(?:unit_)?(spear|sword|axe|archer|spy|light|marcher|heavy|ram|catapult|knight|snob|militia)(?:\.|\/)/i)?.[1]?.toLowerCase();
        return (chave && nomesUnidades[chave]) || icone?.getAttribute('title') || icone?.getAttribute('alt') || celula?.textContent?.trim() || `Unidade ${coluna - 2}`;
    }

    function botaoOriginal() {
        const candidatos = [...document.querySelectorAll('input[type="submit"], input[type="button"], button')].filter(el =>
            !painel.contains(el) && !el.disabled && /^enviar de volta$/i.test((el.value || el.textContent || '').trim()));
        return candidatos.length === 1 ? candidatos[0] : null;
    }

    function linhasDeApoio() {
        const linhas = [];
        for (const linha of document.querySelectorAll('tr')) {
            if (painel.contains(linha) || !linha.cells || linha.cells.length < 3) continue;
            // A coluna de seleção da tabela de tropas é a primeira.
            const caixa = linha.cells[0].querySelector('input[type="checkbox"]');
            if (!caixa || caixa.disabled || caixa.closest('tr') !== linha) continue;
            const origem = linha.cells[1]?.textContent?.replace(/\s+/g, ' ').trim() || '';
            // Ex.: 002 - WESTEROS (ProPHeCy) (442|682) K64
            // Usa o último par de parênteses antes da coordenada como nick.
            const trecho = origem.match(/\(([^()]+)\)\s*\(\d{1,4}\s*\|\s*\d{1,4}\)/);
            const nick = trecho?.[1]?.trim();
            if (!nick) continue;
            linhas.push({ caixa, nick });
        }
        return linhas;
    }

    function montarGrupos() {
        grupos = new Map();
        efetivoAtual = null;
        for (const item of linhasDeApoio()) {
            const chave = item.nick.toLocaleLowerCase('pt-BR');
            if (!grupos.has(chave)) grupos.set(chave, { nick: item.nick, caixas: [] });
            grupos.get(chave).caixas.push(item.caixa);
        }
        lista.replaceChildren();
        for (const [chave, grupo] of [...grupos].sort((a, b) => a[1].nick.localeCompare(b[1].nick, 'pt-BR'))) {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'ap-nick';
            botao.dataset.nick = chave;
            const nome = document.createElement('span');
            nome.textContent = grupo.nick;
            const quantidade = document.createElement('small');
            quantidade.textContent = `${grupo.caixas.length} ${grupo.caixas.length === 1 ? 'apoio' : 'apoios'}`;
            botao.append(nome, quantidade);
            lista.append(botao);
        }
        atualizarEstado();
    }

    function tropasDaLinha(linha, tabela) {
        const tropas = new Map();
        let colunaVisual = 0;
        for (const celula of linha.cells) {
            if (colunaVisual >= 3) {
                const texto = celula.textContent.trim();
                if (/^(?:\d+|\d{1,3}(?:[.,\s]\d{3})+)$/.test(texto)) {
                    const quantidade = Number(texto.replace(/[.,\s]/g, ''));
                    if (Number.isSafeInteger(quantidade)) tropas.set(nomeDaUnidade(tabela, colunaVisual), quantidade);
                }
            }
            colunaVisual += celula.colSpan || 1;
        }
        return tropas;
    }

    function efetivoDaAldeia(todas) {
        const tabela = todas[0]?.closest('table');
        if (!tabela) return null;
        const linhas = [...tabela.rows].filter(linha => linha.closest('table') === tabela);
        const rotulo = linha => [...linha.cells].slice(0, 2).map(celula => celula.textContent.trim().toLocaleLowerCase('pt-BR'));
        const total = linhas.find(linha => !linha.querySelector('input[type="checkbox"]') && rotulo(linha).includes('total'));
        if (total) return { tropas: tropasDaLinha(total, tabela), fonte: 'Total informado pelo jogo' };
        const propria = linhas.find(linha => rotulo(linha).includes('desta aldeia'));
        if (!propria) return null;
        const tropas = tropasDaLinha(propria, tabela);
        for (const caixa of todas) {
            if (caixa.closest('table') !== tabela) continue;
            for (const [nome, quantidade] of tropasDaLinha(caixa.closest('tr'), tabela)) {
                tropas.set(nome, (tropas.get(nome) || 0) + quantidade);
            }
        }
        return { tropas, fonte: 'Soma das tropas próprias e apoios listados' };
    }

    function atualizarEstado() {
        const todas = [...grupos.values()].flatMap(grupo => grupo.caixas).filter(caixa => caixa.isConnected && !caixa.disabled);
        const selecionadas = todas.filter(caixa => caixa.checked);
        const marcadas = selecionadas.length;
        status.textContent = grupos.size
            ? `${grupos.size} ${grupos.size === 1 ? 'nick' : 'nicks'} · ${marcadas} de ${todas.length} apoios marcados`
            : 'Nenhuma linha de apoio com nick identificada nesta página.';
        for (const botao of lista.querySelectorAll('.ap-nick')) {
            const caixas = grupos.get(botao.dataset.nick)?.caixas.filter(caixa => caixa.isConnected && !caixa.disabled) || [];
            const todasMarcadas = caixas.length > 0 && caixas.every(caixa => caixa.checked);
            botao.dataset.all = String(todasMarcadas);
            botao.setAttribute('aria-pressed', String(todasMarcadas));
        }
        const totais = new Map();
        let soma = 0;
        for (const caixa of selecionadas) {
            const linha = caixa.closest('tr');
            const tabela = linha?.closest('table');
            if (!linha || !tabela) continue;
            for (const [nome, quantidade] of tropasDaLinha(linha, tabela)) {
                if (quantidade <= 0) continue;
                totais.set(nome, (totais.get(nome) || 0) + quantidade);
                soma += quantidade;
            }
        }
        totalTropas.textContent = `${soma.toLocaleString('pt-BR')} ${soma === 1 ? 'tropa selecionada' : 'tropas selecionadas'}`;
        tiposTropas.replaceChildren();
        for (const [nome, quantidade] of totais) {
            const item = document.createElement('span');
            item.className = 'ap-troop-type';
            const rotulo = document.createElement('span');
            rotulo.textContent = nome;
            const numero = document.createElement('b');
            numero.textContent = quantidade.toLocaleString('pt-BR');
            item.append(rotulo, numero);
            tiposTropas.append(item);
        }
        if (!efetivoAtual) efetivoAtual = efetivoDaAldeia(todas);
        efetivoLista.replaceChildren();
        efetivoFonte.textContent = efetivoAtual?.fonte || 'Total atual não identificado nesta tabela.';
        if (efetivoAtual) {
            for (const [nome, agora] of efetivoAtual.tropas) {
                const selecionado = totais.get(nome) || 0;
                if (!agora && !selecionado) continue;
                const linha = document.createElement('div');
                linha.className = 'ap-garrison-row';
                const rotulo = document.createElement('span');
                rotulo.textContent = nome;
                const numeros = document.createElement('b');
                numeros.textContent = `${agora.toLocaleString('pt-BR')} → ${agora >= selecionado ? (agora - selecionado).toLocaleString('pt-BR') : '—'}`;
                linha.append(rotulo, numeros);
                efetivoLista.append(linha);
            }
        }
        const original = botaoOriginal();
        const mesmoFormulario = original?.form && selecionadas.every(caixa => caixa.form === original.form);
        const foraDaLista = original?.form
            ? [...original.form.querySelectorAll('input[type="checkbox"]:checked')].filter(caixa => !todas.includes(caixa)).length
            : 0;
        if (foraDaLista) status.textContent += ` · ${foraDaLista} seleção fora da lista`;
        botaoDevolver.disabled = enviando || !marcadas || !mesmoFormulario || !!foraDaLista;
        botaoDevolver.title = !marcadas ? 'Selecione ao menos um apoio'
            : foraDaLista ? 'Desmarque as caixas fora da lista de apoios antes de enviar pelo painel'
            : !mesmoFormulario ? 'Botão original de devolução não identificado para estas linhas'
            : 'Enviar os apoios marcados pelo botão original do jogo';
    }

    function marcar(caixa, valor) {
        if (!caixa.isConnected || caixa.disabled || caixa.checked === valor) return;
        // O formulário envia o estado checked. Evita centenas de handlers do jogo e
        // centenas de recálculos completos ao selecionar um nick com muitos apoios.
        caixa.checked = valor;
    }

    lista.addEventListener('click', evento => {
        const botao = evento.target.closest('.ap-nick');
        if (!botao || !lista.contains(botao)) return;
        const grupo = grupos.get(botao.dataset.nick);
        if (!grupo) return;
        const caixas = grupo.caixas.filter(caixa => caixa.isConnected && !caixa.disabled);
        const marcarTodas = !caixas.every(caixa => caixa.checked);
        caixas.forEach(caixa => marcar(caixa, marcarTodas));
        atualizarEstado();
    });
    painel.querySelector('.ap-clear').addEventListener('click', () => {
        [...grupos.values()].flatMap(grupo => grupo.caixas).forEach(caixa => marcar(caixa, false));
        atualizarEstado();
    });
    painel.querySelector('.ap-refresh').addEventListener('click', montarGrupos);
    botaoDevolver.addEventListener('click', () => {
        if (enviando) return;
        // Reconfere imediatamente para evitar enviar após mudanças na seleção ou no formulário.
        atualizarEstado();
        if (botaoDevolver.disabled) return;
        const original = botaoOriginal();
        if (!original) return;
        enviando = true;
        botaoDevolver.disabled = true;
        status.textContent = 'Enviando os apoios selecionados pelo botão original do jogo…';
        original.click();
    });
    document.addEventListener('change', evento => {
        if (evento.target.matches('input[type="checkbox"]')) atualizarEstado();
    });
    painel.querySelector('.ap-min').addEventListener('click', () => {
        painel.classList.add('ap-collapsed');
        painel.querySelector('.ap-restore').focus();
    });
    painel.querySelector('.ap-restore').addEventListener('click', () => {
        painel.classList.remove('ap-collapsed');
        painel.querySelector('.ap-min').focus();
        montarGrupos();
    });

    montarGrupos();
})();

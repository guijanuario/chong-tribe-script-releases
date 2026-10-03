// ==UserScript==
// @name         Chong Utilitários
// @namespace    chonguera.tribalwars.utilities
// @version      4.1.0
// @description  Motor unificado de utilitários e ferramentas de tribo para Tribal Wars
// @author       Chong
// @updateURL    https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/Chong%20Utilit%C3%A1rios/Tribal%20Wars%20-%20Malboa%20Utilit%C3%A1rios.user.js
// @downloadURL  https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/Chong%20Utilit%C3%A1rios/Tribal%20Wars%20-%20Malboa%20Utilit%C3%A1rios.user.js
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.tribalwars.com/game.php*
// @match        https://*.tribalwars.com.br/game.php*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// ARQUIVO UNIFICADO — GERADO AUTOMATICAMENTE.
// Contém o motor Chong Utilitários e toda a suíte Chong Tribe no mesmo instalador.
// Não edite este arquivo; altere as fontes e execute npm run release:free.

(function() {
    'use strict';

    const MENU_URL = 'https://dl.dropbox.com/scl/fi/6tf6d9pjk6a07mj2oor41/MalboaMenuSistema.js?rlkey=wo3plf9nkd2fevv76oyg65p1y&dl=1';
    const CAPTCHA_MANAGER_URL = 'https://dl.dropbox.com/scl/fi/1hzacejr5k65wloc7nqu0/MalboaCaptchaManager.js?rlkey=g0nqsf3980h725kwkcv732mup&dl=1';

    async function loadScript(url, name) {
        try {
            const cacheBuster = `&_t=${Date.now()}`;
            const response = await fetch(url + cacheBuster);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const script = await response.text();
            const scriptElement = document.createElement('script');
            scriptElement.textContent = script;
            document.head.appendChild(scriptElement);

            console.log(`🎮 [Chong] ${name} carregado`);
            return true;
        } catch (error) {
            console.error(`❌ [Chong] Erro ao carregar ${name}:`, error);
            return false;
        }
    }

    // Mantém os nomes internos Malboa usados pelo motor legado. Somente a marca
    // apresentada ao jogador é Chong, evitando quebrar módulos já existentes.
    function createFallbackCaptchaManager() {
        window.MalboaCaptchaManager = {
            verificar: () => false,
            detectar: () => false,
            podeExecutar: () => true,
            aguardarResolucao: () => Promise.resolve(),
            executarComVerificacao: (fn, ...args) => fn(...args),
            onCaptchaChange: () => {},
            offCaptchaChange: () => {},
            isAtivo: () => false
        };
        console.log('🛡️ [Chong] Gerenciador de proteção fallback criado');
    }

    function rebrandVisibleInterface(root = document) {
        const containers = [];
        if (root.nodeType === Node.ELEMENT_NODE && root.matches?.('.tw-tamper-container,.malboa-settings-overlay,.malboa-central-log')) containers.push(root);
        root.querySelectorAll?.('.tw-tamper-container,.malboa-settings-overlay,.malboa-central-log').forEach((element) => containers.push(element));
        containers.forEach((container) => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                if (/Malboa/i.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/Malboa/gi, 'Chong');
            }
        });
    }

    function startBrandObserver() {
        rebrandVisibleInterface();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) rebrandVisibleInterface(node);
            }));
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
    }

    async function init() {
        const captchaLoaded = await loadScript(CAPTCHA_MANAGER_URL, 'Gerenciador de proteção');
        if (!captchaLoaded || !window.MalboaCaptchaManager) createFallbackCaptchaManager();

        // O Chong Tribe é anexado fisicamente ao fim deste userscript durante o build.
        // Portanto, somente o motor-base precisa ser buscado na abertura da página.
        await loadScript(MENU_URL, 'Motor de utilitários');
        startBrandObserver();
    }

    init();
})();

// --- Chong Tribe embutido ---
(async function () {
    'use strict';

    const runtimeKey = '__chongTribeSuiteRuntime';
    if (window[runtimeKey]) return;
    window[runtimeKey] = { version: '2.34.0', loadedAt: new Date().toISOString() };
    const route = new URLSearchParams(window.location.search);
    const screen = route.get('screen');
    const mode = route.get('mode');
    const relicHeadline = [...document.querySelectorAll('#content_value h1,#content_value h2,.main-headline')]
        .some((element) => /tesouraria|relíquias|reliquias|relics/i.test(element.textContent || ''));
    const relevantPage = Boolean(screen) || screen === 'map'
        || screen === 'wars'
        || screen === 'mail'
        || ['relics', 'relic', 'treasury', 'relic_inventory', 'inventory'].includes(screen)
        || relicHeadline
        || (screen === 'ally' && ['members_defense', 'contracts', 'members'].includes(mode));
    if (!relevantPage) return;



    // -------------------------------------------------------------------------
    // Módulo: Integração com Chong Utilitários
    // -------------------------------------------------------------------------
    (() => {
        'use strict';

        const ENTRY_ID = 'chong-tribe-malboa-entry';
        const STYLE_ID = 'chong-tribe-malboa-bridge-styles';

        function assistantUrl() {
            const url = new URL(window.location.href);
            ['player_id', 'id', 'action', 'page'].forEach((key) => url.searchParams.delete(key));
            url.searchParams.set('screen', 'ally');
            url.searchParams.set('mode', 'members');
            url.searchParams.set('cts_blind_assistant', '1');
            url.hash = '';
            return url.href;
        }

        function openTribeTools() {
            const manager = document.getElementById('chong-tribe-tools-manager');
            const toggle = manager?.querySelector('[data-action="toggle"]');
            if (manager && toggle) {
                if (!manager.classList.contains('cts-tribe-manager-open')) toggle.click();
                return;
            }
            window.location.href = assistantUrl();
        }

        function injectStyles() {
            if (document.getElementById(STYLE_ID)) return;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                html.cts-malboa-tribe-integrated #chong-tribe-tools-manager>.cts-tribe-manager-toggle,
                html.cts-malboa-tribe-integrated .cba-launcher{display:none!important}
                #${ENTRY_ID} .tw-submenu-item-icon{display:grid;place-items:center;width:100%;height:100%;font-size:23px}
                #${ENTRY_ID}.cts-tribe-ready{border-color:#27ae78;box-shadow:0 0 10px rgba(39,174,120,.48)}
            `;
            document.head.appendChild(style);
        }

        function readiness(entry) {
            const world = String(window.game_data?.world || window.location.hostname);
            const ally = window.game_data?.player?.ally;
            const key = `chonguera_tropas_tribo_v2:${world}:${ally || 'tribo-atual'}`;
            try {
                const payload = JSON.parse(window.localStorage.getItem(key) || 'null');
                entry.classList.toggle('cts-tribe-ready', Boolean(payload?.savedAt && payload?.results?.length));
            } catch (_error) {
                entry.classList.remove('cts-tribe-ready');
            }
        }

        function integrate() {
            if (typeof document === 'undefined' || !document.documentElement) return;
            const submenu = document.querySelector('.tw-submenu');
            if (!submenu || document.getElementById(ENTRY_ID)) return;
            injectStyles();
            document.documentElement.classList.add('cts-malboa-tribe-integrated');

            const entry = document.createElement('div');
            entry.id = ENTRY_ID;
            entry.className = 'tw-submenu-item';
            entry.setAttribute('data-tooltip', 'Chong Tribe — ferramentas, blind, tropas, mapas e operações');
            entry.setAttribute('data-action', 'chongTribeTools');
            entry.innerHTML = '<span class="tw-submenu-item-icon">🛡️</span>';
            entry.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openTribeTools();
            });
            readiness(entry);
            submenu.appendChild(entry);
        }

        integrate();
        const observer = new MutationObserver(integrate);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
    })();

    // -------------------------------------------------------------------------
    // Módulo: Assistente de Blind
    // -------------------------------------------------------------------------
    (() => {
        'use strict';

        const SCRIPT_ID = 'chong-tribe-blind-assistant';
        const MODULE_VERSION = '1.0.1';
        const FLOW_PARAM = 'cts_blind_assistant';
        const TROOP_PREFIX = 'chonguera_tropas_tribo_v2';
        const BLIND_PREFIX = 'chonguera_blind_preventivo_result';
        const COORDINATE_PREFIX = 'chonguera_blind_preventivo_coordinate_sets';
        const query = new URLSearchParams(window.location.search);
        if (query.get('screen') !== 'ally' || document.getElementById(SCRIPT_ID)) return;

        const world = String(window.game_data?.world || window.location.hostname);
        const allyValue = window.game_data?.player?.ally;
        const allyId = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
            ? String(allyValue)
            : 'tribo-atual';
        const mode = query.get('mode') || '';
        const flowOpen = query.get(FLOW_PARAM) === '1';

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
        }

        function formatDate(value) {
            const date = new Date(value || 0);
            return Number.isNaN(date.getTime()) ? 'data desconhecida' : date.toLocaleString('pt-BR');
        }

        function readJson(key) {
            try { return JSON.parse(window.localStorage.getItem(key) || 'null'); }
            catch (_error) { return null; }
        }

        function compatiblePayload(prefix) {
            const preferred = readJson(`${prefix}:${world}:${allyId}`);
            if (preferred) return preferred;
            let newest = null;
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (!key?.startsWith(`${prefix}:${world}:`)) continue;
                const payload = readJson(key);
                if (!payload) continue;
                if (!newest || new Date(payload.savedAt || 0) > new Date(newest.savedAt || 0)) newest = payload;
            }
            return newest;
        }

        function savedBlindAnalyses() {
            const analyses = [];
            const current = compatiblePayload(BLIND_PREFIX);
            if (current) analyses.push(current);
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (!key?.startsWith(`${COORDINATE_PREFIX}:`) || !key.includes(`:${world}:`)) continue;
                const history = readJson(key);
                if (Array.isArray(history)) analyses.push(...history.filter(Boolean));
            }
            const identities = new Set();
            return analyses.filter((analysis) => {
                const identity = String(analysis.snapshotId || `${analysis.savedAt}:${analysis.analysisMode || ''}:${(analysis.requestedCoordinates || []).join(',')}`);
                if (identities.has(identity)) return false;
                identities.add(identity);
                return true;
            }).sort((left, right) => new Date(right.savedAt || 0) - new Date(left.savedAt || 0));
        }

        function statusSnapshot() {
            const troops = compatiblePayload(TROOP_PREFIX);
            const villages = (troops?.results || []).flatMap((result) => result.villageDetails || []);
            const verified = villages.filter((village) => village.ownershipStatus === 'verified').length;
            const pending = Math.max(0, villages.length - verified);
            const analyses = savedBlindAnalyses();
            const withDeficit = analyses.find((analysis) => Array.isArray(analysis.needs) && analysis.needs.length > 0) || null;
            const newest = analyses[0] || null;
            const messages = document.querySelectorAll('#chonguera-distribuidor-apoios .cda-message').length;
            return { troops, villages: villages.length, verified, pending, analyses, withDeficit, newest, messages };
        }

        function buildUrl(targetMode, openFlow = true) {
            const url = new URL(window.location.href);
            url.searchParams.set('screen', 'ally');
            url.searchParams.set('mode', targetMode);
            if (openFlow) url.searchParams.set(FLOW_PARAM, '1');
            else url.searchParams.delete(FLOW_PARAM);
            url.hash = '';
            return url.href;
        }

        function revealAndScroll(selector) {
            const panel = document.querySelector(selector);
            if (!panel) return false;
            panel.hidden = false;
            panel.removeAttribute('hidden');
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
        }

        function navigateOrReveal(targetMode, selector) {
            if (mode === targetMode && revealAndScroll(selector)) return;
            window.location.href = buildUrl(targetMode);
        }

        function injectStyles() {
            if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                #${SCRIPT_ID}{margin:10px 0 14px;border:2px solid #774214;border-radius:8px;background:#f3e2b5;color:#35200d;box-shadow:0 3px 9px #0003;font:12px Arial,sans-serif}
                #${SCRIPT_ID} *{box-sizing:border-box}
                #${SCRIPT_ID} .cba-head{display:flex;align-items:center;gap:11px;padding:12px 14px;background:linear-gradient(#9f6128,#6c3512);color:#fff4d8}
                #${SCRIPT_ID} .cba-head-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:10px;background:#17c59b;color:#063d31;font-size:21px}
                #${SCRIPT_ID} .cba-head div:nth-child(2){flex:1}#${SCRIPT_ID} h2{margin:0;font-size:20px}#${SCRIPT_ID} .cba-head small{display:block;margin-top:3px;color:#f1d7ac}
                #${SCRIPT_ID} .cba-version{font-size:9px;color:#e8c894}
                #${SCRIPT_ID} .cba-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#b88a4c}
                #${SCRIPT_ID} .cba-progress span{padding:6px;text-align:center;background:#e4cc92;color:#76552d;font-size:10px;font-weight:bold}
                #${SCRIPT_ID} .cba-progress span.cba-done{background:#d8f1d4;color:#246322}#${SCRIPT_ID} .cba-progress span.cba-active{background:#ffe18a;color:#714600}
                #${SCRIPT_ID} .cba-body{display:grid;gap:8px;padding:11px}
                #${SCRIPT_ID} .cba-step{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:1px solid #c39b5d;border-radius:7px;background:#fff7df}
                #${SCRIPT_ID} .cba-step.cba-complete{border-color:#60a85b;background:#eef9e9}#${SCRIPT_ID} .cba-step.cba-current{border-color:#da8b19;box-shadow:inset 4px 0 #e79a22}
                #${SCRIPT_ID} .cba-number{display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#82501e;color:#fff;font:bold 17px Arial}
                #${SCRIPT_ID} .cba-complete .cba-number{background:#38843a}#${SCRIPT_ID} .cba-copy strong,#${SCRIPT_ID} .cba-copy small{display:block}#${SCRIPT_ID} .cba-copy strong{font-size:14px}#${SCRIPT_ID} .cba-copy small{margin-top:3px;color:#725c3d;line-height:1.4}
                #${SCRIPT_ID} .cba-status{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;background:#ead7a7;color:#64451f;font-size:10px;font-weight:bold}#${SCRIPT_ID} .cba-complete .cba-status{background:#cce9c6;color:#246322}
                #${SCRIPT_ID} button{min-width:150px;padding:8px 10px;border:1px solid #6a3c13;border-radius:5px;background:linear-gradient(#805125,#4b2a0f);color:#fff;font-weight:bold;cursor:pointer}#${SCRIPT_ID} button:hover{filter:brightness(1.15)}#${SCRIPT_ID} button.cba-primary{border-color:#08735c;background:linear-gradient(#18bc92,#08755f)}
                #${SCRIPT_ID} .cba-tip{padding:9px 11px;border-left:4px solid #1a8c74;background:#fff9e7;line-height:1.45}
                .cba-launcher{position:fixed;right:16px;bottom:82px;z-index:2147483644;padding:10px 13px;border:2px solid #76501f;border-radius:9px;background:linear-gradient(#f1cf78,#c9963d);color:#3c230b;font:bold 12px Arial;box-shadow:0 5px 17px #0006;cursor:pointer}
                .cba-menu-link{white-space:nowrap;font-weight:bold}
                @media(max-width:760px){#${SCRIPT_ID} .cba-progress{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cba-step{grid-template-columns:38px 1fr}#${SCRIPT_ID} .cba-step button{grid-column:1/-1;width:100%}.cba-launcher{right:8px;bottom:70px}}
            `;
            document.head.appendChild(style);
        }

        function injectMenuLink() {
            const existing = document.querySelector('[data-cba-menu]');
            if (existing) return;
            const membersLink = document.querySelector('a[href*="screen=ally"][href*="mode=members"]');
            const membersRow = membersLink?.closest('tr');
            const membersCell = membersLink?.closest('td');
            if (!membersRow || !membersCell) return;
            const row = membersRow.cloneNode(false);
            const cell = membersCell.cloneNode(false);
            const link = document.createElement('a');
            link.href = buildUrl('members');
            link.className = 'cba-menu-link';
            link.dataset.cbaMenu = '1';
            link.textContent = '🛡️ Assistente de Blind';
            cell.appendChild(link);
            row.appendChild(cell);
            membersRow.insertAdjacentElement('afterend', row);
        }

        function renderPanel(panel) {
            const snapshot = statusSnapshot();
            const troopsDone = Boolean(snapshot.troops?.savedAt && snapshot.villages);
            const blindDone = Boolean(snapshot.withDeficit);
            const distributionDone = snapshot.messages > 0;
            const currentStep = !troopsDone ? 1 : !blindDone ? 2 : !distributionDone ? 3 : 4;
            const troopStatus = troopsDone
                ? `${formatNumber(snapshot.verified)} de ${formatNumber(snapshot.villages)} origens validadas · salvo em ${formatDate(snapshot.troops.savedAt)}`
                : 'Ainda não existe uma coleta salva para o Distribuidor.';
            const blindStatus = blindDone
                ? `${formatNumber(snapshot.withDeficit.needs.length)} destino(s) com déficit · análise de ${formatDate(snapshot.withDeficit.savedAt)}`
                : snapshot.newest
                    ? `A análise mais recente possui 0 déficits (${formatDate(snapshot.newest.savedAt)}).`
                    : 'Nenhuma análise de blind salva.';
            const steps = [
                { number: 1, complete: troopsDone, title: 'Coletar e validar as tropas', copy: 'Abra Tropas da Tribo e clique no botão verde “Carregar e validar origens”. Aguarde aparecer “Salvo no navegador em…”.', status: troopStatus, action: 'troops', label: mode === 'members_defense' ? 'Mostrar coleta' : 'Abrir coleta' },
                { number: 2, complete: blindDone, title: 'Calcular o Blind Preventivo', copy: 'Informe tribos/continentes, clique em “Analisar alcance” e salve uma análise que possua destinos com déficit.', status: blindStatus, action: 'blind', label: mode === 'contracts' ? 'Mostrar Blind Preventivo' : 'Abrir Blind Preventivo' },
                { number: 3, complete: distributionDone, title: 'Distribuir os apoios', copy: 'Escolha a análise com déficit, confira reservas, rotas e blacklists e clique em “Distribuir apoios”.', status: distributionDone ? `${formatNumber(snapshot.messages)} MP(s) geradas nesta abertura.` : (troopsDone && blindDone ? 'Pré-requisitos prontos para distribuir.' : 'Aguardando as etapas anteriores.'), action: 'distribute', label: mode === 'members' ? 'Mostrar Distribuidor' : 'Abrir Distribuidor' },
                { number: 4, complete: false, title: 'Auditar somente se houver bloqueio', copy: 'Se o Distribuidor disser que faltam origens seguras, carregue os membros, selecione as origens candidatas e consulte todos os lotes.', status: snapshot.pending ? `${formatNumber(snapshot.pending)} origem(ns) divergente(s) ou não validada(s); audite apenas as necessárias.` : 'Nenhuma divergência identificada na coleta.', action: 'audit', label: mode === 'members' ? 'Mostrar Auditoria' : 'Abrir Auditoria' }
            ];
            panel.innerHTML = `
                <div class="cba-head"><span class="cba-head-icon">🛡️</span><div><h2>Chong Tribe Script — Assistente de Blind</h2><small>Um fluxo único, com o próximo clique indicado em cada etapa.</small></div><span class="cba-version">v${MODULE_VERSION}</span></div>
                <div class="cba-progress">${steps.map((step) => `<span class="${step.complete ? 'cba-done' : step.number === currentStep ? 'cba-active' : ''}">${step.complete ? '✓' : step.number}. ${escapeHtml(step.title)}</span>`).join('')}</div>
                <div class="cba-body">
                    <div class="cba-tip"><strong>Próximo passo:</strong> ${escapeHtml(steps.find((step) => step.number === currentStep)?.title || 'Revisar e preparar as MPs')}. Os dados continuam salvos quando o assistente redirecionar para outra aba da tribo.</div>
                    ${steps.map((step) => `<section class="cba-step ${step.complete ? 'cba-complete' : ''} ${step.number === currentStep ? 'cba-current' : ''}">
                        <span class="cba-number">${step.complete ? '✓' : step.number}</span>
                        <div class="cba-copy"><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.copy)}</small><span class="cba-status">${escapeHtml(step.status)}</span></div>
                        <button type="button" class="${step.number === currentStep ? 'cba-primary' : ''}" data-flow-action="${step.action}">${escapeHtml(step.label)}</button>
                    </section>`).join('')}
                </div>`;
        }

        function mountPanel() {
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            renderPanel(panel);
            panel.addEventListener('click', (event) => {
                const action = event.target.closest('[data-flow-action]')?.dataset.flowAction;
                if (action === 'troops') navigateOrReveal('members_defense', '#chonguera-tropas-tribo');
                if (action === 'blind') navigateOrReveal('contracts', '#chonguera-blind-preventivo');
                if (action === 'distribute') navigateOrReveal('members', '#chonguera-distribuidor-apoios');
                if (action === 'audit') navigateOrReveal('members', '#chonguera-auditoria-apoios');
            });
            const host = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            host.prepend(panel);
            window.addEventListener('storage', () => renderPanel(panel));
            window.setInterval(() => renderPanel(panel), 10000);
        }

        function mountLauncher() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cba-launcher';
            button.textContent = '🛡️ Assistente de Blind';
            button.addEventListener('click', () => { window.location.href = buildUrl('members'); });
            document.body.appendChild(button);
        }

        injectStyles();
        injectMenuLink();
        if (flowOpen) mountPanel();
        else mountLauncher();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Tropas da Tribo
    // -------------------------------------------------------------------------
    (async function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-tropas-tribo';
        const STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const HISTORY_STORAGE_PREFIX = 'chonguera_tropas_tribo_history_v1';
        const HISTORY_SNAPSHOT_PREFIX = 'chonguera_tropas_tribo_snapshots_v1';
        const HISTORY_LIMIT = 30;
        const HISTORY_SNAPSHOT_LIMIT = 8;
        const REQUEST_INTERVAL_MS = 650;
        const UNIT_ORDER = [
            'spear', 'sword', 'axe', 'archer', 'spy', 'light',
            'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'
        ];
        const UNIT_LABELS = {
            spear: 'Lanceiro',
            sword: 'Espadachim',
            axe: 'Bárbaro',
            archer: 'Arqueiro',
            spy: 'Explorador',
            light: 'Cavalaria leve',
            marcher: 'Arqueiro a cavalo',
            heavy: 'Cavalaria pesada',
            ram: 'Aríete',
            catapult: 'Catapulta',
            knight: 'Paladino',
            snob: 'Nobre',
            militia: 'Milícia'
        };
        const BASE_DEFENSE_UNITS = ['spear', 'sword', 'archer', 'heavy'];
        const DISTRIBUTION_OWNERSHIP_UNITS = ['spear', 'sword', 'spy', 'heavy'];
        const DEFAULT_STRATEGIC_SETTINGS = Object.freeze({
            full: { axe: 5000, light: 2000, ram: 200 },
            blind: { spear: 30000, sword: 30000, spy: 2000, heavy: 6000 }
        });

        if (!isDefensePage() || document.getElementById(SCRIPT_ID)) return;
        function availableWorldUnits() {
            const gameUnits = window.game_data?.units || [];
            if (!Array.isArray(gameUnits) || !gameUnits.length) return [];
            const enabled = new Set(gameUnits.map((unit) => String(unit || '').toLowerCase()));
            return UNIT_ORDER.filter((unit) => enabled.has(unit));
        }

        const state = {
            members: [],
            results: new Map(),
            errors: new Map(),
            unitOrder: availableWorldUnits(),
            unitIcons: new Map(),
            running: false,
            cancelled: false,
            abortController: null,
            processed: 0,
            total: 0,
            savedAt: null,
            history: [],
            historySnapshots: new Map(),
            viewMode: 'players',
            playerFilter: 'all',
            continentFilter: 'all',
            villageMinimums: {},
            strategicSettings: JSON.parse(JSON.stringify(DEFAULT_STRATEGIC_SETTINGS))
        };

        function isDefensePage() {
            const query = new URLSearchParams(window.location.search);
            return query.get('screen') === 'ally' && query.get('mode') === 'members_defense';
        }

        function normalizeText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        }

        function parseGameNumber(value) {
            const cleaned = String(value || '').replace(/[^\d-]/g, '');
            const parsed = Number.parseInt(cleaned, 10);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function wait(ms) {
            return new Promise((resolve) => window.setTimeout(resolve, ms));
        }

        function notify(message, type = 'success') {
            if (window.UI && typeof window.UI.InfoMessage === 'function') {
                if (type === 'error' && typeof window.UI.ErrorMessage === 'function') {
                    window.UI.ErrorMessage(message, 3500);
                } else {
                    window.UI.InfoMessage(message, 2500);
                }
                return;
            }
            console[type === 'error' ? 'error' : 'log'](`[Tropas da Tribo] ${message}`);
        }

        function getStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${STORAGE_PREFIX}:${world}:${ally}`;
        }

        function getCompatibleStorageKeys() {
            const preferred = getStorageKey();
            const suffix = preferred.slice(preferred.indexOf(':'));
            const keys = [preferred];
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key && key !== preferred && key.endsWith(suffix) && key.includes('_tropas_tribo_v2:')) {
                    keys.push(key);
                }
            }
            return keys;
        }

        function getStrategicSettingsKey() {
            return `${getStorageKey()}:strategic-settings`;
        }

        function loadStrategicSettings() {
            try {
                const stored = JSON.parse(window.localStorage.getItem(getStrategicSettingsKey()) || 'null') || {};
                ['full', 'blind'].forEach((group) => {
                    Object.keys(DEFAULT_STRATEGIC_SETTINGS[group]).forEach((unit) => {
                        const value = Number(stored?.[group]?.[unit]);
                        state.strategicSettings[group][unit] = Number.isFinite(value) && value > 0
                            ? Math.floor(value)
                            : DEFAULT_STRATEGIC_SETTINGS[group][unit];
                    });
                });
            } catch (_error) {
                state.strategicSettings = JSON.parse(JSON.stringify(DEFAULT_STRATEGIC_SETTINGS));
            }
        }

        function saveStrategicSettings() {
            window.localStorage.setItem(getStrategicSettingsKey(), JSON.stringify(state.strategicSettings));
        }

        function getHistoryStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${HISTORY_STORAGE_PREFIX}:${world}:${ally}`;
        }

        function getSnapshotStoragePrefix() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${HISTORY_SNAPSHOT_PREFIX}:${world}:${ally}`;
        }

        function getSnapshotIndexKey() {
            return `${getSnapshotStoragePrefix()}:index`;
        }

        function getSnapshotPayloadKey(snapshotId) {
            return `${getSnapshotStoragePrefix()}:${snapshotId}`;
        }

        function persistSnapshotIndex() {
            const ids = Array.from(state.historySnapshots.entries())
                .sort((a, b) => new Date(b[1]?.savedAt || 0) - new Date(a[1]?.savedAt || 0))
                .map(([id]) => id)
                .slice(0, HISTORY_SNAPSHOT_LIMIT);
            window.localStorage.setItem(getSnapshotIndexKey(), JSON.stringify(ids));
        }

        function loadHistorySnapshots() {
            state.historySnapshots.clear();
            try {
                const ids = JSON.parse(window.localStorage.getItem(getSnapshotIndexKey()) || '[]');
                if (!Array.isArray(ids)) return;
                ids.slice(0, HISTORY_SNAPSHOT_LIMIT).forEach((snapshotId) => {
                    try {
                        const payload = JSON.parse(window.localStorage.getItem(getSnapshotPayloadKey(snapshotId)) || 'null');
                        if (payload?.version === 2 && Array.isArray(payload.results)) {
                            state.historySnapshots.set(String(snapshotId), payload);
                        }
                    } catch (_error) {
                        window.localStorage.removeItem(getSnapshotPayloadKey(snapshotId));
                    }
                });
                persistSnapshotIndex();
            } catch (error) {
                console.warn('[Tropas da Tribo] Snapshots do histórico inválidos:', error);
            }
        }

        function removeOldestHistorySnapshot() {
            const oldest = Array.from(state.historySnapshots.entries())
                .sort((a, b) => new Date(a[1]?.savedAt || 0) - new Date(b[1]?.savedAt || 0))[0];
            if (!oldest) return false;
            state.historySnapshots.delete(oldest[0]);
            window.localStorage.removeItem(getSnapshotPayloadKey(oldest[0]));
            return true;
        }

        function saveHistorySnapshot(payload) {
            const snapshotId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const serialized = JSON.stringify(payload);
            while (state.historySnapshots.size >= HISTORY_SNAPSHOT_LIMIT) removeOldestHistorySnapshot();

            for (let attempt = 0; attempt <= HISTORY_SNAPSHOT_LIMIT; attempt += 1) {
                try {
                    window.localStorage.setItem(getSnapshotPayloadKey(snapshotId), serialized);
                    state.historySnapshots.set(snapshotId, JSON.parse(serialized));
                    persistSnapshotIndex();
                    return snapshotId;
                } catch (error) {
                    if (!removeOldestHistorySnapshot()) {
                        console.warn('[Tropas da Tribo] Sem espaço para guardar uma versão restaurável:', error);
                        return null;
                    }
                }
            }
            return null;
        }

        function loadHistory() {
            try {
                const parsed = JSON.parse(window.localStorage.getItem(getHistoryStorageKey()) || '[]');
                state.history = Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
            } catch (error) {
                state.history = [];
                console.warn('[Tropas da Tribo] Histórico de atualizações inválido:', error);
            }
        }

        function saveHistory() {
            try {
                window.localStorage.setItem(getHistoryStorageKey(), JSON.stringify(state.history.slice(0, HISTORY_LIMIT)));
            } catch (error) {
                console.warn('[Tropas da Tribo] Não foi possível salvar o histórico:', error);
            }
        }

        function appendHistoryEntry(context = {}) {
            const villages = Array.from(state.results.values()).reduce((sum, item) => sum + (Number(item.villages) || 0), 0);
            state.history.unshift({
                savedAt: context.savedAt || new Date().toISOString(),
                type: context.type || 'Atualização',
                requested: Number(context.requested) || 0,
                processed: Number(context.processed) || 0,
                loadedMembers: state.results.size,
                villages,
                failures: Number(context.failures ?? state.errors.size) || 0,
                cancelled: Boolean(context.cancelled),
                saved: context.saved !== false,
                snapshotId: context.snapshotId || null
            });
            state.history = state.history.slice(0, HISTORY_LIMIT);
            saveHistory();
        }

        function readStoredPayload() {
            const preferred = getStorageKey();
            for (const key of getCompatibleStorageKeys()) {
                const raw = window.localStorage.getItem(key);
                if (!raw) continue;
                if (key !== preferred) window.localStorage.setItem(preferred, raw);
                return raw;
            }
            return null;
        }

        function createStoredPayload(savedAt = new Date().toISOString()) {
            const results = Array.from(state.results.values()).map((result) => ({
                    id: result.id,
                    name: result.name,
                    villages: result.villages,
                    home: result.home,
                    transit: result.transit,
                    // ownedTotal is used only while reconciling both pages. Persisting it
                    // duplicates every unit of every village and can exceed localStorage
                    // on tribes with 6k+ villages.
                    villageDetails: (result.villageDetails || []).map((village) => ({
                        id: village.id,
                        name: village.name,
                        coordinate: village.coordinate,
                        points: village.points,
                        home: village.home,
                        transit: village.transit,
                        ownershipStatus: village.ownershipStatus || 'unknown'
                    })),
                    ownershipSummary: result.ownershipSummary,
                    ownershipCheckError: result.ownershipCheckError || '',
                    units: result.units,
                    icons: Object.fromEntries(result.icons),
                    loadedAt: result.loadedAt instanceof Date ? result.loadedAt.toISOString() : result.loadedAt
                }));
            return {
                version: 2,
                savedAt,
                unitOrder: state.unitOrder,
                unitIcons: Object.fromEntries(state.unitIcons),
                results
            };
        }

        function applyStoredPayload(payload) {
            if (payload?.version !== 2 || !Array.isArray(payload.results)) return false;
            const currentMemberIds = new Set(state.members.map((member) => String(member.id)));
            const storedUnits = Array.isArray(payload.unitOrder) ? payload.unitOrder.filter(Boolean) : [];
            state.results.clear();
            state.errors.clear();
            state.unitOrder = UNIT_ORDER.filter((unit) => storedUnits.includes(unit) || availableWorldUnits().includes(unit));
            storedUnits.forEach((unit) => {
                if (!state.unitOrder.includes(unit)) state.unitOrder.push(unit);
            });
            state.unitIcons = new Map(Object.entries(payload.unitIcons || {}));
            payload.results.forEach((stored) => {
                const id = String(stored?.id || '');
                if (!id || !currentMemberIds.has(id) || !Array.isArray(stored.units)) return;
                const result = {
                    id,
                    name: String(stored.name || `Jogador ${id}`),
                    villages: Number(stored.villages) || 0,
                    home: stored.home || {},
                    transit: stored.transit || {},
                    villageDetails: Array.isArray(stored.villageDetails) ? stored.villageDetails : [],
                    ownershipSummary: stored.ownershipSummary || null,
                    ownershipCheckError: String(stored.ownershipCheckError || ''),
                    units: stored.units,
                    icons: new Map(Object.entries(stored.icons || {})),
                    loadedAt: stored.loadedAt ? new Date(stored.loadedAt) : new Date(payload.savedAt)
                };
                state.results.set(id, result);
                mergeUnitMetadata(result);
            });
            state.savedAt = payload.savedAt || null;
            return true;
        }

        function saveStoredData(historyContext = null) {
            try {
                const savedAt = new Date().toISOString();
                const payload = createStoredPayload(savedAt);
                const serialized = JSON.stringify(payload);
                let saved = false;
                for (let attempt = 0; attempt <= HISTORY_SNAPSHOT_LIMIT; attempt += 1) {
                    try {
                        window.localStorage.setItem(getStorageKey(), serialized);
                        saved = true;
                        break;
                    } catch (error) {
                        if (!removeOldestHistorySnapshot()) throw error;
                    }
                }
                if (!saved) throw new Error('O armazenamento local permaneceu sem espaço após remover os snapshots antigos.');
                state.savedAt = savedAt;
                if (historyContext) {
                    const snapshotId = saveHistorySnapshot(payload);
                    appendHistoryEntry({ ...historyContext, savedAt, saved: true, snapshotId });
                }
                return true;
            } catch (error) {
                console.error('[Tropas da Tribo] Falha ao salvar dados no navegador:', error);
                notify('Não foi possível salvar as tropas no armazenamento do navegador.', 'error');
                return false;
            }
        }

        function loadStoredData() {
            try {
                const raw = readStoredPayload();
                if (!raw) return;
                const payload = JSON.parse(raw);
                if (!applyStoredPayload(payload)) return;
                if (!state.history.length && state.savedAt) {
                    const snapshotId = saveHistorySnapshot(payload);
                    appendHistoryEntry({
                        savedAt: state.savedAt,
                        type: 'Dados existentes',
                        requested: state.results.size,
                        processed: state.results.size,
                        failures: 0,
                        saved: true,
                        snapshotId
                    });
                }
            } catch (error) {
                console.warn('[Tropas da Tribo] Dados salvos inválidos; o cache foi ignorado:', error);
            }
        }

        function restoreHistorySnapshot(snapshotId) {
            if (state.running) return;
            const selected = state.historySnapshots.get(String(snapshotId));
            if (!selected) {
                notify('Esta versão não está mais disponível no navegador.', 'error');
                return;
            }
            const selectedAt = selected.savedAt ? new Date(selected.savedAt).toLocaleString('pt-BR') : 'data desconhecida';
            const members = Array.isArray(selected.results) ? selected.results.length : 0;
            const villages = (selected.results || []).reduce((sum, item) => sum + (Number(item.villages) || 0), 0);
            if (!window.confirm(
                `Restaurar a coleta de ${selectedAt}?\n\n`
                + `${members} membro(s) e ${formatNumber(villages)} aldeia(s).\n`
                + 'O estado atual será salvo automaticamente como backup antes da restauração.'
            )) return;

            const selectedCopy = JSON.parse(JSON.stringify(selected));
            if (state.results.size) {
                const backupSaved = saveStoredData({
                    type: 'Backup antes da restauração',
                    requested: state.results.size,
                    processed: state.results.size,
                    failures: state.errors.size,
                    cancelled: false
                });
                if (!backupSaved) {
                    notify('A restauração foi cancelada porque não foi possível salvar o backup atual.', 'error');
                    return;
                }
            }

            try {
                const restoredAt = new Date().toISOString();
                const restoredPayload = {
                    ...selectedCopy,
                    savedAt: restoredAt,
                    restoredFrom: selected.savedAt || snapshotId
                };
                window.localStorage.setItem(getStorageKey(), JSON.stringify(restoredPayload));
                if (!applyStoredPayload(restoredPayload)) throw new Error('Snapshot incompatível.');
                const restoredSnapshotId = saveHistorySnapshot(restoredPayload);
                appendHistoryEntry({
                    savedAt: restoredAt,
                    type: `Restauração de ${selectedAt}`,
                    requested: members,
                    processed: state.results.size,
                    failures: 0,
                    cancelled: false,
                    saved: true,
                    snapshotId: restoredSnapshotId
                });
                render();
                notify(`Coleta de ${selectedAt} restaurada. O estado anterior ficou salvo no histórico.`, 'success');
            } catch (error) {
                console.error('[Tropas da Tribo] Falha ao restaurar snapshot:', error);
                notify('Não foi possível restaurar esta versão.', 'error');
            }
        }

        function clearStoredData() {
            if (state.running) return;
            getCompatibleStorageKeys().forEach((key) => window.localStorage.removeItem(key));
            state.results.clear();
            state.errors.clear();
            state.unitOrder = availableWorldUnits();
            state.unitIcons.clear();
            state.savedAt = null;
            render();
            notify('Dados de tropas removidos do armazenamento do navegador.');
        }

        function findMemberSelect(doc = document) {
            const selects = Array.from(doc.querySelectorAll('select'));
            return selects.find((select) => {
                const marker = `${select.id} ${select.name} ${select.getAttribute('onchange') || ''}`;
                return /player_id|members_defense/i.test(marker) && select.options.length > 0;
            }) || selects.find((select) =>
                Array.from(select.options).some((option) => /^\d+$/.test(option.value)) &&
                select.options.length > 1
            ) || null;
        }

        function getMembers() {
            const select = findMemberSelect();
            const currentId = new URLSearchParams(window.location.search).get('player_id') || '';

            if (!select) {
                return [{
                    id: currentId || String(window.game_data?.player?.id || 'atual'),
                    name: window.game_data?.player?.name || 'Jogador atual',
                    selected: true
                }];
            }

            const unique = new Map();
            Array.from(select.options).forEach((option) => {
                const id = String(option.value || '').trim();
                if (!/^\d+$/.test(id) || id === '0') return;
                unique.set(id, {
                    id,
                    name: option.textContent.trim() || `Jogador ${id}`,
                    selected: option.selected || id === currentId
                });
            });
            return Array.from(unique.values());
        }

        function unitFromImage(image) {
            const source = image.getAttribute('src') || '';
            const match = source.match(/unit_([a-z_]+)\.(?:png|gif|webp)/i);
            if (!match || match[1] === 'all') return null;
            return match[1].toLowerCase();
        }

        function troopLocationFromText(value) {
            const text = normalizeText(value);
            if (/(^|\b)(na aldeia|em casa|in village|at home)(\b|$)/.test(text)) return 'na aldeia';
            if (/(^|\b)(a caminho|fora da aldeia|fora|em transito|em viagem|em apoio|apoios?|apoiando|reforcos?|estacionadas? fora|outside|away|on the way|in transit|supporting)(\b|$)/.test(text)) return 'fora';
            return '';
        }

        function rowStatus(cells) {
            const index = cells.findIndex((cell) => troopLocationFromText(cell.textContent));
            if (index < 0) return { index: -1, value: '' };
            return { index, value: troopLocationFromText(cells[index].textContent) };
        }

        function findDefenseTable(doc) {
            const candidates = Array.from(doc.querySelectorAll('table')).filter((table) => {
                const units = Array.from(table.querySelectorAll('img')).filter(unitFromImage);
                if (units.length < 2) return false;
                const statuses = Array.from(table.rows).map((row) => rowStatus(Array.from(row.cells)).value);
                return statuses.includes('na aldeia') && statuses.includes('fora');
            });

            // A página possui tabelas externas de layout. A menor tabela válida é a tabela real de tropas.
            return candidates.sort((a, b) => a.querySelectorAll('table').length - b.querySelectorAll('table').length)[0] || null;
        }

        function extractUnits(table) {
            const units = [];
            const icons = new Map();
            Array.from(table.querySelectorAll('img')).forEach((image) => {
                const unit = unitFromImage(image);
                if (!unit || units.includes(unit)) return;
                units.push(unit);
                try {
                    icons.set(unit, new URL(image.getAttribute('src'), window.location.href).href);
                } catch (_error) {
                    // O nome da unidade ainda permite renderizar a coluna sem o ícone.
                }
            });
            return { units, icons };
        }

        function findPlayerName(doc, fallbackName, memberId = '') {
            const select = findMemberSelect(doc);
            const requestedId = String(memberId || '').trim();
            const requestedOption = select
                ? Array.from(select.options).find((option) => String(option.value || '').trim() === requestedId)
                : null;
            if (requestedOption?.textContent?.trim()) return requestedOption.textContent.trim();

            // Em respostas obtidas por fetch, o DOM pode marcar a primeira opção como selecionada
            // mesmo quando a URL consultou outro player_id. Só confiamos na seleção se o ID bater.
            const selected = select?.selectedOptions?.[0];
            if (selected && (!requestedId || String(selected.value || '').trim() === requestedId)) {
                return selected.textContent?.trim() || fallbackName || 'Jogador';
            }
            return fallbackName || 'Jogador';
        }

        function parseDefenseDocument(doc, member) {
            const table = findDefenseTable(doc);
            if (!table) {
                throw new Error('Tabela de defesa não encontrada ou sem permissão de visualização.');
            }

            const { units, icons } = extractUnits(table);
            if (!units.length) throw new Error('Não foi possível identificar as unidades da tabela.');

            const home = Object.fromEntries(units.map((unit) => [unit, 0]));
            const transit = Object.fromEntries(units.map((unit) => [unit, 0]));
            const villageDetails = [];
            let currentVillage = null;
            let troopRows = 0;

            Array.from(table.rows).forEach((row, rowIndex) => {
                const cells = Array.from(row.cells);
                const statusInfo = rowStatus(cells);
                const statusIndex = statusInfo.index;
                if (statusIndex < 0) return;

                const status = statusInfo.value;
                const villageCell = cells.slice(0, statusIndex).find((cell) => {
                    const text = normalizeText(cell.textContent);
                    return cell.rowSpan > 1 || /\d{3}\|\d{3}/.test(text) || Boolean(cell.querySelector('a'));
                });

                if (status === 'na aldeia') {
                    const villageName = villageCell?.textContent.replace(/\s+/g, ' ').trim() || `Aldeia ${villageDetails.length + 1}`;
                    const coordinate = villageName.match(/(\d{3}\|\d{3})/)?.[1] || '';
                    const villageTarget = villageCell?.querySelector('[data-id], a[href*="id="], a[href*="village="]');
                    const villageHref = villageTarget?.getAttribute('href') || '';
                    let villageId = villageTarget?.getAttribute('data-id') || '';
                    if (!villageId && villageHref) {
                        try {
                            const villageUrl = new URL(villageHref, window.location.href);
                            villageId = villageUrl.searchParams.get('id') || villageUrl.searchParams.get('village') || '';
                        } catch (_error) {
                            villageId = villageHref.match(/[?&]id=(\d+)/)?.[1]
                                || villageHref.match(/[?&]village=(\d+)/)?.[1]
                                || '';
                        }
                    }
                    const pointsCell = cells.slice(0, statusIndex).find((cell) => cell !== villageCell && /\d/.test(cell.textContent));
                    currentVillage = {
                        id: String(villageId),
                        name: villageName,
                        coordinate,
                        points: parseGameNumber(pointsCell?.textContent),
                        home: Object.fromEntries(units.map((unit) => [unit, 0])),
                        transit: Object.fromEntries(units.map((unit) => [unit, 0]))
                    };
                    villageDetails.push(currentVillage);
                }

                const troopCells = cells.slice(statusIndex + 1);
                units.forEach((unit, index) => {
                    const value = parseGameNumber(troopCells[index]?.textContent);
                    if (status === 'na aldeia') {
                        home[unit] += value;
                        if (currentVillage) currentVillage.home[unit] += value;
                    }
                    if (status === 'fora') {
                        transit[unit] += value;
                        if (currentVillage) currentVillage.transit[unit] += value;
                    }
                });
                troopRows += 1;
            });

            if (!troopRows) throw new Error('A tabela foi encontrada, mas nenhuma linha de tropas pôde ser lida.');

            return {
                id: String(member.id),
                name: findPlayerName(doc, member.name, member.id),
                villages: villageDetails.length,
                home,
                transit,
                villageDetails,
                units,
                icons,
                loadedAt: new Date()
            };
        }

        function mergeUnitMetadata(result) {
            result.units.forEach((unit) => {
                if (!state.unitOrder.includes(unit)) state.unitOrder.push(unit);
                if (result.icons.has(unit) && !state.unitIcons.has(unit)) {
                    state.unitIcons.set(unit, result.icons.get(unit));
                }
            });
        }

        function buildMemberUrl(memberId, mode = 'members_defense') {
            const url = new URL(window.location.href);
            url.searchParams.set('screen', 'ally');
            url.searchParams.set('mode', mode);
            url.searchParams.set('player_id', memberId);
            url.hash = '';
            return url.href;
        }

        async function fetchMember(member) {
            const response = await fetch(buildMemberUrl(member.id, 'members_defense'), {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                signal: state.abortController.signal,
                headers: { Accept: 'text/html,application/xhtml+xml' }
            });
            if (!response.ok) throw new Error(`Falha HTTP ${response.status}.`);

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const result = parseDefenseDocument(doc, member);
            try {
                const troopResponse = await fetch(buildMemberUrl(member.id, 'members_troops'), {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                    signal: state.abortController.signal,
                    headers: { Accept: 'text/html,application/xhtml+xml' }
                });
                if (!troopResponse.ok) throw new Error(`Falha HTTP ${troopResponse.status}.`);
                const troopHtml = await troopResponse.text();
                const troopDocument = new DOMParser().parseFromString(troopHtml, 'text/html');
                const owned = parseOwnedTroopDocument(troopDocument);
                reconcileTroopOwnership(result, owned);
            } catch (error) {
                if (error.name === 'AbortError') throw error;
                result.ownershipCheckError = error.message || 'Não foi possível validar as tropas próprias.';
                result.villageDetails.forEach((village) => { village.ownershipStatus = 'unknown'; });
                result.ownershipSummary = { verified: 0, mismatch: 0, unknown: result.villageDetails.length };
                console.warn(`[Tropas da Tribo] Validação rápida indisponível para ${member.name}:`, error);
            }
            return result;
        }

        function parseOwnedTroopDocument(doc) {
            const candidates = Array.from(doc.querySelectorAll('table')).map((table) => {
                const unitColumns = new Map();
                Array.from(table.rows).slice(0, 4).forEach((row) => {
                    Array.from(row.cells).forEach((cell, index) => {
                        const unit = Array.from(cell.querySelectorAll('img')).map(unitFromImage).find(Boolean);
                        if (unit) unitColumns.set(index, unit);
                    });
                });
                const villageLinks = table.querySelectorAll('a[href*="screen=info_village"][href*="id="]');
                return { table, unitColumns, villageLinks: villageLinks.length };
            }).filter((candidate) => candidate.unitColumns.size >= 2 && candidate.villageLinks > 0)
                .sort((a, b) => b.villageLinks - a.villageLinks || b.unitColumns.size - a.unitColumns.size);
            const candidate = candidates[0];
            if (!candidate) throw new Error('Tabela de tropas próprias não encontrada ou sem permissão.');

            const villages = new Map();
            Array.from(candidate.table.rows).forEach((row) => {
                const link = row.querySelector('a[href*="screen=info_village"][href*="id="]');
                if (!link) return;
                let villageId = '';
                try { villageId = new URL(link.getAttribute('href'), window.location.href).searchParams.get('id') || ''; }
                catch (_error) { villageId = (link.getAttribute('href') || '').match(/[?&]id=(\d+)/)?.[1] || ''; }
                const coordinate = (link.textContent || '').match(/(\d{3}\|\d{3})/)?.[1] || '';
                if (!villageId && !coordinate) return;
                const cells = Array.from(row.cells);
                const units = {};
                candidate.unitColumns.forEach((unit, index) => {
                    units[unit] = parseGameNumber(cells[index]?.textContent);
                });
                const item = { id: String(villageId), coordinate, units };
                if (villageId) villages.set(`id:${villageId}`, item);
                if (coordinate) villages.set(`coord:${coordinate}`, item);
            });
            if (!villages.size) throw new Error('A tabela de tropas próprias foi encontrada, mas nenhuma aldeia pôde ser lida.');
            return villages;
        }

        function reconcileTroopOwnership(result, ownedVillages) {
            const summary = { verified: 0, mismatch: 0, unknown: 0 };
            result.villageDetails.forEach((village) => {
                const owned = ownedVillages.get(`id:${village.id}`) || ownedVillages.get(`coord:${village.coordinate}`);
                if (!owned) {
                    village.ownershipStatus = 'unknown';
                    summary.unknown += 1;
                    return;
                }
                village.ownedTotal = { ...owned.units };
                const comparedUnits = DISTRIBUTION_OWNERSHIP_UNITS.filter((unit) =>
                    result.units.includes(unit) && Object.hasOwn(owned.units, unit)
                );
                // Only the four units used by the support distributor matter here.
                // Offensive troops may move between the two sequential page reads and
                // must not force an otherwise safe defensive origin into the slow audit.
                const matches = comparedUnits.length === DISTRIBUTION_OWNERSHIP_UNITS.length && comparedUnits.every((unit) =>
                    parseGameNumber(owned.units[unit]) === parseGameNumber(village.home?.[unit]) + parseGameNumber(village.transit?.[unit])
                );
                village.ownershipStatus = matches ? 'verified' : 'mismatch';
                summary[matches ? 'verified' : 'mismatch'] += 1;
            });
            result.ownershipSummary = summary;
        }

        function getCurrentMember() {
            return state.members.find((member) => member.selected) || state.members[0];
        }

        function readCurrentPage() {
            const member = getCurrentMember();
            if (!member) return;
            // Preserve a saved cross-check. Reading only the visible Defense page would
            // replace a verified result with an incomplete, unverified snapshot.
            if (state.results.has(member.id)) return;
            try {
                const result = parseDefenseDocument(document, member);
                state.results.set(member.id, result);
                state.errors.delete(member.id);
                mergeUnitMetadata(result);
            } catch (error) {
                if (!state.results.has(member.id)) state.errors.set(member.id, error.message);
                console.warn('[Tropas da Tribo] Página atual não lida:', error);
            }
        }

        function totalsFor(result, unit) {
            const home = result?.home?.[unit] || 0;
            const transit = result?.transit?.[unit] || 0;
            return { home, transit, total: home + transit };
        }

        function continentForVillage(village) {
            const match = String(village?.coordinate || village?.name || '').match(/(\d{3})\|(\d{3})/);
            if (!match) return 'Sem coordenada';
            const x = Number(match[1]);
            const y = Number(match[2]);
            return `K${Math.floor(y / 100)}${Math.floor(x / 100)}`;
        }

        function stoppedDefenseTotal(village) {
            return BASE_DEFENSE_UNITS.reduce((sum, unit) => sum + (Number(village?.home?.[unit]) || 0), 0);
        }

        function supportKits(village) {
            const spear = Number(village?.home?.spear) || 0;
            const sword = Number(village?.home?.sword) || 0;
            return Math.min(Math.floor(spear / 1000), Math.floor(sword / 1000));
        }

        function villageUnitAmount(village, unit, scope = 'total') {
            if (scope === 'home') return Number(village?.home?.[unit]) || 0;
            return totalsFor(village, unit).total;
        }

        function isAttackFull(village, scope = 'total') {
            return Object.entries(state.strategicSettings.full).every(([unit, minimum]) =>
                villageUnitAmount(village, unit, scope) >= Number(minimum)
            );
        }

        function attackFullProgress(village, scope = 'total') {
            return Math.min(...Object.entries(state.strategicSettings.full).map(([unit, minimum]) =>
                minimum > 0 ? villageUnitAmount(village, unit, scope) / minimum : 1
            ));
        }

        function strategicUnitTotals(rows) {
            const units = new Set([
                ...state.unitOrder,
                ...Object.keys(state.strategicSettings.full),
                ...Object.keys(state.strategicSettings.blind)
            ]);
            const totals = Object.fromEntries(Array.from(units).map((unit) => [unit, { home: 0, total: 0 }]));
            rows.forEach(({ village }) => {
                units.forEach((unit) => {
                    totals[unit].home += villageUnitAmount(village, unit, 'home');
                    totals[unit].total += villageUnitAmount(village, unit, 'total');
                });
            });
            return totals;
        }

        function blindCapacity(totals, scope = 'total') {
            const ratios = Object.entries(state.strategicSettings.blind).map(([unit, amount]) => ({
                unit,
                amount,
                available: Number(totals?.[unit]?.[scope]) || 0,
                packs: amount > 0 ? Math.floor((Number(totals?.[unit]?.[scope]) || 0) / amount) : 0
            }));
            const capacity = ratios.length ? Math.min(...ratios.map((item) => item.packs)) : 0;
            const limiting = ratios.filter((item) => item.packs === capacity).map((item) => UNIT_LABELS[item.unit] || item.unit);
            return {
                capacity,
                limiting,
                remainder: Object.fromEntries(ratios.map((item) => [item.unit, Math.max(0, item.available - capacity * item.amount)]))
            };
        }

        function buildStrategicInsights(rows) {
            const totals = strategicUnitTotals(rows);
            const fullTotal = rows.filter(({ village }) => isAttackFull(village, 'total')).length;
            const fullHome = rows.filter(({ village }) => isAttackFull(village, 'home')).length;
            const nearFull = rows.filter(({ village }) => {
                const progress = attackFullProgress(village, 'total');
                return progress >= 0.75 && progress < 1;
            }).length;
            return {
                totals,
                fullTotal,
                fullHome,
                fullOutside: Math.max(0, fullTotal - fullHome),
                nearFull,
                blindTotal: blindCapacity(totals, 'total'),
                blindHome: blindCapacity(totals, 'home')
            };
        }

        function strategicPatternText(group) {
            return Object.entries(state.strategicSettings[group]).map(([unit, amount]) =>
                `${formatNumber(amount)} ${UNIT_LABELS[unit] || unit}`
            ).join(' + ');
        }

        function dashboardVillageRows() {
            const rows = [];
            state.results.forEach((result) => {
                if (state.playerFilter !== 'all' && state.playerFilter !== result.id) return;
                (result.villageDetails || []).forEach((village) => {
                    const continent = continentForVillage(village);
                    if (state.continentFilter !== 'all' && state.continentFilter !== continent) return;
                    rows.push({ result, village, continent });
                });
            });
            return rows.sort((a, b) => a.continent.localeCompare(b.continent, 'pt-BR', { numeric: true })
                || a.result.name.localeCompare(b.result.name, 'pt-BR')
                || (Number(b.village.points) || 0) - (Number(a.village.points) || 0));
        }

        function blankUnitTotals() {
            return Object.fromEntries(state.unitOrder.map((unit) => [unit, 0]));
        }

        function buildContinentDashboard() {
            const villages = dashboardVillageRows();
            const continents = new Map();
            const players = new Map();

            villages.forEach(({ result, village, continent }) => {
                if (!continents.has(continent)) {
                    continents.set(continent, {
                        continent,
                        playerIds: new Set(),
                        villages: 0,
                        points: 0,
                        emptyVillages: 0,
                        kits: 0,
                        home: blankUnitTotals(),
                        strategicRows: []
                    });
                }
                const continentRow = continents.get(continent);
                continentRow.playerIds.add(result.id);
                continentRow.villages += 1;
                continentRow.points += Number(village.points) || 0;
                continentRow.emptyVillages += stoppedDefenseTotal(village) === 0 ? 1 : 0;
                continentRow.kits += supportKits(village);
                continentRow.strategicRows.push({ result, village, continent });
                state.unitOrder.forEach((unit) => {
                    continentRow.home[unit] += Number(village.home?.[unit]) || 0;
                });

                const playerKey = `${continent}\u0000${result.id}`;
                if (!players.has(playerKey)) {
                    players.set(playerKey, {
                        continent,
                        id: result.id,
                        name: result.name,
                        villages: 0,
                        points: 0,
                        emptyVillages: 0,
                        kits: 0,
                        home: blankUnitTotals(),
                        strategicRows: [],
                        loadedAt: result.loadedAt
                    });
                }
                const playerRow = players.get(playerKey);
                playerRow.villages += 1;
                playerRow.points += Number(village.points) || 0;
                playerRow.emptyVillages += stoppedDefenseTotal(village) === 0 ? 1 : 0;
                playerRow.kits += supportKits(village);
                playerRow.strategicRows.push({ result, village, continent });
                state.unitOrder.forEach((unit) => {
                    playerRow.home[unit] += Number(village.home?.[unit]) || 0;
                });
            });

            return {
                villages,
                continents: Array.from(continents.values()).sort((a, b) => a.continent.localeCompare(b.continent, 'pt-BR', { numeric: true })),
                players: Array.from(players.values()).sort((a, b) => a.continent.localeCompare(b.continent, 'pt-BR', { numeric: true })
                    || b.kits - a.kits
                    || stoppedDefenseFromTotals(b.home) - stoppedDefenseFromTotals(a.home)
                    || a.name.localeCompare(b.name, 'pt-BR'))
            };
        }

        function stoppedDefenseFromTotals(home) {
            return BASE_DEFENSE_UNITS.reduce((sum, unit) => sum + (Number(home?.[unit]) || 0), 0);
        }

        function globalTotals() {
            const totals = {};
            state.unitOrder.forEach((unit) => {
                totals[unit] = { home: 0, transit: 0, total: 0 };
            });
            state.results.forEach((result) => {
                state.unitOrder.forEach((unit) => {
                    const values = totalsFor(result, unit);
                    totals[unit].home += values.home;
                    totals[unit].transit += values.transit;
                    totals[unit].total += values.total;
                });
            });
            return totals;
        }

        function unitHeader(unit) {
            const label = UNIT_LABELS[unit] || unit;
            const icon = state.unitIcons.get(unit) || `/graphic/unit/unit_${unit}.png`;
            return `<img class="mtt-unit-icon" src="${escapeHtml(icon)}" alt="${escapeHtml(label)}" title="${escapeHtml(label)}">`;
        }

        function renderSummary(panel) {
            const summary = panel.querySelector('.mtt-summary');
            const totals = globalTotals();
            const villages = Array.from(state.results.values()).reduce((sum, item) => sum + item.villages, 0);
            const ownership = Array.from(state.results.values()).reduce((summary, item) => {
                (item.villageDetails || []).forEach((village) => {
                    const status = ['verified', 'mismatch'].includes(village.ownershipStatus) ? village.ownershipStatus : 'unknown';
                    summary[status] += 1;
                });
                return summary;
            }, { verified: 0, mismatch: 0, unknown: 0 });
            const totalMembers = state.members.length || 1;

            summary.innerHTML = `
                <div class="mtt-stats">
                    <div><strong>${state.results.size}</strong><span>Membros carregados / ${totalMembers}</span></div>
                    <div><strong>${formatNumber(villages)}</strong><span>Aldeias visíveis</span></div>
                    <div><strong>${state.errors.size}</strong><span>Falhas / sem acesso</span></div>
                    <div><strong>${formatNumber(ownership.verified)}</strong><span>Origens próprias validadas rapidamente</span></div>
                    <div><strong>${formatNumber(ownership.mismatch)}</strong><span>Divergências para auditoria detalhada</span></div>
                    <div><strong>${formatNumber(ownership.unknown)}</strong><span>Origens sem validação</span></div>
                </div>
                <div class="mtt-total-grid">
                    ${state.unitOrder.map((unit) => {
                        const values = totals[unit];
                        return `<div class="mtt-unit-total">
                            ${unitHeader(unit)}
                            <strong>${formatNumber(values.total)}</strong>
                            <small><span title="Na aldeia">🏠 ${formatNumber(values.home)}</span><span title="Fora da aldeia, em trânsito ou apoiando">➜ ${formatNumber(values.transit)}</span></small>
                        </div>`;
                    }).join('') || '<div class="mtt-empty">Nenhuma tropa carregada ainda.</div>'}
                </div>`;
        }

        function elapsedText(isoDate) {
            const timestamp = new Date(isoDate).getTime();
            if (!Number.isFinite(timestamp)) return 'tempo desconhecido';
            const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
            if (minutes < 1) return 'agora';
            if (minutes < 60) return `há ${minutes} min`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `há ${hours}h ${minutes % 60}min`;
            const days = Math.floor(hours / 24);
            return `há ${days} dia${days === 1 ? '' : 's'} e ${hours % 24}h`;
        }

        function renderHistory(panel) {
            const container = panel.querySelector('.mtt-history');
            if (!container) return;
            if (!state.history.length) {
                container.innerHTML = '<strong>Histórico de atualizações</strong><span>Nenhuma coleta registrada ainda.</span>';
                return;
            }
            const latest = state.history[0];
            container.innerHTML = `
                <div class="mtt-history-head">
                    <strong>Histórico de atualizações</strong>
                    <span>Última tentativa: ${escapeHtml(new Date(latest.savedAt).toLocaleString('pt-BR'))} — ${escapeHtml(elapsedText(latest.savedAt))} · até ${HISTORY_SNAPSHOT_LIMIT} versões restauráveis</span>
                </div>
                <details>
                    <summary>Ver ${formatNumber(state.history.length)} registro(s)</summary>
                    <div class="mtt-history-table-wrap"><table class="vis mtt-history-table">
                        <thead><tr><th>Data</th><th>Tipo</th><th>Processados</th><th>Membros salvos</th><th>Aldeias</th><th>Falhas</th><th>Resultado</th><th>Versão</th></tr></thead>
                        <tbody>${state.history.map((entry) => {
                            const canRestore = entry.snapshotId && state.historySnapshots.has(String(entry.snapshotId));
                            return `<tr>
                            <td>${escapeHtml(new Date(entry.savedAt).toLocaleString('pt-BR'))}<small>${escapeHtml(elapsedText(entry.savedAt))}</small></td>
                            <td>${escapeHtml(entry.type || 'Atualização')}</td>
                            <td>${formatNumber(entry.processed)} / ${formatNumber(entry.requested)}</td>
                            <td>${formatNumber(entry.loadedMembers)}</td>
                            <td>${formatNumber(entry.villages)}</td>
                            <td>${formatNumber(entry.failures)}</td>
                            <td>${entry.saved === false ? 'Não salva' : entry.cancelled ? 'Cancelada · parcial salva' : 'Salva'}</td>
                            <td>${canRestore ? `<button type="button" class="btn mtt-restore" data-action="restore-history" data-snapshot-id="${escapeHtml(entry.snapshotId)}" ${state.running ? 'disabled' : ''}>Restaurar versão</button>` : '<span class="mtt-snapshot-unavailable">Somente registro</span>'}</td>
                        </tr>`; }).join('')}</tbody>
                    </table></div>
                </details>`;
        }

        function renderMemberTable(panel) {
            const container = panel.querySelector('.mtt-table-wrap');
            const rows = state.members.map((member) => {
                const result = state.results.get(member.id);
                const error = state.errors.get(member.id);
                if (!result) {
                    return `<tr class="${error ? 'mtt-error-row' : ''}">
                        <td>${escapeHtml(member.name)}</td>
                        <td colspan="${state.unitOrder.length + 1}">${error ? `⚠ ${escapeHtml(error)}` : 'Aguardando carregamento'}</td>
                    </tr>`;
                }
                return `<tr>
                    <td class="mtt-player">${escapeHtml(result.name)}</td>
                    <td>${formatNumber(result.villages)}</td>
                    ${state.unitOrder.map((unit) => {
                        const values = totalsFor(result, unit);
                        return `<td title="Na aldeia: ${formatNumber(values.home)} | Fora/em trânsito/apoiando: ${formatNumber(values.transit)}">
                            <strong>${formatNumber(values.total)}</strong>
                            <small>${formatNumber(values.home)} / ${formatNumber(values.transit)}</small>
                        </td>`;
                    }).join('')}
                </tr>`;
            }).join('');

            container.innerHTML = `
                <table class="vis mtt-table">
                    <thead><tr>
                        <th>Jogador</th>
                        <th>Aldeias</th>
                        ${state.unitOrder.map((unit) => `<th>${unitHeader(unit)}</th>`).join('')}
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        function getFilteredVillages() {
            const minimums = Object.entries(state.villageMinimums)
                .map(([unit, value]) => [unit, Number(value) || 0])
                .filter(([, value]) => value > 0);
            const matches = [];

            state.members.forEach((member) => {
                if (state.playerFilter !== 'all' && state.playerFilter !== member.id) return;
                const result = state.results.get(member.id);
                if (!result) return;
                (result.villageDetails || []).forEach((village) => {
                    const passes = minimums.every(([unit, minimum]) => totalsFor(village, unit).total >= minimum);
                    if (passes) matches.push({ member, result, village });
                });
            });
            return matches;
        }

        function renderVillageFilters(panel) {
            const filters = panel.querySelector('.mtt-village-filters');
            filters.hidden = state.viewMode !== 'villages';
            if (filters.hidden) return;

            const matches = getFilteredVillages();
            const activeCount = Object.values(state.villageMinimums).filter((value) => Number(value) > 0).length;
            filters.innerHTML = `
                <div class="mtt-filter-title">
                    <strong>Filtro mínimo — tropas totais da origem</strong>
                    <span>Soma o que está na aldeia, a caminho, retornando ou em apoio fora. Todas as condições serão exigidas ao mesmo tempo.</span>
                </div>
                <div class="mtt-filter-grid">
                    ${state.unitOrder.map((unit) => {
                        const label = UNIT_LABELS[unit] || unit;
                        const icon = state.unitIcons.get(unit) || `/graphic/unit/unit_${unit}.png`;
                        return `<label title="Mínimo total de ${escapeHtml(label)} pertencente à aldeia de origem">
                            <img class="mtt-unit-icon" src="${escapeHtml(icon)}" alt="${escapeHtml(label)}">
                            <input type="number" min="0" step="1" inputmode="numeric" data-unit-filter="${escapeHtml(unit)}" value="${Number(state.villageMinimums[unit]) || ''}" placeholder="Mínimo">
                        </label>`;
                    }).join('')}
                </div>
                <div class="mtt-filter-actions">
                    <button type="button" class="btn btn-confirm-yes" data-action="apply-village-filters">Aplicar filtro</button>
                    <button type="button" class="btn" data-action="clear-village-filters" ${activeCount ? '' : 'disabled'}>Limpar filtro</button>
                    <button type="button" class="btn" data-action="copy-coordinates" ${matches.some((item) => item.village.coordinate) ? '' : 'disabled'}>Copiar coordenadas</button>
                    <strong>${formatNumber(matches.length)} aldeia(s) encontrada(s)</strong>
                </div>`;
        }

        function renderVillageTable(panel) {
            const container = panel.querySelector('.mtt-table-wrap');
            const rows = getFilteredVillages().map(({ result, village }) => `<tr>
                <td class="mtt-player">${escapeHtml(result.name)}</td>
                <td class="mtt-village">${escapeHtml(village.name)}</td>
                <td class="mtt-coordinate">${escapeHtml(village.coordinate || '-')}</td>
                <td>${formatNumber(village.points)}</td>
                ${state.unitOrder.map((unit) => {
                    const values = totalsFor(village, unit);
                    return `<td title="Na aldeia: ${formatNumber(values.home)} | Fora/em trânsito/apoiando: ${formatNumber(values.transit)}">
                        <strong>${formatNumber(values.total)}</strong>
                        <small>${formatNumber(values.home)} / ${formatNumber(values.transit)}</small>
                    </td>`;
                }).join('')}
            </tr>`);

            const body = rows.length
                ? rows.join('')
                : `<tr><td colspan="${state.unitOrder.length + 4}" class="mtt-no-villages">Nenhuma aldeia armazenada para este filtro. Clique em “Carregar tropas e salvar” para atualizar os detalhes.</td></tr>`;
            container.innerHTML = `
                <table class="vis mtt-table mtt-village-table">
                    <thead><tr>
                        <th>Jogador</th>
                        <th>Aldeia</th>
                        <th>Coordenada</th>
                        <th>Pontos</th>
                        ${state.unitOrder.map((unit) => `<th>${unitHeader(unit)}</th>`).join('')}
                    </tr></thead>
                    <tbody>${body}</tbody>
                </table>`;
        }

        function renderContinentDashboard(panel) {
            const container = panel.querySelector('.mtt-table-wrap');
            const dashboard = buildContinentDashboard();
            const strategy = buildStrategicInsights(dashboard.villages);
            const totalPoints = dashboard.villages.reduce((sum, item) => sum + (Number(item.village.points) || 0), 0);
            const emptyVillages = dashboard.villages.filter((item) => stoppedDefenseTotal(item.village) === 0).length;
            const kits = dashboard.villages.reduce((sum, item) => sum + supportKits(item.village), 0);
            const players = new Set(dashboard.villages.map((item) => item.result.id)).size;

            container.classList.add('mtt-continent-dashboard');
            container.innerHTML = `
                <section class="mtt-power-panel">
                    <div class="mtt-dashboard-heading"><div><h4>📊 Inteligência estratégica — estilo Power BI</h4><span>Os indicadores respeitam os filtros de jogador e continente selecionados.</span></div></div>
                    <div class="mtt-strategy-settings">
                        <div><strong>Padrão de full ofensivo</strong><span>Conta por aldeia usando tropas pertencentes à origem, inclusive fora ou em movimento.</span></div>
                        ${Object.entries(state.strategicSettings.full).map(([unit, amount]) => `<label>${unitHeader(unit)}<input type="number" min="1" step="100" value="${amount}" data-strategy-group="full" data-strategy-unit="${unit}"><small>${escapeHtml(UNIT_LABELS[unit] || unit)}</small></label>`).join('')}
                        <div><strong>Pack de blind</strong><span>Capacidade teórica ao reunir toda a defesa disponível no filtro atual.</span></div>
                        ${Object.entries(state.strategicSettings.blind).map(([unit, amount]) => `<label>${unitHeader(unit)}<input type="number" min="1" step="100" value="${amount}" data-strategy-group="blind" data-strategy-unit="${unit}"><small>${escapeHtml(UNIT_LABELS[unit] || unit)}</small></label>`).join('')}
                    </div>
                    <div class="mtt-power-kpis">
                        <div class="mtt-power-offense"><strong>${formatNumber(strategy.fullTotal)}</strong><span>Fulls ofensivos totais</span><small>${escapeHtml(strategicPatternText('full'))}</small></div>
                        <div><strong>${formatNumber(strategy.fullHome)}</strong><span>Fulls prontos na aldeia</span><small>Atendem ao padrão somente com tropas paradas</small></div>
                        <div class="${strategy.fullOutside ? 'mtt-power-warning' : ''}"><strong>${formatNumber(strategy.fullOutside)}</strong><span>Fulls com tropas fora</span><small>Existem no total, mas ainda não estão reunidos</small></div>
                        <div><strong>${formatNumber(strategy.nearFull)}</strong><span>Quase fulls ≥ 75%</span><small>Aldeias próximas de completar todos os mínimos</small></div>
                        <div class="mtt-power-defense"><strong>${formatNumber(strategy.blindTotal.capacity)}</strong><span>Blinds possíveis — total</span><small>${escapeHtml(strategicPatternText('blind'))}</small></div>
                        <div><strong>${formatNumber(strategy.blindHome.capacity)}</strong><span>Blinds disponíveis agora</span><small>Somente tropas paradas nas aldeias</small></div>
                    </div>
                    <div class="mtt-insight-grid">
                        <article><b>⚔ Disponibilidade ofensiva</b><p>${strategy.fullTotal ? `${formatNumber(strategy.fullHome)} de ${formatNumber(strategy.fullTotal)} full(s) estão reunidos (${Math.round((strategy.fullHome / strategy.fullTotal) * 100)}%).` : 'Nenhuma aldeia atende atualmente ao padrão de full configurado.'}</p></article>
                        <article><b>🛡 Capacidade de blindagem</b><p>Força total para ${formatNumber(strategy.blindTotal.capacity)} blind(s); ${formatNumber(strategy.blindHome.capacity)} podem ser montados apenas com tropas paradas.</p></article>
                        <article class="${strategy.blindTotal.capacity ? '' : 'mtt-power-warning'}"><b>⚠ Gargalo defensivo</b><p>Total: ${escapeHtml(strategy.blindTotal.limiting.join(', ') || 'sem dados')}. Parado: ${escapeHtml(strategy.blindHome.limiting.join(', ') || 'sem dados')}.</p></article>
                    </div>
                    <div class="mtt-strategy-troops">
                        ${[...new Set([...Object.keys(state.strategicSettings.full), ...Object.keys(state.strategicSettings.blind)])].map((unit) => `<div>${unitHeader(unit)}<span>${escapeHtml(UNIT_LABELS[unit] || unit)}</span><strong>${formatNumber(strategy.totals[unit]?.total || 0)}</strong><small>🏠 ${formatNumber(strategy.totals[unit]?.home || 0)} · fora ${formatNumber((strategy.totals[unit]?.total || 0) - (strategy.totals[unit]?.home || 0))}</small></div>`).join('')}
                    </div>
                </section>

                <div class="mtt-dashboard-kpis">
                    <div><strong>${formatNumber(dashboard.continents.length)}</strong><span>Continentes</span></div>
                    <div><strong>${formatNumber(players)}</strong><span>Nicks com dados</span></div>
                    <div><strong>${formatNumber(dashboard.villages.length)}</strong><span>Aldeias analisadas</span></div>
                    <div><strong>${formatNumber(totalPoints)}</strong><span>Pontos nas aldeias</span></div>
                    <div class="${emptyVillages ? 'mtt-kpi-alert' : ''}"><strong>${formatNumber(emptyVillages)}</strong><span>Sem base defensiva parada</span></div>
                    <div><strong>${formatNumber(kits)}</strong><span>Pacotes parados de 1k lança + 1k espada</span></div>
                </div>

                <section class="mtt-dashboard-section">
                    <div class="mtt-dashboard-heading"><div><h4>Panorama estratégico por continente</h4><span>Fulls usam tropas totais da origem; blinds mostram capacidade total e somente parada.</span></div></div>
                    <div class="mtt-dashboard-table"><table class="vis mtt-table">
                        <thead><tr><th>Continente</th><th>Nicks</th><th>Aldeias</th><th>Fulls total / prontos</th><th>Blinds total / agora</th><th>Gargalo</th><th>Pontos</th><th>Sem defesa</th><th>Pacotes 1k/1k</th>${state.unitOrder.map((unit) => `<th>${unitHeader(unit)}</th>`).join('')}</tr></thead>
                        <tbody>${dashboard.continents.length ? dashboard.continents.map((item) => { const itemStrategy = buildStrategicInsights(item.strategicRows); return `<tr>
                            <td class="mtt-continent"><strong>${escapeHtml(item.continent)}</strong></td>
                            <td>${formatNumber(item.playerIds.size)}</td>
                            <td>${formatNumber(item.villages)}</td>
                            <td><strong>${formatNumber(itemStrategy.fullTotal)} / ${formatNumber(itemStrategy.fullHome)}</strong></td>
                            <td class="mtt-kit-value">${formatNumber(itemStrategy.blindTotal.capacity)} / ${formatNumber(itemStrategy.blindHome.capacity)}</td>
                            <td>${escapeHtml(itemStrategy.blindTotal.limiting.join(', ') || '—')}</td>
                            <td>${formatNumber(item.points)}</td>
                            <td class="${item.emptyVillages ? 'mtt-warning-value' : ''}">${formatNumber(item.emptyVillages)}</td>
                            <td class="mtt-kit-value">${formatNumber(item.kits)}</td>
                            ${state.unitOrder.map((unit) => `<td>${formatNumber(item.home[unit])}</td>`).join('')}
                        </tr>`; }).join('') : `<tr><td colspan="${state.unitOrder.length + 9}" class="mtt-no-villages">Nenhuma aldeia com coordenada disponível para os filtros escolhidos.</td></tr>`}</tbody>
                    </table></div>
                </section>

                <section class="mtt-dashboard-section">
                    <div class="mtt-dashboard-heading"><div><h4>Nicks e força parada por continente</h4><span>Ordenado pela quantidade de pacotes 1k/1k disponíveis para apoio.</span></div></div>
                    <div class="mtt-dashboard-table"><table class="vis mtt-table">
                        <thead><tr><th>Continente</th><th>Jogador</th><th>Aldeias</th><th>Fulls total / prontos</th><th>Blinds total / agora</th><th>Pontos</th><th>Sem defesa</th><th>Pacotes 1k/1k</th>${state.unitOrder.map((unit) => `<th>${unitHeader(unit)}</th>`).join('')}<th>Coleta</th></tr></thead>
                        <tbody>${dashboard.players.length ? dashboard.players.map((item) => { const itemStrategy = buildStrategicInsights(item.strategicRows); return `<tr>
                            <td class="mtt-continent">${escapeHtml(item.continent)}</td>
                            <td class="mtt-player"><strong>${escapeHtml(item.name)}</strong></td>
                            <td>${formatNumber(item.villages)}</td>
                            <td><strong>${formatNumber(itemStrategy.fullTotal)} / ${formatNumber(itemStrategy.fullHome)}</strong></td>
                            <td class="mtt-kit-value">${formatNumber(itemStrategy.blindTotal.capacity)} / ${formatNumber(itemStrategy.blindHome.capacity)}</td>
                            <td>${formatNumber(item.points)}</td>
                            <td class="${item.emptyVillages ? 'mtt-warning-value' : ''}">${formatNumber(item.emptyVillages)}</td>
                            <td class="mtt-kit-value">${formatNumber(item.kits)}</td>
                            ${state.unitOrder.map((unit) => `<td>${formatNumber(item.home[unit])}</td>`).join('')}
                            <td title="${escapeHtml(new Date(item.loadedAt).toLocaleString('pt-BR'))}">${escapeHtml(elapsedText(item.loadedAt))}</td>
                        </tr>`; }).join('') : `<tr><td colspan="${state.unitOrder.length + 9}" class="mtt-no-villages">Nenhum jogador disponível para os filtros escolhidos.</td></tr>`}</tbody>
                    </table></div>
                </section>

                <section class="mtt-dashboard-section">
                    <div class="mtt-dashboard-heading"><div><h4>Aldeias e tropas paradas</h4><span>Use esta lista para localizar a origem exata dos apoios.</span></div><button type="button" class="btn" data-action="copy-dashboard-coordinates" ${dashboard.villages.some((item) => item.village.coordinate) ? '' : 'disabled'}>Copiar coordenadas exibidas</button></div>
                    <div class="mtt-dashboard-table mtt-dashboard-villages"><table class="vis mtt-table mtt-village-table">
                        <thead><tr><th>Continente</th><th>Jogador</th><th>Aldeia</th><th>Coordenada</th><th>Pontos</th><th>Pacotes 1k/1k</th>${state.unitOrder.map((unit) => `<th>${unitHeader(unit)}</th>`).join('')}</tr></thead>
                        <tbody>${dashboard.villages.length ? dashboard.villages.map(({ result, village, continent }) => `<tr class="${stoppedDefenseTotal(village) === 0 ? 'mtt-empty-defense-row' : ''}">
                            <td class="mtt-continent">${escapeHtml(continent)}</td>
                            <td class="mtt-player">${escapeHtml(result.name)}</td>
                            <td class="mtt-village">${escapeHtml(village.name)}</td>
                            <td class="mtt-coordinate">${escapeHtml(village.coordinate || '-')}</td>
                            <td>${formatNumber(village.points)}</td>
                            <td class="mtt-kit-value">${formatNumber(supportKits(village))}</td>
                            ${state.unitOrder.map((unit) => `<td>${formatNumber(village.home?.[unit] || 0)}</td>`).join('')}
                        </tr>`).join('') : `<tr><td colspan="${state.unitOrder.length + 6}" class="mtt-no-villages">Nenhuma aldeia encontrada.</td></tr>`}</tbody>
                    </table></div>
                </section>`;
        }

        function renderViewControls(panel) {
            const viewSelect = panel.querySelector('[data-action="view-mode"]');
            const playerSelect = panel.querySelector('[data-action="player-filter"]');
            const continentSelect = panel.querySelector('[data-action="continent-filter"]');
            const continentControl = panel.querySelector('[data-continent-control]');
            viewSelect.value = state.viewMode;
            playerSelect.innerHTML = `
                <option value="all">Todos os jogadores</option>
                ${state.members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join('')}`;
            playerSelect.value = state.members.some((member) => member.id === state.playerFilter) ? state.playerFilter : 'all';
            playerSelect.disabled = state.viewMode === 'players';
            const continents = [...new Set(Array.from(state.results.values()).flatMap((result) =>
                (result.villageDetails || []).map(continentForVillage)
            ))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
            continentSelect.innerHTML = `<option value="all">Todos os continentes</option>${continents.map((continent) => `<option value="${escapeHtml(continent)}">${escapeHtml(continent)}</option>`).join('')}`;
            if (!continents.includes(state.continentFilter)) state.continentFilter = 'all';
            continentSelect.value = state.continentFilter;
            continentControl.hidden = state.viewMode !== 'continents';
        }

        function renderProgress(panel) {
            const progress = panel.querySelector('.mtt-progress');
            const percent = state.total ? Math.round((state.processed / state.total) * 100) : 0;
            progress.hidden = !state.running;
            progress.querySelector('.mtt-progress-bar').style.width = `${percent}%`;
            progress.querySelector('.mtt-progress-text').textContent = state.running
                ? `Carregando e validando ${state.processed} de ${state.total} membros (2 páginas por membro)...`
                : '';
        }

        function renderButtons(panel) {
            panel.querySelector('[data-action="load-all"]').disabled = state.running;
            panel.querySelector('[data-action="reload-current"]').disabled = state.running;
            panel.querySelector('[data-action="clear-storage"]').disabled = state.running || (!state.savedAt && state.results.size === 0);
            panel.querySelector('[data-action="cancel"]').hidden = !state.running;
            panel.querySelector('[data-action="export"]').disabled = state.results.size === 0 || state.running;
            const storageStatus = panel.querySelector('.mtt-storage-status');
            storageStatus.textContent = state.savedAt
                ? `Salvo no navegador em ${new Date(state.savedAt).toLocaleString('pt-BR')}`
                : 'Nenhum dado salvo no navegador';
        }

        function render() {
            const panel = document.getElementById(SCRIPT_ID);
            if (!panel) return;
            renderSummary(panel);
            renderHistory(panel);
            renderViewControls(panel);
            renderVillageFilters(panel);
            const container = panel.querySelector('.mtt-table-wrap');
            container.classList.remove('mtt-continent-dashboard');
            if (state.viewMode === 'villages') renderVillageTable(panel);
            else if (state.viewMode === 'continents') renderContinentDashboard(panel);
            else renderMemberTable(panel);
            renderProgress(panel);
            renderButtons(panel);
        }

        async function loadMembers(members, clearBefore = false) {
            if (state.running || !members.length) return;
            if (clearBefore) {
                state.results.clear();
                state.errors.clear();
            }

            state.running = true;
            state.cancelled = false;
            state.abortController = new AbortController();
            state.processed = 0;
            state.total = members.length;
            render();

            for (const member of members) {
                if (state.cancelled) break;
                try {
                    const result = await fetchMember(member);
                    state.results.set(member.id, result);
                    state.errors.delete(member.id);
                    mergeUnitMetadata(result);
                } catch (error) {
                    if (error.name === 'AbortError') break;
                    state.errors.set(member.id, error.message || 'Erro desconhecido.');
                    console.warn(`[Tropas da Tribo] Falha ao carregar ${member.name}:`, error);
                }
                state.processed += 1;
                render();
                if (!state.cancelled && state.processed < members.length) await wait(REQUEST_INTERVAL_MS);
            }

            state.running = false;
            state.abortController = null;
            const historyContext = {
                type: clearBefore ? 'Coleta completa' : 'Atualização individual',
                requested: members.length,
                processed: state.processed,
                failures: members.filter((member) => state.errors.has(member.id)).length,
                cancelled: state.cancelled
            };
            const saved = state.results.size > 0 && saveStoredData(historyContext);
            if (!state.results.size) appendHistoryEntry({ ...historyContext, saved: false });
            render();
            const ownership = Array.from(state.results.values()).reduce((summary, result) => {
                (result.villageDetails || []).forEach((village) => {
                    const status = ['verified', 'mismatch'].includes(village.ownershipStatus) ? village.ownershipStatus : 'unknown';
                    summary[status] += 1;
                });
                return summary;
            }, { verified: 0, mismatch: 0, unknown: 0 });
            notify(
                state.cancelled
                    ? `Carregamento cancelado; os dados obtidos foram ${saved ? 'salvos' : 'mantidos'}.`
                    : `${state.results.size} membro(s) consolidados: ${formatNumber(ownership.verified)} origens validadas rapidamente; ${formatNumber(ownership.mismatch + ownership.unknown)} para auditoria detalhada${saved ? '. Dados salvos no navegador' : ''}.`,
                state.results.size ? 'success' : 'error'
            );
        }

        function cancelLoading() {
            if (!state.running) return;
            state.cancelled = true;
            state.abortController?.abort();
        }

        function applyVillageFilters(panel) {
            const minimums = {};
            panel.querySelectorAll('[data-unit-filter]').forEach((input) => {
                const value = Math.max(0, Number.parseInt(input.value, 10) || 0);
                if (value > 0) minimums[input.dataset.unitFilter] = value;
            });
            state.villageMinimums = minimums;
            render();
        }

        async function copyFilteredCoordinates() {
            const coordinates = [...new Set(
                getFilteredVillages().map(({ village }) => village.coordinate).filter(Boolean)
            )];
            if (!coordinates.length) {
                notify('Nenhuma coordenada disponível para copiar.', 'error');
                return;
            }

            const text = coordinates.join(' ');
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    textarea.remove();
                }
                notify(`${coordinates.length} coordenada(s) copiada(s).`);
            } catch (error) {
                console.error('[Tropas da Tribo] Falha ao copiar coordenadas:', error);
                notify('Não foi possível copiar as coordenadas.', 'error');
            }
        }

        async function copyDashboardCoordinates() {
            const coordinates = [...new Set(dashboardVillageRows().map(({ village }) => village.coordinate).filter(Boolean))];
            if (!coordinates.length) {
                notify('Nenhuma coordenada disponível no dashboard.', 'error');
                return;
            }
            try {
                await copyTextToClipboard(coordinates.join(' '));
                notify(`${coordinates.length} coordenada(s) do dashboard copiadas.`);
            } catch (error) {
                console.error('[Tropas da Tribo] Falha ao copiar coordenadas do dashboard:', error);
                notify('Não foi possível copiar as coordenadas do dashboard.', 'error');
            }
        }

        async function copyTextToClipboard(text) {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }

        function csvCell(value) {
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
        }

        function exportCsv() {
            if (!state.results.size) return;
            const villageMode = state.viewMode === 'villages';
            const continentMode = state.viewMode === 'continents';
            if (continentMode) {
                const columns = ['Continente', 'Jogador', 'Aldeia', 'Coordenada', 'Pontos', 'Pacotes 1k lança + 1k espada'];
                state.unitOrder.forEach((unit) => columns.push(`${UNIT_LABELS[unit] || unit} - Parada na aldeia`));
                const lines = [columns.map(csvCell).join(';')];
                dashboardVillageRows().forEach(({ result, village, continent }) => {
                    const row = [continent, result.name, village.name, village.coordinate, village.points, supportKits(village)];
                    state.unitOrder.forEach((unit) => row.push(Number(village.home?.[unit]) || 0));
                    lines.push(row.map(csvCell).join(';'));
                });
                downloadCsv(lines, `tropas-paradas-continentes-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.csv`);
                return;
            }
            const columns = villageMode
                ? ['Jogador', 'Aldeia', 'Coordenada', 'Pontos']
                : ['Jogador', 'Aldeias'];
            state.unitOrder.forEach((unit) => {
                const label = UNIT_LABELS[unit] || unit;
                columns.push(`${label} - Na aldeia`, `${label} - A caminho`, `${label} - Total`);
            });

            const lines = [columns.map(csvCell).join(';')];
            if (villageMode) {
                getFilteredVillages().forEach(({ result, village }) => {
                    const row = [result.name, village.name, village.coordinate, village.points];
                    state.unitOrder.forEach((unit) => {
                        const values = totalsFor(village, unit);
                        row.push(values.home, values.transit, values.total);
                    });
                    lines.push(row.map(csvCell).join(';'));
                });
            } else {
                state.members.forEach((member) => {
                    const result = state.results.get(member.id);
                    if (!result) return;
                    const row = [result.name, result.villages];
                    state.unitOrder.forEach((unit) => {
                        const values = totalsFor(result, unit);
                        row.push(values.home, values.transit, values.total);
                    });
                    lines.push(row.map(csvCell).join(';'));
                });
            }

            downloadCsv(lines, `${villageMode ? 'tropas-aldeias' : 'tropas-tribo'}-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.csv`);
        }

        function downloadCsv(lines, filename) {
            const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        function createPanel() {
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <div class="mtt-header">
                    <div>
                        <h3>🛡️ Chong Tribe Script — Tropas da Tribo</h3>
                        <p>Cruza Tropas e Defesa por membro para validar as origens sem abrir cada aldeia.</p>
                        <span class="mtt-storage-status">Nenhum dado salvo no navegador</span>
                    </div>
                    <div class="mtt-actions">
                        <button type="button" class="btn" data-action="reload-current">Atualizar membro e salvar</button>
                        <button type="button" class="btn btn-confirm-yes" data-action="load-all">Carregar e validar origens</button>
                        <button type="button" class="btn" data-action="cancel" hidden>Cancelar</button>
                        <button type="button" class="btn" data-action="export">Exportar CSV</button>
                        <button type="button" class="btn" data-action="clear-storage">Limpar dados salvos</button>
                    </div>
                </div>
                <div class="mtt-progress" hidden>
                    <div class="mtt-progress-track"><div class="mtt-progress-bar"></div></div>
                    <span class="mtt-progress-text"></span>
                </div>
                <div class="mtt-history"></div>
                <div class="mtt-summary"></div>
                <div class="mtt-view-controls">
                    <label>Visualização
                        <select data-action="view-mode">
                            <option value="players">Por jogador</option>
                            <option value="villages">Por aldeia</option>
                            <option value="continents">Painel estratégico (Power BI)</option>
                        </select>
                    </label>
                    <label>Filtrar jogador
                        <select data-action="player-filter" disabled><option value="all">Todos os jogadores</option></select>
                    </label>
                    <label data-continent-control hidden>Filtrar continente
                        <select data-action="continent-filter"><option value="all">Todos os continentes</option></select>
                    </label>
                </div>
                <div class="mtt-village-filters" hidden></div>
                <div class="mtt-legend">A validação rápida cruza <strong>Tropas</strong> (total próprio) com <strong>Defesa</strong> (na aldeia + fora). Quando os valores fecham, a origem pode ser usada com segurança sem consultar sua página individual. Divergências seguem para a Auditoria de Apoios.</div>
                <div class="mtt-table-wrap"></div>`;

            panel.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (action === 'load-all') loadMembers(state.members, true);
                if (action === 'reload-current') {
                    const current = getCurrentMember();
                    if (current) loadMembers([current], false);
                }
                if (action === 'cancel') cancelLoading();
                if (action === 'export') exportCsv();
                if (action === 'clear-storage') clearStoredData();
                if (action === 'restore-history') {
                    const snapshotId = event.target.closest('[data-snapshot-id]')?.dataset.snapshotId;
                    if (snapshotId) restoreHistorySnapshot(snapshotId);
                }
                if (action === 'apply-village-filters') applyVillageFilters(panel);
                if (action === 'clear-village-filters') {
                    state.villageMinimums = {};
                    render();
                }
                if (action === 'copy-coordinates') copyFilteredCoordinates();
                if (action === 'copy-dashboard-coordinates') copyDashboardCoordinates();
            });
            panel.addEventListener('change', (event) => {
                const action = event.target.dataset.action;
                const strategyGroup = event.target.dataset.strategyGroup;
                const strategyUnit = event.target.dataset.strategyUnit;
                if (strategyGroup && strategyUnit && state.strategicSettings[strategyGroup]?.[strategyUnit] !== undefined) {
                    state.strategicSettings[strategyGroup][strategyUnit] = Math.max(1, Number.parseInt(event.target.value, 10) || DEFAULT_STRATEGIC_SETTINGS[strategyGroup][strategyUnit]);
                    saveStrategicSettings();
                    render();
                    return;
                }
                if (action === 'view-mode') state.viewMode = ['villages', 'continents'].includes(event.target.value) ? event.target.value : 'players';
                if (action === 'player-filter') state.playerFilter = event.target.value;
                if (action === 'continent-filter') state.continentFilter = event.target.value;
                if (action === 'view-mode' || action === 'player-filter' || action === 'continent-filter') render();
            });
            return panel;
        }

        function addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID} { margin: 12px 0; border: 1px solid #804000; background: #f4e4bc; color: #2b1a0a; box-shadow: 0 2px 6px rgba(0,0,0,.22); }
                #${SCRIPT_ID} .mtt-header { position: sticky; top: 38px; z-index: 50; display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 10px 12px; background: linear-gradient(#c9a46a, #a77b3f); border-bottom: 1px solid #804000; box-shadow: 0 2px 4px rgba(0,0,0,.28); }
                #${SCRIPT_ID} h3 { margin: 0; font-size: 17px; color: #241303; }
                #${SCRIPT_ID} p { margin: 3px 0 0; font-size: 11px; }
                #${SCRIPT_ID} .mtt-storage-status { display: block; margin-top: 3px; color: #3d2b15; font-size: 10px; font-weight: bold; }
                #${SCRIPT_ID} .mtt-actions { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end; }
                #${SCRIPT_ID} button[disabled] { opacity: .55; cursor: not-allowed; }
                #${SCRIPT_ID} .mtt-progress { padding: 8px 12px 0; }
                #${SCRIPT_ID} .mtt-progress-track { height: 8px; overflow: hidden; border: 1px solid #8b5a2b; background: #ead8aa; }
                #${SCRIPT_ID} .mtt-progress-bar { width: 0; height: 100%; background: #4b8f29; transition: width .2s ease; }
                #${SCRIPT_ID} .mtt-progress-text { display: block; margin-top: 3px; font-size: 11px; }
                #${SCRIPT_ID} .mtt-history { margin: 9px 12px 0; padding: 8px 10px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .mtt-history-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px 12px; }
                #${SCRIPT_ID} .mtt-history-head span, #${SCRIPT_ID} .mtt-history > span { color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .mtt-history details { margin-top: 5px; }
                #${SCRIPT_ID} .mtt-history summary { cursor: pointer; color: #5f360e; font-weight: bold; }
                #${SCRIPT_ID} .mtt-history-table-wrap { max-height: 220px; overflow: auto; margin-top: 6px; }
                #${SCRIPT_ID} .mtt-history-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                #${SCRIPT_ID} .mtt-history-table th, #${SCRIPT_ID} .mtt-history-table td { padding: 4px 6px; text-align: center; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-history-table td:first-child { text-align: left; }
                #${SCRIPT_ID} .mtt-history-table td small { display: block; color: #80643e; }
                #${SCRIPT_ID} .mtt-history-table .mtt-restore { padding: 3px 7px; font-size: 9px; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-snapshot-unavailable { color: #8a7659; font-size: 9px; }
                #${SCRIPT_ID} .mtt-stats { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 8px; padding: 10px 12px 0; }
                #${SCRIPT_ID} .mtt-stats > div { display: flex; align-items: baseline; gap: 7px; padding: 7px 9px; border: 1px solid #c5a46b; background: #fff4d2; }
                #${SCRIPT_ID} .mtt-stats strong { font-size: 17px; }
                #${SCRIPT_ID} .mtt-stats span { color: #6b5433; font-size: 11px; }
                #${SCRIPT_ID} .mtt-total-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px; padding: 8px 12px; }
                #${SCRIPT_ID} .mtt-unit-total { display: grid; grid-template-columns: 22px 1fr; align-items: center; gap: 2px 6px; padding: 7px; border: 1px solid #c5a46b; background: #fff8df; }
                #${SCRIPT_ID} .mtt-unit-total > strong { font-size: 14px; }
                #${SCRIPT_ID} .mtt-unit-total small { grid-column: 1 / -1; display: flex; justify-content: space-between; color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .mtt-unit-icon { width: 18px; height: 18px; object-fit: contain; }
                #${SCRIPT_ID} .mtt-view-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 2px 12px 8px; }
                #${SCRIPT_ID} .mtt-view-controls label { display: flex; gap: 5px; align-items: center; font-size: 11px; font-weight: bold; }
                #${SCRIPT_ID} .mtt-view-controls select { min-width: 145px; }
                #${SCRIPT_ID} .mtt-village-filters { margin: 0 12px 8px; padding: 9px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .mtt-filter-title { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; margin-bottom: 7px; }
                #${SCRIPT_ID} .mtt-filter-title span { color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .mtt-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 5px; }
                #${SCRIPT_ID} .mtt-filter-grid label { display: flex; gap: 5px; align-items: center; }
                #${SCRIPT_ID} .mtt-filter-grid input { width: 100%; min-width: 70px; box-sizing: border-box; padding: 3px; }
                #${SCRIPT_ID} .mtt-filter-actions { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-top: 8px; }
                #${SCRIPT_ID} .mtt-filter-actions > strong { margin-left: 5px; color: #3b6f20; }
                #${SCRIPT_ID} .mtt-legend { padding: 0 12px 6px; color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .mtt-table-wrap { max-height: 430px; overflow: auto; border-top: 1px solid #c5a46b; }
                #${SCRIPT_ID} .mtt-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 0; font-size: 11px; }
                #${SCRIPT_ID} .mtt-table th { position: sticky; top: 0; z-index: 1; text-align: center; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-table td { text-align: right; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-table td:first-child { text-align: left; }
                #${SCRIPT_ID} .mtt-village-table td:nth-child(2) { text-align: left; }
                #${SCRIPT_ID} .mtt-coordinate { color: #7b1d1d; font-weight: bold; }
                #${SCRIPT_ID} .mtt-table td strong, #${SCRIPT_ID} .mtt-table td small { display: block; }
                #${SCRIPT_ID} .mtt-table td small { color: #886c43; font-size: 9px; }
                #${SCRIPT_ID} .mtt-error-row td { color: #9c1d14; text-align: left; }
                #${SCRIPT_ID} .mtt-no-villages { padding: 16px; text-align: center !important; color: #6b5433; }
                #${SCRIPT_ID} .mtt-empty { grid-column: 1 / -1; padding: 8px; text-align: center; color: #6b5433; }
                #${SCRIPT_ID} .mtt-continent-dashboard { max-height: 650px; padding: 10px 12px 14px; background: #ead8aa; }
                #${SCRIPT_ID} .mtt-power-panel { overflow: hidden; margin-bottom: 12px; border: 1px solid #76502b; border-radius: 6px; background: linear-gradient(145deg,#fff8df,#f2dfae); box-shadow: 0 3px 10px rgba(75,48,18,.16); }
                #${SCRIPT_ID} .mtt-strategy-settings { display: grid; grid-template-columns: minmax(210px,1.4fr) repeat(4,minmax(105px,.7fr)); gap: 6px; align-items: end; padding: 10px; border-bottom: 1px solid #c5a46b; }
                #${SCRIPT_ID} .mtt-strategy-settings > div { align-self: center; }
                #${SCRIPT_ID} .mtt-strategy-settings > div strong, #${SCRIPT_ID} .mtt-strategy-settings > div span { display: block; }
                #${SCRIPT_ID} .mtt-strategy-settings > div span { margin-top: 3px; color: #6b5433; font-size: 9px; line-height: 1.3; }
                #${SCRIPT_ID} .mtt-strategy-settings label { display: grid; grid-template-columns: 20px 1fr; gap: 3px 5px; align-items: center; padding: 5px; border: 1px solid #c9aa72; background: #fffdf2; }
                #${SCRIPT_ID} .mtt-strategy-settings label input { min-width: 0; width: 100%; box-sizing: border-box; padding: 3px; }
                #${SCRIPT_ID} .mtt-strategy-settings label small { grid-column: 1/-1; overflow: hidden; color: #6b5433; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-power-kpis { display: grid; grid-template-columns: repeat(6,minmax(120px,1fr)); gap: 7px; padding: 10px; }
                #${SCRIPT_ID} .mtt-power-kpis > div { min-height: 82px; padding: 10px; border: 1px solid #b9945c; border-radius: 5px; background: #fffdf4; }
                #${SCRIPT_ID} .mtt-power-kpis strong, #${SCRIPT_ID} .mtt-power-kpis span, #${SCRIPT_ID} .mtt-power-kpis small { display: block; }
                #${SCRIPT_ID} .mtt-power-kpis strong { color: #2d1c0b; font-size: 24px; }
                #${SCRIPT_ID} .mtt-power-kpis span { margin-top: 2px; font-size: 10px; font-weight: bold; }
                #${SCRIPT_ID} .mtt-power-kpis small { margin-top: 5px; color: #755b38; font-size: 8px; line-height: 1.3; }
                #${SCRIPT_ID} .mtt-power-kpis .mtt-power-offense { border-color: #a54232; background: #ffe8dc; }
                #${SCRIPT_ID} .mtt-power-kpis .mtt-power-defense { border-color: #426d9f; background: #e8f2ff; }
                #${SCRIPT_ID} .mtt-power-warning { border-color: #c14938 !important; background: #ffe2d8 !important; }
                #${SCRIPT_ID} .mtt-insight-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; padding: 0 10px 10px; }
                #${SCRIPT_ID} .mtt-insight-grid article { padding: 9px; border: 1px solid #c4a46d; border-radius: 5px; background: rgba(255,255,255,.64); }
                #${SCRIPT_ID} .mtt-insight-grid article p { margin-top: 5px; color: #5f482c; line-height: 1.35; }
                #${SCRIPT_ID} .mtt-strategy-troops { display: grid; grid-template-columns: repeat(auto-fit,minmax(125px,1fr)); gap: 6px; padding: 0 10px 10px; }
                #${SCRIPT_ID} .mtt-strategy-troops > div { display: grid; grid-template-columns: 20px 1fr; gap: 2px 5px; align-items: center; padding: 7px; border: 1px solid #c4a46d; background: #fff8e3; }
                #${SCRIPT_ID} .mtt-strategy-troops > div span { overflow: hidden; font-size: 9px; font-weight: bold; text-overflow: ellipsis; white-space: nowrap; }
                #${SCRIPT_ID} .mtt-strategy-troops > div strong, #${SCRIPT_ID} .mtt-strategy-troops > div small { grid-column: 1/-1; }
                #${SCRIPT_ID} .mtt-strategy-troops > div strong { font-size: 14px; }
                #${SCRIPT_ID} .mtt-strategy-troops > div small { color: #6b5433; font-size: 8px; }
                #${SCRIPT_ID} .mtt-dashboard-kpis { display: grid; grid-template-columns: repeat(6, minmax(125px, 1fr)); gap: 7px; margin-bottom: 10px; }
                #${SCRIPT_ID} .mtt-dashboard-kpis > div { display: flex; min-height: 58px; flex-direction: column; justify-content: center; padding: 8px 10px; border: 1px solid #b58d50; border-radius: 4px; background: #fff8df; }
                #${SCRIPT_ID} .mtt-dashboard-kpis strong { color: #34200d; font-size: 19px; }
                #${SCRIPT_ID} .mtt-dashboard-kpis span { margin-top: 2px; color: #6b5433; font-size: 9px; line-height: 1.25; }
                #${SCRIPT_ID} .mtt-dashboard-kpis .mtt-kpi-alert { border-color: #b3372a; background: #ffe0d3; }
                #${SCRIPT_ID} .mtt-dashboard-kpis .mtt-kpi-alert strong { color: #a11d12; }
                #${SCRIPT_ID} .mtt-dashboard-section { margin-top: 10px; border: 1px solid #a97b3e; background: #fff4d2; }
                #${SCRIPT_ID} .mtt-dashboard-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-bottom: 1px solid #c5a46b; background: linear-gradient(#e5c98f, #d3ae6b); }
                #${SCRIPT_ID} .mtt-dashboard-heading h4 { margin: 0; color: #3b210b; font-size: 13px; }
                #${SCRIPT_ID} .mtt-dashboard-heading span { display: block; margin-top: 2px; color: #684a28; font-size: 9px; }
                #${SCRIPT_ID} .mtt-dashboard-table { max-height: 280px; overflow: auto; }
                #${SCRIPT_ID} .mtt-dashboard-villages { max-height: 390px; }
                #${SCRIPT_ID} .mtt-dashboard-table .mtt-table { font-size: 10px; }
                #${SCRIPT_ID} .mtt-dashboard-table .mtt-table th { top: 0; }
                #${SCRIPT_ID} .mtt-continent { color: #71420f; font-weight: bold; text-align: center !important; }
                #${SCRIPT_ID} .mtt-warning-value { color: #b22018; font-weight: bold; background: #ffe4d8; }
                #${SCRIPT_ID} .mtt-kit-value { color: #26721b; font-weight: bold; }
                #${SCRIPT_ID} .mtt-empty-defense-row td { background: #ffe8df !important; }
                @media (max-width: 900px) {
                    #${SCRIPT_ID} .mtt-header { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .mtt-actions { justify-content: flex-start; }
                    #${SCRIPT_ID} .mtt-stats { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} .mtt-dashboard-kpis { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
                    #${SCRIPT_ID} .mtt-power-kpis { grid-template-columns: repeat(2,minmax(120px,1fr)); }
                    #${SCRIPT_ID} .mtt-insight-grid { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} .mtt-strategy-settings { grid-template-columns: repeat(2,minmax(120px,1fr)); }
                    #${SCRIPT_ID} .mtt-strategy-settings > div { grid-column: 1/-1; }
                }
            `;
            document.head.appendChild(style);
        }

        function mount() {
            state.members = getMembers();
            loadStrategicSettings();
            loadHistory();
            loadHistorySnapshots();
            loadStoredData();
            readCurrentPage();
            addStyles();
            const panel = createPanel();
            const content = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            const table = findDefenseTable(document);
            if (table?.parentElement) table.parentElement.insertBefore(panel, table);
            else content.prepend(panel);
            render();
        }

        mount();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Auditoria de Apoios da Tribo
    // -------------------------------------------------------------------------
    (function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-auditoria-apoios';
        const MODULE_VERSION = '1.4.1';
        const STORAGE_PREFIX = 'chonguera_auditoria_apoios_v1';
        const TROOP_STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const BLIND_STORAGE_PREFIX = 'chonguera_blind_preventivo_result';
        const COORDINATE_RESULT_STORAGE_PREFIX = 'chonguera_blind_preventivo_coordinate_sets';
        const DISTRIBUTOR_CONFIG_PREFIX = 'chonguera_distribuidor_apoios_config';
        const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
        const DEFAULT_BATCH_SIZE = 10;
        const DEFAULT_INTERVAL_MIN_MS = 1500;
        const DEFAULT_INTERVAL_MAX_MS = 2500;
        const MAX_BATCH_SIZE = 50;
        const UNITS = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
        const UNIT_LABELS = {
            spear: 'Lanceiros', sword: 'Espadachins', axe: 'Bárbaros', archer: 'Arqueiros',
            spy: 'Exploradores', light: 'Cavalaria leve', marcher: 'Arqueiros a cavalo',
            heavy: 'Cavalaria pesada', ram: 'Aríetes', catapult: 'Catapultas',
            knight: 'Paladinos', snob: 'Nobres'
        };

        if (!isMembersPage() || document.getElementById(SCRIPT_ID)) return;

        const world = location.hostname.split('.')[0] || 'mundo';
        const allyId = Number(window.game_data?.player?.ally || window.game_data?.ally_id || 0);
        const cacheKey = `${STORAGE_PREFIX}:${world}:${allyId || 'sem_tribo'}`;
        const state = {
            players: [],
            villages: [],
            visible: [],
            results: loadCache(),
            selected: new Set(),
            running: false,
            stopRequested: false,
            mapLoaded: false,
            listLimit: 250
        };

        injectStyles();
        const root = renderShell();
        bindEvents(root);
        restoreSettings(root);
        renderResults(root);

        function isMembersPage() {
            const route = new URLSearchParams(location.search);
            return route.get('screen') === 'ally' && route.get('mode') === 'members';
        }

        function injectStyles() {
            if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                #${SCRIPT_ID}{margin:12px 0;border:1px solid #9f6f27;background:#f5e5ba;color:#3b250f;font:12px Arial,sans-serif}
                #${SCRIPT_ID} *{box-sizing:border-box}
                #${SCRIPT_ID} .csa-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(#a66b2c,#794317);color:#fff}
                #${SCRIPT_ID} .csa-logo{display:grid;place-items:center;width:37px;height:37px;border-radius:9px;background:#14c8a0;color:#07372f;font-weight:900}
                #${SCRIPT_ID} .csa-head h2{margin:0;font-size:19px}.csa-head small{display:block;margin-top:2px;color:#f6e6c6;font-weight:400}
                #${SCRIPT_ID} .csa-version{margin-left:auto;color:#f6e6c6;font-size:10px}
                #${SCRIPT_ID} .csa-body{padding:12px}
                #${SCRIPT_ID} .csa-note{padding:9px 11px;border-left:4px solid #168d78;background:#fff6da;line-height:1.45}
                #${SCRIPT_ID} .csa-note strong{color:#8b1e16}
                #${SCRIPT_ID} .csa-controls{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(170px,.8fr) minmax(170px,.8fr);gap:10px;margin-top:10px}
                #${SCRIPT_ID} label{display:grid;gap:4px;font-weight:700}
                #${SCRIPT_ID} textarea,#${SCRIPT_ID} select,#${SCRIPT_ID} input{width:100%;padding:7px;border:1px solid #a77736;background:#fffaf0;color:#33210d;font:12px Arial,sans-serif}
                #${SCRIPT_ID} .csa-interval{display:grid;grid-template-columns:1fr 1fr;gap:6px}
                #${SCRIPT_ID} textarea{min-height:76px;resize:vertical}
                #${SCRIPT_ID} .csa-buttons{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
                #${SCRIPT_ID} button{padding:7px 10px;border:1px solid #654018;border-radius:4px;background:linear-gradient(#76512b,#3e260f);color:#fff;font-weight:700;cursor:pointer}
                #${SCRIPT_ID} button.csa-primary{border-color:#08765e;background:linear-gradient(#16bd93,#087b65)}
                #${SCRIPT_ID} button.csa-danger{border-color:#9d2727;background:linear-gradient(#c34b42,#88251f)}
                #${SCRIPT_ID} button:disabled{cursor:not-allowed;filter:grayscale(.8);opacity:.55}
                #${SCRIPT_ID} .csa-status{min-height:34px;padding:8px 10px;border:1px solid #be9658;background:#fff7df;line-height:1.45}
                #${SCRIPT_ID} .csa-status[data-tone="success"]{border-color:#22876d;background:#e2f7ef;color:#075947}
                #${SCRIPT_ID} .csa-status[data-tone="error"]{border-color:#c2473d;background:#ffe4df;color:#8a1711}
                #${SCRIPT_ID} .csa-summary{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:8px;margin:10px 0}
                #${SCRIPT_ID} .csa-card{padding:10px;border:1px solid #c59b59;background:#fff4d3}.csa-card b{display:block;font-size:21px}.csa-card span{font-size:10px;color:#72593e}
                #${SCRIPT_ID} .csa-table-wrap{max-height:430px;overflow:auto;border:1px solid #a97a35;background:#fff7e2}
                #${SCRIPT_ID} table{width:100%;border-collapse:collapse;font-size:11px}
                #${SCRIPT_ID} th{position:sticky;top:0;z-index:1;padding:7px;background:#c5a25f;color:#34210d;text-align:left}
                #${SCRIPT_ID} td{padding:6px;border-top:1px solid #ddc690;vertical-align:top}
                #${SCRIPT_ID} tr:nth-child(even) td{background:#faedc7}
                #${SCRIPT_ID} .csa-muted{color:#7b6a57}.csa-exact{color:#08705a;font-weight:700}.csa-partial{color:#9b5e00;font-weight:700}.csa-error{color:#a51f18;font-weight:700}
                #${SCRIPT_ID} .csa-section-title{margin:13px 0 6px;font-size:15px}.csa-number{white-space:nowrap;text-align:right}
                #${SCRIPT_ID} .csa-progress{height:7px;margin:8px 0;overflow:hidden;border-radius:9px;background:#ddc89d}.csa-progress span{display:block;width:0;height:100%;background:#13ad89;transition:width .2s}
                @media(max-width:900px){#${SCRIPT_ID} .csa-controls{grid-template-columns:1fr}#${SCRIPT_ID} .csa-summary{grid-template-columns:repeat(2,1fr)}}
            `;
            document.head.appendChild(style);
        }

        function renderShell() {
            const container = document.createElement('section');
            container.id = SCRIPT_ID;
            container.innerHTML = `
                <header class="csa-head">
                    <div class="csa-logo">CTS</div>
                    <div><h2>Auditoria de Apoios da Tribo</h2><small>Identifica apoiadores e, quando compartilhado pelo jogo, a quantidade de cada tropa por aldeia.</small></div>
                    <span class="csa-version">v${MODULE_VERSION}</span>
                </header>
                <div class="csa-body">
                    <div class="csa-note"><strong>Coleta segura:</strong> use primeiro “Tropas da Tribo → Carregar e validar origens”. Aqui ficam apenas as divergências que realmente exigem uma página por aldeia. A coleta ocorre uma por vez, com intervalo aleatório, pausa manual e cache de 24 horas.</div>
                    <div class="csa-controls">
                        <label>Coordenadas específicas (recomendado)
                            <textarea data-field="coordinates" placeholder="446|541 447|542&#10;Uma ou várias coordenadas separadas por espaço, ; ou linha."></textarea>
                        </label>
                        <label>Filtrar jogador
                            <select data-field="player"><option value="">Todos os jogadores</option></select>
                            <span>Continente</span>
                            <select data-field="continent"><option value="">Todos os continentes</option></select>
                        </label>
                        <label>Controle das consultas
                            <span>Lote por execução</span><input data-field="batch" type="number" min="1" max="${MAX_BATCH_SIZE}" value="${DEFAULT_BATCH_SIZE}">
                            <span>Intervalo aleatório seguro — mínimo / máximo (segundos)</span><div class="csa-interval"><input data-field="interval" type="number" min="1.5" max="15" step="0.1" value="${DEFAULT_INTERVAL_MIN_MS / 1000}"><input data-field="interval_max" type="number" min="1.5" max="15" step="0.1" value="${DEFAULT_INTERVAL_MAX_MS / 1000}"></div>
                        </label>
                    </div>
                    <div class="csa-buttons">
                        <button type="button" class="csa-primary" data-action="load-map">Carregar membros e aldeias</button>
                        <button type="button" class="csa-primary" data-action="select-distributor-sources" disabled>Selecionar origens candidatas</button>
                        <button type="button" data-action="apply-filter" disabled>Aplicar filtros</button>
                        <button type="button" data-action="select-visible" disabled>Selecionar exibidas</button>
                        <button type="button" data-action="clear-selection" disabled>Limpar seleção</button>
                        <button type="button" class="csa-primary" data-action="scan-selected" disabled>Consultar próximo lote selecionado</button>
                        <button type="button" class="csa-primary" data-action="scan-all-selected" disabled>Consultar todos os lotes</button>
                        <button type="button" data-action="scan-next" disabled>Consultar próximo lote do filtro</button>
                        <button type="button" class="csa-danger" data-action="stop" disabled>Pausar</button>
                        <button type="button" data-action="export" disabled>Exportar CSV</button>
                        <button type="button" data-action="clear-cache">Limpar cache</button>
                    </div>
                    <div class="csa-status" data-role="status">${Object.keys(state.results).length
                        ? `${formatNumber(Object.keys(state.results).length)} resultado(s) recuperado(s) do cache deste mundo. Carregue membros e aldeias para exibi-los; nenhuma aldeia será consultada automaticamente.`
                        : 'Carregue a lista da tribo. Nenhuma aldeia será consultada automaticamente.'}</div>
                    <div class="csa-progress"><span data-role="progress"></span></div>
                    <div class="csa-summary">
                        <div class="csa-card"><b data-summary="villages">0</b><span>Aldeias no filtro</span></div>
                        <div class="csa-card"><b data-summary="selected">0</b><span>Selecionadas</span></div>
                        <div class="csa-card"><b data-summary="checked">0</b><span>Consultadas</span></div>
                        <div class="csa-card"><b data-summary="exact">0</b><span>Com quantidades exatas</span></div>
                        <div class="csa-card"><b data-summary="none">0</b><span>Sem apoio encontrado</span></div>
                    </div>
                    <h3 class="csa-section-title">Aldeias da tribo</h3>
                    <div class="csa-table-wrap"><table>
                        <thead><tr><th><input type="checkbox" data-role="toggle-all"></th><th>Jogador</th><th>Aldeia</th><th>Coordenada</th><th>Pontos</th><th>Situação</th></tr></thead>
                        <tbody data-role="villages"><tr><td colspan="6" class="csa-muted">Aguardando o carregamento da lista.</td></tr></tbody>
                    </table></div>
                    <h3 class="csa-section-title">Apoios encontrados</h3>
                    <div class="csa-table-wrap"><table>
                        <thead><tr><th>Dono</th><th>Aldeia / coordenada</th><th>Apoiador</th>${UNITS.map((unit) => `<th>${escapeHtml(shortUnit(unit))}</th>`).join('')}<th>Visibilidade</th></tr></thead>
                        <tbody data-role="results"><tr><td colspan="${UNITS.length + 4}" class="csa-muted">Nenhuma aldeia consultada.</td></tr></tbody>
                    </table></div>
                </div>`;
            const target = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            target.insertBefore(container, target.firstChild);
            return container;
        }

        function bindEvents(root) {
            root.querySelector('[data-action="load-map"]').addEventListener('click', () => loadMapData(root));
            root.querySelector('[data-action="select-distributor-sources"]').addEventListener('click', () => selectDistributorSources(root));
            root.querySelector('[data-action="apply-filter"]').addEventListener('click', () => applyFilters(root));
            root.querySelector('[data-action="select-visible"]').addEventListener('click', () => {
                state.visible.forEach((village) => state.selected.add(village.id));
                renderVillages(root); updateSummary(root);
            });
            root.querySelector('[data-action="clear-selection"]').addEventListener('click', () => {
                state.selected.clear(); renderVillages(root); updateSummary(root);
            });
            root.querySelector('[data-action="scan-selected"]').addEventListener('click', () => {
                const queue = state.visible.filter((village) => state.selected.has(village.id));
                scanVillages(root, queue, false);
            });
            root.querySelector('[data-action="scan-all-selected"]').addEventListener('click', () => {
                const queue = state.visible.filter((village) => state.selected.has(village.id));
                scanVillages(root, queue, false, true);
            });
            root.querySelector('[data-action="scan-next"]').addEventListener('click', () => {
                const limit = clampNumber(root.querySelector('[data-field="batch"]').value, 1, MAX_BATCH_SIZE, DEFAULT_BATCH_SIZE);
                const queue = state.visible.filter((village) => !isFreshResult(state.results[village.id])).slice(0, limit);
                scanVillages(root, queue, true);
            });
            root.querySelector('[data-action="stop"]').addEventListener('click', () => {
                state.stopRequested = true;
                setStatus(root, 'Pausa solicitada. A consulta atual será concluída e nenhuma nova requisição será iniciada.', 'error');
            });
            root.querySelector('[data-action="export"]').addEventListener('click', exportCsv);
            root.querySelector('[data-action="clear-cache"]').addEventListener('click', () => {
                if (state.running) return;
                state.results = {};
                try { localStorage.removeItem(cacheKey); } catch (_error) { /* armazenamento opcional */ }
                renderVillages(root); renderResults(root); updateSummary(root);
                root.querySelector('[data-action="export"]').disabled = true;
                setStatus(root, 'Cache limpo. As próximas consultas buscarão novamente os dados atuais do jogo.', 'success');
            });
            root.querySelector('[data-role="toggle-all"]').addEventListener('change', (event) => {
                state.visible.forEach((village) => event.currentTarget.checked ? state.selected.add(village.id) : state.selected.delete(village.id));
                renderVillages(root); updateSummary(root);
            });
            root.querySelector('[data-role="villages"]').addEventListener('change', (event) => {
                const checkbox = event.target.closest('input[data-village-id]');
                if (!checkbox) return;
                const id = Number(checkbox.dataset.villageId);
                checkbox.checked ? state.selected.add(id) : state.selected.delete(id);
                updateSummary(root);
            });
            for (const field of root.querySelectorAll('[data-field]')) {
                field.addEventListener('change', () => saveSettings(root));
            }
        }

        async function loadMapData(root) {
            if (state.running) return;
            const button = root.querySelector('[data-action="load-map"]');
            button.disabled = true;
            setStatus(root, 'Carregando os arquivos de jogadores e aldeias do mapa…');
            try {
                const [playersResponse, villagesResponse] = await Promise.all([
                    fetch('/map/player.txt', { credentials: 'same-origin', cache: 'no-cache' }),
                    fetch('/map/village.txt', { credentials: 'same-origin', cache: 'no-cache' })
                ]);
                if (!playersResponse.ok || !villagesResponse.ok) throw new Error('O servidor não liberou os arquivos do mapa.');
                const [playersText, villagesText] = await Promise.all([playersResponse.text(), villagesResponse.text()]);
                assertNoBotProtection(playersText); assertNoBotProtection(villagesText);
                const allPlayers = parseMapPlayers(playersText);
                state.players = allyId ? allPlayers.filter((player) => player.allyId === allyId) : allPlayers;
                const playerById = new Map(state.players.map((player) => [player.id, player]));
                state.villages = parseMapVillages(villagesText)
                    .filter((village) => playerById.has(village.playerId))
                    .map((village) => ({ ...village, player: playerById.get(village.playerId) }))
                    .sort((a, b) => a.player.name.localeCompare(b.player.name, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
                state.mapLoaded = true;
                populateFilters(root);
                applyFilters(root);
                enableLoadedControls(root, true);
                const cachedCount = Object.keys(state.results).length;
                setStatus(root, `${formatNumber(state.players.length)} membro(s) e ${formatNumber(state.villages.length)} aldeia(s) carregados com apenas duas consultas. ${cachedCount ? `${formatNumber(cachedCount)} resultado(s) foram recuperado(s) do cache.` : 'Nenhum resultado anterior foi encontrado no cache deste mundo.'}`, 'success');
            } catch (error) {
                setStatus(root, `Não foi possível carregar a lista: ${error.message}`, 'error');
                button.disabled = false;
            }
        }

        function parseMapPlayers(text) {
            return text.trim().split(/\r?\n/).map((line) => line.split(',')).filter((parts) => parts.length >= 3).map((parts) => ({
                id: Number(parts[0]), name: decodeMapValue(parts[1]), allyId: Number(parts[2] || 0)
            })).filter((player) => Number.isFinite(player.id));
        }

        function parseMapVillages(text) {
            return text.trim().split(/\r?\n/).map((line) => line.split(',')).filter((parts) => parts.length >= 6).map((parts) => ({
                id: Number(parts[0]), name: decodeMapValue(parts[1]), x: Number(parts[2]), y: Number(parts[3]),
                playerId: Number(parts[4] || 0), points: Number(parts[5] || 0), continent: continentOf(Number(parts[2]), Number(parts[3]))
            })).filter((village) => Number.isFinite(village.id) && Number.isFinite(village.x) && Number.isFinite(village.y));
        }

        function decodeMapValue(value) {
            try { return decodeURIComponent(String(value || '').replace(/\+/g, ' ')); }
            catch (_error) { return String(value || '').replace(/\+/g, ' '); }
        }

        function continentOf(x, y) {
            return `K${Math.floor(y / 100)}${Math.floor(x / 100)}`;
        }

        function populateFilters(root) {
            const playerSelect = root.querySelector('[data-field="player"]');
            const currentPlayer = playerSelect.value;
            playerSelect.innerHTML = '<option value="">Todos os jogadores</option>' + state.players
                .slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('');
            if ([...playerSelect.options].some((option) => option.value === currentPlayer)) playerSelect.value = currentPlayer;

            const continentSelect = root.querySelector('[data-field="continent"]');
            const currentContinent = continentSelect.value;
            const continents = [...new Set(state.villages.map((village) => village.continent))].sort();
            continentSelect.innerHTML = '<option value="">Todos os continentes</option>' + continents.map((continent) => `<option>${continent}</option>`).join('');
            if (continents.includes(currentContinent)) continentSelect.value = currentContinent;
        }

        function applyFilters(root) {
            if (!state.mapLoaded) return;
            const coordinates = new Set(parseCoordinates(root.querySelector('[data-field="coordinates"]').value));
            const playerId = Number(root.querySelector('[data-field="player"]').value || 0);
            const continent = root.querySelector('[data-field="continent"]').value;
            state.visible = state.villages.filter((village) => {
                if (coordinates.size && !coordinates.has(`${village.x}|${village.y}`)) return false;
                if (playerId && village.playerId !== playerId) return false;
                if (continent && village.continent !== continent) return false;
                return true;
            });
            state.listLimit = coordinates.size ? Math.max(250, state.visible.length) : 250;
            renderVillages(root); updateSummary(root); saveSettings(root);
            if (coordinates.size && !state.visible.length) setStatus(root, 'Nenhuma coordenada informada pertence aos membros atuais da tribo.', 'error');
            else setStatus(root, `${formatNumber(state.visible.length)} aldeia(s) no filtro. Selecione as desejadas ou use “Consultar próximas do filtro”.`, 'success');
        }

        function parseCoordinates(value) {
            return [...String(value || '').matchAll(/\b(\d{1,3})\s*[|,]\s*(\d{1,3})\b/g)].map((match) => `${Number(match[1])}|${Number(match[2])}`);
        }

        function selectDistributorSources(root) {
            if (!state.mapLoaded || state.running) return;
            const recommendation = buildDistributorSourceRecommendation();
            if (!recommendation) {
                setStatus(root, 'Não encontrei tropas e análise de blind salvas. Execute “Tropas da Tribo” e “Blind Preventivo” antes de preparar as origens.', 'error');
                return;
            }
            const candidateIds = new Set(recommendation.villageIds);
            state.visible = state.villages.filter((village) => candidateIds.has(village.id));
            state.selected = new Set(state.visible.map((village) => village.id));
            state.listLimit = 250;
            root.querySelector('[data-field="coordinates"]').value = '';
            root.querySelector('[data-field="player"]').value = '';
            root.querySelector('[data-field="continent"]').value = '';
            renderVillages(root); updateSummary(root); saveSettings(root);
            if (!state.visible.length) {
                setStatus(root, 'Nenhuma auditoria individual necessária: as origens candidatas já foram validadas pelo cruzamento rápido Tropas × Defesa.', 'success');
                return;
            }
            const pending = state.visible.filter((village) => !isFreshResult(state.results[village.id])).length;
            setStatus(root, `${formatNumber(state.visible.length)} origem(ns) candidata(s) selecionada(s) entre ${formatNumber(state.villages.length)} aldeias. ${formatNumber(pending)} ainda aguardam auditoria. Consulte o próximo lote; não é necessário varrer a tribo inteira.`, 'success');
        }

        function buildDistributorSourceRecommendation() {
            const troopPayload = readJson(`${TROOP_STORAGE_PREFIX}:${world}:${allyId || 'sem_tribo'}`);
            const config = readJson(`${DISTRIBUTOR_CONFIG_PREFIX}:${world}`) || {};
            const blindPayload = findSelectedBlindPayload(config.blindSnapshotId);
            if (!troopPayload?.results?.length || !blindPayload) return null;

            const reserves = config.reserves || {};
            const blockedPlayers = new Set([
                ...parsePlayerNames(config.playerBlacklistInput),
                ...parsePlayerNames(config.alliedPlayerBlacklistInput)
            ]);
            const blockedContinents = parseContinents(config.sourceContinentBlacklistInput);
            const protectedCoordinates = new Set(Array.isArray(blindPayload.protectedCoordinates)
                ? blindPayload.protectedCoordinates
                : (blindPayload.needs || []).map((item) => item.coordinate));
            const routes = parseRoutes(config.continentRoutesInput);
            const mapVillageIds = new Set(state.villages.map((village) => village.id));
            const candidates = [];
            for (const player of troopPayload.results) {
                if (blockedPlayers.has(normalizeName(player.name))) continue;
                for (const village of player.villageDetails || []) {
                    if (village.ownershipStatus === 'verified') continue;
                    const villageId = Number(village.id || 0);
                    const coordinate = coordinateFromVillage(village);
                    if (!villageId || !mapVillageIds.has(villageId) || !coordinate) continue;
                    if (config.excludeTargets !== false && protectedCoordinates.has(coordinate)) continue;
                    const continent = continentFromCoordinate(coordinate);
                    if (blockedContinents.has(continent)) continue;
                    const available = Object.fromEntries(['spear', 'sword', 'spy', 'heavy'].map((unit) => [
                        unit,
                        Math.max(0, Number(village.home?.[unit] || 0) - Number(reserves[unit] || 0))
                    ]));
                    if (!Object.values(available).some((value) => value > 0)) continue;
                    candidates.push({ villageId, continent, available });
                }
            }

            const demandByContinent = new Map();
            for (const target of blindPayload.needs || []) {
                const continent = continentFromCoordinate(target.coordinate);
                if (!continent) continue;
                if (!demandByContinent.has(continent)) demandByContinent.set(continent, { spear: 0, sword: 0, spy: 0, heavy: 0 });
                const demand = demandByContinent.get(continent);
                for (const unit of Object.keys(demand)) demand[unit] += Math.max(0, Number(target.deficits?.[unit] || 0));
            }

            const selected = new Set();
            for (const [targetContinent, demand] of demandByContinent) {
                const allowed = routes.get(targetContinent);
                const pool = candidates.filter((candidate) => !allowed?.size || allowed.has(candidate.continent));
                const goal = Object.fromEntries(Object.entries(demand).map(([unit, value]) => [unit, Math.ceil(value * 1.5)]));
                pool.sort((left, right) => sourceCoverageScore(right.available, goal) - sourceCoverageScore(left.available, goal));
                const accumulated = { spear: 0, sword: 0, spy: 0, heavy: 0 };
                for (const candidate of pool) {
                    if (Object.keys(goal).every((unit) => accumulated[unit] >= goal[unit])) break;
                    selected.add(candidate.villageId);
                    for (const unit of Object.keys(accumulated)) accumulated[unit] += candidate.available[unit];
                }
            }
            if (!selected.size) candidates.slice().sort((a, b) => sourceCoverageScore(b.available) - sourceCoverageScore(a.available)).slice(0, MAX_BATCH_SIZE).forEach((candidate) => selected.add(candidate.villageId));
            return { villageIds: [...selected] };
        }

        function sourceCoverageScore(available, goal = null) {
            const weights = { spear: 1, sword: 1, spy: 8, heavy: 6 };
            return Object.keys(weights).reduce((total, unit) => {
                const useful = goal ? Math.min(Number(available[unit] || 0), Number(goal[unit] || 0)) : Number(available[unit] || 0);
                return total + useful * weights[unit];
            }, 0);
        }

        function findSelectedBlindPayload(snapshotId) {
            const current = readJson(`${BLIND_STORAGE_PREFIX}:${world}:${allyId || 'sem_tribo'}`);
            if (!snapshotId || blindIdentity(current) === snapshotId) return current;
            for (let index = 0; index < localStorage.length; index += 1) {
                const key = localStorage.key(index);
                if (!key?.startsWith(`${COORDINATE_RESULT_STORAGE_PREFIX}:`) || !key.includes(`:${world}:`)) continue;
                const history = readJson(key);
                if (!Array.isArray(history)) continue;
                const found = history.find((payload) => blindIdentity(payload) === snapshotId);
                if (found) return found;
            }
            return current;
        }

        function blindIdentity(payload) {
            return String(payload?.snapshotId || `${payload?.savedAt || 'sem-data'}:${payload?.analysisMode || 'tribes'}:${(payload?.requestedCoordinates || []).join(',')}`);
        }

        function readJson(key) {
            try { return JSON.parse(localStorage.getItem(key) || 'null'); }
            catch (_error) { return null; }
        }

        function parsePlayerNames(value) {
            return String(value || '').split(/[;\n]+/).map(normalizeName).filter(Boolean);
        }

        function normalizeName(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        }

        function parseContinents(value) {
            const result = new Set();
            String(value || '').split(/[;,\s]+/).filter(Boolean).forEach((token) => {
                const normalized = token.toUpperCase().replace(/^K/, '');
                if (/^\d{1,2}$/.test(normalized)) result.add(`K${normalized.padStart(2, '0')}`);
            });
            return result;
        }

        function parseRoutes(value) {
            const result = new Map();
            String(value || '').split(/\r?\n/).forEach((line) => {
                const match = line.match(/^\s*(K?\d{1,2})\s*(?::|=|>|→)\s*(.*?)\s*$/i);
                if (!match) return;
                const target = [...parseContinents(match[1])][0];
                const sources = parseContinents(match[2]);
                if (target && sources.size) result.set(target, sources);
            });
            return result;
        }

        function coordinateFromVillage(village) {
            const match = String(village.coordinate || village.name || '').match(/(\d{3})\|(\d{3})/);
            return match ? `${match[1]}|${match[2]}` : '';
        }

        function continentFromCoordinate(value) {
            const match = String(value || '').match(/(\d{3})\|(\d{3})/);
            return match ? `K${Math.floor(Number(match[2]) / 100)}${Math.floor(Number(match[1]) / 100)}` : '';
        }

        async function scanVillages(root, requested, respectBatch, continuous = false) {
            if (state.running) return;
            const requestedVillages = requested.filter(Boolean);
            let queue = requestedVillages.filter((village) => !isFreshResult(state.results[village.id]));
            if (!queue.length) {
                setStatus(root, 'Não há aldeias pendentes nesse conjunto: todas já possuem resultado recente no cache por 24 horas.', 'success');
                return;
            }
            const batchSize = clampNumber(root.querySelector('[data-field="batch"]').value, 1, MAX_BATCH_SIZE, DEFAULT_BATCH_SIZE);
            if (!continuous && (respectBatch || queue.length > batchSize)) queue = queue.slice(0, batchSize);
            const intervalMinMs = clampNumber(Number(root.querySelector('[data-field="interval"]').value) * 1000, 1500, 15000, DEFAULT_INTERVAL_MIN_MS);
            const intervalMaxMs = clampNumber(Number(root.querySelector('[data-field="interval_max"]').value) * 1000, intervalMinMs, 15000, Math.max(intervalMinMs, DEFAULT_INTERVAL_MAX_MS));
            state.running = true; state.stopRequested = false;
            toggleRunning(root, true);
            const progress = root.querySelector('[data-role="progress"]');
            let completed = 0;
            let botStopped = false;
            for (const village of queue) {
                if (state.stopRequested) break;
                const fresh = state.results[village.id];
                if (isFreshResult(fresh)) {
                    completed += 1;
                    progress.style.width = `${Math.round(completed / queue.length * 100)}%`;
                    continue;
                }
                setStatus(root, `Consultando ${escapeText(village.player.name)} — ${escapeText(village.name)} (${village.x}|${village.y}) · ${completed + 1}/${queue.length}`);
                try {
                    state.results[village.id] = await fetchVillageSupport(village);
                } catch (error) {
                    state.results[village.id] = { villageId: village.id, checkedAt: Date.now(), visibility: 'error', error: error.message, supporters: [] };
                    if (error.code === 'BOT_PROTECTION') {
                        botStopped = true; state.stopRequested = true;
                        setStatus(root, 'Proteção contra bots detectada. A coleta foi interrompida e não fará novas tentativas. Resolva a verificação no jogo antes de continuar.', 'error');
                    }
                }
                completed += 1;
                const refreshNow = !continuous || completed % 10 === 0 || completed === queue.length || state.stopRequested;
                if (refreshNow) {
                    saveCache(); renderVillages(root); renderResults(root); updateSummary(root);
                }
                progress.style.width = `${Math.round(completed / queue.length * 100)}%`;
                if (!state.stopRequested && completed < queue.length) await delay(randomBetween(intervalMinMs, intervalMaxMs));
            }
            state.running = false; toggleRunning(root, false); saveCache();
            if (!botStopped) {
                const suffix = state.stopRequested ? ' Coleta pausada pelo usuário.' : '';
                const remaining = requestedVillages.filter((village) => !isFreshResult(state.results[village.id])).length;
                setStatus(root, `${completed} aldeia(s) processada(s) nesta execução. ${formatNumber(remaining)} ainda pendente(s) no conjunto selecionado. Os resultados ficam em cache por 24 horas.${suffix}`, state.stopRequested ? 'error' : 'success');
            }
            setTimeout(() => { progress.style.width = '0'; }, 900);
        }

        async function fetchVillageSupport(village) {
            const url = new URL(location.href);
            url.search = '';
            url.searchParams.set('village', String(window.game_data?.village?.id || new URLSearchParams(location.search).get('village') || ''));
            url.searchParams.set('screen', 'info_village');
            url.searchParams.set('id', String(village.id));
            url.hash = `${village.x};${village.y}`;
            const response = await fetch(url.href, { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (response.status === 403 || response.status === 429) throw makeBotError(`Servidor respondeu ${response.status}.`);
            if (!response.ok) throw new Error(`Falha HTTP ${response.status}.`);
            const html = await response.text();
            assertNoBotProtection(html);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const parsed = parseSupportDocument(doc, village);
            return { villageId: village.id, checkedAt: Date.now(), ...parsed };
        }

        function parseSupportDocument(doc, village) {
            const exactRows = [];
            const donorOnly = new Map();
            let verifiedOwnerRow = false;
            for (const table of doc.querySelectorAll('table')) {
                const unitColumns = detectUnitColumns(table);
                if (!unitColumns.size) continue;
                for (const row of table.querySelectorAll('tr')) {
                    const playerLink = row.querySelector('a[href*="screen=info_player"][href*="id="]');
                    if (!playerLink) continue;
                    if (isReservationContext(row, playerLink)) continue;
                    const cells = [...row.cells];
                    const units = emptyUnits();
                    let numberCellCount = 0;
                    for (const [index, unit] of unitColumns.entries()) {
                        if (!cells[index]) continue;
                        const value = parseGameNumber(cells[index].textContent);
                        if (Number.isFinite(value)) { units[unit] = value; numberCellCount += 1; }
                    }
                    const supporter = supporterFromLink(playerLink);
                    if (!supporter) continue;
                    if (supporter.id === village.playerId) {
                        if (numberCellCount >= Math.min(2, unitColumns.size)) verifiedOwnerRow = true;
                        continue;
                    }
                    if (numberCellCount >= Math.min(2, unitColumns.size)) exactRows.push({ supporter, units });
                    else donorOnly.set(supporter.id || supporter.name, supporter);
                }
            }

            if (exactRows.length) {
                const merged = new Map();
                for (const row of exactRows) {
                    const key = row.supporter.id || row.supporter.name;
                    if (!merged.has(key)) merged.set(key, { ...row.supporter, units: emptyUnits() });
                    for (const unit of UNITS) merged.get(key).units[unit] += row.units[unit] || 0;
                }
                return { visibility: 'exact', supporters: [...merged.values()] };
            }
            if (verifiedOwnerRow) return { visibility: 'exact', supporters: [] };

            const supportSections = [...doc.querySelectorAll('table,div')].filter((element) => /apoio|apoiando|support/i.test(element.textContent || ''));
            for (const section of supportSections) {
                for (const link of section.querySelectorAll('a[href*="screen=info_player"][href*="id="]')) {
                    if (isReservationContext(link.closest('tr') || section, link)) continue;
                    const supporter = supporterFromLink(link);
                    if (supporter && supporter.id !== village.playerId) donorOnly.set(supporter.id || supporter.name, supporter);
                }
            }
            if (donorOnly.size) return { visibility: 'donors', supporters: [...donorOnly.values()].map((supporter) => ({ ...supporter, units: null })) };
            return { visibility: 'none', supporters: [] };
        }

        function detectUnitColumns(table) {
            const result = new Map();
            const rows = [...table.rows];
            for (const row of rows.slice(0, 4)) {
                [...row.cells].forEach((cell, index) => {
                    const image = cell.querySelector('img');
                    const unit = unitFromImage(image);
                    if (unit) result.set(index, unit);
                });
                if (result.size >= 2) break;
            }
            return result;
        }

        function unitFromImage(image) {
            if (!image) return '';
            const source = `${image.getAttribute('src') || ''} ${image.getAttribute('data-src') || ''} ${image.className || ''}`;
            return UNITS.find((unit) => new RegExp(`(?:unit_|unit\\s+|/)${unit}(?:\\.|_|\\s|$)`, 'i').test(source)) || '';
        }

        function supporterFromLink(link) {
            const name = (link.textContent || '').trim();
            if (!name) return null;
            let id = 0;
            try { id = Number(new URL(link.href, location.href).searchParams.get('id') || 0); } catch (_error) { /* link relativo incompleto */ }
            return { id, name };
        }

        function isReservationContext(container, link) {
            const row = container?.closest?.('tr') || container;
            const rowText = row?.textContent || '';
            if (/reserva\s+(?:feita|criada|efetuada)\s+por|reservad[oa]\s+por|reserved\s+by/i.test(rowText)) return true;

            const cell = link?.closest?.('td,th');
            const previousCellText = cell?.previousElementSibling?.textContent || '';
            if (/reserva|reservad[oa]|reserved/i.test(previousCellText)) return true;

            const labelledContainer = link?.closest?.('[class*="reserv"],[id*="reserv"],[data-reservation]');
            return Boolean(labelledContainer);
        }

        function parseGameNumber(value) {
            const normalized = String(value || '').replace(/[^\d-]/g, '');
            return normalized ? Number(normalized) : Number.NaN;
        }

        function assertNoBotProtection(text) {
            const source = String(text || '');
            let visibleText = source;
            let protectionElement = null;
            if (/<(?:html|body|form|script|div|h[1-6])\b/i.test(source)) {
                const doc = new DOMParser().parseFromString(source, 'text/html');
                doc.querySelectorAll('script,style,noscript,template').forEach((element) => element.remove());
                visibleText = doc.body?.textContent || '';
                protectionElement = doc.querySelector([
                    'form[action*="bot_check"]',
                    'form[action*="bot-protection"]',
                    '#bot_check',
                    '#bot-protection',
                    '.bot-protection',
                    '[data-bot-protection]',
                    'input[name="bot_check"]',
                    'input[name="captcha"]'
                ].join(','));
            }
            if (protectionElement || /prote[cç][aã]o\s+contra\s+bots|bot\s*protection\s+(?:check|verification|required)/i.test(visibleText)) {
                throw makeBotError('Proteção contra bots detectada.');
            }
        }

        function makeBotError(message) {
            const error = new Error(message); error.code = 'BOT_PROTECTION'; return error;
        }

        function renderVillages(root) {
            const body = root.querySelector('[data-role="villages"]');
            if (!state.visible.length) {
                body.innerHTML = '<tr><td colspan="6" class="csa-muted">Nenhuma aldeia no filtro atual.</td></tr>';
                return;
            }
            const rows = state.visible.slice(0, state.listLimit).map((village) => {
                const result = state.results[village.id];
                return `<tr>
                    <td><input type="checkbox" data-village-id="${village.id}" ${state.selected.has(village.id) ? 'checked' : ''}></td>
                    <td>${escapeHtml(village.player.name)}</td><td>${escapeHtml(village.name)}</td>
                    <td><a href="${escapeAttribute(villageUrl(village))}">${village.x}|${village.y}</a><br><span class="csa-muted">${village.continent}</span></td>
                    <td class="csa-number">${formatNumber(village.points)}</td><td>${renderVillageStatus(result)}</td>
                </tr>`;
            }).join('');
            const allVisible = state.listLimit >= state.visible.length;
            const paging = state.visible.length > 250
                ? `<tr><td colspan="6">${allVisible
                    ? '<button type="button" data-action="collapse-list">Recolher para 250</button>'
                    : `<button type="button" data-action="show-more">Mostrar mais ${Math.min(250, state.visible.length - state.listLimit)}</button> <button type="button" data-action="show-all">Mostrar todas (${formatNumber(state.visible.length)})</button>`}
                    <span class="csa-muted"> Exibição apenas visual; não inicia consultas.</span></td></tr>`
                : '';
            body.innerHTML = rows + paging;
            body.querySelector('[data-action="show-more"]')?.addEventListener('click', () => { state.listLimit += 250; renderVillages(root); });
            body.querySelector('[data-action="show-all"]')?.addEventListener('click', (event) => {
                event.currentTarget.disabled = true;
                setStatus(root, `Montando ${formatNumber(state.visible.length)} linhas na tela. Isso não fará requisições ao jogo…`);
                setTimeout(() => {
                    state.listLimit = state.visible.length;
                    renderVillages(root);
                    setStatus(root, `${formatNumber(state.visible.length)} aldeia(s) exibida(s). Use “Recolher para 250” para deixar a tela mais leve.`, 'success');
                }, 0);
            });
            body.querySelector('[data-action="collapse-list"]')?.addEventListener('click', () => {
                state.listLimit = 250;
                renderVillages(root);
                setStatus(root, 'Lista recolhida para 250 linhas. A seleção e os resultados continuam preservados.', 'success');
            });
        }

        function renderVillageStatus(result) {
            if (!result) return '<span class="csa-muted">Não consultada</span>';
            if (result.visibility === 'error') return `<span class="csa-error">Erro: ${escapeHtml(result.error || 'falha')}</span>`;
            if (result.visibility === 'exact') return `<span class="csa-exact">Quantidades exatas · ${result.supporters.length} apoiador(es)</span>`;
            if (result.visibility === 'donors') return `<span class="csa-partial">Apenas apoiadores · ${result.supporters.length}</span>`;
            return '<span class="csa-muted">Nenhum apoio visível</span>';
        }

        function renderResults(root) {
            const body = root.querySelector('[data-role="results"]');
            const villagesById = new Map(state.villages.map((village) => [village.id, village]));
            const rows = [];
            for (const result of Object.values(state.results)) {
                const village = villagesById.get(Number(result.villageId));
                if (!village || !result.supporters?.length) continue;
                for (const supporter of result.supporters) {
                    rows.push(`<tr><td>${escapeHtml(village.player.name)}</td><td>${escapeHtml(village.name)}<br><a href="${escapeAttribute(villageUrl(village))}">${village.x}|${village.y}</a></td><td>${escapeHtml(supporter.name)}</td>
                        ${UNITS.map((unit) => `<td class="csa-number">${supporter.units ? formatNumber(supporter.units[unit] || 0) : '—'}</td>`).join('')}
                        <td>${result.visibility === 'exact' ? '<span class="csa-exact">Exata</span>' : '<span class="csa-partial">Nome visível; tropas ocultas</span>'}</td></tr>`);
                }
            }
            body.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="${UNITS.length + 4}" class="csa-muted">Nenhum apoio visível nas aldeias consultadas.</td></tr>`;
        }

        function updateSummary(root) {
            const visibleIds = new Set(state.visible.map((village) => village.id));
            const visibleResults = Object.values(state.results).filter((result) => visibleIds.has(Number(result.villageId)));
            root.querySelector('[data-summary="villages"]').textContent = formatNumber(state.visible.length);
            root.querySelector('[data-summary="selected"]').textContent = formatNumber([...state.selected].filter((id) => visibleIds.has(id)).length);
            root.querySelector('[data-summary="checked"]').textContent = formatNumber(visibleResults.length);
            root.querySelector('[data-summary="exact"]').textContent = formatNumber(visibleResults.filter((result) => result.visibility === 'exact').length);
            root.querySelector('[data-summary="none"]').textContent = formatNumber(visibleResults.filter((result) => result.visibility === 'none').length);
        }

        function enableLoadedControls(root, enabled) {
            for (const action of ['select-distributor-sources', 'apply-filter', 'select-visible', 'clear-selection', 'scan-selected', 'scan-all-selected', 'scan-next']) {
                root.querySelector(`[data-action="${action}"]`).disabled = !enabled;
            }
            root.querySelector('[data-action="export"]').disabled = !Object.keys(state.results).length;
        }

        function toggleRunning(root, running) {
            for (const button of root.querySelectorAll('button')) button.disabled = running;
            root.querySelector('[data-action="stop"]').disabled = !running;
            if (!running) {
                root.querySelector('[data-action="load-map"]').disabled = state.mapLoaded;
                enableLoadedControls(root, state.mapLoaded);
            }
        }

        function exportCsv() {
            const villagesById = new Map(state.villages.map((village) => [village.id, village]));
            const lines = [['dono', 'aldeia', 'coordenada', 'continente', 'pontos', 'apoiador', ...UNITS.map((unit) => UNIT_LABELS[unit]), 'visibilidade', 'consultado_em']];
            for (const result of Object.values(state.results)) {
                const village = villagesById.get(Number(result.villageId));
                if (!village) continue;
                const supporters = result.supporters?.length ? result.supporters : [{ name: '', units: null }];
                for (const supporter of supporters) lines.push([
                    village.player.name, village.name, `${village.x}|${village.y}`, village.continent, village.points, supporter.name,
                    ...UNITS.map((unit) => supporter.units ? supporter.units[unit] || 0 : ''),
                    result.visibility, new Date(result.checkedAt).toLocaleString('pt-BR')
                ]);
            }
            const csv = '\uFEFF' + lines.map((line) => line.map(csvCell).join(';')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `auditoria-apoios-${world}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }

        function villageUrl(village) {
            const url = new URL(location.href); url.search = '';
            url.searchParams.set('village', String(window.game_data?.village?.id || new URLSearchParams(location.search).get('village') || ''));
            url.searchParams.set('screen', 'info_village'); url.searchParams.set('id', String(village.id)); url.hash = `${village.x};${village.y}`;
            return url.href;
        }

        function saveSettings(root) {
            try {
                localStorage.setItem(`${cacheKey}:settings`, JSON.stringify({
                    coordinates: root.querySelector('[data-field="coordinates"]').value,
                    player: root.querySelector('[data-field="player"]').value,
                    continent: root.querySelector('[data-field="continent"]').value,
                    batch: root.querySelector('[data-field="batch"]').value,
                    interval: root.querySelector('[data-field="interval"]').value,
                    interval_max: root.querySelector('[data-field="interval_max"]').value
                }));
            } catch (_error) { /* armazenamento opcional */ }
        }

        function restoreSettings(root) {
            try {
                const settings = JSON.parse(localStorage.getItem(`${cacheKey}:settings`) || '{}');
                for (const field of ['coordinates', 'batch']) if (settings[field] != null) root.querySelector(`[data-field="${field}"]`).value = settings[field];
                const intervalMin = clampNumber(Number(settings.interval) * 1000, 1500, 15000, DEFAULT_INTERVAL_MIN_MS);
                const intervalMax = clampNumber(Number(settings.interval_max) * 1000, intervalMin, 15000, Math.max(intervalMin, DEFAULT_INTERVAL_MAX_MS));
                root.querySelector('[data-field="interval"]').value = String(intervalMin / 1000);
                root.querySelector('[data-field="interval_max"]').value = String(intervalMax / 1000);
            } catch (_error) { /* armazenamento opcional */ }
        }

        function loadCache() {
            const merged = new Map();
            const now = Date.now();
            const keys = [cacheKey];
            try {
                for (let index = 0; index < localStorage.length; index += 1) {
                    const key = localStorage.key(index);
                    if (key?.startsWith(`${STORAGE_PREFIX}:${world}:`) && !key.endsWith(':settings') && !keys.includes(key)) keys.push(key);
                }
                for (const key of keys) {
                    let parsed;
                    try { parsed = JSON.parse(localStorage.getItem(key) || '{}'); }
                    catch (_error) { continue; }
                    for (const [villageId, result] of Object.entries(parsed || {})) {
                        const checkedAt = Number(result?.checkedAt || 0);
                        if (!checkedAt || now - checkedAt >= CACHE_TTL_MS) continue;
                        const previous = merged.get(String(villageId));
                        if (!previous || checkedAt > Number(previous.checkedAt || 0)) merged.set(String(villageId), result);
                    }
                }
            } catch (_error) {
                // O armazenamento pode estar indisponível em páginas privadas.
            }
            return Object.fromEntries(merged);
        }

        function saveCache() {
            try {
                const entries = Object.entries(state.results).sort((a, b) => Number(b[1].checkedAt || 0) - Number(a[1].checkedAt || 0)).slice(0, 10000);
                localStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(entries)));
            } catch (_error) { /* armazenamento opcional */ }
        }

        function isFreshResult(result) { return result && Date.now() - Number(result.checkedAt || 0) < CACHE_TTL_MS; }
        function emptyUnits() { return Object.fromEntries(UNITS.map((unit) => [unit, 0])); }
        function shortUnit(unit) { return ({ spear: 'Lança', sword: 'Espada', axe: 'BB', archer: 'Arq.', spy: 'Spy', light: 'CL', marcher: 'AC', heavy: 'CP', ram: 'Aríete', catapult: 'Cata', knight: 'Pal.', snob: 'Nobre' })[unit] || unit; }
        function setStatus(root, message, tone = '') { const element = root.querySelector('[data-role="status"]'); element.textContent = message; element.dataset.tone = tone; }
        function formatNumber(value) { return Number(value || 0).toLocaleString('pt-BR'); }
        function clampNumber(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
        function randomBetween(min, max) { return Math.round(min + Math.random() * Math.max(0, max - min)); }
        function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
        function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
        function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
        function escapeAttribute(value) { return escapeHtml(value); }
        function escapeText(value) { return String(value ?? '').replace(/[\r\n]+/g, ' ').trim(); }
    }());

    // -------------------------------------------------------------------------
    // Módulo: Blind Preventivo
    // -------------------------------------------------------------------------
    (async function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-blind-preventivo';
        const STORAGE_PREFIX = 'chonguera_blind_preventivo_config';
        const RESULT_STORAGE_PREFIX = 'chonguera_blind_preventivo_result';
        const COORDINATE_RESULT_STORAGE_PREFIX = 'chonguera_blind_preventivo_coordinate_sets';
        const TROOP_STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const IGNORED_ENEMY_STORAGE_PREFIX = 'chonguera_ignored_enemy_players';
        const DEFAULT_MIN_ENEMY_POINTS = 7000;
        const HOUR_LIMITS = [1, 2, 3, 4, 5, 6, 8];
        const DEFENSE_UNITS = [
            { id: 'spear', label: 'Lanceiros' },
            { id: 'sword', label: 'Espadachins' },
            { id: 'spy', label: 'Exploradores' },
            { id: 'heavy', label: 'Cavalaria pesada' }
        ];
        const TROOP_OVERVIEW_UNITS = [
            { id: 'spear', label: 'Lanceiro' },
            { id: 'sword', label: 'Espadachim' },
            { id: 'axe', label: 'Bárbaro' },
            { id: 'archer', label: 'Arqueiro' },
            { id: 'spy', label: 'Explorador' },
            { id: 'light', label: 'Cavalaria leve' },
            { id: 'marcher', label: 'Arqueiro a cavalo' },
            { id: 'heavy', label: 'Cavalaria pesada' },
            { id: 'ram', label: 'Aríete' },
            { id: 'catapult', label: 'Catapulta' },
            { id: 'knight', label: 'Paladino' },
            { id: 'snob', label: 'Nobre' },
            { id: 'militia', label: 'Milícia' }
        ];

        if (!isContractsPage() || document.getElementById(SCRIPT_ID)) return;
        const state = {
            running: false,
            abortController: null,
            results: [],
            threatRelations: [],
            threatRangeFilter: '1',
            outOfPatternBlinds: [],
            buckets: new Map(),
            detectedMinutesPerField: null,
            resolvedAllies: [],
            resolvedEnemies: [],
            mapEnemies: [],
            enemyVillages: [],
            worldVillages: [],
            tribeIndex: new Map(),
            thresholds: {},
            minEnemyPoints: DEFAULT_MIN_ENEMY_POINTS,
            selectedContinents: [],
            ignoredEnemyPlayers: new Set(),
            resultFilter: 'needs',
            troopDataInfo: { count: 0, savedAt: null },
            analysisMode: 'tribes',
            requestedCoordinates: [],
            missingRequestedCoordinates: [],
            coordinateReview: [],
            coordinateSelectionLabel: ''
        };

        function isContractsPage() {
            const query = new URLSearchParams(window.location.search);
            return query.get('screen') === 'ally' && query.get('mode') === 'contracts';
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatNumber(value, decimals = 0) {
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(Number(value) || 0);
        }

        function normalizeName(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function decodeMapValue(value) {
            try {
                return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
            } catch (_error) {
                return String(value || '');
            }
        }

        function splitTribeInput(value) {
            return [...new Set(String(value || '')
                .split(';')
                .map((item) => item.trim())
                .filter(Boolean))];
        }

        function parsePlayerList(value) {
            return new Set(String(value || '')
                .split(/[;\n]+/)
                .map((name) => normalizeName(name))
                .filter(Boolean));
        }

        function parseContinentInput(value) {
            const continents = new Set();
            const invalid = [];
            String(value || '').split(/[;,\s]+/).filter(Boolean).forEach((token) => {
                const normalized = token.trim().toUpperCase().replace(/^K/, '');
                const number = Number(normalized);
                if (/^\d{1,2}$/.test(normalized) && number >= 0 && number <= 99) {
                    continents.add(`K${String(number).padStart(2, '0')}`);
                } else {
                    invalid.push(token);
                }
            });
            return { continents, invalid };
        }

        function parseCoordinateInput(value) {
            return [...new Set((String(value || '').match(/\b\d{1,3}\|\d{1,3}\b/g) || [])
                .map((coordinate) => coordinate.split('|').map((part) => String(Number(part))).join('|'))
                .filter((coordinate) => /^\d{1,3}\|\d{1,3}$/.test(coordinate)))];
        }

        function villageContinent(village) {
            const xBand = Math.floor(Number(village.x) / 100);
            const yBand = Math.floor(Number(village.y) / 100);
            return `K${yBand}${xBand}`;
        }

        function storageKey() {
            return `${STORAGE_PREFIX}:${window.game_data?.world || window.location.hostname}`;
        }

        function ignoredEnemyKey() {
            return `${IGNORED_ENEMY_STORAGE_PREFIX}:${window.game_data?.world || window.location.hostname}`;
        }

        function loadConfig() {
            try {
                const saved = JSON.parse(window.localStorage.getItem(storageKey()) || '{}');
                const sharedIgnoredEnemies = window.localStorage.getItem(ignoredEnemyKey());
                return { ...saved, ...(sharedIgnoredEnemies !== null ? { ignoredEnemyInput: sharedIgnoredEnemies } : {}) };
            } catch (_error) {
                return {};
            }
        }

        function saveConfig(config) {
            window.localStorage.setItem(storageKey(), JSON.stringify(config));
            window.localStorage.setItem(ignoredEnemyKey(), config.ignoredEnemyInput || '');
        }

        function troopStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${TROOP_STORAGE_PREFIX}:${world}:${ally}`;
        }

        function resultStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${RESULT_STORAGE_PREFIX}:${world}:${ally}`;
        }

        function coordinateResultStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${COORDINATE_RESULT_STORAGE_PREFIX}:${world}:${ally}`;
        }

        function saveCoordinateSnapshot(payload) {
            if (payload.analysisMode !== 'coordinates') return false;
            const key = coordinateResultStorageKey();
            try {
                const current = JSON.parse(window.localStorage.getItem(key) || '[]');
                const history = [payload, ...(Array.isArray(current) ? current : [])]
                    .filter((item, index, list) => item?.snapshotId
                        && list.findIndex((candidate) => candidate?.snapshotId === item.snapshotId) === index)
                    .slice(0, 12);
                window.localStorage.setItem(key, JSON.stringify(history));
                return true;
            } catch (error) {
                console.warn('[Blind Preventivo] Não foi possível guardar o histórico de lotes por coordenadas:', error);
                return false;
            }
        }

        function saveDistributionSnapshot() {
            const allVillages = state.results.map((risk) => ({
                    id: String(risk.allied.id),
                    name: risk.allied.name,
                    coordinate: risk.allied.coordinate,
                    continent: villageContinent(risk.allied),
                    x: Number(risk.allied.x),
                    y: Number(risk.allied.y),
                    playerId: String(risk.allied.playerId),
                    playerName: risk.allied.playerName,
                    alliedPoints: Number(risk.allied.points) || 0,
                    allyId: String(risk.allied.allyId),
                    allyTag: risk.alliedTribe?.tag || risk.alliedTribe?.name || '',
                    bucket: Number(risk.bucket),
                    hours: Number(risk.hours),
                    minutes: Number(risk.minutes),
                    enemyCoordinate: risk.enemy.coordinate,
                    enemyPoints: Number(risk.enemy.points) || 0,
                    enemyPlayerName: risk.enemy.playerName,
                    enemyAllyTag: risk.enemyTribe?.tag || risk.enemyTribe?.name || '',
                    classification: risk.classification,
                    required: Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, Number(risk.required?.[unit.id]) || 0])),
                    actual: Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, Number(risk.actual?.[unit.id]) || 0])),
                    deficits: Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, Number(risk.deficits?.[unit.id]) || 0]))
                }));
            const needs = allVillages.filter((village) => village.classification === 'needs');
            // O distribuidor usa a coleção auxiliar somente para revisar aldeias
            // já defendidas que entraram em alguma blacklist. Resultados "missing"
            // e "needs" não precisam ser duplicados aqui, o que reduz bastante o
            // uso do localStorage em análises grandes.
            const villages = allVillages.filter((village) => village.classification === 'defended');
            const savedAt = new Date().toISOString();
            const key = resultStorageKey();
            const payload = {
                version: 3,
                defenseBasis: 'home',
                snapshotId: `blind-${Date.now()}-${state.analysisMode}`,
                world: String(window.game_data?.world || window.location.hostname),
                allyId: String(window.game_data?.player?.ally || ''),
                savedAt,
                analysisMode: state.analysisMode,
                selectionLabel: state.coordinateSelectionLabel,
                requestedCoordinates: state.analysisMode === 'coordinates' ? [...state.requestedCoordinates] : [],
                sourceTroopsSavedAt: state.troopDataInfo.savedAt || null,
                thresholds: state.thresholds,
                minEnemyPoints: state.minEnemyPoints,
                selectedContinents: state.selectedContinents,
                ignoredEnemyPlayers: [...state.ignoredEnemyPlayers],
                protectedCoordinates: [...new Set(state.results.map((risk) => risk.allied.coordinate).filter(Boolean))],
                villages,
                needs
            };

            try {
                window.localStorage.setItem(key, JSON.stringify(payload));
                const persisted = JSON.parse(window.localStorage.getItem(key) || 'null');
                if (persisted?.savedAt !== savedAt) throw new Error('O navegador não confirmou a gravação do resultado.');
                saveCoordinateSnapshot(payload);
                return { saved: true, savedAt, needs: needs.length };
            } catch (error) {
                console.warn('[Blind Preventivo] Não foi possível salvar o resultado para o distribuidor:', error);
                return { saved: false, error };
            }
        }

        function findTroopStoragePayload() {
            const preferred = window.localStorage.getItem(troopStorageKey());
            if (preferred) return preferred;
            const world = String(window.game_data?.world || window.location.hostname);
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key?.includes('_tropas_tribo_v2:') && key.includes(`:${world}:`)) {
                    const raw = window.localStorage.getItem(key);
                    if (raw) return raw;
                }
            }
            return null;
        }

        function loadTroopIndex() {
            const index = new Map();
            try {
                const raw = findTroopStoragePayload();
                if (!raw) return { index, count: 0, savedAt: null };
                const payload = JSON.parse(raw);
                if (payload?.version !== 2 || !Array.isArray(payload.results)) return { index, count: 0, savedAt: null };
                payload.results.forEach((result) => {
                    (result.villageDetails || []).forEach((village) => {
                        const coordinate = String(village.coordinate || village.name || '').match(/\d{3}\|\d{3}/)?.[0];
                        if (!coordinate) return;
                        index.set(coordinate, {
                            playerName: result.name || '',
                            home: village.home || {},
                            transit: village.transit || {}
                        });
                    });
                });
                return { index, count: index.size, savedAt: payload.savedAt || null };
            } catch (error) {
                console.warn('[Blind Preventivo] Não foi possível ler as tropas salvas:', error);
                return { index, count: 0, savedAt: null };
            }
        }

        function emptyThresholds() {
            return Object.fromEntries(HOUR_LIMITS.map((limit) => [limit,
                Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, 0]))
            ]));
        }

        function normalizeThresholds(value) {
            const thresholds = emptyThresholds();
            HOUR_LIMITS.forEach((limit) => {
                DEFENSE_UNITS.forEach((unit) => {
                    thresholds[limit][unit.id] = Math.max(0, Number.parseInt(value?.[limit]?.[unit.id], 10) || 0);
                });
            });
            return thresholds;
        }

        function readThresholds(panel) {
            const thresholds = emptyThresholds();
            panel.querySelectorAll('[data-threshold-limit][data-threshold-unit]').forEach((input) => {
                const limit = Number(input.dataset.thresholdLimit);
                const unit = input.dataset.thresholdUnit;
                if (!thresholds[limit] || !DEFENSE_UNITS.some((item) => item.id === unit)) return;
                thresholds[limit][unit] = Math.max(0, Number.parseInt(input.value, 10) || 0);
            });
            return thresholds;
        }

        function notify(message, type = 'success') {
            if (window.UI) {
                if (type === 'error' && typeof window.UI.ErrorMessage === 'function') {
                    window.UI.ErrorMessage(message, 4000);
                    return;
                }
                if (typeof window.UI.InfoMessage === 'function') {
                    window.UI.InfoMessage(message, 3000);
                    return;
                }
            }
            console[type === 'error' ? 'error' : 'log'](`[Blind Preventivo] ${message}`);
        }

        function setStatus(message, type = 'normal') {
            const status = document.querySelector(`#${SCRIPT_ID} .cbp-status`);
            if (!status) return;
            status.textContent = message;
            status.dataset.type = type;
        }

        async function fetchText(path, signal) {
            const response = await fetch(path, {
                credentials: 'include',
                cache: 'no-cache',
                signal,
                headers: { Accept: 'text/plain,application/xml,text/xml,*/*' }
            });
            if (!response.ok) throw new Error(`Falha HTTP ${response.status} em ${path}`);
            return response.text();
        }

        async function fetchOptionalText(path, signal) {
            try {
                return await fetchText(path, signal);
            } catch (error) {
                if (error.name === 'AbortError') throw error;
                console.warn(`[Blind Preventivo] Configuração opcional indisponível em ${path}:`, error);
                return '';
            }
        }

        function parseAllies(text) {
            const allies = new Map();
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const id = Number(fields[0]);
                if (!id) return;
                allies.set(id, {
                    id,
                    name: decodeMapValue(fields[1]),
                    tag: decodeMapValue(fields[2])
                });
            });
            return allies;
        }

        function parsePlayers(text) {
            const players = new Map();
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const id = Number(fields[0]);
                if (!id) return;
                players.set(id, {
                    id,
                    name: decodeMapValue(fields[1]),
                    allyId: Number(fields[2]) || 0
                });
            });
            return players;
        }

        function parseRelevantVillages(text, players, alliedIds, enemyIds) {
            const allied = [];
            const enemy = [];
            const all = [];
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const ownerId = Number(fields[4]) || 0;
                const player = players.get(ownerId) || null;
                const isAllied = Boolean(player && alliedIds.has(player.allyId));
                const isEnemy = Boolean(player && enemyIds.has(player.allyId));

                const village = {
                    id: Number(fields[0]) || 0,
                    name: decodeMapValue(fields[1]),
                    x: Number(fields[2]),
                    y: Number(fields[3]),
                    coordinate: `${fields[2]}|${fields[3]}`,
                    playerId: ownerId,
                    playerName: player?.name || (ownerId ? 'Jogador não identificado' : 'Bárbaros'),
                    allyId: player?.allyId || 0,
                    points: Number(fields[5]) || 0
                };
                if (!Number.isFinite(village.x) || !Number.isFinite(village.y)) return;
                all.push(village);
                if (isAllied) allied.push(village);
                if (isEnemy) enemy.push(village);
            });
            return { allied, enemy, all };
        }

        function resolveTribes(requested, allies) {
            const byName = new Map();
            allies.forEach((ally) => {
                byName.set(normalizeName(ally.name), ally);
                byName.set(normalizeName(ally.tag), ally);
            });

            const found = [];
            const missing = [];
            requested.forEach((entry) => {
                const ally = byName.get(normalizeName(entry));
                if (ally && !found.some((item) => item.id === ally.id)) found.push(ally);
                else if (!ally) missing.push(entry);
            });
            return { found, missing };
        }

        function parseXml(text) {
            const xml = new DOMParser().parseFromString(text, 'application/xml');
            if (xml.querySelector('parsererror')) throw new Error('XML de configuração inválido.');
            return xml;
        }

        function readXmlNumber(xml, selector, fallback = null) {
            const value = Number.parseFloat(xml.querySelector(selector)?.textContent || '');
            return Number.isFinite(value) && value > 0 ? value : fallback;
        }

        function detectNobleMinutes(configText, unitText) {
            const configXml = parseXml(configText);
            const unitXml = parseXml(unitText);
            const worldSpeed = readXmlNumber(configXml, 'config > speed, speed', 1);
            const unitSpeed = readXmlNumber(configXml, 'config > unit_speed, unit_speed', 1);
            const nobleBaseMinutes = readXmlNumber(unitXml, 'snob > speed', 35);
            return {
                minutesPerField: nobleBaseMinutes / (worldSpeed * unitSpeed),
                worldSpeed,
                unitSpeed,
                nobleBaseMinutes
            };
        }

        function bucketFor(hours) {
            return HOUR_LIMITS.find((limit) => hours <= limit + 1e-9) || null;
        }

        function bucketLabel(limit) {
            const index = HOUR_LIMITS.indexOf(limit);
            const previous = index > 0 ? HOUR_LIMITS[index - 1] : 0;
            return previous === 0 ? 'Até 1h' : `${previous}h–${limit}h`;
        }

        function buildEnemyGrid(villages, cellSize) {
            const grid = new Map();
            villages.forEach((village) => {
                const key = `${Math.floor(village.x / cellSize)},${Math.floor(village.y / cellSize)}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(village);
            });
            return grid;
        }

        function calculateRisks(alliedVillages, enemyVillages, minutesPerField, allies) {
            const maxHours = HOUR_LIMITS[HOUR_LIMITS.length - 1];
            const maxDistance = (maxHours * 60) / minutesPerField;
            const maxDistanceSquared = maxDistance * maxDistance;
            const cellSize = Math.max(1, maxDistance);
            const grid = buildEnemyGrid(enemyVillages, cellSize);
            const risks = [];
            const threateningEnemies = new Map();
            const threatRelations = [];

            alliedVillages.forEach((village) => {
                const cellX = Math.floor(village.x / cellSize);
                const cellY = Math.floor(village.y / cellSize);
                let nearest = null;
                let nearestDistanceSquared = Infinity;
                let threatCount = 0;

                for (let dx = -1; dx <= 1; dx += 1) {
                    for (let dy = -1; dy <= 1; dy += 1) {
                        const candidates = grid.get(`${cellX + dx},${cellY + dy}`) || [];
                        candidates.forEach((enemy) => {
                            const deltaX = village.x - enemy.x;
                            const deltaY = village.y - enemy.y;
                            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
                            if (distanceSquared > maxDistanceSquared) return;
                            threatCount += 1;
                            threateningEnemies.set(enemy.id, enemy);
                            const candidateDistance = Math.sqrt(distanceSquared);
                            const candidateMinutes = candidateDistance * minutesPerField;
                            const candidateBucket = bucketFor(candidateMinutes / 60);
                            if (candidateBucket) {
                                threatRelations.push({
                                    bucket: candidateBucket,
                                    allied: village,
                                    enemy,
                                    alliedTribe: allies.get(village.allyId),
                                    enemyTribe: allies.get(enemy.allyId),
                                    distance: candidateDistance,
                                    minutes: candidateMinutes
                                });
                            }
                            if (distanceSquared < nearestDistanceSquared) {
                                nearestDistanceSquared = distanceSquared;
                                nearest = enemy;
                            }
                        });
                    }
                }

                if (!nearest) return;
                const distance = Math.sqrt(nearestDistanceSquared);
                const minutes = distance * minutesPerField;
                const hours = minutes / 60;
                const bucket = bucketFor(hours);
                if (!bucket) return;
                risks.push({
                    bucket,
                    hours,
                    minutes,
                    distance,
                    threatCount,
                    allied: village,
                    enemy: nearest,
                    alliedTribe: allies.get(village.allyId),
                    enemyTribe: allies.get(nearest.allyId)
                });
            });

            risks.sort((a, b) => a.hours - b.hours || a.allied.coordinate.localeCompare(b.allied.coordinate));
            threatRelations.sort((a, b) => a.bucket - b.bucket || a.minutes - b.minutes
                || a.enemy.coordinate.localeCompare(b.enemy.coordinate)
                || a.allied.coordinate.localeCompare(b.allied.coordinate));
            return { risks, threateningEnemies: [...threateningEnemies.values()], threatRelations };
        }

        function classifyRisks(risks, troopIndex, thresholds) {
            risks.forEach((risk) => {
                const troopRecord = troopIndex.get(risk.allied.coordinate) || null;
                const required = thresholds[risk.bucket] || Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, 0]));
                const actual = {};
                const outside = {};
                const deficits = {};

                DEFENSE_UNITS.forEach((unit) => {
                    const home = Number(troopRecord?.home?.[unit.id]) || 0;
                    outside[unit.id] = Number(troopRecord?.transit?.[unit.id]) || 0;
                    actual[unit.id] = home;
                    deficits[unit.id] = Math.max(0, (Number(required[unit.id]) || 0) - actual[unit.id]);
                });

                risk.troopRecord = troopRecord;
                risk.required = required;
                risk.actual = actual;
                risk.outside = outside;
                risk.deficits = deficits;
                risk.classification = !troopRecord
                    ? 'missing'
                    : DEFENSE_UNITS.every((unit) => deficits[unit.id] === 0)
                        ? 'defended'
                        : 'needs';
            });
            return risks;
        }

        function nearestEnemyForVillage(village, enemies, minutesPerField, allies) {
            let nearest = null;
            let nearestDistanceSquared = Infinity;
            (enemies || []).forEach((enemy) => {
                const deltaX = Number(village.x) - Number(enemy.x);
                const deltaY = Number(village.y) - Number(enemy.y);
                const distanceSquared = deltaX * deltaX + deltaY * deltaY;
                if (distanceSquared >= nearestDistanceSquared) return;
                nearest = enemy;
                nearestDistanceSquared = distanceSquared;
            });
            if (!nearest) return null;
            const distance = Math.sqrt(nearestDistanceSquared);
            return {
                enemy: nearest,
                tribe: allies?.get?.(nearest.allyId) || null,
                distance,
                minutes: distance * (Number(minutesPerField) || 35)
            };
        }

        function buildCoordinateReview(villages, risks, troopIndex, enemies, minutesPerField, allies) {
            const riskByCoordinate = new Map(risks.map((risk) => [risk.allied.coordinate, risk]));
            return villages.map((village) => {
                const risk = riskByCoordinate.get(village.coordinate) || null;
                const troopRecord = troopIndex.get(village.coordinate) || null;
                const home = Object.fromEntries(TROOP_OVERVIEW_UNITS.map((unit) => [
                    unit.id,
                    Number(troopRecord?.home?.[unit.id]) || 0
                ]));
                const transit = Object.fromEntries(TROOP_OVERVIEW_UNITS.map((unit) => [
                    unit.id,
                    Number(troopRecord?.transit?.[unit.id]) || 0
                ]));
                const actual = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                    unit.id,
                    home[unit.id]
                ]));
                return {
                    village,
                    risk,
                    nearestEnemy: nearestEnemyForVillage(village, enemies, minutesPerField, allies),
                    troopRecord,
                    home,
                    transit,
                    actual,
                    required: risk?.required || null,
                    deficits: risk?.deficits || null,
                    status: risk?.classification || (troopRecord ? 'outside' : 'missing')
                };
            }).sort((a, b) => (
                (a.nearestEnemy?.minutes ?? Infinity) - (b.nearestEnemy?.minutes ?? Infinity)
                || a.village.coordinate.localeCompare(b.village.coordinate)
            ));
        }

        function calculateOutOfPatternBlinds(alliedVillages, risks, troopIndex, thresholds) {
            const riskByCoordinate = new Map(risks.map((risk) => [risk.allied.coordinate, risk]));
            return alliedVillages.map((village) => {
                const troopRecord = troopIndex.get(village.coordinate);
                if (!troopRecord) return null;
                const homeActual = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                    unit.id,
                    Number(troopRecord.home?.[unit.id]) || 0
                ]));
                const outsideActual = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                    unit.id,
                    Number(troopRecord.transit?.[unit.id]) || 0
                ]));
                const actual = { ...homeActual };
                const strongestBucket = HOUR_LIMITS.find((limit) => {
                    const required = thresholds[limit] || {};
                    const configured = DEFENSE_UNITS.some((unit) => (Number(required[unit.id]) || 0) > 0);
                    return configured && DEFENSE_UNITS.every((unit) => actual[unit.id] >= (Number(required[unit.id]) || 0));
                });
                if (!strongestBucket) return null;

                const risk = riskByCoordinate.get(village.coordinate) || null;
                if (risk && strongestBucket >= risk.bucket) return null;
                const currentRequired = risk
                    ? (thresholds[risk.bucket] || {})
                    : Object.fromEntries(DEFENSE_UNITS.map((unit) => [unit.id, 0]));
                const excess = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                    unit.id,
                    Math.max(0, actual[unit.id] - (Number(currentRequired[unit.id]) || 0))
                ]));
                const homeExcess = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                    unit.id,
                    Math.max(0, homeActual[unit.id] - (Number(currentRequired[unit.id]) || 0))
                ]));
                return {
                    allied: village,
                    troopRecord,
                    homeActual,
                    outsideActual,
                    actual,
                    excess,
                    homeExcess,
                    strongestBucket,
                    currentBucket: risk?.bucket || null,
                    currentRequired,
                    risk,
                    nearbyEnemies: nearestEnemiesForVillage(village, state.enemyVillages, state.detectedMinutesPerField, state.tribeIndex)
                };
            }).filter(Boolean).sort((a, b) => (
                a.strongestBucket - b.strongestBucket
                || (a.currentBucket || 99) - (b.currentBucket || 99)
                || a.allied.coordinate.localeCompare(b.allied.coordinate)
            ));
        }

        function nearestEnemiesForVillage(village, enemies, minutesPerField, allies, limit = 3) {
            return (enemies || []).map((enemy) => {
                const deltaX = Number(village.x) - Number(enemy.x);
                const deltaY = Number(village.y) - Number(enemy.y);
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                return {
                    enemy,
                    tribe: allies?.get?.(enemy.allyId) || null,
                    distance,
                    minutes: distance * (Number(minutesPerField) || 35)
                };
            }).sort((a, b) => a.distance - b.distance || a.enemy.coordinate.localeCompare(b.enemy.coordinate)).slice(0, limit);
        }

        function classificationLabel(classification) {
            if (classification === 'defended') return 'Defendida/blindada';
            if (classification === 'missing') return 'Sem dados de tropas';
            return 'Precisa blind';
        }

        function visibleRisks(risks) {
            if (state.resultFilter === 'all') return risks;
            return risks.filter((risk) => risk.classification === state.resultFilter);
        }

        function formatDuration(totalMinutes) {
            const seconds = Math.round(totalMinutes * 60);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }

        function villageLink(village) {
            const url = new URL('/game.php', window.location.origin);
            url.searchParams.set('village', String(window.game_data?.village?.id || village.id));
            url.searchParams.set('screen', 'info_village');
            url.searchParams.set('id', String(village.id));
            return url.href;
        }

        function renderRiskMap() {
            const alliedVillages = new Map();
            state.results.forEach((risk) => alliedVillages.set(risk.allied.id, risk));
            const outOfPatternVillages = new Map(state.outOfPatternBlinds.map((item) => [item.allied.id, item]));
            const enemyVillages = new Map();
            (state.mapEnemies.length ? state.mapEnemies : state.results.map((risk) => risk.enemy))
                .forEach((village) => enemyVillages.set(village.id, village));
            const points = [
                ...[...alliedVillages.values()].map((risk) => risk.allied),
                ...[...outOfPatternVillages.values()].map((item) => item.allied),
                ...enemyVillages.values()
            ];

            if (!points.length) return '<div class="cbp-empty">Nenhuma aldeia disponível para montar o mapa.</div>';

            const xs = points.map((village) => village.x);
            const ys = points.map((village) => village.y);
            const rawMinX = Math.min(...xs);
            const rawMaxX = Math.max(...xs);
            const rawMinY = Math.min(...ys);
            const rawMaxY = Math.max(...ys);
            const rawSpan = Math.max(rawMaxX - rawMinX, rawMaxY - rawMinY, 10);
            const margin = Math.max(2, rawSpan * 0.05);
            const minX = rawMinX - margin;
            const minY = rawMinY - margin;
            const width = Math.max(1, rawMaxX - rawMinX + margin * 2);
            const height = Math.max(1, rawMaxY - rawMinY + margin * 2);
            const pointRadius = Math.max(0.38, Math.min(1.15, rawSpan / 145));
            const strokeWidth = Math.max(0.12, rawSpan / 700);
            const gridStartX = Math.ceil(minX / 10) * 10;
            const gridStartY = Math.ceil(minY / 10) * 10;
            const gridLines = [];
            for (let x = gridStartX; x <= minX + width; x += 10) {
                gridLines.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${minY + height}"></line>`);
            }
            for (let y = gridStartY; y <= minY + height; y += 10) {
                gridLines.push(`<line x1="${minX}" y1="${y}" x2="${minX + width}" y2="${y}"></line>`);
            }

            const maxX = minX + width;
            const maxY = minY + height;
            const continentLines = [];
            const continentLabels = [];
            const continentFontSize = Math.max(2.4, Math.min(6, rawSpan / 35));
            const firstContinentX = Math.floor(minX / 100);
            const lastContinentX = Math.floor(maxX / 100);
            const firstContinentY = Math.floor(minY / 100);
            const lastContinentY = Math.floor(maxY / 100);
            for (let continentX = firstContinentX; continentX <= lastContinentX; continentX += 1) {
                const boundaryX = continentX * 100;
                if (boundaryX >= minX && boundaryX <= maxX) {
                    continentLines.push(`<line x1="${boundaryX}" y1="${minY}" x2="${boundaryX}" y2="${maxY}"></line>`);
                }
            }
            for (let continentY = firstContinentY; continentY <= lastContinentY; continentY += 1) {
                const boundaryY = continentY * 100;
                if (boundaryY >= minY && boundaryY <= maxY) {
                    continentLines.push(`<line x1="${minX}" y1="${boundaryY}" x2="${maxX}" y2="${boundaryY}"></line>`);
                }
            }
            for (let continentY = firstContinentY; continentY <= lastContinentY; continentY += 1) {
                for (let continentX = firstContinentX; continentX <= lastContinentX; continentX += 1) {
                    const visibleLeft = Math.max(minX, continentX * 100);
                    const visibleRight = Math.min(maxX, (continentX + 1) * 100);
                    const visibleTop = Math.max(minY, continentY * 100);
                    const visibleBottom = Math.min(maxY, (continentY + 1) * 100);
                    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) continue;
                    const labelX = visibleLeft + (visibleRight - visibleLeft) / 2;
                    const labelY = visibleTop + Math.min(8, Math.max(3, (visibleBottom - visibleTop) * 0.12));
                    continentLabels.push(`<text x="${labelX}" y="${labelY}" font-size="${continentFontSize}" text-anchor="middle">K${continentY}${continentX}</text>`);
                }
            }

            const highlightedCoordinates = new Set([
                ...[...alliedVillages.values()].map((risk) => risk.allied.coordinate),
                ...[...outOfPatternVillages.values()].map((item) => item.allied.coordinate),
                ...[...enemyVillages.values()].map((village) => village.coordinate)
            ]);
            const neutralCandidates = state.worldVillages.filter((village) => village.x >= minX && village.x <= maxX
                && village.y >= minY && village.y <= maxY
                && !highlightedCoordinates.has(village.coordinate));
            const neutralLimit = 2500;
            const neutralStep = Math.max(1, Math.ceil(neutralCandidates.length / neutralLimit));
            const neutralVillages = neutralCandidates.filter((village, index) => index % neutralStep === 0).slice(0, neutralLimit);
            const neutralDots = neutralVillages.map((village) => {
                const title = `${village.playerId ? 'OUTRA ALDEIA' : 'ALDEIA DE BÁRBAROS'} · ${village.name} (${village.coordinate}) · ${village.playerName} · ${formatNumber(village.points)} pontos`;
                return `<circle class="cbp-map-neutral" cx="${village.x}" cy="${village.y}" r="${pointRadius * 0.52}"><title>${escapeHtml(title)}</title></circle>`;
            }).join('');

            const connections = state.results.map((risk) => `
                <line class="cbp-map-connection" x1="${risk.allied.x}" y1="${risk.allied.y}" x2="${risk.enemy.x}" y2="${risk.enemy.y}" stroke-width="${strokeWidth}">
                    <title>${escapeHtml(`${risk.allied.coordinate} → ${risk.enemy.coordinate} · nobre: ${formatDuration(risk.minutes)}`)}</title>
                </line>`).join('');
            const enemyDots = [...enemyVillages.values()].map((village) => {
                const tribe = state.resolvedEnemies.find((ally) => ally.id === village.allyId);
                const title = `INIMIGA · ${village.name} (${village.coordinate}) · ${village.playerName || 'sem jogador'} · ${tribe?.tag || tribe?.name || 'tribo inimiga'} · ${formatNumber(village.points)} pontos`;
                return `<a href="${escapeHtml(villageLink(village))}" target="_blank"><circle class="cbp-map-dot cbp-map-enemy" cx="${village.x}" cy="${village.y}" r="${pointRadius}"><title>${escapeHtml(title)}</title></circle></a>`;
            }).join('');
            const alliedDots = [...alliedVillages.values()].map((risk) => {
                const village = risk.allied;
                const title = `${classificationLabel(risk.classification).toUpperCase()} · ${village.name} (${village.coordinate}) · ${village.playerName || 'sem jogador'} · nobre mais próximo: ${formatDuration(risk.minutes)}`;
                return `<a href="${escapeHtml(villageLink(village))}" target="_blank"><circle class="cbp-map-dot cbp-map-${risk.classification}" cx="${village.x}" cy="${village.y}" r="${pointRadius * 1.12}"><title>${escapeHtml(title)}</title></circle></a>`;
            }).join('');
            const outOfPatternRings = [...outOfPatternVillages.values()].map((item) => {
                const village = item.allied;
                const currentRisk = item.currentBucket ? `ameaça em ${bucketLabel(item.currentBucket).toLowerCase()}` : 'sem ameaça em até 8h';
                const title = `BLIND FORA DA FAIXA · ${village.name} (${village.coordinate}) · padrão de até ${item.strongestBucket}h, ${currentRisk}`;
                return `<a href="${escapeHtml(villageLink(village))}" target="_blank"><circle class="cbp-map-overblind" cx="${village.x}" cy="${village.y}" r="${pointRadius * 1.8}"><title>${escapeHtml(title)}</title></circle></a>`;
            }).join('');

            return `
                <section class="cbp-map-card">
                    <div class="cbp-map-heading">
                        <div><h4>Mapa de ameaças, blinds e continentes</h4><small>Passe o mouse para ver os dados. Clique nas aldeias destacadas para abri-las.</small></div>
                        <span>${formatNumber(enemyVillages.size)} inimigas · ${formatNumber(alliedVillages.size)} aliadas · ${formatNumber(neutralVillages.length)} de ${formatNumber(neutralCandidates.length)} outras aldeias exibidas</span>
                    </div>
                    <div class="cbp-map-legend">
                        <span><i class="cbp-legend-enemy"></i>Inimiga</span>
                        <span><i class="cbp-legend-defended"></i>Blindada</span>
                        <span><i class="cbp-legend-needs"></i>Precisa blind</span>
                        <span><i class="cbp-legend-missing"></i>Sem dados</span>
                        <span><i class="cbp-legend-overblind"></i>Blind fora da faixa</span>
                        <span><i class="cbp-legend-neutral"></i>Outras aldeias</span>
                        <span><i class="cbp-legend-continent"></i>Limite do continente</span>
                        <span><i class="cbp-legend-line"></i>Inimigo mais próximo</span>
                    </div>
                    <div class="cbp-map-wrap"><svg class="cbp-risk-map" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa das aldeias inimigas e aliadas analisadas">
                        <g class="cbp-map-grid">${gridLines.join('')}</g>
                        <g class="cbp-map-continent-lines">${continentLines.join('')}</g>
                        <g class="cbp-map-continent-labels">${continentLabels.join('')}</g>
                        <g>${neutralDots}</g>
                        <g>${connections}</g>
                        <g>${enemyDots}</g>
                        <g>${alliedDots}</g>
                        <g>${outOfPatternRings}</g>
                    </svg></div>
                </section>`;
        }

        function outOfPatternWithdrawalText() {
            const rows = state.outOfPatternBlinds.map((item) => {
                const riskText = item.currentBucket ? bucketLabel(item.currentBucket) : 'Sem ameaça até 8h';
                return `[**][coord]${item.allied.coordinate}[/coord] [||] ${item.allied.playerName || '-'} [||] Padrão até ${item.strongestBucket}h [||] ${riskText} [||] ${DEFENSE_UNITS.map((unit) => formatNumber(item.excess[unit.id])).join(' [||] ')}[/**]`;
            }).join('\n');
            return `[b]REVISÃO DE BLINDS FORA DA FAIXA[/b]\n\nAs aldeias abaixo possuem defesa acima do padrão correspondente ao risco atual. Confirmem quais tropas são apoios de terceiros antes de programar qualquer retirada.\n\n[table]\n[**] ALDEIA [||] JOGADOR [||] BLIND IDENTIFICADO [||] RISCO ATUAL [||] EXCESSO [unit]spear[/unit] [||] EXCESSO [unit]sword[/unit] [||] EXCESSO [unit]spy[/unit] [||] EXCESSO [unit]heavy[/unit] [/**]\n${rows}\n[/table]`;
        }

        function withdrawalMessagesByPlayer() {
            const grouped = new Map();
            state.outOfPatternBlinds.forEach((item) => {
                const playerName = String(item.allied.playerName || '').trim();
                if (!playerName || playerName === '-') return;
                if (!grouped.has(playerName)) grouped.set(playerName, []);
                grouped.get(playerName).push(item);
            });
            return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([playerName, items]) => ({
                playerName,
                items: items.sort((a, b) => a.allied.coordinate.localeCompare(b.allied.coordinate))
            }));
        }

        function nearbyEnemiesBbcode(item) {
            if (!item.nearbyEnemies?.length) return '[i]Nenhuma aldeia inimiga válida encontrada na configuração atual.[/i]';
            const rows = item.nearbyEnemies.map((nearby) => {
                const tribe = nearby.tribe?.tag || nearby.tribe?.name || '-';
                return `[*][coord]${nearby.enemy.coordinate}[/coord] [|] [player]${nearby.enemy.playerName || '-'}[/player] [|] ${tribe} [|] ${formatNumber(nearby.enemy.points)} [|] ${formatNumber(nearby.distance, 1)} campos [|] [b]${formatDuration(nearby.minutes)}[/b][/*]`;
            }).join('\n');
            return `[table]\n[**] ALDEIA INIMIGA [||] JOGADOR [||] TRIBO [||] PONTOS [||] DISTÂNCIA [||] TEMPO DE NOBRE [/**]\n${rows}\n[/table]`;
        }

        function buildWithdrawalPlayerMessage(playerName, items) {
            const villageBlocks = items.map((item) => {
                const riskLabel = item.currentBucket
                    ? `${bucketLabel(item.currentBucket)} · nobre mais próximo em ${item.nearbyEnemies?.[0] ? formatDuration(item.nearbyEnemies[0].minutes) : 'tempo não disponível'}`
                    : `Sem ameaça em até 8h · nobre mais próximo em ${item.nearbyEnemies?.[0] ? formatDuration(item.nearbyEnemies[0].minutes) : 'tempo não disponível'}`;
                const unitRows = DEFENSE_UNITS.map((unit) => `[*][unit]${unit.id}[/unit] ${unit.label} [|] ${formatNumber(item.homeActual[unit.id])} [|] ${formatNumber(item.outsideActual[unit.id])} [|] ${formatNumber(item.homeActual[unit.id] + item.outsideActual[unit.id])} [|] [b]${formatNumber(item.currentRequired[unit.id])}[/b] [|] [color=${item.homeExcess[unit.id] > 0 ? '#ff0000' : '#008000'}][b]${formatNumber(item.homeExcess[unit.id])}[/b][/color][/*]`).join('\n');
                const suggested = DEFENSE_UNITS
                    .filter((unit) => item.homeExcess[unit.id] > 0)
                    .map((unit) => `[unit]${unit.id}[/unit] ${formatNumber(item.homeExcess[unit.id])}`)
                    .join(' · ') || 'Nenhuma retirada segura calculada apenas sobre as tropas marcadas como “na aldeia”.';
                return `[size=13][b][coord]${item.allied.coordinate}[/coord] — ${item.allied.name || 'Aldeia'}[/b][/size]\n[b]Risco atual:[/b] ${riskLabel}\n[b]Retirada sugerida para revisão:[/b] ${suggested}\n\n[table]\n[**] TROPA [||] NA ALDEIA [||] FORA/MOVIMENTO [||] TOTAL MAPEADO [||] IDEAL A MANTER [||] EXCEDENTE PARADO [/**]\n${unitRows}\n[/table]\n\n[spoiler=Inimigos próximos e tempo de nobre]\n${nearbyEnemiesBbcode(item)}\n[/spoiler]`;
            }).join('\n\n[hr]\n\n');

            return `[size=14][b][color=#ff0000]REVISÃO DE APOIOS EXCEDENTES[/color][/b][/size]\n\nOlá, [player]${playerName}[/player].\n\nIdentificamos ${items.length} aldeia(s) sua(s) com defesa acima do padrão correspondente à ameaça atual. Por favor, confira os apoios estacionados e coordene a retirada somente do excedente indicado abaixo.\n\n[color=#ff0000][b]IMPORTANTE:[/b][/color] mantenha pelo menos o valor da coluna “Ideal a manter”. Os números são uma recomendação baseada na última coleta; confira a Praça de Reunião antes de retirar. Não retire defesa própria ou apoio necessário sem validar com a liderança.\n\n${villageBlocks}\n\nQuando concluir a revisão, avise a liderança.`;
        }

        function buildWithdrawalMessagesText() {
            const messages = withdrawalMessagesByPlayer();
            const blocks = messages.map(({ playerName, items }) => `================ MP PARA: ${playerName} ================\n${buildWithdrawalPlayerMessage(playerName, items)}`);
            return `ASSUNTO DAS MPS: Revisão de apoios excedentes\n\n${blocks.join('\n\n')}`;
        }

        function downloadWithdrawalMessages(text) {
            const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `mps-retirada-apoios-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        function openWithdrawalMessages() {
            const messages = withdrawalMessagesByPlayer();
            if (!messages.length) {
                notify('Nenhum proprietário identificado para gerar as MPs.', 'error');
                return;
            }
            document.getElementById(`${SCRIPT_ID}-withdrawal-modal`)?.remove();
            const text = buildWithdrawalMessagesText();
            const villageCount = messages.reduce((sum, message) => sum + message.items.length, 0);
            const modal = document.createElement('div');
            modal.id = `${SCRIPT_ID}-withdrawal-modal`;
            modal.className = 'cbp-modal-overlay';
            modal.innerHTML = `<div class="cbp-modal cbp-withdrawal-modal">
                <div class="cbp-modal-header"><strong>MPs para retirada de apoios excedentes</strong><button type="button" data-modal-action="close">×</button></div>
                <p><strong>${formatNumber(messages.length)} jogador(es)</strong> · ${formatNumber(villageCount)} aldeia(s). O TXT abaixo pode ser importado diretamente na fila de MPs da tela Mensagens.</p>
                <textarea class="cbp-forum-preview" spellcheck="false"></textarea>
                <div class="cbp-modal-actions">
                    <button type="button" class="btn btn-confirm-yes" data-modal-action="copy">Copiar todas as MPs</button>
                    <button type="button" class="btn" data-modal-action="download">Baixar TXT para a fila de MPs</button>
                    <button type="button" class="btn" data-modal-action="close">Fechar</button>
                </div>
            </div>`;
            modal.querySelector('.cbp-forum-preview').value = text;
            modal.addEventListener('click', (event) => {
                const action = event.target.closest('[data-modal-action]')?.dataset.modalAction;
                const currentText = modal.querySelector('.cbp-forum-preview').value;
                if (action === 'copy') copyText(currentText, `${messages.length} MP(s) de retirada copiadas.`);
                if (action === 'download') downloadWithdrawalMessages(currentText);
                if (action === 'close' || event.target === modal) modal.remove();
            });
            document.body.appendChild(modal);
        }

        function renderOutOfPatternBlinds() {
            if (!state.outOfPatternBlinds.length) {
                return '<section class="cbp-overblind"><div class="cbp-overblind-header"><div><h4>Blinds fora da faixa</h4><small>Nenhuma aldeia com blind acima do padrão de risco atual.</small></div></div></section>';
            }
            const ownerCount = withdrawalMessagesByPlayer().length;
            return `<section class="cbp-overblind">
                <div class="cbp-overblind-header"><div><h4>Blinds fora da faixa — revisar retirada</h4><small>A aldeia atinge um padrão mais urgente que sua ameaça atual. Os valores de excesso usam o mínimo da faixa correta.</small></div><div class="cbp-overblind-actions"><button type="button" class="btn" data-action="copy-overblind">Copiar resumo geral</button><button type="button" class="btn btn-confirm-yes" data-action="withdrawal-messages" ${ownerCount ? '' : 'disabled'}>Gerar MPs por jogador (${formatNumber(ownerCount)})</button></div></div>
                <div class="cbp-table-wrap"><table class="vis cbp-table"><thead><tr><th>Aldeia</th><th>Jogador</th><th>Blind identificado</th><th>Risco atual</th>${DEFENSE_UNITS.map((unit) => `<th>${escapeHtml(unit.label)}<small>atual / mínimo atual / excesso</small></th>`).join('')}<th>Inimigo mais próximo</th></tr></thead>
                    <tbody>${state.outOfPatternBlinds.map((item) => `<tr>
                        <td><a class="cbp-coordinate" href="${escapeHtml(villageLink(item.allied))}" target="_blank">${escapeHtml(item.allied.coordinate)}</a><small>${escapeHtml(item.allied.name || '')}</small></td>
                        <td>${escapeHtml(item.allied.playerName || '-')}</td><td><strong>Padrão de até ${item.strongestBucket}h</strong></td><td>${item.currentBucket ? escapeHtml(bucketLabel(item.currentBucket)) : '<strong>Sem ameaça em até 8h</strong>'}</td>
                        ${DEFENSE_UNITS.map((unit) => `<td>${formatNumber(item.actual[unit.id])} / ${formatNumber(item.currentRequired[unit.id])} / <strong>${formatNumber(item.excess[unit.id])}</strong></td>`).join('')}
                        <td>${item.nearbyEnemies?.[0] ? `${escapeHtml(item.nearbyEnemies[0].enemy.playerName || '-')}<small>${escapeHtml(item.nearbyEnemies[0].enemy.coordinate)} · nobre ${escapeHtml(formatDuration(item.nearbyEnemies[0].minutes))}</small>` : '—'}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
                <p class="cbp-overblind-note">A ferramenta identifica excesso defensivo, mas não confirma a propriedade das tropas. Confira os apoios no jogo antes de solicitar retirada.</p>
            </section>`;
        }

        function membersPageUrl() {
            const url = new URL('/game.php', window.location.origin);
            if (window.game_data?.village?.id) url.searchParams.set('village', String(window.game_data.village.id));
            url.searchParams.set('screen', 'ally');
            url.searchParams.set('mode', 'members');
            return url.href;
        }

        function threatRangeOptions() {
            return [
                ...HOUR_LIMITS.map((limit) => ({ value: String(limit), label: bucketLabel(limit) })),
                { value: 'all', label: 'Todas as faixas até 8h' }
            ];
        }

        function threatRangeLabel(rangeKey = state.threatRangeFilter) {
            return threatRangeOptions().find((option) => option.value === String(rangeKey))?.label || 'Até 1h';
        }

        function threatRangeSlug(rangeKey = state.threatRangeFilter) {
            return rangeKey === 'all' ? 'todas-ate-8h' : bucketLabel(Number(rangeKey)).toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }

        function threatDashboardData(rangeKey = state.threatRangeFilter) {
            const riskByAlliedCoordinate = new Map(state.results.map((risk) => [risk.allied.coordinate, risk]));
            const selectedRelations = String(rangeKey) === 'all'
                ? state.threatRelations
                : state.threatRelations.filter((relation) => relation.bucket === Number(rangeKey));
            const rows = selectedRelations.map((relation) => ({
                ...relation,
                risk: riskByAlliedCoordinate.get(relation.allied.coordinate) || null,
                enemyContinent: villageContinent(relation.enemy),
                alliedContinent: villageContinent(relation.allied)
            })).sort((a, b) => a.enemyContinent.localeCompare(b.enemyContinent, 'pt-BR', { numeric: true })
                || Number(b.enemy.points) - Number(a.enemy.points)
                || a.enemy.coordinate.localeCompare(b.enemy.coordinate)
                || a.allied.coordinate.localeCompare(b.allied.coordinate));
            const enemyByCoordinate = new Map();
            const alliedCoordinates = new Set();
            const enemyPlayers = new Set();
            const alliedPlayers = new Set();
            rows.forEach((row) => {
                enemyByCoordinate.set(row.enemy.coordinate, row.enemy);
                alliedCoordinates.add(row.allied.coordinate);
                if (row.enemy.playerName) enemyPlayers.add(row.enemy.playerName);
                if (row.allied.playerName) alliedPlayers.add(row.allied.playerName);
            });
            const enemies = [...enemyByCoordinate.values()];
            const continentSummary = new Map();
            enemies.forEach((enemy) => {
                const continent = villageContinent(enemy);
                if (!continentSummary.has(continent)) continentSummary.set(continent, { continent, enemies: 0, points: 0 });
                const item = continentSummary.get(continent);
                item.enemies += 1;
                item.points += Number(enemy.points) || 0;
            });
            return {
                rows,
                enemies,
                alliedVillages: alliedCoordinates.size,
                enemyPlayers: enemyPlayers.size,
                alliedPlayers: alliedPlayers.size,
                enemyPoints: enemies.reduce((sum, enemy) => sum + (Number(enemy.points) || 0), 0),
                continents: [...continentSummary.values()].sort((a, b) => a.continent.localeCompare(b.continent, 'pt-BR', { numeric: true }))
            };
        }

        function renderThreatDashboard() {
            const dashboard = threatDashboardData();
            const rangeLabel = threatRangeLabel();
            const rangeOptions = threatRangeOptions().map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === state.threatRangeFilter ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
            return `<section class="cbp-one-hour">
                <div class="cbp-one-hour-header">
                    <div><h4>Ameaças por tempo de nobre — ${escapeHtml(rangeLabel)}</h4><small>Escolha qualquer faixa ou consolide todas até 8h. Uma aldeia inimiga pode ameaçar mais de um destino.</small></div>
                    <div class="cbp-one-hour-actions">
                        <label>Faixa <select data-action="threat-range-filter">${rangeOptions}</select></label>
                        <button type="button" class="btn" data-action="export-threat-coordinates" ${dashboard.enemies.length ? '' : 'disabled'}>Exportar coordenadas</button>
                        <button type="button" class="btn btn-confirm-yes" data-action="export-threat-data" ${dashboard.rows.length ? '' : 'disabled'}>Exportar todos os dados</button>
                    </div>
                </div>
                ${dashboard.rows.length ? `
                <div class="cbp-one-hour-kpis">
                    <div><strong>${formatNumber(dashboard.enemies.length)}</strong><span>Aldeias inimigas únicas</span></div>
                    <div><strong>${formatNumber(dashboard.alliedVillages)}</strong><span>Aldeias aliadas ameaçadas</span></div>
                    <div><strong>${formatNumber(dashboard.rows.length)}</strong><span>Relações inimigo–alvo</span></div>
                    <div><strong>${formatNumber(dashboard.enemyPlayers)}</strong><span>Jogadores inimigos</span></div>
                    <div><strong>${formatNumber(dashboard.alliedPlayers)}</strong><span>Jogadores aliados</span></div>
                    <div><strong>${formatNumber(dashboard.enemyPoints)}</strong><span>Pontos inimigos únicos</span></div>
                </div>
                <div class="cbp-one-hour-continents">${dashboard.continents.map((item) => `<span><strong>${escapeHtml(item.continent)}</strong> ${formatNumber(item.enemies)} aldeia(s) · ${formatNumber(item.points)} pontos</span>`).join('')}</div>
                <div class="cbp-table-wrap cbp-one-hour-table"><table class="vis cbp-table"><thead><tr>
                    <th>Faixa</th><th>Continente inimigo</th><th>Coordenada inimiga</th><th>Aldeia inimiga</th><th>Pontos</th><th>Jogador inimigo</th><th>Tribo inimiga</th>
                    <th>Jogador aliado</th><th>Aldeia aliada</th><th>Coordenada aliada</th><th>Continente aliado</th><th>Status do blind</th><th>Distância</th><th>Tempo de nobre</th>
                </tr></thead><tbody>${dashboard.rows.map((row) => `<tr>
                    <td><strong>${escapeHtml(bucketLabel(row.bucket))}</strong></td><td><strong>${escapeHtml(row.enemyContinent)}</strong></td><td class="cbp-coordinate">${escapeHtml(row.enemy.coordinate)}</td><td>${escapeHtml(row.enemy.name || '-')}</td><td>${formatNumber(row.enemy.points)}</td><td>${escapeHtml(row.enemy.playerName || '-')}</td><td>${escapeHtml(row.enemyTribe?.tag || row.enemyTribe?.name || '-')}</td>
                    <td>${escapeHtml(row.allied.playerName || '-')}</td><td>${escapeHtml(row.allied.name || '-')}</td><td class="cbp-coordinate">${escapeHtml(row.allied.coordinate)}</td><td><strong>${escapeHtml(row.alliedContinent)}</strong></td><td>${escapeHtml(row.risk ? classificationLabel(row.risk.classification) : '-')}</td><td>${formatNumber(row.distance, 2)}</td><td><strong>${escapeHtml(formatDuration(row.minutes))}</strong></td>
                </tr>`).join('')}</tbody></table></div>` : `<div class="cbp-empty">Nenhuma relação de ameaça encontrada em ${escapeHtml(rangeLabel.toLowerCase())}.</div>`}
            </section>`;
        }

        function renderCoordinateReview() {
            if (state.analysisMode !== 'coordinates') return '';
            const withTroops = state.coordinateReview.filter((item) => item.troopRecord).length;
            const needs = state.coordinateReview.filter((item) => item.risk?.classification === 'needs').length;
            const outside = state.coordinateReview.filter((item) => !item.risk).length;
            const troopDetails = (item) => {
                if (!item.troopRecord) return '<span class="cbp-troop-missing">Sem coleta de tropas para esta aldeia.</span>';
                return TROOP_OVERVIEW_UNITS.map((unit) => {
                    const required = item.risk && DEFENSE_UNITS.some((defenseUnit) => defenseUnit.id === unit.id)
                        ? (Number(item.required?.[unit.id]) || 0)
                        : null;
                    const deficit = required === null ? 0 : (Number(item.deficits?.[unit.id]) || 0);
                    return `<span>
                        <b>${escapeHtml(unit.label)}</b>
                        <strong>${formatNumber(item.home?.[unit.id])}</strong>
                        <small>na aldeia · ${formatNumber(item.transit?.[unit.id])} fora${required === null ? '' : ` · mín. ${formatNumber(required)}${deficit > 0 ? ` · falta ${formatNumber(deficit)}` : ''}`}</small>
                    </span>`;
                }).join('');
            };
            return `<section class="cbp-coordinate-review">
                <div class="cbp-coordinate-review-header">
                    <div><h4>Alvos da OP por coordenadas</h4><small>Mostra o inimigo mais próximo e separa as tropas paradas na aldeia das tropas que estão fora.</small></div>
                    <div class="cbp-coordinate-review-actions">
                        <button type="button" class="btn" data-action="export-op-coordinates" ${state.coordinateReview.length ? '' : 'disabled'}>Exportar coordenadas</button>
                        <button type="button" class="btn btn-confirm-yes" data-action="export-op-data" ${state.coordinateReview.length ? '' : 'disabled'}>Exportar dados da OP</button>
                    </div>
                    <div class="cbp-coordinate-review-kpis">
                        <span><strong>${formatNumber(state.requestedCoordinates.length)}</strong> coladas</span>
                        <span><strong>${formatNumber(state.coordinateReview.length)}</strong> encontradas</span>
                        <span><strong>${formatNumber(withTroops)}</strong> com tropas</span>
                        <span><strong>${formatNumber(needs)}</strong> precisam blind</span>
                        <span><strong>${formatNumber(outside)}</strong> fora de 8h</span>
                        <span><strong>${formatNumber(state.missingRequestedCoordinates.length)}</strong> ignoradas</span>
                    </div>
                </div>
                ${state.missingRequestedCoordinates.length ? `<p class="cbp-coordinate-warning"><b>Não encontradas, bárbaras ou pertencentes às tribos inimigas:</b> ${escapeHtml(state.missingRequestedCoordinates.join(' · '))}</p>` : ''}
                ${state.coordinateReview.length ? `<div class="cbp-table-wrap"><table class="vis cbp-table">
                    <thead><tr><th>Coordenada</th><th>Aldeia</th><th>Jogador</th><th>Pontos</th><th>Continente</th><th>Faixa/status</th><th>Jogador inimigo</th><th>Tribo</th><th>Aldeia inimiga</th><th>Coord. inimiga</th><th>Pontos inimigos</th><th>Distância</th><th>Tempo de nobre</th><th>Tropas</th></tr></thead>
                    <tbody>${state.coordinateReview.map((item) => {
                        const nearest = item.nearestEnemy;
                        return `<tr class="cbp-row-${item.status}">
                        <td><a class="cbp-coordinate" href="${escapeHtml(villageLink(item.village))}" target="_blank">${escapeHtml(item.village.coordinate)}</a></td>
                        <td>${escapeHtml(item.village.name || '-')}</td>
                        <td>${escapeHtml(item.village.playerName || '-')}</td>
                        <td>${formatNumber(item.village.points)}</td>
                        <td><strong>${escapeHtml(villageContinent(item.village))}</strong></td>
                        <td><strong>${item.risk ? `${escapeHtml(bucketLabel(item.risk.bucket))} · ${escapeHtml(classificationLabel(item.risk.classification))}` : 'Acima de 8h'}</strong></td>
                        <td>${escapeHtml(nearest?.enemy?.playerName || '-')}</td>
                        <td>${escapeHtml(nearest?.tribe?.tag || nearest?.tribe?.name || '-')}</td>
                        <td>${escapeHtml(nearest?.enemy?.name || '-')}</td>
                        <td class="cbp-coordinate">${escapeHtml(nearest?.enemy?.coordinate || '-')}</td>
                        <td>${nearest ? formatNumber(nearest.enemy.points) : '-'}</td>
                        <td>${nearest ? formatNumber(nearest.distance, 2) : '-'}</td>
                        <td><strong>${nearest ? escapeHtml(formatDuration(nearest.minutes)) : '-'}</strong></td>
                        <td><details class="cbp-op-troops"><summary>${item.troopRecord ? 'Ver tropas' : 'Sem dados'}</summary><div>${troopDetails(item)}</div></details></td>
                    </tr>`;
                    }).join('')}</tbody>
                </table></div>` : '<div class="cbp-empty">Nenhuma coordenada válida foi encontrada.</div>'}
            </section>`;
        }

        function renderResults() {
            const panel = document.getElementById(SCRIPT_ID);
            const summary = panel.querySelector('.cbp-summary');
            const controls = panel.querySelector('.cbp-result-controls');
            const mapContainer = panel.querySelector('.cbp-map-section');
            const resultsContainer = panel.querySelector('.cbp-results');
            const totalAlliedVillages = new Set(state.results.map((item) => item.allied.id)).size;
            const needsCount = state.results.filter((item) => item.classification === 'needs').length;
            const defendedCount = state.results.filter((item) => item.classification === 'defended').length;
            const missingCount = state.results.filter((item) => item.classification === 'missing').length;
            const outOfPatternCount = state.outOfPatternBlinds.length;

            summary.hidden = false;
            summary.innerHTML = `
                <div><strong>${state.resolvedAllies.length}</strong><span>Tribos aliadas</span></div>
                <div><strong>${state.resolvedEnemies.length}</strong><span>Tribos inimigas</span></div>
                <div><strong>${formatNumber(totalAlliedVillages)}</strong><span>Aldeias em alcance</span></div>
                <div class="cbp-needs"><strong>${formatNumber(needsCount)}</strong><span>Precisam blind</span></div>
                <div class="cbp-defended"><strong>${formatNumber(defendedCount)}</strong><span>Defendidas/blindadas</span></div>
                <div class="cbp-missing"><strong>${formatNumber(missingCount)}</strong><span>Sem dados de tropas</span></div>
                <div class="cbp-overblind-summary"><strong>${formatNumber(outOfPatternCount)}</strong><span>Blinds fora da faixa</span></div>
                <div><strong>${formatNumber(state.detectedMinutesPerField, 2)}</strong><span>Minutos/campo do nobre</span></div>
                <div><strong>${state.selectedContinents.length ? escapeHtml(state.selectedContinents.join(', ')) : 'Todos'}</strong><span>Continentes aliados</span></div>
                <div><strong>${formatNumber(state.ignoredEnemyPlayers.size)}</strong><span>Nicks inimigos ignorados</span></div>`;

            controls.hidden = false;
            controls.querySelector('[data-action="result-filter"]').value = state.resultFilter;
            const savedAt = state.troopDataInfo.savedAt
                ? new Date(state.troopDataInfo.savedAt).toLocaleString('pt-BR')
                : 'não encontrado';
            controls.querySelector('.cbp-troop-storage-info').textContent = `${formatNumber(state.troopDataInfo.count)} aldeia(s) no storage de tropas · coleta: ${savedAt}`;
            mapContainer.hidden = false;
            mapContainer.innerHTML = renderRiskMap();

            state.buckets = new Map(HOUR_LIMITS.map((limit) => [limit, []]));
            state.results.forEach((risk) => state.buckets.get(risk.bucket).push(risk));

            resultsContainer.innerHTML = renderCoordinateReview() + renderThreatDashboard() + renderOutOfPatternBlinds() + HOUR_LIMITS.map((limit) => {
                const allRows = state.buckets.get(limit);
                const rows = visibleRisks(allRows);
                return `<section class="cbp-bucket">
                    <div class="cbp-bucket-header">
                        <h4>${bucketLabel(limit)} <span>${formatNumber(rows.length)} exibida(s) de ${formatNumber(allRows.length)}</span></h4>
                        <button type="button" class="btn" data-copy-bucket="${limit}" ${rows.length ? '' : 'disabled'}>Copiar coordenadas</button>
                    </div>
                    ${rows.length ? `<div class="cbp-table-wrap"><table class="vis cbp-table">
                        <thead><tr>
                            <th>Status</th>${DEFENSE_UNITS.map((unit) => `<th>${escapeHtml(unit.label)} atual/mín.</th>`).join('')}
                            <th>Tribo aliada</th><th>Jogador aliado</th><th>Aldeia aliada</th><th>Coordenada aliada</th><th>Continente</th>
                            <th>Inimigo mais próximo</th><th>Coordenada inimiga</th><th>Pontos inimigos</th><th>Distância</th><th>Tempo de nobre</th><th>Ameaças ≤8h</th>
                        </tr></thead>
                        <tbody>${rows.map((risk) => `<tr class="cbp-row-${risk.classification}">
                            <td><strong>${escapeHtml(classificationLabel(risk.classification))}</strong></td>
                            ${DEFENSE_UNITS.map((unit) => {
                                const required = Number(risk.required?.[unit.id]) || 0;
                                if (!risk.troopRecord) return `<td class="cbp-troop-missing">— / ${formatNumber(required)}</td>`;
                                const actual = Number(risk.actual?.[unit.id]) || 0;
                                const deficit = Number(risk.deficits?.[unit.id]) || 0;
                                const outside = Number(risk.outside?.[unit.id]) || 0;
                                return `<td class="${deficit > 0 ? 'cbp-troop-deficit' : 'cbp-troop-ok'}" title="${escapeHtml(unit.label)}: somente tropas paradas na aldeia contam">
                                    ${formatNumber(actual)} / ${formatNumber(required)}${deficit > 0 ? `<small>falta ${formatNumber(deficit)}</small>` : ''}${outside > 0 ? `<small>${formatNumber(outside)} fora (não conta)</small>` : ''}
                                </td>`;
                            }).join('')}
                            <td>${escapeHtml(risk.alliedTribe?.tag || risk.alliedTribe?.name || '-')}</td>
                            <td>${escapeHtml(risk.allied.playerName)}</td>
                            <td><a href="${escapeHtml(villageLink(risk.allied))}" target="_blank">${escapeHtml(risk.allied.name)}</a></td>
                            <td class="cbp-coordinate">${escapeHtml(risk.allied.coordinate)}</td>
                            <td><strong>${escapeHtml(villageContinent(risk.allied))}</strong></td>
                            <td>${escapeHtml(risk.enemyTribe?.tag || '-')}: ${escapeHtml(risk.enemy.playerName)}</td>
                            <td class="cbp-coordinate">${escapeHtml(risk.enemy.coordinate)}</td>
                            <td>${formatNumber(risk.enemy.points)}</td>
                            <td>${formatNumber(risk.distance, 2)}</td>
                            <td><strong>${formatDuration(risk.minutes)}</strong></td>
                            <td>${formatNumber(risk.threatCount)}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>` : '<div class="cbp-empty">Nenhuma aldeia nesta faixa para o filtro selecionado.</div>'}
                </section>`;
            }).join('');
        }

        function setRunning(running) {
            state.running = running;
            const panel = document.getElementById(SCRIPT_ID);
            panel.querySelector('[data-action="analyze"]').disabled = running;
            panel.querySelector('[data-action="cancel"]').hidden = !running;
            panel.querySelector('[data-action="export"]').disabled = running || !state.results.length;
            panel.querySelector('[data-action="forum-export"]').disabled = running || !state.results.some((risk) => risk.classification === 'needs');
            panel.querySelectorAll('[data-action^="export-threat"]').forEach((button) => {
                button.disabled = running || !state.threatRelations.length;
            });
            panel.querySelectorAll('[data-action^="export-op"]').forEach((button) => {
                button.disabled = running || !state.coordinateReview.length;
            });
            panel.querySelectorAll('input, textarea').forEach((element) => {
                element.disabled = running;
            });
            panel.querySelectorAll('[data-analysis-mode]').forEach((button) => {
                button.disabled = running;
            });
        }

        async function analyze() {
            if (state.running) return;
            const panel = document.getElementById(SCRIPT_ID);
            const analysisMode = panel.dataset.analysisMode === 'coordinates' ? 'coordinates' : 'tribes';
            const alliedInput = panel.querySelector('[name="allied_tribes"]').value;
            const enemyInput = panel.querySelector('[name="enemy_tribes"]').value;
            const continentInput = panel.querySelector('[name="continents"]').value;
            const coordinateInput = panel.querySelector('[name="manual_coordinates"]').value;
            const coordinateSelectionLabel = panel.querySelector('[name="coordinate_label"]').value.trim();
            const ignoredEnemyInput = panel.querySelector('[name="ignored_enemy_players"]').value;
            const ignoredEnemyPlayers = parsePlayerList(ignoredEnemyInput);
            const continentResolution = parseContinentInput(continentInput);
            const manualMinutes = Number.parseFloat(panel.querySelector('[name="noble_minutes"]').value);
            const minEnemyPointsInput = Number.parseInt(panel.querySelector('[name="min_enemy_points"]').value, 10);
            const minEnemyPoints = Number.isFinite(minEnemyPointsInput) && minEnemyPointsInput >= 0
                ? minEnemyPointsInput
                : DEFAULT_MIN_ENEMY_POINTS;
            const thresholds = readThresholds(panel);
            const requestedAllies = splitTribeInput(alliedInput);
            const requestedEnemies = splitTribeInput(enemyInput);
            const requestedCoordinates = parseCoordinateInput(coordinateInput);

            if (!requestedEnemies.length || (analysisMode === 'tribes' && !requestedAllies.length)) {
                notify(analysisMode === 'coordinates'
                    ? 'Informe ao menos uma tribo inimiga.'
                    : 'Informe ao menos uma tribo aliada e uma tribo inimiga.', 'error');
                return;
            }
            if (analysisMode === 'coordinates' && !requestedCoordinates.length) {
                notify('Cole ao menos uma coordenada aliada para analisar.', 'error');
                return;
            }
            if (requestedCoordinates.length > 1000) {
                notify('O limite da análise manual é de 1.000 coordenadas por vez.', 'error');
                return;
            }
            if (analysisMode === 'tribes' && continentResolution.invalid.length) {
                notify(`Continente(s) inválido(s): ${continentResolution.invalid.join(', ')}. Use, por exemplo, K54; K64.`, 'error');
                return;
            }

            state.analysisMode = analysisMode;
            state.thresholds = thresholds;
            state.minEnemyPoints = minEnemyPoints;
            state.selectedContinents = analysisMode === 'tribes' ? [...continentResolution.continents].sort() : [];
            state.ignoredEnemyPlayers = ignoredEnemyPlayers;
            state.requestedCoordinates = requestedCoordinates;
            state.missingRequestedCoordinates = [];
            state.coordinateReview = [];
            state.coordinateSelectionLabel = analysisMode === 'coordinates' ? coordinateSelectionLabel : '';
            state.threatRelations = [];
            state.worldVillages = [];
            saveConfig({ analysisMode, alliedInput, enemyInput, continentInput, coordinateInput, coordinateSelectionLabel, ignoredEnemyInput, manualMinutes: Number.isFinite(manualMinutes) ? manualMinutes : '', minEnemyPoints, thresholds });
            state.abortController = new AbortController();
            setRunning(true);
            setStatus('Baixando dados públicos do mundo...');

            try {
                const signal = state.abortController.signal;
                const [allyText, playerText, villageText, configText, unitText] = await Promise.all([
                    fetchText('/map/ally.txt', signal),
                    fetchText('/map/player.txt', signal),
                    fetchText('/map/village.txt', signal),
                    fetchOptionalText('/interface.php?func=get_config', signal),
                    fetchOptionalText('/interface.php?func=get_unit_info', signal)
                ]);

                setStatus('Processando tribos, jogadores e aldeias...');
                await new Promise((resolve) => window.setTimeout(resolve, 0));
                const allies = parseAllies(allyText);
                const players = parsePlayers(playerText);
                const alliedResolution = resolveTribes(requestedAllies, allies);
                const enemyResolution = resolveTribes(requestedEnemies, allies);

                const missing = [
                    ...(analysisMode === 'tribes' ? alliedResolution.missing.map((name) => `aliada: ${name}`) : []),
                    ...enemyResolution.missing.map((name) => `inimiga: ${name}`)
                ];
                if (missing.length) throw new Error(`Tribos não encontradas: ${missing.join('; ')}`);

                const alliedIds = new Set((analysisMode === 'tribes' ? alliedResolution.found : []).map((ally) => ally.id));
                const enemyIds = new Set(enemyResolution.found.map((ally) => ally.id));
                const overlap = [...alliedIds].filter((id) => enemyIds.has(id));
                if (overlap.length) throw new Error('A mesma tribo não pode estar nas listas de aliadas e inimigas.');

                const villages = parseRelevantVillages(villageText, players, alliedIds, enemyIds);
                state.worldVillages = villages.all;
                if (analysisMode === 'tribes' && !villages.allied.length) throw new Error('Nenhuma aldeia das tribos aliadas foi encontrada.');
                if (!villages.enemy.length) throw new Error('Nenhuma aldeia das tribos inimigas foi encontrada.');
                const requestedCoordinateSet = new Set(requestedCoordinates);
                const eligibleAlliedVillages = analysisMode === 'coordinates'
                    ? villages.all.filter((village) => requestedCoordinateSet.has(village.coordinate)
                        && village.playerId
                        && !enemyIds.has(village.allyId))
                    : state.selectedContinents.length
                        ? villages.allied.filter((village) => continentResolution.continents.has(villageContinent(village)))
                        : villages.allied;
                if (!eligibleAlliedVillages.length) {
                    throw new Error(analysisMode === 'coordinates'
                        ? 'Nenhuma das coordenadas coladas corresponde a uma aldeia aliada válida.'
                        : `Nenhuma aldeia aliada foi encontrada em ${state.selectedContinents.join(', ')}.`);
                }
                if (analysisMode === 'coordinates') {
                    const foundCoordinates = new Set(eligibleAlliedVillages.map((village) => village.coordinate));
                    state.missingRequestedCoordinates = requestedCoordinates.filter((coordinate) => !foundCoordinates.has(coordinate));
                    state.selectedContinents = [...new Set(eligibleAlliedVillages.map(villageContinent))].sort();
                }
                const ignoredEnemyVillageCount = villages.enemy.filter((village) => ignoredEnemyPlayers.has(normalizeName(village.playerName))).length;
                const eligibleEnemyVillages = villages.enemy.filter((village) => (
                    village.points > minEnemyPoints
                    && !ignoredEnemyPlayers.has(normalizeName(village.playerName))
                ));
                if (!eligibleEnemyVillages.length) {
                    throw new Error(`Nenhuma aldeia inimiga válida restou após aplicar o mínimo de ${formatNumber(minEnemyPoints)} pontos e os nicks ignorados.`);
                }

                let speedInfo;
                try {
                    speedInfo = detectNobleMinutes(configText, unitText);
                } catch (error) {
                    console.warn('[Blind Preventivo] Não foi possível detectar a velocidade:', error);
                    speedInfo = { minutesPerField: 35, worldSpeed: 1, unitSpeed: 1, nobleBaseMinutes: 35 };
                }
                const minutesPerField = Number.isFinite(manualMinutes) && manualMinutes > 0
                    ? manualMinutes
                    : speedInfo.minutesPerField;

                state.detectedMinutesPerField = minutesPerField;
                state.resolvedAllies = analysisMode === 'coordinates'
                    ? [...new Set(eligibleAlliedVillages.map((village) => village.allyId))]
                        .map((allyId) => allies.get(allyId))
                        .filter(Boolean)
                    : alliedResolution.found;
                state.resolvedEnemies = enemyResolution.found;
                state.enemyVillages = eligibleEnemyVillages;
                state.tribeIndex = allies;
                const continentStatus = state.selectedContinents.length ? ` em ${state.selectedContinents.join(', ')}` : ' em todos os continentes';
                setStatus(`Calculando alcance entre ${formatNumber(eligibleAlliedVillages.length)} aldeias aliadas${continentStatus} e ${formatNumber(eligibleEnemyVillages.length)} inimigas válidas (${formatNumber(ignoredEnemyVillageCount)} aldeia(s) ignorada(s) por nick)...`);
                await new Promise((resolve) => window.setTimeout(resolve, 0));
                const troopData = loadTroopIndex();
                state.troopDataInfo = { count: troopData.count, savedAt: troopData.savedAt };
                if (!troopData.count) state.resultFilter = 'missing';
                const riskCalculation = calculateRisks(eligibleAlliedVillages, eligibleEnemyVillages, minutesPerField, allies);
                state.mapEnemies = riskCalculation.threateningEnemies;
                state.threatRelations = riskCalculation.threatRelations;
                state.results = classifyRisks(
                    riskCalculation.risks,
                    troopData.index,
                    thresholds
                );
                state.coordinateReview = analysisMode === 'coordinates'
                    ? buildCoordinateReview(eligibleAlliedVillages, state.results, troopData.index, eligibleEnemyVillages, minutesPerField, allies)
                    : [];
                state.outOfPatternBlinds = analysisMode === 'coordinates' ? [] : calculateOutOfPatternBlinds(
                    eligibleAlliedVillages,
                    state.results,
                    troopData.index,
                    thresholds
                );
                const distributionSnapshot = saveDistributionSnapshot();
                renderResults();
                const needsCount = state.results.filter((risk) => risk.classification === 'needs').length;
                const defendedCount = state.results.filter((risk) => risk.classification === 'defended').length;
                const missingCount = state.results.filter((risk) => risk.classification === 'missing').length;
                const coordinateSummary = analysisMode === 'coordinates'
                    ? ` · ${formatNumber(state.coordinateReview.length)} coordenada(s) analisada(s) · ${formatNumber(state.missingRequestedCoordinates.length)} ignorada(s)`
                    : '';
                const summary = `${formatNumber(needsCount)} precisam blind · ${formatNumber(defendedCount)} defendidas · ${formatNumber(state.outOfPatternBlinds.length)} blinds fora da faixa · ${formatNumber(missingCount)} sem dados${coordinateSummary} · continentes: ${state.selectedContinents.join(', ') || 'todos'} · ${formatNumber(ignoredEnemyVillageCount)} aldeia(s) inimiga(s) ignorada(s) por nick.`;
                if (distributionSnapshot.saved) {
                    setStatus(`${summary} Resultado salvo para o Distribuidor de Apoios.`, 'success');
                    notify('Análise de blind preventivo concluída e salva para distribuição.');
                } else {
                    setStatus(`${summary} ATENÇÃO: a análise foi calculada, mas o navegador não conseguiu salvá-la para o Distribuidor. Libere espaço no armazenamento do site e tente novamente.`, 'error');
                    notify('A análise foi concluída, mas não pôde ser salva para o Distribuidor.', 'error');
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    setStatus('Análise cancelada.', 'warning');
                } else {
                    console.error('[Blind Preventivo] Erro:', error);
                    setStatus(error.message || 'Falha ao analisar.', 'error');
                    notify(error.message || 'Falha ao analisar.', 'error');
                }
            } finally {
                state.abortController = null;
                setRunning(false);
            }
        }

        function cancelAnalysis() {
            state.abortController?.abort();
        }

        async function copyText(text, message) {
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
                else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    textarea.remove();
                }
                notify(message);
            } catch (_error) {
                notify('Não foi possível copiar as coordenadas.', 'error');
            }
        }

        function copyBucket(limit) {
            const coordinates = [...new Set(visibleRisks(state.buckets.get(Number(limit)) || []).map((risk) => risk.allied.coordinate))];
            if (coordinates.length) copyText(coordinates.join(' '), `${coordinates.length} coordenada(s) aliada(s) copiada(s).`);
        }

        function csvCell(value) {
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
        }

        function downloadContent(content, filename, type) {
            const blob = new Blob([content], { type });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        function exportThreatCoordinates() {
            const dashboard = threatDashboardData();
            const rangeLabel = threatRangeLabel();
            const coordinates = dashboard.enemies
                .sort((a, b) => villageContinent(a).localeCompare(villageContinent(b), 'pt-BR', { numeric: true })
                    || a.coordinate.localeCompare(b.coordinate))
                .map((enemy) => enemy.coordinate);
            if (!coordinates.length) {
                notify(`Nenhuma coordenada inimiga em ${rangeLabel.toLowerCase()} para exportar.`, 'error');
                return;
            }
            downloadContent(
                coordinates.join('\r\n'),
                `inimigos-${threatRangeSlug()}-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.txt`,
                'text/plain;charset=utf-8'
            );
            notify(`${coordinates.length} coordenada(s) inimiga(s) única(s) de ${rangeLabel.toLowerCase()} exportada(s).`);
        }

        function exportThreatData() {
            const dashboard = threatDashboardData();
            const rangeLabel = threatRangeLabel();
            if (!dashboard.rows.length) {
                notify(`Nenhuma relação de ameaça em ${rangeLabel.toLowerCase()} para exportar.`, 'error');
                return;
            }
            const headers = [
                'Faixa do nobre', 'Continente inimigo', 'Coordenada inimiga', 'Aldeia inimiga', 'Pontos inimigos', 'Jogador inimigo', 'Tribo inimiga',
                'Jogador aliado', 'Aldeia aliada', 'Coordenada aliada', 'Continente aliado', 'Pontos aliados', 'Status do blind',
                'Distância em campos', 'Tempo de nobre em minutos', 'Tempo de nobre'
            ];
            const lines = [headers.map(csvCell).join(';')];
            dashboard.rows.forEach((row) => {
                lines.push([
                    bucketLabel(row.bucket), row.enemyContinent, row.enemy.coordinate, row.enemy.name, row.enemy.points, row.enemy.playerName,
                    row.enemyTribe?.tag || row.enemyTribe?.name || '', row.allied.playerName, row.allied.name,
                    row.allied.coordinate, row.alliedContinent, row.allied.points,
                    row.risk ? classificationLabel(row.risk.classification) : '',
                    Number(row.distance).toFixed(2), Math.round(row.minutes), formatDuration(row.minutes)
                ].map(csvCell).join(';'));
            });
            downloadContent(
                `\uFEFF${lines.join('\r\n')}`,
                `ameacas-${threatRangeSlug()}-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.csv`,
                'text/csv;charset=utf-8'
            );
            notify(`${dashboard.rows.length} relação(ões) inimigo–alvo de ${rangeLabel.toLowerCase()} exportada(s).`);
        }

        function exportOperationCoordinates() {
            const coordinates = state.coordinateReview.map((item) => item.village.coordinate);
            if (!coordinates.length) {
                notify('Nenhum alvo da OP para exportar.', 'error');
                return;
            }
            downloadContent(
                coordinates.join('\r\n'),
                `alvos-op-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.txt`,
                'text/plain;charset=utf-8'
            );
            notify(`${coordinates.length} coordenada(s) dos alvos da OP exportada(s).`);
        }

        function exportOperationData() {
            if (!state.coordinateReview.length) {
                notify('Nenhum alvo da OP para exportar.', 'error');
                return;
            }
            const headers = [
                'Coordenada alvo', 'Aldeia alvo', 'Jogador alvo', 'Pontos alvo', 'Continente alvo', 'Faixa do nobre', 'Status do blind',
                'Jogador inimigo mais próximo', 'Tribo inimiga', 'Aldeia inimiga', 'Coordenada inimiga', 'Pontos inimigos',
                'Distância em campos', 'Tempo de nobre em minutos', 'Tempo de nobre'
            ];
            TROOP_OVERVIEW_UNITS.forEach((unit) => {
                headers.push(`${unit.label} na aldeia`, `${unit.label} fora`);
            });
            const lines = [headers.map(csvCell).join(';')];
            state.coordinateReview.forEach((item) => {
                const nearest = item.nearestEnemy;
                const row = [
                    item.village.coordinate, item.village.name, item.village.playerName, item.village.points, villageContinent(item.village),
                    item.risk ? bucketLabel(item.risk.bucket) : 'Acima de 8h', item.risk ? classificationLabel(item.risk.classification) : 'Fora da faixa do blind',
                    nearest?.enemy?.playerName || '', nearest?.tribe?.tag || nearest?.tribe?.name || '', nearest?.enemy?.name || '',
                    nearest?.enemy?.coordinate || '', nearest?.enemy?.points || '', nearest ? Number(nearest.distance).toFixed(2) : '',
                    nearest ? Math.round(nearest.minutes) : '', nearest ? formatDuration(nearest.minutes) : ''
                ];
                TROOP_OVERVIEW_UNITS.forEach((unit) => {
                    row.push(item.troopRecord ? (Number(item.home?.[unit.id]) || 0) : '', item.troopRecord ? (Number(item.transit?.[unit.id]) || 0) : '');
                });
                lines.push(row.map(csvCell).join(';'));
            });
            downloadContent(
                `\uFEFF${lines.join('\r\n')}`,
                `dados-alvos-op-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.csv`,
                'text/csv;charset=utf-8'
            );
            notify(`${state.coordinateReview.length} alvo(s) da OP exportado(s) com tempos e tropas.`);
        }

        function exportCsv() {
            if (!state.results.length) return;
            const headers = [
                'Faixa', 'Status',
                'Lanceiros atuais', 'Lanceiros mínimos', 'Déficit de lanceiros',
                'Espadachins atuais', 'Espadachins mínimos', 'Déficit de espadachins',
                'Exploradores atuais', 'Exploradores mínimos', 'Déficit de exploradores',
                'Cavalaria pesada atual', 'Cavalaria pesada mínima', 'Déficit de cavalaria pesada',
                'Tribo aliada', 'Jogador aliado', 'Aldeia aliada', 'Coordenada aliada', 'Continente aliado', 'Pontos aliados',
                'Tribo inimiga', 'Jogador inimigo', 'Aldeia inimiga', 'Coordenada inimiga', 'Pontos inimigos',
                'Distância', 'Tempo de nobre', 'Ameaças até 8h'
            ];
            const lines = [headers.map(csvCell).join(';')];
            state.results.forEach((risk) => {
                lines.push([
                    bucketLabel(risk.bucket), classificationLabel(risk.classification),
                    risk.troopRecord ? risk.actual.spear : '', risk.required.spear, risk.troopRecord ? risk.deficits.spear : '',
                    risk.troopRecord ? risk.actual.sword : '', risk.required.sword, risk.troopRecord ? risk.deficits.sword : '',
                    risk.troopRecord ? risk.actual.spy : '', risk.required.spy, risk.troopRecord ? risk.deficits.spy : '',
                    risk.troopRecord ? risk.actual.heavy : '', risk.required.heavy, risk.troopRecord ? risk.deficits.heavy : '',
                    risk.alliedTribe?.tag || '', risk.allied.playerName, risk.allied.name,
                    risk.allied.coordinate, villageContinent(risk.allied), risk.allied.points, risk.enemyTribe?.tag || '', risk.enemy.playerName,
                    risk.enemy.name, risk.enemy.coordinate, risk.enemy.points, formatNumber(risk.distance, 2), formatDuration(risk.minutes), risk.threatCount
                ].map(csvCell).join(';'));
            });
            const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `blind-preventivo-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        function buildForumBlindRequest() {
            const needs = state.results
                .filter((risk) => risk.classification === 'needs')
                .sort((a, b) => a.hours - b.hours || a.allied.coordinate.localeCompare(b.allied.coordinate));
            const lines = [
                '[table]',
                '[**] PEDIDO [||] ALDEIA [||] [unit]spear[/unit] [||] [unit]sword[/unit] [||] [unit]spy[/unit] [||] [unit]heavy[/unit] [||] :shield: [/**]'
            ];

            needs.forEach((risk, index) => {
                const unitCells = DEFENSE_UNITS.map((unit) => {
                    const deficit = Math.max(0, Math.ceil(Number(risk.deficits?.[unit.id]) || 0));
                    const color = deficit > 0 ? '#ff0000' : '#008000';
                    return `[color=${color}]${deficit}[/color]`;
                });
                lines.push(
                    `[*]${String(index + 1).padStart(2, '0')} [|] [coord]${risk.allied.coordinate}[/coord] [|] ${unitCells.join(' [|] ')} [|] :red_circle:`
                );
            });
            lines.push('[/table]');
            return lines.join('\n');
        }

        function downloadForumRequest(text) {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `pedido-blind-${window.game_data?.world || 'mundo'}-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        function openForumExport() {
            const needsCount = state.results.filter((risk) => risk.classification === 'needs').length;
            if (!needsCount) {
                notify('Nenhuma aldeia classificada como “Precisa blind”.', 'error');
                return;
            }

            document.getElementById(`${SCRIPT_ID}-forum-modal`)?.remove();
            const text = buildForumBlindRequest();
            const modal = document.createElement('div');
            modal.id = `${SCRIPT_ID}-forum-modal`;
            modal.className = 'cbp-modal-overlay';
            modal.innerHTML = `
                <div class="cbp-modal">
                    <div class="cbp-modal-header"><strong>Pedido de blind para o fórum</strong><button type="button" data-modal-action="close">×</button></div>
                    <p>Revise o BBCode abaixo. Ele contém somente os déficits das aldeias que precisam de blind.</p>
                    <textarea class="cbp-forum-preview" spellcheck="false"></textarea>
                    <div class="cbp-modal-actions">
                        <button type="button" class="btn btn-confirm-yes" data-modal-action="copy">Copiar BBCode</button>
                        <button type="button" class="btn" data-modal-action="download">Baixar TXT</button>
                        <button type="button" class="btn" data-modal-action="close">Fechar</button>
                    </div>
                </div>`;
            modal.querySelector('.cbp-forum-preview').value = text;
            modal.addEventListener('click', (event) => {
                const action = event.target.closest('[data-modal-action]')?.dataset.modalAction;
                const currentText = modal.querySelector('.cbp-forum-preview').value;
                if (action === 'copy') copyText(currentText, 'Pedido de blind copiado em BBCode.');
                if (action === 'download') downloadForumRequest(currentText);
                if (action === 'close' || event.target === modal) modal.remove();
            });
            document.body.appendChild(modal);
        }

        function addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID} { margin: 10px 0 16px; border: 1px solid #804000; background: #f4e4bc; color: #2b1a0a; box-shadow: 0 2px 7px rgba(0,0,0,.3); }
                #${SCRIPT_ID} .cbp-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 12px; background: linear-gradient(#b7864d,#7a421d); color: #fff4d2; }
                #${SCRIPT_ID} h3, #${SCRIPT_ID} h4 { margin: 0; }
                #${SCRIPT_ID} .cbp-header p { margin: 3px 0 0; font-size: 10px; }
                #${SCRIPT_ID} .cbp-actions { display: flex; gap: 5px; flex-wrap: wrap; }
                #${SCRIPT_ID} .cbp-mode-tabs { display: flex; gap: 5px; padding: 9px 12px 0; }
                #${SCRIPT_ID} .cbp-mode-tabs button { padding: 7px 12px; border: 1px solid #9b713c; background: #ead4a0; color: #513317; font-weight: bold; cursor: pointer; }
                #${SCRIPT_ID} .cbp-mode-tabs button.is-active { border-color: #6f3b13; background: #8a4c24; color: #fff4d2; }
                #${SCRIPT_ID} .cbp-form { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; padding: 10px 12px 6px; }
                #${SCRIPT_ID} .cbp-mode-panel[hidden] { display: none !important; }
                #${SCRIPT_ID} .cbp-mode-panel { grid-column: 1 / -1; }
                #${SCRIPT_ID} .cbp-tribe-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
                #${SCRIPT_ID} .cbp-coordinate-mode { padding: 9px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-coordinate-mode label { display: flex; margin-bottom: 7px; }
                #${SCRIPT_ID} .cbp-coordinate-mode input { width: 100%; }
                #${SCRIPT_ID} .cbp-coordinate-mode textarea { min-height: 105px; margin-top: 5px; font: 12px Consolas, monospace; }
                #${SCRIPT_ID} .cbp-coordinate-mode p { margin: 6px 0 0; color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .cbp-form label { display: flex; flex-direction: column; gap: 4px; font-weight: bold; }
                #${SCRIPT_ID} textarea { min-height: 54px; resize: vertical; box-sizing: border-box; width: 100%; }
                #${SCRIPT_ID} input, #${SCRIPT_ID} textarea { padding: 5px; border: 1px solid #9b713c; background: #fff9e8; }
                #${SCRIPT_ID} .cbp-continent-filter { grid-column: 1 / -1; max-width: 430px; }
                #${SCRIPT_ID} .cbp-thresholds { grid-column: 1 / -1; padding: 8px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-thresholds > strong, #${SCRIPT_ID} .cbp-thresholds > span { display: block; }
                #${SCRIPT_ID} .cbp-thresholds > span { margin: 3px 0 7px; color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .cbp-threshold-table-wrap { overflow-x: auto; }
                #${SCRIPT_ID} .cbp-threshold-table { width: 100%; margin: 0; }
                #${SCRIPT_ID} .cbp-threshold-table th, #${SCRIPT_ID} .cbp-threshold-table td { text-align: center; }
                #${SCRIPT_ID} .cbp-threshold-table input { width: 110px; box-sizing: border-box; text-align: right; }
                #${SCRIPT_ID} details { grid-column: 1 / -1; }
                #${SCRIPT_ID} details label { max-width: 260px; margin-top: 6px; }
                #${SCRIPT_ID} .cbp-status { display: block; margin: 4px 12px 10px; padding: 7px 9px; border: 1px solid #c5a46b; background: #fff8df; }
                #${SCRIPT_ID} .cbp-status[data-type="success"] { border-color: #4a8c2a; color: #32621e; }
                #${SCRIPT_ID} .cbp-status[data-type="error"] { border-color: #b5362e; color: #971d15; }
                #${SCRIPT_ID} .cbp-status[data-type="warning"] { border-color: #c48718; color: #80510b; }
                #${SCRIPT_ID} .cbp-summary { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 7px; padding: 0 12px 10px; }
                #${SCRIPT_ID} .cbp-summary > div { display: flex; align-items: baseline; gap: 6px; padding: 7px; border: 1px solid #c5a46b; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-summary strong { font-size: 16px; }
                #${SCRIPT_ID} .cbp-summary span { color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .cbp-needs { border-color: #c45a2c !important; }
                #${SCRIPT_ID} .cbp-defended { border-color: #4a8c2a !important; }
                #${SCRIPT_ID} .cbp-missing { border-color: #94712e !important; }
                #${SCRIPT_ID} .cbp-overblind-summary { border-color: #8e44ad !important; }
                #${SCRIPT_ID} .cbp-coordinate-review { margin: 0 12px 10px; border: 2px solid #2f6e9f; background: #eaf6ff; }
                #${SCRIPT_ID} .cbp-coordinate-review-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 9px; background: #9bc7e7; }
                #${SCRIPT_ID} .cbp-coordinate-review-header small { display: block; margin-top: 2px; color: #274e6b; }
                #${SCRIPT_ID} .cbp-coordinate-review-actions { display: flex; flex-wrap: wrap; gap: 5px; }
                #${SCRIPT_ID} .cbp-coordinate-review-kpis { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
                #${SCRIPT_ID} .cbp-coordinate-review-kpis span { padding: 4px 7px; border: 1px solid #5f98bf; border-radius: 10px; background: #f4fbff; font-size: 9px; }
                #${SCRIPT_ID} .cbp-coordinate-warning { margin: 0; padding: 7px 9px; border-bottom: 1px solid #7ba9c8; color: #8f2118; font-size: 10px; }
                #${SCRIPT_ID} .cbp-op-troops summary { color: #245b80; font-weight: bold; cursor: pointer; }
                #${SCRIPT_ID} .cbp-op-troops > div { width: 590px; display: grid; grid-template-columns: repeat(4,minmax(125px,1fr)); gap: 4px; padding: 6px 0; white-space: normal; }
                #${SCRIPT_ID} .cbp-op-troops span { display: grid; padding: 4px 6px; border: 1px solid #8eb9d7; background: #f7fcff; }
                #${SCRIPT_ID} .cbp-op-troops span strong { color: #173f5b; font-size: 13px; }
                #${SCRIPT_ID} .cbp-op-troops span small { color: #58758a; }
                #${SCRIPT_ID} .cbp-result-controls { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin: 0 12px 10px; padding: 7px 9px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-result-controls label { display: flex; align-items: center; gap: 6px; font-weight: bold; }
                #${SCRIPT_ID} .cbp-result-controls select { min-width: 190px; }
                #${SCRIPT_ID} .cbp-troop-storage-info { color: #6b5433; font-size: 10px; }
                #${SCRIPT_ID} .cbp-map-card { margin: 0 12px 10px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-map-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 9px; background: #d6b477; }
                #${SCRIPT_ID} .cbp-map-heading small { display: block; margin-top: 2px; color: #6b421d; }
                #${SCRIPT_ID} .cbp-map-heading > span { font-size: 10px; font-weight: bold; }
                #${SCRIPT_ID} .cbp-map-legend { display: flex; flex-wrap: wrap; gap: 10px; padding: 6px 9px; border-bottom: 1px solid #d3b779; font-size: 10px; }
                #${SCRIPT_ID} .cbp-map-legend span { display: inline-flex; align-items: center; gap: 4px; }
                #${SCRIPT_ID} .cbp-map-legend i { width: 10px; height: 10px; display: inline-block; border: 1px solid rgba(0,0,0,.55); border-radius: 50%; }
                #${SCRIPT_ID} .cbp-legend-enemy { background: #7f1d1d; }
                #${SCRIPT_ID} .cbp-legend-defended { background: #16853a; }
                #${SCRIPT_ID} .cbp-legend-needs { background: #e1482d; }
                #${SCRIPT_ID} .cbp-legend-missing { background: #7c8492; }
                #${SCRIPT_ID} .cbp-legend-overblind { background: transparent; border: 2px solid #8e44ad !important; }
                #${SCRIPT_ID} .cbp-legend-neutral { background: #928d7f; }
                #${SCRIPT_ID} .cbp-legend-continent { width: 18px !important; height: 0 !important; border: 0 !important; border-top: 3px solid #513a1c !important; border-radius: 0 !important; }
                #${SCRIPT_ID} .cbp-legend-line { width: 18px !important; height: 0 !important; border: 0 !important; border-top: 2px dashed #81592c !important; border-radius: 0 !important; }
                #${SCRIPT_ID} .cbp-map-wrap { height: 460px; min-height: 300px; overflow: hidden; background: #e5d29e; }
                #${SCRIPT_ID} .cbp-risk-map { width: 100%; height: 100%; display: block; }
                #${SCRIPT_ID} .cbp-map-grid line { stroke: #9f875b; stroke-width: .12; vector-effect: non-scaling-stroke; opacity: .35; }
                #${SCRIPT_ID} .cbp-map-continent-lines line { stroke: #513a1c; stroke-width: 1.6; vector-effect: non-scaling-stroke; opacity: .78; }
                #${SCRIPT_ID} .cbp-map-continent-labels text { fill: #513a1c; font-weight: 800; opacity: .72; pointer-events: none; paint-order: stroke; stroke: #f3dfaa; stroke-width: .8; stroke-linejoin: round; }
                #${SCRIPT_ID} .cbp-map-neutral { fill: #928d7f; opacity: .58; stroke: #e8dbb8; stroke-width: .1; vector-effect: non-scaling-stroke; }
                #${SCRIPT_ID} .cbp-map-neutral:hover { fill: #4e4a42; opacity: 1; }
                #${SCRIPT_ID} .cbp-map-connection { stroke: #81592c; stroke-dasharray: .9 .65; vector-effect: non-scaling-stroke; opacity: .3; }
                #${SCRIPT_ID} .cbp-map-dot { stroke: #fff8df; stroke-width: .22; vector-effect: non-scaling-stroke; cursor: pointer; }
                #${SCRIPT_ID} .cbp-map-dot:hover { stroke: #111; stroke-width: .6; }
                #${SCRIPT_ID} .cbp-map-enemy { fill: #7f1d1d; }
                #${SCRIPT_ID} .cbp-map-defended { fill: #16853a; }
                #${SCRIPT_ID} .cbp-map-needs { fill: #e1482d; }
                #${SCRIPT_ID} .cbp-map-missing { fill: #7c8492; }
                #${SCRIPT_ID} .cbp-map-overblind { fill: none; stroke: #8e44ad; stroke-width: .65; vector-effect: non-scaling-stroke; cursor: pointer; }
                #${SCRIPT_ID} .cbp-map-overblind:hover { stroke: #4b1764; stroke-width: 1; }
                #${SCRIPT_ID} .cbp-one-hour { margin: 0 12px 10px; border: 2px solid #a92b20; background: #fff0dc; }
                #${SCRIPT_ID} .cbp-one-hour-header { display: flex; justify-content: space-between; align-items: center; gap: 9px; padding: 8px 9px; background: linear-gradient(#efb56f,#dc8648); }
                #${SCRIPT_ID} .cbp-one-hour-header small { display: block; margin-top: 2px; color: #643215; }
                #${SCRIPT_ID} .cbp-one-hour-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
                #${SCRIPT_ID} .cbp-one-hour-actions label { display: flex; align-items: center; gap: 4px; font-weight: bold; }
                #${SCRIPT_ID} .cbp-one-hour-actions select { min-width: 155px; }
                #${SCRIPT_ID} .cbp-one-hour-kpis { display: grid; grid-template-columns: repeat(6,minmax(120px,1fr)); gap: 6px; padding: 8px; }
                #${SCRIPT_ID} .cbp-one-hour-kpis > div { padding: 7px; border: 1px solid #d59a56; background: #fff9eb; }
                #${SCRIPT_ID} .cbp-one-hour-kpis strong, #${SCRIPT_ID} .cbp-one-hour-kpis span { display: block; }
                #${SCRIPT_ID} .cbp-one-hour-kpis strong { color: #8f2118; font-size: 19px; }
                #${SCRIPT_ID} .cbp-one-hour-kpis span { margin-top: 2px; color: #70441f; font-size: 9px; }
                #${SCRIPT_ID} .cbp-one-hour-continents { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 8px 8px; }
                #${SCRIPT_ID} .cbp-one-hour-continents span { padding: 4px 7px; border: 1px solid #d59a56; border-radius: 10px; background: #ffe4b9; font-size: 9px; }
                #${SCRIPT_ID} .cbp-one-hour-table { max-height: 420px; border-top: 1px solid #c77b3b; }
                #${SCRIPT_ID} .cbp-overblind { margin: 0 12px 10px; border: 2px solid #8e44ad; background: #f1ddfb; }
                #${SCRIPT_ID} .cbp-overblind-header { display: flex; justify-content: space-between; align-items: center; gap: 9px; padding: 7px 9px; background: #d6ace9; }
                #${SCRIPT_ID} .cbp-overblind-header small { display: block; margin-top: 2px; color: #5e346f; }
                #${SCRIPT_ID} .cbp-overblind-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
                #${SCRIPT_ID} .cbp-overblind-note { margin: 0; padding: 7px 9px; color: #5e346f; font-size: 10px; }
                #${SCRIPT_ID} .cbp-withdrawal-modal { width: min(1000px, calc(100vw - 30px)); }
                #${SCRIPT_ID} .cbp-bucket { margin: 0 12px 10px; border: 1px solid #b58d50; background: #fff4d2; }
                #${SCRIPT_ID} .cbp-bucket-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: #d6b477; }
                #${SCRIPT_ID} .cbp-bucket-header h4 span { color: #6b421d; font-size: 10px; }
                #${SCRIPT_ID} .cbp-table-wrap { max-height: 330px; overflow: auto; }
                #${SCRIPT_ID} .cbp-table { width: 100%; margin: 0; border-collapse: separate; border-spacing: 0; font-size: 10px; }
                #${SCRIPT_ID} .cbp-table th { position: sticky; top: 0; z-index: 1; white-space: nowrap; }
                #${SCRIPT_ID} .cbp-table td { white-space: nowrap; }
                #${SCRIPT_ID} .cbp-table td small { display: block; font-size: 8px; }
                #${SCRIPT_ID} .cbp-row-needs > td:first-child { color: #a02a1f; }
                #${SCRIPT_ID} .cbp-row-defended > td:first-child { color: #34731e; }
                #${SCRIPT_ID} .cbp-row-missing > td:first-child { color: #805f18; }
                #${SCRIPT_ID} .cbp-troop-deficit { color: #a02a1f; font-weight: bold; }
                #${SCRIPT_ID} .cbp-troop-ok { color: #34731e; font-weight: bold; }
                #${SCRIPT_ID} .cbp-troop-missing { color: #805f18; }
                #${SCRIPT_ID} .cbp-coordinate { color: #8b1d15; font-weight: bold; }
                #${SCRIPT_ID} .cbp-empty { padding: 9px; color: #775e3c; text-align: center; }
                #${SCRIPT_ID} button[disabled] { opacity: .55; cursor: not-allowed; }
                .cbp-modal-overlay { position: fixed; inset: 0; z-index: 10020; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.7); }
                .cbp-modal { width: min(760px, 96vw); max-height: 92vh; display: flex; flex-direction: column; padding: 12px; border: 2px solid #6f3b13; border-radius: 7px; background: #f4e4bc; color: #2b1a0a; box-shadow: 0 8px 30px rgba(0,0,0,.6); }
                .cbp-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 7px 9px; background: linear-gradient(#b7864d,#7a421d); color: #fff4d2; }
                .cbp-modal-header button { border: 0; background: transparent; color: #fff; font-size: 20px; cursor: pointer; }
                .cbp-modal p { margin: 8px 0; }
                .cbp-forum-preview { width: 100%; min-height: 430px; box-sizing: border-box; resize: vertical; padding: 8px; border: 1px solid #9b713c; background: #fffdf5; font: 12px Consolas, monospace; }
                .cbp-modal-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 9px; }
                @media(max-width:900px) {
                    #${SCRIPT_ID} .cbp-header { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cbp-form { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} .cbp-tribe-mode { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} details { grid-column: 1; }
                    #${SCRIPT_ID} .cbp-summary { grid-template-columns: 1fr 1fr; }
                    #${SCRIPT_ID} .cbp-one-hour-header { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cbp-one-hour-kpis { grid-template-columns: repeat(2,minmax(120px,1fr)); }
                    #${SCRIPT_ID} .cbp-map-heading { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cbp-map-wrap { height: 340px; }
                    #${SCRIPT_ID} .cbp-overblind-header { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cbp-coordinate-review-header { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cbp-op-troops > div { width: 420px; grid-template-columns: repeat(2,minmax(125px,1fr)); }
                }
            `;
            document.head.appendChild(style);
        }

        function setAnalysisMode(panel, requestedMode) {
            const mode = requestedMode === 'coordinates' ? 'coordinates' : 'tribes';
            panel.dataset.analysisMode = mode;
            state.analysisMode = mode;
            panel.querySelectorAll('[data-analysis-mode]').forEach((button) => {
                button.classList.toggle('is-active', button.dataset.analysisMode === mode);
                button.setAttribute('aria-selected', button.dataset.analysisMode === mode ? 'true' : 'false');
            });
            panel.querySelectorAll('[data-mode-panel]').forEach((section) => {
                section.hidden = section.dataset.modePanel !== mode;
            });
            const analyzeButton = panel.querySelector('[data-action="analyze"]');
            if (analyzeButton) analyzeButton.textContent = mode === 'coordinates' ? 'Analisar coordenadas' : 'Analisar alcance';
        }

        function createPanel() {
            const config = loadConfig();
            const configuredThresholds = normalizeThresholds(config.thresholds);
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <div class="cbp-header">
                    <div><h3>🛡️ Chong Tribe Script — Blind Preventivo</h3><p>Aldeias aliadas classificadas pelo tempo do nobre inimigo mais próximo.</p></div>
                    <div class="cbp-actions">
                        <button type="button" class="btn btn-confirm-yes" data-action="analyze">Analisar alcance</button>
                        <button type="button" class="btn" data-action="cancel" hidden>Cancelar</button>
                        <button type="button" class="btn" data-action="export" disabled>Exportar CSV</button>
                        <button type="button" class="btn" data-action="forum-export" disabled>Pedido de blind (Fórum)</button>
                        <a class="btn" href="${escapeHtml(membersPageUrl())}" target="_blank">Distribuir apoios</a>
                    </div>
                </div>
                <div class="cbp-mode-tabs" role="tablist" aria-label="Tipo de análise">
                    <button type="button" data-analysis-mode="tribes" role="tab">Análise da tribo</button>
                    <button type="button" data-analysis-mode="coordinates" role="tab">Alvos da OP por coordenadas</button>
                </div>
                <div class="cbp-form">
                    <div class="cbp-mode-panel cbp-tribe-mode" data-mode-panel="tribes">
                        <label>Tribos aliadas — tags ou nomes separados por ;
                            <textarea name="allied_tribes" placeholder="tagAliada1;tagAliada2">${escapeHtml(config.alliedInput || '')}</textarea>
                        </label>
                        <label class="cbp-continent-filter">Continentes das aldeias aliadas — separados por ; (vazio = todos)
                            <input type="text" name="continents" value="${escapeHtml(config.continentInput || '')}" placeholder="Ex.: K54; K64">
                        </label>
                    </div>
                    <div class="cbp-mode-panel cbp-coordinate-mode" data-mode-panel="coordinates" hidden>
                        <label>Nome deste lote de alvos (opcional)
                            <input type="text" name="coordinate_label" value="${escapeHtml(config.coordinateSelectionLabel || '')}" placeholder="Ex.: OP no front K54">
                        </label>
                        <label>Coordenadas dos possíveis alvos da OP — separadas por espaço, vírgula, ; ou linha
                            <textarea name="manual_coordinates" placeholder="419|733 419|734 413|733 417|734">${escapeHtml(config.coordinateInput || '')}</textarea>
                        </label>
                        <p>O script localiza jogador, aldeia e continente; calcula o tempo de nobre do inimigo mais próximo; e lê as tropas da última coleta em Tropas da Tribo. “Na aldeia” e “fora” são exibidos separadamente.</p>
                    </div>
                    <label>Tribos inimigas — tags ou nomes separados por ;
                        <textarea name="enemy_tribes" placeholder="tagTribo1;tagTribo2">${escapeHtml(config.enemyInput || '')}</textarea>
                    </label>
                    <label class="cbp-continent-filter">Nicks inimigos que não devem contar como ameaça — separados por ; ou linha
                        <textarea name="ignored_enemy_players" placeholder="Ex.: JogadorQueVemParaTribo">${escapeHtml(config.ignoredEnemyInput || '')}</textarea>
                    </label>
                    <div class="cbp-thresholds">
                        <strong>Mínimos defensivos por faixa — somente tropas “Na aldeia”</strong>
                        <span>Tropas fora, em trânsito, apoiando ou retornando não entram no cálculo. A aldeia só será considerada defendida se atingir os quatro mínimos com tropas paradas.</span>
                        <div class="cbp-threshold-table-wrap"><table class="vis cbp-threshold-table">
                            <thead><tr><th>Faixa do nobre</th>${DEFENSE_UNITS.map((unit) => `<th>${escapeHtml(unit.label)}</th>`).join('')}</tr></thead>
                            <tbody>${HOUR_LIMITS.map((limit) => `<tr>
                                <td><strong>${bucketLabel(limit)}</strong></td>
                                ${DEFENSE_UNITS.map((unit) => `<td><input type="number" min="0" step="1" inputmode="numeric" data-threshold-limit="${limit}" data-threshold-unit="${unit.id}" value="${configuredThresholds[limit][unit.id] || ''}" placeholder="0"></td>`).join('')}
                            </tr>`).join('')}</tbody>
                        </table></div>
                    </div>
                    <details>
                        <summary>Configuração avançada</summary>
                        <label>Considerar possível nobre somente em aldeias inimigas com mais de quantos pontos?
                            <input type="number" name="min_enemy_points" min="0" step="100" value="${escapeHtml(config.minEnemyPoints ?? DEFAULT_MIN_ENEMY_POINTS)}">
                        </label>
                        <label>Minutos por campo do nobre (vazio = detectar automaticamente)
                            <input type="number" name="noble_minutes" min="0.01" step="0.01" value="${escapeHtml(config.manualMinutes || '')}" placeholder="Automático">
                        </label>
                    </details>
                </div>
                <span class="cbp-status">Preencha as tribos e clique em “Analisar alcance”.</span>
                <div class="cbp-summary" hidden></div>
                <div class="cbp-result-controls" hidden>
                    <label>Exibir aldeias
                        <select data-action="result-filter">
                            <option value="needs">Precisam blind</option>
                            <option value="defended">Defendidas/blindadas</option>
                            <option value="missing">Sem dados de tropas</option>
                            <option value="all">Todas</option>
                        </select>
                    </label>
                    <span class="cbp-troop-storage-info"></span>
                </div>
                <div class="cbp-map-section" hidden></div>
                <div class="cbp-results"></div>`;

            setAnalysisMode(panel, config.analysisMode || 'tribes');

            panel.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                const analysisMode = event.target.closest('[data-analysis-mode]')?.dataset.analysisMode;
                if (analysisMode && !state.running) setAnalysisMode(panel, analysisMode);
                if (action === 'analyze') analyze();
                if (action === 'cancel') cancelAnalysis();
                if (action === 'export') exportCsv();
                if (action === 'export-threat-coordinates') exportThreatCoordinates();
                if (action === 'export-threat-data') exportThreatData();
                if (action === 'export-op-coordinates') exportOperationCoordinates();
                if (action === 'export-op-data') exportOperationData();
                if (action === 'forum-export') openForumExport();
                if (action === 'copy-overblind' && state.outOfPatternBlinds.length) copyText(outOfPatternWithdrawalText(), 'Pedido de retirada dos blinds fora da faixa copiado.');
                if (action === 'withdrawal-messages' && state.outOfPatternBlinds.length) openWithdrawalMessages();
                const bucket = event.target.closest('[data-copy-bucket]')?.dataset.copyBucket;
                if (bucket) copyBucket(bucket);
            });
            panel.addEventListener('change', (event) => {
                if (event.target.dataset.action === 'result-filter') {
                    state.resultFilter = event.target.value;
                    renderResults();
                }
                if (event.target.dataset.action === 'threat-range-filter') {
                    state.threatRangeFilter = event.target.value;
                    renderResults();
                }
            });
            return panel;
        }

        function mount() {
            addStyles();
            const panel = createPanel();
            const content = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            content.prepend(panel);
        }

        mount();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Distribuidor de Apoios
    // -------------------------------------------------------------------------
    (async function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-distribuidor-apoios';
        const TROOP_STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const AUDIT_STORAGE_PREFIX = 'chonguera_auditoria_apoios_v1';
        const AUDIT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
        const BLIND_STORAGE_PREFIX = 'chonguera_blind_preventivo_result';
        const COORDINATE_RESULT_STORAGE_PREFIX = 'chonguera_blind_preventivo_coordinate_sets';
        const CONFIG_STORAGE_PREFIX = 'chonguera_distribuidor_apoios_config';
        const IGNORED_ENEMY_STORAGE_PREFIX = 'chonguera_ignored_enemy_players';
        const MESSAGE_QUEUE_PREFIX = 'chong_tribe_mp_queue_v1';
        const MIN_ALLIED_TARGET_POINTS = 5000;
        const MAX_VISIBLE_TARGET_ROWS = 250;
        const DEFAULT_CONTINENT_ROUTES = 'K74: K74, K73, K63\nK64: K63, K64\nK54: K64, K54, K53';
        const UNITS = [
            { id: 'spear', label: 'Lanceiros', tag: 'spear' },
            { id: 'sword', label: 'Espadachins', tag: 'sword' },
            { id: 'spy', label: 'Exploradores', tag: 'spy' },
            { id: 'heavy', label: 'Cavalaria pesada', tag: 'heavy' }
        ];
        const DEFAULT_RESERVES = { spear: 1000, sword: 1000, spy: 100, heavy: 100 };

        if (!isMembersPage() || document.getElementById(SCRIPT_ID)) return;
        const state = {
            troopPayload: null,
            auditResults: new Map(),
            blindPayload: null,
            blindPayloadOptions: [],
            selectedBlindSnapshotId: '',
            sources: [],
            sourcesByContinent: new Map(),
            allTargets: [],
            lowPointTargets: [],
            targets: [],
            manualExcludedTargets: new Set(),
            manualIncludedLowPointTargets: new Set(),
            blacklistedTargets: new Set(),
            blacklistedContinents: new Set(),
            blacklistedDefended: [],
            blacklistedPlayers: new Set(),
            blacklistedAlliedPlayers: new Set(),
            sourceBlacklistedContinents: new Set(),
            continentRoutes: new Map(),
            ignoredEnemyPlayers: new Set(),
            ignoredEnemyTargets: [],
            sourceExcludedCount: 0,
            sourceThreatExcludedCount: 0,
            sourceFastVerifiedCount: 0,
            sourceAuditVerifiedCount: 0,
            sourceAuditExcludedCount: 0,
            sourceAuditAdjustedCount: 0,
            sourceAuditSubtracted: { spear: 0, sword: 0, spy: 0, heavy: 0 },
            assignments: [],
            assignmentIndex: new Map(),
            targetResults: [],
            memberMessages: [],
            planning: null,
            worldVillages: [],
            worldVillagesPromise: null,
            worldVillageBounds: null,
            worldVillageMatchCount: 0,
            distributing: false,
            pendingRedistribution: false,
            showAllTargets: false,
            showAllResults: false
        };

        function isMembersPage() {
            const query = new URLSearchParams(window.location.search);
            return query.get('screen') === 'ally' && query.get('mode') === 'members';
        }

        function worldId() {
            return String(window.game_data?.world || window.location.hostname);
        }

        function allyId() {
            const value = window.game_data?.player?.ally;
            return ['string', 'number'].includes(typeof value) && String(value) ? String(value) : 'tribo-atual';
        }

        function preferredKey(prefix) {
            return `${prefix}:${worldId()}:${allyId()}`;
        }

        function findPayload(prefix) {
            const exactKey = preferredKey(prefix);
            const currentAlly = allyId();
            const candidates = [];
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key?.startsWith(`${prefix}:`) && key.includes(`:${worldId()}:`)) {
                    const raw = window.localStorage.getItem(key);
                    if (!raw) continue;
                    try {
                        const payload = JSON.parse(raw);
                        const payloadAlly = String(payload?.allyId || '');
                        const allyMatch = key === exactKey
                            || currentAlly === 'tribo-atual'
                            || (payloadAlly && payloadAlly === currentAlly);
                        const savedAt = Date.parse(payload?.savedAt || 0);
                        candidates.push({ raw, key, allyMatch, savedAt: Number.isFinite(savedAt) ? savedAt : 0 });
                    } catch (_error) {
                        // Payloads inválidos não podem ser usados no planejamento.
                    }
                }
            }
            if (!candidates.length) return null;
            const matching = candidates.filter((candidate) => candidate.allyMatch);
            const eligible = matching.length ? matching : candidates;
            eligible.sort((a, b) => b.savedAt - a.savedAt
                || Number(b.key === exactKey) - Number(a.key === exactKey));
            return eligible[0].raw;
        }

        function isUsableBlindPayload(payload) {
            return [1, 2, 3].includes(payload?.version) && Array.isArray(payload.needs);
        }

        function blindSnapshotLabel(payload) {
            const mode = payload?.analysisMode === 'coordinates' ? 'Coordenadas' : 'Análise da tribo';
            const customLabel = String(payload?.selectionLabel || '').trim();
            const dateLabel = formatAge(payload?.savedAt);
            const requested = Array.isArray(payload?.requestedCoordinates) ? payload.requestedCoordinates.length : 0;
            const countLabel = requested
                ? `${formatNumber(requested)} coordenada(s) · ${formatNumber(payload.needs.length)} com déficit`
                : `${formatNumber(payload?.needs?.length || 0)} alvo(s) com déficit`;
            return `${mode}${customLabel ? ` — ${customLabel}` : ''} · ${dateLabel} · ${countLabel}`;
        }

        function collectBlindPayloadOptions() {
            const options = [];
            const seen = new Set();
            const addPayload = (payload) => {
                if (!isUsableBlindPayload(payload)) return;
                const identity = String(payload.snapshotId || `${payload.savedAt || 'sem-data'}:${payload.analysisMode || 'tribes'}:${(payload.requestedCoordinates || []).join(',')}`);
                if (seen.has(identity)) return;
                seen.add(identity);
                options.push({ id: identity, payload, label: blindSnapshotLabel(payload) });
            };

            try {
                addPayload(JSON.parse(findPayload(BLIND_STORAGE_PREFIX) || 'null'));
            } catch (_error) {
                // A opção atual inválida será ignorada.
            }

            const currentAlly = allyId();
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (!key?.startsWith(`${COORDINATE_RESULT_STORAGE_PREFIX}:`) || !key.includes(`:${worldId()}:`)) continue;
                try {
                    const history = JSON.parse(window.localStorage.getItem(key) || '[]');
                    if (!Array.isArray(history)) continue;
                    history.forEach((payload) => {
                        const payloadAlly = String(payload?.allyId || '');
                        if (currentAlly !== 'tribo-atual' && payloadAlly && payloadAlly !== currentAlly) return;
                        addPayload(payload);
                    });
                } catch (_error) {
                    // Históricos inválidos não aparecem no seletor.
                }
            }
            return options.sort((a, b) => Date.parse(b.payload.savedAt || 0) - Date.parse(a.payload.savedAt || 0));
        }

        function analyzedContinentsLabel() {
            const continents = Array.isArray(state.blindPayload?.selectedContinents)
                ? state.blindPayload.selectedContinents.map((item) => String(item || '').toUpperCase()).filter(Boolean)
                : [];
            return continents.length ? continents.join(', ') : 'todos';
        }

        function configKey() {
            return `${CONFIG_STORAGE_PREFIX}:${worldId()}`;
        }

        function ignoredEnemyKey() {
            return `${IGNORED_ENEMY_STORAGE_PREFIX}:${worldId()}`;
        }

        function loadConfig() {
            try {
                const saved = JSON.parse(window.localStorage.getItem(configKey()) || '{}');
                const sharedIgnoredEnemies = window.localStorage.getItem(ignoredEnemyKey());
                return { reserves: DEFAULT_RESERVES, excludeTargets: true, verifySourceOwnership: true, blindSnapshotId: '', blacklistInput: '', continentBlacklistInput: '', sourceContinentBlacklistInput: '', continentRoutesInput: DEFAULT_CONTINENT_ROUTES, playerBlacklistInput: '', alliedPlayerBlacklistInput: '', ignoredEnemyInput: '', ...saved, ...(sharedIgnoredEnemies !== null ? { ignoredEnemyInput: sharedIgnoredEnemies } : {}) };
            } catch (_error) {
                return { reserves: DEFAULT_RESERVES, excludeTargets: true, verifySourceOwnership: true, blindSnapshotId: '', blacklistInput: '', continentBlacklistInput: '', sourceContinentBlacklistInput: '', continentRoutesInput: DEFAULT_CONTINENT_ROUTES, playerBlacklistInput: '', alliedPlayerBlacklistInput: '', ignoredEnemyInput: '' };
            }
        }

        function saveConfig(config) {
            window.localStorage.setItem(configKey(), JSON.stringify(config));
            window.localStorage.setItem(ignoredEnemyKey(), config.ignoredEnemyInput || '');
        }

        function parseCoordinate(value) {
            const match = String(value || '').match(/(\d{3})\|(\d{3})/);
            return match ? { coordinate: `${match[1]}|${match[2]}`, x: Number(match[1]), y: Number(match[2]) } : null;
        }

        function parseCoordinateList(value) {
            return new Set([...String(value || '').matchAll(/\b(\d{3}\|\d{3})\b/g)].map((match) => match[1]));
        }

        function parseContinentList(value) {
            const continents = new Set();
            String(value || '').split(/[;,\s]+/).filter(Boolean).forEach((token) => {
                const normalized = token.trim().toUpperCase().replace(/^K/, '');
                if (/^\d{1,2}$/.test(normalized)) continents.add(`K${normalized.padStart(2, '0')}`);
            });
            return continents;
        }

        function parseContinentRoutes(value) {
            const routes = new Map();
            String(value || '').split(/\r?\n/).forEach((line) => {
                const match = line.match(/^\s*(K?\d{1,2})\s*(?::|=|>|→)\s*(.*?)\s*$/i);
                if (!match) return;
                const target = [...parseContinentList(match[1])][0];
                const sources = parseContinentList(match[2]);
                if (target && sources.size) routes.set(target, sources);
            });
            return routes;
        }

        function continentRoutesLabel() {
            if (!state.continentRoutes.size) return 'sem restrição por rota';
            return [...state.continentRoutes.entries()].map(([target, sources]) => `${target} ← ${[...sources].join(', ')}`).join(' · ');
        }

        function targetContinent(target) {
            if (/^K\d{2}$/i.test(String(target?.continent || ''))) return String(target.continent).toUpperCase();
            const coord = parseCoordinate(target?.coordinate);
            if (!coord) return '';
            return `K${Math.floor(coord.y / 100)}${Math.floor(coord.x / 100)}`;
        }

        function parsePlayerList(value) {
            return new Set(String(value || '')
                .split(/[;\n]+/)
                .map((name) => normalizeName(name))
                .filter(Boolean));
        }

        function number(value) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(number(value));
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function normalizeName(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function decodeMapValue(value) {
            try {
                return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
            } catch (_error) {
                return String(value || '');
            }
        }

        async function parseWorldVillagesInBounds(text, bounds) {
            const villages = [];
            const occupiedCells = new Set();
            const source = String(text || '');
            const area = Math.max(1, bounds.width * bounds.height);
            const cellSize = Math.max(1, Math.sqrt(area / 2200));
            let matched = 0;
            let start = 0;
            let processed = 0;
            while (start < source.length) {
                let end = source.indexOf('\n', start);
                if (end === -1) end = source.length;
                const line = source.slice(start, end).replace(/\r$/, '');
                start = end + 1;
                if (!line) continue;
                const fields = line.split(',');
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                if (Number.isFinite(x) && Number.isFinite(y)
                    && x >= bounds.minX && x <= bounds.maxX
                    && y >= bounds.minY && y <= bounds.maxY) {
                    matched += 1;
                    const cellKey = `${Math.floor((x - bounds.minX) / cellSize)},${Math.floor((y - bounds.minY) / cellSize)}`;
                    if (!occupiedCells.has(cellKey)) {
                        occupiedCells.add(cellKey);
                        villages.push({
                            id: Number(fields[0]) || 0,
                            name: decodeMapValue(fields[1]),
                            x,
                            y,
                            coordinate: `${fields[2]}|${fields[3]}`,
                            ownerId: Number(fields[4]) || 0,
                            points: Number(fields[5]) || 0
                        });
                    }
                }
                processed += 1;
                if (processed % 3500 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
            }
            return { villages, matched };
        }

        function mapBoundsFromDocument() {
            const values = String(document.querySelector(`#${SCRIPT_ID} .cda-risk-map`)?.getAttribute('viewBox') || '')
                .trim().split(/\s+/).map(Number);
            if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
            return { minX: values[0], minY: values[1], maxX: values[0] + values[2], maxY: values[1] + values[3], width: values[2], height: values[3] };
        }

        function boundsContain(outer, inner) {
            return Boolean(outer && inner
                && outer.minX <= inner.minX && outer.minY <= inner.minY
                && outer.maxX >= inner.maxX && outer.maxY >= inner.maxY);
        }

        function loadWorldVillagesForCurrentMap() {
            const bounds = mapBoundsFromDocument();
            if (!bounds || boundsContain(state.worldVillageBounds, bounds)) return Promise.resolve(state.worldVillages);
            if (state.worldVillagesPromise) return state.worldVillagesPromise;
            if (typeof window.fetch !== 'function') return Promise.resolve([]);
            state.worldVillagesPromise = (async () => {
                try {
                    const response = await window.fetch('/map/village.txt', {
                        credentials: 'include',
                        cache: 'no-cache',
                        headers: { Accept: 'text/plain,*/*' }
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const parsed = await parseWorldVillagesInBounds(await response.text(), bounds);
                    state.worldVillages = parsed.villages;
                    state.worldVillageMatchCount = parsed.matched;
                    state.worldVillageBounds = bounds;
                    if (state.planning && document.getElementById(SCRIPT_ID)) renderResults(readInputs());
                    return state.worldVillages;
                } catch (error) {
                    console.warn('[Chong Tribe Script] Não foi possível carregar as aldeias de contexto do mapa:', error);
                    return [];
                } finally {
                    state.worldVillagesPromise = null;
                }
            })();
            return state.worldVillagesPromise;
        }

        function isTargetOwner(source, target) {
            const sourceId = String(source.playerId || '');
            const targetId = String(target.playerId || '');
            if (sourceId && targetId) return sourceId === targetId;
            return normalizeName(source.playerName) !== ''
                && normalizeName(source.playerName) === normalizeName(target.playerName);
        }

        function distance(a, b) {
            return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
        }

        function formatAge(isoDate) {
            if (!isoDate || Number.isNaN(new Date(isoDate).getTime())) return 'data desconhecida';
            return new Date(isoDate).toLocaleString('pt-BR');
        }

        function notify(message, type = 'success') {
            if (window.UI) {
                if (type === 'error' && typeof window.UI.ErrorMessage === 'function') {
                    window.UI.ErrorMessage(message, 3500);
                    return;
                }
                if (typeof window.UI.InfoMessage === 'function') {
                    window.UI.InfoMessage(message, 3000);
                    return;
                }
            }
            console[type === 'error' ? 'error' : 'log'](`[Chong Tribe Script] ${message}`);
        }

        function readInputs() {
            const panel = document.getElementById(SCRIPT_ID);
            const reserves = Object.fromEntries(UNITS.map((unit) => [
                unit.id,
                number(panel.querySelector(`[name="reserve_${unit.id}"]`).value)
            ]));
            return {
                reserves,
                blindSnapshotId: panel.querySelector('[name="blind_snapshot"]')?.value || '',
                excludeTargets: panel.querySelector('[name="exclude_targets"]').checked,
                verifySourceOwnership: panel.querySelector('[name="verify_source_ownership"]')?.checked !== false,
                blacklistInput: panel.querySelector('[name="target_blacklist"]').value,
                continentBlacklistInput: panel.querySelector('[name="continent_blacklist"]').value,
                sourceContinentBlacklistInput: panel.querySelector('[name="source_continent_blacklist"]').value,
                continentRoutesInput: panel.querySelector('[name="continent_routes"]').value,
                playerBlacklistInput: panel.querySelector('[name="player_blacklist"]').value,
                alliedPlayerBlacklistInput: panel.querySelector('[name="allied_player_blacklist"]').value,
                ignoredEnemyInput: panel.querySelector('[name="ignored_enemy_players"]').value
            };
        }

        function loadData(blindSnapshotId = '') {
            const troopRaw = findPayload(TROOP_STORAGE_PREFIX);
            state.troopPayload = null;
            state.blindPayload = null;
            state.auditResults = loadAuditResults();

            try {
                const parsed = JSON.parse(troopRaw || 'null');
                if (parsed?.version === 2 && Array.isArray(parsed.results)) state.troopPayload = parsed;
            } catch (error) {
                console.warn('[Chong Tribe Script] Storage de tropas inválido:', error);
            }

            state.blindPayloadOptions = collectBlindPayloadOptions();
            const selected = state.blindPayloadOptions.find((option) => option.id === blindSnapshotId)
                || state.blindPayloadOptions[0]
                || null;
            state.selectedBlindSnapshotId = selected?.id || '';
            state.blindPayload = selected?.payload || null;
            const selector = document.querySelector(`#${SCRIPT_ID} [name="blind_snapshot"]`);
            if (selector && state.selectedBlindSnapshotId) selector.value = state.selectedBlindSnapshotId;
        }

        function loadAuditResults() {
            const results = new Map();
            const now = Date.now();
            const keys = [preferredKey(AUDIT_STORAGE_PREFIX)];
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key?.startsWith(`${AUDIT_STORAGE_PREFIX}:${worldId()}:`) && !key.endsWith(':settings') && !keys.includes(key)) keys.push(key);
            }
            keys.forEach((key) => {
                const raw = window.localStorage.getItem(key);
                if (!raw) return;
                try {
                    const cached = JSON.parse(raw);
                    Object.entries(cached || {}).forEach(([villageId, result]) => {
                        const checkedAt = Number(result?.checkedAt || 0);
                        if (!checkedAt || now - checkedAt >= AUDIT_CACHE_TTL_MS) return;
                        const previous = results.get(String(villageId));
                        if (!previous || checkedAt > Number(previous.checkedAt || 0)) results.set(String(villageId), result);
                    });
                } catch (error) {
                    console.warn(`[Chong Tribe Script] Cache da Auditoria de Apoios inválido (${key}):`, error);
                }
            });
            return results;
        }

        function validateTroopMemberIdentities() {
            const idsByName = new Map();
            (state.troopPayload?.results || []).forEach((player) => {
                const playerId = String(player?.id || '').trim();
                const playerName = normalizeName(player?.name);
                if (!playerId || !playerName) return;
                if (!idsByName.has(playerName)) idsByName.set(playerName, new Set());
                idsByName.get(playerName).add(playerId);
            });
            const collision = [...idsByName.entries()].find(([, playerIds]) => playerIds.size > 1);
            if (!collision) return;
            const displayedName = (state.troopPayload.results || []).find((player) => normalizeName(player?.name) === collision[0])?.name || collision[0];
            throw new Error(`Coleta de tropas inválida: o nome ${displayedName} foi associado a vários jogadores. Atualize o script e execute novamente “Carregar todos” em Tropas da Tribo. Nenhuma MP foi gerada.`);
        }

        function buildSources(reserves, excludeTargets, blacklistedPlayers, sourceBlacklistedContinents, verifySourceOwnership) {
            const targetCoordinates = new Set(
                Array.isArray(state.blindPayload?.protectedCoordinates)
                    ? state.blindPayload.protectedCoordinates
                    : (state.blindPayload?.needs || []).map((item) => item.coordinate)
            );
            const sources = [];
            state.sourceExcludedCount = 0;
            state.sourceThreatExcludedCount = 0;
            state.sourceFastVerifiedCount = 0;
            state.sourceAuditVerifiedCount = 0;
            state.sourceAuditExcludedCount = 0;
            state.sourceAuditAdjustedCount = 0;
            state.sourceAuditSubtracted = Object.fromEntries(UNITS.map((unit) => [unit.id, 0]));

            (state.troopPayload?.results || []).forEach((player) => {
                if (blacklistedPlayers.has(normalizeName(player.name))) return;
                (player.villageDetails || []).forEach((village) => {
                    const coord = parseCoordinate(village.coordinate || village.name);
                    if (!coord) return;
                    if (excludeTargets && targetCoordinates.has(coord.coordinate)) {
                        state.sourceThreatExcludedCount += 1;
                        return;
                    }
                    if (sourceBlacklistedContinents.has(targetContinent(coord))) {
                        state.sourceExcludedCount += 1;
                        return;
                    }
                    const rawHome = Object.fromEntries(UNITS.map((unit) => [unit.id, number(village.home?.[unit.id])]));
                    let ownedHome = { ...rawHome };
                    let externalSupport = Object.fromEntries(UNITS.map((unit) => [unit.id, 0]));
                    if (verifySourceOwnership) {
                        if (village.ownershipStatus === 'verified') {
                            state.sourceFastVerifiedCount += 1;
                        } else {
                            const audit = state.auditResults.get(String(village.id || ''));
                            const auditHasExactAmounts = audit?.visibility === 'exact' && Array.isArray(audit.supporters);
                            const auditFoundNoSupport = audit?.visibility === 'none';
                            if (!auditHasExactAmounts && !auditFoundNoSupport) {
                                state.sourceAuditExcludedCount += 1;
                                return;
                            }
                            state.sourceAuditVerifiedCount += 1;
                            (audit.supporters || []).forEach((supporter) => {
                                UNITS.forEach((unit) => {
                                    externalSupport[unit.id] += number(supporter?.units?.[unit.id]);
                                });
                            });
                            ownedHome = Object.fromEntries(UNITS.map((unit) => [
                                unit.id,
                                Math.max(0, rawHome[unit.id] - externalSupport[unit.id])
                            ]));
                            if (UNITS.some((unit) => externalSupport[unit.id] > 0)) state.sourceAuditAdjustedCount += 1;
                            UNITS.forEach((unit) => {
                                state.sourceAuditSubtracted[unit.id] += externalSupport[unit.id];
                            });
                        }
                    }
                    const available = Object.fromEntries(UNITS.map((unit) => [
                        unit.id,
                        Math.max(0, ownedHome[unit.id] - number(reserves[unit.id]))
                    ]));
                    sources.push({
                        id: String(village.id || ''),
                        name: village.name || coord.coordinate,
                        ...coord,
                        continent: targetContinent(coord),
                        playerId: String(player.id || ''),
                        playerName: player.name || 'Jogador',
                        playerKey: String(player.id || player.name || 'Jogador'),
                        home: ownedHome,
                        rawHome,
                        externalSupport,
                        available,
                        initialAvailable: { ...available }
                    });
                });
            });
            return sources;
        }

        function buildTargets() {
            const homeByCoordinate = new Map();
            (state.troopPayload?.results || []).forEach((player) => {
                (player.villageDetails || []).forEach((village) => {
                    const coord = parseCoordinate(village.coordinate || village.name);
                    if (!coord) return;
                    homeByCoordinate.set(coord.coordinate, Object.fromEntries(UNITS.map((unit) => [
                        unit.id,
                        number(village.home?.[unit.id])
                    ])));
                });
            });
            const candidatesByCoordinate = new Map();
            [...(state.blindPayload?.needs || []), ...(state.blindPayload?.villages || [])].forEach((item) => {
                const coord = parseCoordinate(item?.coordinate);
                if (coord && !candidatesByCoordinate.has(coord.coordinate)) candidatesByCoordinate.set(coord.coordinate, item);
            });
            const targets = [...candidatesByCoordinate.values()]
                .map((item) => {
                    const coord = parseCoordinate(item.coordinate);
                    if (!coord) return null;
                    const currentHome = homeByCoordinate.get(coord.coordinate) || null;
                    const hasRequired = item.required && typeof item.required === 'object';
                    const deficits = Object.fromEntries(UNITS.map((unit) => {
                        const savedDeficit = number(item.deficits?.[unit.id]);
                        if (!currentHome || !hasRequired) return [unit.id, savedDeficit];
                        return [unit.id, Math.max(0, number(item.required?.[unit.id]) - number(currentHome[unit.id]))];
                    }));
                    return {
                        ...item,
                        ...coord,
                        points: number(item.alliedPoints ?? item.points),
                        deficits,
                        defenseBasis: currentHome && hasRequired ? 'home-current' : (item.defenseBasis || state.blindPayload?.defenseBasis || 'saved')
                    };
                })
                .filter(Boolean)
                .filter((target) => UNITS.some((unit) => target.deficits[unit.id] > 0));
            state.ignoredEnemyTargets = targets.filter((target) => state.ignoredEnemyPlayers.has(normalizeName(target.enemyPlayerName)));
            return targets
                .filter((target) => !state.ignoredEnemyPlayers.has(normalizeName(target.enemyPlayerName)))
                .sort((a, b) => number(a.minutes) - number(b.minutes)
                    || totalUnits(b.deficits) - totalUnits(a.deficits)
                    || a.coordinate.localeCompare(b.coordinate));
        }

        function buildBlacklistedDefended() {
            return (state.blindPayload?.villages || [])
                .filter((item) => item?.classification === 'defended')
                .map((item) => {
                    const coord = parseCoordinate(item.coordinate);
                    return coord ? { ...item, ...coord } : null;
                })
                .filter(Boolean)
                .filter(isTargetBlacklisted)
                .sort((a, b) => targetContinent(a).localeCompare(targetContinent(b)) || a.coordinate.localeCompare(b.coordinate));
        }

        function isLowPointTarget(target) {
            return number(target.points) > 0 && number(target.points) < MIN_ALLIED_TARGET_POINTS;
        }

        function isFourHourPriority(target) {
            const bucket = number(target.bucket);
            if (bucket > 0) return bucket <= 4;
            return number(target.minutes) > 0 && number(target.minutes) <= 240;
        }

        function isTargetBlacklisted(target) {
            return state.blacklistedTargets.has(target.coordinate)
                || state.blacklistedContinents.has(targetContinent(target))
                || state.blacklistedAlliedPlayers.has(normalizeName(target.playerName));
        }

        function targetBlacklistReason(target) {
            if (state.blacklistedTargets.has(target.coordinate)) return 'Coordenada bloqueada';
            if (state.blacklistedContinents.has(targetContinent(target))) return `Continente ${targetContinent(target)} bloqueado`;
            if (state.blacklistedAlliedPlayers.has(normalizeName(target.playerName))) return `Jogador aliado ${target.playerName || '-'} bloqueado`;
            return 'Destino bloqueado';
        }

        function isTargetSelected(target) {
            if (isTargetBlacklisted(target)) return false;
            if (state.manualExcludedTargets.has(target.coordinate)) return false;
            if (isLowPointTarget(target) && !isFourHourPriority(target) && !state.manualIncludedLowPointTargets.has(target.coordinate)) return false;
            return true;
        }

        function totalUnits(record) {
            return UNITS.reduce((total, unit) => total + number(record?.[unit.id]), 0);
        }

        function sourceCanSupportTarget(source, target) {
            const allowedContinents = state.continentRoutes.get(targetContinent(target));
            if (source.coordinate === target.coordinate) return false;
            if (isTargetOwner(source, target)) return false;
            if (allowedContinents?.size && !allowedContinents.has(targetContinent(source))) return false;
            return true;
        }

        function indexSourcesByContinent() {
            state.sourcesByContinent.clear();
            state.sources.forEach((source) => {
                const continent = targetContinent(source);
                if (!state.sourcesByContinent.has(continent)) state.sourcesByContinent.set(continent, []);
                state.sourcesByContinent.get(continent).push(source);
            });
        }

        function candidateSourcesForTarget(target) {
            const allowedContinents = state.continentRoutes.get(targetContinent(target));
            if (!allowedContinents?.size) return state.sources;
            const candidates = [];
            allowedContinents.forEach((continent) => {
                const sources = state.sourcesByContinent.get(continent);
                if (sources?.length) candidates.push(...sources);
            });
            return candidates;
        }

        function routeAvailabilityForTarget(target, cache) {
            const routeKey = targetContinent(target);
            if (cache.has(routeKey)) return cache.get(routeKey);
            const totals = Object.fromEntries(UNITS.map((unit) => [unit.id, 0]));
            candidateSourcesForTarget(target).forEach((source) => {
                UNITS.forEach((unit) => { totals[unit.id] += number(source.available[unit.id]); });
            });
            cache.set(routeKey, totals);
            return totals;
        }

        function allocateTarget(target, remaining, allocated) {
            const grouped = new Map();
            candidateSourcesForTarget(target).forEach((source) => {
                if (!sourceCanSupportTarget(source, target)) return;
                if (!UNITS.some((unit) => remaining[unit.id] > 0 && source.available[unit.id] > 0)) return;
                const key = source.playerKey;
                if (!grouped.has(key)) grouped.set(key, {
                    playerName: source.playerName,
                    sources: [],
                    totals: Object.fromEntries(UNITS.map((unit) => [unit.id, 0])),
                    maxDistance: 0
                });
                const group = grouped.get(key);
                const sourceDistance = distance(source, target);
                group.sources.push({ source, distance: sourceDistance });
                group.maxDistance = Math.max(group.maxDistance, sourceDistance);
                UNITS.forEach((unit) => { group.totals[unit.id] += number(source.available[unit.id]); });
            });
            const rankedPlayers = [...grouped.values()].map((group) => {
                const requiredUnits = UNITS.filter((unit) => remaining[unit.id] > 0);
                group.fullTarget = requiredUnits.every((unit) => group.totals[unit.id] >= remaining[unit.id]);
                group.fullUnits = requiredUnits.filter((unit) => group.totals[unit.id] >= remaining[unit.id]).length;
                group.coverage = requiredUnits.reduce((sum, unit) => sum + Math.min(1, group.totals[unit.id] / remaining[unit.id]), 0);
                return group;
            }).sort((a, b) => Number(b.fullTarget) - Number(a.fullTarget)
                || b.maxDistance - a.maxDistance
                || b.fullUnits - a.fullUnits
                || b.coverage - a.coverage
                || a.playerName.localeCompare(b.playerName));

            for (const playerGroup of rankedPlayers) {
                const rankedSources = playerGroup.sources.sort((a, b) => b.distance - a.distance
                    || a.source.coordinate.localeCompare(b.source.coordinate));
                for (const item of rankedSources) {
                    const source = item.source;
                    UNITS.forEach((unit) => {
                        const amount = Math.min(source.available[unit.id], remaining[unit.id]);
                        if (amount <= 0) return;
                        source.available[unit.id] -= amount;
                        remaining[unit.id] -= amount;
                        allocated[unit.id] += amount;
                        addAssignment(source, target, unit.id, amount);
                    });
                    if (totalUnits(remaining) === 0) return;
                }
            }
        }

        function allocateAndStoreTarget(target) {
            const remaining = { ...target.deficits };
            const allocated = Object.fromEntries(UNITS.map((unit) => [unit.id, 0]));
            allocateTarget(target, remaining, allocated);
            const missingTotal = totalUnits(remaining);
            const allocatedTotal = totalUnits(allocated);
            state.targetResults.push({
                target,
                allocated,
                remaining,
                status: missingTotal === 0 ? 'covered' : allocatedTotal > 0 ? 'partial' : 'uncovered'
            });
        }

        function yieldToBrowser() {
            return new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        async function allocateTargetsByPriority(onProgress) {
            const routeAvailabilityCache = new Map();
            const priorityPending = state.targets.filter(isFourHourPriority)
                .map((target, index) => {
                    const totals = routeAvailabilityForTarget(target, routeAvailabilityCache);
                    return { target, index, coverable: UNITS.every((unit) => totals[unit.id] >= number(target.deficits[unit.id])) };
                })
                .sort((a, b) => Number(b.coverable) - Number(a.coverable)
                    || number(a.target.minutes) - number(b.target.minutes)
                    || a.index - b.index)
                .map((item) => item.target);
            const secondary = state.targets.filter((target) => !isFourHourPriority(target));
            const orderedTargets = [...priorityPending, ...secondary];
            for (let index = 0; index < orderedTargets.length; index += 1) {
                allocateAndStoreTarget(orderedTargets[index]);
                if ((index + 1) % 4 === 0) {
                    onProgress?.(index + 1, orderedTargets.length);
                    await yieldToBrowser();
                }
            }
            onProgress?.(orderedTargets.length, orderedTargets.length);
        }

        async function distribute() {
            if (state.distributing) {
                state.pendingRedistribution = true;
                return;
            }
            state.distributing = true;
            const panel = document.getElementById(SCRIPT_ID);
            const distributeButton = panel?.querySelector('[data-action="distribute"]');
            if (distributeButton) {
                distributeButton.disabled = true;
                distributeButton.textContent = 'Preparando cálculo...';
            }
            try {
            const config = readInputs();
            loadData(config.blindSnapshotId);
            config.blindSnapshotId = state.selectedBlindSnapshotId;
            saveConfig(config);

            if (!state.troopPayload) {
                renderMissing('Não encontrei as tropas salvas. Abra Tribo → Membros → Defesa e use “Carregar todos”.');
                return;
            }
            if (!state.blindPayload) {
                renderMissing('Não encontrei uma análise de blind. Abra Tribo → Propriedades, execute o Blind Preventivo e volte aqui.');
                return;
            }
            validateTroopMemberIdentities();

            state.blacklistedPlayers = parsePlayerList(config.playerBlacklistInput);
            state.blacklistedAlliedPlayers = parsePlayerList(config.alliedPlayerBlacklistInput);
            state.sourceBlacklistedContinents = parseContinentList(config.sourceContinentBlacklistInput);
            state.continentRoutes = parseContinentRoutes(config.continentRoutesInput);
            state.ignoredEnemyPlayers = parsePlayerList(config.ignoredEnemyInput);
            state.blacklistedContinents = parseContinentList(config.continentBlacklistInput);
            const blockedSourcePlayers = new Set([...state.blacklistedPlayers, ...state.blacklistedAlliedPlayers]);
            state.sources = buildSources(config.reserves, config.excludeTargets, blockedSourcePlayers, state.sourceBlacklistedContinents, config.verifySourceOwnership);
            indexSourcesByContinent();
            state.allTargets = buildTargets();
            state.lowPointTargets = state.allTargets.filter(isLowPointTarget);
            state.blacklistedTargets = parseCoordinateList(config.blacklistInput);
            state.blacklistedDefended = buildBlacklistedDefended();
            state.targets = state.allTargets.filter(isTargetSelected);
            state.assignments = [];
            state.assignmentIndex.clear();
            state.targetResults = [];
            state.showAllResults = false;
            renderTargetSelection();

            if (config.verifySourceOwnership && !state.sources.length) {
                renderMissing(`Nenhuma aldeia de origem possui validação segura. Em “Tropas da Tribo”, clique em “Carregar e validar origens”. Somente divergências ou origens não validadas precisam da Auditoria de Apoios; o cache detalhado vale 24 horas.`);
                return;
            }

            if (!state.allTargets.length) {
                renderMissing('A análise salva não possui aldeias com déficit para distribuir.');
                return;
            }
            if (!state.targets.length) {
                renderMissing(state.lowPointTargets.length
                    ? `Nenhum destino elegível. Aldeias com menos de ${formatNumber(MIN_ALLIED_TARGET_POINTS)} pontos estão na revisão manual acima.`
                    : 'Todas as aldeias foram desmarcadas ou estão na blacklist. Marque ao menos um destino.');
                return;
            }

            panel.querySelector('.cda-results').innerHTML = '<div class="cda-empty cda-calculating"><strong>Calculando a distribuição em blocos...</strong><span>Primeiro serão processados os blinds de até 4h.</span></div>';
            await yieldToBrowser();
            await allocateTargetsByPriority((completed, total) => {
                if (!distributeButton) return;
                distributeButton.textContent = `Calculando ${formatNumber(completed)}/${formatNumber(total)}...`;
            });

            state.memberMessages = buildMemberMessages();
            validateAssignmentConservation();
            await yieldToBrowser();
            renderResults(config);
            } catch (error) {
                console.error('[Chong Tribe Script] Falha ao distribuir apoios:', error);
                renderMissing(error?.message || 'Falha ao calcular a distribuição de apoios.');
            } finally {
                state.distributing = false;
                if (distributeButton) {
                    distributeButton.disabled = false;
                    distributeButton.textContent = 'Distribuir apoios';
                }
                if (state.pendingRedistribution) {
                    state.pendingRedistribution = false;
                    window.setTimeout(() => distribute(), 0);
                }
            }
        }

        function addAssignment(source, target, unitId, amount) {
            const key = `${source.playerKey}:${source.coordinate}->${target.coordinate}`;
            let assignment = state.assignmentIndex.get(key);
            if (!assignment) {
                assignment = {
                    source,
                    target,
                    units: Object.fromEntries(UNITS.map((unit) => [unit.id, 0]))
                };
                state.assignments.push(assignment);
                state.assignmentIndex.set(key, assignment);
            }
            assignment.units[unitId] += amount;
        }

        function validateAssignmentConservation() {
            const sourceStock = new Map();
            state.sources.forEach((source) => {
                const key = `${source.playerKey}:${source.coordinate}`;
                sourceStock.set(key, {
                    source,
                    units: Object.fromEntries(UNITS.map((unit) => [unit.id, number(source.initialAvailable?.[unit.id])]))
                });
            });
            const plannedBySource = new Map();
            state.assignments.forEach((assignment) => {
                const key = `${assignment.source.playerKey}:${assignment.source.coordinate}`;
                if (!plannedBySource.has(key)) plannedBySource.set(key, Object.fromEntries(UNITS.map((unit) => [unit.id, 0])));
                UNITS.forEach((unit) => {
                    plannedBySource.get(key)[unit.id] += number(assignment.units?.[unit.id]);
                });
            });
            for (const [key, planned] of plannedBySource.entries()) {
                const stock = sourceStock.get(key);
                if (!stock) throw new Error('Falha de segurança: uma origem planejada não existe mais no estoque coletado. Atualize as tropas e distribua novamente.');
                for (const unit of UNITS) {
                    if (planned[unit.id] <= stock.units[unit.id]) continue;
                    throw new Error(`Falha de segurança: a MP de ${stock.source.playerName} excederia o estoque parado de ${unit.label} em ${stock.source.coordinate}. Nenhuma MP foi gerada.`);
                }
            }
        }

        function urgencyLabel(target) {
            const bucket = number(target.bucket);
            if (bucket === 1) return 'até 1h de nobre';
            return `até ${bucket}h de nobre`;
        }

        function messageForMember(playerName, orders) {
            const sortedOrders = [...orders].sort((a, b) => number(a.target.minutes) - number(b.target.minutes)
                || a.target.coordinate.localeCompare(b.target.coordinate));
            const rows = sortedOrders
                .map((order) => `[*] [coord]${order.target.coordinate}[/coord] [|] ${UNITS.map((unit) => formatNumber(order.units[unit.id])).join(' [|] ')}`)
                .join('\n');
            const codeRows = sortedOrders
                .map((order) => `${order.target.coordinate} ${UNITS.map((unit) => Math.trunc(number(order.units[unit.id]))).join('/')}`)
                .join('\n');

            return `[b]PEDIDO DE APOIO PREVENTIVO[/b]\n\nOlá, ${playerName}.\n\nPor favor, envie os totais abaixo como [b]APOIO[/b]. Você pode escolher as aldeias de origem, priorizando as mais distantes do destino:\n\n[table]\n[**] DESTINO [||] [unit]spear[/unit] [||] [unit]sword[/unit] [||] [unit]spy[/unit] [||] [unit]heavy[/unit] [/**]\n${rows}\n[/table]\n\n[spoiler=Coordenadas e tropas para copiar]\n[b]Formato: COORDENADA LANCEIRO/ESPADACHIM/ESPIÃO/CP[/b]\n[code]${codeRows}[/code]\n[/spoiler]\n\n[color=#ff0000][b]ATENÇÃO: O BLIND PREVENTIVO NÃO DEVE SER RETIRADO SEM ORDEM DA LIDERANÇA.[/b][/color]\n\nConfirme por MP quando os apoios estiverem a caminho.\n\nObrigado!`;
        }

        function aggregateOrders(assignments) {
            const orders = new Map();
            assignments.forEach((assignment) => {
                const key = assignment.target.coordinate;
                if (!orders.has(key)) orders.set(key, {
                    target: assignment.target,
                    units: Object.fromEntries(UNITS.map((unit) => [unit.id, 0]))
                });
                UNITS.forEach((unit) => {
                    orders.get(key).units[unit.id] += number(assignment.units[unit.id]);
                });
            });
            return [...orders.values()];
        }

        function buildMemberMessages() {
            const grouped = new Map();
            state.assignments.forEach((assignment) => {
                const key = assignment.source.playerId || assignment.source.playerName;
                if (!grouped.has(key)) grouped.set(key, {
                    playerId: assignment.source.playerId,
                    playerName: assignment.source.playerName,
                    assignments: []
                });
                grouped.get(key).assignments.push(assignment);
            });
            return [...grouped.values()]
                .sort((a, b) => a.playerName.localeCompare(b.playerName))
                .map((group) => {
                    const orders = aggregateOrders(group.assignments);
                    return { ...group, orders, text: messageForMember(group.playerName, orders) };
                });
        }

        function withdrawalRequestText() {
            const rows = state.blacklistedDefended.map((village) => {
                const totals = UNITS.map((unit) => formatNumber(village.actual?.[unit.id])).join(' [||] ');
                return `[**][coord]${village.coordinate}[/coord] [||] ${village.playerName || '-'} [||] ${targetContinent(village)} [||] ${totals}[/**]`;
            }).join('\n');
            return `[b]PEDIDO DE RETIRADA DE APOIOS[/b]\n\nAs aldeias abaixo estão blindadas, mas pertencem a coordenadas, continentes ou jogadores aliados bloqueados no planejamento. Por favor, confirmem os apoios existentes e programem a retirada conforme orientação da liderança.\n\n[table]\n[**] ALDEIA [||] JOGADOR [||] CONTINENTE [||] [unit]spear[/unit] [||] [unit]sword[/unit] [||] [unit]spy[/unit] [||] [unit]heavy[/unit] [/**]\n${rows}\n[/table]`;
        }

        function renderWithdrawalReview() {
            if (!state.blacklistedTargets.size && !state.blacklistedContinents.size && !state.blacklistedAlliedPlayers.size) return '';
            if (!Array.isArray(state.blindPayload?.villages)) {
                return '<div class="cda-withdrawal-review cda-withdrawal-warning"><strong>Revisão de retirada indisponível nesta análise.</strong><span>Execute novamente o Blind Preventivo com a versão atual para salvar também as aldeias já blindadas.</span></div>';
            }
            if (!state.blacklistedDefended.length) {
                return '<div class="cda-withdrawal-review"><strong>Nenhuma aldeia blindada encontrada na blacklist.</strong><span>A conferência considerou as coordenadas, os continentes e os jogadores aliados bloqueados.</span></div>';
            }
            return `<div class="cda-withdrawal-review">
                <div class="cda-withdrawal-head"><div><strong>Blindadas na blacklist — revisar retirada de apoios</strong><span>Estas aldeias já atingem os mínimos defensivos, mas foram excluídas por coordenada, continente ou jogador aliado.</span></div><button type="button" class="btn" data-action="copy-withdrawals">Copiar pedido de retirada</button></div>
                <div class="cda-target-list"><table class="vis cda-table">
                    <thead><tr><th>Coordenada</th><th>Continente</th><th>Jogador</th><th>Aldeia</th>${UNITS.map((unit) => `<th>${escapeHtml(unit.label)}<small>atual / mínimo</small></th>`).join('')}<th>Motivo</th></tr></thead>
                    <tbody>${state.blacklistedDefended.map((village) => `<tr>
                        <td class="cda-coord">${escapeHtml(village.coordinate)}</td><td>${escapeHtml(targetContinent(village))}</td><td>${escapeHtml(village.playerName || '-')}</td><td>${escapeHtml(village.name || '-')}</td>
                        ${UNITS.map((unit) => `<td>${formatNumber(village.actual?.[unit.id])} / ${formatNumber(village.required?.[unit.id])}</td>`).join('')}
                        <td>${escapeHtml(targetBlacklistReason(village))}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
                <small class="cda-withdrawal-note">A lista indica aldeias classificadas como blindadas. Confirme no jogo quais tropas são apoios de terceiros antes de ordenar a retirada.</small>
            </div>`;
        }

        function renderIgnoredEnemyReview() {
            if (!state.ignoredEnemyPlayers.size) return '';
            if (!state.ignoredEnemyTargets.length) {
                return `<div class="cda-ignore-review"><strong>Nenhum destino foi removido pelos nicks inimigos ignorados.</strong><span>Nicks configurados: ${escapeHtml([...state.ignoredEnemyPlayers].join(', '))}.</span></div>`;
            }
            return `<div class="cda-ignore-review">
                <div><strong>Ameaças ignoradas por jogador</strong><span>${formatNumber(state.ignoredEnemyTargets.length)} destino(s) retirado(s) do planejamento atual. Refaça o Blind Preventivo para recalcular esses locais contra o próximo inimigo válido.</span></div>
                <div class="cda-target-list"><table class="vis cda-table"><thead><tr><th>Destino aliado</th><th>Jogador aliado</th><th>Inimigo ignorado</th><th>Aldeia inimiga</th><th>Urgência anterior</th></tr></thead>
                    <tbody>${state.ignoredEnemyTargets.map((target) => `<tr><td class="cda-coord">${escapeHtml(target.coordinate)}</td><td>${escapeHtml(target.playerName || '-')}</td><td>${escapeHtml(target.enemyPlayerName || '-')}</td><td class="cda-coord">${escapeHtml(target.enemyCoordinate || '-')}</td><td>${escapeHtml(urgencyLabel(target))}</td></tr>`).join('')}</tbody>
                </table></div>
            </div>`;
        }

        function renderTargetSelection() {
            const panel = document.getElementById(SCRIPT_ID);
            const container = panel?.querySelector('.cda-target-selection');
            if (!container) return;
            if (!state.blindPayload) {
                container.innerHTML = '<div class="cda-empty">Execute o Blind Preventivo para carregar a lista de destinos.</div>';
                return;
            }
            if (!state.allTargets.length) {
                container.innerHTML = '<div class="cda-empty">Nenhuma aldeia com déficit foi encontrada na análise salva.</div>';
                return;
            }

            const selectedCount = state.allTargets.filter(isTargetSelected).length;
            const regularTargets = state.allTargets.filter((target) => !isLowPointTarget(target));
            const visibleRegularTargets = state.showAllTargets ? regularTargets : regularTargets.slice(0, MAX_VISIBLE_TARGET_ROWS);
            const visibleLowPointTargets = state.showAllTargets ? state.lowPointTargets : state.lowPointTargets.slice(0, MAX_VISIBLE_TARGET_ROWS);
            const hiddenSelectionRows = Math.max(0, regularTargets.length - visibleRegularTargets.length)
                + Math.max(0, state.lowPointTargets.length - visibleLowPointTargets.length);
            const automaticLowPointCount = state.lowPointTargets.filter(isFourHourPriority).length;
            const lowPointRows = visibleLowPointTargets.map((target) => {
                const blacklisted = isTargetBlacklisted(target);
                const checked = isTargetSelected(target);
                const automatic = isFourHourPriority(target);
                const manuallyExcluded = state.manualExcludedTargets.has(target.coordinate);
                const situation = blacklisted
                    ? '<strong>Blacklist</strong>'
                    : automatic
                        ? (manuallyExcluded ? 'Desmarcada pela liderança' : '<strong>Incluída automaticamente — ameaça até 4h</strong>')
                        : checked
                            ? '<strong>Incluída manualmente</strong>'
                            : 'Revisão manual — ameaça acima de 4h';
                return `<tr class="cda-low-points ${checked ? '' : 'cda-target-excluded'}">
                    <td><input type="checkbox" data-target-coordinate="${escapeHtml(target.coordinate)}" data-low-point="1" ${checked ? 'checked' : ''} ${blacklisted ? 'disabled' : ''}></td>
                    <td class="cda-coord">${escapeHtml(target.coordinate)}</td>
                    <td>${formatNumber(target.points)}</td>
                    <td>${escapeHtml(target.playerName || '-')}</td>
                    <td>${escapeHtml(target.name || '-')}</td>
                    <td>${escapeHtml(urgencyLabel(target))}</td>
                    <td>${situation}</td>
                </tr>`;
            }).join('');
            container.innerHTML = `
                ${renderIgnoredEnemyReview()}
                ${renderWithdrawalReview()}
                ${state.lowPointTargets.length ? `<div class="cda-low-review">
                    <div class="cda-low-review-head"><strong>Aldeias aliadas abaixo de ${formatNumber(MIN_ALLIED_TARGET_POINTS)} pontos — prioridade por urgência</strong><span>${formatNumber(automaticLowPointCount)} aldeia(s) ameaçada(s) em até 4h entram automaticamente. As demais continuam em revisão manual para decisão da liderança.</span></div>
                    <div class="cda-target-list"><table class="vis cda-table">
                        <thead><tr><th>Blindar</th><th>Coordenada</th><th>Pontos</th><th>Jogador</th><th>Aldeia</th><th>Urgência</th><th>Situação</th></tr></thead>
                        <tbody>${lowPointRows}</tbody>
                    </table></div>
                </div>` : ''}
                <div class="cda-target-head">
                    <strong>Destinos incluídos no planejamento</strong>
                    <span>Lote: ${escapeHtml(blindSnapshotLabel(state.blindPayload))} · continentes: ${escapeHtml(analyzedContinentsLabel())} · ${formatNumber(selectedCount)} de ${formatNumber(state.allTargets.length)} selecionado(s) · ${formatNumber(automaticLowPointCount)} abaixo de 5K automáticas até 4h · ${formatNumber(state.lowPointTargets.length - automaticLowPointCount)} abaixo de 5K em revisão · ${formatNumber(state.blacklistedTargets.size)} coordenada(s), ${formatNumber(state.blacklistedContinents.size)} continente(s) e ${formatNumber(state.blacklistedAlliedPlayers.size)} aliado(s) na blacklist geral</span>
                    <button type="button" class="btn" data-action="select-all-targets">Marcar elegíveis</button>
                    <button type="button" class="btn" data-action="clear-all-targets">Desmarcar todas</button>
                    ${hiddenSelectionRows ? `<button type="button" class="btn" data-action="show-all-targets">Mostrar todos (${formatNumber(state.allTargets.length)})</button>` : ''}
                </div>
                <div class="cda-target-list"><table class="vis cda-table">
                    <thead><tr><th>Usar</th><th>Urgência</th><th>Coordenada</th><th>Pontos</th><th>Jogador</th>${UNITS.map((unit) => `<th>${escapeHtml(unit.label)}<small>déficit</small></th>`).join('')}<th>Situação</th></tr></thead>
                    <tbody>${visibleRegularTargets.map((target) => {
                        const blacklisted = isTargetBlacklisted(target);
                        const manuallyExcluded = state.manualExcludedTargets.has(target.coordinate);
                        const checked = isTargetSelected(target);
                        return `<tr class="${checked ? '' : 'cda-target-excluded'}">
                            <td><input type="checkbox" data-target-coordinate="${escapeHtml(target.coordinate)}" ${checked ? 'checked' : ''} ${blacklisted ? 'disabled' : ''}></td>
                            <td>${escapeHtml(urgencyLabel(target))}</td>
                            <td class="cda-coord">${escapeHtml(target.coordinate)}</td>
                            <td>${target.points ? formatNumber(target.points) : '—'}</td>
                            <td>${escapeHtml(target.playerName || '-')}</td>
                            ${UNITS.map((unit) => `<td>${formatNumber(target.deficits[unit.id])}</td>`).join('')}
                            <td>${blacklisted ? '<strong>Blacklist</strong>' : manuallyExcluded ? 'Desmarcada' : 'Incluída'}</td>
                        </tr>`;
                    }).join('') || `<tr><td colspan="${6 + UNITS.length}">Nenhuma aldeia com 5.000 pontos ou mais encontrada.</td></tr>`}</tbody>
                </table></div>
                ${hiddenSelectionRows ? `<div class="cda-row-limit-note">Exibindo os ${formatNumber(state.allTargets.length - hiddenSelectionRows)} primeiros de ${formatNumber(state.allTargets.length)} destinos para manter a tela leve. Todos continuam no cálculo.</div>` : ''}`;
        }

        function resetPlanningSession() {
            state.troopPayload = null;
            state.blindPayload = null;
            state.auditResults.clear();
            state.sources = [];
            state.sourcesByContinent.clear();
            state.allTargets = [];
            state.lowPointTargets = [];
            state.targets = [];
            state.manualExcludedTargets.clear();
            state.manualIncludedLowPointTargets.clear();
            state.blacklistedTargets.clear();
            state.blacklistedContinents.clear();
            state.blacklistedDefended = [];
            state.blacklistedPlayers.clear();
            state.blacklistedAlliedPlayers.clear();
            state.sourceBlacklistedContinents.clear();
            state.continentRoutes.clear();
            state.ignoredEnemyPlayers.clear();
            state.ignoredEnemyTargets = [];
            state.sourceExcludedCount = 0;
            state.sourceThreatExcludedCount = 0;
            state.sourceFastVerifiedCount = 0;
            state.sourceAuditVerifiedCount = 0;
            state.sourceAuditExcludedCount = 0;
            state.sourceAuditAdjustedCount = 0;
            state.sourceAuditSubtracted = Object.fromEntries(UNITS.map((unit) => [unit.id, 0]));
            state.assignments = [];
            state.assignmentIndex.clear();
            state.targetResults = [];
            state.memberMessages = [];
            state.planning = null;
            state.distributing = false;
            state.pendingRedistribution = false;
            state.showAllTargets = false;
            state.showAllResults = false;

            const panel = document.getElementById(SCRIPT_ID);
            if (!panel) return;
            panel.querySelector('.cda-target-selection').innerHTML = '<div class="cda-empty">Nenhum planejamento gerado nesta abertura. Clique em “Distribuir apoios” para calcular novamente.</div>';
            panel.querySelector('.cda-results').innerHTML = '<div class="cda-empty">Configure as reservas e clique em “Distribuir apoios”. Os alvos e as MPs sempre serão recalculados com os dados disponíveis no momento.</div>';
            panel.querySelector('[data-action="copy-all"]').disabled = true;
            panel.querySelector('[data-action="download-all"]').disabled = true;
            panel.querySelector('[data-action="prepare-messages"]').disabled = true;
            panel.querySelector('[data-action="copy-planning"]').disabled = true;
        }

        function sumByUnit(items, reader) {
            return Object.fromEntries(UNITS.map((unit) => [
                unit.id,
                items.reduce((total, item) => total + number(reader(item, unit.id)), 0)
            ]));
        }

        function buildPlanning() {
            const stock = sumByUnit(state.sources, (source, unitId) => source.home[unitId]);
            const available = sumByUnit(state.sources, (source, unitId) => source.initialAvailable[unitId]);
            const required = sumByUnit(state.targets, (target, unitId) => target.deficits[unitId]);
            const planned = sumByUnit(state.assignments, (assignment, unitId) => assignment.units[unitId]);
            const missing = sumByUnit(state.targetResults, (result, unitId) => result.remaining[unitId]);
            const reserved = Object.fromEntries(UNITS.map((unit) => [
                unit.id,
                Math.max(0, stock[unit.id] - available[unit.id])
            ]));
            const surplus = Object.fromEntries(UNITS.map((unit) => [
                unit.id,
                Math.max(0, available[unit.id] - planned[unit.id])
            ]));
            return {
                stock,
                reserved,
                available,
                required,
                planned,
                missing,
                surplus,
                canCoverAll: UNITS.every((unit) => missing[unit.id] === 0),
                usableSources: state.sources.filter((source) => UNITS.some((unit) => source.initialAvailable[unit.id] > 0)).length
            };
        }

        function planningText() {
            if (!state.planning) return '';
            const result = state.planning.canCoverAll
                ? 'SIM — o estoque disponível consegue cobrir todos os alvos.'
                : 'NÃO — ainda faltam tropas para cobrir todos os alvos.';
            const lines = [
                'PLANEJAMENTO DE BLIND PREVENTIVO',
                result,
                '',
                'UNIDADE | ESTOQUE | RESERVA | DISPONÍVEL | NECESSÁRIO | PLANEJADO | FALTA | SOBRA'
            ];
            UNITS.forEach((unit) => {
                lines.push([
                    unit.label,
                    state.planning.stock[unit.id],
                    state.planning.reserved[unit.id],
                    state.planning.available[unit.id],
                    state.planning.required[unit.id],
                    state.planning.planned[unit.id],
                    state.planning.missing[unit.id],
                    state.planning.surplus[unit.id]
                ].join(' | '));
            });
            return lines.join('\n');
        }

        function renderMissing(message) {
            state.assignments = [];
            state.targetResults = [];
            state.memberMessages = [];
            state.planning = null;
            const panel = document.getElementById(SCRIPT_ID);
            panel.querySelector('.cda-results').innerHTML = `<div class="cda-empty">${escapeHtml(message)}</div>`;
            panel.querySelector('[data-action="copy-all"]').disabled = true;
            panel.querySelector('[data-action="download-all"]').disabled = true;
            panel.querySelector('[data-action="prepare-messages"]').disabled = true;
            panel.querySelector('[data-action="copy-planning"]').disabled = true;
        }

        function statusText(status) {
            if (status === 'covered') return 'Coberta';
            if (status === 'partial') return 'Parcial';
            return 'Sem apoio disponível';
        }

        function mapLink(point) {
            const url = new URL('/game.php', window.location.origin);
            if (window.game_data?.village?.id) url.searchParams.set('village', String(window.game_data.village.id));
            url.searchParams.set('screen', 'map');
            url.searchParams.set('x', String(point.x));
            url.searchParams.set('y', String(point.y));
            return url.href;
        }

        function renderDistributionMap() {
            const targets = new Map(state.allTargets.map((target) => [target.coordinate, target]));
            const withdrawals = new Map(state.blacklistedDefended.map((village) => [village.coordinate, village]));
            const resultByCoordinate = new Map(state.targetResults.map((result) => [result.target.coordinate, result]));
            const enemies = new Map();
            [...targets.values(), ...withdrawals.values()].forEach((target) => {
                const enemy = parseCoordinate(target.enemyCoordinate);
                if (!enemy) return;
                enemies.set(enemy.coordinate, {
                    ...enemy,
                    playerName: target.enemyPlayerName || 'Inimigo',
                    allyTag: target.enemyAllyTag || '',
                    points: number(target.enemyPoints)
                });
            });
            const points = [...targets.values(), ...withdrawals.values(), ...enemies.values()];
            if (!points.length) return '<div class="cda-empty">Não há coordenadas suficientes para gerar o mapa.</div>';

            const xs = points.map((point) => number(point.x));
            const ys = points.map((point) => number(point.y));
            const rawMinX = Math.min(...xs);
            const rawMaxX = Math.max(...xs);
            const rawMinY = Math.min(...ys);
            const rawMaxY = Math.max(...ys);
            const rawSpan = Math.max(rawMaxX - rawMinX, rawMaxY - rawMinY, 10);
            const margin = Math.max(2, rawSpan * 0.06);
            const minX = rawMinX - margin;
            const minY = rawMinY - margin;
            const width = Math.max(1, rawMaxX - rawMinX + margin * 2);
            const height = Math.max(1, rawMaxY - rawMinY + margin * 2);
            const radius = Math.max(0.4, Math.min(1.2, rawSpan / 135));
            const lineWidth = Math.max(0.12, rawSpan / 750);
            const gridLines = [];
            for (let x = Math.ceil(minX / 10) * 10; x <= minX + width; x += 10) {
                gridLines.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${minY + height}"></line>`);
            }
            for (let y = Math.ceil(minY / 10) * 10; y <= minY + height; y += 10) {
                gridLines.push(`<line x1="${minX}" y1="${y}" x2="${minX + width}" y2="${y}"></line>`);
            }

            const maxX = minX + width;
            const maxY = minY + height;
            const continentLines = [];
            const continentLabels = [];
            const continentFontSize = Math.max(2.4, Math.min(6, rawSpan / 35));
            const firstContinentX = Math.floor(minX / 100);
            const lastContinentX = Math.floor(maxX / 100);
            const firstContinentY = Math.floor(minY / 100);
            const lastContinentY = Math.floor(maxY / 100);
            for (let continentX = firstContinentX; continentX <= lastContinentX; continentX += 1) {
                const boundaryX = continentX * 100;
                if (boundaryX >= minX && boundaryX <= maxX) {
                    continentLines.push(`<line x1="${boundaryX}" y1="${minY}" x2="${boundaryX}" y2="${maxY}"></line>`);
                }
            }
            for (let continentY = firstContinentY; continentY <= lastContinentY; continentY += 1) {
                const boundaryY = continentY * 100;
                if (boundaryY >= minY && boundaryY <= maxY) {
                    continentLines.push(`<line x1="${minX}" y1="${boundaryY}" x2="${maxX}" y2="${boundaryY}"></line>`);
                }
            }
            for (let continentY = firstContinentY; continentY <= lastContinentY; continentY += 1) {
                for (let continentX = firstContinentX; continentX <= lastContinentX; continentX += 1) {
                    const visibleLeft = Math.max(minX, continentX * 100);
                    const visibleRight = Math.min(maxX, (continentX + 1) * 100);
                    const visibleTop = Math.max(minY, continentY * 100);
                    const visibleBottom = Math.min(maxY, (continentY + 1) * 100);
                    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) continue;
                    const labelX = visibleLeft + (visibleRight - visibleLeft) / 2;
                    const labelY = visibleTop + Math.min(8, Math.max(3, (visibleBottom - visibleTop) * 0.12));
                    continentLabels.push(`<text x="${labelX}" y="${labelY}" font-size="${continentFontSize}" text-anchor="middle">K${continentY}${continentX}</text>`);
                }
            }

            const highlightedCoordinates = new Set([
                ...targets.keys(),
                ...withdrawals.keys(),
                ...enemies.keys()
            ]);
            const neutralCandidates = state.worldVillages.filter((village) => village.x >= minX && village.x <= maxX
                && village.y >= minY && village.y <= maxY
                && !highlightedCoordinates.has(village.coordinate));
            const neutralLimit = 1200;
            const neutralStep = Math.max(1, Math.ceil(neutralCandidates.length / neutralLimit));
            const neutralVillages = neutralCandidates.filter((village, index) => index % neutralStep === 0).slice(0, neutralLimit);
            const neutralAvailableCount = state.worldVillageBounds
                ? Math.max(neutralCandidates.length, state.worldVillageMatchCount - highlightedCoordinates.size)
                : 0;
            const contextSummary = state.worldVillageBounds
                ? `${formatNumber(neutralVillages.length)} de ${formatNumber(neutralAvailableCount)} outras aldeias`
                : 'contexto do mapa carregando em segundo plano';
            const neutralDots = neutralVillages.map((village) => {
                const title = `${village.ownerId ? 'OUTRA ALDEIA' : 'ALDEIA DE BÁRBAROS'} · ${village.name} (${village.coordinate}) · ${formatNumber(village.points)} pontos`;
                return `<circle class="cda-map-neutral" cx="${village.x}" cy="${village.y}" r="${radius * 0.52}"><title>${escapeHtml(title)}</title></circle>`;
            }).join('');

            const connections = [...targets.values()].map((target) => {
                const enemy = enemies.get(target.enemyCoordinate);
                if (!enemy) return '';
                return `<line class="cda-map-link" x1="${target.x}" y1="${target.y}" x2="${enemy.x}" y2="${enemy.y}" stroke-width="${lineWidth}"><title>${escapeHtml(`${target.coordinate} → ${enemy.coordinate} · ${urgencyLabel(target)}`)}</title></line>`;
            }).join('');
            const enemyDots = [...enemies.values()].map((enemy) => `
                <a href="${escapeHtml(mapLink(enemy))}" target="_blank"><circle class="cda-map-dot cda-map-enemy" cx="${enemy.x}" cy="${enemy.y}" r="${radius}">
                    <title>${escapeHtml(`INIMIGA · ${enemy.coordinate} · ${enemy.playerName}${enemy.allyTag ? ` [${enemy.allyTag}]` : ''} · ${formatNumber(enemy.points)} pontos`)}</title>
                </circle></a>`).join('');
            const targetDots = [...targets.values()].map((target) => {
                const result = resultByCoordinate.get(target.coordinate);
                const mapStatus = result?.status || 'excluded';
                const label = result ? statusText(result.status) : 'Fora do planejamento';
                return `<a href="${escapeHtml(mapLink(target))}" target="_blank"><circle class="cda-map-dot cda-map-${mapStatus}" cx="${target.x}" cy="${target.y}" r="${radius * 1.18}">
                    <title>${escapeHtml(`${label.toUpperCase()} · ${target.coordinate} · ${target.playerName || 'sem jogador'} · ${formatNumber(target.points)} pontos · ${urgencyLabel(target)}`)}</title>
                </circle></a>`;
            }).join('');
            const withdrawalDots = [...withdrawals.values()].map((village) => `
                <a href="${escapeHtml(mapLink(village))}" target="_blank"><circle class="cda-map-dot cda-map-withdrawal" cx="${village.x}" cy="${village.y}" r="${radius * 1.28}">
                    <title>${escapeHtml(`BLINDADA NA BLACKLIST · ${village.coordinate} · ${village.playerName || 'sem jogador'} · revisar retirada de apoios`)}</title>
                </circle></a>`).join('');

            return `<section class="cda-map-card">
                <div class="cda-map-head"><div><h3>Mapa — inimigos, cobertura e continentes</h3><small>Atualizado com o planejamento abaixo. Passe o mouse para detalhes e clique nas aldeias destacadas para abrir a coordenada.</small></div><strong>${formatNumber(enemies.size)} inimiga(s) · ${formatNumber(targets.size)} destino(s) · ${formatNumber(withdrawals.size)} retirada(s) · ${contextSummary}</strong></div>
                <div class="cda-map-legend">
                    <span><i class="cda-legend-enemy"></i>Inimiga</span><span><i class="cda-legend-covered"></i>Blind coberta</span><span><i class="cda-legend-partial"></i>Cobertura parcial</span><span><i class="cda-legend-uncovered"></i>Sem cobertura</span><span><i class="cda-legend-excluded"></i>Fora do planejamento</span><span><i class="cda-legend-withdrawal"></i>Blindada na blacklist</span><span><i class="cda-legend-neutral"></i>Outras aldeias</span><span><i class="cda-legend-continent"></i>Limite do continente</span><span><i class="cda-legend-link"></i>Ameaça mais próxima</span>
                </div>
                <div class="cda-map-wrap"><svg class="cda-risk-map" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa de inimigos e destinos do distribuidor de apoios">
                    <g class="cda-map-grid">${gridLines.join('')}</g><g class="cda-map-continent-lines">${continentLines.join('')}</g><g class="cda-map-continent-labels">${continentLabels.join('')}</g><g>${neutralDots}</g><g>${connections}</g><g>${enemyDots}</g><g>${targetDots}</g><g>${withdrawalDots}</g>
                </svg></div>
            </section>`;
        }

        function renderResults(config) {
            const panel = document.getElementById(SCRIPT_ID);
            const covered = state.targetResults.filter((item) => item.status === 'covered').length;
            const partial = state.targetResults.filter((item) => item.status === 'partial').length;
            const uncovered = state.targetResults.filter((item) => item.status === 'uncovered').length;
            const priorityResults = state.targetResults.filter((item) => isFourHourPriority(item.target));
            const priorityCovered = priorityResults.filter((item) => item.status === 'covered').length;
            const priorityComplete = priorityResults.length === 0 || priorityCovered === priorityResults.length;
            const visibleTargetResults = state.showAllResults ? state.targetResults : state.targetResults.slice(0, MAX_VISIBLE_TARGET_ROWS);
            const hiddenResultRows = Math.max(0, state.targetResults.length - visibleTargetResults.length);
            const assignedTotals = Object.fromEntries(UNITS.map((unit) => [
                unit.id,
                state.assignments.reduce((total, assignment) => total + assignment.units[unit.id], 0)
            ]));
            state.planning = buildPlanning();
            const planning = state.planning;

            panel.querySelector('.cda-results').innerHTML = `
                <div class="cda-summary">
                    <div><strong>${formatNumber(state.targets.length)}</strong><span>Alvos</span></div>
                    <div><strong>${formatNumber(state.allTargets.length - state.targets.length)}</strong><span>Destinos excluídos</span></div>
                    <div><strong>${formatNumber(state.blacklistedAlliedPlayers.size)}</strong><span>Aliados bloqueados geral</span></div>
                    <div><strong>${formatNumber(state.blacklistedPlayers.size)}</strong><span>Doadores bloqueados</span></div>
                    <div class="cda-covered"><strong>${formatNumber(covered)}</strong><span>Cobertos</span></div>
                    <div class="cda-partial"><strong>${formatNumber(partial)}</strong><span>Parciais</span></div>
                    <div class="cda-uncovered"><strong>${formatNumber(uncovered)}</strong><span>Sem cobertura</span></div>
                    <div class="${priorityComplete ? 'cda-covered' : 'cda-uncovered'}"><strong>${formatNumber(priorityCovered)}/${formatNumber(priorityResults.length)}</strong><span>Blinds até 4h fechados</span></div>
                    <div><strong>${formatNumber(planning.usableSources)}</strong><span>Origens com estoque</span></div>
                    <div><strong>${formatNumber(state.memberMessages.length)}</strong><span>MPs geradas</span></div>
                    <div><strong>${formatNumber(state.sourceExcludedCount)}</strong><span>Origens excluídas por continente</span></div>
                    <div><strong>${formatNumber(state.sourceThreatExcludedCount)}</strong><span>Origens ameaçadas ≤8h bloqueadas</span></div>
                    <div class="cda-covered"><strong>${formatNumber(state.sourceFastVerifiedCount)}</strong><span>Origens validadas no cruzamento rápido</span></div>
                    <div class="cda-covered"><strong>${formatNumber(state.sourceAuditVerifiedCount)}</strong><span>Origens validadas pela auditoria</span></div>
                    <div class="cda-uncovered"><strong>${formatNumber(state.sourceAuditExcludedCount)}</strong><span>Origens sem validação bloqueadas</span></div>
                    <div><strong>${formatNumber(state.sourceAuditAdjustedCount)}</strong><span>Origens com apoio externo descontado</span></div>
                    <div><strong>${formatNumber(state.ignoredEnemyTargets.length)}</strong><span>Destinos ignorados por inimigo</span></div>
                </div>
                ${renderDistributionMap()}
                <div class="cda-storage-info">
                    Tropas coletadas em <strong>${escapeHtml(formatAge(state.troopPayload.savedAt))}</strong> ·
                    blind calculado em <strong>${escapeHtml(formatAge(state.blindPayload.savedAt))}</strong> ·
                    continentes da análise: <strong>${escapeHtml(analyzedContinentsLabel())}</strong> ·
                    rotas de apoio: <strong>${escapeHtml(continentRoutesLabel())}</strong> ·
                    validação de propriedade: <strong>${config.verifySourceOwnership ? `ativa · ${formatNumber(state.sourceFastVerifiedCount)} rápida(s) + ${formatNumber(state.sourceAuditVerifiedCount)} detalhada(s)` : 'desativada'}</strong> ·
                    reserva por aldeia: ${UNITS.map((unit) => `${escapeHtml(unit.label)} ${formatNumber(config.reserves[unit.id])}`).join(' · ')}.
                </div>
                <div class="cda-feasibility ${planning.canCoverAll || priorityComplete ? 'cda-feasibility-ok' : 'cda-feasibility-missing'}">
                    <strong>${planning.canCoverAll
                        ? 'SIM — o estoque parado disponível consegue blindar todos os alvos.'
                        : priorityResults.length && priorityComplete
                            ? 'PRIORIDADE ATÉ 4H 100% BLINDADA — o estoque restante não fecha todas as faixas acima de 4h.'
                            : priorityResults.length
                                ? 'ATENÇÃO — o estoque e as regras atuais ainda não fecham 100% dos blinds até 4h.'
                                : 'NÃO — o estoque e as regras atuais não conseguem blindar todos os alvos acima de 4h.'}</strong>
                    <span>${planning.canCoverAll ? 'O planejamento abaixo cobre todos os déficits.' : `Falta total: ${UNITS.filter((unit) => planning.missing[unit.id] > 0).map((unit) => `${escapeHtml(unit.label)} ${formatNumber(planning.missing[unit.id])}`).join(' · ') || 'há restrições de distribuição'}. A faixa até 4h sempre é processada antes das demais.`}</span>
                </div>
                <h3>Capacidade do estoque parado</h3>
                <div class="cda-table-wrap"><table class="vis cda-table cda-planning-table">
                    <thead><tr><th>Unidade</th><th>Estoque na aldeia</th><th>Reserva mantida</th><th>Disponível</th><th>Necessário</th><th>Planejado</th><th>Falta</th><th>Sobra</th></tr></thead>
                    <tbody>${UNITS.map((unit) => `<tr>
                        <th>${escapeHtml(unit.label)}</th>
                        <td>${formatNumber(planning.stock[unit.id])}</td>
                        <td>${formatNumber(planning.reserved[unit.id])}</td>
                        <td><strong>${formatNumber(planning.available[unit.id])}</strong></td>
                        <td>${formatNumber(planning.required[unit.id])}</td>
                        <td>${formatNumber(planning.planned[unit.id])}</td>
                        <td class="${planning.missing[unit.id] > 0 ? 'cda-number-missing' : 'cda-number-ok'}"><strong>${formatNumber(planning.missing[unit.id])}</strong></td>
                        <td class="cda-number-ok">${formatNumber(planning.surplus[unit.id])}</td>
                    </tr>`).join('')}</tbody>
                </table></div>
                <p class="cda-planning-note">${config.verifySourceOwnership ? `Modo seguro ativo: o cruzamento rápido por membro valida automaticamente as aldeias cujo total próprio fecha exatamente com “Na aldeia + fora”. Somente divergências usam a auditoria detalhada das últimas 24 horas. Quando ela encontra apoios externos, eles são descontados antes da reserva e da distribuição: ${UNITS.map((unit) => `${escapeHtml(unit.label)} ${formatNumber(state.sourceAuditSubtracted[unit.id])}`).join(' · ')}. Resultados parciais, erros e origens não validadas permanecem bloqueados.` : 'A validação de propriedade está desativada; a coluna “Na aldeia” pode incluir apoios de terceiros e não é segura para definir o estoque do doador.'} Tropas em trânsito ou retornando não entram no estoque. As rotas limitam cada destino aos continentes configurados. Com a proteção de front ativa, somente a aldeia ameaçada em até 8h é bloqueada; outras aldeias do mesmo jogador continuam disponíveis.</p>
                <h3>Cobertura dos alvos</h3>
                <div class="cda-table-wrap"><table class="vis cda-table">
                    <thead><tr><th>Status</th><th>Urgência</th><th>Aldeia</th><th>Jogador</th>${UNITS.map((unit) => `<th>${escapeHtml(unit.label)}<small>enviado / ainda falta</small></th>`).join('')}</tr></thead>
                    <tbody>${visibleTargetResults.map((result) => `<tr class="cda-${result.status}">
                        <td><strong>${escapeHtml(statusText(result.status))}</strong></td>
                        <td>${escapeHtml(urgencyLabel(result.target))}</td>
                        <td><span class="cda-coord">${escapeHtml(result.target.coordinate)}</span><small>${escapeHtml(result.target.name || '')}</small></td>
                        <td>${escapeHtml(result.target.playerName || '-')}</td>
                        ${UNITS.map((unit) => `<td>${formatNumber(result.allocated[unit.id])} / <strong>${formatNumber(result.remaining[unit.id])}</strong></td>`).join('')}
                    </tr>`).join('')}</tbody>
                    <tfoot><tr><th colspan="4">Total distribuído</th>${UNITS.map((unit) => `<th>${formatNumber(assignedTotals[unit.id])}</th>`).join('')}</tr></tfoot>
                </table></div>
                ${hiddenResultRows ? `<div class="cda-row-limit-note">Exibindo os primeiros ${formatNumber(visibleTargetResults.length)} de ${formatNumber(state.targetResults.length)} resultados. Os totais e as MPs consideram todos. <button type="button" class="btn" data-action="show-all-results">Mostrar todos</button></div>` : ''}
                <h3>Mensagens privadas por membro</h3>
                ${state.memberMessages.length ? `<div class="cda-messages">${state.memberMessages.map((message, index) => `
                    <section class="cda-message">
                        <div class="cda-message-head">
                            <strong>${escapeHtml(message.playerName)}</strong>
                            <span>${formatNumber(message.orders.length)} destino(s)</span>
                            <button type="button" class="btn" data-copy-message="${index}">Copiar MP</button>
                        </div>
                        <textarea readonly>${escapeHtml(message.text)}</textarea>
                    </section>`).join('')}</div>` : '<div class="cda-empty">Nenhuma MP foi gerada porque não há tropas disponíveis após as reservas.</div>'}`;

            panel.querySelector('[data-action="copy-all"]').disabled = !state.memberMessages.length;
            panel.querySelector('[data-action="download-all"]').disabled = !state.memberMessages.length;
            panel.querySelector('[data-action="prepare-messages"]').disabled = !state.memberMessages.length;
            panel.querySelector('[data-action="copy-planning"]').disabled = false;
            loadWorldVillagesForCurrentMap();
        }

        async function copyText(text, successMessage) {
            try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
                else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    textarea.remove();
                }
                notify(successMessage);
            } catch (error) {
                console.error('[Chong Tribe Script] Falha ao copiar:', error);
                notify('Não foi possível copiar o texto.', 'error');
            }
        }

        function allMessagesText() {
            return state.memberMessages.map((message) => [
                `================ MP PARA: ${message.playerName} ================`,
                message.text
            ].join('\n')).join('\n\n');
        }

        function prepareMessageQueue() {
            if (!state.memberMessages.length) return;
            const now = new Date().toISOString();
            const payload = {
                version: 1,
                world: worldId(),
                createdAt: now,
                subject: 'Pedido de apoio preventivo',
                items: state.memberMessages.map((message, index) => ({
                    id: `${Date.now()}-${index}`,
                    recipient: message.playerName,
                    subject: 'Pedido de apoio preventivo',
                    body: message.text,
                    selected: true,
                    status: 'pending',
                    attempts: 0,
                    error: '',
                    sentAt: null
                }))
            };
            localStorage.setItem(`${MESSAGE_QUEUE_PREFIX}:${worldId()}`, JSON.stringify(payload));
            notify(`${formatNumber(payload.items.length)} MP(s) adicionada(s) à fila.`);
            const url = new URL(window.location.href);
            url.searchParams.set('screen', 'mail');
            url.searchParams.set('mode', 'new');
            window.location.assign(url.toString());
        }

        function downloadAll() {
            if (!state.memberMessages.length) return;
            const blob = new Blob([allMessagesText()], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `apoios-${worldId()}-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }

        function bindEvents(panel) {
            panel.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (!button) return;
                const action = button.dataset.action;
                if (action === 'distribute') distribute();
                if (action === 'copy-planning' && state.planning) copyText(planningText(), 'Resumo do planejamento copiado.');
                if (action === 'copy-all' && state.memberMessages.length) copyText(allMessagesText(), 'Todas as MPs foram copiadas.');
                if (action === 'download-all') downloadAll();
                if (action === 'prepare-messages') prepareMessageQueue();
                if (action === 'copy-withdrawals' && state.blacklistedDefended.length) copyText(withdrawalRequestText(), 'Pedido de retirada copiado.');
                if (action === 'select-all-targets') {
                    state.manualExcludedTargets.clear();
                    distribute();
                }
                if (action === 'clear-all-targets') {
                    state.allTargets.forEach((target) => state.manualExcludedTargets.add(target.coordinate));
                    state.manualIncludedLowPointTargets.clear();
                    distribute();
                }
                if (action === 'show-all-targets') {
                    state.showAllTargets = true;
                    renderTargetSelection();
                }
                if (action === 'show-all-results' && state.planning) {
                    state.showAllResults = true;
                    renderResults(readInputs());
                }
                if (button.dataset.copyMessage !== undefined) {
                    const message = state.memberMessages[number(button.dataset.copyMessage)];
                    if (message) copyText(message.text, `MP de ${message.playerName} copiada.`);
                }
            });
            panel.addEventListener('change', (event) => {
                if (event.target.name === 'blind_snapshot') {
                    state.selectedBlindSnapshotId = event.target.value;
                    saveConfig(readInputs());
                    resetPlanningSession();
                    const selected = state.blindPayloadOptions.find((option) => option.id === event.target.value);
                    panel.querySelector('.cda-results').innerHTML = `<div class="cda-empty">${selected
                        ? `Lote selecionado: <strong>${escapeHtml(selected.label)}</strong>. Clique em “Distribuir apoios” para calcular.`
                        : 'Selecione uma análise de blind válida.'}</div>`;
                    return;
                }
                const coordinate = event.target.dataset.targetCoordinate;
                if (!coordinate) return;
                if (event.target.dataset.lowPoint === '1') {
                    const target = state.allTargets.find((item) => item.coordinate === coordinate);
                    if (target && isFourHourPriority(target)) {
                        if (event.target.checked) state.manualExcludedTargets.delete(coordinate);
                        else state.manualExcludedTargets.add(coordinate);
                    } else {
                        if (event.target.checked) {
                            state.manualIncludedLowPointTargets.add(coordinate);
                            state.manualExcludedTargets.delete(coordinate);
                        } else {
                            state.manualIncludedLowPointTargets.delete(coordinate);
                        }
                    }
                } else if (event.target.checked) state.manualExcludedTargets.delete(coordinate);
                else state.manualExcludedTargets.add(coordinate);
                distribute();
            });
        }

        function injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID} { margin: 10px 0 16px; padding: 10px; background: #f4e4bc; border: 1px solid #804000; box-shadow: 0 2px 5px rgba(0,0,0,.22); color: #2b1605; }
                #${SCRIPT_ID} * { box-sizing: border-box; }
                #${SCRIPT_ID} h2 { margin: 0 0 4px; color: #4d2507; }
                #${SCRIPT_ID} h3 { margin: 14px 0 6px; }
                #${SCRIPT_ID} .cda-intro { margin: 0 0 10px; }
                #${SCRIPT_ID} .cda-controls { display: flex; align-items: end; gap: 8px; flex-wrap: wrap; padding: 8px; background: #ead5a0; border: 1px solid #c29b58; }
                #${SCRIPT_ID} .cda-analysis-selector { flex: 1 1 100%; padding: 8px; border: 1px solid #a47738; background: #fff3cf; }
                #${SCRIPT_ID} .cda-analysis-selector select { width: 100%; padding: 6px; border: 1px solid #9b713c; background: #fffdf5; }
                #${SCRIPT_ID} .cda-analysis-selector small { color: #6c5439; font-size: 10px; font-weight: normal; }
                #${SCRIPT_ID} label { display: grid; gap: 3px; font-weight: bold; }
                #${SCRIPT_ID} label span { font-size: 11px; }
                #${SCRIPT_ID} input[type="number"] { width: 105px; padding: 5px; }
                #${SCRIPT_ID} .cda-blacklist { min-width: 250px; flex: 1; }
                #${SCRIPT_ID} .cda-blacklist textarea { width: 100%; min-height: 45px; padding: 5px; resize: vertical; }
                #${SCRIPT_ID} .cda-check { display: flex; align-items: center; min-height: 29px; max-width: 440px; font-weight: normal; }
                #${SCRIPT_ID} .cda-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
                #${SCRIPT_ID} .cda-primary { background: #3c7c24; color: #fff; border-color: #21500f; font-weight: bold; }
                #${SCRIPT_ID} .cda-empty { padding: 16px; margin-top: 10px; text-align: center; background: #fff4d6; border: 1px dashed #b48a45; }
                #${SCRIPT_ID} .cda-calculating { display: grid; gap: 5px; }
                #${SCRIPT_ID} .cda-row-limit-note { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px; border-top: 1px dashed #b48a45; background: #fff8e5; color: #6c5439; font-size: 11px; }
                #${SCRIPT_ID} .cda-target-selection { margin-top: 10px; border: 1px solid #a47738; background: #fff2cc; }
                #${SCRIPT_ID} .cda-target-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 7px; background: #d9b56f; }
                #${SCRIPT_ID} .cda-target-head span { margin-right: auto; font-size: 11px; }
                #${SCRIPT_ID} .cda-low-review { margin-bottom: 10px; border: 2px solid #c36b2d; background: #ffe2b8; }
                #${SCRIPT_ID} .cda-low-review-head { display: grid; gap: 3px; padding: 8px; background: #e8a35a; color: #3f2107; }
                #${SCRIPT_ID} .cda-low-review-head span { font-size: 11px; }
                #${SCRIPT_ID} .cda-low-points { background: #fff0d9; }
                #${SCRIPT_ID} .cda-withdrawal-review { display: grid; gap: 7px; margin-bottom: 10px; padding: 8px; border: 2px solid #7b3fa1; background: #f1ddfb; }
                #${SCRIPT_ID} .cda-withdrawal-review > span, #${SCRIPT_ID} .cda-withdrawal-note { color: #5e346f; }
                #${SCRIPT_ID} .cda-withdrawal-warning { border-color: #c36b2d; background: #ffe2b8; }
                #${SCRIPT_ID} .cda-ignore-review { display: grid; gap: 7px; margin-bottom: 10px; padding: 8px; border: 2px solid #39769b; background: #dcedf7; }
                #${SCRIPT_ID} .cda-ignore-review > div:first-child { display: grid; gap: 3px; }
                #${SCRIPT_ID} .cda-ignore-review span { color: #315b73; font-size: 11px; }
                #${SCRIPT_ID} .cda-withdrawal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
                #${SCRIPT_ID} .cda-withdrawal-head > div { display: grid; gap: 3px; }
                #${SCRIPT_ID} .cda-withdrawal-head span { font-size: 11px; }
                #${SCRIPT_ID} .cda-target-list { max-height: 300px; overflow: auto; }
                #${SCRIPT_ID} .cda-target-list .cda-table { margin: 0; }
                #${SCRIPT_ID} .cda-target-excluded { opacity: .55; background: #ead9bd; }
                #${SCRIPT_ID} .cda-summary { display: grid; grid-template-columns: repeat(6, minmax(110px, 1fr)); gap: 7px; margin: 10px 0; }
                #${SCRIPT_ID} .cda-summary div { display: grid; justify-items: center; padding: 7px; background: #fff3d0; border: 1px solid #c9a566; }
                #${SCRIPT_ID} .cda-summary strong { font-size: 20px; }
                #${SCRIPT_ID} .cda-summary span { font-size: 11px; }
                #${SCRIPT_ID} .cda-covered strong { color: #23750d; }
                #${SCRIPT_ID} .cda-partial strong { color: #ba6500; }
                #${SCRIPT_ID} .cda-uncovered strong { color: #a01818; }
                #${SCRIPT_ID} .cda-storage-info { padding: 7px; background: #fff8e5; border-left: 4px solid #95631c; }
                #${SCRIPT_ID} .cda-map-card { margin: 10px 0; border: 1px solid #a47738; background: #fff2cc; }
                #${SCRIPT_ID} .cda-map-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px; background: #d9b56f; }
                #${SCRIPT_ID} .cda-map-head h3 { margin: 0 0 2px; }
                #${SCRIPT_ID} .cda-map-head small { display: block; color: #65451e; }
                #${SCRIPT_ID} .cda-map-legend { display: flex; flex-wrap: wrap; gap: 10px; padding: 7px 9px; border-bottom: 1px solid #c9a566; font-size: 11px; }
                #${SCRIPT_ID} .cda-map-legend span { display: inline-flex; align-items: center; gap: 4px; }
                #${SCRIPT_ID} .cda-map-legend i { width: 10px; height: 10px; border: 1px solid rgba(0,0,0,.55); border-radius: 50%; }
                #${SCRIPT_ID} .cda-legend-enemy { background: #7f1d1d; }
                #${SCRIPT_ID} .cda-legend-covered { background: #16853a; }
                #${SCRIPT_ID} .cda-legend-partial { background: #e58b19; }
                #${SCRIPT_ID} .cda-legend-uncovered { background: #d63b31; }
                #${SCRIPT_ID} .cda-legend-excluded { background: #7c8492; }
                #${SCRIPT_ID} .cda-legend-withdrawal { background: #8e44ad; }
                #${SCRIPT_ID} .cda-legend-neutral { background: #928d7f; }
                #${SCRIPT_ID} .cda-legend-continent { width: 18px !important; height: 0 !important; border: 0 !important; border-top: 3px solid #513a1c !important; border-radius: 0 !important; }
                #${SCRIPT_ID} .cda-legend-link { width: 18px !important; height: 0 !important; border: 0 !important; border-top: 2px dashed #81592c !important; border-radius: 0 !important; }
                #${SCRIPT_ID} .cda-map-wrap { height: 460px; min-height: 300px; overflow: hidden; background: #e5d29e; }
                #${SCRIPT_ID} .cda-risk-map { display: block; width: 100%; height: 100%; }
                #${SCRIPT_ID} .cda-map-grid line { stroke: #9f875b; stroke-width: .12; vector-effect: non-scaling-stroke; opacity: .35; }
                #${SCRIPT_ID} .cda-map-continent-lines line { stroke: #513a1c; stroke-width: 1.6; vector-effect: non-scaling-stroke; opacity: .78; }
                #${SCRIPT_ID} .cda-map-continent-labels text { fill: #513a1c; font-weight: 800; opacity: .72; pointer-events: none; paint-order: stroke; stroke: #f3dfaa; stroke-width: .8; stroke-linejoin: round; }
                #${SCRIPT_ID} .cda-map-neutral { fill: #928d7f; opacity: .58; stroke: #e8dbb8; stroke-width: .1; vector-effect: non-scaling-stroke; }
                #${SCRIPT_ID} .cda-map-neutral:hover { fill: #4e4a42; opacity: 1; }
                #${SCRIPT_ID} .cda-map-link { stroke: #81592c; stroke-dasharray: .9 .65; vector-effect: non-scaling-stroke; opacity: .34; }
                #${SCRIPT_ID} .cda-map-dot { stroke: #fff8df; stroke-width: .22; vector-effect: non-scaling-stroke; cursor: pointer; }
                #${SCRIPT_ID} .cda-map-dot:hover { stroke: #111; stroke-width: .6; }
                #${SCRIPT_ID} .cda-map-enemy { fill: #7f1d1d; }
                #${SCRIPT_ID} .cda-map-covered { fill: #16853a; }
                #${SCRIPT_ID} .cda-map-partial { fill: #e58b19; }
                #${SCRIPT_ID} .cda-map-uncovered { fill: #d63b31; }
                #${SCRIPT_ID} .cda-map-excluded { fill: #7c8492; }
                #${SCRIPT_ID} .cda-map-withdrawal { fill: #8e44ad; }
                #${SCRIPT_ID} .cda-feasibility { display: grid; gap: 3px; margin: 10px 0; padding: 11px; border: 2px solid; font-size: 12px; }
                #${SCRIPT_ID} .cda-feasibility strong { font-size: 15px; }
                #${SCRIPT_ID} .cda-feasibility-ok { border-color: #3d8b25; background: #e5f4d9; color: #275d17; }
                #${SCRIPT_ID} .cda-feasibility-missing { border-color: #b5362e; background: #f9ded7; color: #8d1e18; }
                #${SCRIPT_ID} .cda-table-wrap { overflow: auto; max-height: 430px; }
                #${SCRIPT_ID} .cda-table { width: 100%; border-collapse: collapse; }
                #${SCRIPT_ID} .cda-table th, #${SCRIPT_ID} .cda-table td { padding: 4px 6px; text-align: center; white-space: nowrap; }
                #${SCRIPT_ID} .cda-table th small, #${SCRIPT_ID} .cda-table td small { display: block; font-weight: normal; color: #6c5439; }
                #${SCRIPT_ID} .cda-coord { color: #7d1515; font-weight: bold; }
                #${SCRIPT_ID} .cda-covered td:first-child { color: #23750d; }
                #${SCRIPT_ID} .cda-partial td:first-child { color: #a75a00; }
                #${SCRIPT_ID} .cda-uncovered td:first-child { color: #a01818; }
                #${SCRIPT_ID} .cda-planning-table { max-width: 1050px; }
                #${SCRIPT_ID} .cda-number-missing { color: #a01818; background: #f8d9cf; }
                #${SCRIPT_ID} .cda-number-ok { color: #23750d; }
                #${SCRIPT_ID} .cda-planning-note { margin: 5px 0 12px; color: #6c5439; font-size: 11px; }
                #${SCRIPT_ID} .cda-messages { display: grid; grid-template-columns: repeat(auto-fit, minmax(410px, 1fr)); gap: 10px; }
                #${SCRIPT_ID} .cda-message { border: 1px solid #a47738; background: #fff2cc; }
                #${SCRIPT_ID} .cda-message-head { display: flex; align-items: center; gap: 8px; padding: 6px; background: #d9b56f; }
                #${SCRIPT_ID} .cda-message-head span { margin-left: auto; }
                #${SCRIPT_ID} .cda-message textarea { display: block; width: 100%; height: 210px; padding: 7px; resize: vertical; border: 0; border-top: 1px solid #a47738; font: 12px/1.35 Consolas, monospace; background: #fffaf0; }
                @media (max-width: 900px) {
                    #${SCRIPT_ID} .cda-summary { grid-template-columns: repeat(2, 1fr); }
                    #${SCRIPT_ID} .cda-actions { margin-left: 0; }
                    #${SCRIPT_ID} .cda-messages { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} .cda-map-head { align-items: flex-start; flex-direction: column; }
                    #${SCRIPT_ID} .cda-map-wrap { height: 340px; }
                    #${SCRIPT_ID} .cda-withdrawal-head { align-items: flex-start; flex-direction: column; }
                }
            `;
            document.head.appendChild(style);
        }

        function mount() {
            const config = loadConfig();
            state.blindPayloadOptions = collectBlindPayloadOptions();
            const initialBlindOption = state.blindPayloadOptions.find((option) => option.id === config.blindSnapshotId)
                || state.blindPayloadOptions[0]
                || null;
            state.selectedBlindSnapshotId = initialBlindOption?.id || '';
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <h2>Chong Tribe Script — Distribuidor de Apoios</h2>
                <p class="cda-intro">Cruza o déficit salvo pelo Blind Preventivo com as tropas <strong>Na aldeia</strong>, respeitando as rotas entre continentes e priorizando jogadores da retaguarda. No modo seguro, uma origem só é usada depois da <strong>Auditoria de Apoios</strong>: quantidades externas conhecidas são descontadas e aldeias auditadas sem apoio visível usam o estoque parado integral. Aldeias aliadas com menos de <strong>${formatNumber(MIN_ALLIED_TARGET_POINTS)} pontos</strong> ficam fora do cálculo automático, mas aparecem para revisão manual. Tropas <strong>a caminho</strong> não são usadas e nada é enviado automaticamente.</p>
                <div class="cda-controls">
                    <label class="cda-analysis-selector"><span>Análise de blind que será distribuída</span>
                        <select name="blind_snapshot" ${state.blindPayloadOptions.length ? '' : 'disabled'}>
                            ${state.blindPayloadOptions.length
                                ? state.blindPayloadOptions.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === state.selectedBlindSnapshotId ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
                                : '<option value="">Nenhuma análise salva encontrada</option>'}
                        </select>
                        <small>As análises feitas pela aba “Blind por coordenadas” ficam salvas como lotes separados para você escolher aqui.</small>
                    </label>
                    ${UNITS.map((unit) => `<label><span>Reserva de ${escapeHtml(unit.label)}</span><input type="number" min="0" step="100" name="reserve_${unit.id}" value="${number(config.reserves?.[unit.id] ?? DEFAULT_RESERVES[unit.id])}"></label>`).join('')}
                    <label class="cda-check cda-safe-check"><input type="checkbox" name="verify_source_ownership" ${config.verifySourceOwnership !== false ? 'checked' : ''}> Modo seguro: aceitar o cruzamento rápido Tropas × Defesa; usar auditoria detalhada somente nas divergências</label>
                    <label class="cda-check"><input type="checkbox" name="exclude_targets" ${config.excludeTargets !== false ? 'checked' : ''}> Bloquear como origem cada aldeia ameaçada em até 8h; aldeias seguras do mesmo jogador continuam permitidas</label>
                    <label class="cda-blacklist"><span>Blacklist de destinos — coordenadas separadas por espaço, ; ou linha</span><textarea name="target_blacklist" placeholder="Ex.: 456|618; 451|619">${escapeHtml(config.blacklistInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Continentes onde não queremos blindar — separados por espaço, ; ou linha</span><textarea name="continent_blacklist" placeholder="Ex.: K64; K65; K74">${escapeHtml(config.continentBlacklistInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Continentes que não podem enviar apoio — aldeias de origem bloqueadas</span><textarea name="source_continent_blacklist" placeholder="Ex.: K54; K55">${escapeHtml(config.sourceContinentBlacklistInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Rotas de apoio — um destino por linha no formato DESTINO: ORIGENS PERMITIDAS</span><textarea name="continent_routes" placeholder="K74: K74, K73, K63&#10;K64: K63, K64&#10;K54: K64, K54, K53">${escapeHtml(config.continentRoutesInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Blacklist geral de jogadores aliados — não enviam apoio e não recebem blindagem</span><textarea name="allied_player_blacklist" placeholder="Ex.: JogadorQueSaiu; JogadorSemParticipação">${escapeHtml(config.alliedPlayerBlacklistInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Blacklist de jogadores doadores — nomes separados por ; ou linha</span><textarea name="player_blacklist" placeholder="Ex.: JogadorFront1; JogadorFront2">${escapeHtml(config.playerBlacklistInput || '')}</textarea></label>
                    <label class="cda-blacklist"><span>Nicks inimigos que não devem contar como ameaça — separados por ; ou linha</span><textarea name="ignored_enemy_players" placeholder="Ex.: JogadorQueVemParaTribo">${escapeHtml(config.ignoredEnemyInput || '')}</textarea></label>
                    <div class="cda-actions">
                        <button type="button" class="btn cda-primary" data-action="distribute">Distribuir apoios</button>
                        <button type="button" class="btn" data-action="copy-planning" disabled>Copiar planejamento</button>
                        <button type="button" class="btn" data-action="copy-all" disabled>Copiar todas as MPs</button>
                        <button type="button" class="btn" data-action="download-all" disabled>Baixar TXT</button>
                        <button type="button" class="btn cda-primary" data-action="prepare-messages" disabled>Preparar envio das MPs</button>
                    </div>
                </div>
                <div class="cda-target-selection"></div>
                <div class="cda-results"><div class="cda-empty">Configure as reservas e clique em “Distribuir apoios”. Os alvos mais urgentes recebem primeiro as tropas dos jogadores mais distantes capazes de cobrir o pedido.</div></div>`;

            const host = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            host.prepend(panel);
            injectStyles();
            bindEvents(panel);
            resetPlanningSession();
            window.addEventListener('pageshow', (event) => {
                if (event.persisted) resetPlanningSession();
            });
        }

        mount();
    }());

    // -------------------------------------------------------------------------
    // Módulo: Montador de Operações
    // -------------------------------------------------------------------------
    (() => {
        'use strict';

        const SCRIPT_ID = 'chonguera-montador-operacoes';
        const TROOP_STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const CONFIG_PREFIX = 'chonguera_montador_operacoes_config';
        const UNIT_META = [
            { id: 'axe', label: 'Machados', default: 6000 },
            { id: 'light', label: 'Cavalaria leve', default: 2500 },
            { id: 'marcher', label: 'Arqueiros a cavalo', default: 0 },
            { id: 'ram', label: 'Aríetes', default: 200 },
            { id: 'catapult', label: 'Catapultas', default: 0 },
            { id: 'spy', label: 'Exploradores', default: 0 },
            { id: 'snob', label: 'Nobres', default: 0 }
        ];

        if (!isMembersPage() || document.getElementById(SCRIPT_ID)) return;

        const state = {
            payload: null,
            units: [],
            candidates: [],
            targets: [],
            assignments: [],
            missing: [],
            messages: [],
            operationAt: '',
            targetPointsWarning: '',
            runSequence: 0
        };

        function isMembersPage() {
            const query = new URLSearchParams(window.location.search);
            return query.get('screen') === 'ally' && query.get('mode') === 'members';
        }

        function worldId() {
            return String(window.game_data?.world || window.location.hostname);
        }

        function allyId() {
            const value = window.game_data?.player?.ally;
            return ['string', 'number'].includes(typeof value) && String(value) ? String(value) : 'tribo-atual';
        }

        function configKey() {
            return `${CONFIG_PREFIX}:${worldId()}`;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function normalizeName(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        }

        function num(value) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(num(value));
        }

        function parseCoordinate(value) {
            const match = String(value || '').match(/(\d{3})\|(\d{3})/);
            return match ? { coordinate: `${match[1]}|${match[2]}`, x: Number(match[1]), y: Number(match[2]) } : null;
        }

        function continentOf(point) {
            return `K${Math.floor(Number(point.y) / 100)}${Math.floor(Number(point.x) / 100)}`;
        }

        function parseContinents(value) {
            const result = new Set();
            String(value || '').split(/[;,\s]+/).filter(Boolean).forEach((token) => {
                const normalized = token.toUpperCase().replace(/^K/, '');
                if (/^\d{1,2}$/.test(normalized)) result.add(`K${normalized.padStart(2, '0')}`);
            });
            return result;
        }

        function parseNames(value) {
            return new Set(String(value || '').split(/[;\n]+/).map(normalizeName).filter(Boolean));
        }

        function distance(a, b) {
            return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
        }

        function formatDistance(value) {
            return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
        }

        function findTroopPayload() {
            const preferred = localStorage.getItem(`${TROOP_STORAGE_PREFIX}:${worldId()}:${allyId()}`);
            if (preferred) return preferred;
            for (let index = 0; index < localStorage.length; index += 1) {
                const key = localStorage.key(index);
                if (key?.startsWith(`${TROOP_STORAGE_PREFIX}:`) && key.includes(`:${worldId()}:`)) {
                    const raw = localStorage.getItem(key);
                    if (raw) return raw;
                }
            }
            return null;
        }

        function loadPayload() {
            try {
                const payload = JSON.parse(findTroopPayload() || 'null');
                return payload?.version === 2 && Array.isArray(payload.results) ? payload : null;
            } catch (error) {
                console.warn('[Montador de Operações] Dados de tropas inválidos:', error);
                return null;
            }
        }

        function detectedUnits(payload) {
            const stored = new Set(payload?.unitOrder || []);
            (payload?.results || []).forEach((player) => (player.villageDetails || []).forEach((village) => {
                Object.keys(village.home || {}).forEach((unit) => stored.add(unit));
            }));
            return UNIT_META.filter((unit) => stored.has(unit.id));
        }

        function loadConfig() {
            try {
                return {
                    thresholds: Object.fromEntries(UNIT_META.map((unit) => [unit.id, unit.default])),
                    defaultFulls: 5,
                    quantityMode: 'fixed',
                    pointFulls: { low: '', medium: '', high: '' },
                    includeContinents: '',
                    excludeContinents: '',
                    playerBlacklist: '',
                    strategy: 'balanced-nearest',
                    operationAt: '',
                    targets: '',
                    ...JSON.parse(localStorage.getItem(configKey()) || '{}')
                };
            } catch (_error) {
                return { thresholds: {}, defaultFulls: 5, quantityMode: 'fixed', pointFulls: { low: '', medium: '', high: '' }, strategy: 'balanced-nearest', operationAt: '' };
            }
        }

        function saveConfig(config) {
            localStorage.setItem(configKey(), JSON.stringify(config));
        }

        function parseTargets(text, defaultFulls) {
            const targets = new Map();
            String(text || '').split(/\n+/).forEach((line) => {
                const coord = parseCoordinate(line);
                if (!coord) return;
                const suffix = line.slice(line.indexOf(coord.coordinate) + coord.coordinate.length);
                const countMatch = suffix.match(/\d+/);
                const explicitCount = Boolean(countMatch);
                const count = explicitCount ? Math.max(1, num(countMatch[0])) : Math.max(1, num(defaultFulls));
                if (!targets.has(coord.coordinate)) targets.set(coord.coordinate, { ...coord, count, explicitCount, points: null, inputOrder: targets.size });
            });
            return [...targets.values()];
        }

        function fullsForTargetPoints(points, pointFulls) {
            const value = num(points);
            if (value < 6000) return num(pointFulls.low);
            if (value <= 9000) return num(pointFulls.medium);
            return num(pointFulls.high);
        }

        async function loadTargetPointsAndCounts(targets, config) {
            state.targetPointsWarning = '';
            const usesPointQuantities = config.quantityMode === 'points' && targets.some((target) => !target.explicitCount);
            if (usesPointQuantities && (!num(config.pointFulls?.low) || !num(config.pointFulls?.medium) || !num(config.pointFulls?.high))) {
                throw new Error('Informe a quantidade de fulls para as três faixas de pontos antes de montar a operação.');
            }
            if (!targets.length) return targets;
            const wanted = new Set(targets.map((target) => target.coordinate));
            try {
                const response = await fetch('/map/village.txt', { credentials: 'same-origin' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const text = await response.text();
                const pointsByCoordinate = new Map();
                text.split(/\r?\n/).forEach((line) => {
                    if (!line) return;
                    const fields = line.split(',');
                    const coordinate = `${fields[2]}|${fields[3]}`;
                    if (wanted.has(coordinate)) pointsByCoordinate.set(coordinate, num(fields[5]));
                });
                targets.forEach((target) => {
                    const points = pointsByCoordinate.get(target.coordinate);
                    if (points === undefined) return;
                    target.points = points;
                    if (!target.explicitCount && config.quantityMode === 'points') {
                        target.count = fullsForTargetPoints(points, config.pointFulls);
                    }
                });
                const missingPoints = targets.filter((target) => target.points === null).length;
                if (missingPoints) state.targetPointsWarning = `${missingPoints} alvo(s) não foram encontrados no mapa; eles permanecerão depois dos alvos com pontuação conhecida.${config.quantityMode === 'points' ? ' Neles foi mantida a quantidade padrão.' : ''}`;
            } catch (error) {
                console.warn('[Montador de Operações] Falha ao carregar pontos dos alvos:', error);
                state.targetPointsWarning = `Não foi possível carregar os pontos dos alvos; foi mantida a ordem informada.${config.quantityMode === 'points' ? ' Também foi mantida a quantidade padrão.' : ''}`;
            }
            targets.sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || a.inputOrder - b.inputOrder);
            return targets;
        }

        function formatOperationAt(value) {
            const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
            return match ? `${match[3]}/${match[2]}/${match[1]} às ${match[4]}:${match[5]}` : '';
        }

        function readForm() {
            const panel = document.getElementById(SCRIPT_ID);
            return {
                thresholds: Object.fromEntries(state.units.map((unit) => [unit.id, num(panel.querySelector(`[data-unit="${unit.id}"]`)?.value)])),
                defaultFulls: Math.max(1, num(panel.querySelector('[name="default_fulls"]').value)),
                quantityMode: panel.querySelector('[name="quantity_mode"]').value,
                pointFulls: {
                    low: num(panel.querySelector('[name="point_fulls_low"]').value),
                    medium: num(panel.querySelector('[name="point_fulls_medium"]').value),
                    high: num(panel.querySelector('[name="point_fulls_high"]').value)
                },
                includeContinents: panel.querySelector('[name="include_continents"]').value,
                excludeContinents: panel.querySelector('[name="exclude_continents"]').value,
                playerBlacklist: panel.querySelector('[name="player_blacklist"]').value,
                strategy: panel.querySelector('[name="strategy"]').value,
                operationAt: panel.querySelector('[name="operation_at"]').value,
                targets: panel.querySelector('[name="targets"]').value
            };
        }

        function buildCandidates(config) {
            const activeThresholds = state.units.filter((unit) => num(config.thresholds[unit.id]) > 0);
            if (!activeThresholds.length) throw new Error('Informe pelo menos um mínimo de tropas para definir um full.');
            const included = parseContinents(config.includeContinents);
            const excluded = parseContinents(config.excludeContinents);
            const blockedPlayers = parseNames(config.playerBlacklist);
            const candidates = [];

            (state.payload?.results || []).forEach((player) => {
                if (blockedPlayers.has(normalizeName(player.name))) return;
                (player.villageDetails || []).forEach((village) => {
                    const coord = parseCoordinate(village.coordinate || village.name);
                    if (!coord) return;
                    const continent = continentOf(coord);
                    if ((included.size && !included.has(continent)) || excluded.has(continent)) return;
                    const home = Object.fromEntries(state.units.map((unit) => [unit.id, num(village.home?.[unit.id])]));
                    const transit = Object.fromEntries(state.units.map((unit) => [unit.id, Math.max(
                        num(village.transit?.[unit.id]),
                        num(village.away?.[unit.id]),
                        num(village.outside?.[unit.id]),
                        num(village.support?.[unit.id])
                    )]));
                    const total = Object.fromEntries(state.units.map((unit) => [unit.id, home[unit.id] + transit[unit.id]]));
                    if (!activeThresholds.every((unit) => total[unit.id] >= num(config.thresholds[unit.id]))) return;
                    candidates.push({
                        id: String(village.id || ''),
                        name: village.name || coord.coordinate,
                        ...coord,
                        continent,
                        playerId: String(player.id || ''),
                        playerName: player.name || 'Jogador',
                        home,
                        transit,
                        total
                    });
                });
            });
            return candidates.sort((a, b) => a.playerName.localeCompare(b.playerName) || a.coordinate.localeCompare(b.coordinate));
        }

        function chooseSource(pool, target, strategy) {
            if (!pool.length) return null;
            const sorted = [...pool].sort((a, b) => {
                const delta = distance(a, target) - distance(b, target);
                return strategy === 'farthest' ? -delta : delta;
            });
            return sorted[0];
        }

        function buildPlan(candidates, targets, strategy) {
            const pool = [...candidates];
            const assignments = [];
            const assignedByTarget = new Map(targets.map((target) => [target.coordinate, 0]));
            const assignOne = (target) => {
                const source = chooseSource(pool, target, strategy);
                if (!source) return false;
                pool.splice(pool.indexOf(source), 1);
                assignments.push({ source, target, distance: distance(source, target), sequence: assignments.length + 1 });
                assignedByTarget.set(target.coordinate, assignedByTarget.get(target.coordinate) + 1);
                return true;
            };

            targets.forEach((target) => {
                while (assignedByTarget.get(target.coordinate) < target.count && assignOne(target)) {
                    // Sempre conclui o alvo de maior pontuação antes de passar ao seguinte.
                }
            });

            const missing = targets.map((target) => ({
                target,
                assigned: assignedByTarget.get(target.coordinate),
                missing: Math.max(0, target.count - assignedByTarget.get(target.coordinate))
            }));
            return { assignments, missing, unused: pool };
        }

        function mapUrl(point) {
            const url = new URL('/game.php', window.location.origin);
            if (window.game_data?.village?.id) url.searchParams.set('village', String(window.game_data.village.id));
            url.searchParams.set('screen', 'map');
            url.searchParams.set('x', String(point.x));
            url.searchParams.set('y', String(point.y));
            return url.href;
        }

        function villageUrl(source) {
            const url = new URL('/game.php', window.location.origin);
            url.searchParams.set('village', String(window.game_data?.village?.id || source.id));
            url.searchParams.set('screen', 'info_village');
            if (source.id) url.searchParams.set('id', source.id);
            return url.href;
        }

        function operationText() {
            const rows = state.assignments.map((item) => `[**]${item.sequence} [||] [player]${item.source.playerName}[/player] [||] [coord]${item.source.coordinate}[/coord] [||] [coord]${item.target.coordinate}[/coord] [||] ${formatDistance(item.distance)} campos[/**]`).join('\n');
            const impact = formatOperationAt(state.operationAt);
            return `[b]PLANEJAMENTO DA OPERAÇÃO[/b]\n\n[b]Data e hora do impacto:[/b] ${impact || 'A definir'}\n\n[table]\n[**] # [||] JOGADOR [||] ORIGEM [||] ALVO [||] DISTÂNCIA [/**]\n${rows}\n[/table]`;
        }

        function buildMessages() {
            const grouped = new Map();
            state.assignments.forEach((assignment) => {
                const key = assignment.source.playerId || assignment.source.playerName;
                if (!grouped.has(key)) grouped.set(key, { playerName: assignment.source.playerName, orders: [] });
                grouped.get(key).orders.push(assignment);
            });
            return [...grouped.values()].sort((a, b) => a.playerName.localeCompare(b.playerName)).map((group) => {
                const targetCoordinates = group.orders.map((item) => item.target.coordinate).join('\n');
                return {
                    ...group,
                    text: `[b]OPERAÇÃO — ALVOS DESIGNADOS[/b]\n\nOlá, [player]${group.playerName}[/player]. Estas são as origens e os alvos reservados para você.\n\n[b]Os ataques devem chegar em:[/b] ${formatOperationAt(state.operationAt) || 'horário a definir pela liderança'}\n\n[b]Padrão mínimo de cada full:[/b] envie pelo menos 5.000 bárbaros, 2.000 cavalarias leves e 300 aríetes.\n\n[spoiler=Coordenadas para agendar]\n[code]\n${targetCoordinates}\n[/code]\n[/spoiler]\n\nO bloco acima contém somente os alvos, um por ataque, pronto para copiar e colar as coordenadas.\n\n[table]\n[**] ORIGEM [||] ALVO [||] DISTÂNCIA [/**]\n${group.orders.map((item) => `[**][coord]${item.source.coordinate}[/coord] [||] [coord]${item.target.coordinate}[/coord] [||] ${formatDistance(item.distance)} campos[/**]`).join('\n')}\n[/table]\n\nConfirme as origens e aguarde as demais instruções da liderança antes de enviar.`
                };
            });
        }

        function renderMap() {
            const sources = state.candidates;
            const targets = state.targets;
            const points = [...sources, ...targets];
            if (!points.length) return '';
            const xs = points.map((point) => point.x);
            const ys = points.map((point) => point.y);
            const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 10);
            const margin = Math.max(2, span * 0.06);
            const minX = Math.min(...xs) - margin;
            const minY = Math.min(...ys) - margin;
            const width = Math.max(...xs) - Math.min(...xs) + margin * 2;
            const height = Math.max(...ys) - Math.min(...ys) + margin * 2;
            const radius = Math.max(.4, Math.min(1.2, span / 140));
            const assignedSourceCoords = new Set(state.assignments.map((item) => item.source.coordinate));
            const lines = state.assignments.map((item) => `<line x1="${item.source.x}" y1="${item.source.y}" x2="${item.target.x}" y2="${item.target.y}"><title>${escapeHtml(`${item.source.coordinate} → ${item.target.coordinate}`)}</title></line>`).join('');
            const sourceDots = sources.map((source) => `<a href="${escapeHtml(villageUrl(source))}" target="_blank"><circle class="cmo-source ${assignedSourceCoords.has(source.coordinate) ? 'cmo-assigned' : ''}" cx="${source.x}" cy="${source.y}" r="${radius}"><title>${escapeHtml(`${source.playerName} · ${source.coordinate} · ${assignedSourceCoords.has(source.coordinate) ? 'designada' : 'full disponível'}`)}</title></circle></a>`).join('');
            const targetDots = targets.map((target) => `<a href="${escapeHtml(mapUrl(target))}" target="_blank"><circle class="cmo-target" cx="${target.x}" cy="${target.y}" r="${radius * 1.45}"><title>${escapeHtml(`ALVO ${target.coordinate} · ${target.count} full(s) solicitado(s)`)}</title></circle></a>`).join('');
            return `<section class="cmo-map-card"><div class="cmo-section-head"><div><h3>Mapa da operação</h3><small>Azul: full disponível · verde: full designado · vermelho: alvo</small></div></div><div class="cmo-map-wrap"><svg viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid meet"><g class="cmo-lines">${lines}</g><g>${sourceDots}</g><g>${targetDots}</g></svg></div></section>`;
        }

        function renderCandidates() {
            return `<section><div class="cmo-section-head"><div><h3>Aldeias identificadas como full</h3><small>O filtro soma todas as tropas da origem: na aldeia + em trânsito + apoiando fora. Nas células: total e, abaixo, na aldeia / fora.</small></div><strong>${formatNumber(state.candidates.length)} aldeia(s)</strong></div><div class="cmo-table-wrap"><table class="vis cmo-table"><thead><tr><th>Jogador</th><th>Aldeia</th><th>Coordenada</th><th>Continente</th>${state.units.map((unit) => `<th>${escapeHtml(unit.label)}<small>total · aldeia / fora</small></th>`).join('')}</tr></thead><tbody>${state.candidates.map((source) => `<tr><td>${escapeHtml(source.playerName)}</td><td>${escapeHtml(source.name)}</td><td><a href="${escapeHtml(villageUrl(source))}" target="_blank">${escapeHtml(source.coordinate)}</a></td><td>${escapeHtml(source.continent)}</td>${state.units.map((unit) => `<td><strong>${formatNumber(source.total[unit.id])}</strong><small>${formatNumber(source.home[unit.id])} / ${formatNumber(source.transit[unit.id])}</small></td>`).join('')}</tr>`).join('') || `<tr><td colspan="${4 + state.units.length}">Nenhuma aldeia atingiu os mínimos configurados.</td></tr>`}</tbody></table></div></section>`;
        }

        function renderPlayerFullSummary() {
            const grouped = new Map();
            state.candidates.forEach((source) => grouped.set(source.playerName, (grouped.get(source.playerName) || 0) + 1));
            const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            return `<section><div class="cmo-section-head"><div><h3>Fulls por jogador</h3><small>Quantidade de aldeias que atingiram os mínimos usando o total na origem + fora.</small></div><strong>${rows.length} jogador(es)</strong></div><div class="cmo-player-summary">${rows.map(([playerName, count]) => `<span><b>${escapeHtml(playerName)}</b><strong>${formatNumber(count)}</strong></span>`).join('') || '<div class="cmo-empty">Nenhum jogador possui aldeia dentro do padrão configurado.</div>'}</div></section>`;
        }

        function renderResults(config, planned) {
            const panel = document.getElementById(SCRIPT_ID);
            const requested = state.targets.reduce((total, target) => total + target.count, 0);
            const totalMissing = state.missing.reduce((total, item) => total + item.missing, 0);
            const assignedPlayers = new Set(state.assignments.map((item) => item.source.playerName)).size;
            panel.querySelector('.cmo-results').innerHTML = `
                <div class="cmo-summary"><div><strong>${formatNumber(state.candidates.length)}</strong><span>Fulls encontrados</span></div><div><strong>${formatNumber(state.targets.length)}</strong><span>Alvos</span></div><div><strong>${formatNumber(requested)}</strong><span>Fulls solicitados</span></div><div class="${planned ? 'cmo-ok' : ''}"><strong>${planned ? formatNumber(state.assignments.length) : '—'}</strong><span>Fulls distribuídos</span></div><div class="${planned && totalMissing ? 'cmo-bad' : planned ? 'cmo-ok' : ''}"><strong>${planned ? formatNumber(totalMissing) : '—'}</strong><span>Fulls faltantes</span></div><div><strong>${planned ? formatNumber(assignedPlayers) : '—'}</strong><span>Jogadores envolvidos</span></div></div>
                <div class="cmo-data-info">Tropas salvas em <strong>${escapeHtml(state.payload?.savedAt ? new Date(state.payload.savedAt).toLocaleString('pt-BR') : 'data desconhecida')}</strong>. Cada aldeia ofensiva é utilizada no máximo uma vez.${planned ? '' : '<br><strong>Mapeamento concluído. Para reservar os fulls nos alvos, clique em “Montar operação”.</strong>'}${state.targetPointsWarning ? `<br><strong class="cmo-warning">${escapeHtml(state.targetPointsWarning)}</strong>` : ''}</div>
                ${renderPlayerFullSummary()}
                ${renderMap()}
                ${renderCandidates()}
                ${planned ? `<section><div class="cmo-section-head"><div><h3>Distribuição por alvo</h3><small>A quantidade individual informada ao lado da coordenada sempre substitui a regra automática ou a quantidade padrão.</small></div></div><div class="cmo-table-wrap"><table class="vis cmo-table"><thead><tr><th>Alvo</th><th>Pontos</th><th>Regra</th><th>Solicitados</th><th>Designados</th><th>Faltam</th><th>Origens reservadas</th></tr></thead><tbody>${state.missing.map((item) => {
                    const assigned = state.assignments.filter((assignment) => assignment.target.coordinate === item.target.coordinate);
                    const rule = item.target.explicitCount ? 'Quantidade individual' : config.quantityMode === 'points' && item.target.points !== null ? 'Automático por pontos' : 'Quantidade padrão';
                    return `<tr class="${item.missing ? 'cmo-row-missing' : ''}"><td><a href="${escapeHtml(mapUrl(item.target))}" target="_blank">${escapeHtml(item.target.coordinate)}</a></td><td>${item.target.points === null ? '—' : formatNumber(item.target.points)}</td><td>${escapeHtml(rule)}</td><td>${item.target.count}</td><td>${item.assigned}</td><td><strong>${item.missing}</strong></td><td>${assigned.map((assignment) => `${escapeHtml(assignment.source.playerName)}: <b>${escapeHtml(assignment.source.coordinate)}</b> (${formatDistance(assignment.distance)})`).join('<br>') || '—'}</td></tr>`;
                }).join('')}</tbody></table></div></section>
                <section><div class="cmo-section-head"><div><h3>Mensagens por jogador</h3><small>O TXT pode ser importado diretamente na fila da aba de Mensagens.</small></div><div class="cmo-head-actions"><button type="button" class="btn" data-action="copy-operation">Copiar operação completa</button><button type="button" class="btn cmo-primary" data-action="export-messages">Baixar MPs em TXT</button></div></div><div class="cmo-messages">${state.messages.map((message, index) => `<article><header><strong>${escapeHtml(message.playerName)}</strong><button type="button" class="btn" data-copy-message="${index}">Copiar mensagem</button></header><textarea readonly>${escapeHtml(message.text)}</textarea></article>`).join('') || '<div class="cmo-empty">Nenhuma mensagem gerada.</div>'}</div></section>` : '<div class="cmo-empty">Informe os alvos para montar a distribuição. O mapeamento de fulls acima já pode ser utilizado.</div>'}`;
            panel.querySelector('[data-action="export-csv"]').disabled = !state.assignments.length;
        }

        async function copyText(text, message) {
            try {
                await navigator.clipboard.writeText(text);
                if (window.UI?.InfoMessage) window.UI.InfoMessage(message, 2500);
            } catch (_error) {
                window.prompt('Copie o texto:', text);
            }
        }

        function operationMessagesText() {
            const impact = formatOperationAt(state.operationAt);
            const subject = `Operação — Alvos Designados${impact ? ` — ${impact}` : ''}`;
            const blocks = state.messages.map((message) => `================ MP PARA: ${message.playerName} ================\n${message.text}`);
            return `ASSUNTO DAS MPS: ${subject}\n\n${blocks.join('\n\n')}`;
        }

        function exportMessagesTxt() {
            if (!state.messages.length) return;
            const blob = new Blob(['\ufeff' + operationMessagesText()], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            const datePart = String(state.operationAt || new Date().toISOString()).slice(0, 16).replace(/[:T]/g, '-');
            link.href = URL.createObjectURL(blob);
            link.download = `mps-operacao-${worldId()}-${datePart}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }

        function exportCsv() {
            if (!state.assignments.length) return;
            const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
            const rows = [['Sequência', 'Jogador', 'Origem', 'Alvo', 'Pontos do alvo', 'Distância', 'Impacto'], ...state.assignments.map((item) => [item.sequence, item.source.playerName, item.source.coordinate, item.target.coordinate, item.target.points ?? '', item.distance.toFixed(2), formatOperationAt(state.operationAt)])];
            const blob = new Blob(['\ufeff' + rows.map((row) => row.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `operacao-${worldId()}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }

        async function run(planned) {
            const runId = ++state.runSequence;
            try {
                state.payload = loadPayload();
                if (!state.payload) throw new Error('Tropas salvas não encontradas. Use “Carregar tropas e salvar” antes de montar a operação.');
                state.units = detectedUnits(state.payload);
                const config = readForm();
                saveConfig(config);
                state.operationAt = config.operationAt;
                state.candidates = buildCandidates(config);
                state.targets = parseTargets(config.targets, config.defaultFulls);
                await loadTargetPointsAndCounts(state.targets, config);
                if (runId !== state.runSequence) return;
                state.assignments = [];
                state.missing = state.targets.map((target) => ({ target, assigned: 0, missing: target.count }));
                state.messages = [];
                if (planned && state.targets.length) {
                    const plan = buildPlan(state.candidates, state.targets, config.strategy);
                    state.assignments = plan.assignments;
                    state.missing = plan.missing;
                    state.messages = buildMessages();
                }
                renderResults(config, planned && state.targets.length > 0);
            } catch (error) {
                if (runId !== state.runSequence) return;
                const container = document.querySelector(`#${SCRIPT_ID} .cmo-results`);
                if (container) container.innerHTML = `<div class="cmo-error">${escapeHtml(error.message || 'Falha ao montar a operação.')}</div>`;
            }
        }

        function injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID}{margin:10px 0 16px;padding:10px;border:1px solid #804000;background:#f4e4bc;color:#2b1605;box-shadow:0 2px 5px rgba(0,0,0,.22)}
                #${SCRIPT_ID} *{box-sizing:border-box}#${SCRIPT_ID} h2,#${SCRIPT_ID} h3{margin:0}#${SCRIPT_ID} .cmo-intro{margin:4px 0 10px}
                #${SCRIPT_ID} .cmo-form{display:grid;grid-template-columns:1.2fr 1fr;gap:9px;padding:9px;border:1px solid #b58d50;background:#fff2cc}
                #${SCRIPT_ID} .cmo-card{padding:8px;border:1px solid #c29b58;background:#fff8e5}#${SCRIPT_ID} .cmo-card>strong{display:block;margin-bottom:6px}
                #${SCRIPT_ID} .cmo-unit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:6px}#${SCRIPT_ID} label{display:grid;gap:3px;font-weight:bold}#${SCRIPT_ID} label span{font-size:11px}
                #${SCRIPT_ID} input,#${SCRIPT_ID} textarea,#${SCRIPT_ID} select{width:100%;padding:6px;border:1px solid #9b713c;background:#fffdf5}#${SCRIPT_ID} textarea{min-height:70px;resize:vertical}
                #${SCRIPT_ID} .cmo-target-help{display:block;margin-top:4px;color:#6c5439;font-size:10px}#${SCRIPT_ID} .cmo-point-rules{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:7px;padding:6px;border:1px solid #d2b474;background:#fff3d0;font-size:10px}#${SCRIPT_ID} .cmo-point-rules strong{grid-column:1/-1}#${SCRIPT_ID} .cmo-point-rules span{padding:4px;background:#fff9e8;border:1px solid #dfc58d}#${SCRIPT_ID} .cmo-actions{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap}
                #${SCRIPT_ID} .cmo-primary{background:#7a421d;color:#fff;border-color:#4d2507;font-weight:bold}#${SCRIPT_ID} .cmo-results>section{margin-top:10px;border:1px solid #a47738;background:#fff2cc}
                #${SCRIPT_ID} .cmo-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px;margin:10px 0}#${SCRIPT_ID} .cmo-summary div{display:grid;justify-items:center;padding:8px;border:1px solid #c9a566;background:#fff3d0}#${SCRIPT_ID} .cmo-summary strong{font-size:20px}#${SCRIPT_ID} .cmo-summary span{font-size:11px}#${SCRIPT_ID} .cmo-ok strong{color:#23750d}#${SCRIPT_ID} .cmo-bad strong{color:#a01818}
                #${SCRIPT_ID} .cmo-data-info{padding:7px;border-left:4px solid #95631c;background:#fff8e5}#${SCRIPT_ID} .cmo-warning{color:#a01818}#${SCRIPT_ID} .cmo-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;background:#d9b56f}#${SCRIPT_ID} .cmo-section-head small{display:block;margin-top:2px;color:#65451e}#${SCRIPT_ID} .cmo-head-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
                #${SCRIPT_ID} .cmo-player-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:5px;padding:8px}#${SCRIPT_ID} .cmo-player-summary span{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid #d3b274;background:#fff8e5}#${SCRIPT_ID} .cmo-player-summary span>strong{color:#23750d}
                #${SCRIPT_ID} .cmo-table-wrap{max-height:390px;overflow:auto}#${SCRIPT_ID} .cmo-table{width:100%;margin:0;border-collapse:collapse}#${SCRIPT_ID} .cmo-table th,#${SCRIPT_ID} .cmo-table td{padding:4px 6px;text-align:center;white-space:nowrap}#${SCRIPT_ID} .cmo-row-missing{background:#f8d9cf}
                #${SCRIPT_ID} .cmo-map-wrap{height:430px;background:#e5d29e}#${SCRIPT_ID} .cmo-map-wrap svg{display:block;width:100%;height:100%}#${SCRIPT_ID} .cmo-lines line{stroke:#76552c;stroke-width:.35;stroke-dasharray:1 .7;vector-effect:non-scaling-stroke;opacity:.45}#${SCRIPT_ID} .cmo-source{fill:#3276b1;stroke:#fff;stroke-width:.25;vector-effect:non-scaling-stroke;cursor:pointer}#${SCRIPT_ID} .cmo-source.cmo-assigned{fill:#238b45}#${SCRIPT_ID} .cmo-target{fill:#c52d2d;stroke:#fff;stroke-width:.35;vector-effect:non-scaling-stroke;cursor:pointer}
                #${SCRIPT_ID} .cmo-messages{display:grid;grid-template-columns:repeat(auto-fit,minmax(390px,1fr));gap:9px;padding:9px}#${SCRIPT_ID} .cmo-messages article{border:1px solid #a47738;background:#fff8e5}#${SCRIPT_ID} .cmo-messages header{display:flex;justify-content:space-between;align-items:center;padding:6px;background:#e4c488}#${SCRIPT_ID} .cmo-messages textarea{height:190px;border:0;border-top:1px solid #a47738;font:11px/1.35 Consolas,monospace}
                #${SCRIPT_ID} .cmo-empty,#${SCRIPT_ID} .cmo-error{margin-top:10px;padding:14px;text-align:center;border:1px dashed #b48a45;background:#fff4d6}#${SCRIPT_ID} .cmo-error{color:#991b1b;border-color:#b5362e;background:#f9ded7}
                @media(max-width:900px){#${SCRIPT_ID} .cmo-form{grid-template-columns:1fr}#${SCRIPT_ID} .cmo-actions{grid-column:1}#${SCRIPT_ID} .cmo-messages{grid-template-columns:1fr}#${SCRIPT_ID} .cmo-map-wrap{height:330px}#${SCRIPT_ID} .cmo-point-rules{grid-template-columns:1fr}}
            `;
            document.head.appendChild(style);
        }

        function mount() {
            state.payload = loadPayload();
            state.units = detectedUnits(state.payload);
            const config = loadConfig();
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <h2>⚔️ Chong Tribe Script — Montador de Operações</h2>
                <p class="cmo-intro">Mapeia aldeias ofensivas somando <strong>todas as tropas pertencentes à origem</strong>: na aldeia, em trânsito ou apoiando fora. Reserva cada full para um único alvo e monta a distribuição da operação. Nenhum ataque é enviado automaticamente.</p>
                <div class="cmo-form">
                    <div class="cmo-card"><strong>Definição dinâmica de full — mínimos totais (aldeia + fora)</strong><div class="cmo-unit-grid">${state.units.length ? state.units.map((unit) => `<label><span>${escapeHtml(unit.label)}</span><input type="number" min="0" step="1" data-unit="${unit.id}" value="${num(config.thresholds?.[unit.id] ?? unit.default)}" placeholder="0 = ignorar"></label>`).join('') : '<span>Carregue as tropas para detectar as unidades deste mundo.</span>'}</div></div>
                    <div class="cmo-card"><strong>Alvos da operação</strong><label><span>Coordenadas — uma por linha; quantidade individual opcional</span><textarea name="targets" placeholder="500|500\n501|501; 8">${escapeHtml(config.targets || '')}</textarea></label><small class="cmo-target-help">Ex.: 501|501; 8 solicita 8 fulls somente para esse alvo.</small><label><span>Como definir a quantidade</span><select name="quantity_mode"><option value="fixed" ${config.quantityMode !== 'points' ? 'selected' : ''}>Quantidade padrão para todos</option><option value="points" ${config.quantityMode === 'points' ? 'selected' : ''}>Usar quantidades definidas por faixa de pontos</option></select></label><label><span>Quantidade padrão de fulls por alvo (também usada como fallback)</span><input type="number" min="1" name="default_fulls" value="${Math.max(1, num(config.defaultFulls || 5))}"></label><div class="cmo-point-rules"><strong>Quantidades desta operação — preencha os três campos</strong><label><span>Abaixo de 6.000 pontos</span><input type="number" min="1" name="point_fulls_low" value="${num(config.pointFulls?.low) || ''}" placeholder="Ex.: 5"></label><label><span>De 6.000 a 9.000</span><input type="number" min="1" name="point_fulls_medium" value="${num(config.pointFulls?.medium) || ''}" placeholder="Ex.: 8 a 11"></label><label><span>Acima de 9.000 pontos</span><input type="number" min="1" name="point_fulls_high" value="${num(config.pointFulls?.high) || ''}" placeholder="Ex.: 12 a 15"></label></div></div>
                    <div class="cmo-card"><strong>Filtros das aldeias de origem</strong><div class="cmo-unit-grid"><label><span>Permitir somente estes continentes</span><input name="include_continents" value="${escapeHtml(config.includeContinents || '')}" placeholder="Vazio = permitir todos"></label><label><span>Nunca utilizar estes continentes</span><input name="exclude_continents" value="${escapeHtml(config.excludeContinents || '')}" placeholder="Ex.: K55; K65"></label></div><small class="cmo-target-help">A primeira caixa limita as origens aos continentes informados. A segunda sempre remove os continentes informados.</small><label><span>Ignorar jogadores de origem — separados por ; ou linha</span><textarea name="player_blacklist" placeholder="Jogador1; Jogador2">${escapeHtml(config.playerBlacklist || '')}</textarea></label></div>
                    <div class="cmo-card"><strong>Planejamento e distribuição</strong><label><span>Data e hora em que os ataques devem chegar</span><input type="datetime-local" name="operation_at" value="${escapeHtml(config.operationAt || '')}"></label><small class="cmo-target-help">Ex.: 18/09/2026 às 08:05. Essa informação aparecerá nas MPs e na operação completa.</small><label><span>Escolha das aldeias de origem</span><select name="strategy"><option value="balanced-nearest" ${config.strategy !== 'farthest' ? 'selected' : ''}>Priorizar alvos maiores — usar origens mais próximas</option><option value="farthest" ${config.strategy === 'farthest' ? 'selected' : ''}>Priorizar alvos maiores — usar origens mais distantes</option></select></label><small class="cmo-target-help">Os alvos são sempre preenchidos do maior para o menor número de pontos.</small></div>
                    <div class="cmo-actions"><button type="button" class="btn" data-action="map-fulls">Mapear fulls</button><button type="button" class="btn cmo-primary" data-action="plan">Montar operação</button><button type="button" class="btn" data-action="export-csv" disabled>Exportar CSV</button></div>
                </div>
                <div class="cmo-results"><div class="cmo-empty">Atualize as tropas da tribo, configure o padrão de full e clique em “Mapear fulls” ou “Montar operação”.</div></div>`;
            const host = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            host.prepend(panel);
            injectStyles();
            panel.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (!button) return;
                if (button.dataset.action === 'map-fulls') run(false);
                if (button.dataset.action === 'plan') run(true);
                if (button.dataset.action === 'export-csv') exportCsv();
                if (button.dataset.action === 'export-messages') exportMessagesTxt();
                if (button.dataset.action === 'copy-operation') copyText(operationText(), 'Operação copiada.');
                if (button.dataset.copyMessage !== undefined) {
                    const message = state.messages[num(button.dataset.copyMessage)];
                    if (message) copyText(message.text, `Mensagem de ${message.playerName} copiada.`);
                }
            });
        }

        mount();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Mapa Estratégico
    // -------------------------------------------------------------------------
    (async function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-mapa-estrategico';
        const STORAGE_PREFIX = 'chonguera_mapa_estrategico_v1';
        const SESSION_RUN_PREFIX = 'chonguera_mapa_estrategico_run_v1';
        const BLIND_STORAGE_PREFIX = 'chonguera_blind_preventivo_result';
        const DEFAULT_MIN_ENEMY_POINTS = 7000;
        const BUCKETS = [
            { id: 1, label: 'Até 1h', color: '#e32626' },
            { id: 2, label: '1h–2h', color: '#ff7300' },
            { id: 3, label: '2h–3h', color: '#e8b900' },
            { id: 4, label: '3h–4h', color: '#8daa16' },
            { id: 5, label: '4h–5h', color: '#26a66f' },
            { id: 6, label: '5h–6h', color: '#1689c9' },
            { id: 8, label: '6h–8h', color: '#7047c8' }
        ];

        const query = new URLSearchParams(window.location.search);
        const screen = query.get('screen');
        if (!['wars', 'map'].includes(screen) || document.getElementById(SCRIPT_ID)) return;
        const state = {
            payload: null,
            runId: null,
            running: false,
            mapEnabled: false,
            mapVillagesById: new Map(),
            targetByCoordinate: new Map(),
            enemyByCoordinate: new Map(),
            observer: null,
            scanTimer: null,
            coordinateLayer: null,
            miniMapLayer: null
        };

        function worldId() {
            return String(window.game_data?.world || window.location.hostname);
        }

        function allyId() {
            const value = window.game_data?.player?.ally;
            return ['string', 'number'].includes(typeof value) && String(value) ? String(value) : 'tribo-atual';
        }

        function storageKey() {
            return `${STORAGE_PREFIX}:${worldId()}:${allyId()}`;
        }

        function sessionRunKey() {
            return `${SESSION_RUN_PREFIX}:${worldId()}:${allyId()}`;
        }

        function createRunId() {
            if (window.crypto?.randomUUID) return window.crypto.randomUUID();
            return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        function beginPlanningSession() {
            state.runId = createRunId();
            window.sessionStorage.setItem(sessionRunKey(), state.runId);
            window.localStorage.removeItem(storageKey());
            state.payload = null;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function escapeXml(value) {
            return escapeHtml(value);
        }

        function normalizeName(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function decodeMapValue(value) {
            try {
                return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
            } catch (_error) {
                return String(value || '');
            }
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
        }

        function parseCoordinate(value) {
            const match = String(value || '').match(/(?:^|\D)(\d{3})\|(\d{3})(?:\D|$)/);
            return match ? { coordinate: `${match[1]}|${match[2]}`, x: Number(match[1]), y: Number(match[2]) } : null;
        }

        function parseCoordinates(value) {
            const coordinates = new Map();
            [...String(value || '').matchAll(/\b(\d{3})\|(\d{3})\b/g)].forEach((match) => {
                const coordinate = `${match[1]}|${match[2]}`;
                coordinates.set(coordinate, { coordinate, x: Number(match[1]), y: Number(match[2]) });
            });
            return [...coordinates.values()];
        }

        function splitTribes(value) {
            return [...new Set(String(value || '').split(/[;\n]+/).map((item) => item.trim()).filter(Boolean))];
        }

        function bucketInfo(id) {
            return BUCKETS.find((bucket) => bucket.id === Number(id)) || BUCKETS[BUCKETS.length - 1];
        }

        function notify(message, type = 'success') {
            if (window.UI) {
                if (type === 'error' && typeof window.UI.ErrorMessage === 'function') {
                    window.UI.ErrorMessage(message, 3500);
                    return;
                }
                if (typeof window.UI.InfoMessage === 'function') {
                    window.UI.InfoMessage(message, 3000);
                    return;
                }
            }
            console[type === 'error' ? 'error' : 'log'](`[Mapa Estratégico] ${message}`);
        }

        function loadPayload() {
            try {
                const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || 'null');
                const activeRunId = window.sessionStorage.getItem(sessionRunKey());
                if (parsed?.version === 1 && activeRunId && parsed.runId === activeRunId && Array.isArray(parsed.targets)) {
                    state.runId = activeRunId;
                    const configuredMinimum = Number(parsed.minEnemyPoints);
                    parsed.minEnemyPoints = Number.isFinite(configuredMinimum) && configuredMinimum >= 0
                        ? configuredMinimum
                        : DEFAULT_MIN_ENEMY_POINTS;
                    parsed.enemyVillages = (parsed.enemyVillages || []).filter((village) => Number(village.points) > parsed.minEnemyPoints);
                    return parsed;
                }
            } catch (error) {
                console.warn('[Mapa Estratégico] Dados salvos inválidos:', error);
            }
            return null;
        }

        function savePayload(payload) {
            const runId = state.runId || window.sessionStorage.getItem(sessionRunKey()) || createRunId();
            state.runId = runId;
            window.sessionStorage.setItem(sessionRunKey(), runId);
            const sessionPayload = { ...payload, runId };
            window.localStorage.setItem(storageKey(), JSON.stringify(sessionPayload));
            state.payload = sessionPayload;
        }

        function findBlindPayload() {
            const preferred = `${BLIND_STORAGE_PREFIX}:${worldId()}:${allyId()}`;
            const keys = [preferred];
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key && key !== preferred && key.startsWith(`${BLIND_STORAGE_PREFIX}:`) && key.includes(`:${worldId()}:`)) keys.push(key);
            }
            for (const key of keys) {
                try {
                    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
                    if (parsed?.version === 1 && Array.isArray(parsed.needs)) return parsed;
                } catch (_error) {
                    // Continua procurando uma coleta compatível.
                }
            }
            return null;
        }

        function mapUrl(coordinate) {
            const parsed = parseCoordinate(coordinate);
            const url = new URL('/game.php', window.location.origin);
            if (window.game_data?.village?.id) url.searchParams.set('village', String(window.game_data.village.id));
            url.searchParams.set('screen', 'map');
            return `${url.href}#${parsed ? `${parsed.x};${parsed.y}` : ''}`;
        }

        function warsUrl() {
            const url = new URL('/game.php', window.location.origin);
            if (window.game_data?.village?.id) url.searchParams.set('village', String(window.game_data.village.id));
            url.searchParams.set('screen', 'wars');
            return url.href;
        }

        function readTargetsFromPanel(panel) {
            const targets = new Map();
            BUCKETS.forEach((bucket) => {
                parseCoordinates(panel.querySelector(`[name="bucket_${bucket.id}"]`).value).forEach((coordinate) => {
                    if (!targets.has(coordinate.coordinate)) targets.set(coordinate.coordinate, { ...coordinate, bucket: bucket.id });
                });
            });
            return [...targets.values()];
        }

        function writeTargetsToPanel(panel, targets) {
            BUCKETS.forEach((bucket) => {
                panel.querySelector(`[name="bucket_${bucket.id}"]`).value = targets
                    .filter((target) => Number(target.bucket) === bucket.id)
                    .map((target) => target.coordinate)
                    .join(' ');
            });
        }

        function importBlind() {
            const panel = document.getElementById(SCRIPT_ID);
            const blind = findBlindPayload();
            if (!blind) {
                notify('Nenhuma análise salva do Blind Preventivo foi encontrada.', 'error');
                return;
            }

            const targets = new Map(readTargetsFromPanel(panel).map((target) => [target.coordinate, target]));
            blind.needs.forEach((item) => {
                const coordinate = parseCoordinate(item.coordinate);
                if (!coordinate) return;
                const bucket = bucketInfo(item.bucket).id;
                const current = targets.get(coordinate.coordinate);
                if (!current || bucket < current.bucket) targets.set(coordinate.coordinate, { ...coordinate, bucket });
            });
            writeTargetsToPanel(panel, [...targets.values()]);

            const enemyTags = [...new Set(blind.needs.map((item) => item.enemyAllyTag).filter(Boolean))];
            const tribeInput = panel.querySelector('[name="enemy_tribes"]');
            if (!tribeInput.value.trim() && enemyTags.length) tribeInput.value = enemyTags.join('; ');
            const minimumInput = panel.querySelector('[name="min_enemy_points"]');
            if (minimumInput && Number.isFinite(Number(blind.minEnemyPoints))) minimumInput.value = String(blind.minEnemyPoints);
            setWarsStatus(`${formatNumber(blind.needs.length)} alvo(s) importado(s) da análise de ${new Date(blind.savedAt || Date.now()).toLocaleString('pt-BR')}.`, 'success');
            notify('Coordenadas do Blind Preventivo importadas.');
        }

        async function fetchText(path) {
            const response = await fetch(path, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (!response.ok) throw new Error(`Falha ao carregar ${path} (${response.status}).`);
            return response.text();
        }

        function parseAllies(text) {
            const allies = new Map();
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const id = Number(fields[0]);
                if (!id) return;
                allies.set(id, { id, name: decodeMapValue(fields[1]), tag: decodeMapValue(fields[2]) });
            });
            return allies;
        }

        function parsePlayers(text) {
            const players = new Map();
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const id = Number(fields[0]);
                if (!id) return;
                players.set(id, { id, name: decodeMapValue(fields[1]), allyId: Number(fields[2]) || 0 });
            });
            return players;
        }

        function resolveEnemyTribes(requested, allies) {
            const lookup = new Map();
            allies.forEach((ally) => {
                lookup.set(normalizeName(ally.name), ally);
                lookup.set(normalizeName(ally.tag), ally);
            });
            const found = [];
            const missing = [];
            requested.forEach((entry) => {
                const ally = lookup.get(normalizeName(entry));
                if (ally && !found.some((item) => item.id === ally.id)) found.push(ally);
                else if (!ally) missing.push(entry);
            });
            return { found, missing };
        }

        function parseEnemyVillages(text, players, enemyAllies) {
            const allyIds = new Set(enemyAllies.map((ally) => ally.id));
            const allyById = new Map(enemyAllies.map((ally) => [ally.id, ally]));
            const villages = [];
            String(text || '').split(/\r?\n/).forEach((line) => {
                if (!line.trim()) return;
                const fields = line.split(',');
                const ownerId = Number(fields[4]) || 0;
                const player = players.get(ownerId);
                if (!player || !allyIds.has(player.allyId)) return;
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                villages.push({
                    id: String(fields[0] || ''),
                    name: decodeMapValue(fields[1]),
                    coordinate: `${x}|${y}`,
                    x,
                    y,
                    playerName: player.name,
                    allyTag: allyById.get(player.allyId)?.tag || '',
                    points: Number(fields[5]) || 0
                });
            });
            return villages;
        }

        function setWarsStatus(message, type = '') {
            const status = document.querySelector(`#${SCRIPT_ID} .cme-status`);
            if (!status) return;
            status.textContent = message;
            status.dataset.type = type;
        }

        function setWarsRunning(running) {
            state.running = running;
            const panel = document.getElementById(SCRIPT_ID);
            panel.querySelector('[data-action="save-map"]').disabled = running;
            panel.querySelector('[data-action="import-blind"]').disabled = running;
            panel.querySelectorAll('textarea, input').forEach((element) => { element.disabled = running; });
        }

        async function saveAndBuildMap() {
            if (state.running) return;
            const panel = document.getElementById(SCRIPT_ID);
            const targets = readTargetsFromPanel(panel);
            const enemyInput = panel.querySelector('[name="enemy_tribes"]').value;
            const minimumInput = Number.parseInt(panel.querySelector('[name="min_enemy_points"]').value, 10);
            const minEnemyPoints = Number.isFinite(minimumInput) && minimumInput >= 0 ? minimumInput : DEFAULT_MIN_ENEMY_POINTS;
            const requestedEnemies = splitTribes(enemyInput);
            if (!targets.length) {
                notify('Informe ao menos uma coordenada nas faixas de tempo.', 'error');
                return;
            }

            setWarsRunning(true);
            setWarsStatus('Carregando tribos, jogadores e aldeias do mundo...');
            try {
                let enemyVillages = [];
                let resolvedEnemies = [];
                let missingEnemies = [];
                if (requestedEnemies.length) {
                    const [allyText, playerText, villageText] = await Promise.all([
                        fetchText('/map/ally.txt'),
                        fetchText('/map/player.txt'),
                        fetchText('/map/village.txt')
                    ]);
                    const allies = parseAllies(allyText);
                    const players = parsePlayers(playerText);
                    const resolution = resolveEnemyTribes(requestedEnemies, allies);
                    resolvedEnemies = resolution.found;
                    missingEnemies = resolution.missing;
                    enemyVillages = parseEnemyVillages(villageText, players, resolvedEnemies)
                        .filter((village) => village.points > minEnemyPoints);
                }

                const payload = {
                    version: 1,
                    world: worldId(),
                    allyId: allyId(),
                    savedAt: new Date().toISOString(),
                    enemyInput,
                    minEnemyPoints,
                    enemyTribes: resolvedEnemies.map((ally) => ({ id: ally.id, tag: ally.tag, name: ally.name })),
                    missingEnemyTribes: missingEnemies,
                    targets,
                    enemyVillages
                };
                savePayload(payload);
                renderWarsResults();
                const missingMessage = missingEnemies.length ? ` · não encontradas: ${missingEnemies.join(', ')}` : '';
                setWarsStatus(`${formatNumber(targets.length)} alvo(s) e ${formatNumber(enemyVillages.length)} aldeia(s) inimiga(s) com mais de ${formatNumber(minEnemyPoints)} pontos salvos${missingMessage}.`, missingEnemies.length ? 'warning' : 'success');
                notify('Mapa estratégico atualizado.');
            } catch (error) {
                console.error('[Mapa Estratégico] Falha:', error);
                setWarsStatus(error.message || 'Falha ao gerar o mapa.', 'error');
                notify(error.message || 'Falha ao gerar o mapa.', 'error');
            } finally {
                setWarsRunning(false);
            }
        }

        function renderStrategicSvg(payload) {
            const points = [...payload.targets, ...(payload.enemyVillages || [])];
            if (!points.length) return '<div class="cme-empty">Nenhuma posição para exibir.</div>';
            let minX = Math.min(...points.map((point) => point.x));
            let maxX = Math.max(...points.map((point) => point.x));
            let minY = Math.min(...points.map((point) => point.y));
            let maxY = Math.max(...points.map((point) => point.y));
            const margin = Math.max(4, Math.ceil(Math.max(maxX - minX, maxY - minY) * 0.04));
            minX -= margin;
            maxX += margin;
            minY -= margin;
            maxY += margin;
            const width = Math.max(20, maxX - minX);
            const height = Math.max(20, maxY - minY);
            const enemyRadius = Math.max(0.35, Math.min(1.1, Math.max(width, height) / 350));
            const targetRadius = Math.max(1.3, Math.min(3.2, Math.max(width, height) / 100));
            const grid = [];
            const gridStep = width > 350 || height > 350 ? 50 : width > 120 || height > 120 ? 20 : 10;
            for (let x = Math.ceil(minX / gridStep) * gridStep; x <= maxX; x += gridStep) {
                grid.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}" class="cme-grid-line"/><text x="${x + 1}" y="${minY + 3}" class="cme-axis-label">${x}</text>`);
            }
            for (let y = Math.ceil(minY / gridStep) * gridStep; y <= maxY; y += gridStep) {
                grid.push(`<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" class="cme-grid-line"/><text x="${minX + 1}" y="${y - 1}" class="cme-axis-label">${y}</text>`);
            }

            const enemies = (payload.enemyVillages || []).map((village) => `
                <circle cx="${village.x}" cy="${village.y}" r="${enemyRadius}" class="cme-svg-enemy">
                    <title>${escapeXml(`${village.allyTag} · ${village.playerName} · ${village.name} (${village.coordinate}) · ${formatNumber(village.points)} pts`)}</title>
                </circle>`).join('');
            const targets = payload.targets.map((target) => {
                const bucket = bucketInfo(target.bucket);
                return `<a href="${escapeXml(mapUrl(target.coordinate))}" target="_blank">
                    <circle cx="${target.x}" cy="${target.y}" r="${targetRadius}" fill="${bucket.color}" class="cme-svg-target">
                        <title>${escapeXml(`${bucket.label} · alvo ${target.coordinate}`)}</title>
                    </circle>
                    <circle cx="${target.x}" cy="${target.y}" r="${targetRadius * 1.7}" fill="none" stroke="${bucket.color}" class="cme-svg-pulse"/>
                </a>`;
            }).join('');
            return `<svg class="cme-strategic-svg" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="Mapa estratégico">
                <rect x="${minX}" y="${minY}" width="${width}" height="${height}" class="cme-svg-bg"/>
                ${grid.join('')}${enemies}${targets}
            </svg>`;
        }

        function renderWarsResults() {
            const panel = document.getElementById(SCRIPT_ID);
            const container = panel.querySelector('.cme-results');
            const payload = state.payload;
            if (!payload) {
                container.innerHTML = '<div class="cme-empty">Cole ou importe as coordenadas e clique em “Salvar e gerar mapa”.</div>';
                return;
            }
            const counts = Object.fromEntries(BUCKETS.map((bucket) => [bucket.id, payload.targets.filter((target) => Number(target.bucket) === bucket.id).length]));
            container.innerHTML = `
                <div class="cme-summary">
                    <div><strong>${formatNumber(payload.targets.length)}</strong><span>Alvos destacados</span></div>
                    <div><strong>${formatNumber((payload.enemyTribes || []).length)}</strong><span>Tribos inimigas</span></div>
                    <div><strong>${formatNumber((payload.enemyVillages || []).length)}</strong><span>Aldeias inimigas</span></div>
                    <div><strong>&gt; ${formatNumber(payload.minEnemyPoints ?? DEFAULT_MIN_ENEMY_POINTS)}</strong><span>Pontos inimigos</span></div>
                    <div><strong>${escapeHtml(new Date(payload.savedAt).toLocaleString('pt-BR'))}</strong><span>Última atualização</span></div>
                </div>
                <div class="cme-legend">${BUCKETS.map((bucket) => `<span><i style="background:${bucket.color}"></i>${escapeHtml(bucket.label)}: ${formatNumber(counts[bucket.id])}</span>`).join('')}<span><i class="cme-enemy-dot"></i>Aldeias inimigas</span></div>
                <div class="cme-map-wrap">${renderStrategicSvg(payload)}</div>
                <p class="cme-map-help">Passe o mouse sobre os pontos para ver detalhes. Clique em um alvo colorido para abrir essa posição no mapa do jogo.</p>`;
            panel.querySelector('[data-action="open-map"]').disabled = !payload.targets.length;
        }

        function injectBaseStyles() {
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                #${SCRIPT_ID} { margin: 10px 0 16px; padding: 10px; border: 1px solid #804000; background: #f4e4bc; color: #2b1605; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
                #${SCRIPT_ID} * { box-sizing: border-box; }
                #${SCRIPT_ID} h2 { margin: 0 0 4px; color: #4d2507; }
                #${SCRIPT_ID} .cme-intro { margin: 0 0 9px; }
                #${SCRIPT_ID} .cme-form { display: grid; grid-template-columns: repeat(2,minmax(260px,1fr)); gap: 8px; }
                #${SCRIPT_ID} label { display: grid; gap: 3px; font-weight: bold; }
                #${SCRIPT_ID} textarea { width: 100%; min-height: 52px; padding: 5px; resize: vertical; border: 1px solid #98703d; background: #fff9e9; }
                #${SCRIPT_ID} input { width: 180px; padding: 5px; border: 1px solid #98703d; background: #fff9e9; }
                #${SCRIPT_ID} .cme-enemies { grid-column: 1 / -1; }
                #${SCRIPT_ID} .cme-buckets { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit,minmax(205px,1fr)); gap: 7px; }
                #${SCRIPT_ID} .cme-bucket-label { padding: 6px; border-left: 6px solid var(--bucket-color); background: #ead5a0; }
                #${SCRIPT_ID} .cme-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 7px; background: #ead5a0; border: 1px solid #c29b58; }
                #${SCRIPT_ID} .cme-primary { background: #3c7c24; color: #fff; border-color: #21500f; font-weight: bold; }
                #${SCRIPT_ID} .cme-status { flex: 1; min-width: 260px; padding: 5px; }
                #${SCRIPT_ID} .cme-status[data-type="success"] { color: #287016; }
                #${SCRIPT_ID} .cme-status[data-type="warning"] { color: #9a5a00; }
                #${SCRIPT_ID} .cme-status[data-type="error"] { color: #a01818; }
                #${SCRIPT_ID} .cme-empty { padding: 18px; margin-top: 9px; text-align: center; border: 1px dashed #af8544; background: #fff5d9; }
                #${SCRIPT_ID} .cme-summary { display: grid; grid-template-columns: repeat(4,minmax(130px,1fr)); gap: 7px; margin: 10px 0 7px; }
                #${SCRIPT_ID} .cme-summary div { display: grid; justify-items: center; padding: 7px; border: 1px solid #c9a566; background: #fff3d0; }
                #${SCRIPT_ID} .cme-summary strong { font-size: 16px; }
                #${SCRIPT_ID} .cme-summary span { font-size: 10px; }
                #${SCRIPT_ID} .cme-legend { display: flex; flex-wrap: wrap; gap: 9px; padding: 7px; background: #ead5a0; }
                #${SCRIPT_ID} .cme-legend span { display: inline-flex; align-items: center; gap: 4px; }
                #${SCRIPT_ID} .cme-legend i { width: 12px; height: 12px; border: 1px solid #4c2c0c; border-radius: 50%; }
                #${SCRIPT_ID} .cme-enemy-dot { background: #601010; }
                #${SCRIPT_ID} .cme-map-wrap { height: min(650px,65vh); min-height: 390px; margin-top: 7px; border: 2px solid #714313; background: #ddd0aa; }
                #${SCRIPT_ID} .cme-strategic-svg { display: block; width: 100%; height: 100%; }
                #${SCRIPT_ID} .cme-svg-bg { fill: #c9bf8e; }
                #${SCRIPT_ID} .cme-grid-line { stroke: #807855; stroke-width: .12; opacity: .55; }
                #${SCRIPT_ID} .cme-axis-label { fill: #40391f; font-size: 2px; pointer-events: none; }
                #${SCRIPT_ID} .cme-svg-enemy { fill: #5d1010; stroke: #ff8b72; stroke-width: .16; opacity: .68; }
                #${SCRIPT_ID} .cme-svg-target { stroke: #fff; stroke-width: .35; cursor: pointer; }
                #${SCRIPT_ID} .cme-svg-pulse { stroke-width: .45; opacity: .9; pointer-events: none; }
                #${SCRIPT_ID} .cme-map-help { margin: 5px 0 0; color: #6a5132; }
                @media(max-width:900px) {
                    #${SCRIPT_ID} .cme-form { grid-template-columns: 1fr; }
                    #${SCRIPT_ID} .cme-summary { grid-template-columns: repeat(2,1fr); }
                }
            `;
            document.head.appendChild(style);
        }

        function mountWarsPanel() {
            beginPlanningSession();
            state.payload = loadPayload();
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <h2>Chong Tribe Script — Mapa Estratégico de Blind</h2>
                <p class="cme-intro">Esta tela sempre começa sem planejamento anterior. Cole os alvos por faixa ou importe a análise atual do Blind Preventivo e gere um novo mapa.</p>
                <div class="cme-form">
                    <label class="cme-enemies">Tribos inimigas — tags ou nomes separados por ;
                        <textarea name="enemy_tribes" placeholder="tagTribo1;tagTribo2">${escapeHtml(state.payload?.enemyInput || '')}</textarea>
                    </label>
                    <label>Marcar somente aldeias inimigas com mais de quantos pontos?
                        <input type="number" name="min_enemy_points" min="0" step="100" value="${escapeHtml(state.payload?.minEnemyPoints ?? DEFAULT_MIN_ENEMY_POINTS)}">
                    </label>
                    <div class="cme-buckets">${BUCKETS.map((bucket) => `<label class="cme-bucket-label" style="--bucket-color:${bucket.color}">${escapeHtml(bucket.label)} — coordenadas
                        <textarea name="bucket_${bucket.id}" placeholder="Ex.: 456|618 451|619"></textarea>
                    </label>`).join('')}</div>
                    <div class="cme-actions">
                        <button type="button" class="btn" data-action="import-blind">Importar Blind Preventivo</button>
                        <button type="button" class="btn cme-primary" data-action="save-map">Salvar e gerar mapa</button>
                        <button type="button" class="btn" data-action="open-map" ${state.payload?.targets?.length ? '' : 'disabled'}>Abrir mapa do jogo</button>
                        <span class="cme-status">Pronto para montar o planejamento.</span>
                    </div>
                </div>
                <div class="cme-results"></div>`;
            const host = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            host.prepend(panel);
            injectBaseStyles();
            if (state.payload) writeTargetsToPanel(panel, state.payload.targets);
            renderWarsResults();
            panel.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (action === 'import-blind') importBlind();
                if (action === 'save-map') saveAndBuildMap();
                if (action === 'open-map' && state.payload?.targets?.length) window.open(mapUrl(state.payload.targets[0].coordinate), '_blank');
            });
        }

        function getMapRoot() {
            return document.querySelector('#map, #map_container, #map_whole, .map_container');
        }

        function refreshTwMapVillages() {
            state.mapVillagesById.clear();
            const villages = window.TWMap?.villages;
            if (!villages || typeof villages !== 'object') return;
            Object.values(villages).forEach((village) => {
                if (!village || typeof village !== 'object') return;
                const id = String(village.id || village.village_id || '');
                const x = Number(village.x);
                const y = Number(village.y);
                if (id && Number.isFinite(x) && Number.isFinite(y)) state.mapVillagesById.set(id, `${x}|${y}`);
            });
        }

        function coordinateFromMapElement(element) {
            const candidates = [
                element.getAttribute('data-coordinate'),
                element.getAttribute('data-coord'),
                element.getAttribute('data-title'),
                element.getAttribute('title')
            ];
            for (const candidate of candidates) {
                const coordinate = parseCoordinate(candidate);
                if (coordinate) return coordinate.coordinate;
            }
            const x = element.getAttribute('data-x') || element.dataset?.x;
            const y = element.getAttribute('data-y') || element.dataset?.y;
            if (/^\d{3}$/.test(x || '') && /^\d{3}$/.test(y || '')) return `${x}|${y}`;
            const explicitId = element.getAttribute('data-village-id') || element.getAttribute('data-id');
            const id = String(explicitId || element.id.match(/map[_-]village[_-](\d+)/i)?.[1] || '').replace(/\D/g, '');
            return id ? state.mapVillagesById.get(id) || '' : '';
        }

        function linearModel(points) {
            if (points.length < 2) return null;
            const unique = new Map();
            points.forEach((point) => {
                if (!unique.has(point.coordinate)) unique.set(point.coordinate, []);
                unique.get(point.coordinate).push(point.pixel);
            });
            const samples = [...unique.entries()].map(([coordinate, pixels]) => ({
                coordinate: Number(coordinate),
                pixel: pixels.reduce((sum, value) => sum + value, 0) / pixels.length
            }));
            if (samples.length < 2) return null;
            const coordinateMean = samples.reduce((sum, point) => sum + point.coordinate, 0) / samples.length;
            const pixelMean = samples.reduce((sum, point) => sum + point.pixel, 0) / samples.length;
            const numerator = samples.reduce((sum, point) => sum + ((point.coordinate - coordinateMean) * (point.pixel - pixelMean)), 0);
            const denominator = samples.reduce((sum, point) => sum + ((point.coordinate - coordinateMean) ** 2), 0);
            if (!denominator) return null;
            const slope = numerator / denominator;
            const intercept = pixelMean - (slope * coordinateMean);
            if (!Number.isFinite(slope) || slope < 2 || slope > 120) return null;
            return { slope, intercept, pixel: (coordinate) => (slope * coordinate) + intercept };
        }

        function bestGroupedModel(labels, pixelKey, bandKey) {
            const groups = new Map();
            labels.forEach((label) => {
                const band = Math.round(label[bandKey] / 8);
                if (!groups.has(band)) groups.set(band, []);
                groups.get(band).push({ coordinate: label.coordinate, pixel: label[pixelKey] });
            });
            return [...groups.values()]
                .map((points) => ({ points, model: linearModel(points) }))
                .filter((entry) => entry.model)
                .sort((a, b) => new Set(b.points.map((point) => point.coordinate)).size - new Set(a.points.map((point) => point.coordinate)).size)[0]?.model || null;
        }

        function detectCoordinateModels(root) {
            const rootRect = root.getBoundingClientRect();
            if (rootRect.width < 200 || rootRect.height < 180) return null;
            const labels = [];
            const scopes = [...new Set([
                root,
                root.parentElement,
                root.parentElement?.parentElement,
                root.closest('#map_wrap, #map_container, #map_whole, .map_container')
            ].filter(Boolean))];
            const visited = new Set();
            scopes.forEach((scope) => {
                const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
                let node = walker.nextNode();
                while (node) {
                    if (!visited.has(node)) {
                        visited.add(node);
                        const text = String(node.nodeValue || '').trim();
                        if (/^\d{3}$/.test(text) && node.parentElement) {
                            const rect = node.parentElement.getBoundingClientRect();
                            const x = rect.left - rootRect.left + (rect.width / 2);
                            const y = rect.top - rootRect.top + (rect.height / 2);
                            if (rect.width > 0 && rect.height > 0 && rect.width < 100 && rect.height < 70
                                && x > -70 && x < rootRect.width + 70 && y > -70 && y < rootRect.height + 70) {
                                labels.push({ coordinate: Number(text), x, y });
                            }
                        }
                    }
                    node = walker.nextNode();
                }
            });
            const horizontal = labels.filter((label) => label.y > rootRect.height * 0.74 && label.x > rootRect.width * 0.03);
            const vertical = labels.filter((label) => label.x < rootRect.width * 0.20 && label.y < rootRect.height * 1.04);
            const xModel = bestGroupedModel(horizontal, 'x', 'y');
            const yModel = bestGroupedModel(vertical, 'y', 'x');
            return xModel && yModel ? { xModel, yModel, width: rootRect.width, height: rootRect.height } : null;
        }

        function markerElement(point, type, left, top) {
            const marker = document.createElement('span');
            const bucket = type === 'target' ? bucketInfo(point.bucket) : null;
            marker.className = `cme-coordinate-marker cme-coordinate-${type}`;
            marker.style.left = `${left}px`;
            marker.style.top = `${top}px`;
            marker.style.setProperty('--cme-marker-color', bucket?.color || '#ff3045');
            marker.title = type === 'target'
                ? `${bucket.label} · alvo ${point.coordinate}`
                : `${point.allyTag || 'Inimigo'} · ${point.playerName || ''} · ${point.coordinate}`;
            if (type === 'target') marker.textContent = String(bucket.id);
            return marker;
        }

        function renderCoordinateLayer(root) {
            state.coordinateLayer?.remove();
            state.coordinateLayer = null;
            const models = detectCoordinateModels(root);
            if (!models) return { targets: 0, enemies: 0, calibrated: false };
            if (window.getComputedStyle(root).position === 'static') root.style.position = 'relative';
            const layer = document.createElement('div');
            layer.className = 'cme-coordinate-layer';
            let targetCount = 0;
            let enemyCount = 0;

            state.targetByCoordinate.forEach((target) => {
                const left = models.xModel.pixel(target.x);
                const top = models.yModel.pixel(target.y);
                if (left < 0 || top < 0 || left > models.width || top > models.height) return;
                layer.appendChild(markerElement(target, 'target', left, top));
                targetCount += 1;
            });
            state.enemyByCoordinate.forEach((enemy) => {
                if (state.targetByCoordinate.has(enemy.coordinate)) return;
                const left = models.xModel.pixel(enemy.x);
                const top = models.yModel.pixel(enemy.y);
                if (left < 0 || top < 0 || left > models.width || top > models.height) return;
                layer.appendChild(markerElement(enemy, 'enemy', left, top));
                enemyCount += 1;
            });
            root.appendChild(layer);
            state.coordinateLayer = layer;
            return { targets: targetCount, enemies: enemyCount, calibrated: true };
        }

        function getMiniMapRoot() {
            const selectors = ['#minimap', '#map_mini', '#map_mini_wrap', '.minimap', '[id*="minimap"]'];
            for (const selector of selectors) {
                for (const element of document.querySelectorAll(selector)) {
                    if (element === getMapRoot() || element.closest(`#${SCRIPT_ID}`)) continue;
                    const rect = element.getBoundingClientRect();
                    if (rect.width >= 180 && rect.height >= 180) return element;
                }
            }
            const localMap = getMapRoot();
            const localRect = localMap?.getBoundingClientRect();
            if (!localRect) return null;
            const candidates = [...document.querySelectorAll('[id*="map"], [class*="map"]')]
                .filter((element) => element !== localMap && !element.contains(localMap) && !element.closest(`#${SCRIPT_ID}`))
                .map((element) => ({ element, rect: element.getBoundingClientRect() }))
                .filter(({ rect }) => rect.width >= 200 && rect.height >= 200
                    && rect.left >= localRect.right - 25
                    && Math.abs(rect.top - localRect.top) < 180
                    && rect.width / rect.height > 0.55
                    && rect.width / rect.height < 1.8)
                .sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height)
                    || Math.abs(a.rect.left - localRect.right) - Math.abs(b.rect.left - localRect.right));
            return candidates[0]?.element || null;
        }

        function renderMiniMapLayer() {
            state.miniMapLayer?.remove();
            state.miniMapLayer = null;
            const root = getMiniMapRoot();
            if (!root) return 0;
            if (window.getComputedStyle(root).position === 'static') root.style.position = 'relative';
            const rect = root.getBoundingClientRect();
            const layer = document.createElement('div');
            layer.className = 'cme-minimap-layer';
            state.targetByCoordinate.forEach((target) => {
                const marker = markerElement(target, 'target', (target.x / 1000) * rect.width, (target.y / 1000) * rect.height);
                marker.classList.add('cme-minimap-marker');
                layer.appendChild(marker);
            });
            root.appendChild(layer);
            state.miniMapLayer = layer;
            return state.targetByCoordinate.size;
        }

        function clearMapMarks() {
            document.querySelectorAll('.cme-strategic-target, .cme-strategic-enemy').forEach((element) => {
                element.classList.remove('cme-strategic-target', 'cme-strategic-enemy');
                element.style.removeProperty('--cme-marker-color');
                delete element.dataset.cmeStrategic;
            });
            state.coordinateLayer?.remove();
            state.miniMapLayer?.remove();
            state.coordinateLayer = null;
            state.miniMapLayer = null;
        }

        function scanMap() {
            if (!state.mapEnabled || !state.payload) return;
            const root = getMapRoot();
            if (!root) return;
            refreshTwMapVillages();
            const selector = '[id*="map_village"], [id*="map-village"], [data-village-id], [data-coordinate], [data-coord], [data-x][data-y]';
            root.querySelectorAll(selector).forEach((element) => {
                const coordinate = coordinateFromMapElement(element);
                if (!coordinate) return;
                const target = state.targetByCoordinate.get(coordinate);
                const enemy = state.enemyByCoordinate.get(coordinate);
                element.classList.toggle('cme-strategic-target', Boolean(target));
                element.classList.toggle('cme-strategic-enemy', !target && Boolean(enemy));
                if (target) {
                    const bucket = bucketInfo(target.bucket);
                    element.style.setProperty('--cme-marker-color', bucket.color);
                    element.dataset.cmeStrategic = `${bucket.label} · alvo ${coordinate}`;
                } else if (enemy) {
                    element.style.setProperty('--cme-marker-color', '#ff3848');
                    element.dataset.cmeStrategic = `${enemy.allyTag} · ${enemy.playerName} · ${coordinate}`;
                } else {
                    element.style.removeProperty('--cme-marker-color');
                    delete element.dataset.cmeStrategic;
                }
            });
            const visible = renderCoordinateLayer(root);
            const miniTargets = renderMiniMapLayer();
            const status = document.querySelector(`#${SCRIPT_ID} .cme-visible-counts`);
            if (status) {
                status.textContent = visible.calibrated
                    ? `Visíveis no mapa: ${formatNumber(visible.targets)} alvo(s) e ${formatNumber(visible.enemies)} inimiga(s) · minimapa: ${formatNumber(miniTargets)} alvo(s)`
                    : `Aguardando calibrar as coordenadas do mapa · minimapa: ${formatNumber(miniTargets)} alvo(s)`;
            }
        }

        function scheduleMapScan() {
            window.clearTimeout(state.scanTimer);
            state.scanTimer = window.setTimeout(scanMap, 120);
        }

        function injectMapStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .cme-strategic-target { position: relative !important; z-index: 42 !important; outline: 3px solid var(--cme-marker-color) !important; border-radius: 50% !important; box-shadow: 0 0 4px 2px #fff, 0 0 13px 7px var(--cme-marker-color) !important; filter: saturate(1.35) brightness(1.18); }
                .cme-strategic-enemy { position: relative !important; z-index: 35 !important; outline: 2px solid #ff3848 !important; border-radius: 45% !important; box-shadow: 0 0 8px 3px rgba(255,25,45,.85) !important; }
                .cme-coordinate-layer, .cme-minimap-layer { position: absolute; inset: 0; z-index: 9000; overflow: hidden; pointer-events: none; }
                .cme-coordinate-marker { position: absolute; display: grid; place-items: center; transform: translate(-50%,-50%); border-radius: 50%; pointer-events: none; }
                .cme-coordinate-target { width: 12px; height: 12px; border: 1px solid rgba(255,255,255,.9); outline: 1px solid var(--cme-marker-color); background: var(--cme-marker-color); color: #fff; font: bold 7px Arial; text-shadow: 0 1px 1px #000; box-shadow: 0 0 3px 1px var(--cme-marker-color); opacity: .82; }
                .cme-coordinate-enemy { width: 5px; height: 5px; border: 1px solid #fff; background: #ff2339; box-shadow: 0 0 4px 2px rgba(255,20,40,.75); }
                .cme-minimap-layer { z-index: 9100; }
                .cme-minimap-marker { width: 3px; height: 3px; border: 0; outline: 0; border-radius: 0; background: var(--cme-marker-color); box-shadow: none; font-size: 0; opacity: 1; }
                #${SCRIPT_ID} { position: fixed; top: 220px; right: 8px; z-index: 9995; width: 230px; padding: 8px; border: 2px solid #6d3810; border-radius: 5px; background: #f1d69b; color: #2c1705; box-shadow: 0 3px 10px rgba(0,0,0,.45); }
                #${SCRIPT_ID} strong { display: block; margin-bottom: 5px; }
                #${SCRIPT_ID} .cme-map-actions { display: grid; gap: 5px; }
                #${SCRIPT_ID} .cme-map-counts { margin-top: 6px; font-size: 11px; }
                #${SCRIPT_ID} .cme-visible-counts { margin-top: 4px; padding: 4px; border: 1px solid #b58a45; background: #fff1c9; font-size: 10px; }
                #${SCRIPT_ID} .cme-map-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-top: 6px; font-size: 10px; }
                #${SCRIPT_ID} .cme-map-legend span { display: flex; align-items: center; gap: 3px; }
                #${SCRIPT_ID} .cme-map-legend i { width: 9px; height: 9px; border: 1px solid #4e2b0e; border-radius: 50%; }
            `;
            document.head.appendChild(style);
        }

        function positionMapControl() {
            const panel = document.getElementById(SCRIPT_ID);
            const troopPanel = document.getElementById('chonguera-tropas-mapa');
            if (!panel || !troopPanel) return;
            const troopRect = troopPanel.getBoundingClientRect();
            const panelHeight = panel.getBoundingClientRect().height || 190;
            const desiredTop = Math.min(Math.max(8, troopRect.bottom + 8), Math.max(8, window.innerHeight - panelHeight - 8));
            panel.style.top = `${desiredTop}px`;
        }

        function mountMapLayer() {
            state.payload = loadPayload();
            state.targetByCoordinate = new Map((state.payload?.targets || []).map((target) => [target.coordinate, target]));
            state.enemyByCoordinate = new Map((state.payload?.enemyVillages || []).map((village) => [village.coordinate, village]));
            const panel = document.createElement('aside');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <strong>Chong Tribe Script — Mapa Estratégico</strong>
                <div class="cme-map-actions">
                    <button type="button" class="btn" data-action="toggle-layer">Ativar destaques</button>
                    <a class="btn" href="${escapeHtml(warsUrl())}">Editar planejamento</a>
                </div>
                <div class="cme-map-counts">${state.payload ? `${formatNumber(state.targetByCoordinate.size)} alvo(s) · ${formatNumber(state.enemyByCoordinate.size)} aldeia(s) inimiga(s) &gt; ${formatNumber(state.payload.minEnemyPoints ?? DEFAULT_MIN_ENEMY_POINTS)} pts` : 'Nenhum planejamento salvo.'}</div>
                <div class="cme-visible-counts">Destaques desativados.</div>
                <div class="cme-map-legend">${BUCKETS.map((bucket) => `<span><i style="background:${bucket.color}"></i>${escapeHtml(bucket.label)}</span>`).join('')}</div>`;
            document.body.appendChild(panel);
            injectMapStyles();
            window.setTimeout(positionMapControl, 0);
            panel.addEventListener('click', (event) => {
                if (event.target.closest('[data-action="toggle-layer"]')) {
                    state.mapEnabled = !state.mapEnabled;
                    event.target.textContent = state.mapEnabled ? 'Desativar destaques' : 'Ativar destaques';
                    if (state.mapEnabled) scanMap();
                    else clearMapMarks();
                }
            });
            if (!state.payload) return;
            const root = getMapRoot();
            if (root) {
                state.observer = new MutationObserver((mutations) => {
                    if (mutations.some((mutation) => !mutation.target.closest?.('.cme-coordinate-layer, .cme-minimap-layer'))) scheduleMapScan();
                });
                state.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'data-id', 'data-village-id', 'data-coordinate', 'data-coord'] });
            }
            scanMap();
            window.setInterval(() => {
                scheduleMapScan();
                positionMapControl();
            }, 1200);
        }

        if (screen === 'wars') mountWarsPanel();
        if (screen === 'map') mountMapLayer();
    }());

    // -------------------------------------------------------------------------
    // Módulo: Tropas no Mapa
    // -------------------------------------------------------------------------
    (async function () {
        'use strict';

        const SCRIPT_ID = 'chonguera-tropas-mapa';
        const STORAGE_PREFIX = 'chonguera_tropas_tribo_v2';
        const BLIND_RESULT_STORAGE_PREFIX = 'chonguera_blind_preventivo_result';
        const DEFENSE_UNITS = ['spear', 'sword', 'spy', 'heavy'];
        const UNIT_LABELS = {
            spear: 'Lanceiro',
            sword: 'Espadachim',
            axe: 'Bárbaro',
            archer: 'Arqueiro',
            spy: 'Explorador',
            light: 'Cavalaria leve',
            marcher: 'Arqueiro a cavalo',
            heavy: 'Cavalaria pesada',
            ram: 'Aríete',
            catapult: 'Catapulta',
            knight: 'Paladino',
            snob: 'Nobre',
            militia: 'Milícia'
        };

        if (!isMapPage() || document.getElementById(SCRIPT_ID)) return;
        const state = {
            enabled: false,
            recordsById: new Map(),
            recordsByCoord: new Map(),
            unitOrder: [],
            unitIcons: new Map(),
            blindByCoord: new Map(),
            blindSavedAt: null,
            mapVillagesById: new Map(),
            observer: null,
            popupObserver: null,
            scanTimer: null,
            popupTimer: null,
            mouseFrame: null,
            activeRecord: null,
            activeSource: null
        };

        function isMapPage() {
            return new URLSearchParams(window.location.search).get('screen') === 'map';
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
        }

        function normalizeCoordinate(value) {
            const match = String(value || '').match(/(?:^|\D)(\d{3})[|;,](\d{3})(?:\D|$)/);
            return match ? `${match[1]}|${match[2]}` : '';
        }

        function notify(message, type = 'success') {
            if (window.UI) {
                if (type === 'error' && typeof window.UI.ErrorMessage === 'function') {
                    window.UI.ErrorMessage(message, 3500);
                    return;
                }
                if (typeof window.UI.InfoMessage === 'function') {
                    window.UI.InfoMessage(message, 2500);
                    return;
                }
            }
            console[type === 'error' ? 'error' : 'log'](`[Tropas no Mapa] ${message}`);
        }

        function getPreferredStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${STORAGE_PREFIX}:${world}:${ally}`;
        }

        function getPreferredBlindStorageKey() {
            const world = String(window.game_data?.world || window.location.hostname);
            const allyValue = window.game_data?.player?.ally;
            const ally = ['string', 'number'].includes(typeof allyValue) && String(allyValue)
                ? String(allyValue)
                : 'tribo-atual';
            return `${BLIND_RESULT_STORAGE_PREFIX}:${world}:${ally}`;
        }

        function findStoragePayload() {
            const preferred = window.localStorage.getItem(getPreferredStorageKey());
            if (preferred) return preferred;

            const world = String(window.game_data?.world || window.location.hostname);
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key?.includes('_tropas_tribo_v2:') && key.includes(`:${world}:`)) {
                    const raw = window.localStorage.getItem(key);
                    if (raw) {
                        window.localStorage.setItem(getPreferredStorageKey(), raw);
                        return raw;
                    }
                }
            }
            return null;
        }

        function findBlindPayload() {
            const preferred = window.localStorage.getItem(getPreferredBlindStorageKey());
            if (preferred) return preferred;

            const world = String(window.game_data?.world || window.location.hostname);
            for (let index = 0; index < window.localStorage.length; index += 1) {
                const key = window.localStorage.key(index);
                if (key?.startsWith(`${BLIND_RESULT_STORAGE_PREFIX}:`) && key.includes(`:${world}:`)) {
                    const raw = window.localStorage.getItem(key);
                    if (raw) return raw;
                }
            }
            return null;
        }

        function loadBlindData() {
            state.blindByCoord.clear();
            state.blindSavedAt = null;

            try {
                const raw = findBlindPayload();
                if (!raw) return { count: 0, savedAt: null };
                const payload = JSON.parse(raw);
                if (!payload || !Array.isArray(payload.villages) || !Array.isArray(payload.needs)) {
                    throw new Error('Resultado do Blind Preventivo incompatível.');
                }

                [...payload.villages, ...payload.needs].forEach((village) => {
                    const coordinate = normalizeCoordinate(village.coordinate);
                    if (!coordinate) return;
                    state.blindByCoord.set(coordinate, {
                        coordinate,
                        bucket: Number(village.bucket) || 0,
                        hours: Number(village.hours) || 0,
                        minutes: Number(village.minutes) || 0,
                        classification: String(village.classification || ''),
                        required: village.required || {},
                        actual: village.actual || {},
                        deficits: village.deficits || {},
                        enemyCoordinate: normalizeCoordinate(village.enemyCoordinate),
                        enemyPlayerName: String(village.enemyPlayerName || ''),
                        savedAt: payload.savedAt || null
                    });
                });
                state.blindSavedAt = payload.savedAt || null;
                return { count: state.blindByCoord.size, savedAt: state.blindSavedAt };
            } catch (error) {
                console.error('[Tropas no Mapa] Resultado do Blind Preventivo inválido:', error);
                return { count: 0, savedAt: null, error: error.message };
            }
        }

        function loadTroopData() {
            state.recordsById.clear();
            state.recordsByCoord.clear();
            state.unitOrder = [];
            state.unitIcons.clear();
            loadBlindData();

            try {
                const raw = findStoragePayload();
                if (!raw) return { count: 0, savedAt: null };
                const payload = JSON.parse(raw);
                if (payload?.version !== 2 || !Array.isArray(payload.results)) {
                    throw new Error('Formato de armazenamento incompatível.');
                }

                state.unitOrder = Array.isArray(payload.unitOrder) ? payload.unitOrder.filter(Boolean) : [];
                state.unitIcons = new Map(Object.entries(payload.unitIcons || {}));

                payload.results.forEach((result) => {
                    (result.villageDetails || []).forEach((village) => {
                        const coordinate = normalizeCoordinate(village.coordinate || village.name);
                        const record = {
                            playerId: String(result.id || ''),
                            playerName: String(result.name || 'Jogador'),
                            villageId: String(village.id || ''),
                            villageName: String(village.name || 'Aldeia'),
                            coordinate,
                            points: Number(village.points) || 0,
                            home: village.home || {},
                            transit: village.transit || {}
                        };
                        if (record.villageId) state.recordsById.set(record.villageId, record);
                        if (record.coordinate) state.recordsByCoord.set(record.coordinate, record);
                    });
                });

                return { count: state.recordsByCoord.size, savedAt: payload.savedAt || null };
            } catch (error) {
                console.error('[Tropas no Mapa] Dados salvos inválidos:', error);
                return { count: 0, savedAt: null, error: error.message };
            }
        }

        function getMapRoot() {
            return document.querySelector('#map, #map_container, #map_whole, .map_container');
        }

        function refreshTwMapVillages() {
            state.mapVillagesById.clear();
            const villages = window.TWMap?.villages;
            if (!villages || typeof villages !== 'object') return;

            Object.values(villages).forEach((village) => {
                if (!village || typeof village !== 'object') return;
                const id = String(village.id || village.village_id || '');
                const x = Number(village.x);
                const y = Number(village.y);
                if (!id) return;
                state.mapVillagesById.set(id, {
                    id,
                    coordinate: Number.isFinite(x) && Number.isFinite(y) ? `${x}|${y}` : ''
                });
            });
        }

        function recordFromVillageId(id) {
            const normalizedId = String(id || '').replace(/\D/g, '');
            if (!normalizedId) return null;
            const direct = state.recordsById.get(normalizedId);
            if (direct) return direct;
            const mapVillage = state.mapVillagesById.get(normalizedId);
            return mapVillage?.coordinate ? state.recordsByCoord.get(mapVillage.coordinate) || null : null;
        }

        function recordFromElement(target) {
            const mapRoot = getMapRoot();
            if (!mapRoot || !(target instanceof Element) || !mapRoot.contains(target)) return null;

            let element = target;
            while (element && element !== mapRoot.parentElement) {
                const attributes = [
                    element.id,
                    element.getAttribute('data-coord'),
                    element.getAttribute('data-coordinate'),
                    element.getAttribute('title'),
                    element.getAttribute('alt')
                ].filter(Boolean);
                for (const attribute of attributes) {
                    const coordinate = normalizeCoordinate(attribute);
                    if (coordinate && state.recordsByCoord.has(coordinate)) return state.recordsByCoord.get(coordinate);
                }

                const explicitId = element.getAttribute('data-village-id') || element.getAttribute('data-id');
                const idFromElement = explicitId || element.id.match(/map[_-]village[_-](\d+)/i)?.[1];
                const byId = recordFromVillageId(idFromElement);
                if (byId) return byId;

                const x = element.getAttribute('data-x');
                const y = element.getAttribute('data-y');
                const coordinate = /^\d{3}$/.test(x || '') && /^\d{3}$/.test(y || '') ? `${x}|${y}` : '';
                if (coordinate && state.recordsByCoord.has(coordinate)) return state.recordsByCoord.get(coordinate);

                if (element === mapRoot) break;
                element = element.parentElement;
            }
            return null;
        }

        function readCoordinateElement(selector) {
            const element = document.querySelector(selector);
            return String(element?.value ?? element?.textContent ?? '').trim();
        }

        function recordFromMapCoordinateDisplay() {
            const x = readCoordinateElement('#map_coord_x, #map_x');
            const y = readCoordinateElement('#map_coord_y, #map_y');
            if (/^\d{3}$/.test(x) && /^\d{3}$/.test(y)) {
                return state.recordsByCoord.get(`${x}|${y}`) || null;
            }

            const combinedSelectors = ['#map_coord', '#map_coords', '.map_coords', '#map_coord_display'];
            for (const selector of combinedSelectors) {
                const coordinate = normalizeCoordinate(readCoordinateElement(selector));
                if (coordinate && state.recordsByCoord.has(coordinate)) return state.recordsByCoord.get(coordinate);
            }
            return null;
        }

        function isVisibleElement(element) {
            if (!(element instanceof Element)) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 30 && rect.height > 20;
        }

        function findNativePopupMatch() {
            const selectors = [
                '#map_popup',
                '#map_popup_content',
                '.map_popup',
                '.map-popup',
                '[id*="map_popup"]',
                '[class*="map_popup"]',
                '[id*="mapPopup"]',
                '[class*="mapPopup"]',
                '[id*="popup"]',
                '[class*="popup"]'
            ];
            const candidates = [...new Set(selectors.flatMap((selector) =>
                Array.from(document.querySelectorAll(selector))
            ))].filter((element) =>
                element.id !== `${SCRIPT_ID}-tooltip` && isVisibleElement(element)
            );

            const matches = [];
            candidates.forEach((element) => {
                const coordinates = [...String(element.textContent || '').matchAll(/(?:^|\D)(\d{3})\|(\d{3})(?:\D|$)/g)];
                for (const coordinateMatch of coordinates) {
                    const coordinate = `${coordinateMatch[1]}|${coordinateMatch[2]}`;
                    const record = state.recordsByCoord.get(coordinate);
                    if (record) {
                        const rect = element.getBoundingClientRect();
                        matches.push({ element, record, area: rect.width * rect.height });
                        break;
                    }
                }
            });

            // Prefere o popup interno real, evitando um contêiner externo muito grande.
            matches.sort((a, b) => a.area - b.area);
            return matches[0] || null;
        }

        function unitValues(record, unit) {
            const home = Number(record.home?.[unit]) || 0;
            const transit = Number(record.transit?.[unit]) || 0;
            return { home, transit, total: home + transit };
        }

        function formatDuration(totalMinutes) {
            const seconds = Math.max(0, Math.round((Number(totalMinutes) || 0) * 60));
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }

        function bucketLabel(limit) {
            const current = Number(limit) || 0;
            const limits = [1, 2, 3, 4, 5, 6, 8];
            const index = limits.indexOf(current);
            if (index < 0) return current ? `Até ${formatNumber(current)}h` : 'Faixa não identificada';
            const previous = index > 0 ? limits[index - 1] : 0;
            return previous === 0 ? 'Até 1h' : `${previous}h–${current}h`;
        }

        function defenseProgress(record) {
            const blind = state.blindByCoord.get(record.coordinate);
            if (!blind) return null;

            const current = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                unit,
                unitValues(record, unit).total
            ]));
            const deficits = Object.fromEntries(DEFENSE_UNITS.map((unit) => [
                unit,
                Math.max(0, (Number(blind.required?.[unit]) || 0) - current[unit])
            ]));
            const requiredTotal = DEFENSE_UNITS.reduce((sum, unit) => sum + (Number(blind.required?.[unit]) || 0), 0);
            const coveredTotal = DEFENSE_UNITS.reduce((sum, unit) => (
                sum + Math.min(current[unit], Number(blind.required?.[unit]) || 0)
            ), 0);
            const missingTotal = DEFENSE_UNITS.reduce((sum, unit) => sum + deficits[unit], 0);
            const coverage = requiredTotal > 0 ? coveredTotal / requiredTotal : 1;
            const status = DEFENSE_UNITS.every((unit) => deficits[unit] === 0)
                ? 'met'
                : coverage >= 0.8
                    ? 'near'
                    : 'missing';
            return { blind, current, deficits, requiredTotal, coveredTotal, missingTotal, coverage, status };
        }

        function blindSuggestionHtml(record) {
            const progress = defenseProgress(record);
            if (!progress) return '';
            const { blind, deficits: currentDeficits, missingTotal: currentMissingTotal, coverage } = progress;

            const requestedTotal = DEFENSE_UNITS.reduce((sum, unit) => sum + (Number(blind.deficits?.[unit]) || 0), 0);
            const currentMissingBreakdown = DEFENSE_UNITS
                .filter((unit) => currentDeficits[unit] > 0)
                .map((unit) => `${UNIT_LABELS[unit] || unit} ${formatNumber(currentDeficits[unit])}`)
                .join(' · ');
            const enemy = [blind.enemyPlayerName, blind.enemyCoordinate].filter(Boolean).join(' · ');
            const status = blind.classification === 'needs'
                ? `Blind solicitado: ${requestedTotal ? formatNumber(requestedTotal) + ' tropas' : 'sem déficit'}`
                : 'Blind atendido na análise';
            return `
                <section class="mmt-defense-suggestion">
                    <div class="mmt-defense-heading">
                        <strong>→ DEF sugerida</strong>
                        <span>${escapeHtml(bucketLabel(blind.bucket))} · nobre ${escapeHtml(formatDuration(blind.minutes))}</span>
                    </div>
                    ${enemy ? `<div class="mmt-defense-enemy">Ameaça: ${escapeHtml(enemy)}</div>` : ''}
                    <div class="mmt-defense-grid">
                        ${DEFENSE_UNITS.map((unit) => {
                            const label = UNIT_LABELS[unit] || unit;
                            const icon = state.unitIcons.get(unit);
                            const required = Number(blind.required?.[unit]) || 0;
                            const requested = Number(blind.deficits?.[unit]) || 0;
                            return `<div class="mmt-defense-unit" title="${escapeHtml(label)} — mínimo sugerido e quantidade solicitada">
                                ${icon ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(label)}">` : `<b>${escapeHtml(unit)}</b>`}
                                <strong>${formatNumber(required)}</strong>
                                <small>pedido ${formatNumber(requested)}</small>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="mmt-defense-status">${escapeHtml(status)}</div>
                    <div class="mmt-defense-missing mmt-defense-missing-${progress.status}">
                        <strong>${currentMissingTotal ? `Falta agora para a DEF sugerida: ${formatNumber(currentMissingTotal)} tropas` : 'DEF sugerida atingida: na aldeia + a caminho'}</strong>
                        <span>Cobertura atual: ${formatNumber(coverage * 100)}% · cálculo considera na aldeia + a caminho</span>
                        ${currentMissingBreakdown ? `<span>${escapeHtml(currentMissingBreakdown)}</span>` : ''}
                    </div>
                </section>`;
        }

        function tooltipHtml(record) {
            return `
                <div class="mmt-tooltip-header">
                    <strong>🛡️ ${escapeHtml(record.playerName)}</strong>
                    <span>${escapeHtml(record.coordinate)}</span>
                </div>
                <div class="mmt-tooltip-village">${escapeHtml(record.villageName)} · ${formatNumber(record.points)} pts</div>
                <div class="mmt-tooltip-legend">Total <span>na aldeia / a caminho</span></div>
                <div class="mmt-troop-grid">
                    ${state.unitOrder.map((unit) => {
                        const label = UNIT_LABELS[unit] || unit;
                        const icon = state.unitIcons.get(unit);
                        const values = unitValues(record, unit);
                        return `<div class="mmt-unit" title="${escapeHtml(label)}">
                            ${icon ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(label)}">` : `<b>${escapeHtml(unit)}</b>`}
                            <strong>${formatNumber(values.total)}</strong>
                            <small>${formatNumber(values.home)} / ${formatNumber(values.transit)}</small>
                        </div>`;
                    }).join('')}
                </div>
                ${blindSuggestionHtml(record)}`;
        }

        function positionTooltip(event) {
            const tooltip = document.querySelector(`#${SCRIPT_ID}-tooltip`);
            if (!tooltip || tooltip.hidden) return;
            tooltip.style.width = '';
            tooltip.style.maxHeight = 'calc(100vh - 16px)';
            const gap = 16;
            const rect = tooltip.getBoundingClientRect();
            const left = Math.min(event.clientX + gap, window.innerWidth - rect.width - 8);
            const top = Math.min(event.clientY + gap, window.innerHeight - rect.height - 8);
            tooltip.style.left = `${Math.max(8, left)}px`;
            tooltip.style.top = `${Math.max(8, top)}px`;
        }

        function prepareTooltip(record, source) {
            const tooltip = document.querySelector(`#${SCRIPT_ID}-tooltip`);
            if (!tooltip) return null;
            if (state.activeRecord !== record) {
                state.activeRecord = record;
                tooltip.innerHTML = tooltipHtml(record);
            }
            const progress = defenseProgress(record);
            if (progress) tooltip.dataset.defenseStatus = progress.status;
            else delete tooltip.dataset.defenseStatus;
            state.activeSource = source;
            tooltip.hidden = false;
            return tooltip;
        }

        function showTooltip(record, event) {
            const tooltip = prepareTooltip(record, 'pointer');
            if (!tooltip) return;
            positionTooltip(event);
        }

        function showTooltipNextToPopup(record, popup) {
            const tooltip = prepareTooltip(record, 'popup');
            if (!tooltip) return;
            const gap = 8;
            const edge = 8;
            const preferredWidth = 390;
            const minimumSideWidth = 260;
            const popupRect = popup.getBoundingClientRect();
            const rightSpace = window.innerWidth - popupRect.right - gap - edge;
            const leftSpace = popupRect.left - gap - edge;
            let width = Math.min(preferredWidth, window.innerWidth - edge * 2);
            let left;
            let top;

            if (rightSpace >= minimumSideWidth) {
                width = Math.min(preferredWidth, rightSpace);
                left = popupRect.right + gap;
                top = Math.max(edge, popupRect.top);
            } else if (leftSpace >= minimumSideWidth) {
                width = Math.min(preferredWidth, leftSpace);
                left = popupRect.left - gap - width;
                top = Math.max(edge, popupRect.top);
            } else {
                left = Math.min(Math.max(edge, popupRect.left), window.innerWidth - width - edge);
                top = popupRect.bottom + gap;
                if (top > window.innerHeight - 90) top = Math.max(edge, popupRect.top - gap - 360);
            }

            tooltip.style.width = `${Math.max(minimumSideWidth, width)}px`;
            const availableHeight = Math.max(90, window.innerHeight - top - edge);
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.maxHeight = `${availableHeight}px`;
        }

        function hideTooltip(source = null) {
            if (source && state.activeSource !== source) return;
            const tooltip = document.querySelector(`#${SCRIPT_ID}-tooltip`);
            if (tooltip) tooltip.hidden = true;
            state.activeRecord = null;
            state.activeSource = null;
        }

        function checkNativePopup() {
            if (!state.enabled) return;
            const match = findNativePopupMatch();
            if (match) showTooltipNextToPopup(match.record, match.element);
            else hideTooltip('popup');
        }

        function schedulePopupCheck() {
            window.clearTimeout(state.popupTimer);
            state.popupTimer = window.setTimeout(checkNativePopup, 40);
        }

        function handleMapMouseMove(event) {
            if (!state.enabled) return;
            const mapRoot = getMapRoot();
            if (!mapRoot || !mapRoot.contains(event.target)) {
                window.cancelAnimationFrame(state.mouseFrame);
                hideTooltip();
                return;
            }

            const directRecord = recordFromElement(event.target);
            if (directRecord) {
                window.cancelAnimationFrame(state.mouseFrame);
                showTooltip(directRecord, event);
                return;
            }

            // O mapa atualiza os campos de coordenada durante o próprio mousemove.
            // Esperar um frame garante que a coordenada lida seja a do tile atual.
            const pointer = { clientX: event.clientX, clientY: event.clientY };
            window.cancelAnimationFrame(state.mouseFrame);
            state.mouseFrame = window.requestAnimationFrame(() => {
                const coordinateRecord = recordFromMapCoordinateDisplay();
                if (coordinateRecord) {
                    showTooltip(coordinateRecord, pointer);
                    return;
                }
                const popupMatch = findNativePopupMatch();
                if (popupMatch) showTooltipNextToPopup(popupMatch.record, popupMatch.element);
                else hideTooltip();
            });
        }

        function resolveElementRecord(element) {
            const explicitId = element.getAttribute('data-village-id') || element.getAttribute('data-id');
            const id = explicitId || element.id.match(/map[_-]village[_-](\d+)/i)?.[1];
            const byId = recordFromVillageId(id);
            if (byId) return byId;
            const coordinate = normalizeCoordinate([
                element.id,
                element.getAttribute('data-coord'),
                element.getAttribute('title')
            ].filter(Boolean).join(' '));
            return coordinate ? state.recordsByCoord.get(coordinate) || null : null;
        }

        function scanVisibleVillages() {
            if (!state.enabled) return;
            refreshTwMapVillages();
            const mapRoot = getMapRoot();
            if (!mapRoot) return;

            mapRoot.querySelectorAll('[id*="map_village"], [id*="map-village"], [data-village-id], [data-coord]').forEach((element) => {
                const record = resolveElementRecord(element);
                const progress = record ? defenseProgress(record) : null;
                element.classList.toggle('mmt-known-village', Boolean(record));
                element.classList.toggle('mmt-village-defense-met', progress?.status === 'met');
                element.classList.toggle('mmt-village-defense-near', progress?.status === 'near');
                element.classList.toggle('mmt-village-defense-missing', progress?.status === 'missing');
                if (record) element.setAttribute('data-mmt-coordinate', record.coordinate);
                else element.removeAttribute('data-mmt-coordinate');
            });
        }

        function scheduleScan() {
            window.clearTimeout(state.scanTimer);
            state.scanTimer = window.setTimeout(scanVisibleVillages, 80);
        }

        function clearHighlights() {
            document.querySelectorAll('.mmt-known-village').forEach((element) => {
                element.classList.remove('mmt-known-village');
                element.classList.remove('mmt-village-defense-met', 'mmt-village-defense-near', 'mmt-village-defense-missing');
                element.removeAttribute('data-mmt-coordinate');
            });
        }

        function updateControl(status = null) {
            const panel = document.getElementById(SCRIPT_ID);
            if (!panel) return;
            const button = panel.querySelector('[data-action="toggle"]');
            const count = state.recordsByCoord.size;
            const blindCount = state.blindByCoord.size;
            button.classList.toggle('mmt-active', state.enabled);
            button.textContent = state.enabled ? 'Desativar visão de tropas' : 'Ativar visão de tropas';
            panel.querySelector('.mmt-status').textContent = status
                || `${formatNumber(count)} aldeia(s) com tropas · ${formatNumber(blindCount)} com DEF sugerida`;
        }

        function enableOverlay(silent = false) {
            const loaded = loadTroopData();
            if (!loaded.count) {
                updateControl(loaded.error || 'Nenhuma tropa salva. Carregue os dados na tela de Defesa.');
                notify('Nenhuma tropa por aldeia foi encontrada no armazenamento.', 'error');
                return;
            }

            state.enabled = true;
            refreshTwMapVillages();
            const mapRoot = getMapRoot();
            if (mapRoot) {
                state.observer = new MutationObserver(scheduleScan);
                state.observer.observe(mapRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'data-id', 'data-village-id', 'data-coord'] });
            }
            state.popupObserver = new MutationObserver((mutations) => {
                const hasExternalChange = mutations.some((mutation) => {
                    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
                    return !target?.closest?.(`#${SCRIPT_ID}, #${SCRIPT_ID}-tooltip`);
                });
                if (hasExternalChange) schedulePopupCheck();
            });
            state.popupObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            scanVisibleVillages();
            schedulePopupCheck();
            updateControl();
            if (!silent) notify(`Visão ativada para ${loaded.count} aldeia(s).`);
        }

        function disableOverlay() {
            state.enabled = false;
            state.observer?.disconnect();
            state.observer = null;
            state.popupObserver?.disconnect();
            state.popupObserver = null;
            window.clearTimeout(state.scanTimer);
            window.clearTimeout(state.popupTimer);
            window.cancelAnimationFrame(state.mouseFrame);
            clearHighlights();
            hideTooltip();
            updateControl();
        }

        function toggleOverlay() {
            if (state.enabled) disableOverlay();
            else enableOverlay();
        }

        function addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID} { position: fixed; top: 145px; right: 12px; z-index: 9997; width: 205px; padding: 8px; border: 1px solid #603000; border-radius: 5px; background: linear-gradient(#f4e4bc, #d7b675); color: #2b1a0a; box-shadow: 0 3px 10px rgba(0,0,0,.4); font: 11px Verdana, Arial, sans-serif; }
                #${SCRIPT_ID} button { width: 100%; padding: 6px 8px; cursor: pointer; border: 1px solid #5d2f00; border-radius: 3px; background: linear-gradient(#8f5428, #5b2d12); color: #fff3d1; font-weight: bold; }
                #${SCRIPT_ID} button:hover { filter: brightness(1.12); }
                #${SCRIPT_ID} button.mmt-active { background: linear-gradient(#3b8e2f, #225c1c); }
                #${SCRIPT_ID} .mmt-status { display: block; margin-top: 6px; text-align: center; line-height: 1.35; }
                #${SCRIPT_ID} .mmt-brand { display: block; margin-bottom: 6px; text-align: center; color: #4a2609; font-size: 11px; }
                .mmt-known-village { box-shadow: 0 0 0 2px #2d91d0, 0 0 9px 4px rgba(45,145,208,.85) !important; border-radius: 3px !important; }
                .mmt-known-village.mmt-village-defense-met { box-shadow: 0 0 0 2px #20b64b, 0 0 10px 5px rgba(32,182,75,.95) !important; }
                .mmt-known-village.mmt-village-defense-near { box-shadow: 0 0 0 2px #f0b400, 0 0 10px 5px rgba(240,180,0,.95) !important; }
                .mmt-known-village.mmt-village-defense-missing { box-shadow: 0 0 0 2px #e53935, 0 0 10px 5px rgba(229,57,53,.95) !important; }
                #${SCRIPT_ID}-tooltip { position: fixed; z-index: 10002; box-sizing: border-box; width: 390px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow: auto; pointer-events: none; border: 2px solid #6b3b12; border-radius: 6px; background: rgba(247,232,190,.98); color: #271606; box-shadow: 0 5px 18px rgba(0,0,0,.55); font: 11px Verdana, Arial, sans-serif; }
                #${SCRIPT_ID}-tooltip[data-defense-status="met"] { border-color: #238b3e; }
                #${SCRIPT_ID}-tooltip[data-defense-status="near"] { border-color: #d39a00; }
                #${SCRIPT_ID}-tooltip[data-defense-status="missing"] { border-color: #c52c27; }
                #${SCRIPT_ID}-tooltip[hidden] { display: none; }
                #${SCRIPT_ID}-tooltip .mmt-tooltip-header { display: flex; justify-content: space-between; gap: 12px; padding: 8px 9px; background: linear-gradient(#a86f36, #734116); color: #fff5d6; font-size: 12px; }
                #${SCRIPT_ID}-tooltip .mmt-tooltip-header span { font-weight: bold; }
                #${SCRIPT_ID}-tooltip .mmt-tooltip-village { padding: 7px 9px 3px; font-weight: bold; }
                #${SCRIPT_ID}-tooltip .mmt-tooltip-legend { padding: 0 9px 6px; color: #6b5433; font-size: 9px; }
                #${SCRIPT_ID}-tooltip .mmt-tooltip-legend span { float: right; }
                #${SCRIPT_ID}-tooltip .mmt-troop-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 0 7px 8px; }
                #${SCRIPT_ID}-tooltip .mmt-unit { display: grid; grid-template-columns: 20px 1fr; align-items: center; gap: 2px 4px; padding: 4px; border: 1px solid #c5a46b; background: #fff8df; }
                #${SCRIPT_ID}-tooltip .mmt-unit img { width: 18px; height: 18px; object-fit: contain; }
                #${SCRIPT_ID}-tooltip .mmt-unit strong { min-width: 0; overflow: hidden; text-align: right; text-overflow: ellipsis; }
                #${SCRIPT_ID}-tooltip .mmt-unit small { grid-column: 1 / -1; color: #755d39; text-align: right; font-size: 8px; }
                #${SCRIPT_ID}-tooltip .mmt-defense-suggestion { margin: 0 7px 7px; overflow: hidden; border: 1px solid #aa6f24; border-radius: 4px; background: #fff4cf; }
                #${SCRIPT_ID}-tooltip .mmt-defense-heading { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 7px; background: #d5ad61; color: #3c2208; }
                #${SCRIPT_ID}-tooltip .mmt-defense-heading strong { white-space: nowrap; }
                #${SCRIPT_ID}-tooltip .mmt-defense-heading span { text-align: right; font-size: 9px; font-weight: bold; }
                #${SCRIPT_ID}-tooltip .mmt-defense-enemy { padding: 5px 7px 0; overflow: hidden; color: #7c351a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
                #${SCRIPT_ID}-tooltip .mmt-defense-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 6px 6px 4px; }
                #${SCRIPT_ID}-tooltip .mmt-defense-unit { display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; gap: 2px; padding: 4px; border: 1px solid #d1ad6d; background: #fffaf0; }
                #${SCRIPT_ID}-tooltip .mmt-defense-unit img { width: 16px; height: 16px; object-fit: contain; }
                #${SCRIPT_ID}-tooltip .mmt-defense-unit strong { min-width: 0; overflow: hidden; text-align: right; text-overflow: ellipsis; }
                #${SCRIPT_ID}-tooltip .mmt-defense-unit small { grid-column: 1 / -1; color: #8a4a22; text-align: right; font-size: 8px; white-space: nowrap; }
                #${SCRIPT_ID}-tooltip .mmt-defense-status { padding: 2px 7px 6px; color: #7b3019; font-size: 9px; font-weight: bold; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing { display: grid; gap: 2px; padding: 6px 7px; border-top: 1px solid #d7b16b; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing strong { font-size: 10px; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing span { line-height: 1.35; font-size: 8px; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing-met { background: #ddf1d5; color: #23671f; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing-near { background: #fff0b8; color: #805d00; }
                #${SCRIPT_ID}-tooltip .mmt-defense-missing-missing { background: #ffe0d7; color: #9a2419; }
                #${SCRIPT_ID} .mmt-map-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 6px; margin-top: 6px; font-size: 9px; }
                #${SCRIPT_ID} .mmt-map-legend span { display: flex; align-items: center; gap: 3px; }
                #${SCRIPT_ID} .mmt-map-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
                #${SCRIPT_ID} .mmt-map-legend .mmt-dot-met { background: #20b64b; }
                #${SCRIPT_ID} .mmt-map-legend .mmt-dot-near { background: #f0b400; }
                #${SCRIPT_ID} .mmt-map-legend .mmt-dot-missing { background: #e53935; }
                #${SCRIPT_ID} .mmt-map-legend .mmt-dot-neutral { background: #2d91d0; }
                @media (max-width: 700px) {
                    #${SCRIPT_ID} { top: auto; right: 6px; bottom: 6px; }
                    #${SCRIPT_ID}-tooltip .mmt-troop-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    #${SCRIPT_ID}-tooltip .mmt-defense-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
            `;
            document.head.appendChild(style);
        }

        function createControls() {
            const panel = document.createElement('div');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <strong class="mmt-brand">Chong Tribe Script — Tropas no Mapa</strong>
                <button type="button" data-action="toggle">Ativar visão de tropas</button>
                <span class="mmt-status">Lendo tropas salvas...</span>
                <div class="mmt-map-legend">
                    <span><i class="mmt-dot-met"></i>DEF atingida</span>
                    <span><i class="mmt-dot-near"></i>≥ 80%</span>
                    <span><i class="mmt-dot-missing"></i>&lt; 80%</span>
                    <span><i class="mmt-dot-neutral"></i>Sem análise</span>
                </div>`;
            panel.addEventListener('click', (event) => {
                if (event.target.closest('[data-action="toggle"]')) toggleOverlay();
            });

            const tooltip = document.createElement('div');
            tooltip.id = `${SCRIPT_ID}-tooltip`;
            tooltip.hidden = true;
            document.body.append(panel, tooltip);
        }

        function mount() {
            addStyles();
            createControls();
            const loaded = loadTroopData();
            if (loaded.count) updateControl();
            else updateControl('Nenhuma tropa por aldeia salva');
            document.addEventListener('mousemove', handleMapMouseMove, true);
            document.addEventListener('mouseleave', hideTooltip, true);
        }

        mount();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Fila de MPs de Blind
    // -------------------------------------------------------------------------
    (function () {
        'use strict';

        const SCRIPT_ID = 'chong-tribe-message-queue';
        const MODULE_VERSION = '1.2.7';
        const STORAGE_PREFIX = 'chong_tribe_mp_queue_v1';
        const DEFAULT_SUBJECT = 'Pedido de apoio preventivo';
        const MIN_DELAY_SECONDS = 5;
        const MAX_MESSAGES = 100;
        const SUBMISSION_WATCHDOG_MS = 12000;
        const SUBMISSION_POLL_MS = 200;
        const route = new URLSearchParams(window.location.search);
        if (route.get('screen') !== 'mail' || document.getElementById(SCRIPT_ID)) return;

        const state = {
            payload: loadQueue(),
            running: false,
            advanceTimer: null
        };

        function worldId() {
            return String(window.game_data?.world || location.hostname.split('.')[0] || 'world');
        }

        function storageKey() {
            return `${STORAGE_PREFIX}:${worldId()}`;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function loadQueue() {
            try {
                const parsed = JSON.parse(localStorage.getItem(storageKey()) || 'null');
                if (!parsed || !Array.isArray(parsed.items)) return emptyQueue();
                return normalizeQueue(parsed);
            } catch (_error) {
                return emptyQueue();
            }
        }

        function emptyQueue() {
            return {
                version: 1,
                world: worldId(),
                createdAt: new Date().toISOString(),
                subject: DEFAULT_SUBJECT,
                auto: emptyAutoState(),
                items: []
            };
        }

        function emptyAutoState() {
            return {
                active: false,
                delaySeconds: 8,
                currentId: null,
                submittedAt: null,
                nextAt: null,
                lastButton: '',
                listEvidence: null
            };
        }

        function normalizeQueue(payload) {
            const auto = {
                ...emptyAutoState(),
                ...(payload.auto && typeof payload.auto === 'object' ? payload.auto : {})
            };
            auto.active = auto.active === true;
            auto.delaySeconds = Math.max(MIN_DELAY_SECONDS, Math.min(60, Number(auto.delaySeconds) || 8));
            auto.currentId = auto.currentId ? String(auto.currentId) : null;
            auto.listEvidence = auto.listEvidence && typeof auto.listEvidence === 'object'
                ? auto.listEvidence
                : null;
            const normalized = {
                version: 1,
                world: worldId(),
                createdAt: payload.createdAt || new Date().toISOString(),
                subject: String(payload.subject || DEFAULT_SUBJECT),
                auto,
                items: payload.items.slice(0, MAX_MESSAGES).map((item, index) => ({
                    id: String(item.id || `${Date.now()}-${index}`),
                    recipient: String(item.recipient || '').trim(),
                    subject: String(item.subject || payload.subject || DEFAULT_SUBJECT).trim(),
                    body: String(item.body || '').trim(),
                    selected: item.selected !== false,
                    status: ['pending', 'sending', 'sent', 'error', 'skipped'].includes(item.status) ? item.status : 'pending',
                    attempts: Number(item.attempts) || 0,
                    error: String(item.error || ''),
                    sentAt: item.sentAt || null
                })).filter((item) => item.recipient && item.body)
            };
            normalized.items.forEach((item) => {
                if (item.status === 'sending' && item.id !== auto.currentId) item.status = 'pending';
            });
            return normalized;
        }

        function saveQueue() {
            localStorage.setItem(storageKey(), JSON.stringify(state.payload));
        }

        function parseMessages(text) {
            const source = String(text || '').replace(/^\uFEFF/, '').trim();
            const subjectMatch = source.match(/^ASSUNTO DAS MPS:\s*(.+?)\s*$/im);
            const importedSubject = subjectMatch?.[1]?.trim() || DEFAULT_SUBJECT;
            const headerPattern = /^=+\s*MP PARA:\s*(.+?)\s*=+\s*$/gmi;
            const headers = [...source.matchAll(headerPattern)];
            const unique = new Map();
            headers.forEach((match, index) => {
                const recipient = match[1].trim();
                const bodyStart = Number(match.index) + match[0].length;
                const bodyEnd = index + 1 < headers.length ? Number(headers[index + 1].index) : source.length;
                const body = source.slice(bodyStart, bodyEnd).trim();
                if (!recipient || !body) return;
                const key = `${recipient.toLocaleLowerCase('pt-BR')}\n${body}`;
                if (!unique.has(key)) unique.set(key, { recipient, body });
            });
            if (!unique.size) throw new Error('Nenhum bloco “MP PARA” foi encontrado no texto.');
            if (unique.size > MAX_MESSAGES) throw new Error(`O limite por fila é de ${MAX_MESSAGES} mensagens.`);
            const now = Date.now();
            return {
                version: 1,
                world: worldId(),
                createdAt: new Date().toISOString(),
                subject: importedSubject,
                subjectFromFile: Boolean(subjectMatch),
                auto: emptyAutoState(),
                items: [...unique.values()].map((item, index) => ({
                    id: `${now}-${index}`,
                    recipient: item.recipient,
                    subject: importedSubject,
                    body: item.body,
                    selected: true,
                    status: 'pending',
                    attempts: 0,
                    error: '',
                    sentAt: null
                }))
            };
        }

        function notify(message, type = 'success') {
            const ui = window.UI || (typeof unsafeWindow !== 'undefined' ? unsafeWindow.UI : null);
            if (ui) {
                if (type === 'error' && typeof ui.ErrorMessage === 'function') ui.ErrorMessage(message, 5000);
                else if (typeof ui.InfoMessage === 'function') ui.InfoMessage(message, 3500);
            }
            const status = document.querySelector(`#${SCRIPT_ID} [data-status]`);
            if (status) {
                status.textContent = message;
                status.className = type === 'error' ? 'cmp-status cmp-error' : 'cmp-status';
            }
        }

        function selectedPending() {
            return state.payload.items.filter((item) => item.selected && ['pending', 'error'].includes(item.status));
        }

        function summary() {
            const counts = { pending: 0, sent: 0, error: 0, skipped: 0 };
            state.payload.items.forEach((item) => {
                const status = item.status === 'sending' ? 'pending' : item.status;
                if (counts[status] !== undefined) counts[status] += 1;
            });
            return counts;
        }

        function statusLabel(item) {
            if (!item.selected || item.status === 'skipped') return 'Ignorada';
            if (item.status === 'sent') return 'Enviada';
            if (item.status === 'sending') return 'Enviando…';
            if (item.status === 'error') return `Erro: ${item.error || 'falha no envio'}`;
            return 'Pendente';
        }

        function render() {
            const panel = document.getElementById(SCRIPT_ID);
            if (!panel) return;
            const counts = summary();
            const subjectInput = panel.querySelector('[name="queue_subject"]');
            if (subjectInput && document.activeElement !== subjectInput) subjectInput.value = state.payload.subject || DEFAULT_SUBJECT;
            panel.querySelector('[data-summary]').innerHTML = `
                <div><strong>${state.payload.items.length}</strong><span>Total</span></div>
                <div><strong>${counts.pending}</strong><span>Pendentes</span></div>
                <div class="cmp-ok"><strong>${counts.sent}</strong><span>Enviadas</span></div>
                <div class="cmp-fail"><strong>${counts.error}</strong><span>Com erro</span></div>`;
            const list = panel.querySelector('[data-list]');
            list.innerHTML = state.payload.items.length ? state.payload.items.map((item, index) => `
                <tr class="cmp-${escapeHtml(item.status)} ${item.selected ? '' : 'cmp-unselected'}">
                    <td><input type="checkbox" data-select="${index}" ${item.selected ? 'checked' : ''} ${state.running || item.status === 'sent' ? 'disabled' : ''}></td>
                    <td><strong>${escapeHtml(item.recipient)}</strong></td>
                    <td>${escapeHtml(item.subject || DEFAULT_SUBJECT)}</td>
                    <td>${item.body.length.toLocaleString('pt-BR')}</td>
                    <td title="${escapeHtml(item.error)}">${escapeHtml(statusLabel(item))}</td>
                    <td><div class="cmp-row-actions"><button type="button" class="btn" data-fill="${index}" ${state.running ? 'disabled' : ''}>Preencher</button>${item.status === 'error' ? `<button type="button" class="btn" data-mark-sent="${index}" ${state.running ? 'disabled' : ''}>Já foi enviada</button>` : ''}</div></td>
                </tr>`).join('') : '<tr><td colspan="6" class="cmp-empty">Importe o TXT gerado pelo Distribuidor de Apoios.</td></tr>';
            panel.querySelectorAll('button, input, textarea').forEach((element) => {
                if (element.matches('[data-action="stop"]')) element.disabled = !state.running;
                else if (element.matches('[data-action="auto"]')) element.disabled = state.running || !selectedPending().length;
                else if (element.matches('[data-fill]')) element.disabled = state.running;
            });
        }

        function findField(form, selectors) {
            for (const selector of selectors) {
                const element = form.querySelector(selector);
                if (element) return element;
            }
            return null;
        }

        function locateComposeForm() {
            const candidates = [...document.querySelectorAll('form')];
            for (const form of candidates) {
                const body = findField(form, ['textarea[name="text"]', 'textarea[name="message"]', '#message', '#message_text']);
                const recipient = findField(form, ['input[name="to"]', 'textarea[name="to"]', 'input[name="recipients"]', '#to', '#message_to']);
                const subject = findField(form, ['input[name="subject"]', '#subject', '#message_subject']);
                if (recipient && subject && body) return { form, recipient, subject, body };
            }
            return null;
        }

        function assignValue(element, value) {
            element.focus();
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function fillMessage(item) {
            const compose = locateComposeForm();
            if (!compose) {
                notify('O formulário de nova mensagem não foi encontrado. Abra “Escrever mensagem” e tente novamente.', 'error');
                return false;
            }
            assignValue(compose.recipient, item.recipient);
            assignValue(compose.subject, item.subject || DEFAULT_SUBJECT);
            assignValue(compose.body, item.body);
            if (typeof compose.recipient.scrollIntoView === 'function') {
                compose.recipient.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            notify(`MP de ${item.recipient} preenchida. Revise e use o botão normal do jogo para enviar.`);
            return true;
        }

        function pageError(doc = document) {
            const ignoredHints = [
                /por favor, seja educado ao se comunicar com os outros/i,
                /please be polite when communicating with others/i
            ];
            const errors = [...doc.querySelectorAll('.error_box, .error-box, .error_message, .error-message, #error, .error')];
            for (const element of errors) {
                const message = element.textContent.trim().replace(/\s+/g, ' ');
                if (!message || ignoredHints.some((pattern) => pattern.test(message))) continue;
                return message;
            }
            const bodyText = String(doc.body?.textContent || '').replace(/\s+/g, ' ');
            if (/sess[aã]o (?:inv[aá]lida|expirada)|session (?:invalid|expired)/i.test(bodyText)) {
                return 'A sessão do jogo expirou.';
            }
            return '';
        }

        function buttonLabel(element) {
            return String(
                element.value
                || element.textContent
                || element.getAttribute('aria-label')
                || element.title
                || element.name
                || element.id
                || ''
            ).trim().replace(/\s+/g, ' ');
        }

        function nativeSubmitButton(form) {
            const formCandidates = [...form.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn')];
            const associated = form.id
                ? [...document.querySelectorAll('button[form], input[form]')]
                    .filter((element) => element.getAttribute('form') === form.id)
                : [];
            const nearby = [...(document.querySelector('#content_value') || document).querySelectorAll('button.btn, input.btn, a.btn')];
            const candidates = [...new Set([...formCandidates, ...associated, ...nearby])];
            const scored = candidates.map((element, index) => {
                const label = buttonLabel(element);
                const identity = `${label} ${element.name || ''} ${element.id || ''} ${element.className || ''}`;
                let score = 0;
                if (/^(enviar|send)$/i.test(label)) score += 200;
                else if (/\b(enviar|send)\b/i.test(label)) score += 140;
                if (/\b(send|enviar)\b/i.test(`${element.name || ''} ${element.id || ''}`)) score += 100;
                if (element.matches('input[type="submit"], button[type="submit"], button:not([type])')) score += 20;
                if (/preview|pr[eé]-?visual|visualizar/i.test(identity)) score -= 500;
                return { element, label, score, index };
            }).sort((left, right) => right.score - left.score || left.index - right.index);
            return scored[0]?.score > 0 ? scored[0] : null;
        }

        function sameMessageStillInForm(compose, item) {
            if (!compose) return false;
            return String(compose.recipient.value || '').trim() === item.recipient.trim()
                && String(compose.subject.value || '').trim() === (item.subject || DEFAULT_SUBJECT).trim()
                && String(compose.body.value || '').trim() === item.body.trim();
        }

        function successNotice(doc = document) {
            const selectors = '.success_box, .success-box, .success_message, .success-message, .success';
            const messages = [...doc.querySelectorAll(selectors)]
                .map((element) => element.textContent.trim().replace(/\s+/g, ' '))
                .filter(Boolean);
            return messages.some((message) => /mensagem.+enviad|message.+sent|enviad.+sucesso/i.test(message));
        }

        function normalizedEvidenceText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        }

        function messageListEvidence(item, doc = document) {
            const recipient = normalizedEvidenceText(item?.recipient);
            const subject = normalizedEvidenceText(item?.subject || DEFAULT_SUBJECT);
            if (!recipient || !subject) return { count: 0, signatures: [] };
            const signatures = [...doc.querySelectorAll('tr')]
                .filter((row) => !row.closest(`#${SCRIPT_ID}`))
                .filter((row) => {
                    const text = normalizedEvidenceText(row.textContent);
                    return text.includes(recipient) && text.includes(subject);
                })
                .map((row) => {
                    const links = [...row.querySelectorAll('a[href]')]
                        .map((link) => `${normalizedEvidenceText(link.textContent)}:${link.getAttribute('href') || ''}`)
                        .join('|');
                    return `${normalizedEvidenceText(row.textContent)}|${links}`;
                })
                .sort();
            return { count: signatures.length, signatures };
        }

        function messageListConfirmed(item) {
            const before = state.payload.auto.listEvidence || { count: 0, signatures: [] };
            const after = messageListEvidence(item);
            if (after.count > Number(before.count || 0)) return true;
            const known = new Set(Array.isArray(before.signatures) ? before.signatures : []);
            return after.signatures.some((signature) => !known.has(signature));
        }

        function submissionSucceeded(item) {
            const compose = locateComposeForm();
            if (successNotice()) return true;
            if (messageListConfirmed(item)) return true;
            const currentRoute = new URLSearchParams(window.location.search);
            if (/preview|previsual/i.test(String(currentRoute.get('mode') || ''))) return false;
            if (!compose) return true;
            return !sameMessageStillInForm(compose, item);
        }

        function currentItem() {
            const id = state.payload.auto?.currentId;
            return id ? state.payload.items.find((item) => item.id === id) || null : null;
        }

        function clearCurrentSubmission() {
            state.payload.auto.currentId = null;
            state.payload.auto.submittedAt = null;
            state.payload.auto.listEvidence = null;
        }

        function stopWithError(item, message) {
            item.status = 'error';
            item.error = message || 'O jogo não confirmou o envio.';
            state.payload.auto.active = false;
            clearCurrentSubmission();
            state.running = false;
            saveQueue();
            render();
            notify(`Envio interrompido em ${item.recipient}: ${item.error}`, 'error');
        }

        function confirmCurrentSubmission(item) {
            item.status = 'sent';
            item.error = '';
            item.sentAt = new Date().toISOString();
            state.payload.auto.nextAt = Date.now() + state.payload.auto.delaySeconds * 1000;
            clearCurrentSubmission();
            saveQueue();
            render();
        }

        function composeUrl() {
            const url = new URL(window.location.href);
            url.searchParams.set('screen', 'mail');
            url.searchParams.set('mode', 'new');
            url.searchParams.set('cts_mp_queue', '1');
            return url.toString();
        }

        function watchNativeSubmission(itemId) {
            const startedAt = Date.now();
            const checkSubmission = () => {
                const item = state.payload.items.find((entry) => entry.id === itemId);
                if (!item || state.payload.auto.currentId !== itemId || item.status !== 'sending') return;
                const error = pageError();
                if (error) {
                    stopWithError(item, error);
                    return;
                }
                if (submissionSucceeded(item)) {
                    confirmCurrentSubmission(item);
                    advanceAutomaticQueue();
                    return;
                }
                if (Date.now() - startedAt >= SUBMISSION_WATCHDOG_MS) {
                    stopWithError(item, 'O botão nativo foi acionado, mas a página não confirmou o envio. A MP não foi marcada como enviada.');
                    return;
                }
                window.setTimeout(checkSubmission, SUBMISSION_POLL_MS);
            };
            window.setTimeout(checkSubmission, SUBMISSION_POLL_MS);
        }

        function submitNativeMessage(item) {
            const compose = locateComposeForm();
            if (!compose) throw new Error('Formulário de nova mensagem não encontrado.');
            const submitMatch = nativeSubmitButton(compose.form);
            if (!submitMatch) {
                const labels = [...compose.form.querySelectorAll('button, input, a.btn')]
                    .map(buttonLabel).filter(Boolean).join(' | ');
                throw new Error(`Botão nativo “Enviar” não encontrado. Botões vistos: ${labels || 'nenhum'}.`);
            }
            const submit = submitMatch.element;
            assignValue(compose.recipient, item.recipient);
            assignValue(compose.subject, item.subject || DEFAULT_SUBJECT);
            assignValue(compose.body, item.body);
            item.status = 'sending';
            item.attempts += 1;
            item.error = '';
            state.payload.auto.currentId = item.id;
            state.payload.auto.submittedAt = new Date().toISOString();
            state.payload.auto.lastButton = submitMatch.label || '(sem texto)';
            state.payload.auto.listEvidence = messageListEvidence(item);
            state.running = true;
            saveQueue();
            render();
            notify(`Acionando o botão nativo “${state.payload.auto.lastButton}” para enviar a MP de ${item.recipient}…`);
            submit.click();
            watchNativeSubmission(item.id);
        }

        function finishAutomaticQueue() {
            state.payload.auto.active = false;
            state.payload.auto.nextAt = null;
            state.running = false;
            saveQueue();
            render();
            notify('Fila concluída. Todas as MPs selecionadas foram confirmadas pelo fluxo nativo do jogo.');
        }

        function advanceAutomaticQueue() {
            if (state.advanceTimer) {
                window.clearTimeout(state.advanceTimer);
                state.advanceTimer = null;
            }
            if (!state.payload.auto.active || state.payload.auto.currentId) {
                state.running = Boolean(state.payload.auto.active || state.payload.auto.currentId);
                render();
                return;
            }
            const item = selectedPending()[0];
            if (!item) {
                finishAutomaticQueue();
                return;
            }
            const remaining = Math.max(0, Number(state.payload.auto.nextAt || 0) - Date.now());
            state.running = true;
            render();
            if (remaining > 0) notify(`Próxima MP em ${Math.ceil(remaining / 1000)} segundo(s): ${item.recipient}.`);
            state.advanceTimer = window.setTimeout(() => {
                state.advanceTimer = null;
                if (!state.payload.auto.active || state.payload.auto.currentId) return;
                if (!locateComposeForm()) {
                    window.location.assign(composeUrl());
                    return;
                }
                try {
                    submitNativeMessage(item);
                } catch (error) {
                    stopWithError(item, error.message || 'Falha ao acionar o formulário nativo.');
                }
            }, remaining);
        }

        function resumeAutomaticQueue() {
            const item = currentItem();
            if (item?.status === 'sending') {
                const error = pageError();
                if (error) stopWithError(item, error);
                else if (submissionSucceeded(item)) confirmCurrentSubmission(item);
                else {
                    stopWithError(item, 'A página recarregou sem confirmar o envio. A MP não foi marcada como enviada.');
                    return;
                }
            } else if (state.payload.auto.currentId) {
                clearCurrentSubmission();
                saveQueue();
            }
            if (state.payload.auto.active) advanceAutomaticQueue();
            else {
                state.running = false;
                render();
            }
        }

        function runAutomatic() {
            const panel = document.getElementById(SCRIPT_ID);
            const delaySeconds = Math.max(MIN_DELAY_SECONDS, Math.min(60, Number(panel.querySelector('[name="delay"]').value) || 8));
            const queue = selectedPending();
            if (!queue.length || state.running) return;
            if (!locateComposeForm()) {
                notify('Abra a tela de nova mensagem antes de iniciar o envio.', 'error');
                return;
            }
            const confirmed = window.confirm(`Enviar ${queue.length} MP(s) selecionada(s)?\n\nO script aguardará pelo menos ${delaySeconds} segundos entre os envios e parará no primeiro erro.`);
            if (!confirmed) return;
            state.payload.auto.active = true;
            state.payload.auto.delaySeconds = delaySeconds;
            state.payload.auto.nextAt = null;
            state.running = true;
            saveQueue();
            render();
            advanceAutomaticQueue();
        }

        function importText(text) {
            state.payload = parseMessages(text);
            const subject = state.payload.subjectFromFile
                ? state.payload.subject
                : document.querySelector(`#${SCRIPT_ID} [name="queue_subject"]`)?.value.trim() || DEFAULT_SUBJECT;
            delete state.payload.subjectFromFile;
            state.payload.subject = subject;
            state.payload.items.forEach((item) => { item.subject = subject; });
            saveQueue();
            render();
            notify(`${state.payload.items.length} MP(s) carregada(s) na fila.`);
        }

        function bindEvents(panel) {
            panel.addEventListener('change', async (event) => {
                if (event.target.matches('[data-file]')) {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                        const text = await file.text();
                        panel.querySelector('[name="message_text"]').value = text;
                        importText(text);
                    } catch (error) {
                        notify(error.message || 'Não foi possível ler o arquivo.', 'error');
                    }
                }
                if (event.target.matches('[data-select]')) {
                    const item = state.payload.items[Number(event.target.dataset.select)];
                    if (!item || item.status === 'sent') return;
                    item.selected = event.target.checked;
                    item.status = item.selected ? (item.status === 'skipped' ? 'pending' : item.status) : 'skipped';
                    saveQueue();
                    render();
                }
                if (event.target.matches('[name="queue_subject"]')) {
                    const subject = event.target.value.trim() || DEFAULT_SUBJECT;
                    state.payload.subject = subject;
                    state.payload.items.forEach((item) => {
                        if (item.status !== 'sent') item.subject = subject;
                    });
                    saveQueue();
                    render();
                }
            });
            panel.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (!button) return;
                if (button.dataset.fill !== undefined) {
                    const item = state.payload.items[Number(button.dataset.fill)];
                    if (item) fillMessage(item);
                    return;
                }
                if (button.dataset.markSent !== undefined) {
                    const item = state.payload.items[Number(button.dataset.markSent)];
                    if (!item || item.status !== 'error') return;
                    const confirmed = window.confirm(`Marcar a MP de ${item.recipient} como enviada sem reenviar?\n\nUse somente se você confirmou o envio na caixa de saída do jogo.`);
                    if (!confirmed) return;
                    item.status = 'sent';
                    item.error = '';
                    item.sentAt = new Date().toISOString();
                    saveQueue();
                    render();
                    notify(`MP de ${item.recipient} marcada como enviada, sem novo envio.`);
                    return;
                }
                const action = button.dataset.action;
                if (action === 'parse') {
                    try { importText(panel.querySelector('[name="message_text"]').value); }
                    catch (error) { notify(error.message, 'error'); }
                }
                if (action === 'auto') runAutomatic();
                if (action === 'stop') {
                    state.payload.auto.active = false;
                    state.running = Boolean(state.payload.auto.currentId);
                    if (state.advanceTimer) {
                        window.clearTimeout(state.advanceTimer);
                        state.advanceTimer = null;
                    }
                    saveQueue();
                    render();
                    notify(state.payload.auto.currentId
                        ? 'Fila pausada. O envio já acionado ainda será confirmado pelo jogo.'
                        : 'Fila pausada.');
                }
                if (action === 'select-all') {
                    state.payload.items.forEach((item) => {
                        if (item.status !== 'sent') { item.selected = true; if (item.status === 'skipped') item.status = 'pending'; }
                    });
                    saveQueue();
                    render();
                }
                if (action === 'clear-selection') {
                    state.payload.items.forEach((item) => {
                        if (item.status !== 'sent') { item.selected = false; item.status = 'skipped'; }
                    });
                    saveQueue();
                    render();
                }
                if (action === 'retry') {
                    state.payload.items.forEach((item) => {
                        if (item.status === 'error') { item.status = 'pending'; item.error = ''; item.selected = true; }
                    });
                    saveQueue();
                    render();
                }
                if (action === 'clear') {
                    if (!state.payload.items.length || window.confirm('Apagar toda a fila e o histórico de envios desta coleta?')) {
                        if (state.advanceTimer) window.clearTimeout(state.advanceTimer);
                        state.advanceTimer = null;
                        state.payload = emptyQueue();
                        state.running = false;
                        saveQueue();
                        panel.querySelector('[name="message_text"]').value = '';
                        render();
                        notify('Fila removida.');
                    }
                }
                if (action === 'open-compose') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('screen', 'mail');
                    url.searchParams.set('mode', 'new');
                    window.location.assign(url.toString());
                }
            });
        }

        function injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #${SCRIPT_ID}{margin:0 0 12px;padding:12px;border:1px solid #9b6f32;background:#f3e3bb;color:#3f2b14;font:12px Arial,sans-serif}
                #${SCRIPT_ID} h2{margin:0 0 4px;font-size:20px}#${SCRIPT_ID} p{margin:4px 0 10px}
                #${SCRIPT_ID} .cmp-import{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:8px;align-items:end}
                #${SCRIPT_ID} textarea{width:100%;min-height:74px;box-sizing:border-box;padding:7px;border:1px solid #98703d;background:#fff9e9;resize:vertical;font:11px Consolas,monospace}
                #${SCRIPT_ID} .cmp-file{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-weight:bold}
                #${SCRIPT_ID} .cmp-actions{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}
                #${SCRIPT_ID} .cmp-actions label{display:flex;align-items:center;gap:5px;margin-left:auto;font-weight:bold}
                #${SCRIPT_ID} .cmp-actions input[type=number]{width:55px;padding:4px}
                #${SCRIPT_ID} .cmp-subject{display:flex;align-items:center;gap:7px;margin:8px 0;font-weight:bold}#${SCRIPT_ID} .cmp-subject input{min-width:280px;padding:5px;border:1px solid #98703d;background:#fff9e9}
                #${SCRIPT_ID} .cmp-primary{background:#267b1d;color:#fff;font-weight:bold}
                #${SCRIPT_ID} .cmp-stop{background:#a12d24;color:#fff;font-weight:bold}
                #${SCRIPT_ID} .cmp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0}
                #${SCRIPT_ID} .cmp-summary div{padding:7px;border:1px solid #c59b57;background:#fff4d4;text-align:center}
                #${SCRIPT_ID} .cmp-summary strong{display:block;font-size:18px}#${SCRIPT_ID} .cmp-summary span{font-size:10px}
                #${SCRIPT_ID} .cmp-ok strong{color:#267b1d}#${SCRIPT_ID} .cmp-fail strong,.cmp-error{color:#a32020!important}
                #${SCRIPT_ID} .cmp-table-wrap{max-height:330px;overflow:auto;border:1px solid #b48a45}
                #${SCRIPT_ID} table{width:100%;border-collapse:collapse;background:#fff7df}
                #${SCRIPT_ID} th,#${SCRIPT_ID} td{padding:5px 6px;border:1px solid #d6bc86;text-align:left;vertical-align:middle}
                #${SCRIPT_ID} thead th{position:sticky;top:0;z-index:1;background:#d6ad66}
                #${SCRIPT_ID} .cmp-sent{background:#e2f4d8}#${SCRIPT_ID} .cmp-error{background:#ffe0d9}#${SCRIPT_ID} .cmp-unselected{opacity:.55}
                #${SCRIPT_ID} .cmp-empty{padding:18px;text-align:center}#${SCRIPT_ID} .cmp-status{min-height:16px;margin-top:7px;color:#326a20}
                #${SCRIPT_ID} .cmp-warning{padding:7px;border-left:4px solid #bb741d;background:#fff0c4}
                #${SCRIPT_ID} .cmp-row-actions{display:flex;flex-wrap:wrap;gap:4px}
                @media(max-width:800px){#${SCRIPT_ID} .cmp-import{grid-template-columns:1fr}#${SCRIPT_ID} .cmp-summary{grid-template-columns:repeat(2,1fr)}}`;
            document.head.appendChild(style);
        }

        function mount() {
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <h2>Chong Tribe Script — Fila de MPs de Blind <small>v${MODULE_VERSION}</small></h2>
                <p>Importe o TXT do Distribuidor, revise os destinatários e envie pela própria tela de mensagens do Tribal Wars.</p>
                <div class="cmp-warning"><strong>Proteção contra duplicidade:</strong> mensagens concluídas permanecem marcadas como enviadas. O envio automático usa intervalo mínimo, confirma a quantidade e para no primeiro erro.</div>
                <div class="cmp-import">
                    <div><label class="cmp-file">Arquivo TXT <input type="file" accept=".txt,text/plain" data-file></label><textarea name="message_text" placeholder="Cole aqui os blocos: ================ MP PARA: Jogador ================"></textarea></div>
                    <button type="button" class="btn" data-action="parse">Carregar texto</button>
                </div>
                <label class="cmp-subject">Assunto das MPs <input type="text" name="queue_subject" maxlength="120" value="${escapeHtml(state.payload.subject || DEFAULT_SUBJECT)}"></label>
                <div class="cmp-actions">
                    <button type="button" class="btn" data-action="select-all">Marcar pendentes</button>
                    <button type="button" class="btn" data-action="clear-selection">Desmarcar pendentes</button>
                    <button type="button" class="btn" data-action="retry">Tentar erros novamente</button>
                    <button type="button" class="btn" data-action="open-compose">Abrir nova mensagem</button>
                    <button type="button" class="btn cmp-primary" data-action="auto">Enviar selecionadas</button>
                    <button type="button" class="btn cmp-stop" data-action="stop" disabled>Pausar</button>
                    <button type="button" class="btn" data-action="clear">Limpar fila</button>
                    <label>Intervalo <input type="number" name="delay" min="${MIN_DELAY_SECONDS}" max="60" value="8"> segundos</label>
                </div>
                <div class="cmp-summary" data-summary></div>
                <div class="cmp-table-wrap"><table class="vis"><thead><tr><th>Usar</th><th>Destinatário</th><th>Assunto</th><th>Caracteres</th><th>Status</th><th>Ação</th></tr></thead><tbody data-list></tbody></table></div>
                <div class="cmp-status" data-status>${locateComposeForm() ? 'Formulário de mensagem encontrado.' : 'Abra “Nova mensagem” para preencher ou enviar a fila.'}</div>`;
            const host = document.querySelector('#content_value') || document.querySelector('#contentContainer') || document.body;
            host.prepend(panel);
            injectStyles();
            bindEvents(panel);
            saveQueue();
            render();
            resumeAutomaticQueue();
        }

        mount();
    }());

    // -------------------------------------------------------------------------
    // Módulo: Clusters e Relíquias
    // -------------------------------------------------------------------------
    (function () {
        'use strict';

        const SCRIPT_ID = 'chong-tribe-relic-planner';
        const STORAGE_PREFIX = 'chong_tribe_relic_planner_v1';
        const MAX_EQUIPPED = 10;
        const BONUS_CAP = 20;
        const OFFENSE_STATS = ['axe', 'light', 'ram'];
        const OFFENSE_LABELS = { axe: 'Machadeiro', light: 'Cavalaria leve', ram: 'Aríete' };
        const QUALITY_RANGES = [
            { names: ['reconhecido', 'renowned'], range: 4 },
            { names: ['superior'], range: 3 },
            { names: ['aprimorado', 'enhanced', 'improved'], range: 3 },
            { names: ['resistente', 'robust', 'sturdy'], range: 2 },
            { names: ['ma qualidade', 'poor'], range: 2 }
        ];
        const CLUSTER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#84cc16', '#14b8a6'];
        const route = new URLSearchParams(window.location.search);
        const currentScreen = route.get('screen') || '';
        const pageHeadline = [...document.querySelectorAll('#content_value h1,#content_value h2,.main-headline')]
            .map((element) => normalize(element.textContent)).join(' ');
        const relicScreen = ['relics', 'relic', 'treasury', 'relic_inventory', 'inventory'].includes(currentScreen)
            || (currentScreen !== 'map' && /tesouraria|reliquias|relics/.test(pageHeadline));
        if (relicScreen) {
            captureRelicsFromCurrentPage();
            return;
        }
        if (currentScreen !== 'map' || document.getElementById(SCRIPT_ID)) return;

        const state = {
            payload: loadPayload(),
            running: false,
            groups: []
        };

        function worldId() {
            return String(window.game_data?.world || location.hostname.split('.')[0] || 'world');
        }

        function playerId() {
            return String(window.game_data?.player?.id || window.game_data?.player?.name || 'player');
        }

        function storageKey() {
            return `${STORAGE_PREFIX}:${worldId()}:${playerId()}`;
        }

        function relicStorageKey() {
            return `${STORAGE_PREFIX}:relics:${worldId()}:${playerId()}`;
        }

        function loadRelicSnapshot() {
            try {
                const parsed = JSON.parse(localStorage.getItem(relicStorageKey()) || 'null');
                return Array.isArray(parsed?.relics) ? parsed.relics : [];
            } catch (_error) {
                return [];
            }
        }

        function saveRelicSnapshot(relics) {
            if (!relics.length) return;
            localStorage.setItem(relicStorageKey(), JSON.stringify({ capturedAt: new Date().toISOString(), relics }));
        }

        function loadPayload() {
            try {
                const parsed = JSON.parse(localStorage.getItem(storageKey()) || 'null');
                return parsed?.version >= 2 && Array.isArray(parsed.villages) ? parsed : null;
            } catch (_error) {
                return null;
            }
        }

        function savePayload(payload) {
            state.payload = payload;
            localStorage.setItem(storageKey(), JSON.stringify(payload));
        }

        function normalize(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
        }

        function parseCoordinate(value) {
            const match = String(value || '').match(/\b(\d{1,3})\s*[|,]\s*(\d{1,3})\b/);
            if (!match) return null;
            const x = Number(match[1]);
            const y = Number(match[2]);
            return { x, y, coordinate: `${x}|${y}` };
        }

        function distanceSquared(left, right) {
            return ((left.x - right.x) ** 2) + ((left.y - right.y) ** 2);
        }

        function parseGroupsPayload(payload) {
            const source = Array.isArray(payload) ? payload
                : Array.isArray(payload?.result) ? payload.result
                    : Array.isArray(payload?.groups) ? payload.groups : [];
            return source.map((group) => ({
                id: String(group.value ?? group.id ?? group.group_id ?? ''),
                name: String(group.text ?? group.name ?? group.title ?? '').trim()
            })).filter((group) => group.id && group.name);
        }

        function findNamedGroup(groups, wantedName) {
            const wanted = normalize(wantedName);
            return groups.find((group) => normalize(group.name) === wanted)
                || groups.find((group) => normalize(group.name).includes(wanted))
                || null;
        }

        function parseVillagePage(html) {
            const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
            const unique = new Map();
            const selectors = '.quickedit-vn[data-id], .quickedit-label[data-id], [data-village-id], tr[data-id]';
            doc.querySelectorAll(selectors).forEach((element) => {
                const row = element.closest('tr') || element.parentElement || element;
                const id = String(
                    element.getAttribute('data-id')
                    || element.getAttribute('data-village-id')
                    || row.getAttribute?.('data-id')
                    || element.querySelector?.('[data-id]')?.getAttribute('data-id')
                    || ''
                ).replace(/\D/g, '');
                const coordinate = parseCoordinate(`${row.textContent || ''} ${element.getAttribute('data-text') || ''} ${element.innerHTML || ''}`);
                if (!id || !coordinate || unique.has(id)) return;
                const label = element.matches('.quickedit-label') ? element : element.querySelector('.quickedit-label');
                const rawName = String(element.getAttribute('data-text') || label?.textContent || element.textContent || 'Aldeia').trim();
                const name = rawName.replace(/\s*\(?(?:\d{1,3})\s*[|,]\s*(?:\d{1,3})\)?\s*$/, '').trim() || 'Aldeia';
                unique.set(id, { id, name, ...coordinate });
            });
            return [...unique.values()];
        }

        function offenseStat(value) {
            const text = normalize(value).replace(/[_-]+/g, ' ');
            if (/machado grande|machadeiro|viking|barbar/.test(text)) return 'axe';
            if (/cavalaria leve|light cavalry|lanca curta/.test(text)) return 'light';
            if (/ariete|ram\b|estrela da manha/.test(text)) return 'ram';
            return null;
        }

        function rangeFromText(value) {
            const text = normalize(value);
            const explicit = text.match(/(?:alcance|range|raio|radius)\D{0,18}([1-6])/);
            if (explicit) return Number(explicit[1]);
            return QUALITY_RANGES.find((quality) => quality.names.some((name) => text.includes(name)))?.range || 0;
        }

        function bonusesFromText(value) {
            const text = String(value || '').replace(/\s+/g, ' ');
            const bonuses = [];
            const percent = /(.{0,90}?)([+-]?\d+(?:[.,]\d+)?)\s*%/g;
            let match;
            while ((match = percent.exec(text))) {
                const stat = offenseStat(match[1]);
                if (!stat) continue;
                const parsed = Number(match[2].replace(',', '.'));
                if (!Number.isFinite(parsed) || parsed <= 0) continue;
                const existing = bonuses.find((bonus) => bonus.stat === stat);
                if (existing) existing.value += parsed;
                else bonuses.push({ stat, value: parsed });
            }
            return bonuses;
        }

        function relicFromElement(element, index = 0) {
            const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text || !/reli|relic|machado grande|lanca curta|estrela da manha/i.test(normalize(text))) return null;
            const bonuses = bonusesFromText(text);
            if (!bonuses.length) return null;
            const coordinate = parseCoordinate(text);
            const title = element.querySelector?.('h1,h2,h3,h4,strong,[class*="title"],[class*="name"]')?.textContent?.trim();
            const id = String(
                element.getAttribute?.('data-relic-id')
                || element.getAttribute?.('data-item-id')
                || element.getAttribute?.('data-id')
                || `html-${index}-${title || text.slice(0, 30)}`
            );
            const quality = QUALITY_RANGES.find((entry) => entry.names.some((name) => normalize(text).includes(name)))?.names[0] || '';
            const equipped = Boolean(coordinate || /equipad|equipped|atribu|assigned/.test(normalize(text)));
            return {
                id,
                name: title || `Relíquia ${index + 1}`,
                quality,
                range: rangeFromText(text) || 2,
                location: equipped ? 'equipped' : 'inventory',
                villageCoordinate: coordinate?.coordinate || '',
                bonuses,
                rawText: text.slice(0, 600)
            };
        }

        function parseRelicsDocument(source) {
            const doc = typeof source === 'string'
                ? new DOMParser().parseFromString(source, 'text/html')
                : source;
            if (!doc?.querySelectorAll) return [];
            const precise = '[data-relic-id],[class*="relic-card"],[class*="relic_item"],[class*="relic-item"],[class*="relic__item"]';
            let elements = [...doc.querySelectorAll(precise)]
                .filter((element) => !element.closest?.(`#${SCRIPT_ID}`));
            if (!elements.length) {
                elements = [...doc.querySelectorAll('article,li,tr,[class*="relic"],[id*="relic"]')]
                    .filter((element) => !element.closest?.(`#${SCRIPT_ID}`))
                    .filter((element) => element.children.length < 20 && element.textContent.length < 1600);
            }
            const unique = new Map();
            elements.forEach((element, index) => {
                const relic = relicFromElement(element, index);
                if (!relic) return;
                const signature = `${relic.id}|${relic.name}|${relic.villageCoordinate}|${relic.bonuses.map((bonus) => `${bonus.stat}:${bonus.value}`).join(',')}`;
                if (!unique.has(signature)) unique.set(signature, relic);
            });
            return [...unique.values()];
        }

        function relicFromObject(value, index) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            let text;
            try { text = JSON.stringify(value); } catch (_error) { return null; }
            if (!/relic|reli|axe|machad|light|cavalaria|ram|ariete/i.test(text)) return null;
            const bonuses = [];
            Object.entries(value).forEach(([key, raw]) => {
                const stat = offenseStat(`${key} ${typeof raw === 'string' ? raw : ''}`);
                const number = typeof raw === 'number' ? raw : Number(String(raw).match(/[+-]?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'));
                if (stat && Number.isFinite(number) && number > 0 && number <= 100) bonuses.push({ stat, value: number });
            });
            function collectNested(current, inheritedLabel = '', depth = 0) {
                if (!current || typeof current !== 'object' || depth > 4) return;
                const label = String(current.name || current.label || current.stat || current.type_name || current.key || inheritedLabel);
                const stat = offenseStat(label);
                const rawValue = current.value ?? current.amount ?? current.bonus ?? current.percentage ?? current.percent;
                const number = Number(String(rawValue ?? '').replace(',', '.'));
                if (stat && Number.isFinite(number) && number > 0 && number <= 100) {
                    const existing = bonuses.find((bonus) => bonus.stat === stat && bonus.value === number);
                    if (!existing) bonuses.push({ stat, value: number });
                }
                Object.entries(current).forEach(([key, child]) => {
                    if (child && typeof child === 'object') collectNested(child, `${label} ${key}`, depth + 1);
                });
            }
            collectNested(value);
            if (!bonuses.length) return null;
            const coordinate = parseCoordinate(value.coordinate || value.coords || value.village_name || text);
            const equipped = Boolean(value.equipped || value.assigned || value.village_id || coordinate);
            return {
                id: String(value.id || value.relic_id || value.item_id || `json-${index}`),
                name: String(value.name || value.title || value.type_name || `Relíquia ${index + 1}`),
                quality: String(value.quality_name || value.quality || value.rarity || ''),
                range: Number(value.range || value.radius || value.area_of_effect) || rangeFromText(text) || 2,
                location: equipped ? 'equipped' : 'inventory',
                villageCoordinate: coordinate?.coordinate || '',
                bonuses,
                rawText: text.slice(0, 600)
            };
        }

        function parseRelicsJson(value) {
            const found = [];
            const seen = new WeakSet();
            function visit(current, depth = 0) {
                if (!current || typeof current !== 'object' || depth > 7 || seen.has(current)) return;
                seen.add(current);
                const relic = relicFromObject(current, found.length);
                if (relic) found.push(relic);
                Object.values(current).forEach((child) => visit(child, depth + 1));
            }
            visit(value);
            const unique = new Map();
            found.forEach((relic) => {
                const key = relic.id || `${relic.name}:${relic.villageCoordinate}:${JSON.stringify(relic.bonuses)}`;
                if (!unique.has(key)) unique.set(key, relic);
            });
            return [...unique.values()];
        }

        function parseRelicsHtml(html) {
            const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
            const candidates = parseRelicsDocument(doc);
            doc.querySelectorAll('script[type="application/json"],script[data-json]').forEach((script) => {
                try { candidates.push(...parseRelicsJson(JSON.parse(script.textContent))); } catch (_error) { /* formato não JSON */ }
            });
            const unique = new Map();
            candidates.forEach((relic) => {
                const key = relic.id || `${relic.name}:${relic.villageCoordinate}:${JSON.stringify(relic.bonuses)}`;
                if (!unique.has(key)) unique.set(key, relic);
            });
            return [...unique.values()];
        }

        function captureRelicsFromCurrentPage() {
            let bestCount = 0;
            let timer = null;
            const capture = () => {
                const relics = parseRelicsDocument(document);
                if (relics.length <= bestCount) return;
                bestCount = relics.length;
                saveRelicSnapshot(relics);
                console.info(`[Clusters e Relíquias] ${relics.length} relíquia(s) sincronizada(s) da Tesouraria.`);
            };
            const schedule = () => {
                clearTimeout(timer);
                timer = setTimeout(capture, 250);
            };
            capture();
            const observer = new MutationObserver(schedule);
            observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
            setTimeout(capture, 1500);
            setTimeout(capture, 4000);
            setTimeout(() => { capture(); observer.disconnect(); }, 10000);
        }

        function inferClusterThreshold(villages) {
            if (villages.length < 2) return 3;
            const nearest = villages.map((village) => Math.sqrt(Math.min(...villages
                .filter((candidate) => candidate.id !== village.id)
                .map((candidate) => distanceSquared(village, candidate))))).sort((a, b) => a - b);
            const median = nearest[Math.floor(nearest.length / 2)] || 2;
            return Math.max(3, Math.min(12, Math.round(median * 2)));
        }

        function buildClusters(villages, threshold) {
            const clusters = [];
            const remaining = new Set(villages.map((village) => village.id));
            const byId = new Map(villages.map((village) => [village.id, village]));
            const limit = threshold ** 2;
            while (remaining.size) {
                const firstId = remaining.values().next().value;
                const queue = [byId.get(firstId)];
                const members = [];
                remaining.delete(firstId);
                while (queue.length) {
                    const village = queue.shift();
                    members.push(village);
                    [...remaining].forEach((id) => {
                        const candidate = byId.get(id);
                        if (distanceSquared(village, candidate) <= limit) {
                            remaining.delete(id);
                            queue.push(candidate);
                        }
                    });
                }
                const x = members.reduce((sum, village) => sum + village.x, 0) / members.length;
                const y = members.reduce((sum, village) => sum + village.y, 0) / members.length;
                const cluster = { id: clusters.length + 1, members, x, y };
                members.forEach((village) => { village.clusterId = cluster.id; });
                clusters.push(cluster);
            }
            return clusters.sort((left, right) => right.members.length - left.members.length)
                .map((cluster, index) => {
                    cluster.id = index + 1;
                    cluster.members.forEach((village) => { village.clusterId = cluster.id; });
                    return cluster;
                });
        }

        function optimizePlacements(allVillages, attackVillages, options) {
            const range = Math.max(1, Number(options.range) || 2);
            const maxRelics = Math.max(1, Math.min(MAX_EQUIPPED, Number(options.maxRelics) || MAX_EQUIPPED));
            const desiredLayers = Math.max(1, Math.min(3, Number(options.desiredLayers) || 1));
            const radiusSquared = range ** 2;
            const coverages = allVillages.map((center) => ({
                center,
                attacks: attackVillages.filter((attack) => distanceSquared(center, attack) <= radiusSquared)
            })).filter((entry) => entry.attacks.length);
            const coverageCount = new Map(attackVillages.map((village) => [village.id, 0]));
            const selected = [];
            while (selected.length < maxRelics) {
                let best = null;
                coverages.forEach((entry) => {
                    if (selected.some((selection) => selection.center.id === entry.center.id)) return;
                    const uncovered = entry.attacks.filter((attack) => coverageCount.get(attack.id) === 0).length;
                    const useful = entry.attacks.filter((attack) => coverageCount.get(attack.id) < desiredLayers).length;
                    const score = (uncovered * 1000) + (useful * 100) + (entry.attacks.length * 2) + (entry.center.type === 'attack' ? 1 : 0);
                    if (!best || score > best.score || (score === best.score && entry.center.coordinate.localeCompare(best.center.coordinate) < 0)) {
                        best = { ...entry, score, uncovered, useful };
                    }
                });
                if (!best || best.useful === 0) break;
                best.attacks.forEach((attack) => coverageCount.set(attack.id, coverageCount.get(attack.id) + 1));
                const clusterCounts = new Map();
                best.attacks.forEach((attack) => clusterCounts.set(attack.clusterId, (clusterCounts.get(attack.clusterId) || 0) + 1));
                best.clusterId = [...clusterCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
                selected.push(best);
            }
            return {
                placements: selected,
                coverageCount,
                covered: attackVillages.filter((village) => coverageCount.get(village.id) > 0).length,
                desiredCovered: attackVillages.filter((village) => coverageCount.get(village.id) >= desiredLayers).length,
                range,
                desiredLayers
            };
        }

        function optimizeRelicPlacements(allVillages, attackVillages, relics) {
            const offensiveRelics = relics
                .filter((relic) => relic.bonuses.some((bonus) => OFFENSE_STATS.includes(bonus.stat)))
                .sort((left, right) => {
                    const leftPower = left.bonuses.reduce((sum, bonus) => sum + bonus.value, 0) * left.range;
                    const rightPower = right.bonuses.reduce((sum, bonus) => sum + bonus.value, 0) * right.range;
                    return rightPower - leftPower;
                });
            const limit = Math.min(MAX_EQUIPPED, offensiveRelics.length);
            const selectedRelics = new Set();
            const selectedCenters = new Set();
            const coverage = new Map(attackVillages.map((village) => [village.id, { axe: 0, light: 0, ram: 0 }]));
            const placements = [];

            while (placements.length < limit) {
                let best = null;
                offensiveRelics.forEach((relic) => {
                    if (selectedRelics.has(relic.id)) return;
                    const bonuses = relic.bonuses.filter((bonus) => OFFENSE_STATS.includes(bonus.stat));
                    allVillages.forEach((center) => {
                        if (selectedCenters.has(center.id)) return;
                        const affected = attackVillages.filter((village) => distanceSquared(center, village) <= relic.range ** 2);
                        if (!affected.length) return;
                        let completed = 0;
                        let newStats = 0;
                        let progress = 0;
                        affected.forEach((village) => {
                            const before = coverage.get(village.id);
                            const wasComplete = OFFENSE_STATS.every((stat) => before[stat] > 0);
                            const after = { ...before };
                            bonuses.forEach((bonus) => {
                                if (after[bonus.stat] <= 0) newStats += 1;
                                const capped = Math.min(BONUS_CAP, after[bonus.stat] + bonus.value);
                                progress += capped - after[bonus.stat];
                                after[bonus.stat] = capped;
                            });
                            if (!wasComplete && OFFENSE_STATS.every((stat) => after[stat] > 0)) completed += 1;
                        });
                        const samePosition = relic.villageCoordinate && relic.villageCoordinate === center.coordinate ? 1 : 0;
                        const score = (completed * 1000000) + (newStats * 10000) + (affected.length * 100) + progress + samePosition;
                        if (!best || score > best.score) best = { relic, center, affected, bonuses, score, completed };
                    });
                });
                if (!best) break;
                selectedRelics.add(best.relic.id);
                selectedCenters.add(best.center.id);
                best.affected.forEach((village) => {
                    const current = coverage.get(village.id);
                    best.bonuses.forEach((bonus) => {
                        current[bonus.stat] = Math.min(BONUS_CAP, current[bonus.stat] + bonus.value);
                    });
                });
                const clusterCounts = new Map();
                best.affected.forEach((village) => clusterCounts.set(village.clusterId, (clusterCounts.get(village.clusterId) || 0) + 1));
                const targetCoordinate = best.center.coordinate;
                const action = best.relic.location === 'equipped'
                    ? best.relic.villageCoordinate === targetCoordinate ? 'Manter onde está' : `Mover de ${best.relic.villageCoordinate || 'outra aldeia'}`
                    : 'Equipar do inventário';
                placements.push({
                    centerId: best.center.id,
                    relic: best.relic,
                    coveredIds: best.affected.map((village) => village.id),
                    newCombos: best.completed,
                    clusterId: [...clusterCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0,
                    action
                });
            }
            const comboCovered = attackVillages.filter((village) => OFFENSE_STATS.every((stat) => coverage.get(village.id)[stat] > 0)).length;
            const anyCovered = attackVillages.filter((village) => OFFENSE_STATS.some((stat) => coverage.get(village.id)[stat] > 0)).length;
            return { placements, coverage, comboCovered, anyCovered, offensiveRelics };
        }

        function villageOverviewUrl(groupId) {
            const url = new URL('/game.php', window.location.origin);
            url.searchParams.set('village', String(window.game_data?.village?.id || ''));
            url.searchParams.set('screen', 'overview_villages');
            url.searchParams.set('mode', 'combined');
            url.searchParams.set('group', String(groupId));
            url.searchParams.set('page', '-1');
            return url.toString();
        }

        async function fetchText(url) {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) throw new Error(`Falha HTTP ${response.status} ao carregar dados do jogo.`);
            return response.text();
        }

        async function loadGroups() {
            const url = new URL('/game.php', window.location.origin);
            url.searchParams.set('village', String(window.game_data?.village?.id || ''));
            url.searchParams.set('screen', 'groups');
            url.searchParams.set('mode', 'overview');
            url.searchParams.set('ajax', 'load_group_menu');
            const text = await fetchText(url);
            try {
                return parseGroupsPayload(JSON.parse(text));
            } catch (_error) {
                throw new Error('O Tribal Wars respondeu com um formato inesperado ao carregar os grupos.');
            }
        }

        function relicPageCandidates() {
            const urls = [...document.querySelectorAll('a[href]')]
                .filter((anchor) => /tesouraria|reliquia|relic/.test(normalize(`${anchor.textContent} ${anchor.title} ${anchor.href}`)))
                .map((anchor) => anchor.href);
            const screens = ['relics', 'relic', 'treasury', 'relic_inventory'];
            screens.forEach((screen) => {
                const url = new URL('/game.php', window.location.origin);
                url.searchParams.set('village', String(window.game_data?.village?.id || ''));
                url.searchParams.set('screen', screen);
                urls.push(url.toString());
            });
            return [...new Set(urls)];
        }

        async function loadRelics() {
            const cached = loadRelicSnapshot();
            const pageGlobals = [
                window.game_data?.relics,
                window.game_data?.relic_data,
                window.relics,
                window.relicData,
                window.Relic
            ].filter(Boolean);
            let best = parseRelicsDocument(document);
            pageGlobals.forEach((value) => {
                const parsed = parseRelicsJson(value);
                if (parsed.length > best.length) best = parsed;
            });
            for (const url of relicPageCandidates()) {
                try {
                    const html = await fetchText(url);
                    const normalized = normalize(html);
                    if (!/reliquia|relic/.test(normalized)) continue;
                    const parsed = parseRelicsHtml(html);
                    if (parsed.length > best.length) best = parsed;
                } catch (_error) {
                    // Algumas rotas não existem em todos os mundos; segue para a próxima descoberta.
                }
            }
            if (!best.length) best = cached;
            saveRelicSnapshot(best);
            return best;
        }

        async function loadGroupVillages(groupId) {
            return parseVillagePage(await fetchText(villageOverviewUrl(groupId)));
        }

        async function collectAndAnalyze(settings) {
            const groups = state.groups.length ? state.groups : await loadGroups();
            const attackGroup = groups.find((group) => group.id === settings.attackGroupId) || findNamedGroup(groups, settings.attackGroupName);
            const defenseGroup = groups.find((group) => group.id === settings.defenseGroupId) || findNamedGroup(groups, settings.defenseGroupName);
            if (!attackGroup) throw new Error('Selecione um grupo ofensivo válido.');
            if (!defenseGroup) throw new Error('Selecione um grupo defensivo válido.');
            const [all, attack, defense, relics] = await Promise.all([
                loadGroupVillages('0'),
                loadGroupVillages(attackGroup.id),
                loadGroupVillages(defenseGroup.id),
                loadRelics()
            ]);
            if (!all.length) throw new Error('Nenhuma aldeia foi encontrada na visão geral.');
            if (!attack.length) throw new Error(`O grupo “${attackGroup.name}” não possui aldeias ou não pôde ser lido.`);
            const attackIds = new Set(attack.map((village) => village.id));
            const defenseIds = new Set(defense.map((village) => village.id));
            const villages = all.map((village) => ({
                ...village,
                type: attackIds.has(village.id) ? 'attack' : defenseIds.has(village.id) ? 'defense' : 'other'
            }));
            const attacks = villages.filter((village) => village.type === 'attack');
            const clusterThreshold = inferClusterThreshold(attacks);
            const clusters = buildClusters(attacks, clusterThreshold);
            const plan = optimizeRelicPlacements(villages, attacks, relics);
            return {
                version: 2,
                world: worldId(),
                player: String(window.game_data?.player?.name || ''),
                generatedAt: new Date().toISOString(),
                settings: { ...settings, clusterThreshold },
                groups: { attack: attackGroup, defense: defenseGroup },
                relics,
                villages,
                clusters: clusters.map((cluster) => ({
                    id: cluster.id,
                    x: cluster.x,
                    y: cluster.y,
                    memberIds: cluster.members.map((village) => village.id)
                })),
                placements: plan.placements,
                coverage: Object.fromEntries(plan.coverage),
                covered: plan.anyCovered,
                comboCovered: plan.comboCovered,
                offensiveRelicCount: plan.offensiveRelics.length
            };
        }

        function villageMap(payload) {
            return new Map(payload.villages.map((village) => [village.id, village]));
        }

        function mapUrl(village) {
            const url = new URL(window.location.href);
            url.searchParams.set('screen', 'map');
            url.searchParams.set('x', String(village.x));
            url.searchParams.set('y', String(village.y));
            return url.toString();
        }

        function renderSvg(payload) {
            if (!payload?.villages?.length) return '<div class="ctr-empty">Nenhuma análise salva.</div>';
            const all = payload.villages;
            const settings = payload.settings;
            const byId = villageMap(payload);
            let minX = Math.min(...all.map((village) => village.x));
            let maxX = Math.max(...all.map((village) => village.x));
            let minY = Math.min(...all.map((village) => village.y));
            let maxY = Math.max(...all.map((village) => village.y));
            const largestRange = Math.max(2, ...payload.placements.map((placement) => Number(placement.relic?.range) || 2));
            const margin = Math.max(5, largestRange + 2);
            minX -= margin; maxX += margin; minY -= margin; maxY += margin;
            const width = Math.max(20, maxX - minX);
            const height = Math.max(20, maxY - minY);
            const scale = Math.max(width, height);
            const pointRadius = Math.max(.65, Math.min(1.5, scale / 170));
            const grid = [];
            const step = scale > 300 ? 50 : scale > 100 ? 20 : 10;
            for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) grid.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}"/>`);
            for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) grid.push(`<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}"/>`);
            const areas = payload.placements.map((placement, index) => {
                const center = byId.get(placement.centerId);
                if (!center) return '';
                const range = Number(placement.relic?.range) || 2;
                return `<circle cx="${center.x}" cy="${center.y}" r="${range}" class="ctr-area"><title>${escapeHtml(placement.relic?.name || `Relíquia ${index + 1}`)} · alcance ${range}</title></circle>`;
            }).join('');
            const points = all.map((village) => {
                const stats = payload.coverage?.[village.id] || {};
                const coverage = OFFENSE_STATS.filter((stat) => Number(stats[stat]) > 0).length;
                const color = village.type === 'attack'
                    ? CLUSTER_COLORS[(Number(village.clusterId || 1) - 1) % CLUSTER_COLORS.length]
                    : village.type === 'defense' ? '#2563eb' : '#64748b';
                return `<a href="${escapeHtml(mapUrl(village))}"><circle cx="${village.x}" cy="${village.y}" r="${pointRadius}" fill="${color}" class="ctr-village ${coverage ? 'ctr-covered' : ''}"><title>${escapeHtml(`${village.name} · ${village.coordinate} · ${village.type === 'attack' ? `Ataque · cluster ${village.clusterId} · ${coverage}/3 bônus do combo` : village.type === 'defense' ? 'Defesa' : 'Sem classificação'}`)}</title></circle></a>`;
            }).join('');
            const centers = payload.placements.map((placement, index) => {
                const center = byId.get(placement.centerId);
                if (!center) return '';
                return `<circle cx="${center.x}" cy="${center.y}" r="${pointRadius * 2.2}" class="ctr-center"/><text x="${center.x}" y="${center.y + pointRadius * .42}" class="ctr-center-label">${index + 1}</text>`;
            }).join('');
            return `<svg class="ctr-svg" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid meet"><rect x="${minX}" y="${minY}" width="${width}" height="${height}" class="ctr-bg"/><g class="ctr-grid">${grid.join('')}</g>${areas}${points}${centers}</svg>`;
        }

        function renderResults() {
            const container = document.querySelector(`#${SCRIPT_ID} [data-results]`);
            if (!container) return;
            const payload = state.payload;
            if (!payload) {
                container.innerHTML = '<div class="ctr-empty">Selecione os grupos e clique em “Analisar conta”.</div>';
                return;
            }
            const byId = villageMap(payload);
            const attacks = payload.villages.filter((village) => village.type === 'attack');
            const defenses = payload.villages.filter((village) => village.type === 'defense');
            const coveragePct = attacks.length ? Math.round((payload.covered / attacks.length) * 100) : 0;
            const comboPct = attacks.length ? Math.round((payload.comboCovered / attacks.length) * 100) : 0;
            const clusterRows = payload.clusters.map((cluster) => {
                const members = cluster.memberIds.map((id) => byId.get(id)).filter(Boolean);
                const covered = members.filter((village) => OFFENSE_STATS.every((stat) => Number(payload.coverage?.[village.id]?.[stat]) > 0)).length;
                return `<tr><td><i style="background:${CLUSTER_COLORS[(cluster.id - 1) % CLUSTER_COLORS.length]}"></i> ${cluster.id}</td><td>${formatNumber(members.length)}</td><td>${formatNumber(covered)}</td><td>${Math.round(cluster.x)}|${Math.round(cluster.y)}</td></tr>`;
            }).join('');
            const placementRows = payload.placements.map((placement, index) => {
                const center = byId.get(placement.centerId);
                const bonuses = placement.relic.bonuses
                    .filter((bonus) => OFFENSE_STATS.includes(bonus.stat))
                    .map((bonus) => `${OFFENSE_LABELS[bonus.stat]} +${bonus.value}%`).join(' · ');
                return `<tr><td><strong>${index + 1}</strong></td><td><a href="${escapeHtml(mapUrl(center))}">${escapeHtml(center.name)} (${center.coordinate})</a></td><td>${placement.clusterId || '—'}</td><td>${escapeHtml(placement.relic.name)}</td><td>${placement.relic.range}</td><td>${escapeHtml(bonuses)}</td><td>${formatNumber(placement.coveredIds.length)}</td><td>${formatNumber(placement.newCombos)}</td><td>${escapeHtml(placement.action)}</td></tr>`;
            }).join('');
            const relicStatus = payload.relics.length
                ? `${payload.relics.length} relíquia(s) lida(s), ${payload.offensiveRelicCount} com bônus do combo ofensivo.`
                : 'Nenhuma relíquia pôde ser lida automaticamente na Tesouraria.';
            container.innerHTML = `
                <div class="ctr-summary">
                    <div><strong>${formatNumber(payload.villages.length)}</strong><span>Aldeias totais</span></div>
                    <div><strong>${formatNumber(attacks.length)}</strong><span>Grupo ataque</span></div>
                    <div><strong>${formatNumber(defenses.length)}</strong><span>Grupo defesa</span></div>
                    <div><strong>${formatNumber(payload.clusters.length)}</strong><span>Clusters detectados</span></div>
                    <div><strong>${payload.covered}/${attacks.length}</strong><span>Algum bônus (${coveragePct}%)</span></div>
                    <div><strong>${payload.comboCovered}/${attacks.length}</strong><span>Combo completo (${comboPct}%)</span></div>
                    <div><strong>${formatNumber(payload.relics.length)}</strong><span>Relíquias encontradas</span></div>
                    <div><strong>${formatNumber(payload.placements.length)}</strong><span>Equipamentos sugeridos</span></div>
                </div>
                <p class="ctr-relic-status ${payload.relics.length ? '' : 'ctr-warning'}">${escapeHtml(relicStatus)}</p>
                <div class="ctr-legend"><span><i class="ctr-attack"></i>Ataque (cor por cluster)</span><span><i class="ctr-defense"></i>Defesa</span><span><i class="ctr-other"></i>Outras</span><span><i class="ctr-relic"></i>Área sugerida</span></div>
                <div class="ctr-map">${renderSvg(payload)}</div>
                <p class="ctr-help">Passe o mouse para ver a aldeia. Clique em um ponto ou coordenada para centralizar o mapa do jogo.</p>
                <h3>Distribuição das relíquias ofensivas existentes</h3>
                <div class="ctr-table"><table class="vis"><thead><tr><th>#</th><th>Aldeia-destino</th><th>Cluster</th><th>Relíquia</th><th>Alcance</th><th>Bônus usados</th><th>Ataques no raio</th><th>Novos combos</th><th>Ação</th></tr></thead><tbody>${placementRows || '<tr><td colspan="9">Nenhuma relíquia ofensiva disponível ou reconhecida.</td></tr>'}</tbody></table></div>
                <h3>Resumo dos clusters</h3>
                <div class="ctr-table ctr-small-table"><table class="vis"><thead><tr><th>Cluster</th><th>Aldeias ataque</th><th>Combo completo</th><th>Centro aproximado</th></tr></thead><tbody>${clusterRows}</tbody></table></div>
                <p class="ctr-generated">Atualizado em ${escapeHtml(new Date(payload.generatedAt).toLocaleString('pt-BR'))}. Clusters calculados automaticamente (distância ${payload.settings.clusterThreshold}). O cálculo limita cada estatística a 20% e apenas recomenda; nenhuma relíquia é movida automaticamente.</p>`;
        }

        function notify(message, type = 'info') {
            const status = document.querySelector(`#${SCRIPT_ID} [data-status]`);
            if (status) {
                status.textContent = message;
                status.dataset.type = type;
            }
            const ui = window.UI || (typeof unsafeWindow !== 'undefined' ? unsafeWindow.UI : null);
            if (type === 'error' && typeof ui?.ErrorMessage === 'function') ui.ErrorMessage(message, 5000);
            else if (type === 'success' && typeof ui?.SuccessMessage === 'function') ui.SuccessMessage(message, 3500);
        }

        function setGroupOptions(select, groups, selectedId, fallbackName) {
            select.innerHTML = groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join('');
            const selected = groups.find((group) => group.id === selectedId)
                || findNamedGroup(groups, fallbackName)
                || groups[0];
            if (selected) select.value = selected.id;
        }

        async function hydrateGroups(panel) {
            const attackSelect = panel.querySelector('[name="attack_group"]');
            const defenseSelect = panel.querySelector('[name="defense_group"]');
            try {
                notify('Carregando grupos existentes da conta…');
                state.groups = await loadGroups();
                const saved = state.payload?.settings || {};
                setGroupOptions(attackSelect, state.groups, saved.attackGroupId, saved.attackGroupName || 'ataque');
                setGroupOptions(defenseSelect, state.groups, saved.defenseGroupId, saved.defenseGroupName || 'defesa');
                notify(`${state.groups.length} grupo(s) carregado(s). Selecione os grupos e analise a conta.`, 'success');
            } catch (error) {
                attackSelect.innerHTML = '<option value="">Falha ao carregar</option>';
                defenseSelect.innerHTML = '<option value="">Falha ao carregar</option>';
                notify(error.message || 'Não foi possível carregar os grupos.', 'error');
            }
        }

        function readSettings(panel) {
            const attack = panel.querySelector('[name="attack_group"]');
            const defense = panel.querySelector('[name="defense_group"]');
            return {
                attackGroupId: attack.value,
                attackGroupName: attack.selectedOptions[0]?.textContent || '',
                defenseGroupId: defense.value,
                defenseGroupName: defense.selectedOptions[0]?.textContent || ''
            };
        }

        async function analyze(panel) {
            if (state.running) return;
            state.running = true;
            panel.querySelector('[data-action="analyze"]').disabled = true;
            notify('Carregando grupos, aldeias, inventário e relíquias equipadas…');
            try {
                const payload = await collectAndAnalyze(readSettings(panel));
                savePayload(payload);
                renderResults();
                const extra = payload.relics.length ? `${payload.relics.length} relíquia(s) analisada(s)` : 'nenhuma relíquia reconhecida';
                notify(`Planejamento concluído: ${payload.comboCovered} aldeia(s) com o combo completo; ${extra}.`, payload.relics.length ? 'success' : 'error');
            } catch (error) {
                console.error('[Otimizador de Relíquias]', error);
                notify(error.message || 'Não foi possível analisar as aldeias.', 'error');
            } finally {
                state.running = false;
                panel.querySelector('[data-action="analyze"]').disabled = false;
            }
        }

        function injectStyles() {
            if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                #${SCRIPT_ID}-launcher{position:fixed;top:150px;right:12px;bottom:auto;z-index:2147483646;padding:9px 13px;border:2px solid #71501e;border-radius:7px;background:#e8c678;color:#321b05;font-weight:bold;box-shadow:0 3px 10px #0008;cursor:pointer}
                #${SCRIPT_ID}-launcher:hover{filter:brightness(1.08)}
                #${SCRIPT_ID}{position:fixed;inset:3vh 3vw;z-index:10000;display:none;overflow:auto;padding:14px;border:3px solid #684011;border-radius:10px;background:#f4e4bc;color:#2c1705;box-shadow:0 12px 50px #000b;font:12px Arial,sans-serif}
                #${SCRIPT_ID}.ctr-open{display:block}#${SCRIPT_ID} *{box-sizing:border-box}#${SCRIPT_ID} h2{margin:0;font-size:22px}#${SCRIPT_ID} h3{margin:14px 0 5px}
                #${SCRIPT_ID} .ctr-head{display:flex;align-items:flex-start;gap:10px}#${SCRIPT_ID} .ctr-head p{margin:4px 0}#${SCRIPT_ID} .ctr-close{margin-left:auto;font-size:20px}
                #${SCRIPT_ID} .ctr-controls{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:7px;align-items:end;margin:10px 0;padding:9px;border:1px solid #bd914c;background:#ead39c}
                #${SCRIPT_ID} label{display:grid;gap:3px;font-weight:bold}#${SCRIPT_ID} input,#${SCRIPT_ID} select{width:100%;padding:6px;border:1px solid #98703d;background:#fff9e9}
                #${SCRIPT_ID} .ctr-primary{padding:7px;background:#33731f;color:#fff;font-weight:bold}#${SCRIPT_ID} [data-status]{grid-column:1/-1;min-height:17px}#${SCRIPT_ID} [data-status][data-type=error]{color:#a11616}#${SCRIPT_ID} [data-status][data-type=success]{color:#267218}
                #${SCRIPT_ID} .ctr-summary{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}#${SCRIPT_ID} .ctr-summary div{display:grid;justify-items:center;padding:7px;border:1px solid #c49a58;background:#fff2cf}#${SCRIPT_ID} .ctr-summary strong{font-size:17px}#${SCRIPT_ID} .ctr-summary span{font-size:10px}#${SCRIPT_ID} .ctr-relic-status{padding:6px 8px;border:1px solid #8aae67;background:#edf8dd}#${SCRIPT_ID} .ctr-warning{border-color:#c57055;background:#ffe1d4;color:#922b17}
                #${SCRIPT_ID} .ctr-legend{display:flex;flex-wrap:wrap;gap:12px;margin:7px 0;padding:6px;background:#ead39c}#${SCRIPT_ID} .ctr-legend span{display:flex;align-items:center;gap:4px}#${SCRIPT_ID} .ctr-legend i,#${SCRIPT_ID} td i{display:inline-block;width:11px;height:11px;border:1px solid #4b2d0c;border-radius:50%}.ctr-attack{background:#ef4444}.ctr-defense{background:#2563eb}.ctr-other{background:#64748b}.ctr-relic{background:#facc15}
                #${SCRIPT_ID} .ctr-map{height:45vh;min-height:330px;border:2px solid #714313;background:#d4c797}#${SCRIPT_ID} .ctr-svg{display:block;width:100%;height:100%}#${SCRIPT_ID} .ctr-bg{fill:#d4c797}#${SCRIPT_ID} .ctr-grid line{stroke:#817554;stroke-width:.12;opacity:.55}.ctr-area{fill:rgba(250,204,21,.12);stroke:#d89b08;stroke-width:.32;stroke-dasharray:.8 .45}.ctr-village{stroke:#fff;stroke-width:.18;cursor:pointer}.ctr-covered{stroke:#fef08a;stroke-width:.34}.ctr-center{fill:#111827;stroke:#fde047;stroke-width:.35;pointer-events:none}.ctr-center-label{fill:#fff;font:bold 2px Arial;text-anchor:middle;pointer-events:none}
                #${SCRIPT_ID} .ctr-help,#${SCRIPT_ID} .ctr-generated{margin:4px 0;color:#6c512d}#${SCRIPT_ID} .ctr-table{overflow:auto;max-height:230px}#${SCRIPT_ID} table{width:100%;border-collapse:collapse}#${SCRIPT_ID} th,#${SCRIPT_ID} td{padding:5px;border:1px solid #c5a46d;text-align:left}#${SCRIPT_ID} th{position:sticky;top:0;background:#d5ad68}.ctr-small-table{max-width:620px}.ctr-empty{padding:25px;text-align:center;border:1px dashed #af8544;background:#fff5d9}
                @media(max-width:1000px){#${SCRIPT_ID} .ctr-controls{grid-template-columns:repeat(2,1fr)}#${SCRIPT_ID} .ctr-summary{grid-template-columns:repeat(3,1fr)}}`;
            document.head.appendChild(style);
        }

        function mount() {
            injectStyles();
            const launcher = document.createElement('button');
            launcher.id = `${SCRIPT_ID}-launcher`;
            launcher.type = 'button';
            launcher.textContent = '🧭 Clusters e Relíquias';
            launcher.title = 'Abrir o planejador de clusters e relíquias';
            const panel = document.createElement('section');
            panel.id = SCRIPT_ID;
            panel.innerHTML = `
                <div class="ctr-head"><div><h2>Chong Tribe Script — Clusters e Relíquias</h2><p>Lê os grupos e as relíquias da conta, detecta os clusters e maximiza o combo Machadeiro + Cavalaria leve + Aríete.</p></div><button type="button" class="btn ctr-close" data-action="close">×</button></div>
                <div class="ctr-controls">
                    <label>Grupo ofensivo<select name="attack_group"><option value="">Carregando grupos…</option></select></label>
                    <label>Grupo defensivo<select name="defense_group"><option value="">Carregando grupos…</option></select></label>
                    <button type="button" class="btn ctr-primary" data-action="analyze">Analisar conta</button>
                    <span data-status>Carregando os grupos existentes da conta…</span>
                </div>
                <div data-results></div>`;
            document.body.append(launcher, panel);
            launcher.addEventListener('click', () => panel.classList.add('ctr-open'));
            panel.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (action === 'close') panel.classList.remove('ctr-open');
                if (action === 'analyze') analyze(panel);
            });
            renderResults();
            if (!window.__CTS_RELIC_TEST__) hydrateGroups(panel);
        }

        if (window.__CTS_RELIC_TEST__) {
            window.__CTS_RELIC_TEST_API__ = {
                parseGroupsPayload,
                findNamedGroup,
                parseVillagePage,
                parseRelicsHtml,
                inferClusterThreshold,
                buildClusters,
                optimizePlacements,
                optimizeRelicPlacements
            };
        }

        mount();
    }());

    // -------------------------------------------------------------------------
    // Módulo: Organizador das Ferramentas do Minimapa
    // -------------------------------------------------------------------------
    (() => {
        'use strict';

        const SCRIPT_ID = 'chong-tribe-minimap-tools';
        const query = new URLSearchParams(window.location.search);
        if (query.get('screen') !== 'map' || document.getElementById(SCRIPT_ID)) return;

        const TOOL_DEFINITIONS = [
            { key: 'relics', selector: '#chong-tribe-relic-planner-launcher', label: 'Clusters e Relíquias' },
            { key: 'troops', selector: '#chonguera-tropas-mapa', label: 'Tropas no Mapa' },
            { key: 'strategy', selector: '#chonguera-mapa-estrategico', label: 'Mapa Estratégico' }
        ];
        const STORAGE_KEY = `chong_tribe_minimap_tools_open:${window.game_data?.world || window.location.hostname}`;
        const VISIBILITY_STORAGE_KEY = `chong_tribe_minimap_tools_visibility:${window.game_data?.world || window.location.hostname}`;

        function injectStyles() {
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                #${SCRIPT_ID}{position:fixed;right:14px;bottom:14px;z-index:2147483645;font:11px Verdana,Arial,sans-serif;color:#2b1a0a}
                #${SCRIPT_ID} *{box-sizing:border-box}
                #${SCRIPT_ID} .cts-map-dock-toggle{position:relative;display:grid;place-items:center;width:54px;height:54px;margin-left:auto;border:2px solid #704013;border-radius:17px;background:linear-gradient(145deg,#a8652d,#60300f);color:#fff3d1;box-shadow:0 7px 22px #0008;font-size:25px;cursor:pointer;transition:transform .15s,filter .15s}
                #${SCRIPT_ID} .cts-map-dock-toggle:hover{transform:translateY(-2px);filter:brightness(1.12)}
                #${SCRIPT_ID} .cts-map-dock-toggle[aria-expanded=true]{background:linear-gradient(145deg,#337d37,#1d5426)}
                #${SCRIPT_ID} .cts-map-dock-count{position:absolute;top:-6px;right:-5px;min-width:19px;height:19px;padding:2px 5px;border:2px solid #f7e8be;border-radius:999px;background:#d9362b;color:#fff;font:bold 10px Arial;line-height:11px}
                #${SCRIPT_ID} .cts-map-dock-panel{position:absolute;right:0;bottom:64px;width:min(330px,calc(100vw - 24px));max-height:min(660px,calc(100vh - 90px));overflow:auto;border:2px solid #704013;border-radius:12px;background:#f2dfad;box-shadow:0 12px 34px #0009}
                #${SCRIPT_ID}:not(.cts-map-dock-open) .cts-map-dock-panel{display:none}
                #${SCRIPT_ID} .cts-map-dock-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:9px;padding:9px 10px;border-bottom:1px solid #9e7135;background:linear-gradient(#9a5b27,#683311);color:#fff4d7}
                #${SCRIPT_ID} .cts-map-dock-head span{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#f1c96f;color:#59300d;font-size:16px}
                #${SCRIPT_ID} .cts-map-dock-head div{min-width:0;flex:1}
                #${SCRIPT_ID} .cts-map-dock-head strong,#${SCRIPT_ID} .cts-map-dock-head small{display:block;margin:0}
                #${SCRIPT_ID} .cts-map-dock-head small{margin-top:2px;color:#f0d7ad;font-size:9px}
                #${SCRIPT_ID} .cts-map-dock-close{width:28px;height:28px;border:1px solid #d3a76c;border-radius:7px;background:#4e250d;color:#fff;font-size:18px;cursor:pointer}
                #${SCRIPT_ID} .cts-map-dock-content{display:grid;gap:8px;padding:8px}
                #${SCRIPT_ID} .cts-map-dock-settings{border:1px solid #a47438;border-radius:8px;background:#fff0c7}
                #${SCRIPT_ID} .cts-map-dock-settings summary{padding:8px 9px;color:#4d2a0d;font-weight:bold;cursor:pointer}
                #${SCRIPT_ID} .cts-map-dock-settings-body{display:grid;gap:5px;padding:0 8px 8px}
                #${SCRIPT_ID} .cts-map-dock-setting{display:flex;align-items:center;gap:7px;padding:6px;border:1px solid #d0ad72;border-radius:6px;background:#fff9e8;cursor:pointer}
                #${SCRIPT_ID} .cts-map-dock-setting input{width:16px;height:16px;margin:0;accent-color:#347a32}
                #${SCRIPT_ID} .cts-map-dock-setting span{flex:1;font-weight:bold}
                #${SCRIPT_ID} .cts-map-dock-setting small{color:#77603d}
                #${SCRIPT_ID} .cts-map-dock-settings-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}
                #${SCRIPT_ID} .cts-map-dock-settings-actions button{padding:5px;border:1px solid #795022;border-radius:5px;background:#e2bd72;color:#3a210b;font-weight:bold;cursor:pointer}
                #${SCRIPT_ID} .cts-map-dock-tools{display:grid;gap:7px}
                #${SCRIPT_ID} .cts-map-dock-empty{padding:18px 10px;border:1px dashed #aa7c3d;background:#fff2cf;color:#75532d;text-align:center}
                #${SCRIPT_ID} .cts-map-dock-tool{position:static!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;z-index:auto!important;width:100%!important;margin:0!important;box-shadow:none!important}
                #${SCRIPT_ID} .cts-map-dock-tool[hidden]{display:none!important}
                #${SCRIPT_ID} #chong-tribe-relic-planner-launcher{display:block;padding:9px 11px;border:1px solid #76501e;border-radius:7px;background:linear-gradient(#f0cf80,#d9ad58);color:#351d07;text-align:left;font-weight:bold;cursor:pointer}
                #${SCRIPT_ID} #chonguera-tropas-mapa,#${SCRIPT_ID} #chonguera-mapa-estrategico{padding:9px!important;border:1px solid #9c6c31!important;border-radius:8px!important;background:#f7e5b5!important}
                #${SCRIPT_ID} #chonguera-tropas-mapa .mmt-brand,#${SCRIPT_ID} #chonguera-mapa-estrategico>strong{margin:0 0 7px!important;padding-bottom:5px;border-bottom:1px solid #c49b5d;text-align:left!important;color:#4a2609;font-size:11px}
                #${SCRIPT_ID} #chonguera-tropas-mapa button,#${SCRIPT_ID} #chonguera-mapa-estrategico .cme-map-actions>*{width:100%;min-height:30px;text-align:center}
                #${SCRIPT_ID} #chonguera-mapa-estrategico .cme-map-actions{grid-template-columns:1fr 1fr}
                #${SCRIPT_ID} #chonguera-mapa-estrategico .cme-map-legend{grid-template-columns:repeat(3,1fr)}
                @media(max-width:600px){#${SCRIPT_ID}{right:8px;bottom:8px}#${SCRIPT_ID} .cts-map-dock-panel{bottom:60px;max-height:calc(100vh - 76px)}}
            `;
            document.head.appendChild(style);
        }

        function readOpenState() {
            try {
                return window.localStorage.getItem(STORAGE_KEY) === '1';
            } catch (_error) {
                return false;
            }
        }

        function saveOpenState(open) {
            try {
                window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
            } catch (_error) {
                // O painel continua funcional mesmo sem armazenamento local.
            }
        }

        function loadVisibility() {
            const defaults = Object.fromEntries(TOOL_DEFINITIONS.map((tool) => [tool.key, true]));
            try {
                const saved = JSON.parse(window.localStorage.getItem(VISIBILITY_STORAGE_KEY) || '{}');
                TOOL_DEFINITIONS.forEach((tool) => {
                    if (typeof saved?.[tool.key] === 'boolean') defaults[tool.key] = saved[tool.key];
                });
            } catch (_error) {
                // Configuração inválida volta ao padrão com todas as ferramentas ligadas.
            }
            return defaults;
        }

        function saveVisibility(visibility) {
            try {
                window.localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
            } catch (_error) {
                // A central continua funcional durante a sessão.
            }
        }

        function mount() {
            injectStyles();
            const dock = document.createElement('aside');
            dock.id = SCRIPT_ID;
            dock.innerHTML = `
                <div class="cts-map-dock-panel" role="dialog" aria-label="Ferramentas do minimapa">
                    <div class="cts-map-dock-head">
                        <span>🗺️</span>
                        <div><strong>Ferramentas do minimapa</strong><small>Tropas, planejamento, clusters e relíquias</small></div>
                        <button type="button" class="cts-map-dock-close" data-action="close" aria-label="Minimizar ferramentas">×</button>
                    </div>
                    <div class="cts-map-dock-content">
                        <details class="cts-map-dock-settings">
                            <summary>⚙️ Central de ferramentas</summary>
                            <div class="cts-map-dock-settings-body">
                                ${TOOL_DEFINITIONS.map((tool) => `<label class="cts-map-dock-setting"><input type="checkbox" data-tool-toggle="${tool.key}"><span>${tool.label}</span><small>exibir</small></label>`).join('')}
                                <div class="cts-map-dock-settings-actions"><button type="button" data-action="enable-all">Ligar todas</button><button type="button" data-action="disable-all">Desligar todas</button></div>
                            </div>
                        </details>
                        <div class="cts-map-dock-tools"><div class="cts-map-dock-empty">Carregando ferramentas…</div></div>
                    </div>
                </div>
                <button type="button" class="cts-map-dock-toggle" data-action="toggle" aria-label="Abrir ferramentas do minimapa" aria-expanded="false">🧰<span class="cts-map-dock-count">0</span></button>`;
            document.body.appendChild(dock);

            const toolsContainer = dock.querySelector('.cts-map-dock-tools');
            const toggle = dock.querySelector('.cts-map-dock-toggle');
            const count = dock.querySelector('.cts-map-dock-count');
            const visibility = loadVisibility();

            const setOpen = (open) => {
                dock.classList.toggle('cts-map-dock-open', open);
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                toggle.setAttribute('aria-label', open ? 'Minimizar ferramentas do minimapa' : 'Abrir ferramentas do minimapa');
                saveOpenState(open);
            };

            const collectTools = () => {
                if (!window.document?.body || !toolsContainer.isConnected) return;
                TOOL_DEFINITIONS.forEach((definition) => {
                    const tool = window.document.querySelector(definition.selector);
                    if (!tool || tool.closest(`#${SCRIPT_ID}`)) return;
                    tool.classList.add('cts-map-dock-tool');
                    tool.dataset.ctsMapTool = definition.key;
                    toolsContainer.appendChild(tool);
                });
                TOOL_DEFINITIONS.forEach((definition) => {
                    const checkbox = dock.querySelector(`[data-tool-toggle="${definition.key}"]`);
                    if (checkbox) checkbox.checked = visibility[definition.key] !== false;
                    const tool = toolsContainer.querySelector(`[data-cts-map-tool="${definition.key}"]`);
                    if (tool) tool.hidden = visibility[definition.key] === false;
                });
                const total = toolsContainer.querySelectorAll('.cts-map-dock-tool').length;
                const active = toolsContainer.querySelectorAll('.cts-map-dock-tool:not([hidden])').length;
                const empty = toolsContainer.querySelector('.cts-map-dock-empty');
                if (empty) {
                    const emptyMessage = total ? 'Todas as ferramentas estão desligadas. Use a central acima para ligá-las.' : 'Carregando ferramentas…';
                    if (empty.textContent !== emptyMessage) empty.textContent = emptyMessage;
                    empty.toggleAttribute('hidden', active > 0);
                }
                const badge = `${active}/${total || TOOL_DEFINITIONS.length}`;
                if (count.textContent !== badge) count.textContent = badge;
                count.hidden = false;
            };

            const setAllVisibility = (enabled) => {
                TOOL_DEFINITIONS.forEach((tool) => { visibility[tool.key] = enabled; });
                saveVisibility(visibility);
                collectTools();
            };

            dock.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (action === 'toggle') setOpen(!dock.classList.contains('cts-map-dock-open'));
                if (action === 'close') setOpen(false);
                if (action === 'enable-all') setAllVisibility(true);
                if (action === 'disable-all') setAllVisibility(false);
            });
            dock.addEventListener('change', (event) => {
                const key = event.target.dataset.toolToggle;
                if (!key || !Object.hasOwn(visibility, key)) return;
                visibility[key] = event.target.checked;
                saveVisibility(visibility);
                collectTools();
            });

            setOpen(readOpenState());
            collectTools();
            const observer = new MutationObserver(collectTools);
            observer.observe(document.body, { childList: true, subtree: true });
            window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
            window.setTimeout(collectTools, 0);
        }

        mount();
    })();

    // -------------------------------------------------------------------------
    // Módulo: Central de Ferramentas da Tribo
    // -------------------------------------------------------------------------
    (() => {
        'use strict';

        const SCRIPT_ID = 'chong-tribe-tools-manager';
        const query = new URLSearchParams(window.location.search);
        const screen = query.get('screen');
        const mode = query.get('mode') || '';
        if (screen !== 'ally' || document.getElementById(SCRIPT_ID)) return;

        const TOOL_DEFINITIONS = [
            { key: 'assistant', selector: '#chong-tribe-blind-assistant', label: 'Assistente de Blind', screen: 'ally', mode: 'members', params: { cts_blind_assistant: '1' } },
            { key: 'troops', selector: '#chonguera-tropas-tribo', label: 'Tropas da Tribo', screen: 'ally', mode: 'members_defense' },
            { key: 'blind', selector: '#chonguera-blind-preventivo', label: 'Blind Preventivo', screen: 'ally', mode: 'contracts' },
            { key: 'audit', selector: '#chonguera-auditoria-apoios', label: 'Auditoria de Apoios', screen: 'ally', mode: 'members' },
            { key: 'operations', selector: '#chonguera-montador-operacoes', label: 'Montador de Operações', screen: 'ally', mode: 'members' },
            { key: 'distribution', selector: '#chonguera-distribuidor-apoios', label: 'Distribuidor de Apoios', screen: 'ally', mode: 'members' },
            { key: 'strategic-map', selector: '#chonguera-mapa-estrategico', label: 'Mapa Estratégico', screen: 'wars' },
            { key: 'map-troops', selector: '#chonguera-tropas-mapa', label: 'Tropas no Mapa', screen: 'map' },
            { key: 'relics', selector: '#chong-tribe-relic-planner', label: 'Clusters e Relíquias', screen: 'map' },
            { key: 'messages', selector: '#chong-tribe-message-queue', label: 'Fila de MPs de Blind', screen: 'mail', mode: 'new' }
        ];

        const world = window.game_data?.world || window.location.hostname;
        const OPEN_STORAGE_KEY = `chong_tribe_tools_manager_open:${world}:${mode}`;
        const VISIBILITY_STORAGE_KEY = `chong_tribe_tools_manager_visibility:${world}:${mode}`;

        function injectStyles() {
            const style = document.createElement('style');
            style.id = `${SCRIPT_ID}-styles`;
            style.textContent = `
                [data-cts-tribe-tool][hidden]{display:none!important}
                .cts-tribe-tool-bar{display:flex;align-items:center;justify-content:flex-end;gap:7px;min-height:28px;padding:4px 7px;border:1px solid #a6783c;border-bottom:0;background:linear-gradient(#f7e7bc,#e1c17e);color:#5c3915;font:10px Verdana,Arial,sans-serif}
                .cts-tribe-tool-bar span{margin-right:auto;font-weight:bold}
                .cts-tribe-tool-minimize{padding:4px 8px;border:1px solid #75491e;border-radius:5px;background:#774116;color:#fff4d3;font-weight:bold;cursor:pointer}
                .cts-tribe-tool-minimize:hover{filter:brightness(1.12)}
                #${SCRIPT_ID}{position:fixed;right:14px;bottom:14px;z-index:2147483645;font:11px Verdana,Arial,sans-serif;color:#2b1a0a}
                #${SCRIPT_ID} *{box-sizing:border-box}
                #${SCRIPT_ID} .cts-tribe-manager-toggle{position:relative;display:grid;place-items:center;width:54px;height:54px;margin-left:auto;border:2px solid #704013;border-radius:17px;background:linear-gradient(145deg,#a8652d,#60300f);color:#fff3d1;box-shadow:0 7px 22px #0008;font-size:25px;cursor:pointer;transition:transform .15s,filter .15s}
                #${SCRIPT_ID} .cts-tribe-manager-toggle:hover{transform:translateY(-2px);filter:brightness(1.12)}
                #${SCRIPT_ID} .cts-tribe-manager-toggle[aria-expanded=true]{background:linear-gradient(145deg,#337d37,#1d5426)}
                #${SCRIPT_ID} .cts-tribe-manager-count{position:absolute;top:-6px;right:-5px;min-width:24px;height:19px;padding:2px 5px;border:2px solid #f7e8be;border-radius:999px;background:#d9362b;color:#fff;font:bold 10px Arial;line-height:11px}
                #${SCRIPT_ID} .cts-tribe-manager-panel{position:absolute;right:0;bottom:64px;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 90px);overflow:auto;border:2px solid #704013;border-radius:12px;background:#f2dfad;box-shadow:0 12px 34px #0009}
                #${SCRIPT_ID}:not(.cts-tribe-manager-open) .cts-tribe-manager-panel{display:none}
                #${SCRIPT_ID} .cts-tribe-manager-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:9px;padding:9px 10px;border-bottom:1px solid #9e7135;background:linear-gradient(#9a5b27,#683311);color:#fff4d7}
                #${SCRIPT_ID} .cts-tribe-manager-head>span{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#f1c96f;color:#59300d;font-size:16px}
                #${SCRIPT_ID} .cts-tribe-manager-head div{min-width:0;flex:1}
                #${SCRIPT_ID} .cts-tribe-manager-head strong,#${SCRIPT_ID} .cts-tribe-manager-head small{display:block}
                #${SCRIPT_ID} .cts-tribe-manager-head small{margin-top:2px;color:#f0d7ad;font-size:9px}
                #${SCRIPT_ID} .cts-tribe-manager-close{width:28px;height:28px;border:1px solid #d3a76c;border-radius:7px;background:#4e250d;color:#fff;font-size:18px;cursor:pointer}
                #${SCRIPT_ID} .cts-tribe-manager-body{display:grid;gap:6px;padding:8px}
                #${SCRIPT_ID} .cts-tribe-manager-tool{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #c29b60;border-radius:7px;background:#fff8df;cursor:pointer}
                #${SCRIPT_ID} .cts-tribe-manager-tool input{width:17px;height:17px;margin:0;accent-color:#347a32}
                #${SCRIPT_ID} .cts-tribe-manager-tool span{flex:1;font-weight:bold}
                #${SCRIPT_ID} .cts-tribe-manager-tool small{color:#77603d}
                #${SCRIPT_ID} .cts-tribe-manager-tool.cts-tribe-manager-away{cursor:default;background:#f7e8c5}
                #${SCRIPT_ID} .cts-tribe-manager-open-tool{padding:5px 9px;border:1px solid #75491e;border-radius:5px;background:#774116;color:#fff4d3;font-weight:bold;cursor:pointer}
                #${SCRIPT_ID} .cts-tribe-manager-open-tool:hover{filter:brightness(1.12)}
                #${SCRIPT_ID} .cts-tribe-manager-section{margin:3px 2px -1px;color:#7b542a;font-size:9px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase}
                #${SCRIPT_ID} .cts-tribe-manager-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:2px}
                #${SCRIPT_ID} .cts-tribe-manager-actions button{padding:6px;border:1px solid #75491e;border-radius:5px;background:#dcb66d;color:#40240d;font-weight:bold;cursor:pointer}
                #${SCRIPT_ID} .cts-tribe-manager-note{margin:2px 0 0;color:#755b37;font-size:9px;line-height:1.4}
                @media(max-width:600px){#${SCRIPT_ID}{right:8px;bottom:8px}#${SCRIPT_ID} .cts-tribe-manager-panel{bottom:60px}}
            `;
            document.head.appendChild(style);
        }

        function readBoolean(key) {
            try {
                return window.localStorage.getItem(key) === '1';
            } catch (_error) {
                return false;
            }
        }

        function saveBoolean(key, value) {
            try {
                window.localStorage.setItem(key, value ? '1' : '0');
            } catch (_error) {
                // Mantém o estado apenas durante a sessão quando o armazenamento falha.
            }
        }

        function loadVisibility() {
            const visibility = Object.fromEntries(TOOL_DEFINITIONS.map((tool) => [tool.key, true]));
            try {
                const saved = JSON.parse(window.localStorage.getItem(VISIBILITY_STORAGE_KEY) || '{}');
                TOOL_DEFINITIONS.forEach((tool) => {
                    if (typeof saved?.[tool.key] === 'boolean') visibility[tool.key] = saved[tool.key];
                });
            } catch (_error) {
                // Configuração inválida volta ao padrão visível.
            }
            return visibility;
        }

        function saveVisibility(visibility) {
            try {
                window.localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
            } catch (_error) {
                // A central continua funcional durante a sessão.
            }
        }

        function isToolOnCurrentPage(tool) {
            if (tool.screen !== screen) return false;
            if (tool.mode && tool.mode !== mode) return false;
            return Object.entries(tool.params || {}).every(([key, value]) => query.get(key) === value);
        }

        function toolUrl(tool) {
            const url = new URL(window.location.href);
            ['mode', 'player_id', 'id', 'action', 'page', 'cts_blind_assistant'].forEach((key) => url.searchParams.delete(key));
            url.searchParams.set('screen', tool.screen);
            if (tool.mode) url.searchParams.set('mode', tool.mode);
            Object.entries(tool.params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
            url.hash = '';
            return url.href;
        }

        function mount() {
            injectStyles();
            const visibility = loadVisibility();
            const manager = document.createElement('aside');
            manager.id = SCRIPT_ID;
            manager.innerHTML = `
                <div class="cts-tribe-manager-panel" role="dialog" aria-label="Central de ferramentas da tribo">
                    <div class="cts-tribe-manager-head">
                        <span>🛡️</span>
                        <div><strong>Central Chong Tribe</strong><small>Exiba nesta página ou abra qualquer ferramenta</small></div>
                        <button type="button" class="cts-tribe-manager-close" data-action="close" aria-label="Minimizar central">×</button>
                    </div>
                    <div class="cts-tribe-manager-body">
                        <div class="cts-tribe-manager-section">Ferramentas nesta página</div>
                        ${TOOL_DEFINITIONS.filter(isToolOnCurrentPage).map((tool) => `<label class="cts-tribe-manager-tool"><input type="checkbox" data-tool-toggle="${tool.key}"><span>${tool.label}</span><small>exibir</small></label>`).join('') || '<div class="cts-tribe-manager-tool"><span>Nenhum painel próprio nesta página</span></div>'}
                        <div class="cts-tribe-manager-actions"><button type="button" data-action="show-all">Mostrar todas</button><button type="button" data-action="hide-all">Minimizar todas</button></div>
                        <div class="cts-tribe-manager-section">Todas as ferramentas</div>
                        ${TOOL_DEFINITIONS.filter((tool) => !isToolOnCurrentPage(tool)).map((tool) => `<div class="cts-tribe-manager-tool cts-tribe-manager-away"><span>${tool.label}</span><button type="button" class="cts-tribe-manager-open-tool" data-open-tool="${tool.key}">Abrir</button></div>`).join('')}
                        <p class="cts-tribe-manager-note">Minimizar não apaga coletas, planejamentos ou configurações salvas.</p>
                    </div>
                </div>
                <button type="button" class="cts-tribe-manager-toggle" data-action="toggle" aria-label="Abrir ferramentas da tribo" aria-expanded="false">🧰<span class="cts-tribe-manager-count">0/${TOOL_DEFINITIONS.length}</span></button>`;
            document.body.appendChild(manager);

            const toggle = manager.querySelector('.cts-tribe-manager-toggle');
            const count = manager.querySelector('.cts-tribe-manager-count');

            const setOpen = (open) => {
                manager.classList.toggle('cts-tribe-manager-open', open);
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                toggle.setAttribute('aria-label', open ? 'Minimizar ferramentas da tribo' : 'Abrir ferramentas da tribo');
                saveBoolean(OPEN_STORAGE_KEY, open);
            };

            const applyVisibility = () => {
                if (!window.document?.body || !manager.isConnected) return;
                let mounted = 0;
                let visible = 0;
                TOOL_DEFINITIONS.forEach((definition) => {
                    if (!isToolOnCurrentPage(definition)) return;
                    const checkbox = manager.querySelector(`[data-tool-toggle="${definition.key}"]`);
                    if (checkbox) checkbox.checked = visibility[definition.key] !== false;
                    const panel = window.document.querySelector(definition.selector);
                    if (!panel) return;
                    mounted += 1;
                    panel.dataset.ctsTribeTool = definition.key;
                    if (!panel.querySelector(':scope > .cts-tribe-tool-bar')) {
                        const bar = document.createElement('div');
                        bar.className = 'cts-tribe-tool-bar';
                        bar.innerHTML = `<span>${definition.label}</span><button type="button" class="cts-tribe-tool-minimize" data-minimize-tool="${definition.key}">− Minimizar</button>`;
                        panel.insertBefore(bar, panel.firstChild);
                    }
                    panel.hidden = visibility[definition.key] === false;
                    if (!panel.hidden) visible += 1;
                });
                const badge = `${visible}/${mounted || TOOL_DEFINITIONS.length}`;
                if (count.textContent !== badge) count.textContent = badge;
            };

            const updateTool = (key, shown) => {
                if (!Object.hasOwn(visibility, key)) return;
                visibility[key] = shown;
                saveVisibility(visibility);
                applyVisibility();
            };

            const updateAll = (shown) => {
                TOOL_DEFINITIONS.filter(isToolOnCurrentPage).forEach((tool) => { visibility[tool.key] = shown; });
                saveVisibility(visibility);
                applyVisibility();
            };

            manager.addEventListener('click', (event) => {
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (action === 'toggle') setOpen(!manager.classList.contains('cts-tribe-manager-open'));
                if (action === 'close') setOpen(false);
                if (action === 'show-all') updateAll(true);
                if (action === 'hide-all') updateAll(false);
                const openKey = event.target.closest('[data-open-tool]')?.dataset.openTool;
                const target = TOOL_DEFINITIONS.find((tool) => tool.key === openKey);
                if (target) window.location.href = toolUrl(target);
            });
            manager.addEventListener('change', (event) => {
                const key = event.target.dataset.toolToggle;
                if (key) updateTool(key, event.target.checked);
            });
            document.addEventListener('click', (event) => {
                const key = event.target.closest('[data-minimize-tool]')?.dataset.minimizeTool;
                if (key) updateTool(key, false);
            });

            setOpen(readBoolean(OPEN_STORAGE_KEY));
            applyVisibility();
            const observer = new MutationObserver(applyVisibility);
            observer.observe(document.body, { childList: true, subtree: true });
            window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
            window.setTimeout(applyVisibility, 0);
        }

        mount();
    })();
}());

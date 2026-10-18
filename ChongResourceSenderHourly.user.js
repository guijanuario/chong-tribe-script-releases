// ==UserScript==
// @name         Chong — Envio de Recursos Agendado
// @namespace    chong.resources.hourly
// @version      1.0.0
// @description  Envia recursos das aldeias próprias para uma coordenada fixa em ciclos configuráveis, com padrão de uma hora.
// @author       Chong Tribe Script
// @match        https://*.tribalwars.com.br/game.php*
// @run-at       document-idle
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongResourceSenderHourly.user.js
// @downloadURL  https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongResourceSenderHourly.user.js
// ==/UserScript==

(() => {
    'use strict';

    const PANEL_ID = 'chong-resource-hourly';
    const CONFIG_KEY = `chong-resource-hourly:${location.host}:${window.game_data?.player?.id || 'player'}`;
    const LOCK_KEY = `${CONFIG_KEY}:lock`;
    const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const DEFAULT_CONFIG = {
        enabled: false,
        targetCoord: '',
        intervalMinutes: 60,
        reservePercent: 0,
        nextRunAt: 0,
        lastRunAt: 0,
        lastMessage: 'Configure a coordenada e clique em Ativar.'
    };
    const state = {
        config: loadConfig(),
        running: false,
        sent: 0,
        failed: 0,
        timer: null,
        clock: null
    };

    function loadConfig() {
        try {
            return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
        } catch (_error) {
            return { ...DEFAULT_CONFIG };
        }
    }

    function saveConfig() {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
        renderStatus();
    }

    function parseNumber(value) {
        return Number(String(value || '').replace(/[^\d-]/g, '')) || 0;
    }

    function validCoord(value) {
        const match = String(value || '').match(/\b(\d{1,3})\|(\d{1,3})\b/);
        return match ? `${match[1]}|${match[2]}` : '';
    }

    function randomDelay() {
        return 250 + Math.round(Math.random() * 100);
    }

    function delay(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    function protectionVisible() {
        const selectors = [
            '#bot_check', '#bot-protection', '.bot-protection', '.captcha', '.g-recaptcha',
            'iframe[src*="captcha" i]', '[class*="captcha" i]:not(script)'
        ];
        return selectors.some((selector) => [...document.querySelectorAll(selector)].some((element) => {
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
        }));
    }

    function formatDate(timestamp) {
        if (!timestamp) return '—';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date(timestamp));
    }

    function setMessage(message) {
        state.config.lastMessage = message;
        saveConfig();
    }

    function panel() {
        return document.getElementById(PANEL_ID);
    }

    function renderStatus() {
        const root = panel();
        if (!root) return;
        const enabled = root.querySelector('[data-enabled]');
        const next = root.querySelector('[data-next]');
        const last = root.querySelector('[data-last]');
        const message = root.querySelector('[data-message]');
        const toggle = root.querySelector('[data-toggle]');
        enabled.textContent = state.running ? 'Enviando agora' : (state.config.enabled ? 'Ativo' : 'Parado');
        enabled.style.color = state.running || state.config.enabled ? '#16721c' : '#a22';
        next.textContent = state.config.enabled ? formatDate(state.config.nextRunAt) : '—';
        last.textContent = formatDate(state.config.lastRunAt);
        message.textContent = state.config.lastMessage;
        toggle.textContent = state.config.enabled ? 'Parar' : 'Ativar';
        toggle.className = state.config.enabled ? 'btn evt-cancel-btn' : 'btn btn-confirm-yes';
    }

    function createPanel() {
        if (panel()) return;
        const root = document.createElement('section');
        root.id = PANEL_ID;
        root.style.cssText = [
            'position:fixed', 'right:12px', 'bottom:38px', 'z-index:99999', 'width:390px',
            'max-width:calc(100vw - 24px)', 'border:2px solid #7d510f', 'border-radius:5px',
            'background:#f4e4bc', 'color:#2b1605', 'box-shadow:0 4px 16px #0007',
            'font:12px Arial,sans-serif'
        ].join(';');
        root.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#9b5b22;color:#fff;font-weight:bold">
                <span>Chong — Recursos Agendados</span>
                <button type="button" data-collapse style="border:0;background:transparent;color:#fff;font-weight:bold;cursor:pointer">−</button>
            </div>
            <div data-body style="padding:9px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                    <label>Coordenada de destino
                        <input data-coord type="text" placeholder="500|500" value="${state.config.targetCoord}" style="box-sizing:border-box;width:100%">
                    </label>
                    <label>Intervalo em minutos
                        <input data-interval type="number" min="60" step="1" value="${state.config.intervalMinutes}" style="box-sizing:border-box;width:100%">
                    </label>
                    <label>Manter no armazém
                        <span><input data-reserve type="number" min="0" max="100" step="1" value="${state.config.reservePercent}" style="width:65px"> %</span>
                    </label>
                    <div><b>Estado:</b> <span data-enabled></span></div>
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                    <button type="button" data-save class="btn">Salvar</button>
                    <button type="button" data-toggle class="btn"></button>
                    <button type="button" data-now class="btn btn-confirm-yes">Enviar agora</button>
                </div>
                <div style="margin-top:8px;border-top:1px solid #c89c55;padding-top:7px;line-height:1.5">
                    <div><b>Próximo ciclo:</b> <span data-next></span></div>
                    <div><b>Último ciclo:</b> <span data-last></span></div>
                    <div data-message style="margin-top:4px;font-weight:bold"></div>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const coordInput = root.querySelector('[data-coord]');
        const intervalInput = root.querySelector('[data-interval]');
        const reserveInput = root.querySelector('[data-reserve]');

        root.querySelector('[data-collapse]').addEventListener('click', (event) => {
            const body = root.querySelector('[data-body]');
            const hidden = body.style.display === 'none';
            body.style.display = hidden ? '' : 'none';
            event.currentTarget.textContent = hidden ? '−' : '+';
        });

        root.querySelector('[data-save]').addEventListener('click', () => {
            const coord = validCoord(coordInput.value);
            if (!coord) {
                window.UI?.ErrorMessage?.('Informe uma coordenada válida, por exemplo 500|500.');
                coordInput.focus();
                return;
            }
            state.config.targetCoord = coord;
            state.config.intervalMinutes = Math.max(60, Number(intervalInput.value) || 60);
            state.config.reservePercent = Math.max(0, Math.min(100, Number(reserveInput.value) || 0));
            coordInput.value = state.config.targetCoord;
            intervalInput.value = state.config.intervalMinutes;
            reserveInput.value = state.config.reservePercent;
            setMessage('Configuração salva.');
            window.UI?.SuccessMessage?.('Agendamento de recursos salvo.');
        });

        root.querySelector('[data-toggle]').addEventListener('click', () => {
            if (state.config.enabled) {
                state.config.enabled = false;
                state.config.nextRunAt = 0;
                setMessage('Agendamento interrompido pelo usuário.');
                scheduleCheck();
                return;
            }
            const coord = validCoord(coordInput.value);
            if (!coord) {
                window.UI?.ErrorMessage?.('Informe e salve uma coordenada válida antes de ativar.');
                return;
            }
            state.config.targetCoord = coord;
            state.config.intervalMinutes = Math.max(60, Number(intervalInput.value) || 60);
            state.config.reservePercent = Math.max(0, Math.min(100, Number(reserveInput.value) || 0));
            state.config.enabled = true;
            state.config.nextRunAt = Date.now() + state.config.intervalMinutes * 60 * 1000;
            setMessage(`Agendamento ativo para ${coord}.`);
            scheduleCheck();
        });

        root.querySelector('[data-now]').addEventListener('click', () => {
            const coord = validCoord(coordInput.value);
            if (!coord) {
                window.UI?.ErrorMessage?.('Informe uma coordenada válida.');
                return;
            }
            state.config.targetCoord = coord;
            state.config.intervalMinutes = Math.max(60, Number(intervalInput.value) || 60);
            state.config.reservePercent = Math.max(0, Math.min(100, Number(reserveInput.value) || 0));
            saveConfig();
            runCycle('manual');
        });
        renderStatus();
    }

    function acquireLock() {
        const now = Date.now();
        try {
            const current = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
            if (current.expiresAt > now && current.tabId !== TAB_ID) return false;
            localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: TAB_ID, expiresAt: now + 15 * 60 * 1000 }));
            return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}').tabId === TAB_ID;
        } catch (_error) {
            return false;
        }
    }

    function refreshLock() {
        localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: TAB_ID, expiresAt: Date.now() + 15 * 60 * 1000 }));
    }

    function releaseLock() {
        try {
            const current = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
            if (current.tabId === TAB_ID) localStorage.removeItem(LOCK_KEY);
        } catch (_error) {
            localStorage.removeItem(LOCK_KEY);
        }
    }

    function gameUrl(params) {
        const url = new URL('/game.php', location.origin);
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        if (window.game_data?.player?.sitter > 0) url.searchParams.set('t', window.game_data.player.id);
        return url.href;
    }

    async function resolveTarget(coord) {
        const response = await fetch(gameUrl({ screen: 'api', ajax: 'target_selection', input: coord, type: 'coord' }), {
            credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`Falha ao localizar o destino (${response.status}).`);
        const data = await response.json();
        const target = data?.villages?.[0];
        if (!target?.id) throw new Error(`Nenhuma aldeia encontrada em ${coord}.`);
        return target;
    }

    async function loadVillages() {
        const response = await fetch(gameUrl({ screen: 'overview_villages', mode: 'prod', page: '-1' }), {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`Falha ao carregar as aldeias (${response.status}).`);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return [...doc.querySelectorAll('.quickedit-vn[data-id]')].map((villageElement) => {
            const row = villageElement.closest('tr');
            const woodElement = row?.querySelector('.res.wood,.warn_90.wood,.warn.wood,.res.mwood,.warn_90.mwood,.warn.mwood');
            const stoneElement = row?.querySelector('.res.stone,.warn_90.stone,.warn.stone,.res.mstone,.warn_90.mstone,.warn.mstone');
            const ironElement = row?.querySelector('.res.iron,.warn_90.iron,.warn.iron,.res.miron,.warn_90.miron,.warn.miron');
            if (!row || !woodElement || !stoneElement || !ironElement) return null;
            const resourceCell = ironElement.closest('td');
            const warehouseCell = resourceCell?.nextElementSibling;
            const merchantCell = warehouseCell?.nextElementSibling;
            const merchantMatch = merchantCell?.textContent?.match(/([\d.]+)\s*\/\s*([\d.]+)/);
            return {
                id: Number(villageElement.dataset.id),
                name: villageElement.textContent.trim(),
                wood: parseNumber(woodElement.textContent),
                stone: parseNumber(stoneElement.textContent),
                iron: parseNumber(ironElement.textContent),
                warehouse: parseNumber(warehouseCell?.textContent),
                merchants: parseNumber(merchantMatch?.[1])
            };
        }).filter((village) => village?.id && village.merchants > 0);
    }

    function calculateResources(village) {
        const reserve = Math.floor(village.warehouse * state.config.reservePercent / 100);
        const available = {
            wood: Math.max(0, village.wood - reserve),
            stone: Math.max(0, village.stone - reserve),
            iron: Math.max(0, village.iron - reserve)
        };
        const capacity = village.merchants * 1000;
        let amounts = {
            wood: capacity * 28000 / 83000,
            stone: capacity * 30000 / 83000,
            iron: capacity * 25000 / 83000
        };
        for (const resource of ['wood', 'stone', 'iron']) {
            if (amounts[resource] > available[resource] && amounts[resource] > 0) {
                const factor = available[resource] / amounts[resource];
                amounts = Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, value * factor]));
            }
        }
        return Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, Math.floor(value)]));
    }

    function sendResources(sourceId, targetId, resources) {
        return new Promise((resolve, reject) => {
            window.TribalWars.post('market', { ajaxaction: 'map_send', village: sourceId }, {
                target_id: targetId,
                wood: resources.wood,
                stone: resources.stone,
                iron: resources.iron
            }, resolve, reject);
        });
    }

    async function runCycle(reason = 'automatic') {
        if (state.running) return;
        if (!validCoord(state.config.targetCoord)) {
            state.config.enabled = false;
            setMessage('Agendamento parado: coordenada inválida.');
            return;
        }
        if (protectionVisible()) {
            state.config.enabled = false;
            setMessage('Agendamento pausado: CAPTCHA/proteção detectado. Resolva e ative novamente.');
            return;
        }
        if (!acquireLock()) {
            setMessage('Outra aba já está executando este ciclo.');
            return;
        }

        state.running = true;
        state.sent = 0;
        state.failed = 0;
        renderStatus();
        try {
            const target = await resolveTarget(state.config.targetCoord);
            const villages = await loadVillages();
            const queue = villages
                .filter((village) => village.id !== Number(target.id))
                .map((village) => ({ village, resources: calculateResources(village) }))
                .filter(({ resources }) => resources.wood + resources.stone + resources.iron >= 1000);
            if (!queue.length) throw new Error('Nenhuma aldeia possui mercadores e recursos disponíveis.');

            for (let index = 0; index < queue.length; index += 1) {
                if (protectionVisible()) throw new Error('CAPTCHA/proteção detectado.');
                refreshLock();
                const { village, resources } = queue[index];
                state.config.lastMessage = `Enviando ${index + 1}/${queue.length}: ${village.name}`;
                renderStatus();
                try {
                    await sendResources(village.id, target.id, resources);
                    state.sent += 1;
                } catch (error) {
                    console.error('[Chong Recursos Agendados] Falha na aldeia:', village, error);
                    state.failed += 1;
                }
                if (index + 1 < queue.length) await delay(randomDelay());
            }

            state.config.lastRunAt = Date.now();
            state.config.nextRunAt = state.config.enabled
                ? Date.now() + state.config.intervalMinutes * 60 * 1000
                : 0;
            setMessage(`Ciclo concluído: ${state.sent} envio(s), ${state.failed} falha(s), destino ${state.config.targetCoord}.`);
            window.UI?.SuccessMessage?.(`Recursos: ${state.sent} envio(s) concluído(s).`);
        } catch (error) {
            console.error('[Chong Recursos Agendados] Ciclo interrompido:', error);
            const captcha = /captcha|proteção/i.test(error?.message || '');
            if (captcha) state.config.enabled = false;
            state.config.nextRunAt = state.config.enabled
                ? Date.now() + state.config.intervalMinutes * 60 * 1000
                : 0;
            setMessage(`${captcha ? 'Agendamento pausado' : 'Falha no ciclo'}: ${error.message || error}`);
            window.UI?.ErrorMessage?.(state.config.lastMessage);
        } finally {
            state.running = false;
            releaseLock();
            saveConfig();
            scheduleCheck();
        }
    }

    function scheduleCheck() {
        window.clearTimeout(state.timer);
        state.timer = null;
        if (!state.config.enabled || state.running) return;
        if (!state.config.nextRunAt) {
            state.config.nextRunAt = Date.now() + state.config.intervalMinutes * 60 * 1000;
            saveConfig();
        }
        const remaining = state.config.nextRunAt - Date.now();
        state.timer = window.setTimeout(() => {
            if (state.config.enabled && Date.now() >= state.config.nextRunAt) runCycle('automatic');
            else scheduleCheck();
        }, Math.max(1000, Math.min(remaining, 30000)));
    }

    function start() {
        createPanel();
        state.clock = window.setInterval(renderStatus, 1000);
        window.addEventListener('storage', (event) => {
            if (event.key !== CONFIG_KEY) return;
            state.config = loadConfig();
            renderStatus();
            scheduleCheck();
        });
        scheduleCheck();
    }

    start();
})();

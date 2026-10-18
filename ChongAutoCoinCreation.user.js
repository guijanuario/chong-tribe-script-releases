// ==UserScript==
// @name         Chong — Criação Automática de Moedas
// @namespace    chong.auto.coin.creation
// @version      1.0.2
// @description  Mantém a criação automática de moedas ativa na academia de uma aldeia escolhida.
// @author       Chong Tribe Script
// @match        https://*.tribalwars.com.br/game.php*
// @run-at       document-idle
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongAutoCoinCreation.user.js
// @downloadURL  https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongAutoCoinCreation.user.js
// ==/UserScript==

(() => {
    'use strict';

    const PANEL_ID = 'chong-auto-coin-panel';
    const PLAYER_ID = window.game_data?.player?.id || 'player';
    const STORAGE_KEY = `chong-auto-coin:${location.host}:${PLAYER_ID}`;
    const LOCK_KEY = `${STORAGE_KEY}:lock`;
    const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    const RETRY_DELAY = 5 * 60 * 1000;
    const state = {
        config: loadConfig(),
        running: false,
        timer: null,
        refreshVisibleAcademy: false
    };

    function loadConfig() {
        const defaults = {
            enabled: false,
            villageId: '',
            villageName: '',
            nextCheckAt: 0,
            lastCheckAt: 0,
            lastMessage: 'Escolha a aldeia e ative o acompanhamento.'
        };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
        } catch (_error) {
            return defaults;
        }
    }

    function saveConfig() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
        render();
    }

    function currentVillage() {
        const village = window.game_data?.village;
        return village?.id ? {
            id: String(village.id),
            name: village.name || village.coord || `Aldeia ${village.id}`
        } : null;
    }

    function formatDate(timestamp) {
        if (!timestamp) return '—';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date(timestamp));
    }

    function protectionVisible(doc = document) {
        const selectors = [
            '#bot_check', '#bot-protection', '.bot-protection', '.captcha', '.g-recaptcha',
            'iframe[src*="captcha" i]', '[class*="captcha" i]:not(script)'
        ];
        return selectors.some((selector) => [...doc.querySelectorAll(selector)].some((element) => {
            const view = doc.defaultView || window;
            const style = view.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
        }));
    }

    function panel() {
        return document.getElementById(PANEL_ID);
    }

    function render() {
        const root = panel();
        if (!root) return;
        positionPanel(root);
        const status = root.querySelector('[data-status]');
        status.textContent = state.running ? 'Verificando agora' : (state.config.enabled ? 'Ligado' : 'Desligado');
        status.style.color = state.running || state.config.enabled ? '#18751f' : '#a22';
        root.querySelector('[data-village]').textContent = state.config.villageName
            ? `${state.config.villageName} (#${state.config.villageId})`
            : 'Nenhuma aldeia escolhida';
        root.querySelector('[data-next]').textContent = state.config.enabled ? formatDate(state.config.nextCheckAt) : '—';
        root.querySelector('[data-last]').textContent = formatDate(state.config.lastCheckAt);
        root.querySelector('[data-message]').textContent = state.config.lastMessage;
        const toggle = root.querySelector('[data-toggle]');
        toggle.textContent = state.config.enabled ? 'Desligar' : 'Ligar nesta aldeia';
        toggle.className = state.config.enabled ? 'btn evt-cancel-btn' : 'btn btn-confirm-yes';
    }

    function positionPanel(root = panel()) {
        if (!root) return;
        const resourcePanel = document.getElementById('chong-resource-hourly');
        const resourceHeight = resourcePanel && resourcePanel !== root ? resourcePanel.offsetHeight : 0;
        root.style.bottom = `${38 + (resourceHeight ? resourceHeight + 8 : 0)}px`;
    }

    function createPanel() {
        if (panel()) return;
        const root = document.createElement('section');
        root.id = PANEL_ID;
        root.style.cssText = [
            'position:fixed', 'right:12px', 'bottom:38px', 'z-index:99999', 'width:360px',
            'max-width:calc(100vw - 24px)', 'border:2px solid #7d510f', 'border-radius:5px',
            'background:#f4e4bc', 'color:#2b1605', 'box-shadow:0 4px 16px #0007',
            'font:12px Arial,sans-serif'
        ].join(';');
        root.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#9b5b22;color:#fff;font-weight:bold">
                <span>🪙 Chong — Criação automática</span>
                <button type="button" data-collapse style="border:0;background:transparent;color:#fff;font-weight:bold;cursor:pointer">−</button>
            </div>
            <div data-body style="padding:9px;line-height:1.45">
                <div><b>Estado:</b> <span data-status></span></div>
                <div><b>Aldeia acompanhada:</b> <span data-village></span></div>
                <div><b>Próxima verificação:</b> <span data-next></span></div>
                <div><b>Última verificação:</b> <span data-last></span></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                    <button type="button" data-toggle class="btn"></button>
                    <button type="button" data-check class="btn">Verificar agora</button>
                </div>
                <div data-message style="margin-top:7px;padding-top:6px;border-top:1px solid #c89c55;font-weight:bold"></div>
                <div style="margin-top:5px;font-size:11px">Quando o jogo informar o horário de término, a próxima ativação será feita logo após esse horário. Sem essa informação, a conferência ocorre em 5 horas.</div>
            </div>
        `;
        document.body.appendChild(root);
        positionPanel(root);

        root.querySelector('[data-collapse]').addEventListener('click', (event) => {
            const body = root.querySelector('[data-body]');
            const hidden = body.style.display === 'none';
            body.style.display = hidden ? '' : 'none';
            event.currentTarget.textContent = hidden ? '−' : '+';
        });
        root.querySelector('[data-toggle]').addEventListener('click', () => {
            if (state.config.enabled) {
                state.config.enabled = false;
                state.config.nextCheckAt = 0;
                state.config.lastMessage = 'Acompanhamento desligado pelo usuário.';
                saveConfig();
                schedule();
                return;
            }
            const village = currentVillage();
            if (!village) {
                window.UI?.ErrorMessage?.('Abra uma aldeia antes de ativar.');
                return;
            }
            state.config.enabled = true;
            state.config.villageId = village.id;
            state.config.villageName = village.name;
            state.config.nextCheckAt = Date.now();
            state.config.lastMessage = 'Acompanhamento ligado. Verificando a academia…';
            saveConfig();
            schedule();
        });
        root.querySelector('[data-check]').addEventListener('click', () => checkAcademy(true));
        render();
    }

    function acquireLock() {
        const now = Date.now();
        try {
            const current = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
            if (current.expiresAt > now && current.tabId !== TAB_ID) return false;
            localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId: TAB_ID, expiresAt: now + 2 * 60 * 1000 }));
            return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}').tabId === TAB_ID;
        } catch (_error) {
            return false;
        }
    }

    function releaseLock() {
        try {
            const current = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
            if (current.tabId === TAB_ID) localStorage.removeItem(LOCK_KEY);
        } catch (_error) {
            localStorage.removeItem(LOCK_KEY);
        }
    }

    function academyUrl() {
        const url = new URL('/game.php', location.origin);
        url.searchParams.set('village', state.config.villageId);
        url.searchParams.set('screen', 'snob');
        if (window.game_data?.player?.sitter > 0) url.searchParams.set('t', window.game_data.player.id);
        return url.href;
    }

    function isConfiguredAcademyVisible() {
        const url = new URL(location.href);
        return url.searchParams.get('screen') === 'snob'
            && String(window.game_data?.village?.id || '') === String(state.config.villageId || '');
    }

    function controlLabel(element) {
        return String(element.value || element.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function automaticCreationContext(element) {
        let current = element;
        for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
            if (/cria[cç][aã]o\s+autom[aá]tica/i.test(current.textContent || '')) return current;
        }
        return null;
    }

    function findControl(doc, label) {
        const controls = [...doc.querySelectorAll('button,a,input[type="button"],input[type="submit"]')];
        return controls.find((element) => controlLabel(element).toLocaleLowerCase('pt-BR') === label
            && automaticCreationContext(element));
    }

    function parseEndTime(doc) {
        const text = doc.body?.textContent || '';
        const match = text.match(/Fim:\s*(hoje|amanh[ãa])\s+[àa]s\s+(\d{1,2}):(\d{2}):(\d{2})/i);
        if (!match) return 0;
        const end = new Date();
        end.setHours(Number(match[2]), Number(match[3]), Number(match[4]), 0);
        if (/amanh/i.test(match[1])) end.setDate(end.getDate() + 1);
        if (/hoje/i.test(match[1]) && end.getTime() < Date.now() - 60000) end.setDate(end.getDate() + 1);
        return end.getTime();
    }

    function inspectAcademy() {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none';
            let clicked = false;
            let settled = false;
            let poll = null;
            const timeout = window.setTimeout(() => finish(new Error('A academia demorou para responder.')), 25000);

            function cleanup() {
                window.clearTimeout(timeout);
                window.clearInterval(poll);
                iframe.remove();
            }

            function finish(error, result) {
                if (settled) return;
                settled = true;
                cleanup();
                if (error) reject(error);
                else resolve(result);
            }

            function inspect() {
                let doc;
                try {
                    doc = iframe.contentDocument;
                } catch (error) {
                    finish(new Error(`Não foi possível abrir a academia: ${error.message}`));
                    return;
                }
                if (!doc?.body) return;
                if (protectionVisible(doc)) {
                    finish(new Error('CAPTCHA/proteção detectado.'));
                    return;
                }
                const cancel = findControl(doc, 'cancelar');
                if (cancel) {
                    finish(null, { activated: clicked, active: true, endAt: parseEndTime(doc) });
                    return;
                }
                const activate = findControl(doc, 'ativar');
                if (!activate) return;
                if (clicked) return;
                clicked = true;
                activate.click();
                poll = window.setInterval(inspect, 400);
            }

            iframe.addEventListener('load', () => {
                window.setTimeout(inspect, 250);
            });
            iframe.src = academyUrl();
            document.body.appendChild(iframe);
        });
    }

    async function checkAcademy(manual = false) {
        if (state.running) return;
        if (!state.config.villageId) {
            window.UI?.ErrorMessage?.('Ligue o acompanhamento em uma aldeia primeiro.');
            return;
        }
        if (protectionVisible()) {
            state.config.enabled = false;
            state.config.nextCheckAt = 0;
            state.config.lastMessage = 'Acompanhamento pausado: CAPTCHA/proteção detectado.';
            saveConfig();
            return;
        }
        if (!acquireLock()) {
            if (manual) window.UI?.ErrorMessage?.('Outra aba já está verificando a academia.');
            return;
        }

        state.running = true;
        render();
        try {
            const result = await inspectAcademy();
            state.config.lastCheckAt = Date.now();
            if (!result.active) throw new Error('O bloco de criação automática não foi encontrado nessa aldeia.');
            if (result.activated) {
                state.config.lastMessage = 'Criação automática ativada com sucesso.';
                state.refreshVisibleAcademy = isConfiguredAcademyVisible();
                window.UI?.SuccessMessage?.('Criação automática ativada.');
            } else {
                state.config.lastMessage = 'A criação automática já estava ligada.';
                if (manual) window.UI?.SuccessMessage?.('A criação automática já está ligada.');
            }
            state.config.nextCheckAt = result.endAt
                ? Math.max(Date.now() + 60000, result.endAt + 15000)
                : Date.now() + FIVE_HOURS;
        } catch (error) {
            console.error('[Chong Criação Automática]', error);
            const captcha = /captcha|proteção/i.test(error.message || '');
            if (captcha) state.config.enabled = false;
            state.config.lastCheckAt = Date.now();
            state.config.nextCheckAt = state.config.enabled ? Date.now() + RETRY_DELAY : 0;
            state.config.lastMessage = `${captcha ? 'Acompanhamento pausado' : 'Falha na verificação'}: ${error.message || error}`;
            window.UI?.ErrorMessage?.(state.config.lastMessage);
        } finally {
            const refreshVisibleAcademy = state.refreshVisibleAcademy;
            state.refreshVisibleAcademy = false;
            state.running = false;
            releaseLock();
            saveConfig();
            schedule();
            if (refreshVisibleAcademy) {
                window.setTimeout(() => location.reload(), 800);
            }
        }
    }

    function schedule() {
        window.clearTimeout(state.timer);
        state.timer = null;
        if (!state.config.enabled || state.running) return;
        if (!state.config.nextCheckAt) {
            state.config.nextCheckAt = Date.now();
            saveConfig();
        }
        const remaining = state.config.nextCheckAt - Date.now();
        state.timer = window.setTimeout(() => {
            if (state.config.enabled && Date.now() >= state.config.nextCheckAt) checkAcademy(false);
            else schedule();
        }, Math.max(1000, Math.min(remaining, 30000)));
    }

    function start() {
        createPanel();
        window.setInterval(render, 1000);
        window.addEventListener('storage', (event) => {
            if (event.key !== STORAGE_KEY) return;
            state.config = loadConfig();
            render();
            schedule();
        });
        schedule();
    }

    start();
})();

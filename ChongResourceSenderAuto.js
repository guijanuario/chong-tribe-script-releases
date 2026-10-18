(() => {
    'use strict';

    const ORIGINAL_SCRIPT = 'https://shinko-to-kuma.com/scripts/res-senderV2.js';
    const INSTANCE_KEY = '__chongResourceSenderAuto';
    const TOOLBAR_ID = 'chong-resource-auto-toolbar';
    const DEFAULT_MIN_DELAY = 250;
    const DEFAULT_MAX_DELAY = 350;

    if (window[INSTANCE_KEY]?.installed) {
        const current = window[INSTANCE_KEY];
        current.minDelay = DEFAULT_MIN_DELAY;
        current.maxDelay = DEFAULT_MAX_DELAY;
        const minInput = document.querySelector(`#${TOOLBAR_ID} [data-auto-min]`);
        const maxInput = document.querySelector(`#${TOOLBAR_ID} [data-auto-max]`);
        if (minInput) minInput.value = String(DEFAULT_MIN_DELAY / 1000);
        if (maxInput) maxInput.value = String(DEFAULT_MAX_DELAY / 1000);
        current.resume?.();
        return;
    }

    const state = {
        installed: true,
        running: true,
        timer: null,
        sent: 0,
        observer: null,
        minDelay: DEFAULT_MIN_DELAY,
        maxDelay: DEFAULT_MAX_DELAY
    };
    window[INSTANCE_KEY] = state;

    function resourceButtons() {
        return [...document.querySelectorAll('#tableSend input[id="sendResources"]')]
            .filter((button) => button.closest('tr'));
    }

    function protectionVisible() {
        const selectors = [
            '#bot_check',
            '#bot-protection',
            '.bot-protection',
            '.captcha',
            '.g-recaptcha',
            'iframe[src*="captcha" i]',
            '[class*="captcha" i]:not(script)'
        ];
        return selectors.some((selector) => [...document.querySelectorAll(selector)].some((element) => {
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
        }));
    }

    function randomDelay() {
        const low = Math.max(DEFAULT_MIN_DELAY, Number(state.minDelay) || DEFAULT_MIN_DELAY);
        const high = Math.max(low, Number(state.maxDelay) || DEFAULT_MAX_DELAY);
        return Math.round(low + Math.random() * (high - low));
    }

    function statusElement() {
        return document.querySelector(`#${TOOLBAR_ID} [data-auto-status]`);
    }

    function setStatus(message, color = '#3b2a14') {
        const status = statusElement();
        if (!status) return;
        status.textContent = message;
        status.style.color = color;
    }

    function updateToggle() {
        const button = document.querySelector(`#${TOOLBAR_ID} [data-auto-toggle]`);
        if (!button) return;
        button.textContent = state.running ? 'Pausar envio automático' : 'Continuar envio automático';
        button.className = state.running ? 'btn evt-cancel-btn' : 'btn btn-confirm-yes';
    }

    function pause(message = 'Envio automático pausado.') {
        state.running = false;
        clearTimeout(state.timer);
        state.timer = null;
        updateToggle();
        setStatus(message, '#a33');
    }

    function schedule(delay = randomDelay()) {
        clearTimeout(state.timer);
        state.timer = null;
        if (!state.running) return;
        state.timer = setTimeout(runNext, delay);
    }

    function resume() {
        state.running = true;
        updateToggle();
        setStatus('Envio automático ativo. Preparando a próxima aldeia…', '#176b25');
        schedule(300);
    }

    state.pause = pause;
    state.resume = resume;

    function runNext() {
        state.timer = null;
        if (!state.running) return;
        if (protectionVisible()) {
            pause('Proteção/CAPTCHA detectado. Resolva manualmente e clique em continuar.');
            return;
        }

        const buttons = resourceButtons();
        if (!buttons.length) {
            pause(state.sent ? `Concluído: ${state.sent} envio(s) acionado(s).` : 'Aguardando a lista de aldeias…');
            return;
        }

        const button = buttons.find((item) => !item.disabled);
        if (!button) {
            schedule(400);
            return;
        }

        const row = button.closest('tr');
        const village = row?.querySelector('td')?.textContent?.trim() || 'aldeia';
        setStatus(`Enviando ${state.sent + 1}: ${village}`, '#176b25');
        try {
            button.click();
            state.sent += 1;
        } catch (error) {
            console.error('[Chong Recursos Auto] Falha ao acionar envio:', error);
            pause(`Falha ao enviar de ${village}. Processo pausado.`);
            return;
        }
        schedule();
    }

    function ensureToolbar() {
        const sender = document.getElementById('resourceSender');
        if (!sender || document.getElementById(TOOLBAR_ID)) return;

        const toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;margin:6px 0;border:1px solid #7d510f;background:#f4e4bc;color:#2b1605';
        toolbar.innerHTML = `
            <strong>Chong — envio automático</strong>
            <button type="button" class="btn evt-cancel-btn" data-auto-toggle>Pausar envio automático</button>
            <label>Intervalo mínimo <input type="number" min="0.25" step="0.05" value="0.25" data-auto-min style="width:58px"> s</label>
            <label>máximo <input type="number" min="0.25" step="0.05" value="0.35" data-auto-max style="width:58px"> s</label>
            <span data-auto-status style="font-weight:bold;color:#176b25">Aguardando a lista de aldeias…</span>
        `;
        sender.prepend(toolbar);

        toolbar.querySelector('[data-auto-toggle]').addEventListener('click', () => {
            if (state.running) pause();
            else resume();
        });
        toolbar.querySelector('[data-auto-min]').addEventListener('change', (event) => {
            state.minDelay = Math.max(DEFAULT_MIN_DELAY, Number(event.target.value) * 1000 || DEFAULT_MIN_DELAY);
        });
        toolbar.querySelector('[data-auto-max]').addEventListener('change', (event) => {
            state.maxDelay = Math.max(state.minDelay, Number(event.target.value) * 1000 || DEFAULT_MAX_DELAY);
        });
        updateToggle();
    }

    function watchInterface() {
        state.observer = new MutationObserver(() => {
            ensureToolbar();
            if (state.running && resourceButtons().length && !state.timer) schedule(300);
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });
        ensureToolbar();
    }

    function startOriginalScript() {
        if (typeof window.jQuery !== 'function') {
            alert('O envio automático precisa do jQuery carregado pelo Tribal Wars.');
            return;
        }
        watchInterface();
        if (typeof window.sendResource === 'function' || document.getElementById('resourceSender')) return;
        window.jQuery.getScript(ORIGINAL_SCRIPT).fail((_request, _status, error) => {
            pause('Não foi possível carregar o script original de envio.');
            console.error('[Chong Recursos Auto] Falha ao carregar script original:', error);
        });
    }

    startOriginalScript();
})();

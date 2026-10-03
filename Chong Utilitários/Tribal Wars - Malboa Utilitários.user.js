// ==UserScript==
// @name         Chong Utilitários
// @namespace    chonguera.tribalwars.utilities
// @version      4.0.0
// @description  Motor unificado de utilitários e ferramentas de tribo para Tribal Wars
// @author       Chong
// @updateURL    https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/Chong%20Utilit%C3%A1rios/Tribal%20Wars%20-%20Malboa%20Utilit%C3%A1rios.user.js
// @downloadURL  https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/Chong%20Utilit%C3%A1rios/Tribal%20Wars%20-%20Malboa%20Utilit%C3%A1rios.user.js
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.tribalwars.com/game.php*
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const MENU_URL = 'https://dl.dropbox.com/scl/fi/6tf6d9pjk6a07mj2oor41/MalboaMenuSistema.js?rlkey=wo3plf9nkd2fevv76oyg65p1y&dl=1';
    const CAPTCHA_MANAGER_URL = 'https://dl.dropbox.com/scl/fi/1hzacejr5k65wloc7nqu0/MalboaCaptchaManager.js?rlkey=g0nqsf3980h725kwkcv732mup&dl=1';
    const CHONG_TRIBE_URL = 'https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongTribeScript.free.release.user.js';

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

    // Cria fallback do CaptchaManager caso falhe o carregamento
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

    async function loadChongTribe() {
        if (window.__chongTribeSuiteRuntime || window.__chongTribeSuiteLoading) return true;
        window.__chongTribeSuiteLoading = true;
        try {
            const response = await fetch(`${CHONG_TRIBE_URL}?_t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const source = await response.text();
            if (window.__chongTribeSuiteRuntime) return true;
            const script = document.createElement('script');
            script.textContent = source;
            document.head.appendChild(script);
            console.log('🛡️ [Chong] Módulo Tribo carregado');
            return true;
        } catch (error) {
            console.error('❌ [Chong] Erro ao carregar o módulo Tribo:', error);
            return false;
        } finally {
            window.__chongTribeSuiteLoading = false;
        }
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
        // Carrega CaptchaManager primeiro (outros scripts dependem dele)
        const captchaLoaded = await loadScript(CAPTCHA_MANAGER_URL, 'Gerenciador de proteção');

        // Se falhou, cria fallback para não quebrar outros scripts
        if (!captchaLoaded || !window.MalboaCaptchaManager) {
            createFallbackCaptchaManager();
        }

        // Carrega sistema de menu (sempre, independente do CaptchaManager)
        await loadScript(MENU_URL, 'Motor de utilitários');
        await loadChongTribe();
        startBrandObserver();
    }

    init();
})();

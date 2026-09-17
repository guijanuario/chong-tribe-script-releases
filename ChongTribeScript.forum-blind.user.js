// ==UserScript==
// @name         Chong Tribe Script - Atualizador de Blind no Forum
// @namespace    chongtribescript.free.release
// @version      1.0.2
// @description  Soma as respostas do topico de blind, reduz a tabela principal e marca as respostas processadas para exclusao.
// @author       Chong Tribe Script
// @match        https://*.tribalwars.com.br/game.php*screen=forum*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const APP_ID = 'cts-forum-blind';
    const PAGE_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const STRICT_RESPONSE = /^(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/;
    const ROW_PATTERN = /(\[\*\]\s*(?:\[b\])?)(\d+)((?:\[\/b\])?\s*\[\|\]\s*\[coord\][\s\S]*?\[\/coord\]\s*\[\|\]\s*)(\d+)(\s*\[\|\]\s*)(\d+)(\s*\[\|\]\s*)(\d+)(\s*\[\|\]\s*)(\d+)(\s*\[\/\*\])/gi;
    const UNIT_LABELS = ['Lanca', 'Espada', 'Spy', 'CP'];
    const PROCESSED_STORAGE_PREFIX = 'cts_forum_blind_processed_v1';

    if (document.getElementById(APP_ID)) return;

    const pageUrl = new URL(location.href);
    if (pageUrl.searchParams.get('screen') !== 'forum' || pageUrl.searchParams.get('screenmode') !== 'view_thread') {
        notify('error', 'Abra o topico do blind antes de executar o script.');
        return;
    }

    let state = {
        editUrl: '',
        editForm: null,
        originalBbcode: '',
        updatedBbcode: '',
        requests: [],
        replies: [],
        safeReplies: [],
        ignoredReplies: [],
        alreadyProcessedReplies: [],
        edited: false,
        busy: false
    };

    init().catch((error) => {
        console.error('[CTS Forum Blind]', error);
        notify('error', 'Nao foi possivel ler o topico: ' + (error?.message || 'erro desconhecido'));
    });

    async function init() {
        installStyles();
        showLoading();

        state.editUrl = findMainPostEditUrl();
        if (!state.editUrl) throw new Error('link Editar do post principal nao encontrado');

        const editDocument = await fetchDocument(state.editUrl);
        const formInfo = findMessageForm(editDocument, state.editUrl);
        state.editForm = formInfo;
        state.originalBbcode = formInfo.textarea.value || formInfo.textarea.textContent || '';
        state.requests = parseRequestRows(state.originalBbcode);
        if (!state.requests.length) {
            throw new Error('a tabela [table] de pedidos nao foi reconhecida no post principal');
        }

        state.replies = collectReplyPosts();
        const processedIds = loadProcessedIds();
        state.alreadyProcessedReplies = state.replies.filter((post) => processedIds.has(String(post.id)));
        const newReplies = state.replies.filter((post) => !processedIds.has(String(post.id)));
        const classified = classifyReplies(newReplies, new Set(state.requests.map((item) => item.number)));
        state.safeReplies = classified.safe;
        state.ignoredReplies = classified.ignored;

        applyContributions();
        state.updatedBbcode = buildUpdatedBbcode(state.originalBbcode, state.requests);
        render();
    }

    function findMainPostEditUrl() {
        const editLinks = Array.from(document.querySelectorAll('a[href]')).filter((link) => {
            const text = normalizeText(link.textContent).toLowerCase();
            return text === 'editar' && /forum|post|thread/i.test(link.href);
        });
        if (!editLinks.length) return '';

        const firstPost = findFirstPostContainer();
        const insideMain = firstPost
            ? editLinks.find((link) => firstPost.contains(link))
            : null;
        return (insideMain || editLinks[0]).href;
    }

    function findFirstPostContainer() {
        const candidates = Array.from(document.querySelectorAll('[id^="post_"], .forum_post, .post, table.vis'));
        return candidates.find((element) => {
            const text = normalizeText(element.textContent).toLowerCase();
            return text.includes('pedidos de blind') && text.includes('chegada maxima');
        }) || candidates.find((element) => normalizeText(element.textContent).toLowerCase().includes('pedidos de blind')) || null;
    }

    async function fetchDocument(url, options) {
        const response = await fetch(url, Object.assign({
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }, options || {}));
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const html = await response.text();
        if (/Prote[cç][aã]o contra Bots/i.test(html)) {
            throw new Error('o Tribal Wars solicitou a verificacao contra bots');
        }
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        if (/login/i.test(parsed.title || '') && parsed.querySelector('input[type="password"]')) {
            throw new Error('a sessao do Tribal Wars expirou');
        }
        return parsed;
    }

    function findMessageForm(doc, sourceUrl) {
        const textarea = doc.querySelector('textarea[name="message"], textarea[name*="message"], textarea');
        if (!textarea) throw new Error('campo de texto da edicao nao encontrado');
        const form = textarea.closest('form');
        if (!form) throw new Error('formulario de edicao nao encontrado');
        return {
            document: doc,
            form,
            textarea,
            action: new URL(form.getAttribute('action') || sourceUrl, sourceUrl).href,
            method: (form.getAttribute('method') || 'POST').toUpperCase()
        };
    }

    function parseRequestRows(bbcode) {
        const requests = [];
        bbcode.replace(ROW_PATTERN, function () {
            const args = Array.from(arguments);
            const full = args[0];
            const number = Number(args[2]);
            const values = [Number(args[4]), Number(args[6]), Number(args[8]), Number(args[10])];
            const coordMatch = full.match(/\[coord\]\s*(\d{1,3}\|\d{1,3})\s*\[\/coord\]/i);
            requests.push({
                number,
                coord: coordMatch ? coordMatch[1] : '---|---',
                requested: values,
                received: [0, 0, 0, 0],
                remaining: values.slice(),
                excess: [0, 0, 0, 0],
                contributors: []
            });
            return full;
        });
        requests.sort((a, b) => a.number - b.number);
        return requests;
    }

    function collectReplyPosts() {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(isLikelyDeleteCheckbox);
        const seen = new Set();
        const posts = [];

        checkboxes.forEach((checkbox) => {
            const container = findReplyContainer(checkbox);
            if (!container || seen.has(container)) return;
            seen.add(container);

            const body = extractReplyBody(container);
            const author = extractAuthor(container);
            const id = checkbox.value || checkbox.name || container.id || 'resposta-' + (posts.length + 1);
            posts.push({ id, checkbox, container, body, author, entries: [], issues: [] });
        });

        return posts;
    }

    function isLikelyDeleteCheckbox(checkbox) {
        if (!checkbox.name && !checkbox.value) return false;
        const localText = normalizeText((checkbox.closest('form') || checkbox.parentElement)?.textContent || '').toLowerCase();
        const signature = [checkbox.name, checkbox.id, checkbox.value].filter(Boolean).join(' ').toLowerCase();
        return /post|message|delete|remove|apagar/.test(signature) || localText.includes('apagar mensagens');
    }

    function findReplyContainer(checkbox) {
        const direct = checkbox.closest('[id^="post_"], .forum_post, .post, table.vis');
        if (direct && !normalizeText(direct.textContent).toLowerCase().includes('pedidos de blind')) return direct;

        let current = checkbox.parentElement;
        while (current && current !== document.body) {
            const text = normalizeText(current.textContent).toLowerCase();
            if (text.includes('citar') && text.includes('editar') && text.length < 5000) return current;
            current = current.parentElement;
        }
        return null;
    }

    function extractReplyBody(container) {
        const specific = container.querySelector('.forum_post_message, .post-content, .post_content, .message, [class*="post_message"]');
        const source = specific || container;
        const lines = String(source.innerText || source.textContent || '')
            .split(/\r?\n/)
            .map((line) => normalizeText(line))
            .filter(Boolean);
        const exactLines = lines.filter((line) => STRICT_RESPONSE.test(line));
        if (exactLines.length) return exactLines.join('\n');
        return lines.join('\n');
    }

    function extractAuthor(container) {
        const playerLink = Array.from(container.querySelectorAll('a')).find((link) => /screen=info_player/.test(link.href));
        if (playerLink) return normalizeText(playerLink.textContent) || 'Jogador';
        const header = container.querySelector('th, .forum_post_header, [class*="post_header"]');
        const text = normalizeText(header?.textContent || container.textContent || '');
        const match = text.match(/^(.+?)\s+(?:hoje|ontem|em\s+\d)/i);
        return match ? match[1].trim() : 'Jogador';
    }

    function classifyReplies(posts, knownRequests) {
        const safe = [];
        const ignored = [];

        posts.forEach((post) => {
            const lines = post.body.split(/\r?\n/).map((line) => normalizeText(line)).filter(Boolean);
            const candidateLines = lines.filter((line) => /^\d/.test(line) || line.includes('/'));
            const entries = [];
            const issues = [];

            candidateLines.forEach((line) => {
                const match = line.match(STRICT_RESPONSE);
                if (!match) {
                    issues.push('Formato invalido: ' + line);
                    return;
                }
                const number = Number(match[1]);
                if (!knownRequests.has(number)) {
                    issues.push('Pedido ' + number + ' nao existe na tabela.');
                    return;
                }
                entries.push({ number, units: match.slice(2).map(Number), raw: line });
            });

            if (!candidateLines.length) issues.push('Nenhuma linha no formato pedido/lanca/espada/spy/cp.');
            post.entries = entries;
            post.issues = issues;

            if (entries.length && !issues.length) safe.push(post);
            else ignored.push(post);
        });

        return { safe, ignored };
    }

    function applyContributions() {
        const byNumber = new Map(state.requests.map((request) => [request.number, request]));
        state.safeReplies.forEach((post) => {
            post.entries.forEach((entry) => {
                const request = byNumber.get(entry.number);
                entry.units.forEach((value, index) => {
                    request.received[index] += value;
                    request.remaining[index] = Math.max(0, request.requested[index] - request.received[index]);
                    request.excess[index] = Math.max(0, request.received[index] - request.requested[index]);
                });
                request.contributors.push({ author: post.author, units: entry.units, postId: post.id });
            });
        });
    }

    function buildUpdatedBbcode(bbcode, requests) {
        const byNumber = new Map(requests.map((request) => [request.number, request]));
        return bbcode.replace(ROW_PATTERN, function () {
            const args = Array.from(arguments);
            const request = byNumber.get(Number(args[2]));
            if (!request) return args[0];
            return args[1] + args[2] + args[3]
                + request.remaining[0] + args[5]
                + request.remaining[1] + args[7]
                + request.remaining[2] + args[9]
                + request.remaining[3] + args[11];
        });
    }

    function installStyles() {
        if (document.getElementById(APP_ID + '-styles')) return;
        const style = document.createElement('style');
        style.id = APP_ID + '-styles';
        style.textContent = `
            #${APP_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:18px;background:rgba(7,10,18,.78);backdrop-filter:blur(4px);font-family:Inter,Segoe UI,Arial,sans-serif;color:#e9eef9}
            #${APP_ID} *{box-sizing:border-box}
            .ctsf-card{width:min(1180px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #31405d;border-radius:18px;background:#101827;box-shadow:0 30px 90px rgba(0,0,0,.65)}
            .ctsf-head{display:flex;align-items:center;gap:13px;padding:17px 20px;border-bottom:1px solid #2b3953;background:#121d31}.ctsf-logo{display:grid;place-items:center;width:43px;height:43px;border-radius:12px;background:linear-gradient(135deg,#24d2a8,#078a74);color:#05251e;font-weight:900}.ctsf-title{min-width:0}.ctsf-title h2{margin:0;color:#f7f9ff;font-size:20px}.ctsf-title p{margin:3px 0 0;color:#91a0ba;font-size:12px}.ctsf-close{margin-left:auto;border:1px solid #34445f;border-radius:10px;background:#152035;color:#b9c4d8;font-size:23px;line-height:1;padding:7px 11px;cursor:pointer}
            .ctsf-body{overflow:auto;padding:17px 19px 20px}.ctsf-alert{margin-bottom:13px;padding:11px 13px;border:1px solid #31506a;border-radius:10px;background:#11273a;color:#bfe9ff;font-size:12px}.ctsf-alert.warn{border-color:#765b2b;background:#2b2414;color:#ffd88c}.ctsf-alert.error{border-color:#7a3440;background:#2c171d;color:#ffabb4}.ctsf-alert.ok{border-color:#226b58;background:#102a25;color:#8ff0d4}
            .ctsf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}.ctsf-stat{padding:12px 14px;border:1px solid #2b3b57;border-radius:11px;background:#151f32}.ctsf-stat b{display:block;color:#fff;font-size:22px}.ctsf-stat span{color:#90a0bb;font-size:10px}
            .ctsf-table-wrap{overflow:auto;border:1px solid #2c3b56;border-radius:11px}.ctsf-table{width:100%;border-collapse:collapse;font-size:12px}.ctsf-table th{position:sticky;top:0;z-index:1;padding:9px 8px;background:#1b2940;color:#bfcbe0;text-align:left}.ctsf-table td{padding:8px;border-top:1px solid #263550;color:#dbe3f2;vertical-align:top}.ctsf-table tr.done td{background:rgba(20,170,130,.08)}.ctsf-table tr.excess td{background:rgba(236,171,55,.07)}.ctsf-num{font-variant-numeric:tabular-nums}.ctsf-zero{color:#4ee1b3;font-weight:800}.ctsf-pending{color:#ffcf75;font-weight:800}.ctsf-excess{display:block;color:#ff947a;font-size:10px}
            .ctsf-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.6fr);gap:13px;margin-top:13px}.ctsf-panel{border:1px solid #2b3b57;border-radius:11px;background:#141e30;overflow:hidden}.ctsf-panel h3{margin:0;padding:11px 13px;border-bottom:1px solid #2b3b57;color:#eef3fd;font-size:13px}.ctsf-list{max-height:230px;overflow:auto;padding:9px}.ctsf-reply{padding:9px 10px;border:1px solid #30415e;border-radius:8px;background:#111a2a;margin-bottom:7px;font-size:11px}.ctsf-reply b{color:#f4f7ff}.ctsf-reply code{display:block;margin-top:5px;color:#7fe4c7;white-space:pre-wrap}.ctsf-reply.bad{border-color:#713744;background:#28181e}.ctsf-reply.bad code{color:#ff9ca7}
            .ctsf-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:14px 19px;border-top:1px solid #2b3953;background:#111a2b}.ctsf-btn{padding:10px 14px;border:1px solid #3a4b68;border-radius:9px;background:#1a263c;color:#dce5f7;font-weight:800;cursor:pointer}.ctsf-btn:hover{filter:brightness(1.15)}.ctsf-btn:disabled{cursor:not-allowed;opacity:.45}.ctsf-primary{border-color:#0fa985;background:#0bbc93;color:#04241d}.ctsf-danger{border-color:#c64c5b;background:#b82f42;color:#fff}.ctsf-spacer{flex:1}.ctsf-note{color:#7f90ad;font-size:10px}
            .ctsf-loading{padding:55px;text-align:center;color:#aebbd2}.ctsf-spinner{width:34px;height:34px;margin:0 auto 12px;border:3px solid #263652;border-top-color:#20d0a6;border-radius:50%;animation:ctsf-spin .8s linear infinite}@keyframes ctsf-spin{to{transform:rotate(360deg)}}
            @media(max-width:800px){.ctsf-stats{grid-template-columns:1fr 1fr}.ctsf-grid{grid-template-columns:1fr}.ctsf-actions{flex-wrap:wrap}.ctsf-note{width:100%}}
        `;
        document.head.appendChild(style);
    }

    function showLoading() {
        const overlay = document.createElement('div');
        overlay.id = APP_ID;
        overlay.innerHTML = '<section class="ctsf-card"><header class="ctsf-head"><div class="ctsf-logo">CTS</div><div class="ctsf-title"><h2>Atualizador de Blind no Forum</h2><p>Lendo o post principal e conferindo as respostas...</p></div><button class="ctsf-close" type="button" aria-label="Fechar">&times;</button></header><div class="ctsf-loading"><div class="ctsf-spinner"></div>Preparando a conferencia segura.</div></section>';
        overlay.querySelector('.ctsf-close').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    function render(message, kind) {
        const overlay = document.getElementById(APP_ID);
        if (!overlay) return;
        const totals = state.requests.reduce((sum, item) => {
            item.requested.forEach((value, index) => sum.requested[index] += value);
            item.received.forEach((value, index) => sum.received[index] += value);
            item.remaining.forEach((value, index) => sum.remaining[index] += value);
            return sum;
        }, { requested: [0, 0, 0, 0], received: [0, 0, 0, 0], remaining: [0, 0, 0, 0] });
        const completed = state.requests.filter((item) => item.remaining.every((value) => value === 0)).length;

        overlay.innerHTML = `
            <section class="ctsf-card" role="dialog" aria-modal="true" aria-labelledby="ctsf-heading">
                <header class="ctsf-head"><div class="ctsf-logo">CTS</div><div class="ctsf-title"><h2 id="ctsf-heading">Atualizador de Blind no Forum</h2><p>Confira os descontos antes de alterar o post principal.</p></div><button class="ctsf-close" type="button" aria-label="Fechar">&times;</button></header>
                <div class="ctsf-body">
                    ${message ? `<div class="ctsf-alert ${escapeHtml(kind || '')}">${escapeHtml(message)}</div>` : ''}
                    <div class="ctsf-alert ${state.ignoredReplies.length ? 'warn' : 'ok'}">${state.safeReplies.length} resposta(s) nova(s) pronta(s) para processar. ${state.alreadyProcessedReplies.length} ja contabilizada(s), sem novo desconto. ${state.ignoredReplies.length} ignorada(s) por seguranca.</div>
                    <div class="ctsf-stats">
                        <div class="ctsf-stat"><b>${state.requests.length}</b><span>Pedidos na tabela</span></div>
                        <div class="ctsf-stat"><b>${state.safeReplies.length}</b><span>Postagens validas</span></div>
                        <div class="ctsf-stat"><b>${completed}</b><span>Pedidos completos apos desconto</span></div>
                        <div class="ctsf-stat"><b>${state.alreadyProcessedReplies.length}</b><span>Ja contabilizadas</span></div>
                    </div>
                    <div class="ctsf-table-wrap"><table class="ctsf-table"><thead><tr><th>Pedido</th><th>Coordenada</th>${UNIT_LABELS.map((label) => `<th>${label}<br><small>pedido / recebido / restante</small></th>`).join('')}<th>Colaboradores</th></tr></thead><tbody>
                        ${state.requests.map(renderRequestRow).join('')}
                    </tbody><tfoot><tr><th colspan="2">TOTAL</th>${UNIT_LABELS.map((_, index) => `<th>${formatNumber(totals.requested[index])} / ${formatNumber(totals.received[index])} / ${formatNumber(totals.remaining[index])}</th>`).join('')}<th></th></tr></tfoot></table></div>
                    <div class="ctsf-grid">
                        <section class="ctsf-panel"><h3>Respostas que serao descontadas</h3><div class="ctsf-list">${state.safeReplies.length ? state.safeReplies.map((post) => renderReply(post, false)).join('') : '<div class="ctsf-reply">Nenhuma resposta valida encontrada.</div>'}</div></section>
                        <section class="ctsf-panel"><h3>Revisao e historico</h3><div class="ctsf-list">${state.ignoredReplies.length ? state.ignoredReplies.map((post) => renderReply(post, true)).join('') : ''}${state.alreadyProcessedReplies.length ? state.alreadyProcessedReplies.map((post) => `<div class="ctsf-reply"><b>${escapeHtml(post.author)}</b><code>Ja contabilizada; pronta para exclusao sem novo desconto.</code></div>`).join('') : ''}${!state.ignoredReplies.length && !state.alreadyProcessedReplies.length ? '<div class="ctsf-reply">Nenhuma pendencia.</div>' : ''}</div></section>
                    </div>
                </div>
                <footer class="ctsf-actions">
                    <span class="ctsf-note">A edicao preserva o texto original e altera somente os quatro totais de cada linha da tabela.</span><span class="ctsf-spacer"></span>
                    <button class="ctsf-btn" type="button" data-action="copy">Copiar BBCode atualizado</button>
                    <button class="ctsf-btn ctsf-primary" type="button" data-action="edit" ${state.edited || !state.safeReplies.length ? 'disabled' : ''}>${state.edited ? 'Tabela atualizada' : 'Atualizar tabela'}</button>
                    <button class="ctsf-btn ctsf-danger" type="button" data-action="delete" ${(!state.edited || !state.safeReplies.length) && !state.alreadyProcessedReplies.length ? 'disabled' : ''}>Marcar e apagar processadas</button>
                </footer>
            </section>`;

        overlay.querySelector('.ctsf-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('[data-action="copy"]').addEventListener('click', copyUpdatedBbcode);
        overlay.querySelector('[data-action="edit"]').addEventListener('click', updateMainPost);
        overlay.querySelector('[data-action="delete"]').addEventListener('click', deleteProcessedReplies);
    }

    function renderRequestRow(item) {
        const done = item.remaining.every((value) => value === 0);
        const hasExcess = item.excess.some((value) => value > 0);
        const contributorText = Array.from(new Set(item.contributors.map((entry) => entry.author))).join(', ') || '—';
        return `<tr class="${done ? 'done' : ''} ${hasExcess ? 'excess' : ''}"><td><b>#${item.number}</b></td><td>${escapeHtml(item.coord)}</td>${item.requested.map((requested, index) => {
            const remaining = item.remaining[index];
            const excess = item.excess[index];
            return `<td class="ctsf-num">${formatNumber(requested)} / ${formatNumber(item.received[index])} / <span class="${remaining === 0 ? 'ctsf-zero' : 'ctsf-pending'}">${formatNumber(remaining)}</span>${excess ? `<span class="ctsf-excess">excesso +${formatNumber(excess)}</span>` : ''}</td>`;
        }).join('')}<td>${escapeHtml(contributorText)}</td></tr>`;
    }

    function renderReply(post, bad) {
        const detail = bad ? post.issues.join('\n') : post.entries.map((entry) => entry.raw).join('\n');
        return `<div class="ctsf-reply ${bad ? 'bad' : ''}"><b>${escapeHtml(post.author)}</b><code>${escapeHtml(detail)}</code></div>`;
    }

    async function copyUpdatedBbcode() {
        try {
            await navigator.clipboard.writeText(state.updatedBbcode);
            notify('success', 'BBCode atualizado copiado.');
        } catch (_error) {
            const area = document.createElement('textarea');
            area.value = state.updatedBbcode;
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
            notify('success', 'BBCode atualizado copiado.');
        }
    }

    async function updateMainPost() {
        if (state.busy || state.edited) return;
        const summary = state.safeReplies.length + ' postagem(ns) valida(s) serao descontadas da tabela. O restante do texto sera preservado.';
        if (!PAGE_WINDOW.confirm(summary + '\n\nDeseja atualizar o post principal agora?')) return;

        state.busy = true;
        setButtonsDisabled(true);
        try {
            const freshDocument = await fetchDocument(state.editUrl);
            const fresh = findMessageForm(freshDocument, state.editUrl);
            const latestBbcode = fresh.textarea.value || fresh.textarea.textContent || '';
            if (latestBbcode !== state.originalBbcode) {
                throw new Error('o post principal mudou depois da conferencia; feche e execute o script novamente');
            }

            const formData = new FormData(fresh.form);
            formData.set(fresh.textarea.name || 'message', state.updatedBbcode);
            appendSubmitter(formData, fresh.form);

            const response = await fetch(fresh.action, {
                method: fresh.method,
                body: formData,
                credentials: 'same-origin',
                redirect: 'follow'
            });
            const html = await response.text();
            if (!response.ok) throw new Error('HTTP ' + response.status + ' ao editar');
            if (/Prote[cç][aã]o contra Bots/i.test(html)) throw new Error('o Tribal Wars solicitou a verificacao contra bots');
            const resultDoc = new DOMParser().parseFromString(html, 'text/html');
            const visibleError = resultDoc.querySelector('.error, .error_box, .warn, .warning');
            if (visibleError && /erro|error|inval|falh/i.test(visibleError.textContent || '')) {
                throw new Error(normalizeText(visibleError.textContent));
            }

            const verificationDocument = await fetchDocument(state.editUrl);
            const verificationForm = findMessageForm(verificationDocument, state.editUrl);
            const savedBbcode = verificationForm.textarea.value || verificationForm.textarea.textContent || '';
            if (normalizeNewlines(savedBbcode) !== normalizeNewlines(state.updatedBbcode)) {
                throw new Error('o servidor nao confirmou o salvamento; nenhuma resposta sera apagada');
            }

            state.edited = true;
            saveProcessedIds(state.safeReplies.map((post) => post.id));
            updateVisibleRequestTable();
            render('Tabela principal atualizada. Confira os totais abaixo; agora voce pode apagar somente as respostas processadas.', 'ok');
            notify('success', 'Tabela do blind atualizada com sucesso.');
        } catch (error) {
            console.error('[CTS Forum Blind] Falha ao editar', error);
            render('A tabela nao foi alterada: ' + (error?.message || 'erro desconhecido'), 'error');
        } finally {
            state.busy = false;
            setButtonsDisabled(false);
        }
    }

    function appendSubmitter(formData, form) {
        const candidates = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));
        const submitter = candidates.find((element) => {
            const label = normalizeText(element.textContent || element.value || element.name || '').toLowerCase();
            return /salvar|enviar|editar|alterar|confirmar|publicar|^ok$/.test(label)
                && !/pre.?visual|preview/.test(label);
        }) || candidates.find((element) => {
            const label = normalizeText(element.textContent || element.value || element.name || '').toLowerCase();
            return !/pre.?visual|preview/.test(label);
        });
        if (submitter?.name && !formData.has(submitter.name)) {
            formData.append(submitter.name, submitter.value || submitter.textContent || 'Salvar');
        }
    }

    function updateVisibleRequestTable() {
        const mainPost = findFirstPostContainer() || document;
        const tables = [];
        if (mainPost.matches?.('table')) tables.push(mainPost);
        tables.push(...mainPost.querySelectorAll('table'));
        const targetTable = tables.find((table) => {
            const text = normalizeText(table.textContent).toLowerCase();
            return text.includes('coordenada')
                && (text.includes('lanca') || text.includes('lança'))
                && text.includes('espada')
                && text.includes('spy')
                && text.includes('cp');
        });
        if (!targetTable) return;

        const byNumber = new Map(state.requests.map((request) => [request.number, request]));
        Array.from(targetTable.rows || []).forEach((row) => {
            const cells = Array.from(row.cells || []);
            if (cells.length < 6) return;
            const numberMatch = normalizeText(cells[0].textContent).match(/^(\d+)$/);
            if (!numberMatch) return;
            const request = byNumber.get(Number(numberMatch[1]));
            if (!request) return;
            request.remaining.forEach((value, index) => {
                cells[index + 2].textContent = String(value);
            });
        });
    }

    function deleteProcessedReplies() {
        if (state.busy) return;
        const postsToDelete = [
            ...state.alreadyProcessedReplies,
            ...(state.edited ? state.safeReplies : [])
        ].filter((post, index, list) => list.findIndex((item) => String(item.id) === String(post.id)) === index);
        if (!postsToDelete.length) return;
        const count = postsToDelete.length;
        if (!PAGE_WINDOW.confirm('A tabela ja foi atualizada. Marcar e acionar a exclusao de ' + count + ' postagem(ns) processada(s)?\n\nAs respostas ignoradas permanecerao no topico.')) return;

        const boxes = postsToDelete.map((post) => post.checkbox).filter((box) => box?.isConnected);
        if (boxes.length !== count) {
            render('A pagina mudou e nem todas as respostas ainda estao disponiveis. Recarregue o topico antes de apagar.', 'error');
            return;
        }

        document.querySelectorAll('input[type="checkbox"]').forEach((box) => {
            if (isLikelyDeleteCheckbox(box)) box.checked = false;
        });
        boxes.forEach((box) => {
            box.checked = true;
            box.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const forms = Array.from(new Set(boxes.map((box) => box.form || box.closest('form')).filter(Boolean)));
        const deleteButton = findDeleteButton(forms);
        document.getElementById(APP_ID)?.remove();

        if (!deleteButton) {
            boxes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            notify('error', 'Respostas marcadas, mas o botao Apagar mensagens nao foi encontrado. Clique nele manualmente.');
            return;
        }

        deleteButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => deleteButton.click(), 350);
    }

    function findDeleteButton(forms) {
        const candidates = [];
        forms.forEach((form) => candidates.push(...form.querySelectorAll('button, input[type="submit"], a')));
        if (!candidates.length) candidates.push(...document.querySelectorAll('button, input[type="submit"], a'));
        return candidates.find((element) => {
            const label = normalizeText(element.textContent || element.value || element.title || '').toLowerCase();
            return label.includes('apagar mensagens') || label.includes('apagar selecionad');
        }) || null;
    }

    function setButtonsDisabled(disabled) {
        document.querySelectorAll('#' + APP_ID + ' button').forEach((button) => {
            if (!button.classList.contains('ctsf-close')) button.disabled = disabled;
        });
    }

    function normalizeText(value) {
        return String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
    }

    function normalizeNewlines(value) {
        return String(value || '').replace(/\r\n?/g, '\n').trim();
    }

    function processedStorageKey() {
        const url = new URL(location.href);
        const world = location.hostname.split('.')[0] || 'world';
        return [
            PROCESSED_STORAGE_PREFIX,
            world,
            url.searchParams.get('forum_id') || 'forum',
            url.searchParams.get('thread_id') || 'thread'
        ].join(':');
    }

    function loadProcessedIds() {
        try {
            const values = JSON.parse(localStorage.getItem(processedStorageKey()) || '[]');
            return new Set(Array.isArray(values) ? values.map(String) : []);
        } catch (_error) {
            return new Set();
        }
    }

    function saveProcessedIds(ids) {
        const saved = loadProcessedIds();
        ids.forEach((id) => saved.add(String(id)));
        localStorage.setItem(processedStorageKey(), JSON.stringify(Array.from(saved).slice(-500)));
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('pt-BR');
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[char]);
    }

    function notify(type, message) {
        const ui = PAGE_WINDOW.UI || window.UI;
        if (type === 'error' && ui?.ErrorMessage) ui.ErrorMessage(message, 5000);
        else if (ui?.SuccessMessage) ui.SuccessMessage(message, 4000);
        else console[type === 'error' ? 'error' : 'log']('[CTS Forum Blind] ' + message);
    }
})();

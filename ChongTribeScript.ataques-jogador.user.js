// ==UserScript==
// @name         Chong Tribe Script — Ataques por Jogador
// @namespace    chongtribescript.ataques.jogador
// @version      1.0.0
// @description  Analisa os ataques visíveis contra as aldeias de um jogador, com horários, filtros e agrupamento por aldeia ou atacante.
// @author       Chong Tribe Script
// @match        https://*.tribalwars.com.br/game.php*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongTribeScript.ataques-jogador.user.js
// @downloadURL  https://raw.githubusercontent.com/guijanuario/chong-tribe-script-releases/main/ChongTribeScript.ataques-jogador.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_ID = 'cts-ataques-jogador';
    const REQUEST_DELAY_MS = 260;
    const REQUEST_CONCURRENCY = 3;
    const TYPE_ORDER = ['noble', 'large', 'medium', 'small', 'unknown'];
    const TYPE_LABELS = {
        noble: 'Possível nobre',
        large: 'Ataque grande',
        medium: 'Ataque médio',
        small: 'Ataque pequeno',
        unknown: 'Ataque não classificado',
    };
    const TYPE_ICONS = {
        noble: '/graphic/command/snob.webp',
        large: '/graphic/command/attack_large.webp',
        medium: '/graphic/command/attack_medium.webp',
        small: '/graphic/command/attack_small.webp',
        unknown: '/graphic/command/attack.webp',
    };

    const state = {
        running: false,
        cancelled: false,
        processed: 0,
        failures: 0,
        playerName: '',
        villages: [],
        commands: [],
        view: 'village',
        search: '',
        type: 'all',
        sort: 'count',
    };

    function cleanText(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function normalize(value) {
        return cleanText(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatNumber(value) {
        return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
    }

    function sleep(milliseconds) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, milliseconds);
        });
    }

    function gameUrl(href) {
        try {
            return new URL(href, window.location.origin).toString();
        } catch (_error) {
            return '';
        }
    }

    function getVillageId(url) {
        try {
            return new URL(url).searchParams.get('id') || '';
        } catch (_error) {
            return '';
        }
    }

    function getPlayerName() {
        const headline = cleanText(document.querySelector('#content_value h2')?.textContent);
        const title = headline
            .replace(/^(informa(?:ç|c)(?:ões|oes) (?:do|de) jogador|perfil (?:do|de) jogador)\s*[-:]?\s*/i, '')
            .replace(/\s*\([^)]*\)\s*$/, '')
            .trim();
        return title || 'Jogador selecionado';
    }

    function hasAttackMarker(row) {
        if (!row) return false;
        return Boolean(
            row.querySelector(
                '.command-attack-ally,.command-attack,img[src*="/command/attack"],img[src*="command_attack"]'
            )
        );
    }

    function isAttackCommandRow(row) {
        return Array.from(row.querySelectorAll('img')).some(function (image) {
            const source = String(image.getAttribute('src') || '').toLowerCase();
            return /\/command\/attack(?:_|\.|\/)|command_attack/.test(source);
        });
    }

    async function expandVillageList() {
        const links = Array.from(document.querySelectorAll('#villages_list a[href="#"]'));
        const expandLink = links.find(function (link) {
            return /(?:mostrar|exibir|todas|mais|show|all)/.test(normalize(link.textContent));
        }) || document.querySelector('#villages_list tr:last-child a[href="#"]');
        if (!expandLink) return;
        expandLink.click();
        await sleep(1400);
    }

    function collectVillageLinks() {
        const unique = new Map();
        document
            .querySelectorAll('#villages_list a[href*="screen=info_village"][href*="id="]')
            .forEach(function (anchor) {
                const row = anchor.closest('tr');
                if (!hasAttackMarker(row)) return;
                const url = gameUrl(anchor.getAttribute('href'));
                const id = getVillageId(url);
                if (url && id && !unique.has(id)) unique.set(id, url);
            });
        return Array.from(unique.values());
    }

    function commandType(row) {
        const sources = Array.from(row.querySelectorAll('img'))
            .map(function (image) {
                return String(image.getAttribute('src') || '').toLowerCase();
            })
            .join(' ');
        if (/snob\.webp|unit_snob|\/snob\./.test(sources)) return 'noble';
        if (/attack_large/.test(sources)) return 'large';
        if (/attack_medium/.test(sources)) return 'medium';
        if (/attack_small/.test(sources)) return 'small';
        return 'unknown';
    }

    function parseEpoch(value) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) return null;
        return number < 100000000000 ? number * 1000 : number;
    }

    function formatArrivalTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(date);
    }

    function looksLikeArrival(value) {
        const text = normalize(value);
        return /(?:hoje|amanha|ontem|em \d+|dia \d+|\d{1,2}[./-]\d{1,2}).*\d{1,2}:\d{2}/.test(text)
            || /^\d{1,2}:\d{2}:\d{2}(?::\d{1,3})?$/.test(text);
    }

    function extractArrival(row) {
        const timed = row.querySelector('[data-endtime],[data-end-time],[data-arrival-time]');
        const timestamp = timed
            ? parseEpoch(
                  timed.getAttribute('data-endtime')
                      || timed.getAttribute('data-end-time')
                      || timed.getAttribute('data-arrival-time')
              )
            : null;
        if (timestamp) {
            return {
                timestamp: timestamp,
                label: formatArrivalTimestamp(timestamp),
                countdown: cleanText(timed.textContent),
            };
        }

        const explicit = row.querySelector('.command-arrival,.arrival-time,.timer,.timer-replacement');
        const cells = Array.from(row.cells || []);
        const matchingCell = cells.find(function (cell) {
            return looksLikeArrival(cell.textContent);
        });
        const label = cleanText((matchingCell || explicit)?.textContent);
        return {
            timestamp: null,
            label: label || 'Horário não disponível',
            countdown: explicit && explicit !== matchingCell ? cleanText(explicit.textContent) : '',
        };
    }

    function extractAttacker(row) {
        const playerAnchor = row.querySelector('a[href*="screen=info_player"]');
        if (playerAnchor) return cleanText(playerAnchor.textContent) || 'Não identificado';

        const labelElement = row.querySelector(
            '.quickedit-label,.command-label,.command-name,[data-command-name]'
        );
        const label = cleanText(
            labelElement?.getAttribute('data-command-name') || labelElement?.textContent
        );
        if (!label) return 'Não identificado';
        const shared = label.match(/^([^:]{2,60}):\s*(.+)$/);
        return cleanText(shared ? shared[1] : label) || 'Não identificado';
    }

    function extractCommandName(row) {
        const labelElement = row.querySelector(
            '.quickedit-label,.command-label,.command-name,[data-command-name]'
        );
        const label = cleanText(
            labelElement?.getAttribute('data-command-name') || labelElement?.textContent
        );
        const shared = label.match(/^([^:]{2,60}):\s*(.+)$/);
        return cleanText(shared ? shared[2] : label) || 'Ataque recebido';
    }

    function extractVillage(documentRoot, sourceUrl) {
        const heading = cleanText(documentRoot.querySelector('#content_value h2')?.textContent);
        const contentText = cleanText(documentRoot.querySelector('#content_value')?.textContent);
        const coordinate = (heading.match(/\b\d{1,3}\|\d{1,3}\b/) || contentText.match(/\b\d{1,3}\|\d{1,3}\b/) || [''])[0];
        const id = cleanText(
            documentRoot.querySelector('#commands_outgoings[data-village]')?.getAttribute('data-village')
        ) || getVillageId(sourceUrl);
        const name = heading.replace(/\s*\(\d{1,3}\|\d{1,3}\).*$/, '').trim() || 'Aldeia sem nome';
        return { id: id, name: name, coordinate: coordinate, url: sourceUrl };
    }

    function parseVillageDocument(documentRoot, sourceUrl) {
        const village = extractVillage(documentRoot, sourceUrl);
        const commands = [];
        documentRoot
            .querySelectorAll('#commands_outgoings tr.command-row')
            .forEach(function (row, rowIndex) {
                if (!isAttackCommandRow(row)) return;
                const type = commandType(row);
                const arrival = extractArrival(row);
                const detailAnchor = row.querySelector(
                    'a[href*="screen=info_command"],a[href*="command_id="]'
                );
                commands.push({
                    id: cleanText(row.getAttribute('data-id'))
                        || cleanText(detailAnchor?.getAttribute('href'))
                        || [village.id, rowIndex, extractCommandName(row)].join('-'),
                    player: extractAttacker(row),
                    name: extractCommandName(row),
                    type: type,
                    arrival: arrival.label,
                    arrivalTimestamp: arrival.timestamp,
                    countdown: arrival.countdown,
                    villageId: village.id,
                    villageName: village.name,
                    villageCoordinate: village.coordinate,
                    villageUrl: village.url,
                });
            });
        return { village: village, commands: commands };
    }

    async function fetchDocument(url) {
        const response = await window.fetch(url, {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const html = await response.text();
        return new DOMParser().parseFromString(html, 'text/html');
    }

    function addStyles() {
        if (document.getElementById(SCRIPT_ID + '-style')) return;
        const style = document.createElement('style');
        style.id = SCRIPT_ID + '-style';
        style.textContent = `
            #${SCRIPT_ID}-overlay{position:fixed;inset:0;background:rgba(8,12,20,.70);backdrop-filter:blur(3px);z-index:99998;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
            #${SCRIPT_ID}{--bg:#111827;--panel:#172033;--panel2:#1d2940;--line:#33435f;--text:#f5f7fb;--muted:#aebbd0;--accent:#16c6a3;--orange:#ff8a4c;--red:#f05252;position:relative;width:min(1120px,98vw);height:min(820px,94vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid #3e526f;border-radius:18px;background:linear-gradient(145deg,#111827,#0c1322);color:var(--text);box-shadow:0 30px 90px rgba(0,0,0,.55);font-family:Arial,Helvetica,sans-serif;font-size:13px}
            #${SCRIPT_ID} *{box-sizing:border-box}
            #${SCRIPT_ID} button,#${SCRIPT_ID} input,#${SCRIPT_ID} select{font:inherit}
            #${SCRIPT_ID} .cts-head{display:flex;justify-content:space-between;gap:14px;padding:20px 22px 16px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,rgba(22,198,163,.12),transparent 48%)}
            #${SCRIPT_ID} .cts-brand{display:flex;align-items:center;gap:13px;min-width:0}
            #${SCRIPT_ID} .cts-logo{width:46px;height:46px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#16c6a3,#087c73);box-shadow:0 8px 24px rgba(22,198,163,.24);font-weight:900;color:#072b2a}
            #${SCRIPT_ID} h2{font-size:23px;margin:0 0 3px;color:#fff;line-height:1.15}
            #${SCRIPT_ID} .cts-subtitle{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:720px}
            #${SCRIPT_ID} .cts-close{flex:0 0 auto;width:38px;height:38px;border:1px solid var(--line);border-radius:10px;background:#111827;color:#cbd5e1;cursor:pointer;font-size:22px;line-height:1}
            #${SCRIPT_ID} .cts-close:hover{background:#26344c;color:#fff}
            #${SCRIPT_ID} .cts-status-wrap{padding:12px 22px 0}
            #${SCRIPT_ID} .cts-status{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#d6deeb;margin-bottom:7px}
            #${SCRIPT_ID} .cts-status.error{color:#ff9a9a}
            #${SCRIPT_ID} .cts-progress{height:7px;background:#26344b;border-radius:99px;overflow:hidden}
            #${SCRIPT_ID} .cts-progress span{display:block;width:0;height:100%;background:linear-gradient(90deg,var(--accent),#43e6c6);transition:width .25s ease}
            #${SCRIPT_ID} .cts-body{flex:1;min-height:0;overflow:auto;padding:14px 22px 20px}
            #${SCRIPT_ID} .cts-stats{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:9px;margin-bottom:13px}
            #${SCRIPT_ID} .cts-stat{padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(150deg,var(--panel2),#141d2d)}
            #${SCRIPT_ID} .cts-stat strong{display:block;color:#fff;font-size:22px;line-height:1.1;margin-bottom:4px}
            #${SCRIPT_ID} .cts-stat span{color:var(--muted);font-size:11px}
            #${SCRIPT_ID} .cts-toolbar{display:grid;grid-template-columns:auto minmax(190px,1fr) 170px 180px auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--panel);position:sticky;top:0;z-index:4}
            #${SCRIPT_ID} .cts-tabs{display:flex;padding:3px;border-radius:9px;background:#0d1422}
            #${SCRIPT_ID} .cts-tab{border:0;background:transparent;color:var(--muted);padding:8px 11px;border-radius:7px;cursor:pointer;white-space:nowrap}
            #${SCRIPT_ID} .cts-tab.active{background:#263852;color:#fff}
            #${SCRIPT_ID} .cts-input,#${SCRIPT_ID} .cts-select{width:100%;height:36px;border:1px solid #40506a;border-radius:8px;background:#0e1522;color:#f5f7fb;padding:0 10px;outline:none}
            #${SCRIPT_ID} .cts-input:focus,#${SCRIPT_ID} .cts-select:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(22,198,163,.12)}
            #${SCRIPT_ID} .cts-actions{display:flex;gap:7px}
            #${SCRIPT_ID} .cts-btn{height:36px;border:1px solid #40506a;border-radius:8px;padding:0 12px;background:#263650;color:#fff;cursor:pointer;white-space:nowrap}
            #${SCRIPT_ID} .cts-btn:hover{filter:brightness(1.14)}
            #${SCRIPT_ID} .cts-btn.primary{border-color:#16c6a3;background:#0f8f7c}
            #${SCRIPT_ID} .cts-btn:disabled{opacity:.45;cursor:not-allowed}
            #${SCRIPT_ID} .cts-results{display:grid;gap:10px;margin-top:12px}
            #${SCRIPT_ID} .cts-group{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
            #${SCRIPT_ID} .cts-group-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 14px;background:linear-gradient(90deg,#202d45,#182236)}
            #${SCRIPT_ID} .cts-group-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px}
            #${SCRIPT_ID} .cts-group-title a{color:#fff;text-decoration:none}
            #${SCRIPT_ID} .cts-group-title a:hover{color:#5ce6cb}
            #${SCRIPT_ID} .cts-group-meta{color:var(--muted);font-size:11px}
            #${SCRIPT_ID} .cts-badges{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}
            #${SCRIPT_ID} .cts-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid #465874;border-radius:99px;background:#101827;color:#dbe4f3;padding:4px 8px;font-size:11px}
            #${SCRIPT_ID} .cts-badge img{width:14px;height:14px}
            #${SCRIPT_ID} .cts-command-grid{display:grid;grid-template-columns:minmax(160px,1.25fr) minmax(150px,1fr) minmax(175px,1.05fr) minmax(120px,.8fr);align-items:center;border-top:1px solid #2d3d56}
            #${SCRIPT_ID} .cts-command-grid>div{padding:9px 13px;min-width:0}
            #${SCRIPT_ID} .cts-command-grid.header{color:#8fa1bc;font-size:10px;text-transform:uppercase;letter-spacing:.07em;background:#121b2b}
            #${SCRIPT_ID} .cts-command-grid:not(.header):hover{background:#1d2a40}
            #${SCRIPT_ID} .cts-player{font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis}
            #${SCRIPT_ID} .cts-type{display:inline-flex;align-items:center;gap:6px;color:#dce5f3}
            #${SCRIPT_ID} .cts-type img{width:16px;height:16px}
            #${SCRIPT_ID} .cts-arrival{font-weight:700;color:#68ead0}
            #${SCRIPT_ID} .cts-countdown{display:block;color:#899ab4;font-size:10px;margin-top:2px}
            #${SCRIPT_ID} .cts-empty{padding:42px 20px;text-align:center;border:1px dashed #42516a;border-radius:12px;color:var(--muted);background:rgba(23,32,51,.55)}
            #${SCRIPT_ID} .cts-note{margin-top:12px;color:#8190a7;font-size:11px;line-height:1.5}
            #${SCRIPT_ID} .cts-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:6px;animation:cts-spin .7s linear infinite}
            @keyframes cts-spin{to{transform:rotate(360deg)}}
            @media(max-width:850px){#${SCRIPT_ID}{height:96vh}#${SCRIPT_ID} .cts-stats{grid-template-columns:repeat(2,1fr)}#${SCRIPT_ID} .cts-toolbar{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-tabs{grid-column:1/-1}#${SCRIPT_ID} .cts-actions{grid-column:1/-1}#${SCRIPT_ID} .cts-command-grid{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-command-grid.header{display:none}}
            @media(max-width:520px){#${SCRIPT_ID}-overlay{padding:0}#${SCRIPT_ID}{width:100vw;height:100vh;border-radius:0}#${SCRIPT_ID} .cts-head,#${SCRIPT_ID} .cts-body,#${SCRIPT_ID} .cts-status-wrap{padding-left:12px;padding-right:12px}#${SCRIPT_ID} .cts-stats{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-toolbar{grid-template-columns:1fr}#${SCRIPT_ID} .cts-tabs,#${SCRIPT_ID} .cts-actions{grid-column:auto}#${SCRIPT_ID} .cts-command-grid{grid-template-columns:1fr}#${SCRIPT_ID} .cts-group-head{display:block}#${SCRIPT_ID} .cts-badges{justify-content:flex-start;margin-top:8px}}
        `;
        document.head.appendChild(style);
    }

    function renderShell() {
        document.getElementById(SCRIPT_ID + '-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = SCRIPT_ID + '-overlay';
        overlay.innerHTML = `
            <section id="${SCRIPT_ID}" role="dialog" aria-modal="true" aria-label="Ataques por jogador">
                <header class="cts-head">
                    <div class="cts-brand">
                        <div class="cts-logo">CTS</div>
                        <div>
                            <h2>Ataques recebidos — ${escapeHtml(state.playerName)}</h2>
                            <div class="cts-subtitle">Horários e origem dos ataques visíveis nas aldeias deste jogador</div>
                        </div>
                    </div>
                    <button class="cts-close" data-action="close" title="Fechar">×</button>
                </header>
                <div class="cts-status-wrap">
                    <div class="cts-status" id="${SCRIPT_ID}-status"><span>Preparando a leitura…</span><span></span></div>
                    <div class="cts-progress"><span id="${SCRIPT_ID}-progress"></span></div>
                </div>
                <main class="cts-body">
                    <div class="cts-stats" id="${SCRIPT_ID}-stats"></div>
                    <div class="cts-toolbar">
                        <div class="cts-tabs">
                            <button class="cts-tab active" data-view="village">Por aldeia</button>
                            <button class="cts-tab" data-view="player">Por jogador</button>
                        </div>
                        <input class="cts-input" data-filter="search" type="search" placeholder="Buscar jogador, aldeia ou coordenada…">
                        <select class="cts-select" data-filter="type">
                            <option value="all">Todos os tipos</option>
                            <option value="noble">Possíveis nobres</option>
                            <option value="large">Ataques grandes</option>
                            <option value="medium">Ataques médios</option>
                            <option value="small">Ataques pequenos</option>
                            <option value="unknown">Não classificados</option>
                        </select>
                        <select class="cts-select" data-filter="sort">
                            <option value="count">Mais ataques primeiro</option>
                            <option value="arrival">Chegada mais próxima</option>
                            <option value="name">Ordem alfabética</option>
                        </select>
                        <div class="cts-actions">
                            <button class="cts-btn" data-action="export" disabled>Exportar CSV</button>
                            <button class="cts-btn primary" data-action="reload">Atualizar</button>
                        </div>
                    </div>
                    <div class="cts-results" id="${SCRIPT_ID}-results"></div>
                    <div class="cts-note">Os dados exibidos respeitam as permissões e o compartilhamento do Tribal Wars. Comandos ou horários não visíveis para sua conta não podem ser recuperados pelo script.</div>
                </main>
            </section>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (event) {
            const button = event.target.closest('[data-action],[data-view]');
            if (!button) return;
            if (button.dataset.action === 'close') {
                state.cancelled = true;
                overlay.remove();
            } else if (button.dataset.action === 'reload') {
                loadData();
            } else if (button.dataset.action === 'export') {
                exportCsv();
            } else if (button.dataset.view) {
                state.view = button.dataset.view;
                overlay.querySelectorAll('[data-view]').forEach(function (tab) {
                    tab.classList.toggle('active', tab.dataset.view === state.view);
                });
                renderResults();
            }
        });

        overlay.querySelector('[data-filter="search"]').addEventListener('input', function (event) {
            state.search = event.target.value;
            renderResults();
        });
        overlay.querySelector('[data-filter="type"]').addEventListener('change', function (event) {
            state.type = event.target.value;
            renderResults();
        });
        overlay.querySelector('[data-filter="sort"]').addEventListener('change', function (event) {
            state.sort = event.target.value;
            renderResults();
        });
    }

    function setStatus(message, detail, percent, error) {
        const status = document.getElementById(SCRIPT_ID + '-status');
        const progress = document.getElementById(SCRIPT_ID + '-progress');
        if (!status || !progress) return;
        status.classList.toggle('error', Boolean(error));
        status.innerHTML = `<span>${state.running ? '<i class="cts-spinner"></i>' : ''}${escapeHtml(message)}</span><span>${escapeHtml(detail || '')}</span>`;
        progress.style.width = Math.max(0, Math.min(100, Number(percent) || 0)) + '%';
    }

    function filteredCommands() {
        const query = normalize(state.search);
        return state.commands.filter(function (command) {
            if (state.type !== 'all' && command.type !== state.type) return false;
            if (!query) return true;
            return normalize([
                command.player,
                command.name,
                command.villageName,
                command.villageCoordinate,
                command.arrival,
            ].join(' ')).includes(query);
        });
    }

    function soonestTimestamp(commands) {
        const timestamps = commands
            .map(function (command) { return command.arrivalTimestamp; })
            .filter(Boolean);
        return timestamps.length ? Math.min.apply(null, timestamps) : Number.MAX_SAFE_INTEGER;
    }

    function groupCommands(commands, keySelector) {
        const groups = new Map();
        commands.forEach(function (command) {
            const key = keySelector(command);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(command);
        });
        return Array.from(groups.entries());
    }

    function sortGroups(groups) {
        return groups.sort(function (a, b) {
            if (state.sort === 'arrival') return soonestTimestamp(a[1]) - soonestTimestamp(b[1]);
            if (state.sort === 'name') return a[0].localeCompare(b[0], 'pt-BR');
            return b[1].length - a[1].length || a[0].localeCompare(b[0], 'pt-BR');
        });
    }

    function countByType(commands, type) {
        return commands.filter(function (command) { return command.type === type; }).length;
    }

    function typeBadge(type, count) {
        if (!count) return '';
        return `<span class="cts-badge"><img src="${TYPE_ICONS[type]}" alt="">${escapeHtml(TYPE_LABELS[type])}: <strong>${formatNumber(count)}</strong></span>`;
    }

    function commandRows(commands, fourthColumn) {
        const sorted = commands.slice().sort(function (a, b) {
            return (a.arrivalTimestamp || Number.MAX_SAFE_INTEGER) - (b.arrivalTimestamp || Number.MAX_SAFE_INTEGER)
                || a.player.localeCompare(b.player, 'pt-BR');
        });
        return sorted.map(function (command) {
            const fourth = fourthColumn === 'village'
                ? `${escapeHtml(command.villageName)}${command.villageCoordinate ? ' · ' + escapeHtml(command.villageCoordinate) : ''}`
                : escapeHtml(command.name);
            return `
                <div class="cts-command-grid">
                    <div class="cts-player">${escapeHtml(command.player)}</div>
                    <div class="cts-type"><img src="${TYPE_ICONS[command.type]}" alt="">${escapeHtml(TYPE_LABELS[command.type])}</div>
                    <div><span class="cts-arrival">${escapeHtml(command.arrival)}</span>${command.countdown && command.countdown !== command.arrival ? `<span class="cts-countdown">Chega em ${escapeHtml(command.countdown)}</span>` : ''}</div>
                    <div>${fourth}</div>
                </div>
            `;
        }).join('');
    }

    function renderVillageGroup(_key, commands) {
        const first = commands[0];
        const players = new Set(commands.map(function (command) { return command.player; })).size;
        return `
            <section class="cts-group">
                <div class="cts-group-head">
                    <div>
                        <div class="cts-group-title"><a href="${escapeHtml(first.villageUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(first.villageName)}</a></div>
                        <div class="cts-group-meta">${escapeHtml(first.villageCoordinate || 'Coordenada não localizada')} · ${formatNumber(players)} jogador(es) atacando</div>
                    </div>
                    <div class="cts-badges">
                        <span class="cts-badge">Total: <strong>${formatNumber(commands.length)}</strong></span>
                        ${TYPE_ORDER.map(function (type) { return typeBadge(type, countByType(commands, type)); }).join('')}
                    </div>
                </div>
                <div class="cts-command-grid header"><div>Jogador</div><div>Tipo</div><div>Horário de chegada</div><div>Nome do comando</div></div>
                ${commandRows(commands, 'command')}
            </section>
        `;
    }

    function renderPlayerGroup(player, commands) {
        const villages = new Set(commands.map(function (command) { return command.villageId; })).size;
        return `
            <section class="cts-group">
                <div class="cts-group-head">
                    <div>
                        <div class="cts-group-title">${escapeHtml(player)}</div>
                        <div class="cts-group-meta">${formatNumber(villages)} aldeia(s) atacada(s) · horários ordenados pela chegada</div>
                    </div>
                    <div class="cts-badges">
                        <span class="cts-badge">Total: <strong>${formatNumber(commands.length)}</strong></span>
                        ${TYPE_ORDER.map(function (type) { return typeBadge(type, countByType(commands, type)); }).join('')}
                    </div>
                </div>
                <div class="cts-command-grid header"><div>Jogador</div><div>Tipo</div><div>Horário de chegada</div><div>Aldeia atacada</div></div>
                ${commandRows(commands, 'village')}
            </section>
        `;
    }

    function renderStats(commands) {
        const element = document.getElementById(SCRIPT_ID + '-stats');
        if (!element) return;
        const villages = new Set(commands.map(function (command) { return command.villageId; })).size;
        const players = new Set(commands.map(function (command) { return command.player; })).size;
        const nextTimestamp = soonestTimestamp(commands);
        const next = nextTimestamp === Number.MAX_SAFE_INTEGER ? '—' : formatArrivalTimestamp(nextTimestamp);
        element.innerHTML = `
            <div class="cts-stat"><strong>${formatNumber(villages)}</strong><span>Aldeias sob ataque</span></div>
            <div class="cts-stat"><strong>${formatNumber(commands.length)}</strong><span>Ataques visíveis</span></div>
            <div class="cts-stat"><strong>${formatNumber(players)}</strong><span>Jogadores atacando</span></div>
            <div class="cts-stat"><strong>${formatNumber(countByType(commands, 'noble'))}</strong><span>Possíveis nobres</span></div>
            <div class="cts-stat"><strong style="font-size:${next === '—' ? '22px' : '15px'}">${escapeHtml(next)}</strong><span>Próxima chegada</span></div>
        `;
    }

    function renderResults() {
        const results = document.getElementById(SCRIPT_ID + '-results');
        if (!results) return;
        const commands = filteredCommands();
        renderStats(commands);
        const exportButton = document.querySelector('#' + SCRIPT_ID + ' [data-action="export"]');
        if (exportButton) exportButton.disabled = commands.length === 0;

        if (!commands.length) {
            results.innerHTML = `<div class="cts-empty"><strong>Nenhum ataque encontrado.</strong><br><br>Revise os filtros ou confirme se os comandos estão compartilhados e visíveis para sua conta.</div>`;
            return;
        }

        const groups = state.view === 'player'
            ? groupCommands(commands, function (command) { return command.player; })
            : groupCommands(commands, function (command) { return command.villageId || command.villageCoordinate; });
        sortGroups(groups);
        results.innerHTML = groups.map(function (entry) {
            return state.view === 'player'
                ? renderPlayerGroup(entry[0], entry[1])
                : renderVillageGroup(entry[0], entry[1]);
        }).join('');
    }

    function csvCell(value) {
        return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    }

    function exportCsv() {
        const header = ['Jogador', 'Aldeia atacada', 'Coordenada', 'Tipo', 'Nome do comando', 'Chegada', 'Contagem regressiva'];
        const rows = [header].concat(filteredCommands().map(function (command) {
            return [
                command.player,
                command.villageName,
                command.villageCoordinate,
                TYPE_LABELS[command.type],
                command.name,
                command.arrival,
                command.countdown,
            ];
        }));
        const csv = '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(';'); }).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ataques-' + String(window.game_data?.world || 'mundo') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }

    async function loadData() {
        if (state.running) return;
        state.running = true;
        state.cancelled = false;
        state.processed = 0;
        state.failures = 0;
        state.villages = [];
        state.commands = [];
        renderResults();

        await expandVillageList();
        const links = collectVillageLinks();
        if (!links.length) {
            state.running = false;
            setStatus('Nenhuma aldeia com ataques visíveis foi encontrada.', 'Verifique o compartilhamento dos comandos.', 100, true);
            return;
        }

        setStatus('Lendo aldeias atacadas…', '0 de ' + links.length, 0, false);
        let cursor = 0;
        async function worker() {
            while (!state.cancelled) {
                const index = cursor;
                cursor += 1;
                if (index >= links.length) return;
                try {
                    const documentRoot = await fetchDocument(links[index]);
                    const parsed = parseVillageDocument(documentRoot, links[index]);
                    state.villages.push(parsed.village);
                    state.commands.push.apply(state.commands, parsed.commands);
                } catch (error) {
                    state.failures += 1;
                    console.error('[Chong Tribe Script — Ataques por Jogador]', links[index], error);
                }
                state.processed += 1;
                const percent = Math.round((state.processed / links.length) * 100);
                setStatus(
                    'Lendo aldeias atacadas…',
                    state.processed + ' de ' + links.length + (state.failures ? ' · ' + state.failures + ' falha(s)' : ''),
                    percent,
                    false
                );
                if (state.processed % 4 === 0 || state.processed === links.length) renderResults();
                await sleep(REQUEST_DELAY_MS);
            }
        }

        await Promise.all(Array.from({ length: Math.min(REQUEST_CONCURRENCY, links.length) }, worker));
        state.running = false;
        if (!document.getElementById(SCRIPT_ID)) return;
        renderResults();
        if (state.cancelled) {
            setStatus('Leitura interrompida.', 'Os dados já obtidos foram mantidos.', 100, false);
        } else {
            setStatus(
                formatNumber(state.commands.length) + ' ataque(s) carregado(s).',
                formatNumber(state.villages.length) + ' aldeia(s)' + (state.failures ? ' · ' + state.failures + ' falha(s)' : ''),
                100,
                state.commands.length === 0
            );
        }
    }

    function notifyError(message) {
        if (window.UI?.ErrorMessage) window.UI.ErrorMessage(message);
        else window.alert(message);
    }

    function init() {
        const screen = String(window.game_data?.screen || new URLSearchParams(window.location.search).get('screen') || '');
        if (screen !== 'info_player') {
            notifyError('Abra o perfil de um jogador para usar “Ataques por Jogador”.');
            return;
        }
        addStyles();
        state.playerName = getPlayerName();
        renderShell();
        loadData();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();

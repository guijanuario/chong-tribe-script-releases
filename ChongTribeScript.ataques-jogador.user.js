// ==UserScript==
// @name         Chong Tribe Script — Ataques por Jogador
// @namespace    chongtribescript.ataques.jogador
// @version      1.2.0
// @description  Analisa ataques e apoios compartilhados nas aldeias de um jogador, com horários, tropas, filtros e agrupamentos.
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
    const UNIT_ORDER = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
    const UNIT_LABELS = {
        spear: 'Lanceiro', sword: 'Espadachim', axe: 'Bárbaro', archer: 'Arqueiro', spy: 'Espião',
        light: 'Cavalaria leve', marcher: 'Arqueiro a cavalo', heavy: 'Cavalaria pesada', ram: 'Aríete',
        catapult: 'Catapulta', knight: 'Paladino', snob: 'Nobre',
    };

    const state = {
        running: false,
        cancelled: false,
        processed: 0,
        failures: 0,
        playerName: '',
        villages: [],
        commands: [],
        mode: 'attack',
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

    function hasSupportMarker(row) {
        if (!row) return false;
        return Boolean(row.querySelector(
            '.command-support,.command-support-ally,img[src*="/command/support"],img[src*="command_support"]'
        ));
    }

    function villageHasMovementMarker(anchor) {
        const villagesList = document.getElementById('villages_list');
        let element = anchor;
        while (element && element !== villagesList) {
            if (element.tagName === 'TR' && (hasAttackMarker(element) || hasSupportMarker(element))) return true;
            element = element.parentElement;
        }
        return false;
    }

    function isAttackCommandRow(row) {
        return Array.from(row.querySelectorAll('img')).some(function (image) {
            const source = String(image.getAttribute('src') || '').toLowerCase();
            return /\/command\/attack(?:_|\.|\/)|command_attack/.test(source);
        });
    }

    function isSupportCommandRow(row) {
        return Array.from(row.querySelectorAll('img')).some(function (image) {
            const source = String(image.getAttribute('src') || '').toLowerCase();
            return /\/command\/support(?:_|\.|\/)|command_support/.test(source);
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
                if (!villageHasMovementMarker(anchor)) return;
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
        if (/attack_large/.test(sources)) return 'large';
        if (/attack_medium/.test(sources)) return 'medium';
        if (/attack_small/.test(sources)) return 'small';
        return 'unknown';
    }

    function commandHasNoble(row) {
        return Array.from(row.querySelectorAll('img')).some(function (image) {
            const source = String(image.getAttribute('src') || '').toLowerCase();
            return /snob\.webp|unit_snob|\/snob\./.test(source);
        });
    }

    function parseTroopNumber(value) {
        const text = cleanText(value);
        if (!text || text === '?' || text === '-') return null;
        const digits = text.replace(/[^\d]/g, '');
        return digits ? Number(digits) : null;
    }

    function unitIdFromCell(cell) {
        const html = String(cell?.innerHTML || '');
        const patterns = [
            /unit_([a-z]+)\.(?:png|webp|gif)/i,
            /unit-([a-z]+)/i,
            /data-unit=["']([a-z]+)["']/i,
            /units\/([a-z]+)\.(?:png|webp|gif)/i,
        ];
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && UNIT_ORDER.includes(match[1].toLowerCase())) return match[1].toLowerCase();
        }
        return '';
    }

    function readTroops(root) {
        for (const table of Array.from(root.querySelectorAll('table'))) {
            const rows = Array.from(table.rows || []);
            for (let index = 0; index < rows.length; index += 1) {
                const headers = Array.from(rows[index].cells || []).map(unitIdFromCell);
                if (!headers.some(Boolean)) continue;
                for (let dataIndex = index + 1; dataIndex < Math.min(rows.length, index + 4); dataIndex += 1) {
                    const cells = Array.from(rows[dataIndex].cells || []);
                    if (cells.length < headers.length) continue;
                    const troops = {};
                    let readable = 0;
                    headers.forEach(function (unit, cellIndex) {
                        if (!unit) return;
                        const number = parseTroopNumber(cells[cellIndex]?.textContent);
                        if (number != null) {
                            troops[unit] = number;
                            readable += 1;
                        }
                    });
                    if (readable) return troops;
                }
            }
        }
        const troops = {};
        root.querySelectorAll('[data-unit]').forEach(function (element) {
            const unit = normalize(element.getAttribute('data-unit')).replace(/[^a-z]/g, '');
            if (!UNIT_ORDER.includes(unit)) return;
            const number = parseTroopNumber(element.getAttribute('data-count') || element.textContent);
            if (number != null) troops[unit] = number;
        });
        return troops;
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

    function loggedPlayerName() {
        return cleanText(window.game_data?.player?.name) || 'Você';
    }

    function extractAttacker(row) {
        const playerAnchor = row.querySelector('a[href*="screen=info_player"]');
        if (playerAnchor) {
            return { name: cleanText(playerAnchor.textContent) || 'Não identificado', own: false };
        }

        const labelElement = row.querySelector(
            '.quickedit-label,.command-label,.command-name,[data-command-name]'
        );
        const label = cleanText(
            labelElement?.getAttribute('data-command-name') || labelElement?.textContent
        );
        if (!label) return { name: 'Não identificado', own: false };
        const shared = label.match(/^([^:]{2,60}):\s*(.+)$/);
        if (shared) return { name: cleanText(shared[1]) || 'Não identificado', own: false };
        return { name: loggedPlayerName(), own: true };
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
                const isAttack = isAttackCommandRow(row);
                const isSupport = isSupportCommandRow(row);
                if (!isAttack && !isSupport) return;
                const type = isAttack ? commandType(row) : 'support';
                const arrival = extractArrival(row);
                const attacker = extractAttacker(row);
                const detailAnchor = row.querySelector(
                    'a[href*="screen=info_command"],a[href*="command_id="]'
                );
                const detailUrl = gameUrl(detailAnchor?.getAttribute('href'));
                commands.push({
                    id: cleanText(row.getAttribute('data-id'))
                        || cleanText(detailAnchor?.getAttribute('href'))
                        || [village.id, rowIndex, extractCommandName(row)].join('-'),
                    player: attacker.name,
                    own: attacker.own,
                    name: extractCommandName(row),
                    type: type,
                    kind: isSupport ? 'support' : 'attack',
                    noble: isAttack && commandHasNoble(row),
                    detailUrl: detailUrl,
                    troops: {},
                    troopStatus: isSupport ? (detailUrl ? 'pending' : 'unavailable') : 'not-applicable',
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

    async function enrichSupport(command) {
        if (!command.detailUrl) {
            command.troopStatus = 'unavailable';
            return;
        }
        try {
            const detail = await fetchDocument(command.detailUrl);
            command.troops = readTroops(detail);
            command.troopStatus = Object.keys(command.troops).length ? 'available' : 'unavailable';
        } catch (error) {
            command.troopStatus = 'error';
            command.detailError = error.message || 'Falha ao carregar';
        }
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
            #${SCRIPT_ID} .cts-stats{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:9px;margin-bottom:13px}
            #${SCRIPT_ID} .cts-stat{padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(150deg,var(--panel2),#141d2d)}
            #${SCRIPT_ID} .cts-stat strong{display:block;color:#fff;font-size:22px;line-height:1.1;margin-bottom:4px}
            #${SCRIPT_ID} .cts-stat span{color:var(--muted);font-size:11px}
            #${SCRIPT_ID} .cts-strength{margin-bottom:13px;border:1px solid var(--line);border-radius:13px;background:linear-gradient(135deg,#172033,#121a2a);overflow:hidden}
            #${SCRIPT_ID} .cts-strength-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 14px 9px}
            #${SCRIPT_ID} .cts-strength-title{font-size:15px;font-weight:800;color:#fff}
            #${SCRIPT_ID} .cts-strength-note{color:var(--muted);font-size:10px;margin-top:3px}
            #${SCRIPT_ID} .cts-axes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 12px}
            #${SCRIPT_ID} .cts-axe{position:relative;overflow:hidden;padding:11px 12px;border:1px solid #3b4b65;border-radius:10px;background:#101827}
            #${SCRIPT_ID} .cts-axe:before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--axe-color)}
            #${SCRIPT_ID} .cts-axe-main{display:flex;align-items:center;gap:9px}
            #${SCRIPT_ID} .cts-axe img{width:25px;height:25px;image-rendering:auto}
            #${SCRIPT_ID} .cts-axe strong{font-size:22px;color:#fff;line-height:1}
            #${SCRIPT_ID} .cts-axe-label{display:block;color:#dbe5f4;font-weight:700;font-size:11px;margin-top:3px}
            #${SCRIPT_ID} .cts-axe-meta{color:#8fa0b8;font-size:10px;margin-top:5px}
            #${SCRIPT_ID} .cts-force-bar{display:flex;height:10px;margin:0 14px 12px;border-radius:99px;overflow:hidden;background:#26344b}
            #${SCRIPT_ID} .cts-force-bar span{display:block;height:100%;min-width:0;transition:width .25s ease}
            #${SCRIPT_ID} .cts-force-table-wrap{padding:0 14px 13px;overflow:auto}
            #${SCRIPT_ID} .cts-force-table{width:100%;border-collapse:collapse;font-size:11px}
            #${SCRIPT_ID} .cts-force-table th,#${SCRIPT_ID} .cts-force-table td{padding:6px 8px;border-top:1px solid #2c3b53;text-align:right;white-space:nowrap}
            #${SCRIPT_ID} .cts-force-table th{color:#8799b4;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
            #${SCRIPT_ID} .cts-force-table th:first-child,#${SCRIPT_ID} .cts-force-table td:first-child{text-align:left;max-width:260px;overflow:hidden;text-overflow:ellipsis}
            #${SCRIPT_ID} .cts-force-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
            #${SCRIPT_ID} .cts-mode-tabs{display:flex;gap:7px;margin-bottom:11px;padding:5px;border:1px solid var(--line);border-radius:12px;background:#0d1422}
            #${SCRIPT_ID} .cts-mode{flex:1;height:42px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--muted);font-weight:800;cursor:pointer}
            #${SCRIPT_ID} .cts-mode.active{border-color:#257c73;background:linear-gradient(135deg,#126f64,#0e514c);color:#fff;box-shadow:0 5px 18px rgba(22,198,163,.14)}
            #${SCRIPT_ID} .cts-unit-totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:7px;padding:0 14px 13px}
            #${SCRIPT_ID} .cts-unit-total{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #33445e;border-radius:9px;background:#101827}
            #${SCRIPT_ID} .cts-unit-total img{width:24px;height:24px}
            #${SCRIPT_ID} .cts-unit-total strong{display:block;color:#fff;font-size:16px}
            #${SCRIPT_ID} .cts-unit-total span{display:block;color:#8fa0b8;font-size:9px;margin-top:2px}
            #${SCRIPT_ID} .cts-troops{display:flex;flex-wrap:wrap;gap:5px}
            #${SCRIPT_ID} .cts-troop{display:inline-flex;align-items:center;gap:3px;padding:3px 5px;border:1px solid #3a4b65;border-radius:6px;background:#101827;color:#e4ebf6;font-size:10px}
            #${SCRIPT_ID} .cts-troop img{width:15px;height:15px}
            #${SCRIPT_ID} .cts-unavailable{color:#f1a3a3;font-size:10px}
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
            #${SCRIPT_ID} .cts-own{display:inline-flex;margin-left:6px;padding:2px 6px;border:1px solid rgba(22,198,163,.55);border-radius:99px;background:rgba(22,198,163,.12);color:#5ce6cb;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;vertical-align:1px}
            #${SCRIPT_ID} .cts-type{display:inline-flex;align-items:center;gap:6px;color:#dce5f3}
            #${SCRIPT_ID} .cts-type img{width:16px;height:16px}
            #${SCRIPT_ID} .cts-arrival{font-weight:700;color:#68ead0}
            #${SCRIPT_ID} .cts-countdown{display:block;color:#899ab4;font-size:10px;margin-top:2px}
            #${SCRIPT_ID} .cts-empty{padding:42px 20px;text-align:center;border:1px dashed #42516a;border-radius:12px;color:var(--muted);background:rgba(23,32,51,.55)}
            #${SCRIPT_ID} .cts-note{margin-top:12px;color:#8190a7;font-size:11px;line-height:1.5}
            #${SCRIPT_ID} .cts-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:6px;animation:cts-spin .7s linear infinite}
            @keyframes cts-spin{to{transform:rotate(360deg)}}
            @media(max-width:850px){#${SCRIPT_ID}{height:96vh}#${SCRIPT_ID} .cts-stats{grid-template-columns:repeat(2,1fr)}#${SCRIPT_ID} .cts-toolbar{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-tabs{grid-column:1/-1}#${SCRIPT_ID} .cts-actions{grid-column:1/-1}#${SCRIPT_ID} .cts-command-grid{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-command-grid.header{display:none}}
            @media(max-width:520px){#${SCRIPT_ID}-overlay{padding:0}#${SCRIPT_ID}{width:100vw;height:100vh;border-radius:0}#${SCRIPT_ID} .cts-head,#${SCRIPT_ID} .cts-body,#${SCRIPT_ID} .cts-status-wrap{padding-left:12px;padding-right:12px}#${SCRIPT_ID} .cts-stats{grid-template-columns:1fr 1fr}#${SCRIPT_ID} .cts-axes{grid-template-columns:1fr}#${SCRIPT_ID} .cts-toolbar{grid-template-columns:1fr}#${SCRIPT_ID} .cts-tabs,#${SCRIPT_ID} .cts-actions{grid-column:auto}#${SCRIPT_ID} .cts-command-grid{grid-template-columns:1fr}#${SCRIPT_ID} .cts-group-head{display:block}#${SCRIPT_ID} .cts-badges{justify-content:flex-start;margin-top:8px}}
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
                            <h2>Movimentações compartilhadas — ${escapeHtml(state.playerName)}</h2>
                            <div class="cts-subtitle">Ataques e apoios chegando às aldeias deste jogador</div>
                        </div>
                    </div>
                    <button class="cts-close" data-action="close" title="Fechar">×</button>
                </header>
                <div class="cts-status-wrap">
                    <div class="cts-status" id="${SCRIPT_ID}-status"><span>Preparando a leitura…</span><span></span></div>
                    <div class="cts-progress"><span id="${SCRIPT_ID}-progress"></span></div>
                </div>
                <main class="cts-body">
                    <div class="cts-mode-tabs">
                        <button class="cts-mode active" data-mode="attack">⚔ Ataques recebidos</button>
                        <button class="cts-mode" data-mode="support">🛡 Apoios chegando</button>
                    </div>
                    <div class="cts-stats" id="${SCRIPT_ID}-stats"></div>
                    <div id="${SCRIPT_ID}-strength"></div>
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
            const button = event.target.closest('[data-action],[data-view],[data-mode]');
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
            } else if (button.dataset.mode) {
                state.mode = button.dataset.mode;
                state.type = 'all';
                const typeSelect = overlay.querySelector('[data-filter="type"]');
                typeSelect.value = 'all';
                typeSelect.style.display = state.mode === 'support' ? 'none' : '';
                overlay.querySelectorAll('[data-mode]').forEach(function (tab) {
                    tab.classList.toggle('active', tab.dataset.mode === state.mode);
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
            if (command.kind !== state.mode) return false;
            if (state.mode === 'attack' && state.type === 'noble' && !command.noble) return false;
            if (state.mode === 'attack' && state.type !== 'all' && state.type !== 'noble' && command.type !== state.type) return false;
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
        if (type === 'noble') {
            return commands.filter(function (command) { return command.noble; }).length;
        }
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
                    <div class="cts-player">${escapeHtml(command.player)}${command.own ? '<span class="cts-own">Seu comando</span>' : ''}</div>
                    <div class="cts-type"><img src="${TYPE_ICONS[command.type]}" alt="">${escapeHtml(TYPE_LABELS[command.type])}${command.noble ? ` <span class="cts-badge"><img src="${TYPE_ICONS.noble}" alt="">Nobre</span>` : ''}</div>
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
        const ownCommands = commands.filter(function (command) { return command.own; }).length;
        const nextTimestamp = soonestTimestamp(commands);
        const next = nextTimestamp === Number.MAX_SAFE_INTEGER ? '—' : formatArrivalTimestamp(nextTimestamp);
        element.innerHTML = `
            <div class="cts-stat"><strong>${formatNumber(villages)}</strong><span>Aldeias sob ataque</span></div>
            <div class="cts-stat"><strong>${formatNumber(commands.length)}</strong><span>Ataques visíveis</span></div>
            <div class="cts-stat"><strong>${formatNumber(players)}</strong><span>Jogadores atacando</span></div>
            <div class="cts-stat"><strong>${formatNumber(ownCommands)}</strong><span>Seus ataques</span></div>
            <div class="cts-stat"><strong>${formatNumber(countByType(commands, 'noble'))}</strong><span>Possíveis nobres</span></div>
            <div class="cts-stat"><strong style="font-size:${next === '—' ? '22px' : '15px'}">${escapeHtml(next)}</strong><span>Próxima chegada</span></div>
        `;
    }

    function renderStrengthOverview(commands) {
        const element = document.getElementById(SCRIPT_ID + '-strength');
        if (!element) return;
        const colors = { large: '#ef4444', medium: '#a66b3f', small: '#39b86b' };
        const types = [
            { key: 'large', label: 'Machados vermelhos', hint: 'Ataques grandes' },
            { key: 'medium', label: 'Machados marrons', hint: 'Ataques médios' },
            { key: 'small', label: 'Machados verdes', hint: 'Ataques pequenos' },
        ];
        const counts = Object.fromEntries(types.map(function (item) {
            return [item.key, countByType(commands, item.key)];
        }));
        const classifiedTotal = counts.large + counts.medium + counts.small;
        const playersByType = Object.fromEntries(types.map(function (item) {
            return [item.key, new Set(commands.filter(function (command) {
                return command.type === item.key;
            }).map(function (command) { return command.player; })).size];
        }));
        const groups = sortGroups(groupCommands(commands, function (command) { return command.player; })).slice(0, 8);
        const cards = types.map(function (item) {
            const percent = classifiedTotal ? Math.round((counts[item.key] / classifiedTotal) * 100) : 0;
            return `
                <div class="cts-axe" style="--axe-color:${colors[item.key]}">
                    <div class="cts-axe-main"><img src="${TYPE_ICONS[item.key]}" alt=""><strong>${formatNumber(counts[item.key])}</strong></div>
                    <span class="cts-axe-label">${item.label}</span>
                    <div class="cts-axe-meta">${item.hint} · ${percent}% · ${formatNumber(playersByType[item.key])} jogador(es)</div>
                </div>
            `;
        }).join('');
        const bar = types.map(function (item) {
            const percent = classifiedTotal ? (counts[item.key] / classifiedTotal) * 100 : 0;
            return `<span title="${item.label}: ${formatNumber(counts[item.key])}" style="width:${percent}%;background:${colors[item.key]}"></span>`;
        }).join('');
        const rows = groups.map(function (entry) {
            const playerCommands = entry[1];
            return `
                <tr>
                    <td>${escapeHtml(entry[0])}${playerCommands.some(function (command) { return command.own; }) ? '<span class="cts-own">Você</span>' : ''}</td>
                    <td><span class="cts-force-dot" style="background:${colors.large}"></span>${formatNumber(countByType(playerCommands, 'large'))}</td>
                    <td><span class="cts-force-dot" style="background:${colors.medium}"></span>${formatNumber(countByType(playerCommands, 'medium'))}</td>
                    <td><span class="cts-force-dot" style="background:${colors.small}"></span>${formatNumber(countByType(playerCommands, 'small'))}</td>
                    <td>${formatNumber(countByType(playerCommands, 'noble'))}</td>
                    <td><strong>${formatNumber(playerCommands.length)}</strong></td>
                </tr>
            `;
        }).join('');
        element.innerHTML = `
            <section class="cts-strength">
                <div class="cts-strength-head">
                    <div><div class="cts-strength-title">Panorama da força ofensiva</div><div class="cts-strength-note">Distribuição dos indicadores de tamanho mostrados pelo Tribal Wars${state.search || state.type !== 'all' ? ' · considerando os filtros ativos' : ''}</div></div>
                    <span class="cts-badge">Classificados: <strong>${formatNumber(classifiedTotal)}</strong></span>
                </div>
                <div class="cts-axes">${cards}</div>
                <div class="cts-force-bar">${bar}</div>
                ${rows ? `<div class="cts-force-table-wrap"><table class="cts-force-table"><thead><tr><th>Jogador</th><th>Vermelhos</th><th>Marrons</th><th>Verdes</th><th>Nobres</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
            </section>
        `;
    }

    function sumTroops(commands) {
        const totals = Object.fromEntries(UNIT_ORDER.map(function (unit) { return [unit, 0]; }));
        commands.forEach(function (command) {
            UNIT_ORDER.forEach(function (unit) {
                totals[unit] += Number(command.troops?.[unit]) || 0;
            });
        });
        return totals;
    }

    function troopsHtml(command) {
        if (command.troopStatus !== 'available') {
            const label = command.troopStatus === 'pending' ? 'Carregando tropas…' : 'Quantidade não compartilhada';
            return `<span class="cts-unavailable">${label}</span>`;
        }
        const items = UNIT_ORDER.filter(function (unit) {
            return Number(command.troops?.[unit]) > 0;
        }).map(function (unit) {
            return `<span class="cts-troop" title="${escapeHtml(UNIT_LABELS[unit])}"><img src="/graphic/unit/unit_${unit}.png" alt="">${formatNumber(command.troops[unit])}</span>`;
        });
        return items.length ? `<div class="cts-troops">${items.join('')}</div>` : '<span class="cts-unavailable">Apoio sem tropas reconhecidas</span>';
    }

    function renderSupportStats(commands) {
        const element = document.getElementById(SCRIPT_ID + '-stats');
        if (!element) return;
        const villages = new Set(commands.map(function (command) { return command.villageId; })).size;
        const players = new Set(commands.map(function (command) { return command.player; })).size;
        const visible = commands.filter(function (command) { return command.troopStatus === 'available'; }).length;
        const troopTotal = Object.values(sumTroops(commands)).reduce(function (sum, value) { return sum + value; }, 0);
        const nextTimestamp = soonestTimestamp(commands);
        const next = nextTimestamp === Number.MAX_SAFE_INTEGER ? '—' : formatArrivalTimestamp(nextTimestamp);
        element.innerHTML = `
            <div class="cts-stat"><strong>${formatNumber(villages)}</strong><span>Aldeias recebendo</span></div>
            <div class="cts-stat"><strong>${formatNumber(commands.length)}</strong><span>Apoios chegando</span></div>
            <div class="cts-stat"><strong>${formatNumber(players)}</strong><span>Jogadores enviando</span></div>
            <div class="cts-stat"><strong>${formatNumber(visible)}</strong><span>Com tropas visíveis</span></div>
            <div class="cts-stat"><strong>${formatNumber(troopTotal)}</strong><span>Unidades identificadas</span></div>
            <div class="cts-stat"><strong style="font-size:${next === '—' ? '22px' : '15px'}">${escapeHtml(next)}</strong><span>Próxima chegada</span></div>
        `;
    }

    function renderSupportOverview(commands) {
        const element = document.getElementById(SCRIPT_ID + '-strength');
        if (!element) return;
        const totals = sumTroops(commands);
        const units = UNIT_ORDER.filter(function (unit) { return totals[unit] > 0; });
        const groups = sortGroups(groupCommands(commands, function (command) { return command.player; })).slice(0, 10);
        const unitCards = units.map(function (unit) {
            return `<div class="cts-unit-total"><img src="/graphic/unit/unit_${unit}.png" alt=""><div><strong>${formatNumber(totals[unit])}</strong><span>${escapeHtml(UNIT_LABELS[unit])}</span></div></div>`;
        }).join('');
        const rows = groups.map(function (entry) {
            const playerCommands = entry[1];
            const playerTroops = sumTroops(playerCommands);
            const total = Object.values(playerTroops).reduce(function (sum, value) { return sum + value; }, 0);
            const villages = new Set(playerCommands.map(function (command) { return command.villageId; })).size;
            return `<tr><td>${escapeHtml(entry[0])}${playerCommands.some(function (command) { return command.own; }) ? '<span class="cts-own">Você</span>' : ''}</td><td>${formatNumber(playerCommands.length)}</td><td>${formatNumber(villages)}</td><td><strong>${formatNumber(total)}</strong></td></tr>`;
        }).join('');
        element.innerHTML = `
            <section class="cts-strength">
                <div class="cts-strength-head"><div><div class="cts-strength-title">Panorama dos apoios chegando</div><div class="cts-strength-note">Soma somente tropas que estão compartilhadas e visíveis nos detalhes dos comandos</div></div></div>
                ${unitCards ? `<div class="cts-unit-totals">${unitCards}</div>` : '<div class="cts-empty" style="margin:0 14px 13px;padding:20px">Nenhuma quantidade de tropa compartilhada foi reconhecida.</div>'}
                ${rows ? `<div class="cts-force-table-wrap"><table class="cts-force-table"><thead><tr><th>Jogador</th><th>Apoios</th><th>Destinos</th><th>Unidades</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
            </section>
        `;
    }

    function supportRows(commands, fourthColumn) {
        return commands.slice().sort(function (a, b) {
            return (a.arrivalTimestamp || Number.MAX_SAFE_INTEGER) - (b.arrivalTimestamp || Number.MAX_SAFE_INTEGER);
        }).map(function (command) {
            const fourth = fourthColumn === 'village'
                ? `${escapeHtml(command.villageName)}${command.villageCoordinate ? ' · ' + escapeHtml(command.villageCoordinate) : ''}`
                : escapeHtml(command.name);
            return `<div class="cts-command-grid"><div class="cts-player">${escapeHtml(command.player)}${command.own ? '<span class="cts-own">Seu apoio</span>' : ''}</div><div><span class="cts-arrival">${escapeHtml(command.arrival)}</span>${command.countdown && command.countdown !== command.arrival ? `<span class="cts-countdown">Chega em ${escapeHtml(command.countdown)}</span>` : ''}</div><div>${troopsHtml(command)}</div><div>${fourth}</div></div>`;
        }).join('');
    }

    function renderSupportGroup(key, commands) {
        const first = commands[0];
        const byPlayer = state.view === 'player';
        const title = byPlayer ? key : first.villageName;
        const meta = byPlayer
            ? `${formatNumber(new Set(commands.map(function (command) { return command.villageId; })).size)} aldeia(s) de destino`
            : `${escapeHtml(first.villageCoordinate || 'Coordenada não localizada')} · ${formatNumber(new Set(commands.map(function (command) { return command.player; })).size)} jogador(es) enviando`;
        return `<section class="cts-group"><div class="cts-group-head"><div><div class="cts-group-title">${escapeHtml(title)}</div><div class="cts-group-meta">${meta}</div></div><div class="cts-badges"><span class="cts-badge">Apoios: <strong>${formatNumber(commands.length)}</strong></span><span class="cts-badge">Tropas visíveis: <strong>${formatNumber(commands.filter(function (command) { return command.troopStatus === 'available'; }).length)}</strong></span></div></div><div class="cts-command-grid header"><div>Jogador</div><div>Horário de chegada</div><div>Tropas enviadas</div><div>${byPlayer ? 'Aldeia de destino' : 'Nome do comando'}</div></div>${supportRows(commands, byPlayer ? 'village' : 'command')}</section>`;
    }

    function renderResults() {
        const results = document.getElementById(SCRIPT_ID + '-results');
        if (!results) return;
        const commands = filteredCommands();
        if (state.mode === 'support') {
            renderSupportStats(commands);
            renderSupportOverview(commands);
        } else {
            renderStats(commands);
            renderStrengthOverview(commands);
        }
        const exportButton = document.querySelector('#' + SCRIPT_ID + ' [data-action="export"]');
        if (exportButton) exportButton.disabled = commands.length === 0;

        if (!commands.length) {
            const emptyLabel = state.mode === 'support' ? 'Nenhum apoio chegando foi encontrado.' : 'Nenhum ataque encontrado.';
            results.innerHTML = `<div class="cts-empty"><strong>${emptyLabel}</strong><br><br>Confirme se os comandos estão compartilhados e visíveis para sua conta.</div>`;
            return;
        }

        const groups = state.view === 'player'
            ? groupCommands(commands, function (command) { return command.player; })
            : groupCommands(commands, function (command) { return command.villageId || command.villageCoordinate; });
        sortGroups(groups);
        results.innerHTML = groups.map(function (entry) {
            if (state.mode === 'support') return renderSupportGroup(entry[0], entry[1]);
            return state.view === 'player'
                ? renderPlayerGroup(entry[0], entry[1])
                : renderVillageGroup(entry[0], entry[1]);
        }).join('');
    }

    function csvCell(value) {
        return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    }

    function exportCsv() {
        const supportMode = state.mode === 'support';
        const header = supportMode
            ? ['Jogador', 'Seu apoio', 'Aldeia de destino', 'Coordenada', 'Nome do comando', 'Chegada', 'Contagem regressiva'].concat(UNIT_ORDER.map(function (unit) { return UNIT_LABELS[unit]; })).concat(['Status das tropas'])
            : ['Jogador', 'Seu comando', 'Aldeia atacada', 'Coordenada', 'Tipo', 'Nome do comando', 'Chegada', 'Contagem regressiva'];
        const rows = [header].concat(filteredCommands().map(function (command) {
            if (supportMode) {
                return [command.player, command.own ? 'Sim' : 'Não', command.villageName, command.villageCoordinate, command.name, command.arrival, command.countdown]
                    .concat(UNIT_ORDER.map(function (unit) { return command.troops?.[unit] ?? ''; }))
                    .concat([command.troopStatus === 'available' ? 'Visível' : 'Não compartilhada']);
            }
            return [
                command.player,
                command.own ? 'Sim' : 'Não',
                command.villageName,
                command.villageCoordinate,
                TYPE_LABELS[command.type] + (command.noble ? ' + possível nobre' : ''),
                command.name,
                command.arrival,
                command.countdown,
            ];
        }));
        const csv = '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(';'); }).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = (supportMode ? 'apoios-chegando-' : 'ataques-') + String(window.game_data?.world || 'mundo') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
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
            setStatus('Nenhuma aldeia com movimentações visíveis foi encontrada.', 'Verifique o compartilhamento dos comandos.', 100, true);
            return;
        }

        setStatus('Lendo ataques e apoios…', '0 de ' + links.length, 0, false);
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
                    'Lendo ataques e apoios…',
                    state.processed + ' de ' + links.length + (state.failures ? ' · ' + state.failures + ' falha(s)' : ''),
                    percent,
                    false
                );
                if (state.processed % 4 === 0 || state.processed === links.length) renderResults();
                await sleep(REQUEST_DELAY_MS);
            }
        }

        await Promise.all(Array.from({ length: Math.min(REQUEST_CONCURRENCY, links.length) }, worker));
        const supports = state.commands.filter(function (command) { return command.kind === 'support'; });
        let supportCursor = 0;
        let supportProcessed = 0;
        async function supportWorker() {
            while (!state.cancelled) {
                const index = supportCursor;
                supportCursor += 1;
                if (index >= supports.length) return;
                await enrichSupport(supports[index]);
                supportProcessed += 1;
                const percent = supports.length ? Math.round((supportProcessed / supports.length) * 100) : 100;
                setStatus('Carregando quantidades dos apoios…', supportProcessed + ' de ' + supports.length, percent, false);
                if (supportProcessed % 4 === 0 || supportProcessed === supports.length) renderResults();
                await sleep(REQUEST_DELAY_MS);
            }
        }
        if (supports.length) {
            await Promise.all(Array.from({ length: Math.min(REQUEST_CONCURRENCY, supports.length) }, supportWorker));
        }
        state.running = false;
        if (!document.getElementById(SCRIPT_ID)) return;
        renderResults();
        if (state.cancelled) {
            setStatus('Leitura interrompida.', 'Os dados já obtidos foram mantidos.', 100, false);
        } else {
            setStatus(
                formatNumber(state.commands.filter(function (command) { return command.kind === 'attack'; }).length) + ' ataque(s) · ' + formatNumber(supports.length) + ' apoio(s).',
                formatNumber(state.villages.length) + ' aldeia(s) analisada(s)' + (state.failures ? ' · ' + state.failures + ' falha(s)' : ''),
                100,
                state.commands.length === 0
            );
        }
    }

    function init() {
        const screen = String(window.game_data?.screen || new URLSearchParams(window.location.search).get('screen') || '');
        if (screen !== 'info_player') return;
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

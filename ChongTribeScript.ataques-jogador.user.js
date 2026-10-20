// ==UserScript==
// @name         Chong Tribe Script — Ataques por Jogador
// @namespace    chongtribescript.ataques.jogador
// @version      1.6.2
// @description  Analisa ataques compartilhados nos perfis inimigos e mantém uma central local focada nas tribos adversárias escolhidas.
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
    const CENTRAL_ID = 'cts-central-comandos-tribo';
    const DASHBOARD_STORAGE_VERSION = 2;
    const OP_STORAGE_VERSION = 1;
    const OP_ARRIVAL_TOLERANCE_MS = 5 * 60 * 1000;
    const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;
    const AUTO_MIN_INTERVAL_SECONDS = 20;
    const AUTO_DEFAULT_INTERVAL_SECONDS = 30;
    const REQUEST_DELAY_MS = 1400;
    const REQUEST_JITTER_MS = 700;
    const REQUEST_CONCURRENCY = 1;
    const OP_SCAN_CONCURRENCY = 3;
    const OP_SCAN_DELAY_MS = 300;
    const OP_SCAN_JITTER_MS = 200;
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
        supportDetailsLoaded: false,
        supportDetailsLoading: false,
        playerName: '',
        villages: [],
        commands: [],
        mode: 'attack',
        view: 'village',
        search: '',
        type: 'all',
        sort: 'count',
    };

    const centralState = {
        view: 'dashboard',
        search: '',
        attacker: 'all',
        victim: 'all',
        type: 'all',
        tribeInput: '',
        busy: false,
        message: '',
        error: false,
        autoInterval: AUTO_DEFAULT_INTERVAL_SECONDS,
    };

    const operationState = {
        search: '',
        status: 'all',
        busy: false,
        message: '',
        error: false,
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

    function requestPause() {
        return sleep(REQUEST_DELAY_MS + Math.floor(Math.random() * REQUEST_JITTER_MS));
    }

    function gameUrl(href) {
        if (!href) return '';
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

    function worldId() {
        return cleanText(window.game_data?.world) || window.location.hostname.split('.')[0] || 'mundo';
    }

    function allyId() {
        return cleanText(window.game_data?.player?.ally) || 'sem-tribo';
    }

    function dashboardStorageKey() {
        return ['cts', 'central-comandos', DASHBOARD_STORAGE_VERSION, worldId(), allyId()].join(':');
    }

    function emptyDashboard() {
        return {
            version: DASHBOARD_STORAGE_VERSION,
            world: worldId(),
            allyId: allyId(),
            updatedAt: 0,
            directory: {},
            snapshots: {},
            trackedTribes: {},
        };
    }

    function loadDashboard() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(dashboardStorageKey()) || 'null');
            if (!parsed || parsed.version !== DASHBOARD_STORAGE_VERSION) return emptyDashboard();
            parsed.directory = parsed.directory && typeof parsed.directory === 'object' ? parsed.directory : {};
            parsed.snapshots = parsed.snapshots && typeof parsed.snapshots === 'object' ? parsed.snapshots : {};
            parsed.trackedTribes = parsed.trackedTribes && typeof parsed.trackedTribes === 'object' ? parsed.trackedTribes : {};
            return parsed;
        } catch (_error) {
            return emptyDashboard();
        }
    }

    function saveDashboard(dashboard) {
        dashboard.updatedAt = Date.now();
        try {
            window.localStorage.setItem(dashboardStorageKey(), JSON.stringify(dashboard));
            return true;
        } catch (error) {
            console.error('[Chong Tribe Script — Central da Tribo] Não foi possível salvar os dados locais.', error);
            return false;
        }
    }

    function operationStorageKey() {
        return ['cts', 'conferencia-op', OP_STORAGE_VERSION, worldId(), allyId()].join(':');
    }

    function emptyOperationPlan() {
        return {
            version: OP_STORAGE_VERSION,
            world: worldId(),
            allyId: allyId(),
            fileName: '',
            importedAt: 0,
            impactTimestamp: null,
            impactLabel: '',
            ramMinutesPerField: null,
            commands: [],
            observations: {},
        };
    }

    function loadOperationPlan() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(operationStorageKey()) || 'null');
            if (!parsed || parsed.version !== OP_STORAGE_VERSION || !Array.isArray(parsed.commands)) return emptyOperationPlan();
            const plan = Object.assign(emptyOperationPlan(), parsed);
            plan.observations = plan.observations && typeof plan.observations === 'object' && !Array.isArray(plan.observations) ? plan.observations : {};
            return plan;
        } catch (_error) {
            return emptyOperationPlan();
        }
    }

    function saveOperationPlan(plan) {
        try {
            window.localStorage.setItem(operationStorageKey(), JSON.stringify(plan));
            return true;
        } catch (error) {
            console.error('[Chong Tribe Script — Conferência da OP] Não foi possível salvar o planejamento.', error);
            return false;
        }
    }

    function parseBrazilianTimestamp(value) {
        const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\D+(\d{1,2}):(\d{2})(?::(\d{2}))?(?::(\d{1,3}))?/);
        if (!match) return null;
        const timestamp = new Date(
            Number(match[3]), Number(match[2]) - 1, Number(match[1]),
            Number(match[4]), Number(match[5]), Number(match[6] || 0), Number(String(match[7] || '0').padEnd(3, '0'))
        ).getTime();
        return Number.isFinite(timestamp) ? timestamp : null;
    }

    function formatOperationTimestamp(timestamp) {
        if (!timestamp) return '—';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }).format(date);
    }

    function parseOperationPlan(text, fileName) {
        const source = String(text || '');
        const impactLine = source.match(/Data e hora do impacto:\[\/b\]\s*([^\r\n]+)/i)?.[1]
            || source.match(/(?:impacto|chegada)[^\r\n]*?(\d{1,2}\/\d{1,2}\/\d{4}[^\r\n]*)/i)?.[1]
            || '';
        const impactTimestamp = parseBrazilianTimestamp(impactLine);
        if (!impactTimestamp) throw new Error('Não encontrei a data e hora do impacto no arquivo da operação.');
        const commands = [];
        source.split(/\r?\n/).forEach(function (line) {
            const sequence = Number(line.match(/^\s*\[\*\*\]\s*(\d+)/)?.[1] || 0);
            const player = cleanText(line.match(/\[player\]([^\]]+)\[\/player\]/i)?.[1]);
            const coordinates = Array.from(line.matchAll(/\[coord\](\d{1,3}\|\d{1,3})\[\/coord\]/gi)).map(function (match) { return match[1]; });
            if (!sequence || !player || coordinates.length < 2) return;
            const morale = cleanText(line.match(/(\d{1,3}%)/)?.[1]);
            const distanceText = line.match(/([\d.,]+)\s*campos?/i)?.[1] || '';
            const distance = Number(distanceText.replace(/\./g, '').replace(',', '.'));
            commands.push({
                sequence: sequence,
                player: player,
                origin: coordinates[0],
                target: coordinates[1],
                morale: morale,
                distance: Number.isFinite(distance) ? distance : null,
            });
        });
        if (!commands.length) throw new Error('Nenhuma linha de jogador, origem e alvo foi reconhecida no TXT.');
        return {
            version: OP_STORAGE_VERSION,
            world: worldId(),
            allyId: allyId(),
            fileName: cleanText(fileName) || 'Operação importada',
            importedAt: Date.now(),
            impactTimestamp: impactTimestamp,
            impactLabel: cleanText(impactLine),
            ramMinutesPerField: null,
            commands: commands.sort(function (a, b) { return a.sequence - b.sequence; }),
            observations: {},
        };
    }

    function parseXmlNumber(text, selector, fallback) {
        try {
            const xml = new DOMParser().parseFromString(String(text || ''), 'application/xml');
            if (xml.querySelector('parsererror')) return fallback;
            const value = Number.parseFloat(xml.querySelector(selector)?.textContent || '');
            return Number.isFinite(value) && value > 0 ? value : fallback;
        } catch (_error) {
            return fallback;
        }
    }

    async function detectRamMinutesPerField() {
        const responses = await Promise.all([
            window.fetch('/interface.php?func=get_config', { credentials: 'same-origin', cache: 'no-store' }),
            window.fetch('/interface.php?func=get_unit_info', { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        if (!responses[0].ok || !responses[1].ok) throw new Error('Não foi possível detectar a velocidade do mundo.');
        const texts = await Promise.all(responses.map(function (response) { return response.text(); }));
        const worldSpeed = parseXmlNumber(texts[0], 'config > speed, speed', 1);
        const unitSpeed = parseXmlNumber(texts[0], 'config > unit_speed, unit_speed', 1);
        const ramBaseMinutes = parseXmlNumber(texts[1], 'ram > speed', 30);
        return ramBaseMinutes / (worldSpeed * unitSpeed);
    }

    async function ensureOperationSpeed(plan) {
        if (Number(plan.ramMinutesPerField) > 0) return plan.ramMinutesPerField;
        try {
            plan.ramMinutesPerField = await detectRamMinutesPerField();
        } catch (_error) {
            plan.ramMinutesPerField = 30;
            operationState.message = 'Não foi possível detectar a velocidade; usando 30 min/campo. Confira e ajuste o campo antes de considerar um prazo perdido.';
            operationState.error = true;
        }
        saveOperationPlan(plan);
        return plan.ramMinutesPerField;
    }

    function automationStorageKey() {
        return ['cts', 'coleta-automatica', worldId(), allyId()].join(':');
    }

    function loadAutomation() {
        try {
            const value = JSON.parse(window.localStorage.getItem(automationStorageKey()) || 'null');
            return value && typeof value === 'object' ? value : { active: false };
        } catch (_error) {
            return { active: false };
        }
    }

    function saveAutomation(value) {
        window.localStorage.setItem(automationStorageKey(), JSON.stringify(value));
    }

    function pauseAutomation(message, isError) {
        const automation = loadAutomation();
        automation.active = false;
        automation.pausedAt = Date.now();
        automation.message = message || 'Coleta automática pausada.';
        saveAutomation(automation);
        centralState.message = automation.message;
        centralState.error = Boolean(isError);
        renderDashboard();
    }

    function pendingEnemyMembers(dashboard) {
        return Object.values(dashboard.directory).filter(function (member) {
            if (member.active === false || !member.tribeId) return false;
            const snapshot = dashboard.snapshots[member.playerId];
            return !snapshot || Date.now() - snapshot.capturedAt > SNAPSHOT_STALE_MS;
        }).sort(function (a, b) {
            const aTime = dashboard.snapshots[a.playerId]?.capturedAt || 0;
            const bTime = dashboard.snapshots[b.playerId]?.capturedAt || 0;
            return aTime - bTime || a.playerName.localeCompare(b.playerName, 'pt-BR');
        });
    }

    function currentProfileId() {
        return cleanText(new URLSearchParams(window.location.search).get('id')) || normalize(state.playerName).replace(/[^a-z0-9]+/g, '-');
    }

    function serializableCommand(command) {
        return {
            id: command.id,
            player: command.player,
            own: Boolean(command.own),
            name: command.name,
            type: command.type,
            kind: command.kind,
            noble: Boolean(command.noble),
            troops: command.troops || {},
            troopStatus: command.troopStatus,
            arrival: command.arrival,
            arrivalTimestamp: command.arrivalTimestamp,
            countdown: command.countdown,
            detailUrl: command.detailUrl || '',
            detailStatus: command.detailStatus || '',
            detailError: command.detailError || '',
            origin: command.origin || '',
            target: command.target || command.villageCoordinate || '',
            departure: command.departure || '',
            villageId: command.villageId,
            villageName: command.villageName,
            villageCoordinate: command.villageCoordinate,
            villageUrl: command.villageUrl,
        };
    }

    function saveCurrentSnapshot() {
        const playerId = currentProfileId();
        const dashboard = loadDashboard();
        const profileUrl = window.location.href;
        const existing = dashboard.directory[playerId] || {};
        dashboard.directory[playerId] = Object.assign({}, existing, {
            playerId: playerId,
            playerName: state.playerName,
            profileUrl: profileUrl,
        });
        dashboard.snapshots[playerId] = {
            playerId: playerId,
            playerName: state.playerName,
            profileUrl: profileUrl,
            tribeId: existing.tribeId || '',
            tribeName: existing.tribeName || '',
            tribeTag: existing.tribeTag || '',
            capturedAt: Date.now(),
            villageCount: state.villages.length,
            villages: state.villages.map(function (village) {
                return { id: village.id, name: village.name, coordinate: village.coordinate, url: village.url };
            }),
            commands: state.commands.map(serializableCommand),
        };
        return saveDashboard(dashboard);
    }

    function captureMemberDirectory() {
        const dashboard = loadDashboard();
        let found = 0;
        document.querySelectorAll('a[href*="screen=info_player"][href*="id="]').forEach(function (anchor) {
            const url = gameUrl(anchor.getAttribute('href'));
            if (!url) return;
            const playerId = cleanText(new URL(url).searchParams.get('id'));
            const playerName = cleanText(anchor.textContent);
            if (!playerId || !playerName) return;
            dashboard.directory[playerId] = { playerId: playerId, playerName: playerName, profileUrl: url };
            found += 1;
        });
        if (found) saveDashboard(dashboard);
        return found;
    }

    function decodeMapField(value) {
        try {
            return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
        } catch (_error) {
            return String(value || '').replace(/\+/g, ' ');
        }
    }

    function parseTribeReference(value) {
        const reference = cleanText(value);
        if (!reference) return { id: '', label: '' };
        if (/^\d+$/.test(reference)) return { id: reference, label: reference };
        try {
            const url = new URL(reference, window.location.origin);
            const id = cleanText(url.searchParams.get('id'));
            if (id && /screen=info_ally/.test(url.search)) return { id: id, label: reference };
        } catch (_error) {
            // O valor pode ser o nome ou a tag da tribo.
        }
        return { id: '', label: reference };
    }

    async function loadAllyMap() {
        const response = await window.fetch(new URL('/map/ally.txt', window.location.origin).toString(), {
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Não foi possível consultar a lista pública de tribos (HTTP ' + response.status + ').');
        const text = await response.text();
        return text.split(/\r?\n/).filter(Boolean).map(function (line) {
            const columns = line.split(',');
            return {
                id: cleanText(columns[0]),
                name: decodeMapField(columns[1]),
                tag: decodeMapField(columns[2]),
            };
        });
    }

    function tribeInfoUrl(tribeId) {
        const url = new URL('/game.php', window.location.origin);
        const currentVillage = cleanText(window.game_data?.village?.id || new URLSearchParams(window.location.search).get('village'));
        if (currentVillage) url.searchParams.set('village', currentVillage);
        url.searchParams.set('screen', 'info_ally');
        url.searchParams.set('id', tribeId);
        return url.toString();
    }

    async function fetchEnemyTribe(tribe) {
        const url = tribeInfoUrl(tribe.id);
        const documentRoot = await fetchDocument(url);
        const pageText = normalize(documentRoot.body?.textContent);
        if (/protecao contra bots|bot protection/.test(pageText)) {
            throw new Error('O Tribal Wars solicitou verificação contra bots. Pare a coleta e conclua a verificação antes de continuar.');
        }
        const members = new Map();
        documentRoot.querySelectorAll('a[href*="screen=info_player"][href*="id="]').forEach(function (anchor) {
            const profileUrl = gameUrl(anchor.getAttribute('href'));
            const playerId = profileUrl ? cleanText(new URL(profileUrl).searchParams.get('id')) : '';
            const playerName = cleanText(anchor.textContent);
            if (playerId && playerName) members.set(playerId, { playerId: playerId, playerName: playerName, profileUrl: profileUrl });
        });
        if (!members.size) throw new Error('Nenhum jogador foi encontrado na página da tribo ' + (tribe.tag || tribe.name || tribe.id) + '.');
        const heading = cleanText(documentRoot.querySelector('#content_value h2, h2')?.textContent);
        return {
            id: tribe.id,
            name: tribe.name || heading || tribe.label || ('Tribo ' + tribe.id),
            tag: tribe.tag || tribe.label || heading || tribe.id,
            profileUrl: url,
            capturedAt: Date.now(),
            memberCount: members.size,
            members: Array.from(members.values()),
        };
    }

    async function trackEnemyTribes() {
        if (centralState.busy) return;
        const references = centralState.tribeInput.split(/\r?\n|;/).map(cleanText).filter(Boolean);
        if (!references.length) {
            centralState.message = 'Informe pelo menos uma tag, nome, ID ou link de tribo inimiga.';
            centralState.error = true;
            renderDashboard();
            return;
        }
        centralState.busy = true;
        centralState.error = false;
        centralState.message = 'Localizando as tribos informadas…';
        renderDashboard();
        try {
            const parsed = references.map(parseTribeReference);
            const needsLookup = parsed.some(function (tribe) { return !tribe.id; });
            const allyMap = needsLookup ? await loadAllyMap() : [];
            const resolved = parsed.map(function (tribe) {
                if (tribe.id) return tribe;
                const wanted = normalize(tribe.label);
                const match = allyMap.find(function (item) {
                    return normalize(item.tag) === wanted || normalize(item.name) === wanted;
                });
                if (!match) throw new Error('Tribo não encontrada: ' + tribe.label + '. Confira a tag/nome ou cole o link do perfil da tribo.');
                return Object.assign({}, match, { label: tribe.label });
            });
            const dashboard = loadDashboard();
            for (let index = 0; index < resolved.length; index += 1) {
                centralState.message = 'Carregando jogadores de ' + (resolved[index].tag || resolved[index].name || resolved[index].id) + '…';
                renderDashboard();
                const tribe = await fetchEnemyTribe(resolved[index]);
                Object.values(dashboard.directory).forEach(function (member) {
                    if (member.tribeId === tribe.id) member.active = false;
                });
                tribe.members.forEach(function (member) {
                    dashboard.directory[member.playerId] = Object.assign({}, dashboard.directory[member.playerId] || {}, member, {
                        tribeId: tribe.id,
                        tribeName: tribe.name,
                        tribeTag: tribe.tag,
                        active: true,
                    });
                    if (dashboard.snapshots[member.playerId]) {
                        dashboard.snapshots[member.playerId].tribeId = tribe.id;
                        dashboard.snapshots[member.playerId].tribeName = tribe.name;
                        dashboard.snapshots[member.playerId].tribeTag = tribe.tag;
                    }
                });
                dashboard.trackedTribes[tribe.id] = {
                    id: tribe.id,
                    name: tribe.name,
                    tag: tribe.tag,
                    profileUrl: tribe.profileUrl,
                    capturedAt: tribe.capturedAt,
                    memberCount: tribe.memberCount,
                };
                if (index + 1 < resolved.length) await requestPause();
            }
            saveDashboard(dashboard);
            centralState.tribeInput = '';
            centralState.message = resolved.length + ' tribo(s) inimiga(s) atualizada(s). Abra os perfis pendentes para coletar os comandos compartilhados.';
        } catch (error) {
            centralState.message = error.message || 'Não foi possível carregar as tribos inimigas.';
            centralState.error = true;
        } finally {
            centralState.busy = false;
            renderDashboard();
        }
    }

    function removeTrackedTribe(tribeId) {
        const dashboard = loadDashboard();
        delete dashboard.trackedTribes[tribeId];
        Object.keys(dashboard.directory).forEach(function (playerId) {
            if (dashboard.directory[playerId].tribeId === tribeId) delete dashboard.directory[playerId];
        });
        Object.keys(dashboard.snapshots).forEach(function (playerId) {
            if (dashboard.snapshots[playerId].tribeId === tribeId) delete dashboard.snapshots[playerId];
        });
        saveDashboard(dashboard);
        renderDashboard();
    }

    function openNextEnemyProfile() {
        const dashboard = loadDashboard();
        const members = pendingEnemyMembers(dashboard);
        if (!members.length) {
            centralState.message = 'Todos os jogadores cadastrados têm uma consulta recente.';
            centralState.error = false;
            renderDashboard();
            return;
        }
        window.open(members[0].profileUrl, '_blank', 'noopener,noreferrer');
    }

    function navigateToNextAutomaticTarget() {
        const automation = loadAutomation();
        if (!automation.active) return;
        const pending = pendingEnemyMembers(loadDashboard());
        if (!pending.length) {
            automation.active = false;
            automation.completedAt = Date.now();
            automation.message = 'Coleta automática concluída: todos os perfis inimigos cadastrados estão atualizados.';
            saveAutomation(automation);
            centralState.message = automation.message;
            centralState.error = false;
            openDashboard();
            return;
        }
        window.location.assign(pending[0].profileUrl);
    }

    function startAutomaticCollection() {
        const pending = pendingEnemyMembers(loadDashboard());
        if (!pending.length) {
            centralState.message = 'Não há perfis inimigos pendentes ou desatualizados para coletar.';
            centralState.error = false;
            renderDashboard();
            return;
        }
        const intervalSeconds = Math.max(AUTO_MIN_INTERVAL_SECONDS, Number(centralState.autoInterval) || AUTO_DEFAULT_INTERVAL_SECONDS);
        const automation = {
            active: true,
            startedAt: Date.now(),
            intervalSeconds: intervalSeconds,
            processed: 0,
            totalAtStart: pending.length,
            message: 'Coleta automática iniciada.',
        };
        saveAutomation(automation);
        centralState.message = 'Coleta automática iniciada. Navegando para o primeiro perfil inimigo…';
        centralState.error = false;
        renderDashboard();
        window.setTimeout(navigateToNextAutomaticTarget, 500);
    }

    function scheduleAutomaticContinuation() {
        const automation = loadAutomation();
        if (!automation.active) return;
        automation.processed = (Number(automation.processed) || 0) + 1;
        automation.lastPlayerId = currentProfileId();
        automation.lastProfileAt = Date.now();
        saveAutomation(automation);
        const pending = pendingEnemyMembers(loadDashboard());
        if (!pending.length) {
            navigateToNextAutomaticTarget();
            return;
        }
        const baseSeconds = Math.max(AUTO_MIN_INTERVAL_SECONDS, Number(automation.intervalSeconds) || AUTO_DEFAULT_INTERVAL_SECONDS);
        const delaySeconds = baseSeconds + Math.floor(Math.random() * 6);
        setStatus(
            'Coleta automática ativa — próximo perfil em ' + delaySeconds + ' segundos.',
            formatNumber(pending.length) + ' perfil(is) pendente(s) · clique em “Central da tribo” para pausar',
            100,
            false
        );
        window.setTimeout(navigateToNextAutomaticTarget, delaySeconds * 1000);
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

    function extractCoordinates(value) {
        return Array.from(new Set(String(value || '').match(/\b\d{1,3}\|\d{1,3}\b/g) || []));
    }

    function readLabeledValue(root, labels) {
        const wanted = labels.map(normalize);
        for (const row of Array.from(root.querySelectorAll('tr'))) {
            const cells = Array.from(row.cells || []);
            if (cells.length < 2) continue;
            const label = normalize(cells[0].textContent).replace(/:$/, '');
            if (wanted.some(function (entry) { return label === entry || label.startsWith(entry + ' '); })) {
                return cleanText(cells.slice(1).map(function (cell) { return cell.textContent; }).join(' '));
            }
        }
        return '';
    }

    function readLabeledCoordinate(root, labels) {
        return extractCoordinates(readLabeledValue(root, labels))[0] || '';
    }

    function detailVillages(root) {
        const origin = readLabeledCoordinate(root, ['Origem', 'Aldeia de origem', 'Partida', 'Source']);
        const target = readLabeledCoordinate(root, ['Destino', 'Aldeia alvo', 'Target']);
        const linked = [];
        root.querySelectorAll('a[href*="screen=info_village"]').forEach(function (anchor) {
            extractCoordinates(anchor.textContent).forEach(function (coordinate) {
                if (!linked.includes(coordinate)) linked.push(coordinate);
            });
        });
        return { origin: origin || linked[0] || '', target: target || linked[1] || '' };
    }

    async function enrichAttackDetail(command) {
        if (!command.detailUrl) {
            command.detailStatus = 'unavailable';
            return command;
        }
        try {
            const detail = await fetchDocument(command.detailUrl);
            const villages = detailVillages(detail);
            command.origin = command.origin || villages.origin;
            command.target = command.target || villages.target || command.villageCoordinate;
            command.departure = readLabeledValue(detail, ['Partida', 'Enviado', 'Departure']) || command.departure || '';
            command.arrival = readLabeledValue(detail, ['Chegada', 'Arrival']) || command.arrival;
            command.detailStatus = command.origin ? 'available' : 'unavailable';
        } catch (error) {
            command.detailStatus = 'error';
            command.detailError = error.message || 'Falha ao consultar detalhes';
            if (error.code === 'BOT_PROTECTION') throw error;
        }
        return command;
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
                    origin: '',
                    target: village.coordinate,
                    departure: '',
                    detailStatus: '',
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
        const documentRoot = new DOMParser().parseFromString(html, 'text/html');
        if (/protecao contra bots|bot protection/.test(normalize(documentRoot.body?.textContent))) {
            const error = new Error('Proteção contra bots detectada. A coleta automática foi pausada.');
            error.code = 'BOT_PROTECTION';
            throw error;
        }
        return documentRoot;
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

    function addCentralStyles() {
        if (document.getElementById(CENTRAL_ID + '-style')) return;
        const style = document.createElement('style');
        style.id = CENTRAL_ID + '-style';
        style.textContent = `
            #${SCRIPT_ID} .cts-head-actions{display:flex;align-items:center;gap:8px}
            #${SCRIPT_ID} .cts-head-actions .cts-btn{height:38px}
            #${CENTRAL_ID}-overlay{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,9,17,.78);backdrop-filter:blur(4px);box-sizing:border-box}
            #${CENTRAL_ID}{--bg:#0d1524;--panel:#162136;--panel2:#1c2941;--line:#354761;--text:#f5f7fb;--muted:#9fb0c8;--accent:#16c6a3;position:relative;width:min(1320px,98vw);height:min(880px,95vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid #425876;border-radius:18px;background:linear-gradient(145deg,#111b2d,#0a111e);color:var(--text);box-shadow:0 32px 100px rgba(0,0,0,.65);font-family:Arial,Helvetica,sans-serif;font-size:13px}
            #${CENTRAL_ID} *{box-sizing:border-box}
            #${CENTRAL_ID} button,#${CENTRAL_ID} input,#${CENTRAL_ID} select{font:inherit}
            #${CENTRAL_ID} .ctc-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,rgba(22,198,163,.15),transparent 55%)}
            #${CENTRAL_ID} .ctc-brand{display:flex;align-items:center;gap:12px;min-width:0}
            #${CENTRAL_ID} .ctc-logo{width:46px;height:46px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#16c6a3,#087c73);color:#062d29;font-weight:900}
            #${CENTRAL_ID} h2{margin:0 0 3px;font-size:23px;color:#fff;line-height:1.15}
            #${CENTRAL_ID} .ctc-subtitle{color:var(--muted);font-size:11px}
            #${CENTRAL_ID} .ctc-head-actions{display:flex;gap:8px;align-items:center}
            #${CENTRAL_ID} .ctc-close{width:38px;height:38px;border:1px solid var(--line);border-radius:10px;background:#111827;color:#d6dfec;cursor:pointer;font-size:22px}
            #${CENTRAL_ID} .ctc-btn{height:36px;padding:0 12px;border:1px solid #40536f;border-radius:8px;background:#263852;color:#fff;cursor:pointer;white-space:nowrap}
            #${CENTRAL_ID} .ctc-btn:hover{filter:brightness(1.15)}
            #${CENTRAL_ID} .ctc-btn.primary{background:#0f8f7c;border-color:#16c6a3}
            #${CENTRAL_ID} .ctc-body{flex:1;min-height:0;overflow:auto;padding:15px 20px 20px}
            #${CENTRAL_ID} .ctc-notice{margin-bottom:12px;padding:10px 12px;border:1px solid rgba(22,198,163,.38);border-radius:10px;background:rgba(22,198,163,.09);color:#bff7ea;line-height:1.45}
            #${CENTRAL_ID} .ctc-notice.error{border-color:rgba(240,82,82,.55);background:rgba(240,82,82,.10);color:#ffb5b5}
            #${CENTRAL_ID} .ctc-config{display:grid;grid-template-columns:minmax(280px,1fr) auto;gap:9px;margin-bottom:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(145deg,#17243a,#111a2a)}
            #${CENTRAL_ID} .ctc-config label{display:block;margin-bottom:6px;color:#fff;font-weight:800}
            #${CENTRAL_ID} .ctc-config textarea{width:100%;min-height:62px;resize:vertical;border:1px solid #3b4e69;border-radius:8px;background:#0d1626;color:#edf2fa;padding:9px 10px;outline:none;font:inherit}
            #${CENTRAL_ID} .ctc-config-actions{display:flex;flex-direction:column;justify-content:flex-end;gap:7px}
            #${CENTRAL_ID} .ctc-auto-interval{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px}
            #${CENTRAL_ID} .ctc-auto-interval input{width:72px;height:31px;border:1px solid #3b4e69;border-radius:7px;background:#0d1626;color:#fff;padding:0 7px}
            #${CENTRAL_ID} .ctc-tribes{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:7px}
            #${CENTRAL_ID} .ctc-tribe{display:inline-flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid #40536f;border-radius:99px;background:#101a2a;color:#dce7f5}
            #${CENTRAL_ID} .ctc-tribe button{width:21px;height:21px;border:0;border-radius:50%;background:#2d3d57;color:#ffb1b1;cursor:pointer;line-height:1}
            #${CENTRAL_ID} .ctc-stats{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:9px;margin-bottom:12px}
            #${CENTRAL_ID} .ctc-stat{padding:12px;border:1px solid var(--line);border-radius:11px;background:linear-gradient(145deg,var(--panel2),#121b2b)}
            #${CENTRAL_ID} .ctc-stat strong{display:block;font-size:21px;color:#fff;line-height:1.1;margin-bottom:4px}
            #${CENTRAL_ID} .ctc-stat span{color:var(--muted);font-size:10px}
            #${CENTRAL_ID} .ctc-force{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px}
            #${CENTRAL_ID} .ctc-force-card{position:relative;overflow:hidden;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#111a2a}
            #${CENTRAL_ID} .ctc-force-card:before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:var(--color)}
            #${CENTRAL_ID} .ctc-force-card strong{font-size:21px;margin-right:7px}
            #${CENTRAL_ID} .ctc-force-card span{color:#d6e0ef;font-weight:700}
            #${CENTRAL_ID} .ctc-toolbar{display:grid;grid-template-columns:minmax(190px,1.5fr) repeat(3,minmax(145px,.75fr)) auto;gap:8px;margin-bottom:12px}
            #${CENTRAL_ID} .ctc-input,#${CENTRAL_ID} .ctc-select{width:100%;height:38px;border:1px solid #3b4e69;border-radius:8px;background:#0f1727;color:#edf2fa;padding:0 10px;outline:none}
            #${CENTRAL_ID} .ctc-section{margin-top:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
            #${CENTRAL_ID} .ctc-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(90deg,#202e47,#172236)}
            #${CENTRAL_ID} .ctc-section-title{font-size:15px;font-weight:800;color:#fff}
            #${CENTRAL_ID} .ctc-section-note{margin-top:3px;color:var(--muted);font-size:10px}
            #${CENTRAL_ID} .ctc-scroll{overflow:auto;max-height:285px}
            #${CENTRAL_ID} table{width:100%;border-collapse:collapse;font-size:11px}
            #${CENTRAL_ID} th,#${CENTRAL_ID} td{padding:9px 10px;border-top:1px solid #2c3c55;text-align:left;white-space:nowrap}
            #${CENTRAL_ID} th{position:sticky;top:0;z-index:1;background:#121c2d;color:#8fa1ba;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
            #${CENTRAL_ID} tbody tr:hover{background:#1c2a41}
            #${CENTRAL_ID} a{color:#65e5ce;text-decoration:none}
            #${CENTRAL_ID} .ctc-type{display:inline-flex;align-items:center;gap:5px}
            #${CENTRAL_ID} .ctc-type img{width:16px;height:16px}
            #${CENTRAL_ID} .ctc-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
            #${CENTRAL_ID} .ctc-fresh{color:#64e6c5;font-weight:700}
            #${CENTRAL_ID} .ctc-stale{color:#ffb36b;font-weight:700}
            #${CENTRAL_ID} .ctc-empty{padding:32px;text-align:center;color:var(--muted)}
            #${CENTRAL_ID} .ctc-coverage{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:7px;padding:11px}
            #${CENTRAL_ID} .ctc-member{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border:1px solid #33445f;border-radius:8px;background:#111a2a}
            #${CENTRAL_ID} .ctc-member small{display:block;color:var(--muted);margin-top:3px}
            #${CENTRAL_ID} .ctc-main-tabs{display:flex;gap:7px;margin-bottom:12px;padding:5px;border:1px solid var(--line);border-radius:11px;background:#0b1321}
            #${CENTRAL_ID} .ctc-main-tabs button{flex:1;height:39px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);font-weight:800;cursor:pointer}
            #${CENTRAL_ID} .ctc-main-tabs button.active{border-color:#257c73;background:#105e57;color:#fff}
            #${CENTRAL_ID} .ctc-op-import{display:grid;grid-template-columns:minmax(280px,1fr) auto auto;gap:9px;align-items:end;margin-bottom:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(145deg,#17243a,#111a2a)}
            #${CENTRAL_ID} .ctc-op-import label{display:grid;gap:5px;color:#fff;font-weight:800}
            #${CENTRAL_ID} .ctc-op-import input[type=file],#${CENTRAL_ID} .ctc-op-import input[type=number]{width:100%;min-height:36px;border:1px solid #3b4e69;border-radius:8px;background:#0d1626;color:#edf2fa;padding:7px 9px}
            #${CENTRAL_ID} .ctc-op-grid{display:grid;grid-template-columns:repeat(6,minmax(115px,1fr));gap:8px;margin-bottom:12px}
            #${CENTRAL_ID} .ctc-op-stat{padding:11px;border:1px solid var(--line);border-radius:10px;background:#111a2a}
            #${CENTRAL_ID} .ctc-op-stat strong{display:block;font-size:20px;color:#fff}#${CENTRAL_ID} .ctc-op-stat span{color:var(--muted);font-size:10px}
            #${CENTRAL_ID} .ctc-op-player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:7px;padding:10px}
            #${CENTRAL_ID} .ctc-op-player{padding:9px;border:1px solid #33445f;border-radius:8px;background:#111a2a}
            #${CENTRAL_ID} .ctc-op-player strong{display:block;color:#fff}#${CENTRAL_ID} .ctc-op-player span{display:block;margin-top:4px;color:var(--muted);font-size:10px}
            #${CENTRAL_ID} .ctc-op-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,.55fr) auto;gap:8px;margin-bottom:12px}
            #${CENTRAL_ID} .ctc-op-status{display:inline-flex;align-items:center;padding:4px 7px;border-radius:99px;font-weight:800;font-size:10px}
            #${CENTRAL_ID} .ctc-op-ok{background:#174b3d;color:#79f3cf}#${CENTRAL_ID} .ctc-op-detected{background:#38446a;color:#c8d7ff}#${CENTRAL_ID} .ctc-op-pending{background:#554317;color:#ffe29a}#${CENTRAL_ID} .ctc-op-late{background:#5d2027;color:#ffb0b8}#${CENTRAL_ID} .ctc-op-review{background:#57351c;color:#ffc48c}
            #${CENTRAL_ID} .ctc-op-row-late{background:rgba(240,82,82,.08)}
            #${CENTRAL_ID} .ctc-op-row-pending{background:rgba(238,183,64,.06)}
            @media(max-width:920px){#${CENTRAL_ID} .ctc-stats{grid-template-columns:repeat(2,1fr)}#${CENTRAL_ID} .ctc-toolbar{grid-template-columns:1fr 1fr}#${CENTRAL_ID} .ctc-force{grid-template-columns:1fr}#${CENTRAL_ID} .ctc-config{grid-template-columns:1fr}#${CENTRAL_ID} .ctc-config-actions{flex-direction:row}#${CENTRAL_ID} .ctc-head-actions .ctc-btn{display:none}#${CENTRAL_ID} .ctc-op-grid{grid-template-columns:repeat(3,1fr)}#${CENTRAL_ID} .ctc-op-import{grid-template-columns:1fr 180px}#${CENTRAL_ID} .ctc-op-import>div{grid-column:1/-1}#${CENTRAL_ID} .ctc-op-toolbar{grid-template-columns:1fr 180px}}
            @media(max-width:560px){#${CENTRAL_ID}-overlay{padding:0}#${CENTRAL_ID}{width:100vw;height:100vh;border-radius:0}#${CENTRAL_ID} .ctc-body,#${CENTRAL_ID} .ctc-head{padding-left:11px;padding-right:11px}#${CENTRAL_ID} .ctc-toolbar,#${CENTRAL_ID} .ctc-op-import,#${CENTRAL_ID} .ctc-op-toolbar{grid-template-columns:1fr}#${CENTRAL_ID} .ctc-op-grid{grid-template-columns:repeat(2,1fr)}#${SCRIPT_ID} .cts-head-actions .cts-btn{display:none}}
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
                    <div class="cts-head-actions">
                        <button class="cts-btn" data-action="dashboard">Central da tribo</button>
                        <button class="cts-close" data-action="close" title="Fechar">×</button>
                    </div>
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
                            <button class="cts-btn" data-action="load-supports" style="display:none">Carregar tropas</button>
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
            } else if (button.dataset.action === 'load-supports') {
                loadSupportDetails();
            } else if (button.dataset.action === 'dashboard') {
                openDashboard();
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
                updateSupportLoadButton();
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

    function updateSupportLoadButton() {
        const button = document.querySelector('#' + SCRIPT_ID + ' [data-action="load-supports"]');
        if (!button) return;
        button.style.display = state.mode === 'support' ? '' : 'none';
        button.disabled = state.supportDetailsLoading || state.supportDetailsLoaded;
        button.textContent = state.supportDetailsLoading
            ? 'Carregando…'
            : state.supportDetailsLoaded
                ? 'Tropas carregadas'
                : 'Carregar tropas';
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

    function formatAge(timestamp) {
        const elapsed = Math.max(0, Date.now() - (Number(timestamp) || 0));
        if (elapsed < 60 * 1000) return 'agora';
        if (elapsed < 60 * 60 * 1000) return Math.floor(elapsed / (60 * 1000)) + ' min atrás';
        if (elapsed < 24 * 60 * 60 * 1000) return Math.floor(elapsed / (60 * 60 * 1000)) + ' h atrás';
        return Math.floor(elapsed / (24 * 60 * 60 * 1000)) + ' dia(s) atrás';
    }

    function dashboardCommands(dashboard) {
        const commands = [];
        Object.values(dashboard.snapshots).forEach(function (snapshot) {
            (snapshot.commands || []).forEach(function (command) {
                if (command.kind !== 'attack') return;
                commands.push(Object.assign({}, command, {
                    targetPlayerId: snapshot.playerId,
                    targetPlayerName: snapshot.playerName,
                    targetProfileUrl: snapshot.profileUrl,
                    targetTribeId: snapshot.tribeId || '',
                    targetTribeName: snapshot.tribeName || '',
                    targetTribeTag: snapshot.tribeTag || '',
                    capturedAt: snapshot.capturedAt,
                }));
            });
        });
        return commands;
    }

    function filteredDashboardCommands(dashboard) {
        const query = normalize(centralState.search);
        return dashboardCommands(dashboard).filter(function (command) {
            if (centralState.attacker !== 'all' && command.player !== centralState.attacker) return false;
            if (centralState.victim !== 'all' && command.targetPlayerId !== centralState.victim) return false;
            if (centralState.type === 'noble' && !command.noble) return false;
            if (centralState.type !== 'all' && centralState.type !== 'noble' && command.type !== centralState.type) return false;
            if (!query) return true;
            return normalize([
                command.player,
                command.targetPlayerName,
                command.villageName,
                command.villageCoordinate,
                command.name,
            ].join(' ')).includes(query);
        });
    }

    function uniqueSorted(values) {
        return Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
            return a.localeCompare(b, 'pt-BR');
        });
    }

    function centralTypeLabel(command) {
        return TYPE_LABELS[command.type] + (command.noble ? ' + nobre' : '');
    }

    function centralTabsHtml() {
        return `<div class="ctc-main-tabs">
            <button type="button" data-central-view="dashboard" class="${centralState.view === 'dashboard' ? 'active' : ''}">Central de ataques</button>
            <button type="button" data-central-view="operation" class="${centralState.view === 'operation' ? 'active' : ''}">Conferência da OP</button>
        </div>`;
    }

    function commandArrivalTimestamp(command) {
        return Number(command.arrivalTimestamp) || parseBrazilianTimestamp(command.arrival) || null;
    }

    function commandMatchesOperation(command, expected, impactTimestamp, requireArrival) {
        const target = command.target || command.villageCoordinate || '';
        if (normalize(command.player) !== normalize(expected.player) || target !== expected.target) return false;
        const arrival = commandArrivalTimestamp(command);
        if (!requireArrival || !arrival) return true;
        return Math.abs(arrival - impactTimestamp) <= OP_ARRIVAL_TOLERANCE_MS;
    }

    function operationActualCommands(plan, dashboard) {
        const observations = plan.observations || {};
        const observedTargets = new Set(Object.keys(observations));
        const commands = dashboardCommands(dashboard).filter(function (command) {
            return !observedTargets.has(command.target || command.villageCoordinate || '');
        });
        Object.values(observations).forEach(function (observation) {
            (observation.commands || []).forEach(function (command) {
                commands.push(Object.assign({}, command, {
                    target: command.target || observation.target,
                    villageCoordinate: command.villageCoordinate || observation.target,
                    capturedAt: observation.capturedAt,
                    operationObservation: true,
                }));
            });
        });
        return commands;
    }

    function targetCoverage(plan, dashboard, target) {
        const observation = plan.observations?.[target];
        if (observation?.capturedAt) return observation;
        const snapshots = Object.values(dashboard.snapshots).filter(function (snapshot) {
            const villages = Array.isArray(snapshot.villages) ? snapshot.villages : [];
            if (villages.some(function (village) { return village.coordinate === target; })) return true;
            return (snapshot.commands || []).some(function (command) {
                return (command.target || command.villageCoordinate) === target;
            });
        }).sort(function (a, b) { return Number(b.capturedAt || 0) - Number(a.capturedAt || 0); });
        return snapshots[0] || null;
    }

    function operationDeadline(expected, plan) {
        const minutes = Number(plan.ramMinutesPerField);
        if (!plan.impactTimestamp || !Number.isFinite(expected.distance) || !(minutes > 0)) return null;
        return plan.impactTimestamp - expected.distance * minutes * 60 * 1000;
    }

    function evaluateOperation(plan, dashboard) {
        const actual = operationActualCommands(plan, dashboard);
        const used = new Set();
        const rows = plan.commands.map(function (expected) {
            return {
                expected: expected,
                deadline: operationDeadline(expected, plan),
                coverage: targetCoverage(plan, dashboard, expected.target),
                actual: null,
                status: '',
            };
        });

        function candidates(row, mode) {
            return actual.map(function (command, index) { return { command: command, index: index }; }).filter(function (entry) {
                if (used.has(entry.index) || !commandMatchesOperation(entry.command, row.expected, plan.impactTimestamp, mode !== 'wrong-time')) return false;
                const origin = entry.command.origin || '';
                if (mode === 'exact') return origin && origin === row.expected.origin;
                if (mode === 'unknown') return !origin;
                if (mode === 'different') return origin && origin !== row.expected.origin;
                if (mode === 'wrong-time') {
                    const arrival = commandArrivalTimestamp(entry.command);
                    return arrival && Math.abs(arrival - plan.impactTimestamp) > OP_ARRIVAL_TOLERANCE_MS;
                }
                return false;
            }).sort(function (a, b) {
                const aArrival = commandArrivalTimestamp(a.command) || Number.MAX_SAFE_INTEGER;
                const bArrival = commandArrivalTimestamp(b.command) || Number.MAX_SAFE_INTEGER;
                return Math.abs(aArrival - plan.impactTimestamp) - Math.abs(bArrival - plan.impactTimestamp);
            });
        }

        ['exact', 'unknown', 'different'].forEach(function (mode) {
            rows.forEach(function (row) {
                if (row.actual) return;
                const match = candidates(row, mode)[0];
                if (!match) return;
                used.add(match.index);
                row.actual = match.command;
                row.status = mode;
            });
        });

        rows.forEach(function (row) {
            if (row.actual) return;
            const wrongTime = candidates(row, 'wrong-time')[0];
            if (wrongTime) {
                used.add(wrongTime.index);
                row.actual = wrongTime.command;
                row.status = 'wrong-time';
                return;
            }
            const deadlinePassed = row.deadline && Date.now() > row.deadline;
            if (!row.coverage) row.status = 'unverified';
            else if (deadlinePassed && Number(row.coverage.capturedAt || 0) < row.deadline) row.status = 'rescan';
            else if (deadlinePassed) row.status = 'late';
            else row.status = 'pending';
        });
        return rows;
    }

    function operationStatusInfo(status) {
        const values = {
            exact: ['Confirmado', 'ctc-op-ok'],
            unknown: ['Detectado · origem não visível', 'ctc-op-detected'],
            different: ['Enviado de outra origem', 'ctc-op-review'],
            'wrong-time': ['Horário divergente', 'ctc-op-review'],
            pending: ['Ainda pode sair', 'ctc-op-pending'],
            late: ['Prazo de saída passou', 'ctc-op-late'],
            rescan: ['Reconsultar o alvo', 'ctc-op-review'],
            unverified: ['Alvo ainda não consultado', 'ctc-op-review'],
        };
        return values[status] || [status, 'ctc-op-review'];
    }

    function operationStatusGroup(status) {
        if (['exact', 'unknown'].includes(status)) return 'sent';
        if (status === 'pending') return 'pending';
        if (status === 'late') return 'late';
        return 'review';
    }

    function operationPlayerSummary(rows) {
        const grouped = new Map();
        rows.forEach(function (row) {
            const key = normalize(row.expected.player);
            if (!grouped.has(key)) grouped.set(key, { name: row.expected.player, total: 0, sent: 0, late: 0, pending: 0, review: 0 });
            const item = grouped.get(key);
            item.total += 1;
            item[operationStatusGroup(row.status)] += 1;
        });
        return Array.from(grouped.values()).sort(function (a, b) {
            return b.late - a.late || b.review - a.review || a.name.localeCompare(b.name, 'pt-BR');
        });
    }

    function operationRowsHtml(rows) {
        return rows.map(function (row) {
            const info = operationStatusInfo(row.status);
            const actualOrigin = row.actual?.origin || (row.actual ? 'Não compartilhada' : '—');
            const actualArrival = row.actual ? (row.actual.arrival || formatOperationTimestamp(commandArrivalTimestamp(row.actual))) : '—';
            const collected = row.coverage?.capturedAt ? formatOperationTimestamp(row.coverage.capturedAt) : '—';
            const rowClass = row.status === 'late' ? 'ctc-op-row-late' : row.status === 'pending' ? 'ctc-op-row-pending' : '';
            return `<tr class="${rowClass}">
                <td><span class="ctc-op-status ${info[1]}">${escapeHtml(info[0])}</span></td>
                <td>${formatNumber(row.expected.sequence)}</td>
                <td><strong>${escapeHtml(row.expected.player)}</strong></td>
                <td>${escapeHtml(row.expected.origin)}</td>
                <td><strong>${escapeHtml(row.expected.target)}</strong></td>
                <td>${escapeHtml(formatOperationTimestamp(row.deadline))}</td>
                <td>${escapeHtml(actualOrigin)}</td>
                <td>${escapeHtml(actualArrival)}</td>
                <td>${escapeHtml(collected)}</td>
            </tr>`;
        }).join('');
    }

    function renderOperationDashboard(root, dashboard) {
        const plan = loadOperationPlan();
        if (!plan.commands.length) {
            root.querySelector('.ctc-body').innerHTML = centralTabsHtml() + `
                <section class="ctc-op-import">
                    <label>Arquivo TXT gerado pelo Montador de Fulls<input type="file" accept=".txt,text/plain" data-op-file></label>
                </section>
                <div class="ctc-notice">Importe o planejamento completo da operação. O painel cruzará jogador, origem, alvo e horário com os comandos compartilhados coletados nos perfis inimigos.</div>
                <div class="ctc-empty">Nenhuma operação importada neste mundo.</div>`;
            bindOperationDashboard(root);
            return;
        }

        const evaluations = evaluateOperation(plan, dashboard);
        const players = operationPlayerSummary(evaluations);
        const totals = { sent: 0, pending: 0, late: 0, review: 0 };
        evaluations.forEach(function (row) { totals[operationStatusGroup(row.status)] += 1; });
        const query = normalize(operationState.search);
        const visible = evaluations.filter(function (row) {
            const group = operationStatusGroup(row.status);
            if (operationState.status !== 'all' && operationState.status !== group) return false;
            if (!query) return true;
            return normalize([row.expected.player, row.expected.origin, row.expected.target, operationStatusInfo(row.status)[0]].join(' ')).includes(query);
        });
        const playerCards = players.map(function (player) {
            return `<div class="ctc-op-player"><strong>${escapeHtml(player.name)}</strong><span>${formatNumber(player.sent)} confirmado(s) · ${formatNumber(player.pending)} pendente(s) · ${formatNumber(player.late)} prazo perdido · ${formatNumber(player.review)} revisar</span><span>Total esperado: ${formatNumber(player.total)}</span></div>`;
        }).join('');
        root.querySelector('.ctc-body').innerHTML = centralTabsHtml() + `
            <section class="ctc-op-import">
                <label>Substituir TXT da operação<input type="file" accept=".txt,text/plain" data-op-file></label>
                <label>Velocidade do aríete<input type="number" min="0.01" step="0.01" value="${escapeHtml(plan.ramMinutesPerField || 30)}" data-op-speed></label>
                <div><button class="ctc-btn primary" data-central-action="op-scan"${operationState.busy ? ' disabled' : ''}>${operationState.busy ? 'Conferindo…' : 'Conferir alvos agora'}</button> <button class="ctc-btn" data-central-action="op-enrich"${operationState.busy ? ' disabled' : ''}>Conferir origens</button> <button class="ctc-btn" data-central-action="op-clear"${operationState.busy ? ' disabled' : ''}>Remover OP</button></div>
            </section>
            <div class="ctc-notice${operationState.error ? ' error' : ''}">${escapeHtml(operationState.message || `${plan.fileName} · impacto ${formatOperationTimestamp(plan.impactTimestamp)} · ${formatNumber(plan.commands.length)} comando(s) esperados. A tolerância do horário de chegada é de 5 minutos.`)}</div>
            <div class="ctc-notice">“Conferir alvos agora” consulta diretamente cada aldeia de destino e atualiza quem enviou ou não. Depois, “Conferir origens” tenta confirmar de qual aldeia saiu cada comando quando esse detalhe estiver compartilhado pelo jogo.</div>
            <div class="ctc-op-grid">
                <div class="ctc-op-stat"><strong>${formatNumber(plan.commands.length)}</strong><span>Comandos esperados</span></div>
                <div class="ctc-op-stat"><strong>${formatNumber(totals.sent)}</strong><span>Enviados/detectados</span></div>
                <div class="ctc-op-stat"><strong>${formatNumber(totals.pending)}</strong><span>Ainda podem sair</span></div>
                <div class="ctc-op-stat"><strong>${formatNumber(totals.late)}</strong><span>Prazo perdido</span></div>
                <div class="ctc-op-stat"><strong>${formatNumber(totals.review)}</strong><span>Precisam revisão</span></div>
                <div class="ctc-op-stat"><strong>${formatNumber(players.length)}</strong><span>Jogadores da OP</span></div>
            </div>
            <section class="ctc-section">
                <div class="ctc-section-head"><div><div class="ctc-section-title">Conferência por jogador</div><div class="ctc-section-note">Enviados, pendentes, prazo perdido e alvos que ainda precisam ser consultados</div></div></div>
                <div class="ctc-op-player-grid">${playerCards}</div>
            </section>
            <div class="ctc-op-toolbar">
                <input class="ctc-input" data-op-search type="search" value="${escapeHtml(operationState.search)}" placeholder="Buscar jogador, origem, alvo ou status…">
                <select class="ctc-select" data-op-status>
                    <option value="all"${operationState.status === 'all' ? ' selected' : ''}>Todos os status</option>
                    <option value="sent"${operationState.status === 'sent' ? ' selected' : ''}>Enviados/detectados</option>
                    <option value="pending"${operationState.status === 'pending' ? ' selected' : ''}>Ainda podem sair</option>
                    <option value="late"${operationState.status === 'late' ? ' selected' : ''}>Prazo perdido</option>
                    <option value="review"${operationState.status === 'review' ? ' selected' : ''}>Precisam revisão</option>
                </select>
                <button class="ctc-btn" data-central-action="op-export">Exportar conferência</button>
            </div>
            <section class="ctc-section">
                <div class="ctc-section-head"><div><div class="ctc-section-title">Comandos da operação</div><div class="ctc-section-note">“Prazo de saída passou” só aparece quando o perfil do alvo foi consultado depois do limite e o comando não foi encontrado.</div></div><span>${formatNumber(visible.length)} de ${formatNumber(evaluations.length)}</span></div>
                <div class="ctc-scroll" style="max-height:430px"><table><thead><tr><th>Status</th><th>#</th><th>Jogador</th><th>Origem prevista</th><th>Alvo</th><th>Saída limite</th><th>Origem encontrada</th><th>Chegada encontrada</th><th>Alvo consultado em</th></tr></thead><tbody>${operationRowsHtml(visible)}</tbody></table></div>
            </section>`;
        bindOperationDashboard(root);
    }

    function bindOperationDashboard(root) {
        const fileInput = root.querySelector('[data-op-file]');
        if (fileInput) fileInput.addEventListener('change', async function (event) {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                operationState.message = 'Lendo o arquivo da operação…';
                operationState.error = false;
                const plan = parseOperationPlan(await file.text(), file.name);
                await ensureOperationSpeed(plan);
                saveOperationPlan(plan);
                operationState.message = `${formatNumber(plan.commands.length)} comando(s) importado(s) de ${file.name}.`;
                operationState.error = false;
            } catch (error) {
                operationState.message = error.message || 'Não foi possível importar a operação.';
                operationState.error = true;
            }
            renderDashboard();
        });
        root.querySelector('[data-op-speed]')?.addEventListener('change', function (event) {
            const plan = loadOperationPlan();
            plan.ramMinutesPerField = Math.max(0.01, Number(event.target.value) || 30);
            saveOperationPlan(plan);
            operationState.message = `Velocidade ajustada para ${plan.ramMinutesPerField.toLocaleString('pt-BR')} min/campo.`;
            operationState.error = false;
            renderDashboard();
        });
        root.querySelector('[data-op-search]')?.addEventListener('input', function (event) {
            operationState.search = event.target.value;
            renderDashboard();
            const replacement = document.querySelector('#' + CENTRAL_ID + ' [data-op-search]');
            replacement?.focus();
            replacement?.setSelectionRange(replacement.value.length, replacement.value.length);
        });
        root.querySelector('[data-op-status]')?.addEventListener('change', function (event) {
            operationState.status = event.target.value;
            renderDashboard();
        });
    }

    async function loadOperationTargetMap(targets) {
        const response = await window.fetch(new URL('/map/village.txt', window.location.origin).toString(), {
            credentials: 'same-origin',
            cache: 'no-store',
        });
        if (!response.ok) throw new Error('Não foi possível localizar as aldeias-alvo no mapa (HTTP ' + response.status + ').');
        const wanted = new Set(targets);
        const found = {};
        (await response.text()).split(/\r?\n/).forEach(function (line) {
            if (!line) return;
            const columns = line.split(',');
            const coordinate = cleanText(columns[2]) + '|' + cleanText(columns[3]);
            if (!wanted.has(coordinate)) return;
            found[coordinate] = {
                id: cleanText(columns[0]),
                target: coordinate,
                ownerId: cleanText(columns[4]),
            };
        });
        return found;
    }

    function operationVillageUrl(villageId) {
        const url = new URL('/game.php', window.location.origin);
        const currentVillage = cleanText(window.game_data?.village?.id || new URLSearchParams(window.location.search).get('village'));
        if (currentVillage) url.searchParams.set('village', currentVillage);
        url.searchParams.set('screen', 'info_village');
        url.searchParams.set('id', villageId);
        return url.toString();
    }

    async function scanOperationTargets() {
        if (operationState.busy) return;
        const plan = loadOperationPlan();
        const targets = uniqueSorted(plan.commands.map(function (command) { return command.target; }));
        if (!targets.length) {
            operationState.message = 'Importe primeiro o TXT da operação.';
            operationState.error = true;
            renderDashboard();
            return;
        }
        operationState.busy = true;
        operationState.error = false;
        let completed = 0;
        let failures = 0;
        let cursor = 0;
        let processed = 0;
        let fatalError = null;
        let lastRenderedAt = 0;
        try {
            operationState.message = 'Localizando ' + formatNumber(targets.length) + ' aldeia(s)-alvo no mapa…';
            renderDashboard();
            const targetMap = await loadOperationTargetMap(targets);
            async function worker() {
                while (!fatalError) {
                    const index = cursor;
                    cursor += 1;
                    if (index >= targets.length) return;
                    const target = targets[index];
                    const village = targetMap[target];
                    const now = Date.now();
                    if (index === 0 || now - lastRenderedAt > 650) {
                        operationState.message = 'Conferência rápida: ' + formatNumber(processed) + ' de ' + formatNumber(targets.length) + ' alvo(s) concluído(s) · consultando ' + target + '…';
                        lastRenderedAt = now;
                        renderDashboard();
                    }
                    if (!village?.id) {
                        failures += 1;
                        processed += 1;
                        continue;
                    }
                    try {
                        const url = operationVillageUrl(village.id);
                        const parsed = parseVillageDocument(await fetchDocument(url), url);
                        plan.observations[target] = {
                            target: target,
                            villageId: village.id,
                            ownerId: village.ownerId,
                            capturedAt: Date.now(),
                            commands: parsed.commands.filter(function (command) { return command.kind === 'attack'; }).map(serializableCommand),
                        };
                        completed += 1;
                    } catch (error) {
                        failures += 1;
                        if (error.code === 'BOT_PROTECTION') {
                            fatalError = error;
                            return;
                        }
                        console.error('[Chong Tribe Script — Conferência da OP]', target, error);
                    }
                    processed += 1;
                    if (processed % 12 === 0) saveOperationPlan(plan);
                    if (cursor < targets.length && !fatalError) {
                        await sleep(OP_SCAN_DELAY_MS + Math.floor(Math.random() * OP_SCAN_JITTER_MS));
                    }
                }
            }
            await Promise.all(Array.from({ length: Math.min(OP_SCAN_CONCURRENCY, targets.length) }, worker));
            if (fatalError) throw fatalError;
            operationState.message = formatNumber(completed) + ' alvo(s) consultado(s) agora' + (failures ? ' · ' + formatNumber(failures) + ' falha(s). Refaça a conferência para tentar novamente.' : '. O painel foi recalculado com a coleta nova.');
            operationState.error = failures > 0;
        } catch (error) {
            operationState.message = error.message || 'A conferência automática foi interrompida.';
            operationState.error = true;
        } finally {
            operationState.busy = false;
            saveOperationPlan(plan);
            renderDashboard();
        }
    }

    async function enrichOperationDetails() {
        if (operationState.busy) return;
        const plan = loadOperationPlan();
        const dashboard = loadDashboard();
        const expectedKeys = new Set(plan.commands.map(function (item) { return normalize(item.player) + '\u0000' + item.target; }));
        const pending = [];
        Object.values(dashboard.snapshots).forEach(function (snapshot) {
            (snapshot.commands || []).forEach(function (command) {
                const target = command.target || command.villageCoordinate || '';
                if (plan.observations?.[target]) return;
                const key = normalize(command.player) + '\u0000' + target;
                if (command.kind === 'attack' && expectedKeys.has(key) && command.detailUrl && !command.origin) pending.push(command);
            });
        });
        Object.values(plan.observations || {}).forEach(function (observation) {
            (observation.commands || []).forEach(function (command) {
                const key = normalize(command.player) + '\u0000' + (command.target || command.villageCoordinate || observation.target || '');
                if (command.kind === 'attack' && expectedKeys.has(key) && command.detailUrl && !command.origin) pending.push(command);
            });
        });
        if (!pending.length) {
            operationState.message = 'Não há detalhes pendentes. Origens não visíveis dependem do compartilhamento permitido pelo jogo.';
            operationState.error = false;
            renderDashboard();
            return;
        }
        operationState.busy = true;
        operationState.error = false;
        let completed = 0;
        try {
            for (const command of pending) {
                operationState.message = `Conferindo origem ${formatNumber(completed + 1)} de ${formatNumber(pending.length)}…`;
                renderDashboard();
                await enrichAttackDetail(command);
                completed += 1;
                saveDashboard(dashboard);
                saveOperationPlan(plan);
                if (completed < pending.length) await requestPause();
            }
            operationState.message = `${formatNumber(completed)} detalhe(s) conferido(s).`;
        } catch (error) {
            operationState.message = error.message || 'A conferência de detalhes foi interrompida.';
            operationState.error = true;
        } finally {
            operationState.busy = false;
            saveDashboard(dashboard);
            saveOperationPlan(plan);
            renderDashboard();
        }
    }

    function exportOperationConference() {
        const plan = loadOperationPlan();
        if (!plan.commands.length) return;
        const rows = [['Status', '#', 'Jogador', 'Origem prevista', 'Alvo', 'Saída limite', 'Impacto', 'Origem encontrada', 'Chegada encontrada', 'Perfil consultado em']]
            .concat(evaluateOperation(plan, loadDashboard()).map(function (row) {
                return [
                    operationStatusInfo(row.status)[0], row.expected.sequence, row.expected.player, row.expected.origin, row.expected.target,
                    formatOperationTimestamp(row.deadline), formatOperationTimestamp(plan.impactTimestamp), row.actual?.origin || '',
                    row.actual?.arrival || formatOperationTimestamp(commandArrivalTimestamp(row.actual || {})),
                    formatOperationTimestamp(row.coverage?.capturedAt),
                ];
            }));
        const csv = '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(';'); }).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'conferencia-op-' + worldId() + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }

    function renderDashboard() {
        const root = document.getElementById(CENTRAL_ID);
        if (!root) return;
        const dashboard = loadDashboard();
        if (centralState.view === 'operation') {
            renderOperationDashboard(root, dashboard);
            return;
        }
        const automation = loadAutomation();
        if (automation.active && automation.intervalSeconds) centralState.autoInterval = automation.intervalSeconds;
        const allCommands = dashboardCommands(dashboard);
        const commands = filteredDashboardCommands(dashboard);
        const snapshots = Object.values(dashboard.snapshots);
        const directory = Object.values(dashboard.directory).filter(function (member) { return member.active !== false; });
        const trackedTribes = Object.values(dashboard.trackedTribes).sort(function (a, b) {
            return (a.tag || a.name).localeCompare(b.tag || b.name, 'pt-BR');
        });
        const attackers = uniqueSorted(allCommands.map(function (command) { return command.player; }));
        const targets = directory.slice().sort(function (a, b) { return a.playerName.localeCompare(b.playerName, 'pt-BR'); });
        const attackedTargets = new Set(commands.map(function (command) { return command.targetPlayerId; })).size;
        const attackingPlayers = new Set(commands.map(function (command) { return command.player; })).size;
        const nextTimestamp = soonestTimestamp(commands);
        const nextArrival = nextTimestamp === Number.MAX_SAFE_INTEGER ? '—' : formatArrivalTimestamp(nextTimestamp);
        const scannedTargets = directory.filter(function (member) { return Boolean(dashboard.snapshots[member.playerId]); }).length;
        const scanCoverage = directory.length ? Math.round((scannedTargets / directory.length) * 100) : 0;
        const pendingCount = pendingEnemyMembers(dashboard).length;

        const attackerOptions = attackers.map(function (name) {
            return `<option value="${escapeHtml(name)}"${centralState.attacker === name ? ' selected' : ''}>${escapeHtml(name)}</option>`;
        }).join('');
        const targetOptions = targets.map(function (member) {
            return `<option value="${escapeHtml(member.playerId)}"${centralState.victim === member.playerId ? ' selected' : ''}>${escapeHtml(member.playerName)}</option>`;
        }).join('');
        const tribeBadges = trackedTribes.map(function (tribe) {
            return `<span class="ctc-tribe"><a href="${escapeHtml(tribe.profileUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(tribe.tag || tribe.name)}</strong></a><span>${formatNumber(tribe.memberCount)} jogador(es)</span><button data-central-action="remove-tribe" data-tribe-id="${escapeHtml(tribe.id)}" title="Remover tribo">×</button></span>`;
        }).join('');

        const byAttacker = Array.from(groupCommands(commands, function (command) { return command.player; }))
            .sort(function (a, b) { return b[1].length - a[1].length || a[0].localeCompare(b[0], 'pt-BR'); });
        const attackerRows = byAttacker.map(function (entry) {
            const playerCommands = entry[1];
            const targetPlayers = new Set(playerCommands.map(function (command) { return command.targetPlayerId; })).size;
            const targetVillages = new Set(playerCommands.map(function (command) { return command.targetPlayerId + ':' + (command.villageId || command.villageCoordinate); })).size;
            const closest = soonestTimestamp(playerCommands);
            return `<tr>
                <td><strong>${escapeHtml(entry[0])}</strong></td>
                <td><span class="ctc-dot" style="background:#ef4444"></span>${formatNumber(countByType(playerCommands, 'large'))}</td>
                <td><span class="ctc-dot" style="background:#a66b3f"></span>${formatNumber(countByType(playerCommands, 'medium'))}</td>
                <td><span class="ctc-dot" style="background:#39b86b"></span>${formatNumber(countByType(playerCommands, 'small'))}</td>
                <td>${formatNumber(countByType(playerCommands, 'noble'))}</td>
                <td>${formatNumber(targetPlayers)}</td><td>${formatNumber(targetVillages)}</td>
                <td>${closest === Number.MAX_SAFE_INTEGER ? '—' : escapeHtml(formatArrivalTimestamp(closest))}</td>
                <td><strong>${formatNumber(playerCommands.length)}</strong></td>
            </tr>`;
        }).join('');

        const movementRows = commands.slice().sort(function (a, b) {
            return (a.arrivalTimestamp || Number.MAX_SAFE_INTEGER) - (b.arrivalTimestamp || Number.MAX_SAFE_INTEGER);
        }).map(function (command) {
            const stale = Date.now() - command.capturedAt > SNAPSHOT_STALE_MS;
            return `<tr>
                <td><strong>${escapeHtml(command.player)}</strong>${command.own ? ' <span class="ctc-fresh">Você</span>' : ''}</td>
                <td><span class="ctc-type"><img src="${TYPE_ICONS[command.type]}" alt="">${escapeHtml(centralTypeLabel(command))}</span></td>
                <td>${escapeHtml(command.targetTribeTag || command.targetTribeName || 'Não cadastrada')}</td>
                <td><a href="${escapeHtml(command.targetProfileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(command.targetPlayerName)}</a></td>
                <td><a href="${escapeHtml(command.villageUrl || command.targetProfileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(command.villageCoordinate || command.villageName)}</a></td>
                <td>${escapeHtml(command.arrival || 'Horário não disponível')}</td>
                <td class="${stale ? 'ctc-stale' : 'ctc-fresh'}">${escapeHtml(formatAge(command.capturedAt))}</td>
            </tr>`;
        }).join('');

        const coverageRows = directory.sort(function (a, b) {
            return (a.tribeTag || '').localeCompare(b.tribeTag || '', 'pt-BR') || a.playerName.localeCompare(b.playerName, 'pt-BR');
        }).map(function (member) {
            const snapshot = dashboard.snapshots[member.playerId];
            const stale = snapshot && Date.now() - snapshot.capturedAt > SNAPSHOT_STALE_MS;
            const label = snapshot ? (stale ? 'Desatualizado · ' : 'Atualizado · ') + formatAge(snapshot.capturedAt) : 'Ainda não consultado';
            return `<div class="ctc-member"><div><a href="${escapeHtml(member.profileUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(member.playerName)}</strong></a><small>${escapeHtml(member.tribeTag || member.tribeName || 'Alvo avulso')}</small><small class="${snapshot ? (stale ? 'ctc-stale' : 'ctc-fresh') : ''}">${escapeHtml(label)}</small></div><span>${snapshot ? formatNumber((snapshot.commands || []).filter(function (command) { return command.kind === 'attack'; }).length) : '—'}</span></div>`;
        }).join('');

        root.querySelector('.ctc-body').innerHTML = centralTabsHtml() + `
            <section class="ctc-config">
                <div><label>Tribos inimigas monitoradas</label><textarea data-central-tribes placeholder="Informe tag, nome, ID ou link da tribo — uma por linha">${escapeHtml(centralState.tribeInput)}</textarea></div>
                <div class="ctc-config-actions">
                    <button class="ctc-btn primary" data-central-action="track-tribes"${centralState.busy || automation.active ? ' disabled' : ''}>${centralState.busy ? 'Carregando…' : 'Carregar jogadores'}</button>
                    <button class="ctc-btn" data-central-action="next-target"${pendingCount && !automation.active ? '' : ' disabled'}>Abrir próximo perfil</button>
                    <label class="ctc-auto-interval">Intervalo entre perfis <input data-central-auto-interval type="number" min="${AUTO_MIN_INTERVAL_SECONDS}" step="5" value="${escapeHtml(centralState.autoInterval)}"${automation.active ? ' disabled' : ''}> segundos</label>
                    ${automation.active ? '<button class="ctc-btn" data-central-action="pause-auto">Pausar coleta automática</button>' : `<button class="ctc-btn primary" data-central-action="start-auto"${pendingCount ? '' : ' disabled'}>Iniciar coleta automática</button>`}
                </div>
                ${tribeBadges ? `<div class="ctc-tribes">${tribeBadges}</div>` : ''}
            </section>
            <div class="ctc-notice${centralState.error ? ' error' : ''}">${escapeHtml(centralState.message || (automation.active ? 'Coleta automática ativa. Mantenha esta aba aberta; o script navegará entre os perfis respeitando o intervalo configurado.' : 'Cadastre somente as tribos inimigas desejadas. Pelo Tampermonkey, a coleta automática pode percorrer os perfis pendentes; dados com mais de 12 horas aparecem como desatualizados.'))}</div>
            <div class="ctc-stats">
                <div class="ctc-stat"><strong>${formatNumber(trackedTribes.length)}</strong><span>Tribos inimigas</span></div>
                <div class="ctc-stat"><strong>${formatNumber(directory.length)}</strong><span>Inimigos mapeados</span></div>
                <div class="ctc-stat"><strong>${formatNumber(scannedTargets)}</strong><span>Perfis consultados</span></div>
                <div class="ctc-stat"><strong>${formatNumber(attackedTargets)}</strong><span>Inimigos com ataques</span></div>
                <div class="ctc-stat"><strong>${formatNumber(attackingPlayers)}</strong><span>Membros nossos atacando</span></div>
                <div class="ctc-stat"><strong style="font-size:${nextArrival === '—' ? '21px' : '14px'}">${escapeHtml(nextArrival)}</strong><span>Próxima chegada</span></div>
            </div>
            <div class="ctc-force">
                <div class="ctc-force-card" style="--color:#ef4444"><strong>${formatNumber(countByType(commands, 'large'))}</strong><span>Machados vermelhos</span></div>
                <div class="ctc-force-card" style="--color:#a66b3f"><strong>${formatNumber(countByType(commands, 'medium'))}</strong><span>Machados marrons</span></div>
                <div class="ctc-force-card" style="--color:#39b86b"><strong>${formatNumber(countByType(commands, 'small'))}</strong><span>Machados verdes</span></div>
            </div>
            <div class="ctc-toolbar">
                <input class="ctc-input" data-central-filter="search" type="search" value="${escapeHtml(centralState.search)}" placeholder="Buscar membro atacante, inimigo ou coordenada…">
                <select class="ctc-select" data-central-filter="attacker"><option value="all">Todos os membros atacantes</option>${attackerOptions}</select>
                <select class="ctc-select" data-central-filter="victim"><option value="all">Todos os inimigos</option>${targetOptions}</select>
                <select class="ctc-select" data-central-filter="type">
                    <option value="all"${centralState.type === 'all' ? ' selected' : ''}>Todos os tipos</option>
                    <option value="noble"${centralState.type === 'noble' ? ' selected' : ''}>Possíveis nobres</option>
                    <option value="large"${centralState.type === 'large' ? ' selected' : ''}>Machados vermelhos</option>
                    <option value="medium"${centralState.type === 'medium' ? ' selected' : ''}>Machados marrons</option>
                    <option value="small"${centralState.type === 'small' ? ' selected' : ''}>Machados verdes</option>
                </select>
                <button class="ctc-btn" data-central-action="export"${commands.length ? '' : ' disabled'}>Exportar CSV</button>
            </div>
            <section class="ctc-section">
                <div class="ctc-section-head"><div><div class="ctc-section-title">Membros da sua tribo atacando</div><div class="ctc-section-note">Os nomes vêm dos comandos compartilhados encontrados nos perfis inimigos</div></div><span>${formatNumber(byAttacker.length)} jogador(es)</span></div>
                ${attackerRows ? `<div class="ctc-scroll"><table><thead><tr><th>Membro atacante</th><th>Vermelhos</th><th>Marrons</th><th>Verdes</th><th>Nobres</th><th>Inimigos</th><th>Aldeias-alvo</th><th>Próxima chegada</th><th>Total</th></tr></thead><tbody>${attackerRows}</tbody></table></div>` : '<div class="ctc-empty">Nenhum ataque compartilhado foi encontrado nos perfis inimigos consultados.</div>'}
            </section>
            <section class="ctc-section">
                <div class="ctc-section-head"><div><div class="ctc-section-title">Ataques compartilhados consolidados</div><div class="ctc-section-note">Membro atacante, tribo inimiga, alvo e horário</div></div><span>${formatNumber(commands.length)} comando(s)</span></div>
                ${movementRows ? `<div class="ctc-scroll"><table><thead><tr><th>Membro atacante</th><th>Tipo</th><th>Tribo inimiga</th><th>Jogador inimigo</th><th>Aldeia-alvo</th><th>Chegada</th><th>Coletado</th></tr></thead><tbody>${movementRows}</tbody></table></div>` : '<div class="ctc-empty">Nenhuma movimentação disponível.</div>'}
            </section>
            <section class="ctc-section">
                <div class="ctc-section-head"><div><div class="ctc-section-title">Cobertura dos perfis inimigos</div><div class="ctc-section-note">Clique em “Abrir próximo perfil”; o userscript coleta somente aquele jogador</div></div><span>${directory.length ? scanCoverage + '%' : 'Nenhuma tribo cadastrada'}</span></div>
                ${coverageRows ? `<div class="ctc-coverage">${coverageRows}</div>` : '<div class="ctc-empty">Cadastre uma ou mais tribos inimigas acima para montar a fila de consulta.</div>'}
            </section>
        `;

        const tribeInput = root.querySelector('[data-central-tribes]');
        if (tribeInput) tribeInput.addEventListener('input', function (event) { centralState.tribeInput = event.target.value; });
        const intervalInput = root.querySelector('[data-central-auto-interval]');
        if (intervalInput) intervalInput.addEventListener('change', function (event) {
            centralState.autoInterval = Math.max(AUTO_MIN_INTERVAL_SECONDS, Number(event.target.value) || AUTO_DEFAULT_INTERVAL_SECONDS);
            event.target.value = centralState.autoInterval;
        });

        root.querySelectorAll('[data-central-filter]').forEach(function (element) {
            const eventName = element.tagName === 'INPUT' ? 'input' : 'change';
            element.addEventListener(eventName, function (event) {
                centralState[event.target.dataset.centralFilter] = event.target.value;
                renderDashboard();
                const replacement = document.querySelector('#' + CENTRAL_ID + ' [data-central-filter="' + event.target.dataset.centralFilter + '"]');
                if (eventName === 'input' && replacement) {
                    replacement.focus();
                    replacement.setSelectionRange(replacement.value.length, replacement.value.length);
                }
            });
        });
    }

    function exportDashboardCsv() {
        const dashboard = loadDashboard();
        const rows = [['Membro atacante', 'Tribo inimiga', 'Jogador inimigo', 'Aldeia-alvo', 'Coordenada', 'Tipo', 'Possível nobre', 'Chegada', 'Coletado em']]
            .concat(filteredDashboardCommands(dashboard).map(function (command) {
                return [command.player, command.targetTribeTag || command.targetTribeName, command.targetPlayerName, command.villageName, command.villageCoordinate, TYPE_LABELS[command.type], command.noble ? 'Sim' : 'Não', command.arrival, formatArrivalTimestamp(command.capturedAt)];
            }));
        const csv = '\uFEFF' + rows.map(function (row) { return row.map(csvCell).join(';'); }).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'central-ataques-' + worldId() + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }

    function openDashboard() {
        addCentralStyles();
        document.getElementById(CENTRAL_ID + '-overlay')?.remove();
        const dashboard = loadDashboard();
        const overlay = document.createElement('div');
        overlay.id = CENTRAL_ID + '-overlay';
        overlay.innerHTML = `
            <section id="${CENTRAL_ID}" role="dialog" aria-modal="true" aria-label="Central de comandos da tribo">
                <header class="ctc-head">
                    <div class="ctc-brand"><div class="ctc-logo">CTS</div><div><h2>Central de ataques compartilhados</h2><div class="ctc-subtitle">${escapeHtml(worldId().toUpperCase())} · nossa tribo atacando os inimigos monitorados · dados salvos neste navegador${dashboard.updatedAt ? ' · última alteração ' + escapeHtml(formatAge(dashboard.updatedAt)) : ''}</div></div></div>
                    <div class="ctc-head-actions"><button class="ctc-btn primary" data-central-action="refresh">Atualizar painel</button><button class="ctc-close" data-central-action="close" title="Fechar">×</button></div>
                </header>
                <main class="ctc-body"></main>
            </section>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (event) {
            const button = event.target.closest('[data-central-action],[data-central-view]');
            if (!button) return;
            if (button.dataset.centralView) {
                centralState.view = button.dataset.centralView;
                renderDashboard();
                return;
            }
            if (button.dataset.centralAction === 'close') overlay.remove();
            if (button.dataset.centralAction === 'refresh') renderDashboard();
            if (button.dataset.centralAction === 'export') exportDashboardCsv();
            if (button.dataset.centralAction === 'op-export') exportOperationConference();
            if (button.dataset.centralAction === 'op-scan') scanOperationTargets();
            if (button.dataset.centralAction === 'op-enrich') enrichOperationDetails();
            if (button.dataset.centralAction === 'op-clear') {
                if (window.confirm('Remover o TXT e a conferência desta operação? Os comandos coletados continuarão salvos.')) {
                    window.localStorage.removeItem(operationStorageKey());
                    operationState.message = '';
                    operationState.error = false;
                    renderDashboard();
                }
            }
            if (button.dataset.centralAction === 'track-tribes') trackEnemyTribes();
            if (button.dataset.centralAction === 'next-target') openNextEnemyProfile();
            if (button.dataset.centralAction === 'start-auto') startAutomaticCollection();
            if (button.dataset.centralAction === 'pause-auto') pauseAutomation('Coleta automática pausada pelo usuário.', false);
            if (button.dataset.centralAction === 'remove-tribe') {
                const tribeId = cleanText(button.dataset.tribeId);
                if (tribeId && window.confirm('Remover esta tribo inimiga e os dados coletados de seus jogadores da Central?')) removeTrackedTribe(tribeId);
            }
        });
        renderDashboard();
    }

    async function loadSupportDetails() {
        if (state.running || state.supportDetailsLoading || state.supportDetailsLoaded) return;
        const supports = state.commands.filter(function (command) {
            return command.kind === 'support' && command.troopStatus === 'pending';
        });
        if (!supports.length) {
            state.supportDetailsLoaded = true;
            updateSupportLoadButton();
            renderResults();
            return;
        }
        state.running = true;
        state.supportDetailsLoading = true;
        state.cancelled = false;
        updateSupportLoadButton();
        for (let index = 0; index < supports.length && !state.cancelled; index += 1) {
            await enrichSupport(supports[index]);
            const processed = index + 1;
            setStatus(
                'Carregando tropas dos apoios com intervalo seguro…',
                processed + ' de ' + supports.length,
                Math.round((processed / supports.length) * 100),
                false
            );
            renderResults();
            if (processed < supports.length) await requestPause();
        }
        state.running = false;
        state.supportDetailsLoading = false;
        state.supportDetailsLoaded = !state.cancelled;
        if (!state.cancelled) saveCurrentSnapshot();
        updateSupportLoadButton();
        if (document.getElementById(SCRIPT_ID)) {
            const visible = supports.filter(function (command) { return command.troopStatus === 'available'; }).length;
            setStatus(
                state.cancelled ? 'Leitura de tropas interrompida.' : 'Tropas dos apoios carregadas.',
                formatNumber(visible) + ' de ' + formatNumber(supports.length) + ' comando(s) com quantidades visíveis',
                100,
                false
            );
            renderResults();
        }
    }

    async function loadData() {
        if (state.running) return;
        state.running = true;
        state.cancelled = false;
        state.processed = 0;
        state.failures = 0;
        state.supportDetailsLoaded = false;
        state.supportDetailsLoading = false;
        state.villages = [];
        state.commands = [];
        renderResults();

        await expandVillageList();
        const links = collectVillageLinks();
        if (!links.length) {
            state.running = false;
            saveCurrentSnapshot();
            setStatus('Nenhuma aldeia com movimentações visíveis foi encontrada.', 'Verifique o compartilhamento dos comandos.', 100, true);
            scheduleAutomaticContinuation();
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
                    if (error.code === 'BOT_PROTECTION') {
                        state.cancelled = true;
                        pauseAutomation(error.message, true);
                        return;
                    }
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
                if (state.processed < links.length) await requestPause();
            }
        }

        await Promise.all(Array.from({ length: Math.min(REQUEST_CONCURRENCY, links.length) }, worker));
        if (!state.cancelled && state.failures === links.length) {
            state.running = false;
            const message = 'Todas as consultas deste perfil falharam. O perfil não foi marcado como atualizado.';
            setStatus(message, 'Confira sua conexão ou se o Tribal Wars solicitou alguma verificação.', 100, true);
            if (loadAutomation().active) pauseAutomation(message + ' A coleta automática foi pausada.', true);
            return;
        }
        const supports = state.commands.filter(function (command) { return command.kind === 'support'; });
        state.running = false;
        if (!state.cancelled) saveCurrentSnapshot();
        updateSupportLoadButton();
        if (!document.getElementById(SCRIPT_ID)) return;
        renderResults();
        if (state.cancelled) {
            setStatus('Leitura interrompida.', 'Os dados já obtidos foram mantidos.', 100, false);
        } else {
            setStatus(
                formatNumber(state.commands.filter(function (command) { return command.kind === 'attack'; }).length) + ' ataque(s) · ' + formatNumber(supports.length) + ' apoio(s).',
                formatNumber(state.villages.length) + ' aldeia(s) analisada(s)' + (supports.some(function (command) { return command.troopStatus === 'pending'; }) ? ' · tropas sob demanda' : '') + (state.failures ? ' · ' + state.failures + ' falha(s)' : ''),
                100,
                state.commands.length === 0
            );
            scheduleAutomaticContinuation();
        }
    }

    function init() {
        const screen = String(window.game_data?.screen || new URLSearchParams(window.location.search).get('screen') || '');
        if (/protecao contra bots|bot protection/.test(normalize(document.body?.textContent)) && loadAutomation().active) {
            addStyles();
            addCentralStyles();
            pauseAutomation('Proteção contra bots detectada. A coleta automática foi pausada; conclua a verificação antes de continuar.', true);
            openDashboard();
            return;
        }
        if (screen !== 'info_player') return;
        addStyles();
        addCentralStyles();
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

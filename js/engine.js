window.STARUP_ENGINE = (() => {
  const CFG = window.STARUP_CONFIG;
  const AUD = window.STARUP_AUDIO;
  const AVA = window.STARUP_AVATARS;
  const FIN = window.STARUP_FINANCE;
  const MKT = window.STARUP_MARKETING;
  const EMP = window.STARUP_EMPIRE;
  const QST = window.STARUP_QUESTS;
  const PRS = window.STARUP_PRESTIGE;
  const GAME_VERSION = '9.25.1';

  // Custom hand-crafted glossy emerald checkmark SVG harmonized with Starup's cream/wood palette
  const TICK_SVG = `<span class="starup-tick"><svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12.5" fill="#059669" stroke="#FFFDF9" stroke-width="2.2"/><path d="M4.2 12.2A10.2 10.2 0 0 1 23.8 12.2A10.2 7 0 0 0 4.2 12.2Z" fill="#34D399" opacity="0.55"/><path d="M8.5 14.3L12.3 18.1L19.8 10.4" stroke="#FFFDF9" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

  let state = null;
  let agents = [];
  let waitingClients = []; // Up to 3 concurrent clients at Reception!
  let rafId = null;
  let lastTs = 0;
  let hudAccum = 0;
  let activeModalTab = 'loan';
  let activeReportTab = 'pending';
  let activeEmpireTab = 'products';
  let activeTrophyTab = 'quests';
  let activeSettingsTab = 'general';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  let banterCooldown = 5.5;
  let toastTimer = null;
  let saveDotTimer = null;
  let lastOverlaySig = '';
  let lastDrawerMoney = null;
  let moneyDisplayMode = 'auto'; // 'auto' | 'exact' | 'compact'
  let autoSaveAccum = 0;
  let clientGraceTimer = 0;
  let lastPlaySpeed = 1;

  const CLIENT_SLOTS = [
    { node: 'reception', x: 48, y: 54 },
    { node: 'recLeft',   x: 41, y: 57 },
    { node: 'recRight',  x: 54, y: 59 }
  ];

  function createFreshState(ceoName, companyName, ceoAvatar, existingPrestige = null) {
    const rooms = {};
    CFG.ROOMS.forEach(r => {
      rooms[r.id] = {
        unlocked: r.unlockedDefault,
        staff: r.unlockedDefault ? 1 : 0,
        equipLv: 1,
        speedLv: 1,
        hasManager: false,
        job: null
      };
    });
    return {
      ceoName: ceoName || 'Minh Founder',
      companyName: companyName || 'Nova Tech',
      ceoAvatar: ceoAvatar || 'ceo',
      day: 1,
      minutes: 474,
      speed: 1,
      money: 500,
      stars: 5,
      morale: 85,
      brandAwareness: 8,
      marketingCampaign: null,
      activeEventTag: '',
      disabledRoomId: null,
      sickStaffRoomId: null,
      clientRateDebuff: 1,
      peakNetWorth: 500,
      contractsDone: 0,
      debtDays: 0,
      tutorialStep: 1,
      dayRevenue: 0,
      dayPenalty: 0,
      dailyCompletedJobs: [],
      eventTriggeredToday: false,
      pendingEvent: null,
      relaxedMode: false,
      dayAcceptedCount: 0,
      dayExpiredCount: 0,
      roomSickLastDay: {},
      roomStats: {},
      lastPowerOutageDay: -10,
      lastStaffSickDay: -10,
      lastMacroWaveDay: -10,
      lastTaxAuditDay: -10,
      lastIndustryBoomDay: -10,
      lastPartnerPromoDay: -10,
      lastSickRoomId: '',
      lastEventKind: '',
      isBankrupt: false,
      overtimeActive: false,
      happyHourLeft: 0,
      happyHourCooldown: 0,
      dailyClosed: false,
      lastStockHour: 8,
      ipoDone: false,
      ticker: '',
      branchIdx: 0,
      maxBranchIdx: 0,
      activeMapIdx: 0,
      dailyQuests: QST.generateDailyQuests(1),
      rooms,
      loan: null,
      investorEquity: 0,
      fundingTaken: [],
      products: {},
      acquiredRivals: [],
      savings: { flex: 0, fixed: 0, fixedDaysLeft: 0 },
      stocks: CFG.STOCKS_INIT.map(s => ({ ...s, history: [...s.history], shares: 0, avgCost: 0, prevPrice: s.price })),
      prestige: PRS ? PRS.normalizePrestige(existingPrestige) : { points: 0, totalEarned: 0, salesCount: 0, unlockedTier: 0, perks: {}, chosenRooms: [], activePerks: {}, hallOfFame: [] },
      newsHint: 'Ngày 1 khởi nghiệp: Chạm vào Khách ở Sảnh Lễ Tân để chốt hợp đồng đầu tiên!',
      newsList: [{ day: 1, text: 'Ngày 1 khởi nghiệp: Chạm vào Khách ở Sảnh Lễ Tân để chốt hợp đồng đầu tiên!' }],
      unreadNews: false
    };
  }

  function applyStartingPrestigePerks(st) {
    if (!st || !PRS) return;
    const p = PRS.ensurePrestige(st);
    const cashLv = PRS.getActiveLevel(st, 'start_cash');
    if (cashLv > 0) {
      st.money = 5000 + (cashLv - 1) * 4000;
      st.peakNetWorth = st.money;
    }
    const roomLv = PRS.getActiveLevel(st, 'unlock_room');
    if (roomLv > 0 && Array.isArray(p.chosenRooms)) {
      p.chosenRooms.slice(0, roomLv).forEach(rid => {
        if (st.rooms[rid] && !st.rooms[rid].unlocked) {
          st.rooms[rid].unlocked = true;
          st.rooms[rid].staff = 1;
        }
      });
    }
    const starLv = PRS.getActiveLevel(st, 'room_stars');
    if (starLv > 0) {
      const unlockedCount = Object.values(st.rooms).filter(r => r && r.unlocked).length;
      st.stars += unlockedCount * starLv;
    }
    const moraleLv = PRS.getActiveLevel(st, 'morale_sick');
    if (moraleLv > 0) {
      st.morale = Math.min(100, st.morale + 8 * moraleLv);
    }
  }

  // ==================== SAVE / LOAD / ULTRA-COMPACT RECOVERY CODE (STARUP2) ====================
  function packCompactState(st) {
    const rm = {};
    CFG.ROOMS.forEach(rc => {
      const r = st.rooms[rc.id];
      if (!r) return;
      // [unlocked, staff, equipLv, speedLv, hasManager]
      rm[rc.id] = [r.unlocked ? 1 : 0, r.staff || 0, r.equipLv || 1, r.speedLv || 1, r.hasManager ? 1 : 0];
    });
    const sk = (st.stocks || []).map(x => [x.symbol, Math.round(x.price), x.shares || 0, Math.round((x.avgCost || 0) * 10) / 10, x.isOwn ? 1 : 0]);
    return {
      v: 2,
      c: [st.ceoName, st.companyName, st.ceoAvatar],
      g: [
        st.day, Math.round(st.minutes), (st.speed !== undefined ? st.speed : 1), Math.round(st.money), st.stars,
        st.morale, st.brandAwareness || 0, Math.round(st.peakNetWorth || st.money),
        st.contractsDone || 0, st.debtDays || 0, st.tutorialStep || 0, Math.round(st.dayRevenue || 0),
        st.ipoDone ? 1 : 0, st.ticker || '', st.branchIdx || 0, st.maxBranchIdx || 0, st.activeMapIdx || 0,
        st.investorEquity || 0, st.overtimeActive ? 1 : 0, Math.round(st.happyHourLeft || 0),
        Math.round(st.happyHourCooldown || 0), st.dailyClosed ? 1 : 0, st.lastPowerOutageDay || -10,
        st.lastEventKind || '', st.lastStaffSickDay !== undefined ? st.lastStaffSickDay : -10,
        st.lastMacroWaveDay !== undefined ? st.lastMacroWaveDay : -10, st.lastSickRoomId || '',
        st.eventTriggeredToday ? 1 : 0, st.sickStaffRoomId || '', st.disabledRoomId || '',
        st.clientRateDebuff !== undefined ? st.clientRateDebuff : 1, st.activeEventTag || '',
        st.lastTaxAuditDay !== undefined ? st.lastTaxAuditDay : -10,
        st.lastIndustryBoomDay !== undefined ? st.lastIndustryBoomDay : -10,
        st.lastPartnerPromoDay !== undefined ? st.lastPartnerPromoDay : -10,
        st.relaxedMode ? 1 : 0, st.dayAcceptedCount || 0, st.dayExpiredCount || 0
      ],
      r: rm,
      l: st.loan ? [st.loan.name, st.loan.dailyPay, st.loan.daysLeft] : 0,
      sv: [Math.round(st.savings.flex || 0), Math.round(st.savings.fixed || 0), st.savings.fixedDaysLeft || 0],
      st: sk,
      f: st.fundingTaken || [],
      p: st.products || {},
      rv: st.acquiredRivals || [],
      mk: st.marketingCampaign ? [st.marketingCampaign.id, st.marketingCampaign.daysLeft] : 0,
      jb: (() => {
        const map = {};
        CFG.ROOMS.forEach(rc => {
          const r = st.rooms[rc.id];
          if (r && r.job) {
            const j = r.job;
            const tierCode = j.tier === 'rush' ? 1 : (j.tier === 'mega' ? 2 : 0);
            const issueCode = j.issue === 'coffee' ? 1 : (j.issue === 'server' ? 2 : 0);
            map[rc.id] = [
              j.title, Math.round(j.reward || 0), tierCode, j.stars || 2, j.isVIP ? 1 : 0,
              Math.round(j.penalty || 0), Math.min(100, Math.round(j.progress || 0)),
              Math.round((j.duration || 10) * 10) / 10, issueCode, j.issueChecked ? 1 : 0,
              j.ready ? 1 : 0, Math.round(j.acceptedAtMin || 0)
            ];
          }
        });
        return Object.keys(map).length ? map : 0;
      })(),
      dn: (st.dailyCompletedJobs && st.dailyCompletedJobs.length)
        ? st.dailyCompletedJobs.slice(0, 8).map(x => [x.title, x.roomName, x.roomIcon, Math.round(x.reward || 0), x.stars || 2, x.time || ''])
        : 0,
      wc: (() => {
        const src = (st === state && waitingClients && waitingClients.length)
          ? waitingClients
          : (Array.isArray(st.savedWaitingClients) ? st.savedWaitingClients : []);
        const list = src.filter(c => c && (c.patience || 0) > 0).slice(0, 3).map(c => [
          c.slotIdx || 0, c.roomId, c.title, Math.round(c.reward || 0),
          Math.round((c.duration || 10) * 10) / 10,
          c.tier === 'rush' ? 1 : (c.tier === 'mega' ? 2 : 0),
          c.isVIP ? 1 : 0, c.stars || 2, Math.round(c.penalty || 0),
          Math.max(3, Math.round(c.patience || 25))
        ]);
        return list.length ? list : 0;
      })(),
      nw: (st.newsList && st.newsList.length)
        ? st.newsList.slice(0, 8).map(x => [x.day || st.day || 1, x.text || ''])
        : 0,
      pe: (st.pendingEvent && st.pendingEvent.kind)
        ? [st.pendingEvent.kind, st.pendingEvent.roomId || '']
        : 0,
      sd: (st.roomSickLastDay && Object.keys(st.roomSickLastDay).length) ? st.roomSickLastDay : 0,
      rs: (st.roomStats && Object.keys(st.roomStats).length) ? st.roomStats : 0,
      pg: st.prestige ? PRS.normalizePrestige(st.prestige) : 0
    };
  }

  function unpackCompactState(d) {
    const baseSt = createFreshState(d.c[0], d.c[1], d.c[2]);
    const g = d.g || [];
    baseSt.day = g[0] || 1;
    baseSt.minutes = g[1] || 474;
    baseSt.speed = g[2] !== undefined ? g[2] : 1;
    baseSt.money = g[3] || 0;
    baseSt.stars = g[4] || 0;
    baseSt.morale = g[5] !== undefined ? g[5] : 85;
    baseSt.brandAwareness = g[6] || 0;
    baseSt.peakNetWorth = g[7] || baseSt.money;
    baseSt.contractsDone = g[8] || 0;
    baseSt.debtDays = g[9] || 0;
    baseSt.tutorialStep = g[10] || 0;
    baseSt.dayRevenue = g[11] || 0;
    baseSt.ipoDone = !!g[12];
    baseSt.ticker = g[13] || '';
    baseSt.branchIdx = g[14] || 0;
    baseSt.maxBranchIdx = g[15] || baseSt.branchIdx;
    baseSt.activeMapIdx = g[16] !== undefined ? g[16] : baseSt.branchIdx;
    baseSt.investorEquity = g[17] || 0;
    baseSt.overtimeActive = !!g[18];
    baseSt.happyHourLeft = g[19] || 0;
    baseSt.happyHourCooldown = g[20] || 0;
    baseSt.dailyClosed = !!g[21];
    baseSt.lastPowerOutageDay = g[22] !== undefined ? g[22] : -10;
    baseSt.lastEventKind = typeof g[23] === 'string' ? g[23] : '';
    baseSt.lastStaffSickDay = g[24] !== undefined ? g[24] : -10;
    baseSt.lastMacroWaveDay = g[25] !== undefined ? g[25] : -10;
    baseSt.lastSickRoomId = typeof g[26] === 'string' ? g[26] : '';
    baseSt.eventTriggeredToday = !!g[27];
    baseSt.sickStaffRoomId = (typeof g[28] === 'string' && g[28]) ? g[28] : null;
    baseSt.disabledRoomId = (typeof g[29] === 'string' && g[29]) ? g[29] : null;
    baseSt.clientRateDebuff = typeof g[30] === 'number' ? g[30] : 1;
    baseSt.activeEventTag = typeof g[31] === 'string' ? g[31] : '';
    baseSt.lastTaxAuditDay = g[32] !== undefined ? g[32] : -10;
    baseSt.lastIndustryBoomDay = g[33] !== undefined ? g[33] : -10;
    baseSt.lastPartnerPromoDay = g[34] !== undefined ? g[34] : -10;
    baseSt.relaxedMode = !!g[35];
    baseSt.dayAcceptedCount = g[36] || 0;
    baseSt.dayExpiredCount = g[37] || 0;

    if (d.r) {
      CFG.ROOMS.forEach(rc => {
        const arr = d.r[rc.id];
        if (Array.isArray(arr)) {
          let restoredJob = null;
          if (d.jb && Array.isArray(d.jb[rc.id])) {
            const ja = d.jb[rc.id];
            restoredJob = {
              title: ja[0] || 'Hợp đồng',
              reward: ja[1] || 0,
              tier: ja[2] === 1 ? 'rush' : (ja[2] === 2 ? 'mega' : 'normal'),
              stars: ja[3] || 2,
              isVIP: !!ja[4],
              penalty: ja[5] || 0,
              progress: ja[6] || 0,
              duration: ja[7] || 10,
              issue: ja[8] === 1 ? 'coffee' : (ja[8] === 2 ? 'server' : null),
              issueChecked: !!ja[9],
              ready: !!ja[10],
              acceptedAtMin: ja[11] || 0
            };
          }
          baseSt.rooms[rc.id] = { unlocked: !!arr[0], staff: arr[1] || 0, equipLv: arr[2] || 1, speedLv: arr[3] || 1, hasManager: !!arr[4], job: restoredJob };
        }
      });
    }
    baseSt.loan = Array.isArray(d.l) ? { name: d.l[0], dailyPay: d.l[1], daysLeft: d.l[2] } : null;
    if (Array.isArray(d.sv)) baseSt.savings = { flex: d.sv[0] || 0, fixed: d.sv[1] || 0, fixedDaysLeft: d.sv[2] || 0 };
    if (Array.isArray(d.st) && d.st.length) {
      baseSt.stocks = d.st.map(arr => {
        const b = CFG.STOCKS_INIT.find(x => x.symbol === arr[0]);
        const p = arr[1] || (b ? b.price : 100);
        return {
          symbol: arr[0], name: b ? b.name : (baseSt.companyName + ' (Của bạn)'),
          price: p, prevPrice: p, volatility: b ? b.volatility : 0.08,
          color: b ? b.color : '#10B981', shares: arr[2] || 0, avgCost: arr[3] || 0,
          nextBias: 0, isOwn: !!arr[4], history: [Math.max(15, Math.round(p * 0.96)), p]
        };
      });
    }
    baseSt.fundingTaken = Array.isArray(d.f) ? d.f : [];
    baseSt.products = d.p || {};
    baseSt.acquiredRivals = Array.isArray(d.rv) ? d.rv : [];
    if (Array.isArray(d.mk)) {
      const mc = CFG.MARKETING_CAMPAIGNS.find(x => x.id === d.mk[0]);
      if (mc) baseSt.marketingCampaign = { id: mc.id, name: mc.name, icon: mc.icon, daysLeft: d.mk[1], spawnBoost: mc.spawnBoost, rewardMult: mc.rewardMult, vipChance: mc.vipChance };
    }
    baseSt.dailyQuests = QST.generateDailyQuests(baseSt.day);
    if (Array.isArray(d.dn)) {
      baseSt.dailyCompletedJobs = d.dn.map(x => ({
        title: x[0] || '', roomName: x[1] || '', roomIcon: x[2] || '📋',
        reward: x[3] || 0, stars: x[4] || 2, time: x[5] || ''
      }));
    }
    if (Array.isArray(d.nw) && d.nw.length) {
      baseSt.newsList = d.nw.map(x => ({ day: x[0] || baseSt.day, text: x[1] || '' })).filter(x => x.text);
    } else {
      baseSt.newsList = [{ day: baseSt.day, text: `Chào mừng CEO ${escapeHtml(baseSt.ceoName)} trở lại điều hành ${escapeHtml(baseSt.companyName)} (Ngày ${baseSt.day})!` }];
    }
    baseSt.newsHint = (baseSt.newsList[0] && baseSt.newsList[0].text) || '';
    if (Array.isArray(d.wc) && d.wc.length) {
      baseSt.savedWaitingClients = d.wc.map(x => ({
        slotIdx: x[0] || 0, roomId: x[1], title: x[2] || 'Hợp đồng', reward: x[3] || 0,
        duration: x[4] || 10, tier: x[5] === 1 ? 'rush' : (x[5] === 2 ? 'mega' : 'normal'),
        isVIP: !!x[6], stars: x[7] || 2, penalty: x[8] || 0, patience: Math.max(3, x[9] || 20)
      }));
    }
    if (Array.isArray(d.pe) && d.pe[0]) {
      baseSt.pendingEvent = { kind: d.pe[0], roomId: d.pe[1] || '' };
    }
    if (d.sd && typeof d.sd === 'object' && Object.keys(d.sd).length) {
      baseSt.roomSickLastDay = d.sd;
    } else if (baseSt.lastSickRoomId && baseSt.lastStaffSickDay > 0) {
      baseSt.roomSickLastDay = { [baseSt.lastSickRoomId]: baseSt.lastStaffSickDay };
    }
    if (d.rs && typeof d.rs === 'object') baseSt.roomStats = d.rs;
    baseSt.prestige = PRS ? PRS.normalizePrestige(d.pg || d.prestige || null) : { points: 0, totalEarned: 0, salesCount: 0, unlockedTier: 0, perks: {}, chosenRooms: [], activePerks: {}, hallOfFame: [] };
    return baseSt;
  }

  function encodeSaveCode(st) {
    try {
      const packed = packCompactState(st);
      return 'STARUP2-' + btoa(unescape(encodeURIComponent(JSON.stringify(packed))));
    } catch (e) { return ''; }
  }

  function decodeSaveCodeWithReason(code) {
    const raw = (code || '').trim();
    if (!raw) return { data: null, error: 'Bạn chưa dán mã khôi phục!' };
    if (!raw.startsWith('STARUP-') && !raw.startsWith('STARUP2-')) {
      return { data: null, error: 'Mã sai định dạng (phải bắt đầu bằng STARUP2- hoặc STARUP-).' };
    }
    const isV2 = raw.startsWith('STARUP2-');
    const b64 = raw.replace(/^STARUP2?-/, '').replace(/\s+/g, '');
    if (/[^A-Za-z0-9+/=]/.test(b64)) {
      return { data: null, error: `Mã không hợp lệ do sai ký tự bên trong (chứa ký tự ngoài bảng mã, hiện có ${raw.length} ký tự). Hãy kiểm tra lại từng ký tự hoặc sao chép lại toàn bộ mã.` };
    }
    let jsonStr = '';
    try {
      jsonStr = decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      return { data: null, error: `Mã bị cắt giữa chừng hoặc sai ký tự ở phần cuối (hiện có ${raw.length} ký tự). Hãy sao chép lại toàn bộ mã.` };
    }
    let parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      const isTruncated = !jsonStr.trim().endsWith('}') || /Unexpected end/i.test(String(e && e.message || ''));
      if (isTruncated) {
        return { data: null, error: `Mã bị cắt giữa chừng (thiếu phần cuối, hiện có ${raw.length} ký tự). Hãy sao chép lại toàn bộ mã.` };
      }
      return { data: null, error: `Mã không hợp lệ do sai ký tự bên trong — hãy kiểm tra lại từng ký tự hoặc sao chép lại toàn bộ mã (hiện có ${raw.length} ký tự).` };
    }
    if (isV2 && parsed && parsed.v === 2 && Array.isArray(parsed.c) && Array.isArray(parsed.g)) {
      return { data: unpackCompactState(parsed), error: null };
    }
    if (!parsed || typeof parsed.money !== 'number' || !parsed.rooms) {
      return { data: null, error: 'Dữ liệu bên trong mã bị hỏng hoặc không đúng cấu trúc.' };
    }
    // Legacy STARUP- save migration
    if (Array.isArray(parsed.stocks)) {
      parsed.stocks = parsed.stocks.map(st => {
        const b = CFG.STOCKS_INIT.find(x => x.symbol === st.symbol);
        return {
          symbol: st.symbol, name: st.name || (b ? b.name : (parsed.companyName + ' (Của bạn)')),
          price: st.price, prevPrice: st.prevPrice || st.price, volatility: st.volatility || (b ? b.volatility : 0.08),
          color: st.color || (b ? b.color : '#10B981'), shares: st.shares || 0, avgCost: st.avgCost || 0,
          nextBias: st.nextBias || 0, isOwn: !!st.isOwn, history: Array.isArray(st.history) && st.history.length ? st.history : [st.price, st.price]
        };
      });
    }
    if (!parsed.rooms.finance) parsed.rooms.finance = { unlocked: false, staff: 0, equipLv: 1, speedLv: 1, hasManager: false, job: null };
    if (typeof parsed.morale !== 'number') parsed.morale = 85;
    if (!Array.isArray(parsed.dailyCompletedJobs)) parsed.dailyCompletedJobs = [];
    if (typeof parsed.investorEquity !== 'number') parsed.investorEquity = 0;
    if (!Array.isArray(parsed.fundingTaken)) parsed.fundingTaken = [];
    if (!parsed.products) parsed.products = {};
    if (!Array.isArray(parsed.acquiredRivals)) parsed.acquiredRivals = [];
    if (!Array.isArray(parsed.dailyQuests)) parsed.dailyQuests = QST.generateDailyQuests(parsed.day || 1);
    if (typeof parsed.maxBranchIdx !== 'number') parsed.maxBranchIdx = parsed.branchIdx || 0;
    if (typeof parsed.activeMapIdx !== 'number') parsed.activeMapIdx = parsed.branchIdx || 0;
    if (!Array.isArray(parsed.newsList)) parsed.newsList = [{ day: parsed.day || 1, text: parsed.newsHint || 'Chào mừng trở lại!' }];
    const seenNews = new Set();
    parsed.newsList = parsed.newsList.filter(it => { const k = `${it.day}|${it.text}`; if (seenNews.has(k)) return false; seenNews.add(k); return true; });
    if (typeof parsed.unreadNews !== 'boolean') parsed.unreadNews = false;
    if (typeof parsed.lastPowerOutageDay !== 'number') parsed.lastPowerOutageDay = -10;
      if (typeof parsed.lastEventKind !== 'string') parsed.lastEventKind = '';
    if (typeof parsed.isBankrupt !== 'boolean') parsed.isBankrupt = false;
    if (typeof parsed.happyHourCooldown !== 'number') parsed.happyHourCooldown = 0;
    CFG.ROOMS.forEach(r => {
      if (!parsed.rooms[r.id]) parsed.rooms[r.id] = { unlocked: r.unlockedDefault, staff: r.unlockedDefault ? 1 : 0, equipLv: 1, speedLv: 1, hasManager: false, job: null };
      if (typeof parsed.rooms[r.id].hasManager !== 'boolean') parsed.rooms[r.id].hasManager = false;
    });
    parsed.prestige = PRS ? PRS.normalizePrestige(parsed.prestige || null) : { points: 0, totalEarned: 0, salesCount: 0, unlockedTier: 0, perks: {}, chosenRooms: [], activePerks: {}, hallOfFame: [] };
    return { data: parsed, error: null };
  }

  function decodeSaveCode(code) {
    return decodeSaveCodeWithReason(code).data;
  }

  function autoSave() {
    if (!state) return;
    try {
      localStorage.setItem(CFG.SAVE_KEY, encodeSaveCode(state));
      const dot = document.getElementById('saveDot');
      if (dot) {
        dot.style.opacity = '1';
        clearTimeout(saveDotTimer);
        saveDotTimer = setTimeout(() => { dot.style.opacity = '0'; }, 1600);
      }
    } catch (e) {}
  }
  function loadSavedFromStorage() {
    try {
      const raw = localStorage.getItem(CFG.SAVE_KEY);
      return raw ? decodeSaveCode(raw) : null;
    } catch (e) { return null; }
  }

  // ==================== PATHFINDING ====================
  function findPath(startKey, endKey) {
    if (startKey === endKey) return [endKey];
    const q = [[startKey]];
    const vis = new Set([startKey]);
    while (q.length) {
      const path = q.shift();
      const curr = path[path.length - 1];
      for (const nxt of (CFG.EDGES[curr] || [])) {
        if (nxt === endKey) return [...path, nxt];
        if (!vis.has(nxt)) { vis.add(nxt); q.push([...path, nxt]); }
      }
    }
    return [endKey];
  }
  function sendAgent(a, targetNode, badge) {
    const path = findPath(a.node, targetNode);
    a.path = path.length > 1 ? path.slice(1) : [];
    if (badge) a.badge = badge;
  }

  // ==================== STAFF & CLIENT AGENTS (FIXED AFTER-HOURS / LUNCH HIRE!) ====================
  function rebuildStaffAgents(startOutside = false) {
    const existingById = {};
    agents.forEach(a => { existingById[a.id] = a; });
    const phase = getPhase(state.minutes);
    const isClosed = phase.key === 'night';
    const isLunch = phase.key === 'lunch';

    const nextAgents = [];
    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (!rs.unlocked) return;
      for (let i = 0; i < rs.staff; i++) {
        const id = `staff_${rc.id}_${i}`;
        const deskNode = rc.deskNodes[i % rc.deskNodes.length];
        if (existingById[id]) {
          nextAgents.push(existingById[id]);
        } else {
          const roleKey = rc.id === 'ceo' ? state.ceoAvatar : (rc.id === 'finance' ? 'ceo' : rc.id);
          // FIX: If hired after closing (17:00+) or sick today after reload, stay outside!
          const isSickReload = (i === 0 && state.sickStaffRoomId === rc.id);
          const startNode = (startOutside || isClosed || isSickReload) ? 'outside' : deskNode;
          const pos = CFG.NODES[startNode];
          const a = {
            id, role: 'staff', roomId: rc.id, home: deskNode,
            roleKey, node: startNode, x: pos.x, y: pos.y,
            path: [], wait: 1.5 + Math.random() * 2, badge: isSickReload ? '🤒' : rc.icon, speed: 12.5, sickToday: isSickReload
          };
          if (!isClosed && !isSickReload && startOutside) {
            if (isLunch) {
              const lSpot = state.rooms.pantry.unlocked ? 'pantryBar' : 'sofa';
              sendAgent(a, lSpot, '🍚');
            } else {
              sendAgent(a, deskNode, '⏰');
            }
          }
          nextAgents.push(a);
        }
      }
    });

    // Keep active clients
    agents.filter(a => a.role === 'client').forEach(ca => nextAgents.push(ca));
    agents = nextAgents;
    renderAgentsDOM();
  }

  function renderAgentsDOM() {
    const layer = document.getElementById('agentsLayer');
    layer.innerHTML = '';
    agents.forEach(a => {
      const el = document.createElement('div');
      el.id = 'ag-' + a.id;
      el.className = 'agent-token idle';
      el.style.left = a.x + '%';
      el.style.top = a.y + '%';
      el.style.opacity = (a.node === 'outside' && a.path.length === 0) ? '0' : '1';
      el.innerHTML = `
        <div class="token-head-wrap">
          ${AVA.renderTokenImg(a.roleKey, a.id)}
          <span class="token-badge">${a.badge}</span>
        </div>
        <div class="token-shadow"></div>
      `;
      layer.appendChild(el);
    });
  }

  // ==================== UI HELPERS ====================
  function addNews(text) {
    if (!state || !text) return;
    if (!Array.isArray(state.newsList)) state.newsList = [];
    const dup = state.newsList.some(item => item.day === state.day && item.text === text);
    if (dup) return;
    state.newsHint = text;
    state.newsList.unshift({ day: state.day, text });
    if (state.newsList.length > 8) state.newsList.pop();
    state.unreadNews = true;
  }

  function generateDailyNews() {
    const sea = EMP.getSeason(state.day);
    const pool = [
      `${sea.icon} ${sea.name}: Thị trường đang sôi động, các doanh nghiệp tăng nhu cầu thuê dịch vụ!`,
      `📈 Thị trường chứng khoán Ngày ${state.day}: Nhà đầu tư chú ý biến động mã [TECH] và [GOLD].`,
      `💼 Xu hướng Ngày ${state.day}: Khách hàng ưu tiên các đối tác có Uy tín ★ cao và bàn giao đúng hạn.`,
      `📣 Góc kinh doanh: Chạy chiến dịch Marketing giúp tăng mạnh tỷ lệ gặp Khách VIP 💎 tại sảnh.`,
      `🏦 Tin tài chính: Duy trì quỹ tiền mặt dương và dự phòng tiết kiệm giúp công ty vững vàng trước biến cố.`
    ];
    const line = pool[(state.day - 1) % pool.length];
    addNews(line);
  }

  function recordQuestProgress(type, amount) {
    if (!state || !state.dailyQuests) return;
    state.dailyQuests.forEach(q => {
      if (q.type === type && !q.claimed) {
        q.progress = Math.min(q.target, (q.progress || 0) + amount);
      }
    });
  }

  function applyBranchMap() {
    if (!state) return;
    const idx = state.activeMapIdx || 0;
    const b = CFG.BRANCHES[idx] || CFG.BRANCHES[0];
    const dayImg = document.getElementById('dayMapImg');
    if (dayImg && b.mapSrc) dayImg.src = b.mapSrc;
  }

  function spawnStaffBanter(phaseKey) {
    const visibleStaff = agents.filter(a => a.role === 'staff' && !a.sickToday && !(a.node === 'outside' && a.path.length === 0));
    if (!visibleStaff.length) return;
    const pick = visibleStaff[Math.floor(Math.random() * visibleStaff.length)];
    const el = document.createElement('div');
    el.className = 'banter-bubble';
    el.style.left = pick.x + '%';
    el.style.top = (pick.y - 6.5) + '%';
    el.textContent = QST.pickBanter(phaseKey);
    document.getElementById('coinsLayer').appendChild(el);
    setTimeout(() => el.remove(), 2750);
  }

  function openTrophyModal(tab = activeTrophyTab) {
    activeTrophyTab = tab;
    const sharePct = EMP.getMarketShare(state);
    openModal('🏆 Nhiệm Vụ Ngày & Chứng Nhận', QST.buildTrophyAndQuestsHTML(state, activeTrophyTab, sharePct, TICK_SVG));
    document.querySelectorAll('[data-tr-tab]').forEach(b => { b.onclick = () => openTrophyModal(b.dataset.trTab); });
    document.querySelectorAll('[data-claim-q]').forEach(b => {
      b.onclick = () => {
        const q = state.dailyQuests.find(x => x.id === b.dataset.claimQ);
        if (!q || q.claimed || q.progress < q.target) return;
        q.claimed = true;
        state.money += q.rewardCash;
        state.stars += q.rewardStars;
        AUD.playSFX('cash');
        autoSave(); renderHUD(); openTrophyModal('quests');
        showToast(`${TICK_SVG}Nhận thưởng nhiệm vụ +${FIN.fmtMoney(q.rewardCash)} & +${q.rewardStars} ★!`);
      };
    });
    const btnDl = document.getElementById('btnDownloadCert');
    if (btnDl) btnDl.onclick = () => { QST.downloadIPOCertificatePNG(state, sharePct); showToast(`${TICK_SVG}Đã tải ảnh Thẻ Chứng Nhận PNG!`); };
    const btnCp = document.getElementById('btnCopyCertText');
    if (btnCp) btnCp.onclick = () => {
      const txt = `🏆 STARUP — ${state.companyName}${state.ipoDone ? ' [' + state.ticker + ']' : ''} | CEO: ${state.ceoName} | Ngày ${state.day} | Tài sản: ${FIN.fmtMoney(FIN.getNetWorth(state))} | Thị phần: ${sharePct}% | Uy tín: ${state.stars} ★`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(() => {});
      } catch (e) {}
      showToast(`${TICK_SVG}Đã sao chép bảng thành tích!`);
    };
  }

  function showToast(htmlMsg) {
    const t = document.getElementById('toast');
    t.innerHTML = htmlMsg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }
  function spawnCoin(x, y, text) {
    const layer = document.getElementById('coinsLayer');
    const el = document.createElement('div');
    el.className = 'coin-pop';
    el.style.left = x + '%';
    el.style.top = (y - 3) + '%';
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1550);
  }
  function fmtShort(n) {
    const sign = n < 0 ? '-' : '';
    const v = Math.abs(n);
    if (v >= 1000000) return sign + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return sign + (v / 1000).toFixed(1) + 'K';
    return sign + Math.round(v);
  }
  function isHudShowingExact(n) {
    if (moneyDisplayMode === 'exact') return true;
    if (moneyDisplayMode === 'compact') return false;
    return Math.abs(n) < 10000;
  }
  function fmtHudMoney(n) {
    if (isHudShowingExact(n)) {
      return (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
    }
    return (n < 0 ? '-' : '') + '$' + fmtShort(Math.abs(n));
  }
  function fmtTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function getPhase(mins) {
    const closeMin = state.overtimeActive ? 1080 : 1020;
    if (mins < 480) return { key: 'open', icon: '🌅', night: false };
    if (mins < 720) return { key: 'morning', icon: '☀️', night: false };
    if (mins < 780) return { key: 'lunch', icon: '🍚', night: false };
    if (mins < 960) return { key: 'afternoon', icon: '🌤️', night: false };
    if (mins < closeMin) return { key: 'sunset', icon: '🌇', night: false };
    return { key: 'night', icon: '🌙', night: true };
  }
  function resetViewportScroll() {
    try {
      window.scrollTo(0, 0);
      const sc = document.getElementById('gameScreen');
      const ar = document.getElementById('appRoot');
      if (sc) { sc.scrollLeft = 0; sc.scrollTop = 0; }
      if (ar) { ar.scrollLeft = 0; ar.scrollTop = 0; }
    } catch (e) {}
  }

  function isAnyModalOpen() {
    const mo = document.getElementById('modalOverlay');
    const io = document.getElementById('introOverlay');
    return (mo && !mo.classList.contains('hidden')) || (io && !io.classList.contains('hidden'));
  }
  function openModal(title, html) {
    if (state && state.selectedRoom) {
      state.selectedRoom = null;
      renderDrawer();
    }
    // S12-2: Ensure waiting clients never expire right as any modal interrupts the screen
    waitingClients.forEach(c => { if (c.arrived && c.patience < 6) c.patience = 6; });
    resetViewportScroll();
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('btnCloseModal').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    // S12-2: Reset frame delta & grant 2.5s grace window so players can click waiting clients after closing any modal
    lastTs = performance.now();
    clientGraceTimer = 2.5;
  }

  // ==================== TUTORIAL ====================
  function renderTutorial() {
    const banner = document.getElementById('tutorialBanner');
    if (!state || state.tutorialStep <= 0) { banner.classList.add('hidden'); return; }
    const steps = {
      1: 'Bước 1/4: Chạm nút 📋 trên đầu Khách ở Sảnh để nhận hợp đồng (chú ý: để khách chờ hết giờ sẽ rời đi và trừ −1 ★)!',
      2: 'Bước 2/4: Nhân viên đang làm! Nếu đơn dừng ở 50% (đuối sức/ốm), bấm nút "☕ Pha Cà Phê!" hoặc "🔧 Sửa Server!" cạnh phòng để gỡ kẹt, xong bấm 💵 thu tiền.',
      3: 'Bước 3/4: Giỏi lắm! Thử 📣 Marketing kéo khách VIP, hoặc mở Khu Pantry ($750) & Phòng Tài Chính ($1,600)!',
      4: 'Bước 4/4: Chú ý Đơn Hỏa Tốc ⚡ (phải giao trước 17:00) và Biến cố từ Ngày 2 trở đi. Chúc CEO thành công!'
    };
    banner.classList.remove('hidden');
    document.getElementById('tutorialText').textContent = steps[state.tutorialStep] || '';
  }
  function advanceTutorial(toStep) {
    if (state.tutorialStep > 0 && state.tutorialStep < toStep) {
      state.tutorialStep = toStep;
      renderTutorial();
      if (toStep >= 4) {
        setTimeout(() => {
          if (state && state.tutorialStep === 4) { state.tutorialStep = 0; renderTutorial(); autoSave(); }
        }, 7000);
      }
    }
  }

  // ==================== MULTI-CLIENT CONTRACT SPAWNER (NORMAL / RUSH / MEGA) ====================
  function getUnlockedWorkCount() {
    return CFG.ROOMS.filter(r => r.baseReward > 0 && state.rooms[r.id] && state.rooms[r.id].unlocked).length;
  }

  function spawnClientIfNeeded() {
    const workCount = getUnlockedWorkCount();
    const maxSlots = workCount <= 1 ? 1 : (workCount <= 3 ? 2 : 3);
    if (waitingClients.length >= maxSlots) return;
    const phase = getPhase(state.minutes);
    if (phase.key === 'night' || phase.key === 'lunch' || phase.key === 'open') return;
    if (state.minutes > (state.overtimeActive ? 1050 : 990)) return;

    const usedSlots = new Set(waitingClients.map(c => c.slotIdx));
    let slotIdx = -1;
    for (let i = 0; i < maxSlots; i++) {
      if (!usedSlots.has(i)) { slotIdx = i; break; }
    }
    if (slotIdx === -1) return;

    const workRooms = CFG.ROOMS.filter(r => r.baseReward > 0 && state.rooms[r.id].unlocked && r.id !== state.disabledRoomId);
    if (!workRooms.length) return;
    const freeLobbyRooms = workRooms.filter(r => !waitingClients.some(c => c.roomId === r.id));
    if (!freeLobbyRooms.length) return;
    const targetRoom = freeLobbyRooms[Math.floor(Math.random() * freeLobbyRooms.length)];
    const rs = state.rooms[targetRoom.id];
    const titles = CFG.CONTRACT_TEMPLATES[targetRoom.id];
    const title = titles[Math.floor(Math.random() * titles.length)];

    // Contract Tier: Normal, Rush (⚡ x1.75 but penalized if unfinished at 17:00), or Mega (🌟 x2.1 on Day 3+)
    const camp = state.marketingCampaign;
    const roll = Math.random();
    let tier = 'normal';
    if (state.day >= 3 && roll < 0.22) tier = 'mega';
    else if (state.day >= 2 && roll < 0.52) tier = 'rush';

    const vipPerkLv = PRS ? PRS.getActiveLevel(state, 'vip_chance') : 0;
    const baseVipChance = camp ? camp.vipChance : 0.2;
    const vipChance = Math.min(0.85, baseVipChance + vipPerkLv * 0.10);
    const isVIP = tier === 'mega' || Math.random() < vipChance;
    const tierMult = tier === 'mega' ? 2.1 : (tier === 'rush' ? 1.75 : 1.0);
    const branchMult = CFG.BRANCHES[state.branchIdx].mult;
    const starMult = 1 + Math.floor(state.stars / 15) * 0.08;
    const brandMult = 1 + (state.brandAwareness || 0) * 0.004;
    const mktMult = camp ? camp.rewardMult : 1;
    const equipMult = 1 + (rs.equipLv - 1) * 0.35;
    const contractPerkLv = PRS ? PRS.getActiveLevel(state, 'contract_val') : 0;
    const prestigeContractMult = 1 + contractPerkLv * 0.10;

    const seaMult = EMP.getSeason(state.day).rewardMult;
    const reward = Math.round(targetRoom.baseReward * equipMult * starMult * brandMult * mktMult * branchMult * tierMult * seaMult * prestigeContractMult * (isVIP && tier === 'normal' ? 1.35 : 1));
    const effectiveStaff = Math.max(0.6, rs.staff - (state.sickStaffRoomId === targetRoom.id ? 0.55 : 0));
    const duration = Math.max(3.5, targetRoom.baseDuration * (tier === 'mega' ? 1.45 : 1) * (1 - (rs.speedLv - 1) * 0.1) / Math.max(0.7, effectiveStaff * 0.85));

    const cid = 'cli_' + Date.now() + '_' + slotIdx;
    const slot = CLIENT_SLOTS[slotIdx];
    const clientObj = {
      id: cid, slotIdx, slotX: slot.x, slotY: slot.y,
      roomId: targetRoom.id, roomName: targetRoom.name, roomIcon: targetRoom.icon,
      title, reward, duration, tier, isVIP, stars: tier === 'mega' ? 5 : (isVIP ? 3 : 2), penalty: tier === 'rush' ? Math.min(250, Math.round(reward * 0.5)) : 0,
      patience: Math.round(((isVIP || tier === 'mega') ? (workCount <= 1 ? 52 : 46) : (workCount <= 1 ? 42 : 35)) * (state.relaxedMode ? 2 : 1)), arrived: false
    };
    waitingClients.push(clientObj);
    autoSave();

    const cAgent = {
      id: cid, role: 'client', roleKey: isVIP ? 'vip' : 'client',
      node: 'outside', x: CFG.NODES.outside.x, y: CFG.NODES.outside.y,
      path: findPath('outside', slot.node).slice(1),
      wait: 0, badge: tier === 'rush' ? '⚡' : (tier === 'mega' ? '🌟' : (isVIP ? '💎' : '📋')), speed: 13.5
    };
    agents.push(cAgent);
    renderAgentsDOM();
    AUD.playSFX('bell');
  }

  function openContractOfferModal(cid) {
    const c = waitingClients.find(x => x.id === cid);
    if (!c) return;
    const rs = state.rooms[c.roomId];
    const busy = !!rs.job;
    const disabled = state.disabledRoomId === c.roomId;
    const rushPenaltyText = FIN.fmtMoney(c.penalty || Math.min(250, Math.round(c.reward * 0.5)));
    const tierTag = c.tier === 'rush'
      ? `<span style="padding:0.2cqw 0.6cqw;border-radius:999px;background:#FFEDD5;color:#C2410C;font-weight:900;font-size:1cqw;">⚡ HỎA TỐC (Trễ hạn: phạt ${rushPenaltyText} & −2 ★)</span>`
      : (c.tier === 'mega' ? `<span style="padding:0.2cqw 0.6cqw;border-radius:999px;background:#EDE9FE;color:#6D28D9;font-weight:900;font-size:1cqw;">🌟 DỰ ÁN LỚN (x2.1 Thưởng)</span>` : '');

    openModal(`${c.isVIP ? '💎 Hợp Đồng VIP' : '📋 Hợp Đồng Mới'}`, `
      <div style="background:#FAF6F0;border:0.13cqw solid #DFD2C1;border-radius:1.2cqw;padding:1.2cqw;margin-bottom:1.1cqw;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.6cqw;flex-wrap:wrap;">
          <div style="font-size:1.48cqw;font-weight:900;color:#3D2B1F;">${c.roomIcon} ${c.title}</div>
          ${tierTag}
        </div>
        <div style="margin-top:0.45cqw;color:#6B5443;">Phòng phụ trách: <strong>${c.roomName}</strong> ${disabled ? '<span style="color:#DC2626;font-weight:800;">(Đang sự cố!)</span>' : (busy ? '<span style="color:#DC2626;font-weight:800;">(Đang bận!)</span>' : '<span style="color:#059669;font-weight:800;">(Sẵn sàng)</span>')}</div>
        <div style="margin-top:0.55cqw;display:flex;gap:1.5cqw;font-weight:800;">
          <span style="color:#059669;">Thù lao: ${FIN.fmtMoney(c.reward)}</span>
          <span style="color:#D97706;">Thưởng: +${c.tier === 'mega' ? 5 : (c.isVIP ? 3 : 2)} ★</span>
        </div>
      </div>
      <div style="display:flex;gap:0.8cqw;">
        <button id="btnAcceptContract" type="button" ${(busy || disabled) ? 'disabled' : ''} style="flex:2;padding:0.9cqw;border-radius:1cqw;background:${(busy || disabled) ? '#D6CCC0' : 'linear-gradient(180deg,#10B981,#047857)'};color:#fff;font-weight:900;border:none;cursor:${(busy || disabled) ? 'not-allowed' : 'pointer'};display:inline-flex;align-items:center;justify-content:center;">
          ${disabled ? 'Phòng đang khóa sự cố' : (busy ? 'Phòng đang chạy đơn khác' : `${TICK_SVG}Nhận Hợp Đồng Ngay`)}
        </button>
        <button id="btnDeclineContract" type="button" style="flex:1;padding:0.9cqw;border-radius:1cqw;background:#F4ECE0;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">
          Từ chối
        </button>
      </div>
    `);

    const btnAcc = document.getElementById('btnAcceptContract');
    if (btnAcc && !busy && !disabled) {
      btnAcc.addEventListener('click', () => {
        if (acceptClientById(c.id)) closeModal();
      });
    }
    document.getElementById('btnDeclineContract').addEventListener('click', () => {
      AUD.playSFX('click');
      dismissClient(c.id, false);
      closeModal();
    });
  }

  function dismissClient(cid, happy) {
    waitingClients = waitingClients.filter(c => c.id !== cid);
    const ca = agents.find(a => a.id === cid);
    if (ca) sendAgent(ca, 'outside', happy ? '😄' : '👋');
    renderMapOverlays();
  }

  function acceptClientById(cid) {
    const c = waitingClients.find(x => x.id === cid);
    if (!c) return false;
    const rs = state.rooms[c.roomId];
    if (rs.job || state.disabledRoomId === c.roomId) return false;
    rs.job = {
      title: c.title, reward: c.reward, tier: c.tier,
      stars: c.stars || (c.tier === 'mega' ? 5 : (c.isVIP ? 3 : 2)), isVIP: !!c.isVIP, penalty: c.penalty || (c.tier === 'rush' ? Math.min(250, Math.round(c.reward * 0.5)) : 0),
      progress: 0, duration: c.duration, issue: null, issueChecked: false, ready: false, acceptedAtMin: Math.round(state.minutes || 0)
    };
    AUD.playSFX('click');
    state.dayAcceptedCount = (state.dayAcceptedCount || 0) + 1;
    showToast(`${TICK_SVG}Đã giao "${c.title}" cho ${c.roomName}!`);
    dismissClient(c.id, true);
    advanceTutorial(2);
    autoSave();
    renderHUD();
    renderMapOverlays(true);
    return true;
  }

  function deliverRoomJob(roomId) {
    const rc = CFG.ROOMS.find(r => r.id === roomId);
    const rs = state.rooms[roomId];
    if (!rc || !rs || !rs.job || !rs.job.ready) return;
    const j = rs.job;
    const earnedStars = (typeof j.stars === 'number' && j.stars > 0) ? j.stars : (j.tier === 'mega' ? 5 : (j.isVIP ? 3 : 2));
    state.money += j.reward;
    state.dayRevenue += j.reward;
    state.stars += earnedStars;
    state.contractsDone += 1;
    recordQuestProgress('contracts', 1);
    recordQuestProgress('revenue', j.reward);
    const moralePerkBonus = PRS ? PRS.getActiveLevel(state, 'morale_sick') : 0;
    state.morale = Math.min(100, state.morale + 2 + moralePerkBonus);
    state.dailyCompletedJobs.unshift({
      title: j.title, roomName: rc.name, roomIcon: rc.icon,
      reward: j.reward, stars: earnedStars, time: fmtTime(state.minutes)
    });
    const nw = FIN.getNetWorth(state);
    if (nw > state.peakNetWorth) state.peakNetWorth = nw;
    rs.job = null;
    AUD.playSFX('cash');
    spawnCoin(rc.lockBox.x, rc.lockBox.y, '+' + FIN.fmtMoney(j.reward));
    showToast(`${TICK_SVG}Bàn giao thành công! +${FIN.fmtMoney(j.reward)} & +${earnedStars} ★`);
    advanceTutorial(3);
    autoSave();
    renderHUD();
    renderMapOverlays();
  }

  function openReportModal(tab = activeReportTab) {
    updateOverlayLiveMetrics();
    activeReportTab = tab;
    const pendingList = waitingClients.filter(c => c.arrived);
    const activeJobs = CFG.ROOMS.filter(rc => state.rooms[rc.id].unlocked && state.rooms[rc.id].job).map(rc => ({ rc, job: state.rooms[rc.id].job }));
    const doneList = state.dailyCompletedJobs || [];

    const tabs = [
      { id: 'pending', label: `📥 Chưa nhận (${pendingList.length})` },
      { id: 'working', label: `⚙️ Đang làm (${activeJobs.length})` },
      { id: 'done',    label: `📜 Đã xong (${doneList.length})` }
    ];

    let body = `
      <div style="display:flex;gap:0.55cqw;margin-bottom:0.95cqw;">
        ${tabs.map(t => `
          <button data-rep-tab="${t.id}" type="button" style="flex:1;padding:0.7cqw;border-radius:0.95cqw;font-size:1.1cqw;font-weight:800;border:none;cursor:pointer;${tab === t.id ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    `;

    if (tab === 'pending') {
      if (!pendingList.length) {
        body += `<div style="text-align:center;padding:2cqw 1cqw;color:#7C6350;">Hiện chưa có khách mới chờ ở Sảnh Lễ Tân.</div>`;
      } else {
        body += `<div style="display:flex;flex-direction:column;gap:0.7cqw;">` + pendingList.map(c => {
          const busy = !!state.rooms[c.roomId].job || state.disabledRoomId === c.roomId;
          return `
            <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid #DFD2C1;background:#FAF6F0;display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
              <div>
                <div style="font-weight:900;color:#3D2B1F;">${c.roomIcon} ${c.title} ${c.tier === 'rush' ? '<span style="color:#C2410C;">(⚡ Hỏa tốc)</span>' : ''}</div>
                <div style="font-size:1.02cqw;color:#6B5443;">${c.roomName} · <strong style="color:#059669;">${FIN.fmtMoney(c.reward)}</strong> · Chờ ${Math.ceil(c.patience)}s</div>
              </div>
              <div style="display:flex;gap:0.45cqw;flex-shrink:0;">
                <button data-rep-acc="${c.id}" type="button" ${busy ? 'disabled' : ''} style="padding:0.55cqw 0.9cqw;border-radius:0.85cqw;background:${busy ? '#D6CCC0' : '#059669'};color:#fff;font-weight:800;border:none;cursor:${busy ? 'not-allowed' : 'pointer'};">${busy ? 'Phòng bận' : 'Nhận'}</button>
                <button data-rep-dec="${c.id}" type="button" style="padding:0.55cqw 0.8cqw;border-radius:0.85cqw;background:#EFE6DA;color:#5C4636;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">Từ chối</button>
              </div>
            </div>
          `;
        }).join('') + `</div>`;
      }
    } else if (tab === 'working') {
      if (!activeJobs.length) {
        body += `<div style="text-align:center;padding:2cqw 1cqw;color:#7C6350;">Chưa có dự án nào đang chạy. Hãy nhận đơn ở mục Chưa nhận!</div>`;
      } else {
        body += `<div style="display:flex;flex-direction:column;gap:0.7cqw;">` + activeJobs.map(({ rc, job }) => `
          <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid ${job.ready ? '#34D399' : '#DFD2C1'};background:${job.ready ? '#ECFDF5' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;color:#3D2B1F;">${rc.icon} ${job.title} <span style="font-weight:700;color:#6B5443;">(${rc.name})</span></div>
              <div style="font-size:1.02cqw;color:#6B5443;margin-top:0.15cqw;">Thù lao: <strong style="color:#059669;">${FIN.fmtMoney(job.reward)}</strong> · Tiến độ: <strong>${Math.min(100, Math.floor(job.progress || 0))}%</strong> ${job.issue ? `<span style="color:#DC2626;font-weight:800;">(⏸️ Đang tạm dừng)</span>` : ''}</div>
            </div>
            <div style="flex-shrink:0;">
              ${job.ready
                ? `<button data-rep-del="${rc.id}" type="button" style="padding:0.6cqw 1cqw;border-radius:0.85cqw;background:#059669;color:#fff;font-weight:900;border:none;cursor:pointer;display:inline-flex;align-items:center;">${TICK_SVG}Bàn giao</button>`
                : (job.issue
                    ? `<button data-rep-fix="${rc.id}" type="button" style="padding:0.6cqw 0.95cqw;border-radius:0.85cqw;background:#EA580C;color:#fff;font-weight:800;border:none;cursor:pointer;">${job.issue === 'server' ? '🔧 Sửa Server' : '☕ Pha Cà Phê'}</button>`
                    : `<span style="padding:0.45cqw 0.8cqw;border-radius:999px;background:#EFE6DA;color:#5C4636;font-weight:800;font-size:1cqw;">Đang xử lý...</span>`)
              }
            </div>
          </div>
        `).join('') + `</div>`;
      }
    } else {
      body += `<div style="margin-bottom:0.75cqw;padding:0.6cqw 0.95cqw;border-radius:0.9cqw;background:#ECFDF5;color:#065F46;font-weight:800;">Tổng doanh thu đã bàn giao Ngày ${state.day}: ${FIN.fmtMoney(state.dayRevenue)} (${doneList.length} đơn)</div>`;
      if (!doneList.length) {
        body += `<div style="text-align:center;padding:1.6cqw 1cqw;color:#7C6350;">Chưa có đơn hàng nào hoàn thành trong hôm nay.</div>`;
      } else {
        body += `<div style="display:flex;flex-direction:column;gap:0.55cqw;">` + doneList.map(d => `
          <div style="padding:0.65cqw 0.95cqw;border-radius:0.95cqw;border:0.12cqw solid #DFD2C1;background:#FFFDF9;display:flex;align-items:center;justify-content:space-between;">
            <div><strong>${d.roomIcon} ${d.title}</strong> <span style="color:#7C6350;font-size:1cqw;">(${d.roomName} · ${d.time})</span></div>
            <div style="font-weight:900;color:#059669;">+${FIN.fmtMoney(d.reward)} <span style="color:#D97706;">+${d.stars}★</span></div>
          </div>
        `).join('') + `</div>`;
      }
    }

    openModal(`📋 Báo Cáo Công Việc — Ngày ${state.day}`, body);

    document.querySelectorAll('[data-rep-tab]').forEach(b => { b.onclick = () => openReportModal(b.dataset.repTab); });
    document.querySelectorAll('[data-rep-acc]').forEach(b => { b.onclick = () => { if (acceptClientById(b.dataset.repAcc)) openReportModal('working'); }; });
    document.querySelectorAll('[data-rep-dec]').forEach(b => { b.onclick = () => { dismissClient(b.dataset.repDec, false); openReportModal('pending'); }; });
    document.querySelectorAll('[data-rep-del]').forEach(b => { b.onclick = () => { deliverRoomJob(b.dataset.repDel); openReportModal('done'); }; });
    document.querySelectorAll('[data-rep-fix]').forEach(b => {
      b.onclick = () => {
        const rs = state.rooms[b.dataset.repFix];
        if (rs && rs.job) { rs.job.issue = null; AUD.playSFX('click'); autoSave(); renderMapOverlays(true); openReportModal('working'); }
      };
    });
  }

  function dismissAllClients() {
    waitingClients.forEach(c => {
      const ca = agents.find(a => a.id === c.id);
      if (ca) sendAgent(ca, 'outside', '👋');
    });
    waitingClients = [];
  }

  // ==================== MAP OVERLAYS (SMART DIFF — ZERO DROPPED MOBILE TAPS) ====================
  function computeOverlaySig() {
    const rSig = CFG.ROOMS.map(rc => {
      const rs = state.rooms[rc.id];
      const canBuy = !rs.unlocked && state.money >= rc.unlockCost ? 1 : 0;
      const down = state.disabledRoomId === rc.id ? 1 : 0;
      const jState = !rs.job ? '0' : (rs.job.ready ? 'R' : (rs.job.issue || 'W'));
      return `${rc.id}:${rs.unlocked?1:0}:${canBuy}:${down}:${rs.equipLv}:${jState}:${state.selectedRoom===rc.id?1:0}`;
    }).join('|');
    const cSig = waitingClients.filter(c => c.arrived).map(c => `${c.id}:${c.tier}`).join(',');
    return rSig + '#' + cSig + '#' + (state.tutorialStep === 1 ? 1 : 0) + '#' + (state.speed === 0 ? 1 : 0);
  }

  function updateOverlayLiveMetrics() {
    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (!rs.job || rs.job.ready || rs.job.issue) return;
      const pctEl = document.getElementById('prog-txt-' + rc.id);
      const barEl = document.getElementById('prog-bar-' + rc.id);
      const pctInt = Math.min(100, Math.floor(rs.job.progress));
      const isGamePaused = state.speed === 0;
      if (pctEl) {
        pctEl.textContent = isGamePaused ? ('⏸️ ' + pctInt + '%') : ((rs.job.tier === 'rush' ? '⚡ ' : '') + pctInt + '%');
        pctEl.style.color = isGamePaused ? '#DC2626' : '#4A3426';
      }
      if (barEl) {
        barEl.style.width = pctInt + '%';
        barEl.style.background = isGamePaused ? '#F59E0B' : '';
      }
      if (state.selectedRoom === rc.id) { const dp = document.getElementById('drJobPct'); const db = document.getElementById('drJobBar'); if (dp) dp.textContent = pctInt + '%'; if (db) db.style.width = pctInt + '%'; }
    });
    waitingClients.forEach(c => {
      if (!c.arrived) return;
      const tEl = document.getElementById('cli-pat-' + c.id);
      if (tEl) { const isLunchNow = getPhase(state.minutes).key === 'lunch'; tEl.textContent = state.tutorialStep === 1 ? 'Nhận!' : (isLunchNow ? `🍚 ${Math.ceil(c.patience)}s` : `${Math.ceil(c.patience)}s`); }
    });
  }

  function renderMapOverlays(force = false) {
    const sig = computeOverlaySig();
    if (!force && sig === lastOverlaySig) {
      updateOverlayLiveMetrics();
      return;
    }
    lastOverlaySig = sig;
    const layer = document.getElementById('mapOverlaysLayer');
    layer.innerHTML = '';

    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (!rs.unlocked) {
        const canBuy = state.money >= rc.unlockCost;
        // 1. Isometric frosted blueprint polygon hugging the exact angled room walls
        if (rc.poly) {
          const polyEl = document.createElement('div');
          polyEl.className = 'iso-lock-poly' + (canBuy ? ' can-buy' : '');
          polyEl.style.clipPath = rc.poly;
          polyEl.style.webkitClipPath = rc.poly;
          layer.appendChild(polyEl);
        }
        // 2. Sculpted 3D compact unlock plaque centered inside the room
        const pos = rc.plaquePos || rc.lockBox;
        const lockSvg = canBuy
          ? `<svg class="plaque-lock-svg" viewBox="0 0 28 28" fill="none"><path d="M9 12V8.5a5 5 0 0 1 9.5-2" stroke="#FEF9C3" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="12" width="16" height="12" rx="3.2" fill="#FEF3C7" stroke="#065F46" stroke-width="2"/><circle cx="14" cy="18" r="1.8" fill="#047857"/></svg>`
          : `<svg class="plaque-lock-svg" viewBox="0 0 28 28" fill="none"><path d="M9.5 12V9a4.5 4.5 0 0 1 9 0v3" stroke="#8C6D53" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="12" width="16" height="12" rx="3.2" fill="#F59E0B" stroke="#78350F" stroke-width="2"/><circle cx="14" cy="18" r="1.8" fill="#FFFDF9"/></svg>`;
        const plaque = document.createElement('button');
        plaque.type = 'button';
        plaque.className = 'iso-lock-plaque' + (canBuy ? ' can-buy' : '');
        plaque.style.left = pos.x + '%';
        plaque.style.top = pos.y + '%';
        plaque.innerHTML = `
          ${lockSvg}
          <div class="plaque-name">${rc.name}</div>
          
          <div class="plaque-price">${canBuy ? 'Mở ngay · ' : ''}${FIN.fmtMoney(rc.unlockCost)}</div>
        `;
        plaque.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); unlockRoom(rc); });
        layer.appendChild(plaque);
        return;
      }

      // If room is temporarily shut down by a real Event!
      if (state.disabledRoomId === rc.id) {
        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'room-down-overlay';
        down.style.left = rc.lockBox.x + '%';
        down.style.top = rc.lockBox.y + '%';
        down.style.width = rc.lockBox.w + '%';
        down.style.height = rc.lockBox.h + '%';
        down.innerHTML = `<div style="font-size:1.8cqw;">⚡🔧</div><div style="font-size:1.05cqw;font-weight:900;">SỰ CỐ HỆ THỐNG</div><div style="font-size:0.95cqw;color:#FDE68A;">Chạm sửa ($280)</div>`;
        down.addEventListener('click', () => {
          if (state.money < 280) return showToast('Cần $280 để gọi thợ sửa ngay!');
          state.money -= 280;
          state.disabledRoomId = null;
          state.activeEventTag = '';
          AUD.playSFX('unlock');
          showToast(`${TICK_SVG}Đã sửa xong ${rc.name}, hoạt động bình thường trở lại!`);
          renderHUD();
          renderMapOverlays();
        });
        layer.appendChild(down);
        return;
      }

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'room-chip' + (state.selectedRoom === rc.id ? ' active' : '');
      chip.style.left = rc.chipPos.x + '%';
      chip.style.top = rc.chipPos.y + '%';
      chip.innerHTML = `<span>${rc.icon}</span><span>Lv.${rs.equipLv}</span>`;
      chip.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault();
        AUD.playSFX('click');
        state.selectedRoom = (state.selectedRoom === rc.id) ? null : rc.id;
        renderMapOverlays();
        renderDrawer();
      });
      layer.appendChild(chip);

      if (rs.job) {
        const j = rs.job;
        const px = rc.lockBox.x;
        const py = rc.lockBox.y;

        if (j.ready) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'action-bubble action-deliver';
          btn.style.left = px + '%';
          btn.style.top = py + '%';
          btn.innerHTML = `${TICK_SVG}<span>Thu ${FIN.fmtMoney(j.reward)}</span>`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            deliverRoomJob(rc.id);
            return;
            AUD.playSFX('cash');
            spawnCoin(px, py, '+' + FIN.fmtMoney(j.reward));
            showToast(`${TICK_SVG}Bàn giao thành công! +${FIN.fmtMoney(j.reward)} & +${earnedStars} ★`);
            advanceTutorial(3);
            autoSave();
            renderHUD();
            renderMapOverlays();
          });
          layer.appendChild(btn);
        } else if (j.issue) {
          const isServer = j.issue === 'server';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'action-bubble ' + (isServer ? 'action-alert' : 'action-coffee');
          btn.style.left = px + '%';
          btn.style.top = py + '%';
          btn.innerHTML = isServer ? `<span>🔧</span><span>Sửa Server!</span>` : `<span>☕</span><span>Pha Cà Phê!</span>`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            j.issue = null;
            AUD.playSFX('click');
            autoSave();
            showToast(`${TICK_SVG}${isServer ? 'Đã khắc phục tủ Server!' : 'Đã tiếp cà phê, nhân viên làm tiếp!'}`);
            renderMapOverlays(true);
          });
          layer.appendChild(btn);
          const stuckPill = document.createElement('div');
          stuckPill.className = 'work-progress-pill stuck-pill';
          stuckPill.style.left = rc.chipPos.x + '%';
          stuckPill.style.top = (rc.chipPos.y + 5.5) + '%';
          const stuckPct = Math.min(100, Math.floor(j.progress || 0));
          stuckPill.title = isServer
            ? 'Phòng chưa có Quản Lý Tự Động — bấm nút "🔧 Sửa Server!" để gỡ kẹt'
            : 'Phòng chưa có Quản Lý Tự Động — bấm nút "☕ Pha Cà Phê!" để gỡ kẹt';
          stuckPill.innerHTML = `
            <div id="prog-txt-${rc.id}" style="font-size:0.86cqw;font-weight:900;color:#B91C1C;text-align:center;">${isServer ? '🔧' : '☕'} Kẹt ${stuckPct}% · Bấm nút!</div>
            <div class="work-progress-bar" style="background:#FECACA;"><div id="prog-bar-${rc.id}" class="work-progress-fill" style="width:${stuckPct}%;background:#DC2626;"></div></div>
          `;
          layer.appendChild(stuckPill);
        } else {
          const pill = document.createElement('div');
          pill.className = 'work-progress-pill';
          pill.style.left = rc.chipPos.x + '%';
          pill.style.top = (rc.chipPos.y + 5.5) + '%';
          const isGamePaused = state.speed === 0;
          const pctNow = Math.min(100, Math.floor(j.progress || 0));
          pill.innerHTML = `
            <div id="prog-txt-${rc.id}" style="font-size:0.88cqw;font-weight:800;color:${isGamePaused ? '#DC2626' : '#4A3426'};text-align:center;">${isGamePaused ? '⏸️ ' : (j.tier === 'rush' ? '⚡ ' : '')}${pctNow}%</div>
            <div class="work-progress-bar"><div id="prog-bar-${rc.id}" class="work-progress-fill" style="width:${pctNow}%;${isGamePaused ? 'background:#F59E0B;' : ''}"></div></div>
          `;
          layer.appendChild(pill);
        }
      }
    });

    // Render all arrived waiting clients at Reception
    waitingClients.forEach(c => {
      if (!c.arrived) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      const tierCls = c.tier === 'rush' ? 'action-rush' : (c.tier === 'mega' ? 'action-mega' : 'action-contract');
      btn.className = 'action-bubble ' + tierCls;
      btn.style.left = c.slotX + '%';
      btn.style.top = c.slotY + '%';
      const icon = c.tier === 'rush' ? '⚡' : (c.tier === 'mega' ? '🌟' : (c.isVIP ? '💎' : '📋'));
      const timeTxt = state.tutorialStep === 1 ? 'Nhận!' : `${Math.ceil(c.patience)}s`;
      const starLbl = `+${c.stars || (c.tier === "mega" ? 5 : (c.isVIP ? 3 : 2))}★`;
      btn.innerHTML = `<span>${icon}</span><span>${FIN.fmtMoney(c.reward)} · ${starLbl} (<span id="cli-pat-${c.id}">${timeTxt}</span>)</span>`;
      btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openContractOfferModal(c.id); });
      layer.appendChild(btn);
    });
  }

  function unlockRoom(rc) {
    if (state.money < rc.unlockCost) {
      AUD.playSFX('alert');
      showToast(`Cần ${FIN.fmtMoney(rc.unlockCost)} để mở khóa ${rc.name}!`);
      return;
    }
    state.money -= rc.unlockCost;
    state.rooms[rc.id].unlocked = true;
    state.rooms[rc.id].staff = 1;
    AUD.playSFX('unlock');
    if (rc.poly) {
      const burst = document.createElement('div');
      burst.className = 'iso-unlock-burst';
      burst.style.clipPath = rc.poly;
      burst.style.webkitClipPath = rc.poly;
      document.getElementById('coinsLayer').appendChild(burst);
      setTimeout(() => burst.remove(), 700);
    }
    spawnCoin((rc.plaquePos || rc.lockBox).x, (rc.plaquePos || rc.lockBox).y, `Mở ${rc.name}!`);
    const isClosed = getPhase(state.minutes).key === 'night';
    showToast(isClosed
      ? `${TICK_SVG}Đã mở ${rc.name}! Nhân viên mới sẽ bắt đầu làm lúc 08:00 sáng mai.`
      : `${TICK_SVG}Đã mở khóa ${rc.name}! Nhân viên mới đang vào văn phòng.`);
    rebuildStaffAgents(true);
    advanceTutorial(4);
    autoSave();
    renderHUD();
    renderMapOverlays();
  }

  // ==================== JUICY ROOM UPGRADE POPUP ====================
  function renderSegments(elId, current, max) {
    const el = document.getElementById(elId);
    if (!el) return;
    let html = '';
    for (let i = 1; i <= max; i++) html += `<span class="up-seg${i <= current ? ' filled' : ''}"></span>`;
    el.innerHTML = html;
  }
  function styleUpgradeBtn(btnId, isMax, cost) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.remove('poor', 'maxed');
    if (isMax) { btn.textContent = '★ MAX'; btn.classList.add('maxed'); }
    else { btn.textContent = '$' + fmtShort(cost); if (state.money < cost) btn.classList.add('poor'); }
  }

  function renderDrawer() {
    const d = document.getElementById('roomDrawer');
    if (!state.selectedRoom) { d.classList.add('closed'); d.classList.remove('open'); return; }
    const rc = CFG.ROOMS.find(r => r.id === state.selectedRoom);
    const rs = state.rooms[rc.id];
    d.classList.remove('closed');
    d.classList.add('open');

    const staffCost = Math.max(450, Math.round((rc.unlockCost || 550) * 0.95 * rs.staff));
    const equipCost = Math.max(320, Math.round((rc.unlockCost || 450) * 0.6 * Math.pow(1.75, rs.equipLv - 1)));
    const speedCost = Math.max(280, Math.round((rc.unlockCost || 400) * 0.55 * Math.pow(1.7, rs.speedLv - 1)));

    const curReward = rc.baseReward > 0 ? Math.round(rc.baseReward * (1 + (rs.equipLv - 1) * 0.35)) : 0;
    const dailyCost = rc.dailyRent + rc.staffSalary * rs.staff;

    document.getElementById('drHeroIcon').textContent = rc.icon;
    document.getElementById('drTitle').textContent = rc.name;
    document.getElementById('drStarsRow').textContent = '★'.repeat(rs.equipLv) + '☆'.repeat(5 - rs.equipLv);
    document.getElementById('drStatVal').textContent = curReward > 0 ? FIN.fmtMoney(curReward) : 'Hỗ trợ';
    document.getElementById('drStatCost').textContent = '-' + FIN.fmtMoney(dailyCost);
    const jobBox = document.getElementById('drJobBox');
    if (jobBox) {
      if (rs.job) {
        const pct = Math.min(100, Math.floor(rs.job.progress || 0));
        jobBox.classList.remove('hidden');
        document.getElementById('drJobTitle').textContent = rs.job.ready
          ? '✅ Sẵn sàng bàn giao: ' + rs.job.title
          : (rs.job.issue === 'server'
              ? '⏸️ Đang tạm dừng (bấm 🔧 Sửa Server!): ' + rs.job.title
              : (rs.job.issue === 'coffee'
                  ? '⏸️ Đang tạm dừng (bấm ☕ Pha Cà Phê!): ' + rs.job.title
                  : '📋 ' + rs.job.title));
        document.getElementById('drJobPct').textContent = pct + '%';
        document.getElementById('drJobBar').style.width = pct + '%';
      } else {
        jobBox.classList.add('hidden');
      }
    }
    

    document.getElementById('upStaffSub').textContent = `${rs.staff}/${rc.maxStaff}`;
    document.getElementById('upEquipSub').textContent = `Lv.${rs.equipLv}/5`;
    document.getElementById('upSpeedSub').textContent = `Lv.${rs.speedLv}/5`;

    renderSegments('upStaffBar', rs.staff, rc.maxStaff);
    renderSegments('upEquipBar', rs.equipLv, 5);
    renderSegments('upSpeedBar', rs.speedLv, 5);

    styleUpgradeBtn('upStaff', rs.staff >= rc.maxStaff, staffCost);
    styleUpgradeBtn('upEquip', rs.equipLv >= 5, equipCost);
    styleUpgradeBtn('upSpeed', rs.speedLv >= 5, speedCost);

    const mgrCost = Math.max(1200, Math.round((rc.unlockCost || 800) * 1.1));
    const drTipEl = document.getElementById('drTip');
    if (drTipEl) {
      let bestMgrRoom = null;
      let bestScore = 0;
      const rStats = state.roomStats || {};
      CFG.ROOMS.forEach(r => {
        const stR = state.rooms[r.id];
        if (!stR || !stR.unlocked || stR.hasManager || r.baseReward <= 0) return;
        const arr = rStats[r.id] || [0, 0];
        const score = (arr[0] || 0) * 500 + (arr[1] || 0);
        if (score > bestScore) { bestScore = score; bestMgrRoom = { r, stuck: arr[0] || 0, missed: arr[1] || 0 }; }
      });
      if (bestMgrRoom && bestScore > 0) {
        drTipEl.innerHTML = `💡 <strong>Gợi ý Quản Lý:</strong> Nên ưu tiên mua Quản Lý cho <strong>${bestMgrRoom.r.icon} ${bestMgrRoom.r.name}</strong> (${bestMgrRoom.stuck} lần kẹt 50%${bestMgrRoom.missed > 0 ? `, ${FIN.fmtMoney(bestMgrRoom.missed)} chờ thu tay` : ''}).`;
      } else {
        drTipEl.innerHTML = `💡 Mẹo: Khi hợp đồng tạm dừng ở 50% (đuối sức/lỗi), bấm <strong>☕ Pha Cà Phê!</strong> hoặc <strong>🔧 Sửa Server!</strong> cạnh phòng để gỡ kẹt và chạy tiếp.`;
      }
    }
    const mgrBtn = document.getElementById('upMgr');
    const mgrSub = document.getElementById('upMgrSub');
    if (mgrBtn && mgrSub) {
      mgrBtn.classList.remove('poor', 'maxed');
      if (rs.hasManager) {
        mgrSub.textContent = 'Đang tự động hóa';
        mgrBtn.textContent = '★ ĐÃ CÓ';
        mgrBtn.classList.add('maxed');
        mgrBtn.onclick = null;
      } else if (rs.staff < rc.maxStaff) {
        mgrSub.textContent = `Cần đủ ${rc.maxStaff}/${rc.maxStaff} NV`;
        mgrBtn.textContent = '🔒 Khóa';
        mgrBtn.classList.add('poor');
        mgrBtn.onclick = () => showToast(`Hãy tuyển đủ ${rc.maxStaff}/${rc.maxStaff} nhân sự trước khi thăng chức Quản lý!`);
      } else {
        mgrSub.textContent = rc.id === 'lobby' ? 'Tự nhận đơn thường' : 'Tự xử lý & thu tiền';
        mgrBtn.textContent = '$' + fmtShort(mgrCost);
        if (state.money < mgrCost) mgrBtn.classList.add('poor');
        mgrBtn.onclick = () => {
          if (state.money < mgrCost) return showToast(`Cần ${FIN.fmtMoney(mgrCost)} để thăng chức Quản lý!`);
          state.money -= mgrCost;
          rs.hasManager = true;
          AUD.playSFX('unlock');
          spawnCoin(rc.lockBox.x, rc.lockBox.y, '🎖️ Quản Lý!');
          autoSave(); renderHUD(); renderDrawer();
          showToast(`${TICK_SVG}${rc.name} đã có Quản Lý Tự Động!`);
        };
      }
    }

    document.getElementById('upStaff').onclick = () => {
      if (rs.staff >= rc.maxStaff) return;
      if (state.money < staffCost) return showToast('Chưa đủ tiền mặt để tuyển thêm nhân sự!');
      state.money -= staffCost;
      rs.staff += 1;
      AUD.playSFX('unlock');
      const phaseKey = getPhase(state.minutes).key;
      rebuildStaffAgents(true);
      autoSave();
      renderHUD();
      renderDrawer();
      if (phaseKey === 'night') {
        showToast(`${TICK_SVG}Đã ký hợp đồng! Nhân viên mới sẽ đi làm lúc 08:00 sáng mai.`);
      } else if (phaseKey === 'lunch') {
        showToast(`${TICK_SVG}Đã tuyển nhân sự ${rc.name}! Đang ra Pantry nghỉ trưa cùng team.`);
      } else {
        spawnCoin(rc.lockBox.x, rc.lockBox.y, '+1 Nhân sự!');
        showToast(`${TICK_SVG}Đã tuyển thêm nhân sự cho ${rc.name}!`);
      }
    };
    document.getElementById('upEquip').onclick = () => {
      if (rs.equipLv >= 5) return;
      if (state.money < equipCost) return showToast('Chưa đủ tiền để nâng cấp thiết bị!');
      state.money -= equipCost;
      rs.equipLv += 1;
      recordQuestProgress('action', 1);
      AUD.playSFX('unlock');
      spawnCoin(rc.lockBox.x, rc.lockBox.y, `Thiết bị Lv.${rs.equipLv}!`);
      autoSave(); renderHUD(); renderMapOverlays(); renderDrawer();
      showToast(`${TICK_SVG}Nâng thiết bị ${rc.name} lên Lv.${rs.equipLv}!`);
    };
    document.getElementById('upSpeed').onclick = () => {
      if (rs.speedLv >= 5) return;
      if (state.money < speedCost) return showToast('Chưa đủ tiền để nâng tiện ích!');
      state.money -= speedCost;
      rs.speedLv += 1;
      AUD.playSFX('unlock');
      spawnCoin(rc.lockBox.x, rc.lockBox.y, `Tốc độ Lv.${rs.speedLv}!`);
      autoSave(); renderHUD(); renderDrawer();
      showToast(`${TICK_SVG}Nâng tiện ích ${rc.name} lên Lv.${rs.speedLv}!`);
    };
  }

  // ==================== REAL TANGIBLE OFFICE EVENTS (DAY 2+) ====================
  function triggerRandomEvent() {
    if (state.day < 2 || state.eventTriggeredToday) return;
    state.eventTriggeredToday = true;

    const workRooms = CFG.ROOMS.filter(r => r.baseReward > 0 && state.rooms[r.id].unlocked);
    const defaultRoom = workRooms[Math.floor(Math.random() * workRooms.length)] || CFG.ROOMS[1];

    const pool = [];
    if ((state.day - (state.lastPowerOutageDay !== undefined ? state.lastPowerOutageDay : -10)) >= 6) pool.push('power_outage');
    const moraleSickLv = PRS ? PRS.getActiveLevel(state, 'morale_sick') : 0;
    const sickSkipChance = Math.min(0.75, moraleSickLv * 0.35);
    if ((state.day - (state.lastStaffSickDay !== undefined ? state.lastStaffSickDay : -10)) >= 6 && Math.random() >= sickSkipChance) pool.push('staff_sick');
    if ((state.day - (state.lastMacroWaveDay !== undefined ? state.lastMacroWaveDay : -10)) >= 4) pool.push('macro_wave');
    if ((state.day - (state.lastTaxAuditDay !== undefined ? state.lastTaxAuditDay : -10)) >= 3) pool.push('tax_audit');
    if ((state.day - (state.lastIndustryBoomDay !== undefined ? state.lastIndustryBoomDay : -10)) >= 3) pool.push('industry_boom');
    if ((state.day - (state.lastPartnerPromoDay !== undefined ? state.lastPartnerPromoDay : -10)) >= 3) pool.push('partner_promo');
    const fallbackPool = ['tax_audit', 'industry_boom', 'partner_promo'];
    const basePool = pool.length ? pool : fallbackPool;
    const nonDupPool = basePool.filter(k => k !== state.lastEventKind);
    const activePool = nonDupPool.length ? nonDupPool : basePool;
    const kind = activePool[Math.floor(Math.random() * activePool.length)];
    state.lastEventKind = kind;

    let chosenRoom = defaultRoom;
    if (kind === 'power_outage') {
      state.lastPowerOutageDay = state.day;
    } else if (kind === 'staff_sick') {
      // Priority 2: Pity timer — rooms with >= 12 days since last sick event get progressively higher selection weight
      if (!state.roomSickLastDay || typeof state.roomSickLastDay !== 'object') state.roomSickLastDay = {};
      const weighted = workRooms.map(r => {
        const lastD = state.roomSickLastDay[r.id] || 0;
        const daysSince = Math.max(0, state.day - lastD);
        let w = (r.id === state.lastSickRoomId && workRooms.length > 1) ? 0.15 : 1.0;
        if (daysSince >= 12) w += (daysSince - 11) * 1.6;
        return { r, w };
      });
      const totalW = weighted.reduce((s, x) => s + x.w, 0);
      let rollW = Math.random() * totalW;
      chosenRoom = weighted[0] ? weighted[0].r : defaultRoom;
      for (const item of weighted) {
        rollW -= item.w;
        if (rollW <= 0) { chosenRoom = item.r; break; }
      }
      state.lastStaffSickDay = state.day;
      state.lastSickRoomId = chosenRoom.id;
      state.roomSickLastDay[chosenRoom.id] = state.day;
    } else if (kind === 'tax_audit') {
      state.lastTaxAuditDay = state.day;
    } else if (kind === 'industry_boom') {
      state.lastIndustryBoomDay = state.day;
    } else if (kind === 'partner_promo') {
      state.lastPartnerPromoDay = state.day;
    } else if (kind === 'macro_wave') {
      state.lastMacroWaveDay = state.day;
    }

    // S19-1: Persist pendingEvent immediately BEFORE opening modal so reload restores it intact for ALL event kinds
    state.pendingEvent = { kind, roomId: chosenRoom ? chosenRoom.id : '' };
    autoSave();
    AUD.playSFX('alert');
    showRandomEventModal(kind, chosenRoom ? chosenRoom.id : '', false);
  }

  function showRandomEventModal(kind, roomId, isRestore = false) {
    if (!state || !kind) return;
    const hasFin = state.rooms.finance && state.rooms.finance.unlocked;
    const targetRoom = CFG.ROOMS.find(r => r.id === roomId) || CFG.ROOMS[1];

    if (kind === 'power_outage') {
      const fixCost = state.day <= 5 ? 150 : 280;
      openModal(`⚡ Biến Cố: Chập điện tại ${targetRoom.name}!`, `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Đường dây tại <strong>${targetRoom.name}</strong> vừa gặp sự cố. Nếu không sửa ngay, phòng này sẽ <strong>tạm ngừng</strong> trong hôm nay (đơn đang chạy sẽ được giữ lại).</p>
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          <button id="evA" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Chi $${fixCost} gọi thợ sửa ngay lập tức</button>
          <button id="evB" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#F4ECE0;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;text-align:left;">B. Tạm đóng ${targetRoom.name} hôm nay (tiết kiệm tiền)</button>
        </div>
      `);
      document.getElementById('evA').onclick = () => {
        if (state.money < fixCost) return showToast(`Không đủ $${fixCost} tiền mặt — hãy chọn phương án B!`);
        state.money -= fixCost; state.pendingEvent = null; closeModal(); autoSave(); showToast(`${TICK_SVG}Đã sửa xong sự cố điện tại ${targetRoom.name}!`); renderHUD();
      };
      document.getElementById('evB').onclick = () => {
        state.disabledRoomId = targetRoom.id;
        state.activeEventTag = `🔧 ${targetRoom.name} tạm ngừng do chập điện`;
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`⚡ ${targetRoom.name} đã tạm khóa trên bản đồ!`); renderHUD(); renderMapOverlays();
      };
    } else if (kind === 'staff_sick') {
      const targetRoomSick = targetRoom;
      openModal(`🤒 Biến Cố: Nhân viên ${targetRoomSick.name} xin nghỉ ốm`, `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Một nhân sự ở <strong>${targetRoomSick.name}</strong> bị cảm nặng và xin về nhà nghỉ hôm nay, làm giảm tốc độ xử lý của phòng. <em>(Mẹo: Nếu đơn bị tạm dừng ở 50%, bấm nút "☕ Pha Cà Phê!" cạnh phòng để gỡ kẹt và chạy tiếp.)</em></p>
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          <button id="evA" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Chi $260 thuê CTV làm thay + thăm hỏi (+5% Tinh thần)</button>
          <button id="evB" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#F4ECE0;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;text-align:left;">B. Cho nhân viên về nghỉ (giảm công suất ${targetRoomSick.name} hôm nay)</button>
        </div>
      `);
      document.getElementById('evA').onclick = () => {
        if (state.money < 260) return showToast('Không đủ $260 tiền mặt — hãy chọn phương án B!');
        state.money -= 260; state.morale = Math.min(100, state.morale + 5);
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Đã bố trí CTV thay thế & cả team rất vui (+5% Tinh thần)!`); renderHUD();
      };
      document.getElementById('evB').onclick = () => {
        state.sickStaffRoomId = targetRoomSick.id;
        state.activeEventTag = `🤒 ${targetRoomSick.name} thiếu 1 nhân sự hôm nay`;
        state.pendingEvent = null;
        const ag = agents.find(a => a.role === 'staff' && a.roomId === targetRoomSick.id);
        if (ag) { ag.sickToday = true; sendAgent(ag, 'outside', '🤒'); }
        closeModal(); autoSave(); showToast(`🤒 Nhân viên ${targetRoomSick.name} về nghỉ hôm nay. Nếu đơn dừng ở 50%, bấm "☕ Pha Cà Phê!" cạnh phòng để gỡ kẹt!`); renderHUD();
      };
    } else if (kind === 'tax_audit') {
      openModal('🧾 Biến Cố: Thanh Tra Thuế & Sổ Sách Ghé Thăm', `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Đoàn kiểm tra tài chính đang rà soát chứng từ của <strong>${escapeHtml(state.companyName)}</strong>.</p>
        ${hasFin
          ? `<div style="padding:0.95cqw;border-radius:1cqw;background:#ECFDF5;border:0.13cqw solid #6EE7B7;color:#065F46;font-weight:800;margin-bottom:1cqw;">${TICK_SVG}Nhờ có <strong>Phòng Tài Chính</strong>, sổ sách hoàn toàn minh bạch! Công ty nhận thưởng +$300 & +4 ★ Uy tín!</div>
             <button id="evFinPass" type="button" style="width:100%;padding:0.9cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">Nhận thưởng minh bạch</button>`
          : `<div style="padding:0.95cqw;border-radius:1cqw;background:#FEF2F2;border:0.13cqw solid #FECACA;color:#991B1B;font-weight:800;margin-bottom:1cqw;">⚠️ Công ty chưa mở <strong>Phòng Tài Chính</strong> nên sổ sách còn thiếu sót!</div>
             <div style="display:flex;flex-direction:column;gap:0.7cqw;">
               <button id="evA" type="button" style="padding:0.85cqw;border-radius:1cqw;background:#DC2626;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Nộp phạt bổ sung hồ sơ (-$420)</button>
               <button id="evB" type="button" style="padding:0.85cqw;border-radius:1cqw;background:#F4ECE0;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;text-align:left;">B. Xin gia hạn giải trình (-4 ★ Uy tín)</button>
             </div>`
        }
      `);
      if (hasFin) {
        document.getElementById('evFinPass').onclick = () => {
          state.money += 300; state.stars += 4; state.pendingEvent = null; AUD.playSFX('cash'); closeModal();
          autoSave();
          showToast(`${TICK_SVG}Vượt qua Thanh tra Thuế! +$300 & +4 ★`); renderHUD();
        };
      } else {
        document.getElementById('evA').onclick = () => { if (state.money < 420) return showToast('Không đủ $420 tiền mặt — hãy chọn phương án B!'); state.money -= 420; state.pendingEvent = null; closeModal(); autoSave(); showToast('Đã nộp phạt bổ sung -$420. Hãy sớm mở Phòng Tài Chính!'); renderHUD(); };
        document.getElementById('evB').onclick = () => { state.stars = Math.max(0, state.stars - 4); state.pendingEvent = null; closeModal(); autoSave(); showToast('Đã gia hạn giải trình (-4 ★ Uy tín).'); renderHUD(); };
      }
    } else if (kind === 'industry_boom') {
      openModal('🚀 Cơ Hội Thị Trường: Làn Sóng Khách Hàng Mới', `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Nhu cầu thị trường bất ngờ tăng mạnh hôm nay! Cổ phiếu <strong>[TECH] tăng +12%</strong> và khách hàng sẵn sàng chi tiêu nhiều hơn.</p>
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          <button id="evA" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Tận dụng sóng tự nhiên (Miễn phí · +10% Tinh thần & +2 ★)</button>
          <button id="evB" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#EA580C;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">B. Chi $180 đẩy quảng bá chớp nhoáng (+4 ★ & +30% khách hôm nay)</button>
        </div>
      `);
      if (!isRestore) {
        FIN.updateStockPrices(state, { TECH: 0.12, REAL: 0.05 });
        addNews('🚀 Làn sóng nhu cầu mới: [TECH] tăng mạnh +12%, thị trường khởi sắc!');
        autoSave();
      }
      document.getElementById('evA').onclick = () => {
        state.morale = Math.min(100, state.morale + 10);
        state.stars += 2;
        state.activeEventTag = '🚀 Thị trường khởi sắc (+10% Tinh thần)';
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Đội ngũ hứng khởi đón sóng thị trường (+10% Tinh thần & +2 ★)!`); renderHUD();
      };
      document.getElementById('evB').onclick = () => {
        if (state.money < 180) return showToast('Không đủ $180 tiền mặt — hãy chọn phương án A!');
        state.money -= 180; state.stars += 4;
        state.clientRateDebuff = 1.3;
        state.activeEventTag = '🚀 Quảng bá chớp nhoáng (+30% khách hôm nay)';
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Khách hàng đổ về sảnh! +4 ★ & +30% khách hôm nay!`); renderHUD();
      };
    } else if (kind === 'partner_promo') {
      openModal('🤝 Cơ Hội Đối Tác: Giới Thiệu Khách Hàng', `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Một doanh nghiệp đối tác đánh giá cao <strong>${escapeHtml(state.companyName)}</strong> và đề nghị hợp tác giới thiệu khách hàng chéo trong hôm nay.</p>
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          <button id="evA" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Nhận hoa hồng giới thiệu ngay (+$120 & +1 ★)</button>
          <button id="evB" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#2563EB;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">B. Chi $150 đồng tài trợ hội thảo (+5% Thương hiệu & +3 ★)</button>
        </div>
      `);
      document.getElementById('evA').onclick = () => {
        state.money += 120; state.stars += 1; AUD.playSFX('cash');
        state.activeEventTag = '🤝 Đối tác giới thiệu (+$120)';
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Nhận hoa hồng đối tác +$120 & +1 ★!`); renderHUD();
      };
      document.getElementById('evB').onclick = () => {
        if (state.money < 150) return showToast('Không đủ $150 tiền mặt — hãy chọn phương án A!');
        state.money -= 150;
        state.brandAwareness = Math.min(100, (state.brandAwareness || 0) + 5);
        state.stars += 3;
        state.activeEventTag = '🤝 Đồng tài trợ hội thảo (+5% Thương hiệu)';
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Thương hiệu lan tỏa (+5% Nhận diện & +3 ★)!`); renderHUD();
      };
    } else {
      openModal('📉 Biến Cố Vĩ Mô: Thị Trường Rung Lắc Mạnh', `
        <p style="color:#5C4636;margin:0 0 1.1cqw 0;line-height:1.45;">Kinh tế chung chững lại trong ngày: lượng khách ghé sảnh giảm 30%, mã <strong>[TECH]/[REAL]</strong> giảm điểm nhưng <strong>[GOLD] tăng vọt +16%</strong>!</p>
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          <button id="evA" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#4A3426;color:#FFFDF9;font-weight:800;border:none;cursor:pointer;text-align:left;">A. Chấp nhận thị trường chậm (mở 🏦 Tài Chính mua Vàng [GOLD])</button>
          <button id="evB" type="button" style="padding:0.9cqw 1.1cqw;border-radius:1cqw;background:#EA580C;color:#fff;font-weight:800;border:none;cursor:pointer;text-align:left;">B. Chi $250 khuyến mãi giữ lượng khách 100% hôm nay (+3 ★)</button>
        </div>
      `);
      if (!isRestore) {
        FIN.updateStockPrices(state, { TECH: -0.14, REAL: -0.10, GOLD: 0.16 });
        addNews('📉 Biến cố thị trường: [GOLD] tăng mạnh +16%, [TECH]/[REAL] giảm điểm!');
        autoSave();
      }
      document.getElementById('evA').onclick = () => {
        state.clientRateDebuff = 0.7;
        state.activeEventTag = '📉 Thị trường chững (-30% khách · [GOLD] +16%)';
        state.pendingEvent = null;
        closeModal(); autoSave(); renderHUD();
      };
      document.getElementById('evB').onclick = () => {
        if (state.money < 250) return showToast('Không đủ $250 tiền mặt — hãy chọn phương án A!');
        state.money -= 250; state.stars += 3;
        state.pendingEvent = null;
        closeModal(); autoSave(); showToast(`${TICK_SVG}Tung khuyến mãi thành công! Lượng khách giữ ổn định (+3 ★).`); renderHUD();
      };
    }
  }

  // ==================== 17:00 DAILY CLOSING (RUSH PENALTIES + FINANCE DISCOUNT) ====================
  function processEndOfDay() {
    if (state.dailyClosed) return;
    state.dailyClosed = true;
    dismissAllClients();

    // Lỗi P4: Auto-collect all finished-but-uncollected contracts before daily P&L & bankruptcy check
    let autoCollectedCash = 0;
    let autoCollectedStars = 0;
    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (rs && rs.unlocked && rs.job && rs.job.ready) {
        const j = rs.job;
        const st = (typeof j.stars === 'number' && j.stars > 0) ? j.stars : (j.tier === 'mega' ? 5 : (j.isVIP ? 3 : 2));
        autoCollectedCash += j.reward;
        autoCollectedStars += st;
        if (!state.roomStats) state.roomStats = {};
        if (!state.roomStats[rc.id]) state.roomStats[rc.id] = [0, 0];
        state.roomStats[rc.id][1] = (state.roomStats[rc.id][1] || 0) + Math.round(j.reward || 0);
        deliverRoomJob(rc.id);
      }
    });
    if (autoCollectedCash > 0) {
      showToast(`${TICK_SVG}Đã tự động thu hợp đồng hoàn thành cuối ngày: +${FIN.fmtMoney(autoCollectedCash)} & +${autoCollectedStars} ★`);
    }

    agents.forEach((a, i) => {
      if (a.role === 'staff' && !a.sickToday) {
        a.wait = i * 0.25;
        sendAgent(a, 'outside', '👋');
      }
    });

    // Unfinished jobs are KEPT into the next day; Rush jobs accepted right before closing (<25m left & <15% progress) carry over without penalty, while earlier overdue Rush jobs incur fair penalty and continue next day as normal (never silently deleted)
    let rushPenalty = 0;
    let rushStarsLost = 0;
    let keptJobsCount = 0;
    const closeMinEod = state.overtimeActive ? 1080 : 1020;
    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (!rs.job || rs.job.ready) return;
      if (rs.job.tier === 'rush') {
        const acceptedLate = (rs.job.acceptedAtMin || 0) >= (closeMinEod - 25) && (rs.job.progress || 0) < 15;
        if (!acceptedLate) {
          rushPenalty += (rs.job.penalty || Math.min(250, Math.round(rs.job.reward * 0.5)));
          rushStarsLost += 2;
          state.stars = Math.max(0, state.stars - 2);
          rs.job.tier = 'normal';
        }
        keptJobsCount += 1;
      } else {
        keptJobsCount += 1;
      }
    });
    state.dayPenalty = rushPenalty;

    if (state.marketingCampaign) {
      state.marketingCampaign.daysLeft -= 1;
      if (state.marketingCampaign.daysLeft <= 0) state.marketingCampaign = null;
    }

    let totalRent = 0, totalSalary = 0;
    CFG.ROOMS.forEach(rc => {
      const rs = state.rooms[rc.id];
      if (rs.unlocked) { totalRent += rc.dailyRent; totalSalary += rc.staffSalary * rs.staff; }
    });

    // Finance Room + Prestige fixed_cost operating cost discount!
    const hasFin = state.rooms.finance.unlocked;
    const finDiscountRate = hasFin ? Math.min(0.30, 0.12 + state.rooms.finance.equipLv * 0.03) : 0;
    const prestigeFixedLv = PRS ? PRS.getActiveLevel(state, 'fixed_cost') : 0;
    const discountRate = Math.min(0.60, finDiscountRate + prestigeFixedLv * 0.10);
    const savedCost = Math.round((totalRent + totalSalary) * discountRate);
    const finalOpCost = totalRent + totalSalary - savedCost;

    let loanPayment = 0;
    if (state.loan) {
      loanPayment = state.loan.dailyPay;
      state.loan.daysLeft -= 1;
      if (state.loan.daysLeft <= 0) state.loan = null;
    }

    const flexRate = hasFin ? 0.02 : 0.015;
    const fixRate = hasFin ? 0.045 : 0.04;
    const flexInt = Math.round(state.savings.flex * flexRate);
    state.savings.flex += flexInt;
    let fixedInt = 0;
    if (state.savings.fixed > 0) {
      fixedInt = Math.round(state.savings.fixed * fixRate);
      state.savings.fixed += fixedInt;
      state.savings.fixedDaysLeft = Math.max(0, state.savings.fixedDaysLeft - 1);
    }

    const dividend = CFG.BRANCHES[state.branchIdx].dividend;
    const prodIncome = EMP.getDailyProductIncome(state);
    const rivalDiv = EMP.getDailyRivalDividend(state);
    const passiveTotal = dividend + prodIncome + rivalDiv;
    const netProfitToday = state.dayRevenue + passiveTotal - finalOpCost - loanPayment - rushPenalty;
    const investorShare = (netProfitToday > 0 && state.investorEquity > 0)
      ? Math.round(netProfitToday * (state.investorEquity / 100))
      : 0;
    state.money += (passiveTotal - finalOpCost - loanPayment - rushPenalty - investorShare);
    // Own stock reflects daily profitability after IPO
    if (state.ipoDone) {
      const ownSt = state.stocks.find(x => x.isOwn);
      if (ownSt) ownSt.nextBias = netProfitToday > 0 ? 0.09 : -0.06;
    }

    if (state.money < 0) state.debtDays += 1;
    else state.debtDays = 0;

    const nw = FIN.getNetWorth(state);
    if (nw > state.peakNetWorth) state.peakNetWorth = nw;
    autoSave();
    renderHUD();

    if (state.debtDays >= 2 || state.money < -3000) {
      state.isBankrupt = true;
      autoSave();
      showBankruptcyScreen();
      return;
    }

    openModal(`📊 Chốt Sổ Ngày ${state.day} — ${escapeHtml(state.companyName)}`, `
      <div style="background:#FAF6F0;border:0.12cqw solid #DFD2C1;border-radius:1.1cqw;padding:1cqw;display:flex;flex-direction:column;gap:0.5cqw;">
        <div style="display:flex;justify-content:space-between;"><span>Doanh thu chốt đơn hôm nay <em style="color:#7C6350;font-size:0.92em;">(đã cộng vào quỹ trong ngày)</em></span><strong style="color:#059669;">+${FIN.fmtMoney(state.dayRevenue)}</strong></div>
        ${dividend > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Cổ tức Chi nhánh toàn cầu</span><strong style="color:#059669;">+${FIN.fmtMoney(dividend)}</strong></div>` : ''}
        ${prodIncome > 0 ? `<div style="display:flex;justify-content:space-between;"><span>🚀 Doanh thu Sản Phẩm riêng</span><strong style="color:#059669;">+${FIN.fmtMoney(prodIncome)}</strong></div>` : ''}
        ${rivalDiv > 0 ? `<div style="display:flex;justify-content:space-between;"><span>🏢 Cổ tức Thâu tóm M&A</span><strong style="color:#059669;">+${FIN.fmtMoney(rivalDiv)}</strong></div>` : ''}
        ${(flexInt + fixedInt) > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Lãi tiết kiệm ngân hàng</span><strong style="color:#059669;">+${FIN.fmtMoney(flexInt + fixedInt)}</strong></div>` : ''}
        <div style="display:flex;justify-content:space-between;"><span>Thuê mặt bằng & Lương NV ${savedCost > 0 ? `<em style="color:#059669;">(P.Tài Chính giảm ${FIN.fmtMoney(savedCost)})</em>` : ''}</span><strong style="color:#DC2626;">-${FIN.fmtMoney(finalOpCost)}</strong></div>
        ${loanPayment > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Trả góp Ngân hàng</span><strong style="color:#DC2626;">-${FIN.fmtMoney(loanPayment)}</strong></div>` : ''}
        ${rushPenalty > 0 ? `<div style="display:flex;justify-content:space-between;"><span>⚡ Phạt trễ hạn đơn Hỏa Tốc (−${rushStarsLost} ★ · chuyển làm tiếp ngày mai)</span><strong style="color:#DC2626;">-${FIN.fmtMoney(rushPenalty)}</strong></div>` : ''}
        ${investorShare > 0 ? `<div style="display:flex;justify-content:space-between;"><span>🤝 Chia lãi Nhà đầu tư (${state.investorEquity}%)</span><strong style="color:#C2410C;">-${FIN.fmtMoney(investorShare)}</strong></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:1.02cqw;color:#6B5443;padding-top:0.35cqw;border-top:0.1cqw dashed #DFD2C1;">
          <span>Chênh lệch chốt sổ cuối ngày (thu thụ động − chi phí)</span>
          <strong style="color:${(passiveTotal - finalOpCost - loanPayment - rushPenalty - investorShare) >= 0 ? '#059669' : '#DC2626'};">${(passiveTotal - finalOpCost - loanPayment - rushPenalty - investorShare) >= 0 ? '+' : ''}${FIN.fmtMoney(passiveTotal - finalOpCost - loanPayment - rushPenalty - investorShare)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:0.55cqw;border-top:0.12cqw solid #D8C7B2;font-weight:900;font-size:1.35cqw;">
          <span>Số dư tiền mặt hiện tại</span>
          <span style="color:${state.money >= 0 ? '#059669' : '#DC2626'};">${FIN.fmtMoney(state.money)}</span>
        </div>
      </div>
      <div style="margin-top:0.55cqw;padding:0.45cqw 0.85cqw;border-radius:0.8cqw;background:#F8FAFC;border:0.1cqw solid #E2E8F0;color:#475569;font-size:0.98cqw;font-weight:700;">📊 Thống kê hôm nay: Đã nhận <strong>${state.dayAcceptedCount || 0}</strong> đơn · Hết hạn <strong>${state.dayExpiredCount || 0}</strong> đơn</div>
      ${keptJobsCount > 0 ? `<div style="margin-top:0.65cqw;padding:0.55cqw 0.85cqw;border-radius:0.85cqw;background:#EFF6FF;color:#1E40AF;font-weight:700;font-size:1.05cqw;">📋 Có ${keptJobsCount} hợp đồng đang làm dở được giữ nguyên sang Ngày ${state.day + 1}.</div>` : ''}
      ${state.money < 0 ? `<div style="margin-top:0.75cqw;padding:0.7cqw;border-radius:0.9cqw;background:#FEF2F2;color:#B91C1C;font-weight:800;line-height:1.4;">⚠️ CẢNH BÁO NỢ (${state.debtDays}/2 NGÀY CHỐT SỔ): Ngày âm quỹ được tính theo số dư <u>tại thời điểm chốt sổ cuối ngày</u> (dù trong ngày có lúc dương trở lại). Âm 2 kỳ chốt sổ liên tiếp sẽ phá sản — hãy bán cổ phiếu, rút tiết kiệm hoặc chạy đơn gấp ngày mai!</div>` : ''}
      <div style="display:flex;gap:0.75cqw;margin-top:1cqw;">
        <button id="btnStayNight" type="button" style="flex:1;padding:0.85cqw;border-radius:1cqw;background:#F4ECE0;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">🛠️ Ở lại nâng cấp</button>
        <button id="btnGoNextDay" type="button" style="flex:1.4;padding:0.85cqw;border-radius:1cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">🌅 Sang Ngày ${state.day + 1} (08:00)</button>
      </div>
    `);
    document.getElementById('btnStayNight').onclick = closeModal;
    document.getElementById('btnGoNextDay').onclick = startNextDay;
  }

  function showBankruptcyScreen() {
    AUD.playSFX('alert');
    const sharePct = EMP.getMarketShare(state);
    openModal('💥 Tuyên Bố Phá Sản — Kết Thúc', `
      <div style="text-align:center;padding:0.6cqw 0;">
        <div style="font-size:2.8cqw;">🏦</div>
        <div style="font-size:1.48cqw;font-weight:900;color:#DC2626;margin-top:0.25cqw;">${escapeHtml(state.companyName)} đã phá sản (${state.money < -3000 ? 'nợ vượt quá -$3,000' : 'số dư lúc chốt sổ cuối ngày âm 2 ngày liên tiếp'})!</div>
        <p style="font-size:1.05cqw;color:#6B5443;margin:0.35cqw 0 0.85cqw 0;">Ngân hàng đã niêm phong văn phòng. Bạn có thể xem lại thành tích hành trình hoặc bắt đầu khởi nghiệp lại từ Ngày 1.</p>
        <div style="background:#FAF6F0;border-radius:1.1cqw;padding:0.95cqw;border:0.12cqw solid #DFD2C1;text-align:left;margin-bottom:1cqw;">
          <div>CEO: <strong>${escapeHtml(state.ceoName)}</strong> · Trụ vững: <strong>${state.day} ngày</strong></div>
          <div>Hợp đồng hoàn thành: <strong>${state.contractsDone} đơn</strong> · Đỉnh tài sản: <strong>${FIN.fmtMoney(state.peakNetWorth)}</strong> · Thị phần: <strong>${sharePct}%</strong></div>
        </div>
        <div style="display:flex;gap:0.7cqw;">
          <button id="btnViewBankruptCert" type="button" style="flex:1;padding:0.9cqw;border-radius:1cqw;background:#EFE6DA;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">🏆 Xem thành tích</button>
          <button id="btnRestartAfterBankrupt" type="button" style="flex:1.4;padding:0.9cqw;border-radius:1cqw;background:#4A3426;color:#FFFDF9;font-weight:900;border:none;cursor:pointer;">🔄 Chơi lại từ đầu</button>
        </div>
      </div>
    `);
    document.getElementById('btnCloseModal').classList.add('hidden');
    document.getElementById('btnViewBankruptCert').onclick = () => {
      QST.downloadIPOCertificatePNG(state, sharePct);
      showToast(`${TICK_SVG}Đã tải ảnh thành tích hành trình PNG!`);
    };
    document.getElementById('btnRestartAfterBankrupt').onclick = () => {
      try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) {}
      document.getElementById('btnCloseModal').classList.remove('hidden');
      closeModal(); showIntroScreen();
    };
  }

  function startNextDay() {
    if (state && state.isBankrupt) { showBankruptcyScreen(); return; }
    closeModal();
    state.day += 1;
    state.minutes = 474;
    state.dayRevenue = 0;
    state.dayAcceptedCount = 0;
    state.dayExpiredCount = 0;
    state.dayPenalty = 0;
    state.dailyCompletedJobs = [];
    state.dailyQuests = QST.generateDailyQuests(state.day);
    state.disabledRoomId = null;
    state.sickStaffRoomId = null;
    state.clientRateDebuff = 1;
    state.activeEventTag = '';
    state.eventTriggeredToday = false;
    state.pendingEvent = null;
    state.overtimeActive = false;
    state.happyHourCooldown = 0;
    state.dailyClosed = false;
    state.lastStockHour = 8;
    FIN.updateStockPrices(state, EMP.getSeason(state.day).stockBias);
    generateDailyNews();
    AUD.setNight(false);
    AUD.playSFX('bell');
    agents.forEach((a, i) => {
      if (a.role === 'staff') {
        a.sickToday = false;
        a.node = 'outside';
        a.x = CFG.NODES.outside.x;
        a.y = CFG.NODES.outside.y;
        a.wait = i * 0.4;
        sendAgent(a, a.home, '⏰');
      }
    });
    autoSave(); renderHUD(); renderMapOverlays();
    showToast(`🌅 Ngày ${state.day} bắt đầu! Toàn bộ nhân sự đang vào cửa chấm công.`);
  }

  // ==================== MODALS ====================
  function openMarketingModal() {
    openModal('📣 Trung Tâm Marketing', MKT.buildMarketingModalHTML(state));
    document.querySelectorAll('[data-run-mkt]').forEach(btn => {
      btn.onclick = () => {
        const c = CFG.MARKETING_CAMPAIGNS.find(x => x.id === btn.dataset.runMkt);
        if (!c || state.marketingCampaign) return;
        if (state.money < c.cost) return showToast(`Cần ${FIN.fmtMoney(c.cost)} để chạy chiến dịch này!`);
        state.money -= c.cost;
        state.stars += c.starsGain;
        state.brandAwareness = Math.min(100, (state.brandAwareness || 0) + c.brandGain);
        recordQuestProgress('action', 1);
        state.marketingCampaign = { id: c.id, name: c.name, icon: c.icon, daysLeft: c.days, spawnBoost: c.spawnBoost, rewardMult: c.rewardMult, vipChance: c.vipChance };
        AUD.playSFX('unlock'); advanceTutorial(4); autoSave(); renderHUD(); openMarketingModal();
        showToast(`${TICK_SVG}Đã bật "${c.name}" (+${c.starsGain} ★)!`);
      };
    });
  }

  function openFinanceModal(tab = activeModalTab) {
    activeModalTab = tab;
    openModal('🏦 Trung Tâm Tài Chính', FIN.buildFinanceModalHTML(state, activeModalTab));
    const hasFin = state.rooms.finance.unlocked;

    document.querySelectorAll('[data-fin-tab]').forEach(b => { b.onclick = () => openFinanceModal(b.dataset.finTab); });
    document.querySelectorAll('[data-take-loan]').forEach(b => {
      b.onclick = () => {
        const l = CFG.LOANS.find(x => x.id === b.dataset.takeLoan);
        if (!l || state.loan) return;
        const adjPay = hasFin ? Math.round(l.dailyPay * 0.92) : l.dailyPay;
        state.money += l.amount;
        state.loan = { name: l.name, dailyPay: adjPay, daysLeft: l.days };
        AUD.playSFX('cash'); autoSave(); renderHUD(); renderMapOverlays(); openFinanceModal('loan');
        showToast(`${TICK_SVG}Đã giải ngân ${FIN.fmtMoney(l.amount)}!`);
      };
    });
    document.querySelectorAll('[data-take-fund]').forEach(b => {
      b.onclick = () => {
        const f = CFG.FUNDING_ROUNDS.find(x => x.id === b.dataset.takeFund);
        if (!f || state.fundingTaken.includes(f.id)) return;
        state.money += f.amount;
        state.investorEquity = Math.min(45, (state.investorEquity || 0) + f.equity);
        state.fundingTaken.push(f.id);
        AUD.playSFX('cash');
        autoSave(); renderHUD(); renderMapOverlays(); openFinanceModal('funding');
        showToast(`${TICK_SVG}Nhận vốn ${FIN.fmtMoney(f.amount)} từ ${f.name} (chia ${f.equity}% tiền lời)!`);
      };
    });
    const btnBuyback = document.getElementById('btnBuybackEq');
    if (btnBuyback) {
      btnBuyback.onclick = () => {
        const cost = FIN.getBuyback5Cost(state);
        if (state.money < cost) return showToast(`Cần ${FIN.fmtMoney(cost)} để mua lại 5% cổ phần!`);
        state.money -= cost;
        state.investorEquity = Math.max(0, (state.investorEquity || 0) - 5);
        AUD.playSFX('unlock');
        autoSave(); renderHUD(); openFinanceModal('funding');
        showToast(`${TICK_SVG}Đã mua lại 5% cổ phần! Bạn hiện nắm ${100 - state.investorEquity}% công ty.`);
      };
    }

    const btnPayoff = document.getElementById('btnPayoffLoan');
    if (btnPayoff) {
      btnPayoff.onclick = () => {
        const remain = state.loan.dailyPay * state.loan.daysLeft;
        if (state.money < remain) return showToast('Chưa đủ tiền mặt để tất toán sớm!');
        state.money -= remain; state.loan = null;
        AUD.playSFX('unlock'); autoSave(); renderHUD(); openFinanceModal('loan');
        showToast(`${TICK_SVG}Đã tất toán sạch nợ ngân hàng!`);
      };
    }
    document.querySelectorAll('[data-sav-act]').forEach(b => {
      b.onclick = () => {
        const act = b.dataset.savAct;
        if (act === 'dep_flex_500') {
          if (state.money < 500) return showToast('Cần $500 để gửi tiết kiệm!');
          state.money -= 500; state.savings.flex += 500; AUD.playSFX('click');
        } else if (act === 'wd_flex_all') {
          if (state.savings.flex <= 0) return;
          state.money += state.savings.flex; state.savings.flex = 0; AUD.playSFX('cash');
        } else if (act === 'dep_fixed_1000') {
          if (state.money < 1000) return showToast('Cần $1,000 để gửi kỳ hạn 3 ngày!');
          state.money -= 1000; state.savings.fixed += 1000; state.savings.fixedDaysLeft = 3; AUD.playSFX('click');
        } else if (act === 'wd_fixed_all') {
          if (state.savings.fixed <= 0) return;
          const pen = state.savings.fixedDaysLeft > 0 ? 0.92 : 1;
          state.money += Math.round(state.savings.fixed * pen);
          state.savings.fixed = 0; state.savings.fixedDaysLeft = 0; AUD.playSFX('cash');
        }
        autoSave(); renderHUD(); openFinanceModal('savings');
      };
    });
    document.querySelectorAll('[data-stk-buy], [data-stk-buy5], [data-stk-sell1], [data-stk-sell]').forEach(b => {
      b.onclick = () => {
        const sym = b.dataset.stkBuy || b.dataset.stkBuy5 || b.dataset.stkSell1 || b.dataset.stkSell;
        const st = state.stocks.find(x => x.symbol === sym);
        if (!st) return;
        if (b.dataset.stkBuy || b.dataset.stkBuy5) {
          const qty = b.dataset.stkBuy5 ? 5 : 1;
          const cost = st.price * qty;
          if (state.money < cost) return showToast(`Cần ${FIN.fmtMoney(cost)} để mua ${qty} CP [${sym}]!`);
          const prevTot = (st.shares || 0) * (st.avgCost || 0);
          st.shares = (st.shares || 0) + qty;
          st.avgCost = (prevTot + cost) / st.shares;
          state.money -= cost; recordQuestProgress('action', 1); AUD.playSFX('click');
        } else if (b.dataset.stkSell1) {
          if (!st.shares || st.shares < 1) return showToast(`Bạn chưa có cổ phiếu [${sym}] để bán!`);
          st.shares -= 1;
          if (st.shares === 0) st.avgCost = 0;
          state.money += st.price; AUD.playSFX('cash');
          showToast(`${TICK_SVG}Đã bán 1 CP [${sym}] thu về ${FIN.fmtMoney(st.price)}!`);
        } else {
          if (!st.shares) return showToast(`Bạn chưa có cổ phiếu [${sym}] để bán!`);
          const soldQty = st.shares;
          const gain = soldQty * st.price;
          state.money += gain; st.shares = 0; st.avgCost = 0; AUD.playSFX('cash');
          showToast(`${TICK_SVG}Đã bán hết ${soldQty} CP [${sym}] thu về ${FIN.fmtMoney(gain)}!`);
        }
        autoSave(); renderHUD(); openFinanceModal('stocks');
      };
    });
  }


  function openHallOfFameModal() {
    if (!PRS) return;
    if (!state) {
      const saved = loadSavedFromStorage();
      state = saved || createFreshState('Minh Founder', 'Nova Tech', 'ceo');
    }
    PRS.ensurePrestige(state);
    openModal('🏛️ Sảnh Danh Vọng — Di Sản Doanh Nhân', PRS.buildHallOfFameHTML(state));
  }

  function openRoomChoiceForPerkModal(perkDef, cost, nextTier) {
    const p = PRS.ensurePrestige(state);
    const candidates = PRS.getLockableRooms().filter(r => !p.chosenRooms.includes(r.id));
    if (!candidates.length) {
      showToast('Tất cả các phòng ban khóa ban đầu đều đã được chọn!');
      return;
    }
    openModal('🏢 Chọn Phòng Ban Mở Khóa Sẵn', `
      <p style="color:#5C4636;margin:0 0 0.85cqw 0;line-height:1.4;">
        Chọn <strong>1 phòng ban</strong> để tự động mở khóa miễn phí ngay từ <strong>Ngày 1</strong> ở mọi lần khởi nghiệp sau (Cấp ${nextTier} · Giá <strong>${cost} Điểm Di Sản</strong>):
      </p>
      <div style="display:flex;flex-direction:column;gap:0.55cqw;">
        ${candidates.map(r => `
          <button data-pick-prestige-room="${r.id}" type="button" style="padding:0.75cqw 0.95cqw;border-radius:0.95cqw;background:#FAF6F0;border:0.13cqw solid #D8C7B2;color:#3D2B1F;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:space-between;text-align:left;">
            <span>${r.icon} <strong>${r.name}</strong> <span style="font-weight:600;color:#6B5443;font-size:0.96cqw;">(Giá gốc ${FIN.fmtMoney(r.unlockCost)})</span></span>
            <span style="padding:0.3cqw 0.75cqw;border-radius:0.75cqw;background:#059669;color:#fff;font-size:0.94cqw;">Chọn & Mua (${cost} điểm)</span>
          </button>
        `).join('')}
      </div>
      <button id="btnCancelPickRoom" type="button" style="margin-top:0.85cqw;width:100%;padding:0.65cqw;border-radius:0.85cqw;background:#EFE6DA;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">← Quay lại tab IPO</button>
    `);
    document.getElementById('btnCancelPickRoom').onclick = () => openIPOModal('ipo');
    document.querySelectorAll('[data-pick-prestige-room]').forEach(btn => {
      btn.onclick = () => {
        const rid = btn.dataset.pickPrestigeRoom;
        const res = PRS.purchasePerk(state, perkDef.id, rid);
        if (!res.ok) return showToast(`❌ ${res.error}`);
        AUD.playSFX('unlock');
        autoSave();
        renderHUD();
        openIPOModal('ipo');
        showToast(`${TICK_SVG}Đã mở vĩnh viễn "${perkDef.name}" (${PRS.getRoomNameById(rid)})!`);
      };
    });
  }

  function openSellCompanyStep1Modal() {
    if (!state || !state.ipoDone || !PRS) return;
    const p = PRS.ensurePrestige(state);
    const val = PRS.calcSaleValuation(state);
    const nextMaxTier = Math.min(3, 1 + Math.min(2, (p.unlockedTier || 0) + 1));
    openModal('💰 Bán Công Ty & Kế Thừa Di Sản (Bước 1/2)', `
      <div style="padding:0.95cqw 1.05cqw;border-radius:1.05cqw;background:#FFFBEB;border:0.14cqw solid #F59E0B;margin-bottom:0.85cqw;">
        <div style="font-weight:900;font-size:1.18cqw;color:#78350F;margin-bottom:0.45cqw;">📊 Bảng Định Giá Thoái Vốn: ${escapeHtml(state.companyName)} [${escapeHtml(state.ticker)}]</div>
        <div style="display:flex;flex-direction:column;gap:0.35cqw;font-size:1.02cqw;color:#4A3426;">
          <div style="display:flex;justify-content:space-between;"><span>1. Tài sản ròng hiện tại:</span><strong>${FIN.fmtMoney(val.netWorth)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>2. Giá trị thị phần (${val.marketShare}% × ${FIN.fmtMoney(val.coefA)}):</span><strong>+${FIN.fmtMoney(val.sharePart)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>3. Giá trị thương hiệu (${val.stars} ★ × ${FIN.fmtMoney(val.coefB)}):</span><strong>+${FIN.fmtMoney(val.starsPart)}</strong></div>
          <div style="display:flex;justify-content:space-between;padding-top:0.45cqw;border-top:0.12cqw solid #FCD34D;font-size:1.15cqw;font-weight:900;color:#059669;">
            <span>TỔNG ĐỊNH GIÁ BÁN:</span>
            <span>${FIN.fmtMoney(val.valuation)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.45cqw 0.7cqw;border-radius:0.8cqw;background:#FEF3C7;margin-top:0.25cqw;font-weight:900;color:#92400E;">
            <span>Quy đổi Điểm Di Sản (mỗi $100,000 = 1 điểm):</span>
            <span style="font-size:1.22cqw;">+${val.points} Điểm Di Sản</span>
          </div>
        </div>
      </div>
      <div style="padding:0.75cqw 0.95cqw;border-radius:0.95cqw;background:#FEF2F2;border:0.13cqw solid #FECACA;color:#991B1B;font-size:0.98cqw;line-height:1.42;margin-bottom:0.95cqw;">
        ⚠️ <strong>Cảnh báo không thể hoàn tác:</strong> Toàn bộ tiền mặt, phòng ban, nhân sự, cổ phiếu, chi nhánh và tiến độ <strong>Ngày ${state.day}</strong> hiện tại sẽ được đặt lại về <strong>Ngày 1</strong>. Bạn sẽ giữ vĩnh viễn <strong>${p.points + val.points} Điểm Di Sản</strong>, mở khóa tới <strong>Tầng ${nextMaxTier}/3</strong> Cây Đặc Quyền và ghi danh vào <strong>Sảnh Danh Vọng</strong>.
      </div>
      <div style="display:flex;gap:0.7cqw;">
        <button id="btnCancelSell1" type="button" style="flex:1;padding:0.85cqw;border-radius:0.95cqw;background:#EFE6DA;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">Hủy bỏ</button>
        <button id="btnProceedSell2" type="button" style="flex:1.5;padding:0.85cqw;border-radius:0.95cqw;background:linear-gradient(180deg,#D97706,#B45309);color:#fff;font-weight:900;border:none;cursor:pointer;">Tiếp tục xác nhận bán →</button>
      </div>
    `);
    document.getElementById('btnCancelSell1').onclick = () => openIPOModal('ipo');
    document.getElementById('btnProceedSell2').onclick = () => openSellCompanyStep2HoldModal(val);
  }

  function openSellCompanyStep2HoldModal(val) {
    openModal('🔒 Xác Nhận Lần Cuối — Giữ Để Bán Công Ty (Bước 2/2)', `
      <div style="text-align:center;padding:0.5cqw 0;">
        <img src="assets/tokens/legacy.png" alt="Điểm Di Sản" style="width:4.2cqw;height:4.2cqw;object-fit:contain;margin:0 auto 0.45cqw auto;display:block;" />
        <div style="font-size:1.25cqw;font-weight:900;color:#3D2B1F;">Bán ${escapeHtml(state.companyName)} [${escapeHtml(state.ticker)}] với giá ${FIN.fmtMoney(val.valuation)}</div>
        <div style="font-size:1.05cqw;font-weight:800;color:#B45309;margin-top:0.2cqw;">Nhận ngay +${val.points} Điểm Di Sản & Bắt đầu New Game+ từ Ngày 1</div>
        <p style="font-size:0.96cqw;color:#991B1B;font-weight:700;margin:0.55cqw 0 0.9cqw 0;">
          Hành động này không thể hoàn tác trong phiên chơi hiện tại. Hãy <strong>BẤM VÀ GIỮ</strong> nút đỏ bên dưới trong <strong>3 giây</strong> để ký hợp đồng chuyển nhượng!
        </p>
        <div style="position:relative;width:100%;height:3.6cqw;border-radius:1.1cqw;background:#7F1D1D;overflow:hidden;border:0.16cqw solid #FCA5A5;user-select:none;-webkit-user-select:none;">
          <div id="holdSellFill" style="position:absolute;inset:0;width:0%;background:linear-gradient(90deg,#EF4444,#F59E0B);pointer-events:none;"></div>
          <button id="btnHoldConfirmSell" type="button" style="position:relative;z-index:2;width:100%;height:100%;background:transparent;color:#FFFDF9;font-size:1.14cqw;font-weight:900;border:none;cursor:pointer;">
            ✊ BẤM GIỮ 3 GIÂY ĐỂ KÝ BÁN CÔNG TY
          </button>
        </div>
        <button id="btnBackSellStep1" type="button" style="margin-top:0.85cqw;padding:0.55cqw 1.2cqw;border-radius:0.85cqw;background:#EFE6DA;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">← Quay lại</button>
      </div>
    `);

    const btnHold = document.getElementById('btnHoldConfirmSell');
    const fillEl = document.getElementById('holdSellFill');
    let holdRaf = null;
    let holdStart = 0;
    let completed = false;
    const HOLD_MS = 3000;

    const stopHold = () => {
      if (completed) return;
      holdStart = 0;
      if (holdRaf) cancelAnimationFrame(holdRaf);
      holdRaf = null;
      if (fillEl) fillEl.style.width = '0%';
      if (btnHold) btnHold.textContent = '✊ BẤM GIỮ 3 GIÂY ĐỂ KÝ BÁN CÔNG TY';
    };

    const stepHold = (ts) => {
      if (!holdStart || completed) return;
      const elapsed = ts - holdStart;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      if (fillEl) fillEl.style.width = pct.toFixed(1) + '%';
      const rem = Math.max(0, (HOLD_MS - elapsed) / 1000);
      if (btnHold) btnHold.textContent = `⏳ Đang ký hợp đồng... (${rem.toFixed(1)}s)`;
      if (elapsed >= HOLD_MS) {
        completed = true;
        executePrestigeSale(val);
        return;
      }
      holdRaf = requestAnimationFrame(stepHold);
    };

    const startHold = (e) => {
      if (e) e.preventDefault();
      if (completed || holdStart) return;
      holdStart = performance.now();
      AUD.playSFX('click');
      holdRaf = requestAnimationFrame(stepHold);
    };

    btnHold.addEventListener('pointerdown', startHold);
    btnHold.addEventListener('pointerup', stopHold);
    btnHold.addEventListener('pointerleave', stopHold);
    btnHold.addEventListener('pointercancel', stopHold);
    document.getElementById('btnBackSellStep1').onclick = () => { stopHold(); openSellCompanyStep1Modal(); };
  }

  function executePrestigeSale(val) {
    const p = PRS.ensurePrestige(state);
    p.points += val.points;
    p.totalEarned += val.points;
    p.salesCount += 1;
    p.unlockedTier = Math.min(2, (p.unlockedTier || 0) + 1);
    p.hallOfFame.unshift({
      companyName: state.companyName,
      ticker: state.ticker || 'STR',
      valuation: val.valuation,
      day: state.day,
      pointsEarned: val.points,
      ts: Date.now()
    });
    p.hallOfFame.sort((a, b) => b.valuation - a.valuation);

    const prevCeo = state.ceoName;
    const prevAva = state.ceoAvatar;
    state = createFreshState(prevCeo, 'Nova Tech', prevAva, p);
    autoSave();
    AUD.playSFX('unlock');
    closeModal();
    openNewGamePlusSetupModal(val);
  }

  function openNewGamePlusSetupModal(lastSaleVal = null) {
    const p = PRS.ensurePrestige(state);
    const perks = (CFG.PRESTIGE_CFG && CFG.PRESTIGE_CFG.PERKS) || [];
    const ownedPerks = perks.filter(pk => (p.perks[pk.id] || 0) > 0);
    ownedPerks.forEach(pk => {
      if (p.activePerks[pk.id] === undefined) p.activePerks[pk.id] = true;
    });

    const saleBanner = lastSaleVal ? `
      <div style="padding:0.75cqw 0.95cqw;border-radius:0.95cqw;background:#ECFDF5;border:0.13cqw solid #6EE7B7;color:#065F46;margin-bottom:0.85cqw;font-size:1.0cqw;">
        ${TICK_SVG}<strong>Thoái vốn thành công!</strong> Bạn vừa nhận <strong>+${lastSaleVal.points} Điểm Di Sản</strong> (Tổng khả dụng: <strong>${p.points} điểm</strong>). Hãy thiết lập công ty mới cho vòng <strong>Khởi Nghiệp Lại (New Game+)</strong>!
      </div>
    ` : '';

    openModal('🌟 Khởi Nghiệp Lại (New Game+ — Ngày 1)', `
      ${saleBanner}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.7cqw;margin-bottom:0.85cqw;">
        <div>
          <label style="display:block;font-size:0.96cqw;font-weight:800;color:#5C4636;margin-bottom:0.25cqw;">Tên CEO</label>
          <input id="ngpCeoName" type="text" value="${escapeHtml(state.ceoName)}" maxlength="20" style="width:100%;padding:0.58cqw 0.8cqw;border-radius:0.8cqw;border:0.13cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.08cqw;font-weight:700;" />
        </div>
        <div>
          <label style="display:block;font-size:0.96cqw;font-weight:800;color:#5C4636;margin-bottom:0.25cqw;">Tên Công Ty Mới</label>
          <input id="ngpCompName" type="text" value="${escapeHtml(state.companyName)}" maxlength="20" style="width:100%;padding:0.58cqw 0.8cqw;border-radius:0.8cqw;border:0.13cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.08cqw;font-weight:700;" />
        </div>
      </div>

      <div style="padding:0.8cqw 0.95cqw;border-radius:1cqw;background:#FAF6F0;border:0.12cqw solid #DFD2C1;margin-bottom:0.85cqw;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5cqw;">
          <strong style="color:#3D2B1F;font-size:1.05cqw;">✨ Đặc Quyền Vĩnh Viễn Kích Hoạt (Mặc định bật hết)</strong>
          <button id="btnNgpBuyMore" type="button" style="padding:0.35cqw 0.75cqw;border-radius:0.75cqw;background:#D97706;color:#fff;font-weight:800;border:none;cursor:pointer;font-size:0.92cqw;">🌳 Mua thêm đặc quyền (${p.points} điểm)</button>
        </div>
        ${ownedPerks.length === 0 ? `
          <div style="font-size:0.96cqw;color:#6B5443;padding:0.4cqw 0;">Bạn chưa mua đặc quyền nào. Bấm <em>Mua thêm đặc quyền</em> ở trên để dùng <strong>${p.points} Điểm Di Sản</strong> trước khi bắt đầu!</div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:0.45cqw;">
            ${ownedPerks.map(pk => {
              const lv = p.perks[pk.id] || 1;
              const checked = p.activePerks[pk.id] !== false;
              const roomNote = (pk.id === 'unlock_room' && p.chosenRooms.length)
                ? ` — Phòng: <strong>${p.chosenRooms.slice(0, lv).map(PRS.getRoomNameById).join(', ')}</strong>`
                : '';
              return `
                <label style="display:flex;align-items:center;justify-content:space-between;gap:0.7cqw;padding:0.55cqw 0.75cqw;border-radius:0.85cqw;background:#FFFDF9;border:0.12cqw solid #E5D9C8;cursor:pointer;">
                  <div style="display:flex;align-items:center;gap:0.55cqw;">
                    ${PRS.renderPerkIcon(pk, 2.1)}
                    <div>
                      <div style="font-weight:900;color:#3D2B1F;font-size:0.98cqw;">${pk.name} (Cấp ${lv})</div>
                      <div style="font-size:0.88cqw;color:#6B5443;">${pk.desc}${roomNote}</div>
                    </div>
                  </div>
                  <input type="checkbox" data-ngp-perk="${pk.id}" ${checked ? 'checked' : ''} style="width:1.35cqw;height:1.35cqw;accent-color:#059669;cursor:pointer;" />
                </label>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <button id="btnStartNewGamePlus" type="button" style="width:100%;padding:0.92cqw;border-radius:1cqw;background:linear-gradient(180deg,#10B981,#047857);color:#fff;font-size:1.18cqw;font-weight:900;border:none;cursor:pointer;">
        🚀 Khởi Nghiệp Lại Từ Ngày 1
      </button>
    `);
    document.getElementById('btnCloseModal').classList.add('hidden');

    document.getElementById('btnNgpBuyMore').onclick = () => {
      document.getElementById('btnCloseModal').classList.remove('hidden');
      openIPOModal('ipo');
    };
    document.querySelectorAll('[data-ngp-perk]').forEach(cb => {
      cb.onchange = () => {
        p.activePerks[cb.dataset.ngpPerk] = cb.checked;
        autoSave();
      };
    });
    document.getElementById('btnStartNewGamePlus').onclick = () => {
      const ceo = (document.getElementById('ngpCeoName').value || '').trim() || state.ceoName;
      const comp = (document.getElementById('ngpCompName').value || '').trim() || 'Nova Tech';
      const fresh = createFreshState(ceo, comp, state.ceoAvatar, p);
      applyStartingPrestigePerks(fresh);
      state = fresh;
      document.getElementById('btnCloseModal').classList.remove('hidden');
      closeModal();
      beginGameplay(true);
    };
  }

  function openIPOModal(tab = activeEmpireTab) {
    activeEmpireTab = tab;
    openModal('🌍 Tập Đoàn — Sản Phẩm · M&A · IPO', EMP.buildEmpireModalHTML(state, activeEmpireTab, TICK_SVG));

    document.querySelectorAll('[data-emp-tab]').forEach(b => { b.onclick = () => openIPOModal(b.dataset.empTab); });

    document.querySelectorAll('[data-prod-act]').forEach(b => {
      b.onclick = () => {
        const p = CFG.PRODUCTS.find(x => x.id === b.dataset.prodAct);
        if (!p) return;
        const lv = (state.products[p.id] || 0);
        if (lv >= 5) return;
        const cost = lv === 0 ? p.cost : Math.round(p.cost * Math.pow(1.65, lv));
        if (state.money < cost) return showToast(`Cần ${FIN.fmtMoney(cost)} để ${lv === 0 ? 'ra mắt' : 'nâng cấp'} ${p.name}!`);
        state.money -= cost;
        state.products[p.id] = lv + 1;
        state.stars += (lv === 0 ? 5 : 2);
        AUD.playSFX('unlock');
        autoSave(); renderHUD(); openIPOModal('products');
        showToast(`${TICK_SVG}${lv === 0 ? 'Đã ra mắt' : 'Đã nâng cấp'} ${p.name} v${lv + 1}.0!`);
      };
    });

    document.querySelectorAll('[data-buy-rival]').forEach(b => {
      b.onclick = () => {
        const r = CFG.RIVALS.find(x => x.id === b.dataset.buyRival);
        if (!r || state.acquiredRivals.includes(r.id)) return;
        if (state.money < r.cost) return showToast(`Cần ${FIN.fmtMoney(r.cost)} để thâu tóm ${r.name}!`);
        state.money -= r.cost;
        state.acquiredRivals.push(r.id);
        state.stars += 8;
        AUD.playSFX('unlock');
        autoSave(); renderHUD(); openIPOModal('rivals');
        showToast(`${TICK_SVG}Thâu tóm thành công ${r.name} (+${r.share}% thị phần & +${FIN.fmtMoney(r.dividend)}/ngày)!`);
      };
    });

    const btnIPO = document.getElementById('btnDoIPO');
    if (btnIPO && !btnIPO.disabled) {
      btnIPO.onclick = () => {
        const tickerGuess = (state.companyName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'STR');
        const ipoCash = Math.round(35000 * (100 - (state.investorEquity || 0)) / 100);
        state.ipoDone = true;
        state.ticker = tickerGuess;
        state.money += ipoCash;
        // List player's own company stock onto the live Stock Market!
        if (!state.stocks.some(st => st.symbol === tickerGuess)) {
          state.stocks.unshift({
            symbol: tickerGuess, name: state.companyName + ' (Của bạn)', price: 100, prevPrice: 100,
            volatility: 0.08, history: [95, 97, 98, 99, 100], color: '#10B981', shares: 0, avgCost: 0, nextBias: 0.06, isOwn: true
          });
        }
        AUD.playSFX('unlock'); autoSave(); renderHUD(); openIPOModal('ipo');
        showToast(`${TICK_SVG}${escapeHtml(state.companyName)} [${tickerGuess}] IPO thành công (+${FIN.fmtMoney(ipoCash)})!`);
      };
    }

    document.querySelectorAll('[data-expand-branch]').forEach(b => {
      b.onclick = () => {
        const idx = Number(b.dataset.expandBranch);
        state.branchIdx = idx;
        state.maxBranchIdx = Math.max(state.maxBranchIdx || 0, idx);
        state.activeMapIdx = idx;
        applyBranchMap();
        AUD.playSFX('unlock'); autoSave(); openIPOModal('ipo');
        showToast(`${TICK_SVG}Đã chuyển trụ sở sang ${CFG.BRANCHES[idx].name}!`);
      };
    });
    document.querySelectorAll('[data-switch-map]').forEach(b => {
      b.onclick = () => {
        const idx = Number(b.dataset.switchMap);
        state.activeMapIdx = idx;
        applyBranchMap();
        AUD.playSFX('click'); autoSave(); openIPOModal('ipo');
        showToast(`${TICK_SVG}Đã chuyển sang mặt bằng ${CFG.BRANCHES[idx].name}!`);
      };
    });
    const btnSell = document.getElementById('btnSellCompany');
    if (btnSell) btnSell.onclick = () => openSellCompanyStep1Modal();
    const btnHof = document.getElementById('btnOpenHallOfFame');
    if (btnHof) btnHof.onclick = () => openHallOfFameModal();
    document.querySelectorAll('[data-buy-perk]').forEach(b => {
      b.onclick = () => {
        if (!PRS) return;
        const perkId = b.dataset.buyPerk;
        const perkDef = (CFG.PRESTIGE_CFG.PERKS || []).find(x => x.id === perkId);
        if (!perkDef) return;
        const maxTier = PRS.getMaxReachableTier(state);
        const ownedLv = PRS.getOwnedLevel(state, perkId);
        const nextTier = ownedLv + 1;
        const cost = PRS.getPerkCost(perkDef, Math.min(3, nextTier));
        if (perkId === 'unlock_room') {
          if (perkDef.tier > maxTier || ownedLv >= maxTier) return showToast('❌ Đặc quyền phòng ban chưa khả dụng ở tầng này!');
          if ((PRS.ensurePrestige(state).points || 0) < cost) return showToast(`❌ Cần ${cost} Điểm Di Sản để mua đặc quyền này!`);
          openRoomChoiceForPerkModal(perkDef, cost, nextTier);
          return;
        }
        const res = PRS.purchasePerk(state, perkId, null);
        if (!res.ok) return showToast(`❌ ${res.error}`);
        AUD.playSFX('unlock');
        autoSave();
        renderHUD();
        openIPOModal('ipo');
        showToast(`${TICK_SVG}Đã sở hữu vĩnh viễn "${res.perkDef.name}" (Cấp ${res.nextTier})!`);
      };
    });
  }

  function openSettingsModal(tab = activeSettingsTab) {
    activeSettingsTab = (tab === 'profile') ? 'profile' : 'general';
    const code = encodeSaveCode(state);
    const tabsBar = `
      <div style="display:flex;gap:0.55cqw;margin-bottom:0.95cqw;">
        <button data-set-tab="general" type="button" style="flex:1;padding:0.65cqw;border-radius:0.9cqw;font-size:1.08cqw;font-weight:800;border:none;cursor:pointer;${activeSettingsTab === 'general' ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">⚙️ Cài Đặt & Mã Lưu</button>
        <button data-set-tab="profile" type="button" style="flex:1;padding:0.65cqw;border-radius:0.9cqw;font-size:1.08cqw;font-weight:800;border:none;cursor:pointer;${activeSettingsTab === 'profile' ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">👤 Hồ Sơ</button>
      </div>
    `;

    let tabBody = '';
    if (activeSettingsTab === 'profile') {
      tabBody = `
        <div style="padding:1.1cqw;border-radius:1.15cqw;background:#FAF6F0;border:0.12cqw solid #D8C7B2;">
          <div style="display:flex;align-items:center;gap:1.1cqw;margin-bottom:1cqw;">
            <div style="width:5.4cqw;height:5.4cqw;border-radius:999px;border:0.22cqw solid #D97706;background:#F4ECE0;overflow:hidden;flex-shrink:0;padding:0.2cqw;">
              ${AVA.renderTokenImg(state.ceoAvatar || 'ceo', escapeHtml(state.ceoName))}
            </div>
            <div style="min-width:0;">
              <div style="font-size:1.25cqw;font-weight:900;color:#3D2B1F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(state.companyName)}${state.ipoDone ? ' [' + escapeHtml(state.ticker) + ']' : ''}</div>
              <div style="font-size:1.02cqw;color:#6B5443;font-weight:700;">CEO: ${escapeHtml(state.ceoName)} · Ngày ${state.day}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.75cqw;">
            <div>
              <label for="profCompName" style="display:block;font-size:1.0cqw;font-weight:800;color:#5C4636;margin-bottom:0.3cqw;">Tên công ty (1–24 ký tự)</label>
              <input id="profCompName" type="text" maxlength="24" value="${escapeHtml(state.companyName)}" placeholder="Nhập tên công ty..." style="width:100%;padding:0.65cqw 0.85cqw;border-radius:0.85cqw;border:0.13cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.08cqw;font-weight:700;box-sizing:border-box;" />
            </div>
            <div>
              <label for="profCeoName" style="display:block;font-size:1.0cqw;font-weight:800;color:#5C4636;margin-bottom:0.3cqw;">Tên người chơi / CEO (1–24 ký tự)</label>
              <input id="profCeoName" type="text" maxlength="24" value="${escapeHtml(state.ceoName)}" placeholder="Nhập tên CEO..." style="width:100%;padding:0.65cqw 0.85cqw;border-radius:0.85cqw;border:0.13cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.08cqw;font-weight:700;box-sizing:border-box;" />
            </div>
            <div id="profStatus" style="font-size:0.96cqw;font-weight:800;min-height:1.25cqw;"></div>
            <button id="btnSaveProfile" type="button" style="width:100%;padding:0.82cqw;border-radius:0.95cqw;background:#059669;color:#fff;font-size:1.12cqw;font-weight:900;border:none;cursor:pointer;">💾 Lưu hồ sơ</button>
          </div>
        </div>
      `;
    } else {
      tabBody = `
        <div style="display:flex;gap:0.8cqw;margin-bottom:1.1cqw;">
          <button id="btnToggleBGM" type="button" style="flex:1;padding:0.85cqw;border-radius:1cqw;background:${AUD.isBGMEnabled() ? '#059669' : '#E7DFD5'};color:${AUD.isBGMEnabled() ? '#fff' : '#4A3426'};font-weight:800;border:none;cursor:pointer;">
            🎵 Nhạc nền Chill: ${AUD.isBGMEnabled() ? 'BẬT' : 'TẮT'}
          </button>
          <button id="btnToggleSFX" type="button" style="flex:1;padding:0.85cqw;border-radius:1cqw;background:${AUD.isSFXEnabled() ? '#D97706' : '#E7DFD5'};color:${AUD.isSFXEnabled() ? '#fff' : '#4A3426'};font-weight:800;border:none;cursor:pointer;">
            🔔 Hiệu ứng: ${AUD.isSFXEnabled() ? 'BẬT' : 'TẮT'}
          </button>
        </div>
        <div style="margin-bottom:0.95cqw;padding:0.7cqw 0.95cqw;border-radius:1cqw;background:${state.relaxedMode ? '#ECFDF5' : '#FAF6F0'};border:0.12cqw solid ${state.relaxedMode ? '#6EE7B7' : '#DFD2C1'};display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
          <div style="font-size:1.0cqw;color:#3D2B1F;line-height:1.35;">
            <strong>🌿 Chế độ Thư giãn</strong> <span style="color:#6B5443;">(Kiên nhẫn đơn chờ ×2 · Phạt hết hạn −1 ★)</span>
          </div>
          <button id="btnToggleRelaxed" type="button" style="padding:0.5cqw 0.95cqw;border-radius:0.85cqw;background:${state.relaxedMode ? '#059669' : '#D6CCC0'};color:${state.relaxedMode ? '#fff' : '#4A3426'};font-weight:800;border:none;cursor:pointer;white-space:nowrap;">
            ${state.relaxedMode ? 'ĐANG BẬT' : 'TẮT'}
          </button>
        </div>
        <div style="padding:1cqw;border-radius:1.1cqw;background:#FAF6F0;border:0.12cqw solid #D8C7B2;">
          <div style="font-weight:900;color:#3D2B1F;margin-bottom:0.35cqw;">💾 Tự Lưu & Mã Khôi Phục Tài Khoản</div>
          <p style="font-size:1.05cqw;color:#6B5443;margin:0 0 0.7cqw 0;line-height:1.4;">
            <strong>1. Sao lưu:</strong> Game tự lưu trên máy này. Bấm <em>Sao chép</em> cất vào Ghi chú/Zalo để chuyển máy.<br/>
            <strong>2. Khôi phục:</strong> Dán mã <code>STARUP2-...</code> vào ô dưới rồi bấm <em>Khôi phục</em>.
          </p>
          <div style="display:flex;gap:0.5cqw;margin-bottom:0.75cqw;">
            <div style="flex:1;display:flex;flex-direction:column;gap:0.25cqw;"><textarea id="saveCodeOut" readonly rows="2" style="width:100%;padding:0.5cqw 0.75cqw;border-radius:0.8cqw;border:0.12cqw solid #D8C7B2;font-family:monospace;font-size:0.92cqw;background:#FFFDF9;color:#4A3426;resize:none;word-break:break-all;">${code}</textarea><span style="font-size:0.92cqw;color:#047857;font-weight:800;">Độ dài mã: ${code.length} ký tự (rút gọn an toàn)</span></div>
            <button id="btnCopyCode" type="button" style="padding:0.55cqw 1cqw;border-radius:0.8cqw;background:#4A3426;color:#FFFDF9;font-weight:800;border:none;cursor:pointer;white-space:nowrap;">📋 Sao chép</button>
          </div>
          <div style="display:flex;gap:0.5cqw;">
            <textarea id="saveCodeIn" rows="2" placeholder="Dán mã STARUP2-... vào đây" style="flex:1;padding:0.5cqw 0.75cqw;border-radius:0.8cqw;border:0.12cqw solid #D8C7B2;font-size:0.98cqw;background:#FFFDF9;resize:none;word-break:break-all;"></textarea>
            <button id="btnRestoreCode" type="button" style="padding:0.55cqw 1cqw;border-radius:0.8cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;white-space:nowrap;">Khôi phục</button>
          </div>
          <div id="saveCodeStatus" style="margin-top:0.35cqw;font-size:0.94cqw;font-weight:800;min-height:1.25cqw;"></div>
        </div>
        <div style="margin-top:0.85cqw;padding:0.8cqw 1cqw;border-radius:1cqw;background:#ECFDF5;border:0.12cqw solid #86EFAC;display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
          <div style="font-size:1.02cqw;color:#065F46;font-weight:700;">
            📲 <strong>Cài làm App (PWA Offline):</strong> ${window.STARUP_PWA && window.STARUP_PWA.isStandalone() ? 'Đang chạy ở chế độ App toàn màn hình!' : 'Cài ra màn hình chính để chơi toàn màn hình không cần mạng.'}
          </div>
          <button id="btnInstallPWASettings" type="button" ${window.STARUP_PWA && window.STARUP_PWA.isStandalone() ? 'disabled' : ''} style="padding:0.55cqw 1cqw;border-radius:0.85cqw;background:${window.STARUP_PWA && window.STARUP_PWA.isStandalone() ? '#94A3B8' : '#059669'};color:#fff;font-weight:800;border:none;cursor:${window.STARUP_PWA && window.STARUP_PWA.isStandalone() ? 'default' : 'pointer'};white-space:nowrap;">
            ${window.STARUP_PWA && window.STARUP_PWA.isStandalone() ? 'Đã cài App' : '📲 Cài làm App'}
          </button>
        </div>
      `;
    }

    openModal('⚙️ Cài Đặt & Hồ Sơ', tabsBar + tabBody);

    document.querySelectorAll('[data-set-tab]').forEach(b => {
      b.onclick = () => { AUD.playSFX('click'); openSettingsModal(b.dataset.setTab); };
    });

    if (activeSettingsTab === 'profile') {
      const inpComp = document.getElementById('profCompName');
      const inpCeo = document.getElementById('profCeoName');
      const statEl = document.getElementById('profStatus');
      const btnSave = document.getElementById('btnSaveProfile');
      const handleSaveProfile = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
        const newComp = (inpComp.value || '').trim();
        const newCeo = (inpCeo.value || '').trim();
        if (!newComp || newComp.length > 24) {
          statEl.style.color = '#DC2626';
          statEl.textContent = '❌ Tên công ty phải dài từ 1 đến 24 ký tự (không được để trống).';
          return;
        }
        if (!newCeo || newCeo.length > 24) {
          statEl.style.color = '#DC2626';
          statEl.textContent = '❌ Tên người chơi (CEO) phải dài từ 1 đến 24 ký tự (không được để trống).';
          return;
        }
        state.companyName = newComp;
        state.ceoName = newCeo;
        // Sync own stock display name if IPO already done
        if (Array.isArray(state.stocks)) {
          const ownSt = state.stocks.find(x => x.isOwn);
          if (ownSt) ownSt.name = newComp + ' (Của bạn)';
        }
        // Sync welcome news item if present
        if (Array.isArray(state.newsList)) {
          state.newsList = state.newsList.map(it =>
            (it && typeof it.text === 'string' && it.text.startsWith('Chào mừng CEO '))
              ? { day: it.day, text: `Chào mừng CEO ${escapeHtml(newCeo)} trở lại điều hành ${escapeHtml(newComp)} (Ngày ${it.day})!` }
              : it
          );
        }
        AUD.playSFX('unlock');
        autoSave();
        renderHUD();
        showToast(`${TICK_SVG}Đã cập nhật hồ sơ: ${escapeHtml(newComp)} · CEO ${escapeHtml(newCeo)}!`);
        openSettingsModal('profile');
        const stAfter = document.getElementById('profStatus');
        if (stAfter) {
          stAfter.style.color = '#059669';
          stAfter.textContent = '✓ Đã lưu hồ sơ và cập nhật toàn bộ giao diện!';
        }
      };
      btnSave.addEventListener('pointerdown', handleSaveProfile);
      btnSave.onclick = handleSaveProfile;
      return;
    }

    const btnInstSet = document.getElementById('btnInstallPWASettings');
    if (btnInstSet && !btnInstSet.disabled) {
      btnInstSet.onclick = async () => {
        if (window.STARUP_PWA) {
          const r = await window.STARUP_PWA.promptInstall();
          if (r === 'accepted') showToast(`${TICK_SVG}Đã cài đặt STARUP lên màn hình chính!`);
          else if (r === 'ios' || r === 'manual') openPWAHelpModal(r === 'ios');
        }
      };
    }
    document.getElementById('btnToggleBGM').onclick = () => { AUD.setBGM(!AUD.isBGMEnabled()); openSettingsModal('general'); };
    document.getElementById('btnToggleSFX').onclick = () => { AUD.setSFX(!AUD.isSFXEnabled()); openSettingsModal('general'); };
    const btnRelax = document.getElementById('btnToggleRelaxed');
    if (btnRelax) {
      btnRelax.onclick = () => {
        state.relaxedMode = !state.relaxedMode;
        autoSave();
        showToast(state.relaxedMode ? '🌿 Đã BẬT Chế độ Thư giãn (kiên nhẫn đơn chờ ×2)!' : 'Chế độ Thư giãn đã TẮT.');
        openSettingsModal('general');
      };
    }
    const saveCodeInEl = document.getElementById('saveCodeIn');
    const saveCodeStatusEl = document.getElementById('saveCodeStatus');
    if (saveCodeInEl && saveCodeStatusEl) {
      const validateLive = () => {
        const val = saveCodeInEl.value.trim();
        if (!val) { saveCodeStatusEl.textContent = ''; return; }
        const res = decodeSaveCodeWithReason(val);
        if (res.data) {
          saveCodeStatusEl.style.color = '#059669';
          saveCodeStatusEl.textContent = `✓ Mã hợp lệ — ${res.data.companyName} (Ngày ${res.data.day} · ${FIN.fmtMoney(res.data.money)} · ${res.data.stars} ★)`;
        } else {
          saveCodeStatusEl.style.color = '#DC2626';
          saveCodeStatusEl.textContent = '❌ ' + res.error;
        }
      };
      saveCodeInEl.addEventListener('input', validateLive);
    }
    const btnCopyEl = document.getElementById('btnCopyCode');
    btnCopyEl.onclick = () => {
      const inp = document.getElementById('saveCodeOut');
      inp.select();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).catch(() => document.execCommand('copy'));
        else document.execCommand('copy');
      } catch (e) {}
      btnCopyEl.textContent = '✓ Đã chép';
      setTimeout(() => { if (btnCopyEl) btnCopyEl.textContent = '📋 Sao chép'; }, 1800);
      showToast(`${TICK_SVG}Đã sao chép mã khôi phục (${inp.value.length} ký tự)!`);
    };
    const btnRestoreSettingsEl = document.getElementById('btnRestoreCode');
    let restoreBusy = false;
    const handleSettingsRestore = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (restoreBusy) return;
      restoreBusy = true;
      setTimeout(() => { restoreBusy = false; }, 350);
      if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
      const res = decodeSaveCodeWithReason(document.getElementById('saveCodeIn').value);
      if (!res.data) return showToast('❌ ' + res.error);
      try {
        const decoded = res.data;
        decoded.speed = 0; // S14-2, S16-1, S17-2 & S18-1: Immediately apply paused state, update HUD & close Settings modal
        state = decoded; waitingClients = []; agents = [];
        lastPhase = getPhase(state.minutes).key;
        document.getElementById('btnSpeed').textContent = '⏸';
        applyBranchMap(); rebuildStaffAgents(false); restoreSavedWaitingClients();
        renderHUD(); renderMapOverlays(true); renderTutorial();
        autoSave(); closeModal();
        if (state.pendingEvent && state.pendingEvent.kind && !state.dailyClosed && !state.isBankrupt) {
          showRandomEventModal(state.pendingEvent.kind, state.pendingEvent.roomId, true);
        }
        showToast(`${TICK_SVG}Đã khôi phục ${escapeHtml(state.companyName)} — Ngày ${state.day} (tạm dừng)!`);
      } catch (err) {
        console.error('Settings restore error:', err);
        showToast('❌ Lỗi khi khôi phục dữ liệu: ' + (err && err.message ? err.message : 'không xác định'));
      }
    };
    btnRestoreSettingsEl.addEventListener('pointerdown', handleSettingsRestore);
    btnRestoreSettingsEl.onclick = handleSettingsRestore;
  }

  // ==================== HUD RENDER ====================
  function renderHUD() {
    if (!state) return;
    const phase = getPhase(state.minutes);
    document.getElementById('hudMoney').textContent = fmtHudMoney(state.money);
    document.getElementById('hudMoney').style.color = state.money < 0 ? '#DC2626' : '#3D2B1F';
    document.getElementById('hudStars').textContent = state.stars;
    document.getElementById('hudCompanyTag').textContent = state.ipoDone ? `[${state.ticker}] ${state.companyName}` : state.companyName;
    document.getElementById('clockIcon').textContent = phase.icon;
    const sea = EMP.getSeason(state.day);
    document.getElementById('clockText').textContent = `${sea.icon} N${state.day} · ${fmtTime(state.minutes)}`;
    const psHud = document.getElementById('btnPause');
    const spHud = document.getElementById('btnSpeed');
    if (state.speed > 0) lastPlaySpeed = state.speed;
    if (psHud) {
      psHud.textContent = state.speed === 0 ? '▶' : '⏸';
      psHud.style.background = state.speed === 0 ? '#DC2626' : '';
      psHud.style.color = state.speed === 0 ? '#FFFDF9' : '';
    }
    if (spHud) spHud.textContent = (state.speed === 0 ? (lastPlaySpeed || 1) : state.speed) + 'x';

    // Ultra-smooth continuous Sunset -> Dusk -> Night transition (15:00 -> 17:30)
    const m = state.minutes;
    let sunsetAlpha = 0;
    if (m >= 900 && m < 1030) {
      sunsetAlpha = m < 970 ? ((m - 900) / 70) * 0.72 : ((1030 - m) / 60) * 0.72;
    }
    const nightAlpha = m >= 950 ? Math.min(1, (m - 950) / 95) : 0;
    const sunEl = document.getElementById('sunsetOverlay');
    if (sunEl) sunEl.style.opacity = sunsetAlpha.toFixed(3);
    document.getElementById('nightMapImg').style.opacity = nightAlpha.toFixed(3);

    // Smooth RGB interpolation of full-bleed background wings (Day #E2DCD3 -> Dusk -> Night #586781)
    const rBg = Math.round(226 + (88 - 226) * nightAlpha + 10 * sunsetAlpha);
    const gBg = Math.round(220 + (103 - 220) * nightAlpha - 8 * sunsetAlpha);
    const bBg = Math.round(211 + (129 - 211) * nightAlpha - 20 * sunsetAlpha);
    const bgCol = `rgb(${rBg},${gBg},${bBg})`;
    document.getElementById('appRoot').style.background = bgCol;
    document.getElementById('gameScreen').style.background = bgCol;
    AUD.setNight(nightAlpha > 0.55);

    // Update Report Button Badge Pip (pending clients + ready deliveries + active issues)
    const readyOrIssue = CFG.ROOMS.filter(rc => state.rooms[rc.id].job && (state.rooms[rc.id].job.ready || state.rooms[rc.id].job.issue)).length;
    const pipCount = waitingClients.filter(c => c.arrived).length + readyOrIssue;
    const pip = document.getElementById('reportPip');
    if (pip) {
      if (pipCount > 0) { pip.textContent = pipCount; pip.classList.remove('hidden'); }
      else pip.classList.add('hidden');
    }
    const nPip = document.getElementById('newsPip');
    if (nPip) { if (state.unreadNews) nPip.classList.remove('hidden'); else nPip.classList.add('hidden'); }
    const qCount = QST.countClaimable(state);
    const tPip = document.getElementById('trophyPip');
    if (tPip) {
      if (qCount > 0) { tPip.textContent = qCount; tPip.classList.remove('hidden'); }
      else tPip.classList.add('hidden');
    }

    const mktBanner = document.getElementById('mktBanner');
    if (state.marketingCampaign) {
      mktBanner.classList.remove('hidden');
      mktBanner.textContent = `${state.marketingCampaign.icon} ${state.marketingCampaign.name} (${state.marketingCampaign.daysLeft}N · x${state.marketingCampaign.rewardMult})`;
    } else mktBanner.classList.add('hidden');

    const evBanner = document.getElementById('eventBanner');
    if (state.activeEventTag) {
      evBanner.classList.remove('hidden');
      evBanner.textContent = state.activeEventTag;
    } else evBanner.classList.add('hidden');

    const debtBanner = document.getElementById('debtBanner');
    if (state.debtDays > 0 || state.money < 0) {
      debtBanner.classList.remove('hidden');
      debtBanner.textContent = `⚠️ Âm quỹ (${state.debtDays}/2 ngày chốt sổ)`;
      debtBanner.title = 'Số ngày âm quỹ được tính theo số dư tại thời điểm chốt sổ cuối ngày. Âm 2 kỳ chốt sổ liên tiếp sẽ phá sản.';
    } else debtBanner.classList.add('hidden');

    const btnOT = document.getElementById('btnOvertime');
    const otIcon = document.getElementById('overtimeIcon');
    const otText = document.getElementById('overtimeText');
    if (btnOT && otIcon && otText) {
      if (state.dailyClosed || phase.key === 'night') {
        btnOT.classList.add('hidden');
      } else {
        btnOT.classList.remove('hidden');
        if (state.overtimeActive) {
          btnOT.style.background = 'linear-gradient(180deg,#10B981,#047857)';
          btnOT.style.boxShadow = 'inset 0 0.2cqw 0 rgba(255,255,255,0.4), 0 0.34cqw 0 #065F46';
          btnOT.style.opacity = '0.92';
          otIcon.textContent = '✅';
          otText.textContent = 'Đã tăng ca (18:00)';
        } else {
          btnOT.style.background = 'linear-gradient(180deg,#F43F5E,#BE123C)';
          btnOT.style.boxShadow = 'inset 0 0.2cqw 0 rgba(255,255,255,0.45), 0 0.42cqw 0 #881337';
          btnOT.style.opacity = '1';
          otIcon.textContent = '🧋';
          otText.textContent = 'Tăng ca +1h';
        }
      }
    }

    const btnP = document.getElementById('btnPrimary');
    const pIcon = document.getElementById('primaryIcon');
    const pText = document.getElementById('primaryText');
    if (phase.key === 'night') {
      btnP.style.background = 'linear-gradient(180deg,#10B981,#047857)';
      btnP.style.boxShadow = 'inset 0 0.2cqw 0 rgba(255,255,255,0.45), 0 0.42cqw 0 #065F46';
      pIcon.textContent = '🌅'; pText.textContent = `Sang Ngày ${state.day + 1}`;
    } else if (state.happyHourLeft > 0) {
      btnP.style.background = 'linear-gradient(180deg,#FBBF24,#D97706)';
      btnP.style.boxShadow = 'inset 0 0.2cqw 0 rgba(255,255,255,0.45), 0 0.42cqw 0 #92400E';
      pIcon.textContent = '⚡'; pText.textContent = `x2 (${Math.ceil(state.happyHourLeft)}s)`;
    } else if (state.happyHourCooldown > 0) {
      btnP.style.background = 'linear-gradient(180deg,#C8BEB3,#A89D91)';
      btnP.style.boxShadow = '0 0.34cqw 0 #7C7166';
      pIcon.textContent = '⏳'; pText.textContent = `Chờ (${Math.ceil(state.happyHourCooldown)}s)`;
    } else {
      btnP.style.background = 'linear-gradient(180deg,#F59E0B,#D97706)';
      btnP.style.boxShadow = 'inset 0 0.2cqw 0 rgba(255,255,255,0.45), 0 0.42cqw 0 #92400E';
      pIcon.textContent = '☕'; pText.textContent = 'Trà Chiều x2';
    }
    // FIX P2 #5: Live sync Room Upgrade Drawer button states when money changes
    if (state.selectedRoom && lastDrawerMoney !== state.money) {
      lastDrawerMoney = state.money;
      renderDrawer();
    }
  }

  // ==================== 60FPS GAME LOOP ====================
  let lastPhase = 'open';
  let clientSpawnCooldown = 1.4;

  function tick(now) {
    const rawDt = Math.min(0.08, (now - lastTs) / 1000);
    lastTs = now;

    if (state && document.getElementById('introOverlay').classList.contains('hidden')) {
      const modalOpen = isAnyModalOpen();
      const simMult = (state.speed === 0 || modalOpen) ? 0 : state.speed;
      const dt = rawDt * simMult;

      if (dt > 0) {
        autoSaveAccum += rawDt;
        if (autoSaveAccum >= 6) { autoSaveAccum = 0; autoSave(); }
        if (state.happyHourLeft > 0) state.happyHourLeft = Math.max(0, state.happyHourLeft - rawDt);
        else if (state.happyHourCooldown > 0) state.happyHourCooldown = Math.max(0, state.happyHourCooldown - rawDt);

        const tutPace = (state.tutorialStep === 1 || state.tutorialStep === 2) ? 0.35 : 1.0;
        const closeMin = state.overtimeActive ? 1080 : 1020;
        const maxMin = closeMin + 35;
        if (state.minutes < maxMin) state.minutes += dt * 2.4 * tutPace;
        // Safety guard: if clock reached/passed closing time and day hasn't closed yet, trigger End of Day!
        if (state.minutes >= closeMin && !state.dailyClosed) {
          lastPhase = 'night';
          processEndOfDay();
        }

        const currHour = Math.floor(state.minutes / 60);
        if (currHour >= state.lastStockHour + 2 && currHour <= 17) {
          state.lastStockHour = currHour;
          FIN.updateStockPrices(state, EMP.getSeason(state.day).stockBias);
    generateDailyNews();
        }

        if (state.day >= 2 && !state.eventTriggeredToday && state.minutes >= 600 && state.minutes < 880) {
          if (Math.random() < dt * 0.08) {
            triggerRandomEvent();
            if (isAnyModalOpen()) { rafId = requestAnimationFrame(tick); return; }
          }
        }

        const phase = getPhase(state.minutes);
        if (phase.key !== lastPhase) {
          lastPhase = phase.key;
          if (phase.key === 'lunch') {
            showToast('🍚 12:00 Nghỉ trưa — Nhân viên nghỉ ngơi (đơn chờ ở sảnh được giữ nguyên & tạm dừng đếm ngược đến 13:00)!');
            agents.forEach((a, i) => {
              if (a.role === 'staff' && !a.sickToday) {
                const lunchSpots = state.rooms.pantry.unlocked ? ['pantryBar', 'pantryTable', 'vending'] : ['sofa', 'lobby'];
                sendAgent(a, lunchSpots[i % lunchSpots.length], i % 2 === 0 ? '🍚' : '☕');
              }
            });
            renderMapOverlays(true);
          } else if (phase.key === 'afternoon') {
            showToast('🌤️ 13:00 — Trở lại ca chiều!');
            agents.forEach(a => { if (a.role === 'staff' && !a.sickToday) sendAgent(a, a.home, '💻'); });
          } else if (phase.key === 'night') {
            processEndOfDay();
          }
        }

        // Spawn up to 2–3 concurrent clients
        if (phase.key === 'morning' || phase.key === 'afternoon' || phase.key === 'sunset') {
          const mktBoost = state.marketingCampaign ? state.marketingCampaign.spawnBoost : 1;
          clientSpawnCooldown -= dt * mktBoost * (state.clientRateDebuff || 1) * EMP.getSeason(state.day).spawnMult;
          if (clientSpawnCooldown <= 0) {
            spawnClientIfNeeded();
            const wc = getUnlockedWorkCount();
            if (wc <= 1) clientSpawnCooldown = 22 + Math.random() * 4;
            else if (wc <= 3) clientSpawnCooldown = 16 + Math.random() * 4;
            else clientSpawnCooldown = 11 + Math.random() * 3;
          }
        }

        // S12-2: Patience countdown strictly paused while any modal is open OR during 2.5s post-modal grace window
        if (clientGraceTimer > 0) clientGraceTimer = Math.max(0, clientGraceTimer - rawDt);
        if (state.tutorialStep !== 1 && !isAnyModalOpen() && clientGraceTimer <= 0 && phase.key !== 'lunch') {
          const expired = [];
          waitingClients.forEach(c => {
            if (!c.arrived) return;
            c.patience -= dt;
            if (c.patience <= 0) expired.push(c);
          });
          let penalizedExpiredCount = 0;
          let lastPenalizedWho = '';
          expired.forEach(c => {
            const targetBusy = !!(state.rooms[c.roomId] && state.rooms[c.roomId].job) || state.disabledRoomId === c.roomId;
            state.dayExpiredCount = (state.dayExpiredCount || 0) + 1;
            if (targetBusy) {
              showToast(`👋 Khách (${c.roomName} đang bận) đã rời đi — không bị trừ ★`);
            } else {
              state.stars = Math.max(0, state.stars - 1);
              state.morale = Math.max(20, state.morale - 3);
              AUD.playSFX('alert');
              const who = c.isVIP ? 'Khách VIP' : 'Khách hàng';
              penalizedExpiredCount += 1;
              lastPenalizedWho = `${who} (${c.roomName})`;
              addNews(`[${fmtTime(state.minutes)}] 😤 ${who} (${c.roomName} · ${FIN.fmtMoney(c.reward)}) rời sảnh do hết giờ chờ: −1 ★`);
            }
            dismissClient(c.id, false);
            autoSave();
            renderHUD();
          });
          if (penalizedExpiredCount === 1) {
            showToast(`😤 ${lastPenalizedWho} đã rời đi: −1 ★`);
          } else if (penalizedExpiredCount > 1) {
            showToast(`😤 ${penalizedExpiredCount} khách hàng rời sảnh vì hết giờ chờ: −${penalizedExpiredCount} ★`);
          }
        }

        let overlayDirty = false;
        // Manager Automation (Lobby auto-accepts normal contracts; Rooms auto-fix & auto-deliver!)
        if (state.rooms.lobby.hasManager) {
          [...waitingClients].forEach(c => {
            if (c.arrived && c.tier === 'normal' && c.patience < 10) acceptClientById(c.id);
          });
        }
        if (state.rooms.pantry.unlocked && state.rooms.pantry.hasManager && state.morale < 85) {
          state.morale = 85;
        }
        CFG.ROOMS.forEach(rc => {
          const rs = state.rooms[rc.id];
          if (!rs.unlocked || !rs.hasManager || !rs.job) return;
          if (rs.job.issue) {
            const fixedKind = rs.job.issue;
            rs.job.issue = null;
            overlayDirty = true;
            showToast(`🎖️ Quản lý ${rc.name} đã tự động ${fixedKind === 'server' ? 'sửa Server' : 'pha cà phê'} gỡ kẹt!`);
            autoSave();
          }
          if (rs.job.ready) { deliverRoomJob(rc.id); overlayDirty = true; }
        });

        // Advance active room jobs
        const moraleMult = state.morale >= 80 ? 1.15 : (state.morale < 45 ? 0.8 : 1.0);
        CFG.ROOMS.forEach(rc => {
          const rs = state.rooms[rc.id];
          if (!rs.unlocked || !rs.job || rs.job.ready || rs.job.issue || state.disabledRoomId === rc.id) return;
          if (phase.key === 'lunch' || phase.key === 'night') return;

          const hhBoost = state.happyHourLeft > 0 ? 2 : 1;
          const pantryBoost = (state.rooms.pantry.unlocked && phase.key === 'afternoon') ? 1.25 : 1;
          const speedPerkLv = PRS ? PRS.getActiveLevel(state, 'job_speed') : 0;
          rs.job.progress += (100 / rs.job.duration) * dt * hhBoost * pantryBoost * moraleMult * (1 + speedPerkLv * 0.15);

          if (!rs.job.issueChecked && rs.job.progress >= 50) {
            rs.job.issueChecked = true;
            const baseChance = state.rooms.pantry.unlocked ? 0.16 : 0.30;
            const chance = state.tutorialStep === 2 ? 0.85 : baseChance;
            if (Math.random() < chance) {
              const issueKind = (rc.id === 'tech' && Math.random() < 0.6) ? 'server' : 'coffee';
              if (rs.hasManager) {
                showToast(`🎖️ Quản lý ${rc.name} đã tự động ${issueKind === 'server' ? 'sửa Server' : 'pha cà phê'} ở 50% — tiến độ chạy tiếp!`);
              } else {
                rs.job.issue = issueKind;
                if (!state.roomStats) state.roomStats = {};
                if (!state.roomStats[rc.id]) state.roomStats[rc.id] = [0, 0];
                state.roomStats[rc.id][0] = (state.roomStats[rc.id][0] || 0) + 1;
                AUD.playSFX('alert');
                overlayDirty = true;
                if (rs.job.issue === 'server') {
                  showToast(`🔧 ${rc.name} tạm dừng ở 50% do lỗi Server! Bấm "🔧 Sửa Server!" cạnh phòng để tiếp tục.`);
                } else {
                  showToast(`☕ ${rc.name} tạm dừng ở 50%! Bấm nút "☕ Pha Cà Phê!" cạnh phòng để gỡ kẹt và tiếp tục.`);
                }
              }
            }
          }

          if (rs.job.progress >= 100) {
            rs.job.progress = 100;
            rs.job.ready = true;
            AUD.playSFX('bell');
            overlayDirty = true;
          }
        });

        const moveBoost = state.happyHourLeft > 0 ? 1.45 : 1;
        agents.forEach(a => {
          const el = document.getElementById('ag-' + a.id);
          if (!el) return;
          if (a.path.length > 0) {
            const nxtKey = a.path[0];
            const tgt = CFG.NODES[nxtKey];
            const dx = tgt.x - a.x, dy = tgt.y - a.y;
            const dist = Math.hypot(dx, dy);
            const step = a.speed * moveBoost * dt;
            if (dist <= step) {
              a.x = tgt.x; a.y = tgt.y; a.node = nxtKey; a.path.shift();
              if (a.role === 'client') {
                const wc = waitingClients.find(c => c.id === a.id);
                if (wc && a.path.length === 0) { wc.arrived = true; overlayDirty = true; }
              }
            } else {
              a.x += (dx / dist) * step;
              a.y += (dy / dist) * step;
            }
            el.classList.add('walking'); el.classList.remove('idle');
          } else {
            el.classList.remove('walking'); el.classList.add('idle');
            if (a.role === 'staff' && phase.key !== 'night' && !a.sickToday) {
              a.wait -= dt;
              if (a.wait <= 0) {
                if (phase.key === 'lunch') {
                  const spots = state.rooms.pantry.unlocked ? ['pantryBar', 'pantryTable', 'vending'] : ['sofa', 'lobby'];
                  sendAgent(a, spots[Math.floor(Math.random() * spots.length)], '🍚');
                  a.wait = 2.8 + Math.random() * 2;
                } else if (a.node !== a.home) {
                  sendAgent(a, a.home, '💻');
                  a.wait = 4.0 + Math.random() * 3;
                } else if (!state.rooms[a.roomId].job && Math.random() < 0.5) {
                  const walkTarget = state.rooms.pantry.unlocked ? 'pantryBar' : 'lobby';
                  sendAgent(a, walkTarget, walkTarget === 'pantryBar' ? '☕' : '💬');
                  a.wait = 2.0 + Math.random() * 1.5;
                } else a.wait = 2.8;
              }
            }
          }
          el.style.left = a.x.toFixed(2) + '%';
          el.style.top = a.y.toFixed(2) + '%';
          el.style.opacity = (a.node === 'outside' && a.path.length === 0) ? '0' : '1';
          el.querySelector('.token-badge').textContent = a.badge;
        });

        // Clean up exited clients
        agents = agents.filter(a => !(a.role === 'client' && a.node === 'outside' && a.path.length === 0 && !waitingClients.some(c => c.id === a.id)));

        banterCooldown -= dt;
        if (banterCooldown <= 0) {
          banterCooldown = 7 + Math.random() * 4.5;
          spawnStaffBanter(phase.key === 'morning' || phase.key === 'afternoon' || phase.key === 'sunset' ? 'work' : phase.key);
        }
        hudAccum += rawDt;
        if (hudAccum >= 0.15) { hudAccum = 0; renderHUD(); renderMapOverlays(); }
        else if (overlayDirty) renderMapOverlays();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  // ==================== INTRO SCREEN ====================
  function showIntroScreen() {
    const saved = loadSavedFromStorage();
    document.getElementById('gameScreen').classList.add('intro-active');
    document.getElementById('introOverlay').classList.remove('hidden');

    let chosenAvatar = 'ceo';
    document.getElementById('introContent').innerHTML = `
      <div>
        <div style="display:inline-block;padding:0.25cqw 0.85cqw;border-radius:999px;background:#FEF3C7;color:#92400E;font-size:1.05cqw;font-weight:800;margin-bottom:0.45cqw;">GAME KINH DOANH 16:9</div>
        <h1 style="margin:0;font-size:3.1cqw;font-weight:900;letter-spacing:-0.03em;color:#3D2B1F;">STARUP</h1>
        <p style="margin:0.35cqw 0 1.1cqw 0;font-size:1.18cqw;color:#6B5443;line-height:1.4;">Chốt đơn tại sảnh, mở Phòng Tài Chính & Marketing, xoay dòng tiền chứng khoán và vượt qua biến cố để lên sàn <strong>IPO</strong>!</p>

        ${saved ? `
          <button id="btnContinueSave" type="button" style="width:100%;margin-bottom:0.8cqw;padding:0.9cqw;border-radius:1.1cqw;background:linear-gradient(180deg,#10B981,#047857);color:#fff;font-size:1.3cqw;font-weight:800;border:none;box-shadow:0 0.3cqw 0 #065F46;cursor:pointer;">
            ▶️ Tiếp tục: ${saved.companyName} (Ngày ${saved.day} · ${FIN.fmtMoney(saved.money)})
          </button>
        ` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75cqw;margin-bottom:0.85cqw;">
          <div>
            <label style="display:block;font-size:1.02cqw;font-weight:800;color:#5C4636;margin-bottom:0.25cqw;">Tên CEO</label>
            <input id="inpCeoName" type="text" value="Minh Founder" maxlength="20" style="width:100%;padding:0.62cqw 0.85cqw;border-radius:0.85cqw;border:0.14cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.18cqw;font-weight:700;" />
          </div>
          <div>
            <label style="display:block;font-size:1.02cqw;font-weight:800;color:#5C4636;margin-bottom:0.25cqw;">Tên Công Ty</label>
            <input id="inpCompName" type="text" value="Nova Tech" maxlength="20" style="width:100%;padding:0.62cqw 0.85cqw;border-radius:0.85cqw;border:0.14cqw solid #D8C7B2;background:#FFFDF9;color:#3D2B1F;font-size:1.18cqw;font-weight:700;" />
          </div>
        </div>

        <div style="margin-bottom:1.1cqw;">
          <div style="font-size:1.02cqw;font-weight:800;color:#5C4636;margin-bottom:0.4cqw;">Chọn diện mạo CEO</div>
          <div id="avatarPicker" style="display:flex;gap:0.85cqw;">
            ${AVA.CEO_CHOICES.map(c => `
              <button data-pick-ava="${c.key}" type="button" style="width:5.2cqw;height:5.2cqw;padding:0.2cqw;border-radius:999px;border:0.25cqw solid ${c.key === chosenAvatar ? '#D97706' : 'transparent'};background:#F4ECE0;cursor:pointer;overflow:hidden;">
                ${AVA.renderTokenImg(c.key, c.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;gap:0.75cqw;">
          <button id="btnStartNew" type="button" style="flex:1.6;padding:0.95cqw;border-radius:1.1cqw;background:linear-gradient(180deg,#D97706,#B45309);color:#FFFDF9;font-size:1.32cqw;font-weight:900;border:none;box-shadow:0 0.32cqw 0 #78350F;cursor:pointer;">
            🚀 Bắt Đầu Khởi Nghiệp
          </button>
          <button id="btnIntroRestore" type="button" style="flex:1;padding:0.95cqw;border-radius:1.1cqw;background:#F4ECE0;color:#4A3426;font-size:1.18cqw;font-weight:800;border:0.13cqw solid #D8C7B2;cursor:pointer;">
            🔑 Nhập Mã Lưu
          </button>
          <button id="btnIntroHallOfFame" type="button" style="flex:1;padding:0.95cqw;border-radius:1.1cqw;background:#FFFBEB;color:#92400E;font-size:1.12cqw;font-weight:800;border:0.14cqw solid #F59E0B;cursor:pointer;">
            🏛️ Sảnh Danh Vọng${saved && saved.prestige && saved.prestige.salesCount > 0 ? ` (${saved.prestige.salesCount})` : ''}
          </button>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-pick-ava]').forEach(btn => {
      btn.onclick = () => {
        chosenAvatar = btn.dataset.pickAva;
        document.querySelectorAll('[data-pick-ava]').forEach(b => { b.style.borderColor = (b.dataset.pickAva === chosenAvatar) ? '#D97706' : 'transparent'; });
      };
    });
    const btnCont = document.getElementById('btnContinueSave');
    if (btnCont && saved) btnCont.onclick = () => { state = saved; beginGameplay(false); };
    const btnIntroHof = document.getElementById('btnIntroHallOfFame');
    if (btnIntroHof) {
      btnIntroHof.onclick = () => {
        if (!state) state = saved || createFreshState('Minh Founder', 'Nova Tech', chosenAvatar);
        openHallOfFameModal();
      };
    }
    document.getElementById('btnStartNew').onclick = () => {
      const ceo = document.getElementById('inpCeoName').value.trim() || 'Minh Founder';
      const comp = document.getElementById('inpCompName').value.trim() || 'Nova Tech';
      const carryPrestige = (saved && saved.prestige) ? saved.prestige : (state && state.prestige ? state.prestige : null);
      state = createFreshState(ceo, comp, chosenAvatar, carryPrestige);
      applyStartingPrestigePerks(state);
      beginGameplay(true);
    };
    document.getElementById('btnIntroRestore').onclick = () => {
      openModal('🔑 Khôi Phục Tiến Độ Bằng Mã', `
        <p style="color:#6B5443;margin:0 0 0.8cqw 0;">Dán mã <code>STARUP-...</code> bạn đã sao lưu vào ô dưới đây:</p>
        <textarea id="introCodeInp" rows="3" placeholder="Dán mã STARUP2-... vào đây" style="width:100%;padding:0.7cqw;border-radius:0.9cqw;border:0.14cqw solid #D8C7B2;font-size:1.05cqw;margin-bottom:0.45cqw;resize:none;word-break:break-all;"></textarea>
        <div id="introCodeStatus" style="margin-bottom:0.65cqw;font-size:0.96cqw;font-weight:800;min-height:1.25cqw;"></div>
        <button id="btnConfirmIntroRestore" type="button" style="width:100%;padding:0.85cqw;border-radius:0.95cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">Khôi phục & Vào Game</button>
      `);
      const introInpEl = document.getElementById('introCodeInp');
      const introStatEl = document.getElementById('introCodeStatus');
      if (introInpEl && introStatEl) {
        introInpEl.addEventListener('input', () => {
          const val = introInpEl.value.trim();
          if (!val) { introStatEl.textContent = ''; return; }
          const res = decodeSaveCodeWithReason(val);
          if (res.data) {
            introStatEl.style.color = '#059669';
            introStatEl.textContent = `✓ Mã hợp lệ — ${res.data.companyName} (Ngày ${res.data.day} · ${FIN.fmtMoney(res.data.money)} · ${res.data.stars} ★)`;
          } else {
            introStatEl.style.color = '#DC2626';
            introStatEl.textContent = '❌ ' + res.error;
          }
        });
      }
      const btnConfirmIntroEl = document.getElementById('btnConfirmIntroRestore');
      let introRestoreBusy = false;
      const handleIntroRestore = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (introRestoreBusy) return;
        introRestoreBusy = true;
        setTimeout(() => { introRestoreBusy = false; }, 350);
        if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
        const res = decodeSaveCodeWithReason(document.getElementById('introCodeInp').value);
        if (!res.data) return showToast('❌ ' + res.error);
        try {
          const decoded = res.data;
          decoded.speed = 0; // S14-2, S17-2 & S18-1: Apply real state & HUD before closing modal
          state = decoded;
          closeModal();
          beginGameplay(false);
          showToast('⏸️ Đã khôi phục tiến độ ở trạng thái tạm dừng — bấm nút ⏸ để tiếp tục!');
        } catch (err) {
          console.error('Intro restore error:', err);
          showToast('❌ Lỗi khi khôi phục dữ liệu: ' + (err && err.message ? err.message : 'không xác định'));
        }
      };
      btnConfirmIntroEl.addEventListener('pointerdown', handleIntroRestore);
      btnConfirmIntroEl.onclick = handleIntroRestore;
    };
  }

  function restoreSavedWaitingClients() {
    if (!state || !Array.isArray(state.savedWaitingClients) || !state.savedWaitingClients.length) return;
    if (state.dailyClosed) {
      state.savedWaitingClients = [];
      return;
    }
    state.savedWaitingClients.forEach((sc, idx) => {
      const rc = CFG.ROOMS.find(r => r.id === sc.roomId);
      if (!rc || !state.rooms[rc.id] || !state.rooms[rc.id].unlocked) return;
      const slotIdx = Math.min(CLIENT_SLOTS.length - 1, Math.max(0, sc.slotIdx !== undefined ? sc.slotIdx : idx));
      const slot = CLIENT_SLOTS[slotIdx];
      const cid = 'cli_res_' + Date.now() + '_' + idx;
      const clientObj = {
        id: cid, slotIdx, slotX: slot.x, slotY: slot.y,
        roomId: rc.id, roomName: rc.name, roomIcon: rc.icon,
        title: sc.title, reward: sc.reward, duration: sc.duration,
        tier: sc.tier, isVIP: !!sc.isVIP, stars: sc.stars || 2,
        penalty: sc.penalty || 0, patience: Math.max(3, sc.patience || 20), arrived: true
      };
      waitingClients.push(clientObj);
      agents.push({
        id: cid, role: 'client', roleKey: clientObj.isVIP ? 'vip' : 'client',
        node: slot.node, x: slot.x, y: slot.y,
        path: [], wait: 999, badge: clientObj.tier === 'mega' ? '🌟' : (clientObj.tier === 'rush' ? '⚡' : (clientObj.isVIP ? '💎' : '💼')),
        speed: 15, targetSlot: slotIdx
      });
    });
    state.savedWaitingClients = [];
    renderAgentsDOM();
  }

  function beginGameplay(isNew) {
    // S17-2: Populate real HUD, map, staff & waiting clients BEFORE revealing game screen so Day 1 placeholder never flashes
    document.getElementById('btnSpeed').textContent = state.speed === 0 ? '⏸' : (state.speed || 1) + 'x';
    waitingClients = [];
    agents = [];
    lastPhase = getPhase(state.minutes).key;
    applyBranchMap();
    rebuildStaffAgents(isNew);
    if (!isNew) restoreSavedWaitingClients();
    renderHUD();
    renderMapOverlays(true);
    renderTutorial();
    document.getElementById('introOverlay').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('intro-active');
    AUD.startBGM();
    AUD.playSFX('bell');
    autoSave();
    if (isNew) {
      clientSpawnCooldown = 2.5;
      showToast(`🎉 Chào mừng CEO ${escapeHtml(state.ceoName)} đến với ${escapeHtml(state.companyName)}!`);
    } else {
      // Lỗi N1 Rescue: If loaded save was stuck near/past closing time (e.g. 17:55 overtime), smoothly finish & open End-of-Day report!
      const closeMin = state.overtimeActive ? 1080 : 1020;
      if (state.isBankrupt) { showBankruptcyScreen(); return; }
      if (state.pendingEvent && state.pendingEvent.kind && !state.dailyClosed) {
        showRandomEventModal(state.pendingEvent.kind, state.pendingEvent.roomId, true);
        return;
      }
      if (!state.dailyClosed && ((state.overtimeActive && state.minutes >= 1074) || state.minutes >= closeMin)) {
        state.minutes = Math.max(state.minutes, closeMin + 1);
        lastPhase = 'night';
        renderHUD();
        showToast(`🔧 Đã cứu hồ sơ đang kẹt ở Ngày ${state.day} — mở bảng chốt sổ Ngày ${state.day}!`);
        processEndOfDay();
      }
    }
  }

  // ==================== BOOT & BINDINGS ====================
  function init() {
    document.getElementById('btnForceLandscape').onclick = () => {
      try {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      } catch (e) {}
      document.body.classList.add('bypass-portrait');
    };
    document.getElementById('btnBypassPortrait').onclick = () => document.body.classList.add('bypass-portrait');
    const btnCloseModalEl = document.getElementById('btnCloseModal');
    const handleCloseModalPress = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      closeModal();
    };
    btnCloseModalEl.addEventListener('pointerdown', handleCloseModalPress);
    btnCloseModalEl.onclick = handleCloseModalPress;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const mo = document.getElementById('modalOverlay');
        const btnX = document.getElementById('btnCloseModal');
        if (mo && !mo.classList.contains('hidden') && btnX && !btnX.classList.contains('hidden')) {
          closeModal();
        }
      }
    });
    document.getElementById('btnCloseDrawer').onclick = () => { state.selectedRoom = null; renderMapOverlays(); renderDrawer(); };
    document.getElementById('btnSkipTutorial').onclick = () => { if (state) { state.tutorialStep = 0; renderTutorial(); autoSave(); } };
    function syncSpeedButtons() {
      const spEl = document.getElementById('btnSpeed');
      const psEl = document.getElementById('btnPause');
      if (!state) return;
      if (state.speed > 0) lastPlaySpeed = state.speed;
      if (spEl) spEl.textContent = (state.speed === 0 ? lastPlaySpeed : state.speed) + 'x';
      if (psEl) {
        psEl.textContent = state.speed === 0 ? '▶' : '⏸';
        psEl.style.background = state.speed === 0 ? '#DC2626' : '';
        psEl.style.color = state.speed === 0 ? '#FFFDF9' : '';
      }
    }
    const btnPauseEl = document.getElementById('btnPause');
    if (btnPauseEl) {
      btnPauseEl.onclick = () => {
        if (!state) return;
        if (state.speed === 0) {
          state.speed = lastPlaySpeed || 1;
        } else {
          lastPlaySpeed = state.speed;
          state.speed = 0;
        }
        syncSpeedButtons();
        AUD.playSFX('click');
        renderMapOverlays(true);
        autoSave();
      };
    }
    document.getElementById('btnSpeed').onclick = () => {
      if (!state) return;
      if (state.speed === 0) {
        state.speed = lastPlaySpeed || 1;
      } else {
        state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 3 : 1);
        lastPlaySpeed = state.speed;
      }
      syncSpeedButtons();
      AUD.playSFX('click');
      renderMapOverlays(true);
      autoSave();
    };
    document.getElementById('btnNews').onclick = () => {
      if (!state) return;
      state.unreadNews = false;
      renderHUD();
      const list = (state.newsList && state.newsList.length) ? state.newsList : [{ day: state.day, text: state.newsHint }];
      const upcomingHints = [];
      if (state.day >= 2) {
        if ((state.day - (state.lastStaffSickDay !== undefined ? state.lastStaffSickDay : -10)) >= 5) upcomingHints.push('🤒 Nhân sự có thể xin nghỉ ốm');
        if ((state.day - (state.lastPowerOutageDay !== undefined ? state.lastPowerOutageDay : -10)) >= 5) upcomingHints.push('⚡ Kiểm tra đường dây điện');
        if ((state.day - (state.lastTaxAuditDay !== undefined ? state.lastTaxAuditDay : -10)) >= 2) upcomingHints.push('🧾 Thanh tra thuế & sổ sách');
        if ((state.day - (state.lastMacroWaveDay !== undefined ? state.lastMacroWaveDay : -10)) >= 3) upcomingHints.push('📉 Thị trường có thể rung lắc');
        if ((state.day - (state.lastIndustryBoomDay !== undefined ? state.lastIndustryBoomDay : -10)) >= 2) upcomingHints.push('🚀 Làn sóng khách hàng mới');
        if ((state.day - (state.lastPartnerPromoDay !== undefined ? state.lastPartnerPromoDay : -10)) >= 2) upcomingHints.push('🤝 Đối tác đề nghị hợp tác');
      }
      const forecastHtml = upcomingHints.length
        ? `<div style="padding:0.75cqw 1cqw;border-radius:1cqw;background:#EFF6FF;border:0.12cqw solid #BFDBFE;color:#1E40AF;font-size:0.98cqw;line-height:1.4;margin-bottom:0.75cqw;"><strong>🔮 Dự báo biến cố có thể xuất hiện sắp tới:</strong> ${upcomingHints.slice(0, 4).join(' · ')}</div>`
        : '';
      openModal('📰 Tin Nóng Thị Trường Theo Ngày', `
        ${forecastHtml}
        <div style="display:flex;flex-direction:column;gap:0.65cqw;">
          ${list.map((item, i) => `
            <div style="padding:0.85cqw 1cqw;border-radius:1cqw;background:${i === 0 ? '#FEF3C7' : '#FAF6F0'};border:0.12cqw solid ${i === 0 ? '#FCD34D' : '#DFD2C1'};color:${i === 0 ? '#92400E' : '#5C4636'};font-weight:${i === 0 ? '800' : '600'};line-height:1.4;">
              <span style="display:inline-block;padding:0.12cqw 0.55cqw;border-radius:999px;background:${i === 0 ? '#D97706' : '#E7DDD0'};color:${i === 0 ? '#fff' : '#5C4636'};font-size:0.92cqw;font-weight:900;margin-right:0.45cqw;">Ngày ${item.day}</span>
              ${item.text}
            </div>
          `).join('')}
        </div>
      `);
    };
    document.getElementById('btnReport').onclick = () => openReportModal('pending');
    document.getElementById('btnFinance').onclick = () => openFinanceModal('loan');
    document.getElementById('btnMarketing').onclick = openMarketingModal;
    document.getElementById('btnIPO').onclick = openIPOModal;
    document.getElementById('btnSettings').onclick = openSettingsModal;
    document.getElementById('btnTrophy').onclick = () => openTrophyModal('quests');
    const btnOvertimeEl = document.getElementById('btnOvertime');
    if (btnOvertimeEl) {
      btnOvertimeEl.onclick = () => {
        if (!state) return;
        const phase = getPhase(state.minutes);
        if (state.dailyClosed || phase.key === 'night') return;
        if (state.overtimeActive) {
          return showToast('✅ Đã kích hoạt tăng ca hôm nay — giờ làm việc kéo dài đến 18:00!');
        }
        if (state.money < 200) return showToast('Cần $200 tiền mặt để mời trà sữa tăng ca!');
        state.overtimeActive = true;
        state.money -= 200;
        state.morale = Math.max(30, state.morale - 12);
        AUD.playSFX('click');
        showToast('🧋 Đã mời trà sữa (-$200)! Tăng ca đến 18:00 (-12% Tinh thần).');
        autoSave();
        renderHUD();
      };
    }

    document.getElementById('btnPrimary').onclick = () => {
      if (!state) return;
      const phase = getPhase(state.minutes);
      if (phase.key === 'night') startNextDay();
      else if (state.happyHourLeft > 0) {
        showToast(`⚡ Giờ Trà Chiều đang chạy (còn ${Math.ceil(state.happyHourLeft)}s)!`);
      } else if (state.happyHourCooldown > 0) {
        showToast(`⏳ Trà Chiều đang hồi chiêu (còn ${Math.ceil(state.happyHourCooldown)}s)!`);
      } else {
        state.happyHourLeft = 20; state.happyHourCooldown = 75; state.morale = Math.min(100, state.morale + 10); AUD.playSFX('unlock');
        showToast(`${TICK_SVG}Giờ Trà Chiều! Nhân viên x2 tốc độ trong 20 giây.`);
      }
      autoSave();
      renderHUD();
    };

    window.addEventListener('beforeunload', () => { autoSave(); if (rafId) cancelAnimationFrame(rafId); AUD.stopBGM(); });
    window.addEventListener('pagehide', () => { autoSave(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoSave(); });

    // Lỗi 10: Preload all office maps & tokens + add one-time retry on image load error
    if (AVA.preloadAll) AVA.preloadAll();
    ['dayMapImg', 'nightMapImg'].forEach(id => {
      const im = document.getElementById(id);
      if (im) im.onerror = () => {
        if (!im.dataset.retried) { im.dataset.retried = '1'; im.src = im.src.split('?')[0] + '?r=1'; }
      };
    });

    // Lỗi 11: Tap money pill to toggle full exact dollar amount even above $10,000
    const resPill = document.getElementById('resPill');
    if (resPill) resPill.onclick = () => {
      if (!state) return;
      moneyDisplayMode = isHudShowingExact(state.money) ? 'compact' : 'exact';
      renderHUD();
      showToast(moneyDisplayMode === 'exact'
        ? `💰 Hiển thị số chính xác: ${FIN.fmtMoney(state.money)}`
        : `💰 Hiển thị rút gọn: ${fmtHudMoney(state.money)}`);
    };

    // Lỗi 3: Hard scroll guard so viewport never shifts off-screen on mobile
    window.addEventListener('scroll', resetViewportScroll, { passive: true });

    showIntroScreen();
    lastTs = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  return { init };
})();

window.addEventListener('load', () => window.STARUP_ENGINE.init());

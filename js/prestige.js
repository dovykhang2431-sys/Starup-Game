window.STARUP_PRESTIGE = (() => {
  const CFG = window.STARUP_CONFIG;
  const FIN = window.STARUP_FINANCE;

  function createDefaultPrestige() {
    return {
      points: 0,
      totalEarned: 0,
      salesCount: 0,
      unlockedTier: 0,
      perks: {},
      chosenRooms: [],
      activePerks: {},
      hallOfFame: []
    };
  }

  function normalizePrestige(raw) {
    const def = createDefaultPrestige();
    if (!raw || typeof raw !== 'object') return def;
    def.points = Math.max(0, Math.floor(Number(raw.points) || 0));
    def.totalEarned = Math.max(def.points, Math.floor(Number(raw.totalEarned) || 0));
    def.salesCount = Math.max(0, Math.floor(Number(raw.salesCount) || 0));
    const maxExtra = ((CFG.PRESTIGE_CFG && CFG.PRESTIGE_CFG.MAX_TIER) || 3) - 1;
    def.unlockedTier = Math.min(maxExtra, Math.max(0, Math.floor(Number(raw.unlockedTier) || 0)));
    if (raw.perks && typeof raw.perks === 'object') {
      Object.keys(raw.perks).forEach(k => {
        const v = Math.min(3, Math.max(0, Math.floor(Number(raw.perks[k]) || 0)));
        if (v > 0) def.perks[k] = v;
      });
    }
    if (Array.isArray(raw.chosenRooms)) {
      def.chosenRooms = raw.chosenRooms.filter(r => typeof r === 'string' && r).slice(0, 3);
    }
    if (raw.activePerks && typeof raw.activePerks === 'object') {
      Object.keys(def.perks).forEach(k => {
        def.activePerks[k] = raw.activePerks[k] === false ? false : true;
      });
    } else {
      Object.keys(def.perks).forEach(k => { def.activePerks[k] = true; });
    }
    if (Array.isArray(raw.hallOfFame)) {
      def.hallOfFame = raw.hallOfFame.filter(x => x && typeof x === 'object').map(x => ({
        companyName: String(x.companyName || 'Startup'),
        ticker: String(x.ticker || 'STR'),
        valuation: Math.max(0, Math.round(Number(x.valuation) || 0)),
        day: Math.max(1, Math.floor(Number(x.day) || 1)),
        pointsEarned: Math.max(0, Math.floor(Number(x.pointsEarned) || 0)),
        ts: Number(x.ts) || 0
      })).sort((a, b) => b.valuation - a.valuation).slice(0, 30);
    }
    return def;
  }

  function ensurePrestige(state) {
    if (!state) return createDefaultPrestige();
    if (!state.prestige) state.prestige = createDefaultPrestige();
    else state.prestige = normalizePrestige(state.prestige);
    return state.prestige;
  }

  function getActiveLevel(state, perkId) {
    if (!state || !state.prestige) return 0;
    const p = state.prestige;
    const owned = (p.perks && p.perks[perkId]) || 0;
    if (owned <= 0) return 0;
    if (p.activePerks && p.activePerks[perkId] === false) return 0;
    return owned;
  }

  function getOwnedLevel(state, perkId) {
    if (!state || !state.prestige || !state.prestige.perks) return 0;
    return state.prestige.perks[perkId] || 0;
  }

  function getMaxReachableTier(state) {
    const p = state && state.prestige ? state.prestige : createDefaultPrestige();
    const maxT = (CFG.PRESTIGE_CFG && CFG.PRESTIGE_CFG.MAX_TIER) || 3;
    return Math.min(maxT, 1 + (p.unlockedTier || 0));
  }

  function getPerkCost(perkDef, targetTier) {
    const mults = (CFG.PRESTIGE_CFG && CFG.PRESTIGE_CFG.TIER_MULT) || [1, 1.5, 2.2];
    const m = mults[Math.max(0, Math.min(mults.length - 1, targetTier - 1))] || 1;
    return Math.round(perkDef.baseCost * m);
  }

  function calcSaleValuation(state) {
    const pcfg = CFG.PRESTIGE_CFG || { COEF_SHARE: 1500, COEF_STARS: 600, POINT_UNIT: 100000 };
    const netWorth = Math.max(0, FIN.getNetWorth(state));
    const EMP = window.STARUP_EMPIRE;
    const marketShare = EMP && EMP.getMarketShare ? EMP.getMarketShare(state) : (state.brandAwareness || 10);
    const stars = Math.max(0, state.stars || 0);
    const sharePart = Math.round(marketShare * pcfg.COEF_SHARE);
    const starsPart = Math.round(stars * pcfg.COEF_STARS);
    const valuation = netWorth + sharePart + starsPart;
    const points = Math.floor(valuation / pcfg.POINT_UNIT);
    return {
      netWorth, marketShare, coefA: pcfg.COEF_SHARE, sharePart,
      stars, coefB: pcfg.COEF_STARS, starsPart, valuation,
      pointUnit: pcfg.POINT_UNIT, points
    };
  }

  function getLockableRooms() {
    return (CFG.ROOMS || []).filter(r => !r.unlockedDefault);
  }

  function getRoomNameById(roomId) {
    const r = (CFG.ROOMS || []).find(x => x.id === roomId);
    return r ? `${r.icon} ${r.name}` : roomId;
  }

  function renderPerkIcon(perkDef, sizeCqw = 2.6) {
    if (perkDef.iconImg) {
      return `<img src="${perkDef.iconImg}" alt="${perkDef.name}" style="width:${sizeCqw}cqw;height:${sizeCqw}cqw;object-fit:contain;display:block;flex-shrink:0;" onerror="this.style.display='none';" />`;
    }
    return `<span style="width:${sizeCqw}cqw;height:${sizeCqw}cqw;border-radius:0.75cqw;background:#FEF3C7;border:0.12cqw solid #F59E0B;display:inline-flex;align-items:center;justify-content:center;font-size:${(sizeCqw * 0.62).toFixed(2)}cqw;flex-shrink:0;">${perkDef.emoji || '✨'}</span>`;
  }

  function buildPrestigeSectionHTML(state, tickSvg) {
    const p = ensurePrestige(state);
    const val = calcSaleValuation(state);
    const maxTier = getMaxReachableTier(state);
    const perks = (CFG.PRESTIGE_CFG && CFG.PRESTIGE_CFG.PERKS) || [];

    const sellCard = state.ipoDone ? `
      <div style="padding:0.95cqw 1.05cqw;border-radius:1.1cqw;background:linear-gradient(145deg,#FFFBEB,#FEF3C7);border:0.15cqw solid #F59E0B;margin-bottom:0.85cqw;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:0.65cqw;">
            <img src="assets/tokens/legacy.png" alt="Điểm Di Sản" style="width:2.7cqw;height:2.7cqw;object-fit:contain;" />
            <div>
              <div style="font-weight:900;font-size:1.18cqw;color:#78350F;">🏛️ Thoái Vốn & Bán Công Ty (Prestige)</div>
              <div style="font-size:0.96cqw;color:#92400E;">Điểm Di Sản hiện có: <strong>${p.points} điểm</strong> · Đã bán: <strong>${p.salesCount} lần</strong> (Mở tới Tầng ${maxTier}/3)</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5cqw;">
            <button id="btnOpenHallOfFame" type="button" style="padding:0.55cqw 0.9cqw;border-radius:0.85cqw;background:#4A3426;color:#FFFDF9;font-weight:800;border:none;cursor:pointer;white-space:nowrap;font-size:0.98cqw;">🏆 Sảnh Danh Vọng</button>
            <button id="btnSellCompany" type="button" style="padding:0.55cqw 1cqw;border-radius:0.85cqw;background:linear-gradient(180deg,#D97706,#B45309);color:#fff;font-weight:900;border:none;cursor:pointer;white-space:nowrap;font-size:1.02cqw;box-shadow:0 0.2cqw 0 #78350F;">💰 Bán Công Ty (+${val.points} điểm)</button>
          </div>
        </div>
        <div style="margin-top:0.6cqw;padding:0.6cqw 0.8cqw;border-radius:0.85cqw;background:#FFFDF9;border:0.11cqw solid #FDE68A;font-size:0.96cqw;color:#5C4636;line-height:1.45;">
          <div><strong>Định giá ước tính:</strong> <strong style="color:#059669;font-size:1.08cqw;">${FIN.fmtMoney(val.valuation)}</strong> → Quy đổi: <strong style="color:#B45309;font-size:1.08cqw;">${val.points} Điểm Di Sản</strong> <em>(mỗi $100,000 = 1 điểm, làm tròn xuống)</em></div>
          <div style="font-size:0.9cqw;color:#7C6350;margin-top:0.15cqw;">Công thức: Tài sản ròng (${FIN.fmtMoney(val.netWorth)}) + Thị phần (${val.marketShare}% × ${FIN.fmtMoney(val.coefA)}) + Uy tín (${val.stars} ★ × ${FIN.fmtMoney(val.coefB)})</div>
        </div>
      </div>
    ` : (p.salesCount > 0 || p.points > 0 ? `
      <div style="padding:0.8cqw 1cqw;border-radius:1.05cqw;background:#FFFBEB;border:0.13cqw solid #FCD34D;margin-bottom:0.85cqw;display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
        <div style="display:flex;align-items:center;gap:0.6cqw;">
          <img src="assets/tokens/legacy.png" alt="Điểm Di Sản" style="width:2.4cqw;height:2.4cqw;object-fit:contain;" />
          <div style="font-size:0.98cqw;color:#78350F;"><strong>Di Sản Tập Đoàn:</strong> ${p.points} Điểm Di Sản · Đã bán ${p.salesCount} lần · Mở tới Tầng ${maxTier}/3 <em>(Cần IPO để bán công ty hiện tại)</em></div>
        </div>
        <button id="btnOpenHallOfFame" type="button" style="padding:0.5cqw 0.85cqw;border-radius:0.8cqw;background:#4A3426;color:#FFFDF9;font-weight:800;border:none;cursor:pointer;white-space:nowrap;font-size:0.95cqw;">🏆 Sảnh Danh Vọng</button>
      </div>
    ` : '');

    if (!state.ipoDone && p.salesCount === 0 && p.points === 0) return '';

    const tierBlocks = [1, 2, 3].map(tierNum => {
      const tierLocked = tierNum > maxTier;
      const tierPerks = perks.filter(pk => pk.tier === tierNum);
      const tierLabel = tierNum === 1
        ? 'Tầng 1 — Nền Tảng Di Sản (Mở sẵn)'
        : `Tầng ${tierNum} — Tinh Hoa Tầng ${tierNum} ${tierLocked ? `(🔒 Bán công ty thêm ${tierNum - maxTier} lần để mở)` : '(Đã mở khóa)'}`;
      return `
        <div style="margin-top:0.65cqw;padding:0.75cqw 0.85cqw;border-radius:1cqw;background:${tierLocked ? '#F3EFEA' : '#FAF6F0'};border:0.12cqw solid ${tierLocked ? '#D6CCC0' : '#DFD2C1'};opacity:${tierLocked ? '0.78' : '1'};">
          <div style="font-weight:900;font-size:0.98cqw;color:${tierLocked ? '#7C6350' : '#4A3426'};margin-bottom:0.5cqw;">${tierLabel}</div>
          <div style="display:flex;flex-direction:column;gap:0.5cqw;">
            ${tierPerks.map(pk => {
              const ownedLv = getOwnedLevel(state, pk.id);
              const targetBuyTier = ownedLv + 1;
              const isMaxed = ownedLv >= maxTier;
              const cost = getPerkCost(pk, Math.min(3, targetBuyTier));
              const canBuy = !tierLocked && !isMaxed && p.points >= cost;
              const roomExtra = (pk.id === 'unlock_room' && p.chosenRooms.length > 0)
                ? `<div style="font-size:0.88cqw;color:#047857;font-weight:800;margin-top:0.15cqw;">Phòng đã chọn: ${p.chosenRooms.map(getRoomNameById).join(', ')}</div>`
                : '';
              return `
                <div style="padding:0.65cqw 0.85cqw;border-radius:0.9cqw;background:${ownedLv > 0 ? '#ECFDF5' : '#FFFDF9'};border:0.12cqw solid ${ownedLv > 0 ? '#86EFAC' : '#E5D9C8'};display:flex;align-items:center;justify-content:space-between;gap:0.75cqw;">
                  <div style="display:flex;align-items:center;gap:0.65cqw;min-width:0;">
                    ${renderPerkIcon(pk, 2.5)}
                    <div style="min-width:0;">
                      <div style="font-weight:900;color:#3D2B1F;font-size:1.02cqw;">${pk.name} ${ownedLv > 0 ? `<span style="padding:0.1cqw 0.5cqw;border-radius:999px;background:#059669;color:#fff;font-size:0.86cqw;">Cấp ${ownedLv}/${maxTier}</span>` : `<span style="padding:0.1cqw 0.45cqw;border-radius:999px;background:#EFE6DA;color:#6B5443;font-size:0.84cqw;">Chưa sở hữu</span>`}</div>
                      <div style="font-size:0.92cqw;color:#6B5443;line-height:1.35;">${pk.desc}</div>
                      ${roomExtra}
                    </div>
                  </div>
                  <button data-buy-perk="${pk.id}" type="button" ${canBuy ? '' : 'disabled'} style="padding:0.52cqw 0.85cqw;border-radius:0.8cqw;background:${isMaxed ? '#F59E0B' : (canBuy ? '#059669' : '#D6CCC0')};color:${isMaxed ? '#451A03' : (canBuy ? '#fff' : '#6B5443')};font-weight:800;border:none;cursor:${canBuy ? 'pointer' : 'not-allowed'};white-space:nowrap;font-size:0.94cqw;">
                    ${tierLocked ? '🔒 Khóa tầng' : (isMaxed ? `${tickSvg}Đã sở hữu` : `Mua · ${cost} điểm`)}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="margin-top:0.95cqw;padding-top:0.85cqw;border-top:0.14cqw dashed #D8C7B2;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
        ${sellCard}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35cqw;">
          <div style="font-weight:900;font-size:1.12cqw;color:#3D2B1F;">🌳 Cây Đặc Quyền Vĩnh Viễn (Cộng dồn qua mọi lần chơi)</div>
          <div style="font-size:0.96cqw;font-weight:800;color:#B45309;">Điểm khả dụng: ${p.points} điểm</div>
        </div>
        ${tierBlocks}
      </div>
    `;
  }

  function buildHallOfFameHTML(state) {
    const p = ensurePrestige(state);
    const list = [...(p.hallOfFame || [])].sort((a, b) => b.valuation - a.valuation);
    return `
      <div style="position:relative;border-radius:1.2cqw;overflow:hidden;border:0.16cqw solid #D97706;margin-bottom:0.9cqw;min-height:12.5cqw;display:flex;align-items:flex-end;background:#2B1C13;">
        <img src="assets/office_prestige.jpg" alt="Sảnh Danh Vọng" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.92;" />
        <div style="position:relative;z-index:2;width:100%;padding:0.9cqw 1.1cqw;background:linear-gradient(180deg,rgba(43,28,19,0.12) 0%,rgba(43,28,19,0.88) 100%);color:#FFFDF9;display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:0.75cqw;">
            <img src="assets/tokens/legacy.png" alt="Điểm Di Sản" style="width:3.2cqw;height:3.2cqw;object-fit:contain;filter:drop-shadow(0 0.2cqw 0.4cqw rgba(0,0,0,0.5));" />
            <div>
              <div style="font-size:1.32cqw;font-weight:900;color:#FDE68A;">🏛️ SẢNH DANH VỌNG DOANH NHÂN</div>
              <div style="font-size:0.98cqw;color:#FEF3C7;">Ghi danh các đế chế khởi nghiệp đã thoái vốn thành công</div>
            </div>
          </div>
          <div style="display:flex;gap:0.75cqw;text-align:right;">
            <div style="padding:0.45cqw 0.85cqw;border-radius:0.85cqw;background:rgba(255,253,249,0.16);border:0.1cqw solid rgba(253,230,138,0.45);">
              <div style="font-size:0.84cqw;color:#FDE68A;font-weight:700;">TỔNG ĐIỂM DI SẢN</div>
              <div style="font-size:1.25cqw;font-weight:900;color:#FFFDF9;">${p.totalEarned} điểm <span style="font-size:0.88cqw;font-weight:700;color:#A7F3D0;">(còn ${p.points})</span></div>
            </div>
            <div style="padding:0.45cqw 0.85cqw;border-radius:0.85cqw;background:rgba(255,253,249,0.16);border:0.1cqw solid rgba(253,230,138,0.45);">
              <div style="font-size:0.84cqw;color:#FDE68A;font-weight:700;">SỐ LẦN ĐÃ BÁN</div>
              <div style="font-size:1.25cqw;font-weight:900;color:#FFFDF9;">${p.salesCount} lần</div>
            </div>
          </div>
        </div>
      </div>
      ${list.length === 0 ? `
        <div style="padding:1.8cqw 1cqw;text-align:center;border-radius:1cqw;background:#FAF6F0;border:0.12cqw solid #DFD2C1;color:#6B5443;">
          Chưa có thương vụ bán công ty nào được ghi danh. Hãy phát triển công ty, niêm yết <strong>IPO</strong> rồi chọn <strong>Bán Công Ty</strong> trong tab <em>🌍 IPO & Chi Nhánh</em>!
        </div>
      ` : `
        <div style="font-size:0.96cqw;font-weight:800;color:#6B5443;margin-bottom:0.45cqw;">Bảng xếp hạng các thương vụ thoái vốn (xếp theo giá bán cao nhất):</div>
        <div style="display:flex;flex-direction:column;gap:0.55cqw;">
          ${list.map((item, idx) => {
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            return `
              <div style="padding:0.75cqw 1cqw;border-radius:0.95cqw;background:${idx === 0 ? '#FFFBEB' : '#FAF6F0'};border:0.13cqw solid ${idx === 0 ? '#F59E0B' : '#DFD2C1'};display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
                <div style="display:flex;align-items:center;gap:0.65cqw;">
                  <span style="font-size:1.3cqw;font-weight:900;min-width:2.2cqw;text-align:center;">${medal}</span>
                  <div>
                    <div style="font-weight:900;color:#3D2B1F;font-size:1.08cqw;">${item.companyName} <span style="color:#059669;">[${item.ticker}]</span></div>
                    <div style="font-size:0.94cqw;color:#6B5443;">Bán tại <strong>Ngày ${item.day}</strong> · Định giá: <strong style="color:#047857;">${FIN.fmtMoney(item.valuation)}</strong></div>
                  </div>
                </div>
                <div style="display:inline-flex;align-items:center;gap:0.35cqw;padding:0.35cqw 0.75cqw;border-radius:999px;background:#FEF3C7;border:0.11cqw solid #F59E0B;color:#92400E;font-weight:900;font-size:1.02cqw;">
                  <img src="assets/tokens/legacy.png" alt="Điểm" style="width:1.35cqw;height:1.35cqw;object-fit:contain;" />
                  <span>+${item.pointsEarned} điểm</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  }


  function purchasePerk(state, perkId, chosenRoomId = null) {
    if (!state || !CFG || !CFG.PRESTIGE_CFG) {
      return { ok: false, error: 'Không thể khởi tạo dữ liệu đặc quyền.' };
    }
    const p = ensurePrestige(state);
    const perkDef = (CFG.PRESTIGE_CFG.PERKS || []).find(x => x.id === perkId);
    if (!perkDef) {
      return { ok: false, error: 'Không tìm thấy đặc quyền này!' };
    }
    const maxT = CFG.PRESTIGE_CFG.MAX_TIER || 3;
    const maxTier = Math.min(maxT, 1 + (p.unlockedTier || 0));
    if (perkDef.tier > maxTier) {
      return { ok: false, error: `Tầng ${perkDef.tier} chưa được mở khóa — hãy bán công ty thêm để mở tầng!` };
    }
    const ownedLv = (p.perks && p.perks[perkId]) || 0;
    if (ownedLv >= maxTier) {
      return { ok: false, error: 'Đặc quyền này đã đạt cấp tối đa cho tầng hiện tại!' };
    }
    const nextTier = ownedLv + 1;
    const cost = getPerkCost(perkDef, nextTier);
    if ((p.points || 0) < cost) {
      return { ok: false, error: `Cần ${cost} Điểm Di Sản để mua đặc quyền này (hiện có ${p.points || 0} điểm)!` };
    }
    if (perkId === 'unlock_room') {
      if (!chosenRoomId) {
        return { ok: false, needsRoomChoice: true, cost, nextTier, perkDef };
      }
      const validIds = getLockableRooms().map(r => r.id);
      if (!validIds.includes(chosenRoomId) || p.chosenRooms.includes(chosenRoomId)) {
        return { ok: false, error: 'Phòng ban đã chọn không hợp lệ hoặc đã được chọn trước đó!' };
      }
      p.chosenRooms.push(chosenRoomId);
    }
    p.points = Math.max(0, (p.points || 0) - cost);
    p.perks[perkId] = nextTier;
    p.activePerks[perkId] = true;
    state.prestige = p;
    return { ok: true, perkDef, nextTier, cost, pointsLeft: p.points, chosenRoomId };
  }

  return {
    createDefaultPrestige, normalizePrestige, ensurePrestige, purchasePerk,
    getActiveLevel, getOwnedLevel, getMaxReachableTier, getPerkCost,
    calcSaleValuation, getLockableRooms, getRoomNameById,
    renderPerkIcon, buildPrestigeSectionHTML, buildHallOfFameHTML
  };
})();

window.STARUP_EMPIRE = (() => {
  const CFG = window.STARUP_CONFIG;
  const FIN = window.STARUP_FINANCE;

  function getSeason(day) {
    const idx = Math.floor((Math.max(1, day) - 1) / 5) % CFG.SEASONS.length;
    return CFG.SEASONS[idx];
  }

  function getMarketShare(state) {
    let share = 10; // Base startup share
    const acquired = state.acquiredRivals || [];
    CFG.RIVALS.forEach(r => { if (acquired.includes(r.id)) share += r.share; });
    return Math.min(100, share);
  }

  function getDailyProductIncome(state) {
    const prods = state.products || {};
    let total = 0;
    CFG.PRODUCTS.forEach(p => {
      const lv = prods[p.id] || 0;
      if (lv > 0) total += Math.round(p.dailyIncome * (1 + (lv - 1) * 0.5));
    });
    return total;
  }

  function getDailyRivalDividend(state) {
    const acquired = state.acquiredRivals || [];
    return CFG.RIVALS.reduce((s, r) => s + (acquired.includes(r.id) ? r.dividend : 0), 0);
  }

  function buildEmpireModalHTML(state, activeTab, tickSvg) {
    const tabs = [
      { id: 'products', label: '🚀 Sản Phẩm' },
      { id: 'rivals',   label: '🏢 Đối Thủ M&A' },
      { id: 'ipo',      label: '🌍 IPO & Chi Nhánh' }
    ];

    const tabBar = `
      <div style="display:flex;gap:0.5cqw;margin-bottom:0.9cqw;">
        ${tabs.map(t => `
          <button data-emp-tab="${t.id}" type="button" style="flex:1;padding:0.68cqw 0.4cqw;border-radius:0.9cqw;font-size:1.08cqw;font-weight:800;border:none;cursor:pointer;white-space:nowrap;${activeTab === t.id ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    `;

    let body = '';
    if (activeTab === 'products') {
      const dailyInc = getDailyProductIncome(state);
      const prods = state.products || {};
      body = `
        <div style="margin-bottom:0.8cqw;padding:0.65cqw 1cqw;border-radius:0.95cqw;background:#ECFDF5;border:0.12cqw solid #86EFAC;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:800;color:#065F46;">🚀 Thu nhập định kỳ từ Sản Phẩm riêng (17:00)</span>
          <strong style="color:#047857;font-size:1.3cqw;">+${FIN.fmtMoney(dailyInc)}/ngày</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.65cqw;">
          ${CFG.PRODUCTS.map(p => {
            const lv = prods[p.id] || 0;
            const hasReq = !p.reqRoom || (state.rooms[p.reqRoom] && state.rooms[p.reqRoom].unlocked);
            const cost = lv === 0 ? p.cost : Math.round(p.cost * Math.pow(1.65, lv));
            const curInc = lv > 0 ? Math.round(p.dailyIncome * (1 + (lv - 1) * 0.5)) : p.dailyIncome;
            const isMax = lv >= 5;
            const disabled = !hasReq || isMax;
            return `
              <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid ${lv > 0 ? '#86EFAC' : '#DFD2C1'};background:${lv > 0 ? '#F0FDF4' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.9cqw;">
                <div>
                  <div style="font-weight:900;color:#3D2B1F;">${p.icon} ${p.name} ${lv > 0 ? `<span style="padding:0.12cqw 0.55cqw;border-radius:999px;background:#059669;color:#fff;font-size:0.92cqw;">v${lv}.0</span>` : ''}</div>
                  <div style="font-size:1.02cqw;color:#6B5443;">${lv > 0 ? `Đang thu <strong style="color:#059669;">+${FIN.fmtMoney(curInc)}/ngày</strong> · Nâng cấp +50%` : `Thu thụ động <strong style="color:#059669;">+${FIN.fmtMoney(p.dailyIncome)}/ngày</strong> · Cần ${p.reqLabel}`}</div>
                </div>
                <button data-prod-act="${p.id}" type="button" ${disabled ? 'disabled' : ''} style="padding:0.58cqw 1cqw;border-radius:0.85cqw;background:${isMax ? '#F59E0B' : (disabled ? '#D6CCC0' : '#059669')};color:${isMax ? '#451A03' : (disabled ? '#6B5443' : '#fff')};font-weight:800;border:none;cursor:${disabled ? 'not-allowed' : 'pointer'};white-space:nowrap;">
                  ${isMax ? '★ MAX' : (!hasReq ? `🔒 ${p.reqLabel}` : (lv === 0 ? `Ra mắt · ${FIN.fmtMoney(cost)}` : `Lên v${lv + 1} · ${FIN.fmtMoney(cost)}`))}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (activeTab === 'rivals') {
      const share = getMarketShare(state);
      const acquired = state.acquiredRivals || [];
      const divTotal = getDailyRivalDividend(state);
      body = `
        <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;background:#EFF6FF;border:0.12cqw solid #93C5FD;margin-bottom:0.8cqw;">
          <div style="display:flex;justify-content:space-between;font-weight:900;color:#1E3A8A;margin-bottom:0.35cqw;">
            <span>📊 Thị phần của ${state.companyName}: ${share}%</span>
            <span style="color:#059669;">Cổ tức M&A: +${FIN.fmtMoney(divTotal)}/ngày</span>
          </div>
          <div style="height:0.75cqw;border-radius:999px;background:#DBEAFE;overflow:hidden;">
            <div style="height:100%;width:${share}%;background:linear-gradient(90deg,#3B82F6,#1D4ED8);transition:width 0.3s ease;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.65cqw;">
          ${CFG.RIVALS.map(r => {
            const owned = acquired.includes(r.id);
            const canBuy = !owned && state.stars >= r.reqStars && (!r.reqIPO || state.ipoDone);
            let lockTxt = '';
            if (r.reqIPO && !state.ipoDone) lockTxt = 'Cần IPO';
            else if (state.stars < r.reqStars) lockTxt = `≥ ${r.reqStars} ★`;
            return `
              <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid ${owned ? '#86EFAC' : '#DFD2C1'};background:${owned ? '#ECFDF5' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.9cqw;">
                <div>
                  <div style="font-weight:900;color:#3D2B1F;">${r.icon} ${r.name} <span style="color:#2563EB;font-size:1.0cqw;">(+${r.share}% thị phần)</span></div>
                  <div style="font-size:1.02cqw;color:#6B5443;">Cổ tức vĩnh viễn: <strong style="color:#059669;">+${FIN.fmtMoney(r.dividend)}/ngày</strong></div>
                </div>
                <button data-buy-rival="${r.id}" type="button" ${canBuy ? '' : 'disabled'} style="padding:0.58cqw 1cqw;border-radius:0.85cqw;background:${owned ? '#059669' : (canBuy ? '#2563EB' : '#D6CCC0')};color:${(owned || canBuy) ? '#fff' : '#6B5443'};font-weight:800;border:none;cursor:${canBuy ? 'pointer' : 'not-allowed'};white-space:nowrap;">
                  ${owned ? `${tickSvg}Đã thâu tóm` : (canBuy ? `Mua lại · ${FIN.fmtMoney(r.cost)}` : `🔒 ${lockTxt}`)}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      const deptRooms = CFG.ROOMS.filter(r => r.id !== 'lobby');
      const allUnlocked = deptRooms.every(r => state.rooms[r.id] && state.rooms[r.id].unlocked);
      const nw = FIN.getNetWorth(state);
      const canIPO = !state.ipoDone && allUnlocked && nw >= 30000 && state.stars >= 80;
      const tickerGuess = (state.companyName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'STR');
      const founderEq = 100 - (state.investorEquity || 0);
      const ipoCash = Math.round(35000 * (founderEq / 100));

      body = `
        <div style="padding:1cqw;border-radius:1.1cqw;background:${state.ipoDone ? '#ECFDF5' : '#FFF7ED'};border:0.12cqw solid ${state.ipoDone ? '#A7F3D0' : '#FDBA74'};margin-bottom:0.85cqw;">
          <div style="font-weight:900;font-size:1.3cqw;color:#3D2B1F;">
            ${state.ipoDone ? `${tickSvg}ĐÃ LÊN SÀN IPO — Mã [${state.ticker}]` : `🎯 Mục tiêu IPO của ${state.companyName}`}
          </div>
          <div style="font-size:1.05cqw;color:#6B5443;margin-top:0.3cqw;">
            Tài sản ròng: <strong>${FIN.fmtMoney(nw)} / $30,000</strong> · Uy tín: <strong>${state.stars} / 80 ★</strong> · Phòng ban: <strong>${deptRooms.filter(r => state.rooms[r.id] && state.rooms[r.id].unlocked).length}/${deptRooms.length}</strong>
          </div>
          ${!state.ipoDone ? `
            <button id="btnDoIPO" type="button" ${canIPO ? '' : 'disabled'} style="margin-top:0.75cqw;width:100%;padding:0.78cqw;border-radius:0.9cqw;background:${canIPO ? '#D97706' : '#D6CCC0'};color:#fff;font-weight:800;border:none;cursor:${canIPO ? 'pointer' : 'not-allowed'};">
              ${canIPO ? `🔔 Rung Chuông IPO [${tickerGuess}] (+${FIN.fmtMoney(ipoCash)} theo ${founderEq}% cổ phần)` : 'Hoàn thành đủ 3 điều kiện trên để IPO'}
            </button>
          ` : `<div style="margin-top:0.35cqw;color:#047857;font-weight:800;font-size:1.05cqw;">Mã [${state.ticker}] đã niêm yết trên Sàn Chứng Khoán trong mục 🏦 Tài Chính!</div>`}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.65cqw;">
          ${CFG.BRANCHES.map((b, idx) => {
            const maxUnlocked = Math.max(state.branchIdx || 0, state.maxBranchIdx || 0);
            const isCur = (state.activeMapIdx !== undefined ? state.activeMapIdx : state.branchIdx) === idx;
            const unlocked = idx <= maxUnlocked;
            const canExp = state.ipoDone && idx === state.branchIdx + 1 && nw >= b.reqVal;
            return `
              <div style="padding:0.8cqw 1cqw;border-radius:1cqw;border:0.12cqw solid ${isCur ? '#10B981' : '#DFD2C1'};background:${isCur ? '#F0FDF4' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
                <div>
                  <div style="font-weight:800;color:#3D2B1F;">${b.name}</div>
                  <div style="font-size:1.0cqw;color:#6B5443;">${b.desc}</div>
                </div>
                ${unlocked
                  ? (isCur
                      ? `<span style="padding:0.35cqw 0.78cqw;border-radius:999px;background:#059669;color:#fff;font-weight:800;font-size:0.98cqw;white-space:nowrap;">Đang dùng mặt bằng</span>`
                      : `<button data-switch-map="${idx}" type="button" style="padding:0.45cqw 0.85cqw;border-radius:0.8cqw;background:#4A3426;color:#FFFDF9;font-weight:800;border:none;cursor:pointer;white-space:nowrap;">🏢 Chuyển mặt bằng</button>`)
                  : `<button data-expand-branch="${idx}" type="button" ${canExp ? '' : 'disabled'} style="padding:0.52cqw 0.88cqw;border-radius:0.85cqw;background:${canExp ? '#D97706' : '#D6CCC0'};color:#fff;font-weight:800;border:none;cursor:${canExp ? 'pointer' : 'not-allowed'};white-space:nowrap;">Mở rộng</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return tabBar + body;
  }

  return { getSeason, getMarketShare, getDailyProductIncome, getDailyRivalDividend, buildEmpireModalHTML };
})();

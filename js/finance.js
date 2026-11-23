window.STARUP_FINANCE = (() => {
  function fmtMoney(n) {
    const sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
  }

  function renderSparkline(history, color) {
    if (!history || history.length < 2) return '';
    const min = Math.min(...history) * 0.96;
    const max = Math.max(...history) * 1.04;
    const span = Math.max(1, max - min);
    const pts = history.map((v, i) => {
      const x = (i / (history.length - 1)) * 68 + 2;
      const y = 22 - ((v - min) / span) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 72 24" style="width:7.2cqw;height:2.4cqw;display:block;"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/></svg>`;
  }

  function updateStockPrices(state, macroBias = {}) {
    state.stocks.forEach(st => {
      const bias = (macroBias[st.symbol] !== undefined) ? macroBias[st.symbol] : (st.nextBias || 0);
      const drift = (Math.random() * 2 - 0.98) * st.volatility + bias;
      const next = Math.max(15, Math.round(st.price * (1 + drift)));
      st.prevPrice = st.price;
      st.price = next;
      st.history.push(next);
      if (st.history.length > 12) st.history.shift();
      st.nextBias = (Math.random() * 0.12 - 0.055);
    });
  }

  function getPortfolioValue(state) {
    return state.stocks.reduce((sum, st) => sum + (st.shares || 0) * st.price, 0);
  }

  function getNetWorth(state) {
    const savingsTotal = (state.savings.flex || 0) + (state.savings.fixed || 0);
    const loanDebt = state.loan ? state.loan.dailyPay * state.loan.daysLeft : 0;
    return Math.round(state.money + savingsTotal + getPortfolioValue(state) - loanDebt);
  }

  function getBuyback5Cost(state) {
    const nw = Math.max(4000, getNetWorth(state));
    return Math.max(1200, Math.round(nw * 0.14));
  }

  function buildFinanceModalHTML(state, activeTab) {
    const CFG = window.STARUP_CONFIG;
    const hasFinRoom = state.rooms.finance && state.rooms.finance.unlocked;
    const unlockedCount = getUnlockedDeptCount(state);
    const investorEq = state.investorEquity || 0;
    const founderEq = 100 - investorEq;

    const tabs = [
      { id: 'loan',    label: '🏦 Vay Vốn' },
      { id: 'funding', label: '🤝 Gọi Vốn' },
      { id: 'savings', label: '💰 Tiết Kiệm' },
      { id: 'stocks',  label: '📈 Cổ Phiếu' }
    ];

    const tabBar = `
      <div style="display:flex;gap:0.45cqw;margin-bottom:0.85cqw;">
        ${tabs.map(t => `
          <button data-fin-tab="${t.id}" type="button" style="flex:1;padding:0.65cqw 0.4cqw;border-radius:0.9cqw;font-size:1.06cqw;font-weight:800;border:none;cursor:pointer;white-space:nowrap;${activeTab === t.id ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    `;

    let body = '';
    if (activeTab === 'loan') {
      if (state.loan) {
        const remain = state.loan.dailyPay * state.loan.daysLeft;
        body = `
          <div style="padding:1cqw 1.1cqw;border-radius:1.1cqw;background:#FEF2F2;border:0.14cqw solid #FECACA;margin-bottom:0.75cqw;">
            <div style="font-weight:900;color:#991B1B;font-size:1.22cqw;">Khoản vay đang chạy: ${state.loan.name}</div>
            <div style="margin-top:0.3cqw;color:#7F1D1D;">Trả góp lúc 17:00: <strong>${fmtMoney(state.loan.dailyPay)}/ngày</strong> (còn ${state.loan.daysLeft} ngày · Tổng ${fmtMoney(remain)})</div>
            <div style="margin-top:0.35cqw;font-size:1.0cqw;color:#9A3412;font-weight:700;">ℹ️ Quy định ngân hàng: Chỉ được giữ 1 khoản vay tại một thời điểm — hãy trả hết hoặc bấm Tất toán sớm để vay gói mới.</div>
            <button id="btnPayoffLoan" type="button" style="margin-top:0.7cqw;padding:0.58cqw 1.15cqw;border-radius:0.85cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">Tất toán sớm (${fmtMoney(remain)})</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.55cqw;opacity:0.7;">
            ${CFG.LOANS.map(l => `
              <div style="padding:0.7cqw 0.95cqw;border-radius:0.95cqw;border:0.12cqw solid #E7E0D8;background:#F5F2EE;display:flex;align-items:center;justify-content:space-between;gap:0.8cqw;">
                <div>
                  <div style="font-weight:800;color:#4A3426;">${l.name} — <span style="color:#059669;">${fmtMoney(l.amount)}</span></div>
                  <div style="font-size:0.96cqw;color:#7C6350;">${l.desc}</div>
                </div>
                <span style="padding:0.45cqw 0.8cqw;border-radius:0.75cqw;background:#D6CCC0;color:#5C4636;font-weight:800;font-size:0.96cqw;white-space:nowrap;">🔒 Đang có nợ</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        body = `
          <div style="margin-bottom:0.75cqw;padding:0.55cqw 0.9cqw;border-radius:0.85cqw;background:#FFF7ED;border:0.12cqw solid #FDBA74;color:#9A3412;font-size:1.03cqw;font-weight:700;">
            💡 <strong>Vay Ngân Hàng:</strong> Giữ 100% công ty nhưng phải trả góp đều lúc 17:00. Hạn mức mở dần theo Ngày & Uy tín!
          </div>
          <div style="display:flex;flex-direction:column;gap:0.65cqw;">
            ${CFG.LOANS.map(l => {
              const adjPay = hasFinRoom ? Math.round(l.dailyPay * 0.92) : l.dailyPay;
              const okDay = state.day >= l.reqDay;
              const okStars = state.stars >= l.reqStars;
              const okFin = !l.reqFinance || hasFinRoom;
              const okRooms = unlockedCount >= l.reqRooms;
              const eligible = okDay && okStars && okFin && okRooms;
              let lockReason = '';
              if (!okDay) lockReason = `Mở từ Ngày ${l.reqDay}`;
              else if (!okFin) lockReason = 'Cần P.Tài Chính';
              else if (!okRooms) lockReason = `Cần ≥ ${l.reqRooms} phòng`;
              else if (!okStars) lockReason = `Cần ≥ ${l.reqStars} ★`;
              return `
                <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid ${eligible ? '#DFD2C1' : '#E7E0D8'};background:${eligible ? '#FAF6F0' : '#F5F2EE'};opacity:${eligible ? '1' : '0.78'};display:flex;align-items:center;justify-content:space-between;gap:0.9cqw;">
                  <div>
                    <div style="font-weight:900;color:#3D2B1F;">${l.name} — <span style="color:#059669;">${fmtMoney(l.amount)}</span></div>
                    <div style="font-size:1.0cqw;color:#6B5443;">Trả ${fmtMoney(adjPay)}/ngày × ${l.days}N ${hasFinRoom ? '<strong style="color:#059669;">(-8% lãi)</strong>' : ''} · ${l.desc.split('·')[1] || ''}</div>
                  </div>
                  <button data-take-loan="${l.id}" type="button" ${eligible ? '' : 'disabled'} style="padding:0.58cqw 1cqw;border-radius:0.85cqw;background:${eligible ? '#2563EB' : '#D6CCC0'};color:${eligible ? '#fff' : '#6B5443'};font-weight:800;border:none;cursor:${eligible ? 'pointer' : 'not-allowed'};white-space:nowrap;">
                    ${eligible ? 'Vay ngay' : `🔒 ${lockReason}`}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    } else if (activeTab === 'funding') {
      const doneRounds = state.fundingTaken || [];
      const buybackCost = getBuyback5Cost(state);
      body = `
        <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;background:#F0FDF4;border:0.12cqw solid #86EFAC;margin-bottom:0.8cqw;">
          <div style="display:flex;justify-content:space-between;font-weight:900;font-size:1.12cqw;margin-bottom:0.35cqw;">
            <span style="color:#065F46;">🟢 Của bạn: ${founderEq}%</span>
            <span style="color:#C2410C;">🟠 Nhà đầu tư: ${investorEq}%</span>
          </div>
          <div style="height:0.75cqw;border-radius:999px;background:#FDBA74;overflow:hidden;">
            <div style="height:100%;width:${founderEq}%;background:linear-gradient(90deg,#10B981,#059669);transition:width 0.3s ease;"></div>
          </div>
          <div style="margin-top:0.45cqw;font-size:1.0cqw;color:#3F5243;display:flex;align-items:center;justify-content:space-between;gap:0.6cqw;">
            <span>Không trả góp hằng ngày — chỉ chia ${investorEq}% trên <strong>tiền lời</strong> (ngày lỗ không mất).</span>
            ${investorEq > 0 ? `<button id="btnBuybackEq" type="button" style="padding:0.42cqw 0.8cqw;border-radius:0.75cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;white-space:nowrap;">Mua lại 5% (${fmtMoney(buybackCost)})</button>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.65cqw;">
          ${CFG.FUNDING_ROUNDS.map(f => {
            const taken = doneRounds.includes(f.id);
            const okDay = state.day >= f.reqDay;
            const okStars = state.stars >= f.reqStars;
            const okRooms = unlockedCount >= f.reqRooms;
            const okRoomId = !f.reqRoomId || (state.rooms[f.reqRoomId] && state.rooms[f.reqRoomId].unlocked);
            const canTake = !taken && okDay && okStars && okRooms && okRoomId;
            const missingParts = [];
            if (!okDay) missingParts.push(`Ngày ${f.reqDay}`);
            if (!okRooms) missingParts.push(`≥ ${f.reqRooms} phòng`);
            if (!okStars) missingParts.push(`≥ ${f.reqStars} ★`);
            if (!okRoomId) missingParts.push(f.reqRoomId === 'finance' ? 'P.Tài Chính' : 'P.Kỹ Thuật');
            const lockTxt = missingParts.join(' · ');
            const reqBadges = [
              `<span style="color:${okDay ? '#059669' : '#B45309'};font-weight:800;">${okDay ? '✓' : '•'} Ngày ${f.reqDay}</span>`,
              `<span style="color:${okRooms ? '#059669' : '#B45309'};font-weight:800;">${okRooms ? '✓' : '•'} ${Math.min(unlockedCount, f.reqRooms)}/${f.reqRooms} phòng</span>`,
              `<span style="color:${okStars ? '#059669' : '#B45309'};font-weight:800;">${okStars ? '✓' : '•'} ${f.reqStars} ★</span>`
            ];
            if (f.reqRoomId) {
              const rn = f.reqRoomId === 'finance' ? 'P.Tài Chính' : 'P.Kỹ Thuật';
              reqBadges.push(`<span style="color:${okRoomId ? '#059669' : '#B45309'};font-weight:800;">${okRoomId ? '✓' : '•'} ${rn}</span>`);
            }
            return `
              <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.12cqw solid ${taken ? '#86EFAC' : '#DFD2C1'};background:${taken ? '#ECFDF5' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.9cqw;">
                <div>
                  <div style="font-weight:900;color:#3D2B1F;">${f.icon} ${f.name} — <span style="color:#059669;">+${fmtMoney(f.amount)}</span> <span style="color:#C2410C;font-size:1.02cqw;">(Chia ${f.equity}% lời)</span></div>
                  <div style="font-size:1.0cqw;color:#6B5443;">${f.desc}</div>
                  ${taken ? '' : `<div style="font-size:0.94cqw;color:#7C6350;margin-top:0.25cqw;">Điều kiện mở: ${reqBadges.join(' &nbsp;·&nbsp; ')}</div>`}
                </div>
                <button data-take-fund="${f.id}" type="button" ${canTake ? '' : 'disabled'} style="padding:0.58cqw 0.9cqw;border-radius:0.85cqw;background:${taken ? '#059669' : (canTake ? '#D97706' : '#D6CCC0')};color:${(taken || canTake) ? '#fff' : '#6B5443'};font-weight:800;border:none;cursor:${canTake ? 'pointer' : 'not-allowed'};white-space:nowrap;font-size:0.98cqw;">
                  ${taken ? 'Đã nhận' : (canTake ? 'Nhận vốn' : `🔒 ${lockTxt}`)}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (activeTab === 'savings') {
      const flexRate = hasFinRoom ? '2.0%' : '1.5%';
      const fixRate = hasFinRoom ? '4.5%' : '4.0%';
      body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.9cqw;">
          <div style="padding:1.05cqw;border-radius:1.2cqw;border:0.12cqw solid #BBF7D0;background:#F0FDF4;">
            <div style="font-weight:800;color:#166534;">Không kỳ hạn (+${flexRate}/ngày)</div>
            <div style="font-size:1.65cqw;font-weight:900;color:#3D2B1F;margin:0.35cqw 0;">${fmtMoney(state.savings.flex)}</div>
            <div style="font-size:1.0cqw;color:#475569;margin-bottom:0.75cqw;">Rút bất cứ lúc nào khi cần tiền gấp.</div>
            <div style="display:flex;gap:0.5cqw;">
              <button data-sav-act="dep_flex_500" type="button" style="flex:1;padding:0.55cqw;border-radius:0.8cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">Gửi $500</button>
              <button data-sav-act="wd_flex_all" type="button" style="flex:1;padding:0.55cqw;border-radius:0.8cqw;background:#FFFDF9;color:#3D2B1F;font-weight:800;border:0.12cqw solid #CBD5E1;cursor:pointer;">Rút hết</button>
            </div>
          </div>
          <div style="padding:1.05cqw;border-radius:1.2cqw;border:0.12cqw solid #FDE68A;background:#FFFBEB;">
            <div style="font-weight:800;color:#92400E;">Kỳ hạn 3 ngày (+${fixRate}/ngày)</div>
            <div style="font-size:1.65cqw;font-weight:900;color:#3D2B1F;margin:0.35cqw 0;">${fmtMoney(state.savings.fixed)}</div>
            <div style="font-size:1.0cqw;color:#475569;margin-bottom:0.75cqw;">${state.savings.fixed > 0 ? `Còn ${state.savings.fixedDaysLeft} ngày đáo hạn.` : 'Lãi cao, khóa 3 ngày.'}</div>
            <div style="display:flex;gap:0.5cqw;">
              <button data-sav-act="dep_fixed_1000" type="button" style="flex:1;padding:0.55cqw;border-radius:0.8cqw;background:#D97706;color:#fff;font-weight:800;border:none;cursor:pointer;">Gửi $1,000</button>
              <button data-sav-act="wd_fixed_all" type="button" style="flex:1;padding:0.55cqw;border-radius:0.8cqw;background:#FFFDF9;color:#3D2B1F;font-weight:800;border:0.12cqw solid #CBD5E1;cursor:pointer;">Rút gốc</button>
            </div>
          </div>
        </div>
      `;
    } else {
      const portVal = getPortfolioValue(state);
      body = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75cqw;padding:0.6cqw 0.95cqw;border-radius:0.9cqw;background:#FAF6F0;border:0.12cqw solid #DFD2C1;">
          <span style="color:#5C4636;">Danh mục đang giữ: <strong style="color:#3D2B1F;">${fmtMoney(portVal)}</strong></span>
          <span style="font-size:1.02cqw;color:#0369A1;font-weight:800;">${hasFinRoom ? '💹 Đã bật Dự báo xu hướng' : 'Mở P.Tài Chính để xem dự báo'}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6cqw;">
          ${state.stocks.map(st => {
            const diff = st.prevPrice ? ((st.price - st.prevPrice) / st.prevPrice) * 100 : 0;
            const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
            const pnl = st.shares > 0 ? Math.round((st.price - st.avgCost) * st.shares) : 0;
            const forecast = hasFinRoom
              ? (st.nextBias >= 0.015 ? '<span style="color:#059669;font-weight:800;">↗ Tăng</span>' : (st.nextBias <= -0.015 ? '<span style="color:#DC2626;font-weight:800;">↘ Giảm</span>' : '<span style="color:#64748B;">→ Ổn định</span>'))
              : '';
            return `
              <div style="padding:0.7cqw 0.95cqw;border-radius:1cqw;border:0.12cqw solid #DFD2C1;background:#FFFDF9;display:flex;align-items:center;justify-content:space-between;gap:0.75cqw;">
                <div style="min-width:13.5cqw;">
                  <div style="font-weight:800;color:#3D2B1F;">[${st.symbol}] <span style="font-weight:600;color:#6B5443;font-size:1.02cqw;">${st.name}</span> ${forecast}</div>
                  <div style="font-size:1.0cqw;color:#7C6350;">Giữ: <strong>${st.shares || 0} CP</strong> ${st.shares > 0 ? `(<span style="color:${pnl >= 0 ? '#059669' : '#DC2626'};font-weight:700;">${pnl >= 0 ? '+' : ''}${fmtMoney(pnl)}</span>)` : ''}</div>
                </div>
                <div>${renderSparkline(st.history, diff >= 0 ? '#10B981' : '#EF4444')}</div>
                <div style="text-align:right;min-width:6cqw;">
                  <div style="font-weight:900;color:#3D2B1F;">$${st.price}</div>
                  <div style="font-size:0.98cqw;font-weight:800;color:${diff >= 0 ? '#059669' : '#DC2626'};">${diffStr}</div>
                </div>
                <div style="display:flex;gap:0.38cqw;">
                  <button data-stk-buy="${st.symbol}" type="button" style="padding:0.48cqw 0.78cqw;border-radius:0.75cqw;background:#059669;color:#fff;font-weight:800;border:none;cursor:pointer;">Mua 1</button>
                  <button data-stk-buy5="${st.symbol}" type="button" style="padding:0.48cqw 0.68cqw;border-radius:0.75cqw;background:#0284C7;color:#fff;font-weight:800;border:none;cursor:pointer;">x5</button>
                  <button data-stk-sell1="${st.symbol}" type="button" style="padding:0.48cqw 0.65cqw;border-radius:0.75cqw;background:#FEF3C7;color:#92400E;font-weight:800;border:0.12cqw solid #FCD34D;cursor:pointer;">Bán 1</button>
                  <button data-stk-sell="${st.symbol}" type="button" style="padding:0.48cqw 0.72cqw;border-radius:0.75cqw;background:#EFE6DA;color:#3D2B1F;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">Bán hết</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return tabBar + body;
  }

  function getUnlockedDeptCount(state) {
    const rooms = (window.STARUP_CONFIG && window.STARUP_CONFIG.ROOMS) || [];
    return rooms.filter(r => r.id !== 'lobby' && state.rooms && state.rooms[r.id] && state.rooms[r.id].unlocked).length;
  }

  return { fmtMoney, updateStockPrices, getPortfolioValue, getNetWorth, getBuyback5Cost, getUnlockedDeptCount, buildFinanceModalHTML };
})();

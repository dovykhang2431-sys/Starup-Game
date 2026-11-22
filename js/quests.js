window.STARUP_QUESTS = (() => {
  const FIN = window.STARUP_FINANCE;

  const BANTER = {
    open: [
      'Chấm công kịp giờ!',
      'Cà phê sáng thôi!',
      'Hôm nay chốt kèo lớn!',
      'Chào sếp buổi sáng!'
    ],
    work: [
      'Code chạy mượt quá!',
      'Đơn này thơm nè sếp!',
      'Tập trung chạy deadline!',
      'Sắp xong rồi sếp ơi!',
      'Khách khen quá trời!'
    ],
    lunch: [
      'Trưa nay ăn gì ta?',
      'Pantry nay thơm cà phê!',
      'Nghỉ tí chiều chạy tiếp!',
      'Bữa trưa nạp năng lượng!'
    ],
    night: [
      'Tan làm về thôi!',
      'Hẹn mai gặp lại sếp!',
      'Hôm nay năng suất quá!'
    ]
  };

  function generateDailyQuests(day) {
    const targetContracts = Math.min(6, 2 + Math.floor((day - 1) / 2));
    const targetRev = Math.round((220 + (day - 1) * 180) / 50) * 50;
    return [
      { id: 'q_contracts', title: `Chốt ${targetContracts} hợp đồng hôm nay`, type: 'contracts', target: targetContracts, progress: 0, rewardCash: 160 + day * 40, rewardStars: 2, claimed: false },
      { id: 'q_revenue',   title: `Đạt doanh thu ${FIN.fmtMoney(targetRev)} trong ngày`, type: 'revenue', target: targetRev, progress: 0, rewardCash: 220 + day * 60, rewardStars: 3, claimed: false },
      { id: 'q_action',    title: 'Nâng cấp 1 phòng, chạy Marketing hoặc mua Cổ phiếu', type: 'action', target: 1, progress: 0, rewardCash: 180 + day * 45, rewardStars: 3, claimed: false }
    ];
  }

  function countClaimable(state) {
    return (state.dailyQuests || []).filter(q => !q.claimed && q.progress >= q.target).length;
  }

  function pickBanter(phaseKey) {
    const list = BANTER[phaseKey] || BANTER.work;
    return list[Math.floor(Math.random() * list.length)];
  }

  function downloadIPOCertificatePNG(state, sharePct) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const c = canvas.getContext('2d');

    // Warm ivory & gold luxury certificate background
    const bg = c.createLinearGradient(0, 0, 1200, 675);
    bg.addColorStop(0, '#FFFDF8');
    bg.addColorStop(1, '#F3E8D8');
    c.fillStyle = bg;
    c.fillRect(0, 0, 1200, 675);

    // Double ornamental gold & oak border
    c.strokeStyle = '#B45309';
    c.lineWidth = 14;
    c.strokeRect(26, 26, 1148, 623);
    c.strokeStyle = '#F59E0B';
    c.lineWidth = 4;
    c.strokeRect(46, 46, 1108, 583);

    // Header badge
    c.fillStyle = '#4A3426';
    c.font = '900 26px Inter, sans-serif';
    c.textAlign = 'center';
    c.fillText('STARUP — CHỨNG NHẬN NIÊM YẾT SÀN CHỨNG KHOÁN (IPO)', 600, 118);

    // Company & Ticker
    c.fillStyle = '#B45309';
    c.font = '900 66px Inter, sans-serif';
    const tickerTxt = state.ipoDone ? ` [${state.ticker}]` : ' (STARTUP)';
    c.fillText((state.companyName || 'NOVA TECH').toUpperCase() + tickerTxt, 600, 222);

    // Subtitle
    c.fillStyle = '#5C4636';
    c.font = '700 28px Inter, sans-serif';
    c.fillText(`Chứng nhận CEO ${state.ceoName} đã dẫn dắt doanh nghiệp phát triển vượt bậc`, 600, 286);

    // Metrics boxes
    const nw = FIN.getNetWorth(state);
    const stats = [
      { label: 'NGÀY VẬN HÀNH', val: `Ngày ${state.day}` },
      { label: 'TỔNG TÀI SẢN RÒNG', val: FIN.fmtMoney(nw) },
      { label: 'THỊ PHẦN', val: `${sharePct}%` },
      { label: 'HỢP ĐỒNG CHỐT', val: `${state.contractsDone} đơn` }
    ];
    stats.forEach((st, i) => {
      const bx = 95 + i * 260;
      c.fillStyle = '#FFFDF9';
      c.strokeStyle = '#D8C7B2';
      c.lineWidth = 3;
      c.fillRect(bx, 345, 230, 130);
      c.strokeRect(bx, 345, 230, 130);

      c.fillStyle = '#7C6350';
      c.font = '800 17px Inter, sans-serif';
      c.fillText(st.label, bx + 115, 386);

      c.fillStyle = '#047857';
      c.font = '900 32px Inter, sans-serif';
      c.fillText(st.val, bx + 115, 442);
    });

    // Gold Seal & Footer
    c.fillStyle = '#D97706';
    c.beginPath();
    c.arc(1040, 560, 48, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#FFFDF9';
    c.font = '900 22px Inter, sans-serif';
    c.fillText(state.ipoDone ? 'IPO' : 'STAR', 1040, 568);

    c.fillStyle = '#6B5443';
    c.font = '700 22px Inter, sans-serif';
    c.textAlign = 'left';
    c.fillText(`Uy tín: ${state.stars} ★  ·  Độ phủ thương hiệu: ${state.brandAwareness || 0}%  ·  Sở hữu CEO: ${100 - (state.investorEquity || 0)}%`, 95, 566);

    const a = document.createElement('a');
    a.download = `STARUP_ChungNhan_${(state.companyName || 'Company').replace(/\s+/g, '_')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  function buildTrophyAndQuestsHTML(state, activeTab, sharePct, tickSvg) {
    const quests = state.dailyQuests || [];
    const claimable = countClaimable(state);
    const tabs = [
      { id: 'quests', label: `🎯 Nhiệm Vụ Ngày${claimable > 0 ? ` (${claimable})` : ''}` },
      { id: 'cert',   label: '📜 Thẻ Chứng Nhận' }
    ];

    const tabBar = `
      <div style="display:flex;gap:0.55cqw;margin-bottom:0.9cqw;">
        ${tabs.map(t => `
          <button data-tr-tab="${t.id}" type="button" style="flex:1;padding:0.68cqw;border-radius:0.95cqw;font-size:1.12cqw;font-weight:800;border:none;cursor:pointer;${activeTab === t.id ? 'background:#4A3426;color:#FFFDF9;' : 'background:#EFE6DA;color:#5C4636;'}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    `;

    if (activeTab === 'quests') {
      return tabBar + `
        <div style="display:flex;flex-direction:column;gap:0.7cqw;">
          ${quests.map(q => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            const done = q.progress >= q.target;
            return `
              <div style="padding:0.85cqw 1cqw;border-radius:1.05cqw;border:0.13cqw solid ${done && !q.claimed ? '#34D399' : '#DFD2C1'};background:${done && !q.claimed ? '#ECFDF5' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:0.9cqw;">
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:900;color:#3D2B1F;">${q.title}</div>
                  <div style="font-size:1.0cqw;color:#6B5443;margin-top:0.15cqw;">Thưởng: <strong style="color:#059669;">+${FIN.fmtMoney(q.rewardCash)}</strong> & <strong style="color:#D97706;">+${q.rewardStars} ★</strong> (${Math.min(q.progress, q.target)}/${q.target})</div>
                  <div style="height:0.5cqw;border-radius:999px;background:#E7DDD0;overflow:hidden;margin-top:0.35cqw;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#34D399,#059669);"></div>
                  </div>
                </div>
                <button data-claim-q="${q.id}" type="button" ${(!done || q.claimed) ? 'disabled' : ''} style="padding:0.58cqw 1cqw;border-radius:0.85cqw;background:${q.claimed ? '#D6CCC0' : (done ? '#059669' : '#EFE6DA')};color:${q.claimed ? '#6B5443' : (done ? '#fff' : '#7C6350')};font-weight:800;border:none;cursor:${(done && !q.claimed) ? 'pointer' : 'not-allowed'};white-space:nowrap;display:inline-flex;align-items:center;">
                  ${q.claimed ? `${tickSvg}Đã nhận` : (done ? 'Nhận thưởng' : `${pct}%`)}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const nw = FIN.getNetWorth(state);
    return tabBar + `
      <div style="padding:1.2cqw;border-radius:1.3cqw;background:linear-gradient(145deg,#FFFDF9,#F4E9D8);border:0.22cqw solid #D97706;box-shadow:0 0.45cqw 1.2cqw rgba(146,64,14,0.16);text-align:center;">
        <div style="font-size:0.98cqw;font-weight:900;letter-spacing:0.06em;color:#92400E;">${state.ipoDone ? '🔔 CHỨNG NHẬN NIÊM YẾT IPO CHÍNH THỨC' : '🏆 THẺ CHỨNG NHẬN THÀNH TÍCH STARTUP'}</div>
        <div style="font-size:2cqw;font-weight:900;color:#3D2B1F;margin:0.3cqw 0 0.15cqw 0;">${state.companyName} ${state.ipoDone ? `<span style="color:#059669;">[${state.ticker}]</span>` : ''}</div>
        <div style="font-size:1.08cqw;font-weight:700;color:#6B5443;margin-bottom:0.9cqw;">CEO: <strong>${state.ceoName}</strong> · Ngày ${state.day} · Tinh thần: <strong>${state.morale}%</strong></div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.55cqw;margin-bottom:1cqw;">
          <div style="background:#FFFDF9;border:0.12cqw solid #DFD2C1;border-radius:0.85cqw;padding:0.5cqw;"><div style="font-size:0.85cqw;color:#7C6350;font-weight:800;">Tài sản</div><div style="font-size:1.15cqw;font-weight:900;color:#059669;">${FIN.fmtMoney(nw)}</div></div>
          <div style="background:#FFFDF9;border:0.12cqw solid #DFD2C1;border-radius:0.85cqw;padding:0.5cqw;"><div style="font-size:0.85cqw;color:#7C6350;font-weight:800;">Thị phần</div><div style="font-size:1.15cqw;font-weight:900;color:#2563EB;">${sharePct}%</div></div>
          <div style="background:#FFFDF9;border:0.12cqw solid #DFD2C1;border-radius:0.85cqw;padding:0.5cqw;"><div style="font-size:0.85cqw;color:#7C6350;font-weight:800;">Uy tín</div><div style="font-size:1.15cqw;font-weight:900;color:#D97706;">${state.stars} ★</div></div>
          <div style="background:#FFFDF9;border:0.12cqw solid #DFD2C1;border-radius:0.85cqw;padding:0.5cqw;"><div style="font-size:0.85cqw;color:#7C6350;font-weight:800;">Hợp đồng</div><div style="font-size:1.15cqw;font-weight:900;color:#3D2B1F;">${state.contractsDone}</div></div>
        </div>

        <div style="display:flex;gap:0.65cqw;">
          <button id="btnDownloadCert" type="button" style="flex:1.4;padding:0.78cqw;border-radius:0.95cqw;background:linear-gradient(180deg,#D97706,#B45309);color:#fff;font-weight:900;border:none;cursor:pointer;">📸 Tải Ảnh Chứng Nhận (PNG)</button>
          <button id="btnCopyCertText" type="button" style="flex:1;padding:0.78cqw;border-radius:0.95cqw;background:#EFE6DA;color:#4A3426;font-weight:800;border:0.12cqw solid #D8C7B2;cursor:pointer;">📋 Chép thành tích</button>
        </div>
      </div>
    `;
  }

  return { generateDailyQuests, countClaimable, pickBanter, downloadIPOCertificatePNG, buildTrophyAndQuestsHTML };
})();

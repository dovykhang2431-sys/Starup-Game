window.STARUP_MARKETING = (() => {
  const CFG = window.STARUP_CONFIG;
  const FIN = window.STARUP_FINANCE;

  function buildMarketingModalHTML(state) {
    const active = state.marketingCampaign;
    const brandPct = Math.min(100, state.brandAwareness || 0);
    const hasMktRoom = state.rooms.marketing && state.rooms.marketing.unlocked;

    return `
      <div style="padding:1cqw 1.15cqw;border-radius:1.1cqw;background:#FFF7ED;border:0.13cqw solid #FDBA74;margin-bottom:1cqw;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:900;color:#9A3412;">📣 Độ phủ thương hiệu: ${state.companyName}</span>
          <strong style="color:#EA580C;">${brandPct}%</strong>
        </div>
        <div style="height:0.75cqw;border-radius:999px;background:#FED7AA;overflow:hidden;margin-top:0.45cqw;">
          <div style="height:100%;width:${brandPct}%;background:linear-gradient(90deg,#F59E0B,#EA580C);transition:width 0.3s ease;"></div>
        </div>
        <div style="margin-top:0.5cqw;font-size:1.05cqw;color:#7C2D12;">
          ${active
            ? `🔥 <strong>Đang chạy:</strong> ${active.icon} ${active.name} (còn ${active.daysLeft} ngày · Giá đơn x${active.rewardMult})`
            : 'Chưa có chiến dịch nào chạy. Chọn 1 gói bên dưới để kéo thêm khách & tăng giá hợp đồng!'}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.75cqw;">
        ${CFG.MARKETING_CAMPAIGNS.map(c => {
          const lockedByRoom = c.reqMarketingRoom && !hasMktRoom;
          const isRunning = active && active.id === c.id;
          const disabled = lockedByRoom || !!active;
          return `
            <div style="padding:0.95cqw 1.1cqw;border-radius:1.1cqw;border:0.12cqw solid ${isRunning ? '#F59E0B' : '#DFD2C1'};background:${isRunning ? '#FFFBEB' : '#FAF6F0'};display:flex;align-items:center;justify-content:space-between;gap:1cqw;">
              <div>
                <div style="font-weight:900;color:#3D2B1F;">${c.icon} ${c.name} <span style="color:#B45309;font-size:1.05cqw;">(${c.days} ngày)</span></div>
                <div style="font-size:1.03cqw;color:#6B5443;margin-top:0.2cqw;">${c.desc}</div>
              </div>
              <button data-run-mkt="${c.id}" type="button" ${disabled ? 'disabled' : ''} style="padding:0.65cqw 1.15cqw;border-radius:0.9cqw;background:${disabled ? '#D6CCC0' : '#EA580C'};color:${disabled ? '#78716C' : '#FFFFFF'};font-weight:800;border:none;cursor:${disabled ? 'not-allowed' : 'pointer'};white-space:nowrap;">
                ${isRunning ? 'Đang chạy' : (lockedByRoom ? '🔒 Cần P.MKT' : FIN.fmtMoney(c.cost))}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return { buildMarketingModalHTML };
})();

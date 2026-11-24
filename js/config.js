window.STARUP_CONFIG = {
  SAVE_KEY: 'starup_save_v5',

  NODES: {
    outside:     { x: 41, y: 89 },
    door:        { x: 45, y: 74 },
    lobby:       { x: 52, y: 61 },
    sofa:        { x: 45, y: 55 },
    reception:   { x: 49, y: 47 },
    recLeft:     { x: 44, y: 50 },
    recRight:    { x: 54, y: 52 },
    hallLeft:    { x: 37, y: 49 },
    hallRight:   { x: 59, y: 49 },
    financeDesk: { x: 58, y: 73 },
    pantryDoor:  { x: 60, y: 66 },
    pantryBar:   { x: 69, y: 66 },
    pantryTable: { x: 66, y: 77 },
    vending:     { x: 76, y: 72 },
    tech1:       { x: 22, y: 40 },
    tech2:       { x: 28, y: 31 },
    support1:    { x: 24, y: 71 },
    support2:    { x: 32, y: 68 },
    mkt1:        { x: 73, y: 43 },
    mkt2:        { x: 80, y: 35 },
    ceoDesk:     { x: 51, y: 26 }
  },

  EDGES: {
    outside: ['door'],
    door: ['outside', 'lobby', 'support2', 'financeDesk'],
    lobby: ['door', 'sofa', 'reception', 'recLeft', 'recRight', 'hallLeft', 'hallRight', 'pantryDoor', 'financeDesk'],
    sofa: ['lobby', 'recLeft'],
    reception: ['lobby', 'recLeft', 'recRight', 'hallLeft', 'hallRight'],
    recLeft: ['lobby', 'reception', 'sofa'],
    recRight: ['lobby', 'reception', 'hallRight'],
    hallLeft: ['lobby', 'reception', 'tech1', 'tech2', 'support2'],
    hallRight: ['lobby', 'reception', 'mkt1', 'mkt2', 'ceoDesk'],
    financeDesk: ['door', 'lobby', 'pantryDoor'],
    pantryDoor: ['lobby', 'financeDesk', 'pantryBar', 'pantryTable', 'vending'],
    pantryBar: ['pantryDoor', 'pantryTable', 'vending'],
    pantryTable: ['pantryDoor', 'pantryBar'],
    vending: ['pantryDoor', 'pantryBar'],
    tech1: ['hallLeft', 'tech2'],
    tech2: ['hallLeft', 'tech1'],
    support1: ['support2'],
    support2: ['door', 'hallLeft', 'support1'],
    mkt1: ['hallRight', 'mkt2'],
    mkt2: ['hallRight', 'mkt1'],
    ceoDesk: ['hallRight']
  },

  // Realistic Startup Pacing: Day 1 earns ~$400-$600 net so rooms unlock gradually over Days 2 -> 10!
  ROOMS: [
    {
      id: 'lobby', name: 'Sảnh Lễ Tân', icon: '🛎️',
      unlockedDefault: true, unlockCost: 0,
      chipPos: { x: 47, y: 40 }, lockBox: { x: 49, y: 50, w: 15, h: 15 },
      deskNodes: ['reception'], baseReward: 0, baseDuration: 0, dailyRent: 35,
      staffSalary: 35, maxStaff: 2,
      note: 'Đón khách chốt đơn & trưng bày Cúp Vàng uy tín.'
    },
    {
      id: 'support', name: 'Khu Tư Vấn', icon: '🎧',
      unlockedDefault: true, unlockCost: 0,
      chipPos: { x: 24, y: 61 }, lockBox: { x: 26, y: 69, w: 18, h: 18 },
      deskNodes: ['support1', 'support2'], baseReward: 105, baseDuration: 13, dailyRent: 40,
      staffSalary: 45, maxStaff: 2,
      note: 'Nguồn thu khởi đầu ổn định cho Startup mới, cộng +1 ★ mỗi đơn.'
    },
    {
      id: 'pantry', name: 'Khu Pantry', icon: '☕', shortPerk: '+25% tốc độ chiều', poly: 'polygon(64% 58%, 83% 68%, 83% 78%, 68% 92%, 59% 82%)', plaquePos: { x: 72, y: 74 },
      unlockedDefault: false, unlockCost: 750,
      chipPos: { x: 75, y: 62 }, lockBox: { x: 73, y: 73, w: 17, h: 17 },
      deskNodes: ['pantryBar'], baseReward: 0, baseDuration: 0, dailyRent: 40,
      staffSalary: 45, maxStaff: 1,
      note: 'Giữ Tinh thần cao, giảm 50% mệt mỏi & +25% tốc độ ca chiều.'
    },
    {
      id: 'finance', name: 'Phòng Tài Chính', icon: '💹', shortPerk: 'Giảm 15–30% chi phí', poly: 'polygon(57% 63%, 66% 72%, 59% 83%, 50% 73%)', plaquePos: { x: 58, y: 73 },
      unlockedDefault: false, unlockCost: 1600,
      chipPos: { x: 58, y: 67 }, lockBox: { x: 57, y: 76, w: 16, h: 16 },
      deskNodes: ['financeDesk'], baseReward: 220, baseDuration: 11, dailyRent: 70,
      staffSalary: 80, maxStaff: 2,
      note: 'Giảm 15–30% chi phí vận hành, mở Dự báo Chứng khoán & chống phạt Thuế!'
    },
    {
      id: 'marketing', name: 'Phòng Marketing', icon: '📣', shortPerk: 'Kéo khách & đơn lớn', poly: 'polygon(75% 12%, 95% 29%, 95% 47%, 78% 58%, 62% 37%)', plaquePos: { x: 78, y: 35 },
      unlockedDefault: false, unlockCost: 3200,
      chipPos: { x: 78, y: 26 }, lockBox: { x: 77, y: 38, w: 22, h: 22 },
      deskNodes: ['mkt1', 'mkt2'], baseReward: 380, baseDuration: 16, dailyRent: 110,
      staffSalary: 105, maxStaff: 2,
      note: 'Tăng lượng khách tự nhiên ghé sảnh & mở khóa Chiến dịch Toàn Quốc.'
    },
    {
      id: 'tech', name: 'Phòng Kỹ Thuật', icon: '💻', shortPerk: 'Dự án App/AI giá cao', poly: 'polygon(27% 10%, 41% 27%, 31% 48%, 5% 44%, 5% 27%)', plaquePos: { x: 22, y: 31 },
      unlockedDefault: false, unlockCost: 6500,
      chipPos: { x: 18, y: 26 }, lockBox: { x: 21, y: 36, w: 23, h: 23 },
      deskNodes: ['tech1', 'tech2'], baseReward: 820, baseDuration: 18, dailyRent: 180,
      staffSalary: 160, maxStaff: 2,
      note: 'Dự án Website/App/AI giá trị lớn (dễ gặp sự cố Server, cần theo dõi).'
    },
    {
      id: 'ceo', name: 'Phòng CEO', icon: '👑', shortPerk: 'Chốt VIP & mở IPO', poly: 'polygon(51% 3%, 69% 19%, 52% 38%, 35% 19%)', plaquePos: { x: 52, y: 21 },
      unlockedDefault: false, unlockCost: 14000,
      chipPos: { x: 51, y: 17 }, lockBox: { x: 51, y: 25, w: 20, h: 19 },
      deskNodes: ['ceoDesk'], baseReward: 1900, baseDuration: 20, dailyRent: 260,
      staffSalary: 0, maxStaff: 1,
      note: 'Chốt thương vụ Đối tác VIP & mở khóa sự kiện Lên Sàn IPO.'
    }
  ],

  CONTRACT_TEMPLATES: {
    support: ['Tư vấn vận hành nhỏ', 'Gói CSKH tháng', 'Hỗ trợ thiết lập tổng đài'],
    finance: ['Kiểm toán báo cáo quý', 'Tư vấn tối ưu thuế', 'Lập kế hoạch dòng tiền'],
    marketing: ['Chiến dịch Social Ads', 'Thiết kế bộ nhận diện', 'Ra mắt sản phẩm mới'],
    tech: ['Xây dựng Website', 'Lập trình App Mobile', 'Tích hợp hệ thống AI'],
    ceo: ['Hợp đồng Đối tác Chiến lược', 'Thương vụ M&A', 'Gọi vốn Quỹ Đầu Tư']
  },

  MARKETING_CAMPAIGNS: [
    {
      id: 'mkt_social', name: 'Quảng Cáo Mạng Xã Hội', icon: '📱',
      cost: 220, days: 1, spawnBoost: 1.55, rewardMult: 1.15, vipChance: 0.25,
      starsGain: 2, brandGain: 12, reqMarketingRoom: false,
      desc: '+55% tốc độ khách vào sảnh, +15% giá trị đơn trong 1 ngày (+2 ★).'
    },
    {
      id: 'mkt_kol', name: 'Thuê KOL & Reviewer', icon: '🎙️',
      cost: 680, days: 2, spawnBoost: 1.9, rewardMult: 1.3, vipChance: 0.42,
      starsGain: 5, brandGain: 24, reqMarketingRoom: false,
      desc: '+90% khách vào, 42% gặp Khách VIP 💎 & +30% giá đơn trong 2 ngày (+5 ★).'
    },
    {
      id: 'mkt_national', name: 'Thương Hiệu Toàn Quốc', icon: '🚀',
      cost: 1800, days: 3, spawnBoost: 2.3, rewardMult: 1.55, vipChance: 0.6,
      starsGain: 12, brandGain: 40, reqMarketingRoom: true,
      desc: 'Nhân x1.55 giá trị mọi hợp đồng, khách VIP dồn dập 3 ngày (+12 ★). Cần Phòng Marketing.'
    }
  ],

  LOANS: [
    { id: 'loan_small', name: 'Tín Chấp Khởi Nghiệp', amount: 800, dailyPay: 190, days: 5, reqDay: 2, reqStars: 0, reqFinance: false, reqRooms: 1, desc: 'Trả $190/ngày × 5 ngày · Mở ngay từ Ngày 2' },
    { id: 'loan_mid', name: 'Vay Doanh Nghiệp Nhỏ', amount: 3000, dailyPay: 720, days: 5, reqDay: 4, reqStars: 25, reqFinance: true, reqRooms: 2, desc: 'Trả $720/ngày × 5 ngày · Cần Ngày 4, P.Tài Chính & ≥ 25 ★' },
    { id: 'loan_ipo', name: 'Tín Dụng Tăng Trưởng', amount: 10000, dailyPay: 2500, days: 5, reqDay: 7, reqStars: 55, reqFinance: true, reqRooms: 4, desc: 'Trả $2,500/ngày × 5 ngày · Cần Ngày 7, ≥ 4 phòng ban & ≥ 55 ★' }
  ],

  FUNDING_ROUNDS: [
    { id: 'fund_angel', name: 'Nhà Đầu Tư Thiên Thần', icon: '🤝', amount: 2000, equity: 10, reqDay: 3, reqStars: 8, reqRooms: 2, reqRoomId: null, desc: 'Nhận ngay $2,000 không cần trả góp · Chia 10% tiền lời hằng ngày.' },
    { id: 'fund_seed', name: 'Quỹ Khởi Nghiệp', icon: '🌱', amount: 6000, equity: 15, reqDay: 6, reqStars: 15, reqRooms: 4, reqRoomId: 'finance', desc: 'Nhận ngay $6,000 mở rộng nhanh · Chia 15% tiền lời hằng ngày. Cần P.Tài Chính.' },
    { id: 'fund_corp', name: 'Tập Đoàn Đầu Tư', icon: '🏛️', amount: 15000, equity: 20, reqDay: 9, reqStars: 75, reqRooms: 5, reqRoomId: 'tech', desc: 'Nhận ngay $15,000 bệ phóng IPO · Chia 20% tiền lời hằng ngày. Cần P.Kỹ Thuật.' }
  ],

  STOCKS_INIT: [
    { symbol: 'TECH', name: 'AI & Phần mềm', price: 120, volatility: 0.16, history: [108, 112, 115, 110, 118, 120], color: '#0EA5E9', nextBias: 0.05 },
    { symbol: 'FOOD', name: 'Cà phê & F&B', price: 65, volatility: 0.06, history: [62, 63, 64, 63, 65, 65], color: '#D97706', nextBias: 0.01 },
    { symbol: 'REAL', name: 'BĐS Văn phòng', price: 95, volatility: 0.10, history: [90, 92, 96, 94, 93, 95], color: '#8B5CF6', nextBias: -0.02 },
    { symbol: 'GOLD', name: 'Quỹ Vàng An Toàn', price: 150, volatility: 0.05, history: [146, 147, 148, 149, 150, 150], color: '#CA8A04', nextBias: 0.02 }
  ],

  BRANCHES: [
    { id: 'hcm', mapSrc: 'assets/office_day.jpg', name: 'Trụ sở 1: TP.HCM (Startup)', mult: 1, dividend: 0, reqVal: 0, desc: 'Văn phòng 6 phòng ban — Nơi khởi nghiệp đầu tiên.' },
    { id: 'tokyo', mapSrc: 'assets/office_tokyo.jpg', name: 'Chi nhánh 2: Tokyo (Tập đoàn Công nghệ)', mult: 2, dividend: 2200, reqVal: 35000, desc: 'Mở sau khi IPO • Nhân đôi giá trị hợp đồng + $2,200 cổ tức/ngày.' },
    { id: 'ny', mapSrc: 'assets/office_ny.jpg', name: 'Chi nhánh 3: New York (Đế chế Toàn cầu)', mult: 4, dividend: 6500, reqVal: 150000, desc: 'Đỉnh cao tập đoàn toàn cầu • Nhân 4 giá hợp đồng + $6,500 cổ tức/ngày.' }
  ],

  SEASONS: [
    { id: 'growth', name: 'Mùa Tăng Trưởng', icon: '🌸', spawnMult: 1.12, rewardMult: 1.05, stockBias: { REAL: 0.04, FOOD: 0.03 } },
    { id: 'tech',   name: 'Mùa Công Nghệ',   icon: '💻', spawnMult: 1.05, rewardMult: 1.18, stockBias: { TECH: 0.08 } },
    { id: 'tight',  name: 'Mùa Thắt Chặt',   icon: '❄️', spawnMult: 0.82, rewardMult: 0.95, stockBias: { GOLD: 0.07, TECH: -0.04 } },
    { id: 'fest',   name: 'Mùa Lễ Hội',      icon: '🎉', spawnMult: 1.35, rewardMult: 1.25, stockBias: { FOOD: 0.06, REAL: 0.04 } }
  ],

  PRODUCTS: [
    { id: 'prod_app',   name: 'App Quản Lý Tiện Ích', icon: '📱', cost: 2200,  dailyIncome: 380,   reqRoom: 'marketing', reqLabel: 'P.Marketing' },
    { id: 'prod_ecom',  name: 'Sàn Thương Mại Số',    icon: '🛒', cost: 6800,  dailyIncome: 1350,  reqRoom: 'tech',      reqLabel: 'P.Kỹ Thuật' },
    { id: 'prod_fin',   name: 'Ví Tài Chính Thông Minh', icon: '💳', cost: 18000, dailyIncome: 3800,  reqRoom: 'finance',   reqLabel: 'P.Tài Chính' },
    { id: 'prod_ai',    name: 'Hệ Sinh Thái AI Độc Quyền', icon: '🤖', cost: 48000, dailyIncome: 11500, reqRoom: 'ceo',       reqLabel: 'P.CEO' }
  ],

  RIVALS: [
    { id: 'riv_pixel', name: 'Pixel Studio', icon: '🎨', cost: 4500,   share: 15, dividend: 450,   reqStars: 30,  reqIPO: false },
    { id: 'riv_velo',  name: 'Velo Tech',    icon: '⚡', cost: 14000,  share: 20, dividend: 1400,  reqStars: 60,  reqIPO: false },
    { id: 'riv_apex',  name: 'Apex Corp',    icon: '🏢', cost: 45000,  share: 25, dividend: 4500,  reqStars: 95,  reqIPO: true },
    { id: 'riv_nova',  name: 'Nova Global',  icon: '🌐', cost: 120000, share: 30, dividend: 13000, reqStars: 140, reqIPO: true }
  ],

  PRESTIGE_CFG: {
    COEF_SHARE: 1500,
    COEF_STARS: 600,
    POINT_UNIT: 100000,
    MAX_TIER: 3,
    TIER_MULT: [1, 1.5, 2.2],
    PERKS: [
      { id: 'contract_val', tier: 1, baseCost: 7, iconImg: 'assets/tokens/perk_contract.png', emoji: '📜', name: '+10% Giá Hợp Đồng', desc: 'Tăng +10% thù lao mọi hợp đồng ở mỗi tầng sở hữu (cộng dồn tối đa +30%).' },
      { id: 'unlock_room', tier: 1, baseCost: 8, iconImg: 'assets/tokens/perk_office.png', emoji: '🏢', name: 'Mở Khóa Sẵn 1 Phòng', desc: 'Chọn 1 phòng ban bị khóa ban đầu để mở sẵn miễn phí từ Ngày 1 (chọn phòng khác nhau ở mỗi tầng).' },
      { id: 'vip_chance', tier: 1, baseCost: 6, iconImg: 'assets/tokens/perk_vip.png', emoji: '💎', name: 'Khách VIP Nhiều Hơn', desc: 'Tăng +10% tỷ lệ gặp Khách VIP 💎 & Dự Án Lớn tại sảnh ở mỗi tầng.' },
      { id: 'job_speed', tier: 2, baseCost: 9, iconImg: null, emoji: '⚡', name: '+15% Tốc Độ Hoàn Thành Đơn', desc: 'Tăng +15% tốc độ xử lý hợp đồng của toàn bộ phòng ban ở mỗi tầng.' },
      { id: 'fixed_cost', tier: 2, baseCost: 10, iconImg: null, emoji: '🧾', name: 'Giảm 10% Chi Phí Cố Định/Ngày', desc: 'Giảm 10% tiền thuê mặt bằng & lương nhân viên hằng ngày ở mỗi tầng.' },
      { id: 'morale_sick', tier: 2, baseCost: 8, iconImg: 'assets/tokens/perk_morale.png', emoji: '💖', name: 'Tinh Thần Cao & Ít Ốm Hơn', desc: '+8% tinh thần khởi đầu, tăng +1 tinh thần mỗi đơn xong & giảm 35% nguy cơ nhân viên xin nghỉ ốm.' },
      { id: 'start_cash', tier: 3, baseCost: 10, iconImg: null, emoji: '💰', name: 'Vốn Khởi Nghiệp $5,000', desc: 'Bắt đầu Ngày 1 với $5,000 thay vì $500 (+$4,000 thêm ở mỗi tầng cao hơn).' },
      { id: 'room_stars', tier: 3, baseCost: 11, iconImg: null, emoji: '⭐', name: '+1 Sao Khởi Đầu Mỗi Phòng Mở', desc: 'Nhận ngay +1 ★ uy tín cho mỗi phòng ban được mở khóa (cộng dồn theo tầng).' }
    ]
  },
};

window.STARUP_AVATARS = (() => {
  // Real 3D stylized circular Chibi Head Tokens cropped directly from the Starup asset sheet
  const TOKEN_PATHS = {
    ceo:       'assets/tokens/ceo.png',
    tech:      'assets/tokens/tech.png',
    marketing: 'assets/tokens/marketing.png',
    support:   'assets/tokens/support.png',
    pantry:    'assets/tokens/marketing.png',
    lobby:     'assets/tokens/support.png',
    client:    'assets/tokens/client.png',
    vip:       'assets/tokens/vip.png'
  };

  const CEO_CHOICES = [
    { key: 'ceo', label: 'Founder CEO' },
    { key: 'marketing', label: 'Creative CEO' },
    { key: 'tech', label: 'Tech Founder' },
    { key: 'support', label: 'Operations CEO' }
  ];

  function renderTokenImg(roleKey, alt = 'Nhân vật') {
    const src = TOKEN_PATHS[roleKey] || TOKEN_PATHS.ceo;
    return `<img src="${src}" alt="${alt}" class="token-img" onerror="if(!this.dataset.retried){this.dataset.retried=1;this.src=this.src+'?r=1';}else{this.onerror=null;this.src='assets/tokens/ceo.png';}" />`;
  }

  function preloadAll() {
    const urls = new Set([
      ...Object.values(TOKEN_PATHS),
      'assets/office_day.jpg',
      'assets/office_night.jpg',
      'assets/office_tokyo.jpg',
      'assets/office_ny.jpg',
      'assets/office_prestige.jpg',
      'assets/tokens/legacy.png',
      'assets/tokens/perk_contract.png',
      'assets/tokens/perk_vip.png',
      'assets/tokens/perk_office.png',
      'assets/tokens/perk_morale.png'
    ]);
    urls.forEach(u => { const im = new Image(); im.src = u; });
  }
  return { TOKEN_PATHS, CEO_CHOICES, renderTokenImg, preloadAll };
})();

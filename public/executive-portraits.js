(() => {
  const portraits = {
    'Omar Bah': '/omar Bah-chairman Jul 28, 2026, 11_28_29 AM.png',
    'Kaddy Bojang': '/kaddy bojang  Jul 23, 2026, 05_24_00 PM.png',
    'Landing Bojang': '/landing-bojang sg24, 2026, 01_46_19 PM.png',
    'Lamin Bangura': '/Lamin-Bangura-Ass-SG Jul 27, 2026, 11_34_59 PM.png',
    'Mbaye Manga': '/mbaye-manga-Treasurer 28, 2026, 12_29_12 AM.png',
    'Bakary Bojang': '/Bakary-Bojang-ASS-Treasurer Jul 28, 2026, 12_20_02 PM.png',
    'Saidou Jallow': '/Saidou-Jallow-Auditor-general Jul 25, 2026, 09_43_31 PM.png',
    'Fatou Nyassi': '/Fatou-Nyassi-ASSI-auditor-general Jul 28, 2026, 12_27_07 PM.png',
    'Banna Bojang': '/Banna Bojang-IPRO  Jul 28, 2026, 12_38_24 PM.png',
    'Tida Bojang': '/Tida-Bojang-ASS-IPRO Jul 28, 2026, 12_25_48 PM.png',
    'Demba Jammeh': '/DEMBA-Jammeh-programme- officerJul 28, 2026, 12_17_40 PM.png',
    'Bakary Colley': '/Bakary-colley-assi-programme officer.png',
    'Ismaila Manga': '/ismaila-manga-adviser Jul 28, 2026, 12_34_15 PM.png',
    'Yusupha Badjie': '/yusupha-badjie-adviser Jul 28, 2026, 12_15_22 AM.png'
  };

  const makeImage = (name, className) => {
    const src = portraits[name];
    if (!src) return null;
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${name} official portrait`;
    img.className = className;
    img.loading = 'lazy';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.objectPosition = 'center top';
    img.style.display = 'block';
    return img;
  };

  const applyPortraits = () => {
    document.querySelectorAll('.leader-card').forEach((card) => {
      const name = card.querySelector('h3')?.textContent?.trim();
      const holder = card.querySelector('.leader-portrait');
      if (!name || !holder || !portraits[name] || holder.querySelector('img')) return;
      const img = makeImage(name, 'executive-directory-image');
      if (img) holder.replaceChildren(img);
    });

    document.querySelectorAll('.mini-leaders a').forEach((card) => {
      const name = card.querySelector('strong')?.textContent?.trim();
      const holder = card.querySelector(':scope > span');
      if (!name || !holder || !portraits[name] || holder.querySelector('img')) return;
      const img = makeImage(name, 'executive-preview-image');
      if (img) holder.replaceChildren(img);
    });

    const profileName = document.querySelector('.executive-hero h1')?.textContent?.trim();
    const profileHolder = document.querySelector('.executive-photo');
    if (profileName && profileHolder && portraits[profileName] && !profileHolder.querySelector('img')) {
      const img = makeImage(profileName, 'executive-profile-image');
      if (img) profileHolder.replaceChildren(img);
    }
  };

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyPortraits();
    });
  };

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleApply);
  window.addEventListener('DOMContentLoaded', scheduleApply);
  scheduleApply();
})();

/* Ministério Seven — reforço JS da logo compacta V2 */
(function(){
  function applyCompactLogo(){
    const imgs = document.querySelectorAll('#header-v7-logo, .site-header .brand-link img, header.site-header .brand-link img, .brand-v7, .brand-logo, .header-logo, img[src*="logo-header"], img[src*="ministerio-seven"]');
    imgs.forEach((img) => {
      if (!img.closest('.site-header') && !img.closest('header.site-header')) return;
      img.style.setProperty('height', window.innerWidth <= 900 ? '34px' : '38px', 'important');
      img.style.setProperty('max-height', window.innerWidth <= 900 ? '34px' : '38px', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('max-width', window.innerWidth <= 900 ? '148px' : '172px', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('transform', 'none', 'important');
    });
    document.querySelectorAll('.site-header .brand-link, header.site-header .brand-link').forEach((el) => {
      el.style.setProperty('height', window.innerWidth <= 900 ? '48px' : '52px', 'important');
      el.style.setProperty('min-height', window.innerWidth <= 900 ? '48px' : '52px', 'important');
      el.style.setProperty('max-width', window.innerWidth <= 900 ? '166px' : '190px', 'important');
      el.style.setProperty('padding', window.innerWidth <= 900 ? '5px 12px' : '6px 14px', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyCompactLogo);
  else applyCompactLogo();
  window.addEventListener('load', applyCompactLogo);
  window.addEventListener('resize', applyCompactLogo, {passive:true});
  setTimeout(applyCompactLogo, 250);
  setTimeout(applyCompactLogo, 900);
})();

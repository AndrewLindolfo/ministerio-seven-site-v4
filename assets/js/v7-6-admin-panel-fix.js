
/* Ministério Seven V7.6 — Correção do Painel ADM */
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function isAdminPage() {
    return /\/admin(\/|$)/i.test(location.pathname)
      || document.body.classList.contains('admin-page')
      || !!document.querySelector('.v74-admin-sidebar, .admin-sidebar, .admin-dashboard, [data-admin-page]');
  }

  function removeV75ExtraSidebar() {
    if (!isAdminPage()) return;

    document.querySelectorAll('.v75-admin-sidebar').forEach((el) => el.remove());

    document.querySelectorAll('.v75-admin-shell').forEach((shell) => {
      const content = shell.querySelector('.v75-admin-content');
      if (!content) return;

      const parent = shell.parentNode;
      while (content.firstChild) {
        parent.insertBefore(content.firstChild, shell);
      }
      shell.remove();
    });
  }

  function cleanKeptSidebarHeader() {
    if (!isAdminPage()) return;

    const sidebars = document.querySelectorAll('.v74-admin-sidebar, .admin-sidebar, .admin-panel-sidebar');
    sidebars.forEach((sidebar) => {
      sidebar.querySelectorAll('.v74-admin-brand, .v74-admin-brand-mini, .admin-brand, .brand-link').forEach((el) => el.remove());

      sidebar.querySelectorAll('img').forEach((img) => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        const src = (img.getAttribute('src') || '').toLowerCase();
        if (alt.includes('minist') || alt.includes('seven') || src.includes('logo') || src.includes('seven')) {
          img.remove();
        }
      });

      sidebar.querySelectorAll('.v74-admin-title, .v74-admin-subtitle, .admin-sidebar-title').forEach((el) => el.remove());
    });
  }

  function fixAdminLayout() {
    if (!isAdminPage()) return;
    removeV75ExtraSidebar();
    cleanKeptSidebarHeader();
  }

  ready(() => {
    fixAdminLayout();
    setTimeout(fixAdminLayout, 250);
    setTimeout(fixAdminLayout, 900);
  });
})();

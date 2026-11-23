// Rentway Pro — selector health check. Paste into the DevTools console on any Pro page: it changes nothing.
// Shows which hooks the extension relies on still match, and lists the icon classes of the icon-only buttons.
// Run it after each Rentway Pro release (the version is in the output) and compare with the expected values:
// Vehicle Details, view mode, v5.26 → pageHeader 1, appHeader 1, scroller 1, tabs 8, tabSelected 1, statusTiles 5, emptyReadonly > 0.
// Vehicle Allocation Control, v5.26 → vac_splitter 1, vac_panes 2, vac_handleUp 1, vac_reservations 1, vac_toolbar 1, vac_banner 0–1.
(() => {
  const q = s => document.querySelectorAll(s).length;
  const hooks = {
    version: document.querySelector('.menu-version')?.textContent.trim(),
    route: decodeURIComponent(location.pathname.replace(/^\/subscriptions\/[^/]+/, '')),
    shell_appContent: q('.app-content'), pageHeader: q('.app-content .page-header-wrapper'),
    appHeader: q('header.header-component'), scroller: q('.dx-drawer-content > .dx-scrollable > .dx-scrollable-wrapper > .dx-scrollable-container'),
    tabs: q('.rw-tabs .rw-tab'), tabSelected: q('.rw-tab-selected'), statusTiles: q('.rw-card-status'),
    loaderNow: q('.loading-wrapper'), popupsOpen: [...document.querySelectorAll('.dx-popup-wrapper')].filter(w => w.offsetWidth).length,
    closeButtons: q('.dx-closebutton'), dashboardLinks: q('.card-box .line-text.link'),
    emptyReadonly: q('.dx-texteditor-empty.dx-state-readonly, .dx-texteditor-empty.dx-state-disabled'),
    vac_splitter: q('.app-content #splitter-timeline'), vac_panes: q('#splitter-timeline > .dx-splitter-item'),
    vac_handleUp: q('#splitter-timeline > .dx-resize-handle .dx-resize-handle-collapse-prev-pane'),
    vac_reservations: q('#splitter-timeline .reservations .dx-datagrid-rowsview'), vac_toolbar: q('.app-content .timeline-header .filters'),
    vac_banner: q('.dx-drawer-content > .drawer-banner'),
    grids: q('.dx-datagrid'), truncatedCells: [...document.querySelectorAll('td[role=gridcell]')].filter(t => t.scrollWidth > t.clientWidth + 1).length
  };
  const iconOnly = [...document.querySelectorAll('.dx-button, button, [role=button]')]
    .filter(b => b.offsetWidth && !b.textContent.trim())
    .map(b => [...(b.querySelector('i, .dx-icon')?.classList || [])].filter(c => /^(mdi-|dx-icon-)/.test(c)).join(' ') + '  | aria=' + b.getAttribute('aria-label'));
  console.table(hooks); console.log('Icon-only buttons:\n' + [...new Set(iconOnly)].join('\n'));
  return { hooks, iconOnly: [...new Set(iconOnly)] };
})();

(function () {
  const page = document.body.getAttribute('data-page') || '';
  const logo = '../../KHAMAKEY_OS/assets/brand/khamakey-moments-wordmark-on-light.png';
  const I = window.KMPreviewI18n;

  function navLink(href, key, pageKey) {
    const active = page === pageKey ? ' aria-current="page"' : '';
    return `<a href="${href}"${active} data-i18n="${key}">${I ? I.t(key) : key}</a>`;
  }

  function langSwitch() {
    const lang = I ? I.currentLang() : 'it';
    return `
      <div class="lang-switch" role="group" aria-label="Language">
        <button type="button" class="lang-switch__select${lang === 'it' ? ' is-active' : ''}" data-lang-btn="it" aria-pressed="${lang === 'it'}">IT</button>
        <button type="button" class="lang-switch__select${lang === 'en' ? ' is-active' : ''}" data-lang-btn="en" aria-pressed="${lang === 'en'}">EN</button>
      </div>`;
  }

  function render() {
    const links = [
      navLink('index.html', 'nav.home', 'home'),
      navLink('collection.html', 'nav.products', 'shop'),
      navLink('index.html#come-funziona', 'nav.how', 'how'),
      navLink('contact.html', 'nav.contact', 'contact')
    ].join('\n        ');

    const header = `
  <header class="site-header" role="banner">
    <div class="page-width site-header__inner">
      <a class="site-header__logo" href="index.html">
        <img src="${logo}" alt="KhamaKey Moments" width="168" height="40">
      </a>
      <nav class="site-nav" aria-label="Navigation">
        ${links}
      </nav>
      <div class="site-header__actions">
        ${langSwitch()}
        <a class="icon-btn" href="collection.html" aria-label="${I ? I.t('nav.search') : 'Search'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </a>
        <a class="icon-btn" href="#" aria-label="${I ? I.t('nav.cart') : 'Cart'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 7h12l-1 12H7L6 7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 7a3 3 0 016 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </a>
        <button class="icon-btn menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="MobileNav" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <nav id="MobileNav" class="mobile-nav" data-mobile-nav aria-label="Mobile">
      <span class="mobile-nav__label" data-i18n="nav.menu">${I ? I.t('nav.menu') : 'Menu'}</span>
      ${links}
      <span class="mobile-nav__label" data-i18n="nav.support">${I ? I.t('nav.support') : 'Support'}</span>
      <a href="shipping.html" data-i18n="nav.shipping">${I ? I.t('nav.shipping') : 'Shipping'}</a>
      <a href="returns.html" data-i18n="nav.returns">${I ? I.t('nav.returns') : 'Returns'}</a>
      <a href="privacy.html" data-i18n="nav.privacy">${I ? I.t('nav.privacy') : 'Privacy'}</a>
      <a href="terms.html" data-i18n="nav.terms">${I ? I.t('nav.terms') : 'Terms'}</a>
      <div class="mobile-nav__lang">${langSwitch()}</div>
    </nav>
  </header>`;

    const footer = `
  <footer class="site-footer" role="contentinfo">
    <div class="page-width">
      <div class="site-footer__grid">
        <div>
          <div class="site-footer__brand">KhamaKey Moments</div>
          <p data-i18n="footer.brand">${I ? I.t('footer.brand') : ''}</p>
        </div>
        <div>
          <h3>Shop</h3>
          <div class="site-footer__links">
            <a href="index.html" data-i18n="nav.home">${I ? I.t('nav.home') : 'Home'}</a>
            <a href="collection.html" data-i18n="nav.products">${I ? I.t('nav.products') : 'Products'}</a>
            <a href="product.html">Love</a>
            <a href="contact.html" data-i18n="nav.contact">${I ? I.t('nav.contact') : 'Contact'}</a>
          </div>
        </div>
        <div>
          <h3 data-i18n="nav.support">${I ? I.t('nav.support') : 'Support'}</h3>
          <div class="site-footer__links">
            <a href="shipping.html" data-i18n="nav.shipping">${I ? I.t('nav.shipping') : 'Shipping'}</a>
            <a href="returns.html" data-i18n="nav.returns">${I ? I.t('nav.returns') : 'Returns'}</a>
            <a href="privacy.html" data-i18n="nav.privacy">${I ? I.t('nav.privacy') : 'Privacy'}</a>
            <a href="terms.html" data-i18n="nav.terms">${I ? I.t('nav.terms') : 'Terms'}</a>
          </div>
        </div>
        <div>
          <h3 data-i18n="nav.follow">${I ? I.t('nav.follow') : 'Follow'}</h3>
          <div class="site-footer__links">
            <a href="#">Instagram</a>
            <a href="#">TikTok</a>
            <a href="contact.html" data-i18n="nav.contact">${I ? I.t('nav.contact') : 'Contact'}</a>
          </div>
        </div>
      </div>
      <div class="site-footer__bottom">
        <div data-i18n="footer.copy">${I ? I.t('footer.copy') : ''}</div>
      </div>
    </div>
  </footer>`;

    const headerMount = document.querySelector('[data-chrome-header]');
    const footerMount = document.querySelector('[data-chrome-footer]');
    if (headerMount) headerMount.outerHTML = header;
    if (footerMount) footerMount.outerHTML = footer;

    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (I) I.setLang(btn.getAttribute('data-lang-btn'));
        render();
        if (I) I.apply();
        bindMenu();
      });
    });

    bindMenu();
    if (I) I.apply();
  }

  function bindMenu() {
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const mobileNav = document.querySelector('[data-mobile-nav]');
    if (menuToggle && mobileNav) {
      menuToggle.addEventListener('click', function () {
        const open = mobileNav.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  render();
})();

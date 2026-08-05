(function () {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      const open = mobileNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('[data-product-thumb]').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      const src = thumb.getAttribute('data-full-src');
      const srcset = thumb.getAttribute('data-srcset') || '';
      const alt = thumb.getAttribute('data-alt') || '';
      const main = document.querySelector('[data-product-main-image]');
      if (!main || !src) return;
      // Must update srcset too: browsers prefer srcset over src when both exist.
      if (srcset) {
        main.setAttribute('srcset', srcset);
      } else {
        main.removeAttribute('srcset');
      }
      main.src = src;
      main.alt = alt;
      document.querySelectorAll('[data-product-thumb]').forEach(function (el) {
        el.classList.toggle('is-active', el === thumb);
      });
    });
  });

  const packRadios = document.querySelectorAll('[data-pack-radio]');
  const packSelect = document.querySelector('[data-pack-select]');
  if (packRadios.length && packSelect) {
    packRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        packSelect.value = radio.value;
        packSelect.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelectorAll('.pack-option').forEach(function (label) {
          label.classList.toggle('is-selected', label.contains(radio) && radio.checked);
        });
      });
    });
  }

  const variantSelects = document.querySelectorAll('[data-variant-select]');
  const productForm = document.querySelector('[data-product-form]');
  const variantsNode = document.querySelector('[data-product-variants]');
  if (productForm && variantSelects.length && variantsNode) {
    let variants = [];
    try {
      variants = JSON.parse(variantsNode.textContent || '[]');
    } catch (e) {
      variants = [];
    }
    const idInput = productForm.querySelector('[data-variant-id], [name="id"]');
    const priceEl = document.querySelector('[data-product-price]');
    const compareEl = document.querySelector('[data-product-compare]');
    const mainImage = document.querySelector('[data-product-main-image]');
    const submitBtn = productForm.querySelector('[type="submit"]');

    function selectedOptions() {
      return Array.from(variantSelects).map(function (select) {
        return select.value;
      });
    }

    function syncVariant() {
      const options = selectedOptions();
      const match = variants.find(function (variant) {
        return variant.options.every(function (opt, i) {
          return opt === options[i];
        });
      });
      if (!match || !idInput) return;
      idInput.value = match.id;
      if (priceEl) {
        priceEl.textContent = formatMoney(match.price);
      }
      if (compareEl) {
        if (match.compare_at_price && match.compare_at_price > match.price) {
          compareEl.textContent = formatMoney(match.compare_at_price);
          compareEl.hidden = false;
        } else {
          compareEl.textContent = '';
          compareEl.hidden = true;
        }
      }
      if (mainImage && match.featured_image && match.featured_image.src) {
        // Variant JSON gives a single CDN URL; drop srcset so it cannot stick to the old image.
        mainImage.removeAttribute('srcset');
        mainImage.src = match.featured_image.src;
        if (match.featured_image.alt) mainImage.alt = match.featured_image.alt;
      }
      if (submitBtn) {
        submitBtn.disabled = !match.available;
        submitBtn.textContent = match.available
          ? submitBtn.getAttribute('data-add-label') || 'Aggiungi al carrello'
          : submitBtn.getAttribute('data-soldout-label') || 'Esaurito';
      }
    }

    variantSelects.forEach(function (select) {
      select.addEventListener('change', syncVariant);
    });
  }

  function formatMoney(cents) {
    try {
      return (cents / 100).toLocaleString(document.documentElement.lang || 'it-IT', {
        style: 'currency',
        currency: window.Shopify && window.Shopify.currency && window.Shopify.currency.active
          ? window.Shopify.currency.active
          : 'EUR'
      });
    } catch (e) {
      return (cents / 100).toFixed(2) + ' €';
    }
  }
})();

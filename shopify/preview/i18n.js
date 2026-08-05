(function () {
  const STORAGE_KEY = 'km-preview-lang';
  const dict = {
    it: {
      'nav.home': 'Home',
      'nav.products': 'Prodotti',
      'nav.how': 'Come funziona',
      'nav.contact': 'Contatti',
      'nav.menu': 'Menu',
      'nav.support': 'Assistenza',
      'nav.search': 'Cerca',
      'nav.cart': 'Carrello',
      'nav.shipping': 'Spedizioni',
      'nav.returns': 'Resi e rimborsi',
      'nav.privacy': 'Privacy policy',
      'nav.terms': 'Termini e condizioni',
      'nav.follow': 'Seguici',
      'footer.brand': 'KhamaKey Moments: portachiavi NFC che aprono i vostri ricordi. Foto, musica, dedica. Zero app.',
      'footer.copy': '© 2026 KhamaKey Moments — anteprima locale',
      'preview.bar': 'Anteprima locale — IT/EN · portachiavi Moments',
      'hero.eyebrow': 'Il regalo che racconta la vostra storia',
      'hero.h1': 'Portachiavi Moments',
      'hero.lede': 'Un portachiavi NFC che apre una pagina di ricordi: foto, musica e dedica. Elegante, personale, senza app.',
      'hero.cta': 'Scopri le collezioni',
      'hero.cta2': 'Come funziona',
      'trust.1': 'Senza app',
      'trust.2': 'Piano Free incluso',
      'trust.3': 'Ricordi sempre aggiornabili',
      'story.eyebrow': 'Il gesto che resta',
      'story.h2': 'Non un gadget. Un ricordo da tenere vicino.',
      'story.p1': 'Un regalo bello da vedere, ancora più bello da vivere: chi lo riceve avvicina il telefono e scopre la storia che avete preparato insieme.',
      'story.p2': 'Pensato per i legami che contano: un gesto concreto che custodisce emozioni e le fa rivivere a ogni tocco.',
      'story.cta': 'Scopri le collezioni',
      'how.eyebrow': 'Semplicissimo',
      'how.h2': 'Tre passi. Un regalo indimenticabile.',
      'how.lede': 'Niente app da scaricare. Funziona con lo smartphone che hai già in tasca.',
      'how.1t': 'Scegli il tuo regalo',
      'how.1p': 'Scegli l’oggetto NFC che preferisci. Ogni prodotto include l’accesso al tuo editor personale e un codice di attivazione.',
      'how.2t': 'Crea la tua storia',
      'how.2p': 'Accedi all’editor e personalizza la tua pagina con foto, video, playlist, lettere, messaggi vocali, dediche, date importanti e molto altro.',
      'how.3t': 'Regala un’emozione',
      'how.3p': 'Chi riceve il regalo dovrà solo avvicinare lo smartphone all’oggetto NFC per accedere alla pagina che hai creato. Nessuna app da scaricare, solo un ricordo da vivere.',
      'feat.eyebrow': 'Le collezioni',
      'feat.h2': 'Love · Wedding · Amicizia',
      'feat.lede': 'Scegli il Moments, prepara la tua pagina e regala un’emozione che si riapre a ogni tocco.',
      'feat.love': 'Love',
      'feat.wedding': 'Wedding',
      'feat.friendship': 'Amicizia',
      'feat.count': '4 portachiavi Moments',
      'props.h2': 'Il regalo che non si dimentica',
      'props.1t': 'L’emozione al primo tocco',
      'props.1p': 'Avvicina lo smartphone e la storia si apre: foto, musica, dedica. Un regalo che sorprende davvero.',
      'props.2t': 'Sempre con voi',
      'props.2p': 'Aggiorna i ricordi quando vuoi: nuovi scatti, una canzone, un messaggio. Il Moments resta, la storia cresce.',
      'props.3t': 'Tre collezioni, un gesto',
      'props.3p': 'Portachiavi Moments per amore, matrimonio e amicizia — pensati per anniversari, nozze, compleanni e “solo perché”.',
      'props.4t': 'Niente abbonamenti obbligatori',
      'props.4p': 'Il piano Free è incluso con l’acquisto: tutte le funzioni per creare e vivere la tua pagina Moments.',
      'faq.eyebrow': 'Domande frequenti',
      'faq.h2': 'Tutto quello che ti serve sapere',
      'faq.1q': 'Serve un’app?',
      'faq.1a': 'No. Chi riceve il Moments avvicina lo smartphone e la pagina si apre subito. Per i telefoni più datati è disponibile anche un QR Code.',
      'faq.2q': 'Cosa posso mettere nella pagina?',
      'faq.2a': 'Foto, musica, dedica e altri contenuti della vostra storia — il cuore del regalo è quello che scegliete di condividere.',
      'faq.3q': 'C’è un abbonamento?',
      'faq.3a': 'No obbligatorio. Con l’acquisto hai il piano Free Moments: tutte le funzioni. Solo in futuro piani opzionali se vorrai più spazio o contenuti.',
      'faq.4q': 'Posso cambiare i ricordi dopo?',
      'faq.4a': 'Sì. Puoi aggiornare la pagina quando vuoi: nuovi momenti, nuove emozioni, stessa magia al tocco.',
      'faq.5q': 'Per chi è pensato?',
      'faq.5a': 'Per chi ami e per chi è speciale per te: un regalo NFC personale, adatto a ogni legame e a ogni occasione importante.',
      'cta.h2': 'Pronto a regalare un Moments?',
      'cta.lede': 'Scegli il tuo Moments, crea la pagina dei ricordi e regala un’emozione che si riapre a ogni tocco.',
      'cta.btn': 'Scopri i prodotti',
      'shop.h1': 'Moments',
      'shop.lede': 'Portachiavi NFC che custodiscono una pagina di ricordi: foto, musica e dedica. Un regalo elegante e personale — senza app da scaricare.',
      'product.lead': 'Un portachiavi Moments che custodisce la vostra storia. Prepara foto, musica e dedica online; chi lo riceve avvicina lo smartphone e vive il momento — senza app.',
      'contact.h1': 'Contatti',
      'contact.lede': 'Domande su ordini, spedizioni o Moments? Scrivici: ti rispondiamo al più presto.'
    },
    en: {
      'nav.home': 'Home',
      'nav.products': 'Products',
      'nav.how': 'How it works',
      'nav.contact': 'Contact',
      'nav.menu': 'Menu',
      'nav.support': 'Support',
      'nav.search': 'Search',
      'nav.cart': 'Cart',
      'nav.shipping': 'Shipping',
      'nav.returns': 'Returns & refunds',
      'nav.privacy': 'Privacy policy',
      'nav.terms': 'Terms & conditions',
      'nav.follow': 'Follow us',
      'footer.brand': 'KhamaKey Moments: NFC keyrings that open your memories. Photos, music, dedication. No app.',
      'footer.copy': '© 2026 KhamaKey Moments — local preview',
      'preview.bar': 'Local preview — IT/EN · Moments keyrings',
      'hero.eyebrow': 'The gift that tells your story',
      'hero.h1': 'Moments keyrings',
      'hero.lede': 'An NFC keyring that opens a page of memories: photos, music and a dedication. Elegant, personal — nothing to download.',
      'hero.cta': 'Explore the collections',
      'hero.cta2': 'How it works',
      'trust.1': 'No app needed',
      'trust.2': 'Free plan included',
      'trust.3': 'Memories you can update anytime',
      'story.eyebrow': 'A gesture that lasts',
      'story.h2': 'Not a gadget. A memory to keep close.',
      'story.p1': 'A gift that looks beautiful — and feels even better: they hold their phone close and discover the story you prepared together.',
      'story.p2': 'Made for the bonds that matter: a tangible gift that holds emotion and brings it back with every tap.',
      'story.cta': 'Explore the collections',
      'how.eyebrow': 'So simple',
      'how.h2': 'Three steps. An unforgettable gift.',
      'how.lede': 'Nothing to download. It works with the phone already in your pocket.',
      'how.1t': 'Choose your gift',
      'how.1p': 'Choose the NFC object you prefer. Every product includes access to your personal editor and an activation code.',
      'how.2t': 'Create your story',
      'how.2p': 'Open the editor and personalize your page with photos, videos, playlists, letters, voice notes, dedications, special dates and much more.',
      'how.3t': 'Gift an emotion',
      'how.3p': 'Whoever receives the gift just holds their smartphone to the NFC object to open the page you created. No app to download — just a memory to live.',
      'feat.eyebrow': 'The collections',
      'feat.h2': 'Love · Wedding · Friendship',
      'feat.lede': 'Four Moments keyrings in each collection. Pick a style, prepare the memories, gift the feeling.',
      'feat.love': 'Love',
      'feat.wedding': 'Wedding',
      'feat.friendship': 'Friendship',
      'feat.count': '4 Moments keyrings',
      'props.h2': 'The gift they won’t forget',
      'props.1t': 'Emotion at first tap',
      'props.1p': 'Hold the phone close and the story opens: photos, music, a dedication. A gift that truly surprises.',
      'props.2t': 'Always with you',
      'props.2p': 'Update memories anytime: new photos, a song, a message. The Moments stays — the story grows.',
      'props.3t': 'Three collections, one gesture',
      'props.3p': 'Moments keyrings for love, weddings and friendship — made for anniversaries, ceremonies, birthdays and “just because”.',
      'props.4t': 'No forced subscription',
      'props.4p': 'The Free plan is included with your purchase: everything you need to create and enjoy your Moments page.',
      'faq.eyebrow': 'FAQ',
      'faq.h2': 'Everything you need to know',
      'faq.1q': 'Do I need an app?',
      'faq.1a': 'No. They hold their phone to the Moments piece and the page opens right away. For older phones, a QR Code is available too.',
      'faq.2q': 'What can I put on the page?',
      'faq.2a': 'Photos, music, a dedication and more of your story — the heart of the gift is what you choose to share.',
      'faq.3q': 'Is there a subscription?',
      'faq.3a': 'Not required. Your purchase includes the Moments Free plan with all features. Optional plans may come later only if you want more space or content.',
      'faq.4q': 'Can I change the memories later?',
      'faq.4a': 'Yes. Update the page anytime: new moments, new feelings — same magic at a tap.',
      'faq.5q': 'Who is it for?',
      'faq.5a': 'For lovers, newlyweds and friends — three Moments keyring collections, four designs each, for every special occasion.',
      'cta.h2': 'Ready to gift a Moments?',
      'cta.lede': 'Choose your Moments, create the memory page and gift an emotion that opens again with every tap.',
      'cta.btn': 'Browse products',
      'shop.h1': 'Moments',
      'shop.lede': 'NFC keyrings that hold a page of memories: photos, music and a dedication. An elegant, personal gift — with nothing to download.',
      'product.lead': 'A Moments keyring that holds your story. Prepare photos, music and a dedication online; they hold their phone close and live the moment — no app.',
      'contact.h1': 'Contact',
      'contact.lede': 'Questions about orders, shipping or Moments? Write to us — we’ll reply soon.'
    }
  };

  function currentLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'it';
  }

  function t(key) {
    const lang = currentLang();
    return (dict[lang] && dict[lang][key]) || (dict.it[key]) || key;
  }

  function apply() {
    const lang = currentLang();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      const active = btn.getAttribute('data-lang-btn') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('km:lang', { detail: { lang: lang } }));
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang === 'en' ? 'en' : 'it');
    apply();
  }

  window.KMPreviewI18n = { t: t, apply: apply, setLang: setLang, currentLang: currentLang };
  document.addEventListener('DOMContentLoaded', apply);
})();

(() => {
  const translations = {
    'Mardi, 26 août 2026': 'Madi, 26 out 2026',
    'Port-au-Prince • 31°C': 'Pòtoprens • 31°C',
    'Accueil': 'Akèy', 'Politique': 'Politik', 'Économie': 'Ekonomi', 'Société': 'Sosyete',
    'Culture': 'Kilti', 'Sport': 'Espò', 'Opinion': 'Opinyon', 'Publicité': 'Piblisite',
    'Soumettre': 'Soumèt', 'Contact': 'Kontak', 'À propos': 'A pwopos', 'Équipe': 'Ekip',
    'Abonnez-vous au Channel WhatsApp': 'Abòne ak Channel WhatsApp la',
    'À propos de Kalfou Nouvelles': 'A pwopos Kalfou Nouvèl',
    'Contactez-nous': 'Kontakte nou', 'Soumettre un article': 'Soumèt yon atik',
    'Publicité & Partenariats': 'Piblisite ak Patenarya', 'Nom': 'Non', 'Votre nom': 'Non ou',
    'Votre nom complet': 'Non konplè ou', 'E-mail': 'Imèl', 'Votre e-mail': 'Imèl ou',
    'Entreprise': 'Antrepriz', 'Titre de l’article': 'Tit atik la', 'Catégorie': 'Kategori',
    'Résumé': 'Rezime', 'Contenu': 'Kontni', 'Sujet': 'Sijè', 'Message': 'Mesaj', 'Envoyer': 'Voye',
    'Modifier': 'Modifye', 'Publier': 'Pibliye', 'Retirer': 'Retire', 'Supprimer': 'Efase',
    'Accéder': 'Antre', 'Accès admin': 'Aksè admin', 'Mot de passe': 'Modpas',
    'Publier un article': 'Pibliye yon atik', 'Publier maintenant': 'Pibliye kounya',
    'Enregistrer brouillon': 'Anrejistre kòm bouyon', 'Soumissions d’articles': 'Atik moun soumèt',
    'Messages de contact': 'Mesaj kontak', 'Demandes de publicité': 'Demandes piblisite',
    'Aucune soumission pour le moment.': 'Pa gen soumission pou kounya.',
    'Aucun message reçu.': 'Pa gen mesaj resevwa.', 'Aucune demande de publicité.': 'Pa gen demann piblisite.',
    'Votre message a bien été enregistré.': 'Mesaj ou anrejistre avèk siksè.',
    'Votre demande a bien été enregistrée.': 'Demann ou anrejistre avèk siksè.',
    'Votre article a bien été reçu. Notre équipe le vérifiera prochainement.': 'Nou resevwa atik ou. Ekip nou an ap verifye li talè.',
    'Banner': 'Banner', 'Article sponsorisé': 'Atik sponsorize', 'Newsletter': 'Bilten nouvèl',
    'Partenariat global': 'Patenarya global', 'Partenariat': 'Patenarya', 'Sur devis': 'Sou devis',
    'Rechercher...': 'Chache...'
    , 'votre@email.com': 'imel-ou@example.com'
    , 'Votre nom complet': 'Non konplè ou'
    , 'Titre de votre article': 'Tit atik ou a'
    , 'Décrivez votre sujet en quelques lignes...': 'Dekri sijè ou a nan kèk liy...'
    , 'Saisissez le contenu détaillé de votre article...': 'Ekri tout detay atik ou a...'
    , 'Décrivez votre besoin...': 'Dekri bezwen ou...'
    , 'Nom de votre entreprise': 'Non antrepriz ou a'
    , 'Objet du message': 'Sijè mesaj la'
    , 'Écrivez votre message...': 'Ekri mesaj ou...'
    , 'Partagez une information, un essai ou une analyse avec l’équipe de Kalfou Nouvelles. Les contenus pertinents sont évalués par notre rédaction.': 'Pataje yon enfòmasyon, yon redaksyon oswa yon analiz ak ekip Kalfou Nouvèl. Redaksyon nou an ap evalye kontni ki apwopriye yo.'
    , 'Donnez à votre marque une visibilité claire, crédible et stratégique auprès d’un public engagé.': 'Bay mak ou vizibilite ki klè, serye ak estratejik devan yon piblik ki angaje.'
    , 'Vous avez une information, une opinion ou une histoire à partager ? Écrivez-nous, nous serons ravis de vous lire.': 'Ou gen yon enfòmasyon, yon opinyon oswa yon istwa pou pataje? Ekri nou, n ap kontan li mesaj ou.'
  };
  const buttons = document.querySelectorAll('[data-site-lang]');
  let language = localStorage.getItem('kalfou-language') || 'fr';

  function translatePage() {
    document.documentElement.lang = language === 'ht' ? 'ht' : 'fr';
    document.querySelectorAll('input, textarea').forEach((field) => {
      const source = field.dataset.originalPlaceholder || field.placeholder;
      field.dataset.originalPlaceholder = source;
      if (translations[source]) field.placeholder = language === 'ht' ? translations[source] : source;
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue.trim();
      const source = node.parentElement?.dataset?.translationSource || value;
      if (node.parentElement && !node.parentElement.dataset.translationSource) node.parentElement.dataset.translationSource = source;
      if (translations[source]) node.nodeValue = node.nodeValue.replace(value, language === 'ht' ? translations[source] : source);
    }
    buttons.forEach((button) => button.classList.toggle('active', button.dataset.siteLang === language));
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    language = button.dataset.siteLang;
    localStorage.setItem('kalfou-language', language);
    window.location.reload();
  }));
  translatePage();
})();
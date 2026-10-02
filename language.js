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
    , 'Politique de confidentialité': 'Règleman konfidansyalite'
    , 'Charte éditoriale': 'Angajman editoryal'
    , 'Confidentialité': 'Konfidansyalite'
    , 'Chargement de l’article...': 'Atik la ap chaje...'
    , 'La vidéo doit durer 3 minutes ou moins. Formats : MP4, WebM ou MOV. Image : 8 Mo maximum ; vidéo : 50 Mo.': 'Videyo a dwe dire 3 minit oswa mwens. Fòma: MP4, WebM oswa MOV. Imaj: 8 Mo maksimòm; videyo: 50 Mo.'
    , 'Dernière mise à jour : 2 octobre 2026': 'Dènye mizajou: 2 oktòb 2026'
    , 'Kalfou Nouvelles respecte la vie privée de ses lecteurs. Cette page explique quelles informations nous recevons lorsque vous utilisez le site, pourquoi nous les utilisons et comment nous contacter au sujet de vos données.': 'Kalfou Nouvelles respekte vi prive lektè li yo. Paj sa a esplike ki enfòmasyon nou resevwa lè w itilize sit la, poukisa nou itilize yo, epi kijan ou ka kontakte nou sou done w yo.'
    , 'Données recueillies': 'Enfòmasyon nou resevwa'
    , 'Lorsque vous nous contactez : votre nom, votre adresse e-mail, le sujet et le contenu de votre message.': 'Lè w kontakte nou: non ou, adrès imèl ou, sijè ak mesaj ou.'
    , 'Lorsque vous soumettez un article : le nom de l’auteur, son e-mail, le titre, la catégorie, le résumé, le texte et les médias envoyés.': 'Lè w soumèt yon atik: non otè a, imèl, tit, kategori, rezime, tèks ak medya ou chwazi voye.'
    , 'Lorsque vous demandez une publicité : votre nom, votre entreprise, votre e-mail, les détails de la campagne et les fichiers transmis.': 'Lè w mande piblisite: non, konpayi, imèl, detay kanpay ak nenpòt fichye ou voye.'
    , 'Lors de l’inscription à la newsletter : votre adresse e-mail.': 'Lè w enskri nan bilten an: adrès imèl ou.'
    , 'Pour mesurer les visites : la page consultée, la page de provenance, le navigateur, la date et un identifiant anonyme stocké dans votre navigateur.': 'Pou mezire vizit: paj ou louvri, paj referans lan, navigatè a, dat vizit la ak yon idantifyan anonim ki estoke nan navigatè w la.'
    , 'Utilisation des informations': 'Poukisa nou itilize enfòmasyon sa yo'
    , 'Nous les utilisons pour répondre aux messages, examiner les articles soumis, gérer les demandes publicitaires, envoyer la newsletter demandée, protéger le service contre les abus et comprendre quelles pages sont consultées. Nous ne vendons pas vos données personnelles.': 'Nou sèvi ak yo pou reponn mesaj, evalye atik ki soumèt, jere demann piblisite, voye bilten moun te mande a, pwoteje sèvis la kont abi, epi konprann ki paj lektè yo itilize. Nou pa vann enfòmasyon pèsonèl ou.'
    , 'Prestataires techniques': 'Sèvis ki ede nou opere sit la'
    , 'Les données et fichiers peuvent être traités par nos prestataires techniques : Netlify pour l’hébergement du site, Render pour le serveur, Supabase pour la base de données et les fichiers, Brevo pour les e-mails et la newsletter, et ImageKit pour les médias lorsque ce service est activé. Chaque prestataire applique sa propre politique. Les hébergeurs peuvent traiter des données techniques, comme l’adresse IP, dans leurs journaux de sécurité.': 'Done ak fichye yo ka trete pa founisè teknik nou itilize yo, tankou Netlify pou hosting sit la, Render pou backend la, Supabase pou bazdone ak fichye, Brevo pou imel/bilten, epi ImageKit pou medya lè sèvis sa a aktive. Chak founisè trete done dapre pwòp règleman li. Founisè hosting yo ka trete enfòmasyon teknik tankou adrès IP nan jounal sekirite yo.'
    , 'Stockage dans le navigateur': 'Depo nan navigatè a'
    , 'Le site conserve un identifiant de visiteur anonyme dans le stockage local du navigateur afin d’éviter de compter plusieurs fois le même visiteur au cours d’une journée. Vous pouvez effacer cette donnée dans les paramètres de votre navigateur ; un nouvel identifiant pourra alors être créé lors d’une prochaine visite.': 'Sit la estoke yon idantifyan vizitè anonim nan local storage navigatè a pou evite konte menm vizitè a plizyè fwa nan menm jou a. Ou ka efase done sa a nan paramèt navigatè w la; si w fè sa, sit la ka kreye yon nouvo idantifyan nan pwochen vizit la.'
    , 'Conservation et vos choix': 'Dire konsèvasyon ak chwa ou'
    , 'Nous conservons les informations aussi longtemps que nécessaire pour répondre aux demandes, exploiter les services, respecter nos obligations ou protéger le site. Pour demander l’accès, la rectification ou la suppression des données que vous nous avez transmises, contactez-nous via la page': 'Nou konsève enfòmasyon yo pandan tan ki nesesè pou reponn demann, opere sèvis yo, respekte obligasyon ki aplikab yo, oswa pwoteje sit la. Pou mande aksè, koreksyon oswa efasman done ou te voye, ekri nou sou paj'
    , 'Nous conservons les informations pendant le temps nécessaire pour répondre aux demandes, exploiter les services, respecter nos obligations ou protéger le site. Pour exercer vos droits d’accès, de rectification ou de suppression, contactez-nous via la page Contact. Nous pouvons vérifier votre demande avant d’y donner suite.': 'Nou konsève enfòmasyon yo pandan tan ki nesesè pou reponn demann, opere sèvis yo, respekte obligasyon ki aplikab yo, oswa pwoteje sit la. Pou egzèse dwa aksè, koreksyon oswa efasman ou, kontakte nou sou paj Kontak la. Nou ka verifye demann ou an anvan nou pran aksyon.'
    , 'Enfants et mises à jour': 'Timoun ak mizajou'
    , 'N’envoyez pas les données personnelles d’une autre personne sans autorisation. Nous pouvons mettre cette politique à jour si nos pratiques ou nos prestataires changent ; la date en haut de page indiquera la dernière révision.': 'Pa voye enfòmasyon pèsonèl yon lòt moun san otorizasyon. Nou ka mete règleman sa a ajou lè pratik sit la oswa sèvis li itilize yo chanje; dat ki anlè paj la ap montre dènye revizyon an.'
    , 'Engagement éditorial': 'Angajman editoryal'
    , 'Kalfou Nouvelles s’engage à publier des informations utiles, claires et responsables sur Haïti. Cette charte présente les principes que notre équipe doit suivre dans son travail éditorial.': 'Kalfou Nouvelles angaje l pou l bay enfòmasyon ki itil, klè epi responsab sou Ayiti. Règleman sa a prezante prensip ekip la dwe swiv nan travay editoryal li.'
    , 'Vérification et sources': 'Verifikasyon ak sous'
    , 'Avant publication, l’équipe doit vérifier les informations importantes à l’aide de sources fiables, de documents ou de témoins directs. Nous distinguons les faits confirmés des éléments incertains, citons les sources lorsque c’est possible et donnons aux personnes concernées la possibilité de répondre lorsque le sujet le justifie.': 'Anvan piblikasyon, ekip la dwe verifye enfòmasyon enpòtan yo ak sous serye, dokiman oswa temwen ki gen konesans dirèk. Nou dwe separe sa ki konfime ak sa ki poko klè, bay sous yo non lè sa posib, epi bay moun oswa enstitisyon ki konsène yo chans pou reponn lè sijè a mande sa.'
    , 'Corrections et mises à jour': 'Koreksyon ak mizajou'
    , 'Si nous découvrons une erreur importante, nous devons corriger l’article et expliquer aux lecteurs ce qui a changé. Vous pouvez nous envoyer une correction ou des éléments de preuve via la page': 'Si nou dekouvri yon erè enpòtan, nou dwe korije atik la epi fè lektè yo konnen sa ki te chanje. Ou ka voye koreksyon oswa prèv atravè paj'
    , 'Si nous découvrons une erreur importante, nous devons corriger l’article et expliquer aux lecteurs ce qui a changé. Vous pouvez nous envoyer une correction ou des éléments de preuve via la page Contact. Nous examinons les demandes, mais nous ne promettons pas de retirer une information exacte au seul motif qu’une personne n’est pas d’accord.': 'Si nou dekouvri yon erè enpòtan, nou dwe korije atik la epi esplike lektè yo sa ki chanje. Ou ka voye koreksyon oswa prèv atravè paj Kontak la. Nou egzamine demann yo, men nou pa pwomèt retire yon enfòmasyon ki egzak sèlman paske yon moun pa dakò avè l.'
    , 'Nous examinons les demandes, mais nous ne promettons pas de retirer une information exacte au seul motif qu’une personne n’est pas d’accord.': 'Nou revize demann yo, men nou pa pwomèt retire enfòmasyon ki egzat sèlman paske yon moun pa dakò avè l.'
    , 'Actualités, analyses et opinions': 'Nouvèl, analiz ak opinyon'
    , 'Les opinions doivent être présentées comme telles. Une interprétation ou une analyse ne doit pas être présentée comme un fait. Les titres et les images ne doivent pas déformer le sens de l’article.': 'Nou dwe make opinyon kòm opinyon, epi pa prezante kòm reyalite sa ki se entèpretasyon oswa analiz. Tit ak imaj pa dwe chanje sans enfòmasyon ki nan atik la.'
    , 'Articles proposés par les lecteurs': 'Atik lektè soumèt'
    , 'La soumission d’un article ne garantit pas sa publication. L’équipe peut le vérifier, le modifier pour plus de clarté, le refuser ou demander des précisions à son auteur. Nous ne publions pas de contenu qui porte atteinte aux droits d’autrui, trompe le public ou met des personnes en danger sans justification d’intérêt public.': 'Soumèt yon atik pa garanti piblikasyon. Ekip la ka verifye, modifye pou klète, refize oswa mande otè a plis detay. Nou pa pibliye kontni ki vyole dwa lòt moun, ki twonpe piblik la, oswa ki mete moun an danje san rezon piblik ki klè.'
    , 'Publicité et indépendance': 'Piblisite ak endepandans'
    , 'Les contenus payés ou sponsorisés doivent être clairement identifiés comme publicité ou partenariat. Un annonceur ne peut pas acheter une décision éditoriale ni faire passer une publicité pour une information indépendante.': 'Kontni peye oswa patwone dwe idantifye klèman kòm piblisite oswa patenarya. Piblisite pa dwe achte yon desizyon editoryal ni garanti yon atik prezante kòm nouvèl endepandan.'
    , 'Contacter la rédaction': 'Kontakte redaksyon an'
    , 'Pour signaler une erreur, demander un droit de réponse ou poser une question sur ces principes, contactez la rédaction via la page': 'Pou siyale yon erè, mande dwa repons oswa poze yon kesyon sou prensip sa yo, kontakte redaksyon an atravè paj'
    , 'Pour signaler une erreur, demander un droit de réponse ou poser une question sur ces principes, contactez la rédaction via la page Contact.': 'Pou siyale yon erè, mande dwa repons oswa poze yon kesyon sou prensip sa yo, kontakte redaksyon an atravè paj Kontak la.'
    , 'Akèy': 'Accueil'
    , 'Sou nou': 'À propos'
    , 'Kontak': 'Contact'
    , 'Angajman editoryal': 'Charte éditoriale'
    , 'Konfidansyalite': 'Confidentialité'
  };
  const buttons = document.querySelectorAll('[data-site-lang]');
  let language = localStorage.getItem('kalfou-language') || 'fr';

  function translatePage() {
    document.documentElement.lang = language === 'ht' ? 'ht' : 'fr';
    const title = document.querySelector('title');
    if (title?.dataset.langFr && title.dataset.langHt) title.textContent = language === 'ht' ? title.dataset.langHt : title.dataset.langFr;
    document.querySelectorAll('meta[data-lang-fr][data-lang-ht]').forEach((meta) => {
      meta.content = language === 'ht' ? meta.dataset.langHt : meta.dataset.langFr;
    });
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
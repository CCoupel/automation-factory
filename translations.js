/**
 * Automation Factory - Marketing Site Translations
 * Supports French (FR) and English (EN)
 */

const translations = {
    fr: {
        // Navigation
        'nav.features': 'Fonctionnalités',
        'nav.galaxy': 'Galaxy',
        'nav.collaboration': 'Collaboration',
        'nav.installation': 'Installation',
        'nav.versions': 'Versions',
        'nav.roadmap': 'Roadmap',
        'nav.cta': 'Accéder à l\'App',

        // Hero Section
        'hero.badge': 'Version 2.3.0 - Galaxy Admin Configuration',
        'hero.title': 'Créez vos Playbooks Ansible',
        'hero.title.highlight': 'Visuellement',
        'hero.subtitle': 'Interface drag & drop intuitive, intégration Galaxy complète avec 36 000+ rôles, collaboration temps réel et validation Ansible-lint instantanée.',
        'hero.btn.start': 'Commencer Gratuitement',
        'hero.btn.demo': 'Voir la Démo',
        'hero.stat.namespaces': 'Namespaces Galaxy',
        'hero.stat.roles': 'Rôles Disponibles',
        'hero.stat.opensource': 'Open Source',

        // Problems Section
        'problems.label': 'Le Constat',
        'problems.title': 'Créer des playbooks Ansible, c\'est',
        'problems.title.highlight': 'complexe',
        'problems.subtitle': 'Les équipes DevOps passent des heures à écrire du YAML, chercher la bonne syntaxe, et débugger des erreurs d\'indentation.',

        'problems.yaml.title': 'Syntaxe YAML stricte',
        'problems.yaml.desc': 'Une indentation incorrecte et tout le playbook échoue. Des heures perdues à chercher l\'erreur.',
        'problems.yaml.stat': '67%',
        'problems.yaml.stattext': 'des erreurs sont liées à l\'indentation YAML',

        'problems.docs.title': 'Documentation dispersée',
        'problems.docs.desc': 'Jongler entre docs.ansible.com, Galaxy et Stack Overflow pour trouver les bons paramètres.',
        'problems.docs.stat': '5,800+',
        'problems.docs.stattext': 'modules disponibles, difficile de s\'y retrouver',

        'problems.collab.title': 'Collaboration difficile',
        'problems.collab.desc': 'Partager des playbooks par email ou Git sans savoir qui modifie quoi en temps réel.',
        'problems.collab.stat': '3x',
        'problems.collab.stattext': 'plus de temps passé en coordination qu\'en développement',

        'problems.overview.title': 'Pas de vue d\'ensemble',
        'problems.overview.desc': 'Difficile de visualiser le flux d\'exécution et les dépendances entre tâches dans un fichier texte.',
        'problems.overview.stat': '250+',
        'problems.overview.stattext': 'lignes en moyenne par playbook complexe',

        'problems.solution.title': 'Automation Factory résout ces problèmes',
        'problems.solution.desc': 'Une interface visuelle qui génère du YAML valide, avec accès à toute la documentation et collaboration en temps réel.',

        // Features Section
        'features.label': 'Fonctionnalités',
        'features.title': 'Tout ce dont vous avez besoin pour créer des playbooks professionnels',
        'features.subtitle': 'Une interface moderne qui simplifie la création de playbooks Ansible sans sacrifier la puissance.',

        'features.dragdrop.title': 'Drag & Drop Intuitif',
        'features.dragdrop.desc': 'Glissez-déposez modules, blocs et rôles pour construire vos playbooks visuellement. Réorganisez vos tâches en quelques clics.',
        'features.dragdrop.list1': '5 zones de travail (pre_tasks, tasks, post_tasks, handlers, roles)',
        'features.dragdrop.list2': 'Blocs imbriqués avec rescue/always',
        'features.dragdrop.list3': 'Liens visuels entre les tâches',

        'features.validation.title': 'Validation Ansible-lint',
        'features.validation.desc': 'Validation en temps réel avec ansible-lint. Corrigez les erreurs avant même d\'exécuter.',

        'features.variables.title': 'Variables Typées',
        'features.variables.desc': 'Définissez le type (string, int, bool, list, dict), obligatoire/optionnel, et valeur par défaut.',

        'features.assertions.title': 'Assertions Automatiques',
        'features.assertions.desc': 'Génération automatique de blocs d\'assertions pour valider vos variables d\'entrée.',

        'features.yaml.title': 'Export YAML',
        'features.yaml.desc': 'Exportez vos playbooks en YAML propre et valide, prêts à être exécutés.',

        'features.preview.title': 'Preview en Temps Réel',
        'features.preview.desc': 'Visualisez le YAML généré instantanément pendant que vous construisez.',

        // Galaxy Section
        'galaxy.label': 'Intégration Galaxy',
        'galaxy.title': 'Accédez à tout l\'écosystème Ansible Galaxy',
        'galaxy.subtitle': 'Parcourez et utilisez plus de 36 000 rôles et 2 200 namespaces directement depuis l\'interface. Support complet des rôles standalone (v1) et des collections (v3).',

        'galaxy.search.title': 'Recherche Intelligente',
        'galaxy.search.desc': 'Trouvez rapidement les rôles dont vous avez besoin avec la recherche en temps réel.',

        'galaxy.lazy.title': 'Chargement Paresseux',
        'galaxy.lazy.desc': 'Architecture optimisée avec cache intelligent et chargement à la demande.',

        'galaxy.private.title': 'Galaxy Privée',
        'galaxy.private.desc': 'Support AAP Automation Hub et Galaxy NG pour vos rôles privés.',

        // Collaboration Section
        'collab.label': 'Collaboration',
        'collab.title': 'Travaillez en équipe, en temps réel',
        'collab.subtitle': 'Partagez vos playbooks avec votre équipe et collaborez simultanément avec synchronisation instantanée.',

        'collab.roles.title': 'Système de Rôles',
        'collab.roles.desc': '3 niveaux d\'accès : Propriétaire, Éditeur, Visualiseur. Contrôlez finement qui peut modifier vos playbooks.',

        'collab.sync.title': 'Sync Temps Réel',
        'collab.sync.desc': 'WebSockets pour une synchronisation instantanée. Voyez les modifications de vos collaborateurs en direct.',

        'collab.audit.title': 'Audit Log',
        'collab.audit.desc': 'Historique complet des modifications avec auteur, date et détails de chaque changement.',

        'collab.conflicts.title': 'Gestion Conflits',
        'collab.conflicts.desc': 'Optimistic locking pour éviter les conflits d\'édition simultanée sur les mêmes éléments.',

        'collab.avatars': '5 collaborateurs actifs sur ce playbook',

        // Demo Section
        'demo.label': 'Démonstration',
        'demo.title': 'Voyez Automation Factory en action',
        'demo.subtitle': 'Découvrez comment créer un playbook complet en quelques minutes avec notre interface intuitive.',

        'demo.step1.title': 'Parcourez Galaxy',
        'demo.step1.desc': 'Explorez les modules et rôles disponibles dans la palette latérale.',

        'demo.step2.title': 'Glissez-Déposez',
        'demo.step2.desc': 'Ajoutez des tâches à votre playbook par simple drag & drop.',

        'demo.step3.title': 'Configurez',
        'demo.step3.desc': 'Paramétrez chaque tâche avec le panneau de configuration contextuel.',

        'demo.step4.title': 'Exportez',
        'demo.step4.desc': 'Récupérez votre playbook YAML validé, prêt à être exécuté.',

        'demo.video': 'Vidéo de démonstration',

        // Versions Section
        'versions.label': 'Changelog',
        'versions.title': 'Historique des Versions',
        'versions.subtitle': 'Suivez l\'évolution d\'Automation Factory et découvrez les nouvelles fonctionnalités ajoutées à chaque version.',
        'versions.current': 'Actuelle',
        'versions.legend': 'Filtrer :',
        'versions.legend.api': 'API',
        'versions.legend.frontend': 'Frontend',
        'versions.legend.backend': 'Backend',
        'versions.legend.security': 'Sécurité',
        'versions.legend.perf': 'Perf',
        'versions.legend.collab': 'Collab',
        'versions.legend.all': 'Tous',


        // Version 2.3.0
        'versions.v230.date': 'Janvier 2026',
        'versions.v230.title': 'Galaxy Admin Configuration',
        'versions.v230.f1': 'Galaxy Sources UI',
        'versions.v230.f1.detail': 'Interface admin pour gerer les sources Galaxy (publique/privees)',
        'versions.v230.f2': 'Multi-sources',
        'versions.v230.f2.detail': 'Support multi-sources Galaxy privees (AAP, Galaxy NG)',
        'versions.v230.f3': 'Tokens chiffres',
        'versions.v230.f3.detail': 'Stockage securise des tokens avec chiffrement Fernet AES',
        'versions.v230.f4': 'Test connexion',
        'versions.v230.f4.detail': 'Test de connexion avec indicateurs de statut en temps reel',
        'versions.v230.f5': 'Drag & drop roles',
        'versions.v230.f5.detail': 'Drop un role dans tasks cree automatiquement include_role',
        // Version 2.2.1
        'versions.v221.date': 'Janvier 2026',
        'versions.v221.title': 'Theme System',
        'versions.v221.f1': '3-state theme',
        'versions.v221.f1.detail': 'Trois modes de theme : Light, Dark et System (suit les preferences OS)',
        'versions.v221.f2': 'System preference',
        'versions.v221.f2.detail': 'Detection automatique de la preference systeme avec mise a jour temps reel',
        'versions.v221.f3': 'Dark mode fixes',
        'versions.v221.f3.detail': 'Zone des onglets adaptee au theme, couleurs thematiques coherentes',
        'versions.v221.f4': 'Login isolation',
        'versions.v221.f4.detail': 'Page de login isolee du theme (toujours en mode clair)',

        // Version 2.2.0
        'versions.v220.date': 'Janvier 2026',
        'versions.v220.title': 'Code Rationalization',
        'versions.v220.f1': 'BaseHTTPService',
        'versions.v220.f1.detail': 'Classe de base centralisee pour tous les services HTTP backend',
        'versions.v220.f2': 'CacheTTL config',
        'versions.v220.f2.detail': 'Constantes TTL centralisees pour configuration cache unifiee',
        'versions.v220.f3': 'CacheManager',
        'versions.v220.f3.detail': 'Utilitaire generique CacheManager<T> pour caching frontend',
        'versions.v220.f4': 'Favorites API 9->3',
        'versions.v220.f4.detail': 'Consolidation de 9 endpoints favoris en 3 endpoints generiques',
        'versions.v220.f5': '-400 lignes code',
        'versions.v220.f5.detail': 'Elimination de ~400 lignes de code duplique grace a la rationalisation',

        // Version 2.1.0
        'versions.v210.date': 'Janvier 2026',
        'versions.v210.title': 'Diagram Export/Import',
        'versions.v210.f1': 'Export ABD',
        'versions.v210.f1.detail': 'Format JSON propriétaire .abd pour backup complet avec positions et état UI',
        'versions.v210.f2': 'Export Mermaid',
        'versions.v210.f2.detail': 'Export Markdown avec diagramme Mermaid pour GitHub, GitLab, Notion',
        'versions.v210.f3': 'Export SVG',
        'versions.v210.f3.detail': 'Image vectorielle haute qualité avec positions originales et blocs imbriqués',
        'versions.v210.f4': 'Import ABD',
        'versions.v210.f4.detail': 'Importation avec validation, intégrité et détection de fonctionnalités',
        'versions.v210.f5': 'Backend exporters',
        'versions.v210.f5.detail': 'Exporters modulaires dans le backend comme source de vérité',

        // Version 2.0.0
        'versions.v200.date': 'Janvier 2026',
        'versions.v200.title': 'Galaxy Roles Integration',
        'versions.v200.f1': 'API Galaxy v1 + v3',
        'versions.v200.f1.detail': 'Support API Galaxy v1 (36,000+ rôles standalone) et v3 (collections)',
        'versions.v200.f2': 'Galaxy privée',
        'versions.v200.f2.detail': 'Support Galaxy privée (AAP Automation Hub / Galaxy NG) avec authentification token',
        'versions.v200.f3': 'RolesTreeView',
        'versions.v200.f3.detail': 'Interface arborescente avec onglets Standalone/Collections, recherche et drag & drop',
        'versions.v200.f4': 'Toggle rôles',
        'versions.v200.f4.detail': 'Activer/désactiver les rôles dans le playbook avec style visuel distinct',
        'versions.v200.f5': 'YAML + variables',
        'versions.v200.f5.detail': 'Génération YAML complète avec rôles, variables et filtrage des rôles désactivés',

        // Version 1.17.0
        'versions.v1170.date': 'Décembre 2025',
        'versions.v1170.title': 'Bloc Assertions Système',
        'versions.v1170.f1': 'Blocs système',
        'versions.v1170.f1.detail': 'Blocs système non-modifiables avec style distinct (thème gris, icône cadenas)',
        'versions.v1170.f2': 'Auto-assertions',
        'versions.v1170.f2.detail': 'Génération automatique d\'assertions par variable (required, type, pattern)',
        'versions.v1170.f3': 'Liens auto',
        'versions.v1170.f3.detail': 'Liens auto-générés entre blocs et tâches pour une vue structurée',
        'versions.v1170.f4': 'Types custom',
        'versions.v1170.f4.detail': 'Support types custom avec regexp ou filtres Ansible pour la validation',

        // Version 1.15.0
        'versions.v1150.date': 'Décembre 2025',
        'versions.v1150.title': 'Variables Typées',
        'versions.v1150.f1': '5 types natifs',
        'versions.v1150.f1.detail': '5 types de variables natifs : string, int, bool, list, dict',
        'versions.v1150.f2': 'Requis/optionnel',
        'versions.v1150.f2.detail': 'Indicateur requis/optionnel sur chaque variable avec icône visuelle',
        'versions.v1150.f3': 'Validation regex',
        'versions.v1150.f3.detail': 'Valeur par défaut et validation par expression régulière',
        'versions.v1150.f4': 'Types admin',
        'versions.v1150.f4.detail': 'Types de variables personnalisables par les administrateurs',

        // Version 1.14.0
        'versions.v1140.date': 'Décembre 2025',
        'versions.v1140.title': 'Synchronisation Temps Réel',
        'versions.v1140.f1': 'Sync granulaire',
        'versions.v1140.f1.detail': 'Updates granulaires par champ/élément avec debounce 300ms',
        'versions.v1140.f2': 'Highlight collab',
        'versions.v1140.f2.detail': 'Surbrillance collaborative avec couleurs uniques par utilisateur',
        'versions.v1140.f3': 'TreeView modules',
        'versions.v1140.f3.detail': 'Vue arborescente des modules avec chargement paresseux',
        'versions.v1140.f4': 'Lazy loading',
        'versions.v1140.f4.detail': 'Chargement paresseux optimisé avec batch parallèle (10 namespaces)',

        // Version 1.13.0
        'versions.v1130.date': 'Décembre 2025',
        'versions.v1130.title': 'Collaboration Multi-utilisateur',
        'versions.v1130.f1': 'Rôles utilisateur',
        'versions.v1130.f1.detail': 'Système de rôles : Propriétaire, Éditeur, Visualiseur',
        'versions.v1130.f2': 'Partage playbooks',
        'versions.v1130.f2.detail': 'Partage de playbooks par username avec gestion des permissions',
        'versions.v1130.f3': 'WebSockets',
        'versions.v1130.f3.detail': 'WebSockets temps réel avec avatars et présence utilisateur',
        'versions.v1130.f4': 'Audit log',
        'versions.v1130.f4.detail': 'Journal d\'audit des modifications avec historique complet',

        // Roadmap Section
        'roadmap.label': 'Roadmap',
        'roadmap.title': 'Fonctionnalités à Venir',
        'roadmap.subtitle': 'Découvrez ce que nous préparons pour les prochaines versions d\'Automation Factory.',

        'roadmap.collab.title': 'Collaboration Avancée',
        'roadmap.collab.f1': 'Messagerie temps réel entre collaborateurs',
        'roadmap.collab.f2': 'Verrouillage/déverrouillage de playbook',

        'roadmap.import.title': 'Import & Export',
        'roadmap.import.f1': 'Import playbooks YAML et rôles Ansible',
        'roadmap.import.f2': 'Export en rôle ou collection Ansible',
        'roadmap.import.f3': 'Publication directe vers Galaxy privée',

        'roadmap.security.title': 'Sécurité & Vault',
        'roadmap.security.f1': 'Intégration Ansible Vault',
        'roadmap.security.f2': 'Détection automatique de secrets',
        'roadmap.security.f3': 'Gestion des sessions admin',

        'roadmap.annotations.title': 'Annotations & Historique',
        'roadmap.annotations.f1': 'Commentaires sur tâches et modules',
        'roadmap.annotations.f2': 'Versioning et historique des playbooks',
        'roadmap.annotations.f3': 'Comparaison et diff entre versions',

        'roadmap.inventory.title': 'Inventaire & Connexions',
        'roadmap.inventory.f1': 'Éditeur d\'inventaire visuel',
        'roadmap.inventory.f2': 'Test de connexion SSH',
        'roadmap.inventory.f3': 'Inventaire dynamique (AWS, Azure, GCP)',

        'roadmap.git.title': 'Intégrations Git',
        'roadmap.git.f1': 'Connexion GitHub/GitLab/Bitbucket',
        'roadmap.git.f2': 'Push/Pull et gestion des branches',
        'roadmap.git.f3': 'Tags de version et changelog auto',

        'roadmap.more.title': 'Et Plus Encore...',
        'roadmap.more.f1': 'Centre de notifications',
        'roadmap.more.f2': 'Dashboard admin et statistiques',
        'roadmap.more.f3': 'Gestion des rôles Ansible',

        // Slideshow captions
        'slideshow.interface': 'Interface principale avec zones de travail',
        'slideshow.modules': 'Parcourez les modules Galaxy',
        'slideshow.roles': '36 000+ rôles Ansible disponibles',
        'slideshow.block': 'Blocs avec gestion d\'erreurs',
        'slideshow.share': 'Partagez avec votre équipe',
        'slideshow.validation': 'Validation Ansible-lint intégrée',

        // Installation Section
        'install.label': 'Déploiement',
        'install.title': 'Installation',
        'install.subtitle': 'Déployez Automation Factory selon vos besoins : en local, avec Docker, ou sur Kubernetes.',

        'install.tab.docker': 'Docker Compose',
        'install.tab.kubernetes': 'Kubernetes (Helm)',
        'install.tab.standalone': 'Standalone',

        'install.docker.title': 'Déploiement avec Docker Compose',
        'install.docker.desc': 'La méthode la plus simple pour déployer Automation Factory. Prêt en 2 minutes avec SQLite intégré, aucune configuration requise.',
        'install.docker.recommended': 'Recommandé',
        'install.docker.quick': 'Installation rapide (SQLite)',
        'install.docker.copy': 'Copier',
        'install.docker.copied': 'Copié !',
        'install.docker.minimal': 'docker-compose.yml - Configuration minimale',
        'install.docker.note.title': 'SQLite vs PostgreSQL',
        'install.docker.note.desc': 'SQLite est parfait pour démarrer rapidement, les tests et les petites équipes (jusqu\'à 10 utilisateurs). Pour la production avec plus d\'utilisateurs, passez à PostgreSQL.',
        'install.docker.advanced': 'Configuration avancée (PostgreSQL + Redis)',
        'install.docker.prod': 'docker-compose.yml - Production',

        'install.k8s.title': 'Déploiement sur Kubernetes avec Helm',
        'install.k8s.desc': 'Pour les environnements de production. Haute disponibilité, scaling automatique et gestion centralisée.',
        'install.k8s.commands': 'Installation Helm',
        'install.k8s.config': 'custom-values.yaml - Configuration Helm',

        'install.standalone.title': 'Installation Standalone (Développement)',
        'install.standalone.desc': 'Pour le développement local ou les tests. Backend et frontend lancés séparément.',
        'install.standalone.commands': 'Installation manuelle',

        'install.requirements': 'Prérequis',

        // CTA Section
        'cta.title': 'Prêt à simplifier vos playbooks Ansible ?',
        'cta.subtitle': 'Commencez gratuitement dès aujourd\'hui. Aucune carte de crédit requise.',
        'cta.btn': 'Lancer Automation Factory',

        // Footer
        'footer.desc': 'Créateur visuel de playbooks Ansible. Open source et gratuit.',
        'footer.product': 'Produit',
        'footer.resources': 'Ressources',
        'footer.ansible.docs': 'Documentation Ansible',
        'footer.ansible.galaxy': 'Ansible Galaxy',
        'footer.copyright': '2026 Automation Factory. Développé par Cyril Coupel.',

        // Language switcher
        'lang.fr': 'FR',
        'lang.en': 'EN'
    },

    en: {
        // Navigation
        'nav.features': 'Features',
        'nav.galaxy': 'Galaxy',
        'nav.collaboration': 'Collaboration',
        'nav.installation': 'Installation',
        'nav.versions': 'Versions',
        'nav.roadmap': 'Roadmap',
        'nav.cta': 'Access App',

        // Hero Section
        'hero.badge': 'Version 2.3.0 - Galaxy Admin Configuration',
        'hero.title': 'Build your Ansible Playbooks',
        'hero.title.highlight': 'Visually',
        'hero.subtitle': 'Intuitive drag & drop interface, complete Galaxy integration with 36,000+ roles, real-time collaboration and instant Ansible-lint validation.',
        'hero.btn.start': 'Get Started Free',
        'hero.btn.demo': 'Watch Demo',
        'hero.stat.namespaces': 'Galaxy Namespaces',
        'hero.stat.roles': 'Available Roles',
        'hero.stat.opensource': 'Open Source',

        // Problems Section
        'problems.label': 'The Problem',
        'problems.title': 'Building Ansible playbooks is',
        'problems.title.highlight': 'complex',
        'problems.subtitle': 'DevOps teams spend hours writing YAML, searching for the right syntax, and debugging indentation errors.',

        'problems.yaml.title': 'Strict YAML Syntax',
        'problems.yaml.desc': 'One wrong indentation and the entire playbook fails. Hours lost searching for the error.',
        'problems.yaml.stat': '67%',
        'problems.yaml.stattext': 'of errors are related to YAML indentation',

        'problems.docs.title': 'Scattered Documentation',
        'problems.docs.desc': 'Juggling between docs.ansible.com, Galaxy and Stack Overflow to find the right parameters.',
        'problems.docs.stat': '5,800+',
        'problems.docs.stattext': 'modules available, hard to navigate',

        'problems.collab.title': 'Difficult Collaboration',
        'problems.collab.desc': 'Sharing playbooks via email or Git without knowing who is modifying what in real-time.',
        'problems.collab.stat': '3x',
        'problems.collab.stattext': 'more time spent coordinating than developing',

        'problems.overview.title': 'No Big Picture',
        'problems.overview.desc': 'Hard to visualize execution flow and task dependencies in a text file.',
        'problems.overview.stat': '250+',
        'problems.overview.stattext': 'lines on average per complex playbook',

        'problems.solution.title': 'Automation Factory solves these problems',
        'problems.solution.desc': 'A visual interface that generates valid YAML, with access to all documentation and real-time collaboration.',

        // Features Section
        'features.label': 'Features',
        'features.title': 'Everything you need to create professional playbooks',
        'features.subtitle': 'A modern interface that simplifies Ansible playbook creation without sacrificing power.',

        'features.dragdrop.title': 'Intuitive Drag & Drop',
        'features.dragdrop.desc': 'Drag and drop modules, blocks and roles to build your playbooks visually. Reorganize your tasks in a few clicks.',
        'features.dragdrop.list1': '5 work zones (pre_tasks, tasks, post_tasks, handlers, roles)',
        'features.dragdrop.list2': 'Nested blocks with rescue/always',
        'features.dragdrop.list3': 'Visual links between tasks',

        'features.validation.title': 'Ansible-lint Validation',
        'features.validation.desc': 'Real-time validation with ansible-lint. Fix errors before even running.',

        'features.variables.title': 'Typed Variables',
        'features.variables.desc': 'Define type (string, int, bool, list, dict), required/optional, and default value.',

        'features.assertions.title': 'Automatic Assertions',
        'features.assertions.desc': 'Automatic generation of assertion blocks to validate your input variables.',

        'features.yaml.title': 'YAML Export',
        'features.yaml.desc': 'Export your playbooks as clean, valid YAML, ready to run.',

        'features.preview.title': 'Real-Time Preview',
        'features.preview.desc': 'View the generated YAML instantly as you build.',

        // Galaxy Section
        'galaxy.label': 'Galaxy Integration',
        'galaxy.title': 'Access the entire Ansible Galaxy ecosystem',
        'galaxy.subtitle': 'Browse and use over 36,000 roles and 2,200 namespaces directly from the interface. Full support for standalone roles (v1) and collections (v3).',

        'galaxy.search.title': 'Smart Search',
        'galaxy.search.desc': 'Quickly find the roles you need with real-time search.',

        'galaxy.lazy.title': 'Lazy Loading',
        'galaxy.lazy.desc': 'Optimized architecture with intelligent caching and on-demand loading.',

        'galaxy.private.title': 'Private Galaxy',
        'galaxy.private.desc': 'Support for AAP Automation Hub and Galaxy NG for your private roles.',

        // Collaboration Section
        'collab.label': 'Collaboration',
        'collab.title': 'Work as a team, in real-time',
        'collab.subtitle': 'Share your playbooks with your team and collaborate simultaneously with instant synchronization.',

        'collab.roles.title': 'Role System',
        'collab.roles.desc': '3 access levels: Owner, Editor, Viewer. Fine-grained control over who can modify your playbooks.',

        'collab.sync.title': 'Real-Time Sync',
        'collab.sync.desc': 'WebSockets for instant synchronization. See your collaborators\' changes live.',

        'collab.audit.title': 'Audit Log',
        'collab.audit.desc': 'Complete history of modifications with author, date and details of each change.',

        'collab.conflicts.title': 'Conflict Management',
        'collab.conflicts.desc': 'Optimistic locking to prevent simultaneous editing conflicts on the same elements.',

        'collab.avatars': '5 active collaborators on this playbook',

        // Demo Section
        'demo.label': 'Demo',
        'demo.title': 'See Automation Factory in action',
        'demo.subtitle': 'Discover how to create a complete playbook in minutes with our intuitive interface.',

        'demo.step1.title': 'Browse Galaxy',
        'demo.step1.desc': 'Explore available modules and roles in the sidebar palette.',

        'demo.step2.title': 'Drag & Drop',
        'demo.step2.desc': 'Add tasks to your playbook with simple drag & drop.',

        'demo.step3.title': 'Configure',
        'demo.step3.desc': 'Set up each task with the contextual configuration panel.',

        'demo.step4.title': 'Export',
        'demo.step4.desc': 'Get your validated YAML playbook, ready to run.',

        'demo.video': 'Demo video',

        // Versions Section
        'versions.label': 'Changelog',
        'versions.title': 'Version History',
        'versions.subtitle': 'Follow the evolution of Automation Factory and discover new features added in each version.',
        'versions.current': 'Current',
        'versions.legend': 'Filter:',
        'versions.legend.api': 'API',
        'versions.legend.frontend': 'Frontend',
        'versions.legend.backend': 'Backend',
        'versions.legend.security': 'Security',
        'versions.legend.perf': 'Perf',
        'versions.legend.collab': 'Collab',
        'versions.legend.all': 'All',


        // Version 2.3.0
        'versions.v230.date': 'January 2026',
        'versions.v230.title': 'Galaxy Admin Configuration',
        'versions.v230.f1': 'Galaxy Sources UI',
        'versions.v230.f1.detail': 'Admin interface to manage Galaxy sources (public/private)',
        'versions.v230.f2': 'Multi-sources',
        'versions.v230.f2.detail': 'Multi-source private Galaxy support (AAP, Galaxy NG)',
        'versions.v230.f3': 'Encrypted tokens',
        'versions.v230.f3.detail': 'Secure token storage with Fernet AES encryption',
        'versions.v230.f4': 'Connection test',
        'versions.v230.f4.detail': 'Connection testing with real-time status indicators',
        'versions.v230.f5': 'Drag & drop roles',
        'versions.v230.f5.detail': 'Drop a role in tasks automatically creates include_role',
        // Version 2.2.1
        'versions.v221.date': 'January 2026',
        'versions.v221.title': 'Theme System',
        'versions.v221.f1': '3-state theme',
        'versions.v221.f1.detail': 'Three theme modes: Light, Dark and System (follows OS preference)',
        'versions.v221.f2': 'System preference',
        'versions.v221.f2.detail': 'Automatic system preference detection with real-time updates',
        'versions.v221.f3': 'Dark mode fixes',
        'versions.v221.f3.detail': 'Tabs zone adapted to theme, consistent themed colors',
        'versions.v221.f4': 'Login isolation',
        'versions.v221.f4.detail': 'Login page isolated from theme (always light mode)',

        // Version 2.2.0
        'versions.v220.date': 'January 2026',
        'versions.v220.title': 'Code Rationalization',
        'versions.v220.f1': 'BaseHTTPService',
        'versions.v220.f1.detail': 'Centralized base class for all backend HTTP services',
        'versions.v220.f2': 'CacheTTL config',
        'versions.v220.f2.detail': 'Centralized TTL constants for unified cache configuration',
        'versions.v220.f3': 'CacheManager',
        'versions.v220.f3.detail': 'Generic CacheManager<T> utility for frontend caching',
        'versions.v220.f4': 'Favorites API 9->3',
        'versions.v220.f4.detail': 'Consolidated 9 favorites endpoints into 3 generic endpoints',
        'versions.v220.f5': '-400 lines code',
        'versions.v220.f5.detail': 'Eliminated ~400 lines of duplicated code through rationalization',

        // Version 2.1.0
        'versions.v210.date': 'January 2026',
        'versions.v210.title': 'Diagram Export/Import',
        'versions.v210.f1': 'Export ABD',
        'versions.v210.f1.detail': 'Proprietary .abd JSON format for full backup with positions and UI state',
        'versions.v210.f2': 'Export Mermaid',
        'versions.v210.f2.detail': 'Markdown export with Mermaid diagram for GitHub, GitLab, Notion',
        'versions.v210.f3': 'Export SVG',
        'versions.v210.f3.detail': 'High quality vector image with original positions and nested blocks',
        'versions.v210.f4': 'Import ABD',
        'versions.v210.f4.detail': 'Import with validation, integrity checks and feature detection',
        'versions.v210.f5': 'Backend exporters',
        'versions.v210.f5.detail': 'Modular exporters in backend as source of truth',

        // Version 2.0.0
        'versions.v200.date': 'January 2026',
        'versions.v200.title': 'Galaxy Roles Integration',
        'versions.v200.f1': 'Galaxy API v1 + v3',
        'versions.v200.f1.detail': 'Galaxy API v1 support (36,000+ standalone roles) and v3 (collections)',
        'versions.v200.f2': 'Private Galaxy',
        'versions.v200.f2.detail': 'Private Galaxy support (AAP Automation Hub / Galaxy NG) with token auth',
        'versions.v200.f3': 'RolesTreeView',
        'versions.v200.f3.detail': 'Tree interface with Standalone/Collections tabs, search and drag & drop',
        'versions.v200.f4': 'Toggle roles',
        'versions.v200.f4.detail': 'Enable/disable roles in the playbook with distinct visual styling',
        'versions.v200.f5': 'YAML + variables',
        'versions.v200.f5.detail': 'Complete YAML generation with roles, variables and disabled roles filtering',

        // Version 1.17.0
        'versions.v1170.date': 'December 2025',
        'versions.v1170.title': 'System Assertions Block',
        'versions.v1170.f1': 'System blocks',
        'versions.v1170.f1.detail': 'Non-modifiable system blocks with distinct styling (gray theme, lock icon)',
        'versions.v1170.f2': 'Auto-assertions',
        'versions.v1170.f2.detail': 'Automatic assertion generation per variable (required, type, pattern)',
        'versions.v1170.f3': 'Auto links',
        'versions.v1170.f3.detail': 'Auto-generated links between blocks and tasks for structured view',
        'versions.v1170.f4': 'Custom types',
        'versions.v1170.f4.detail': 'Custom types support with regexp or Ansible filters for validation',

        // Version 1.15.0
        'versions.v1150.date': 'December 2025',
        'versions.v1150.title': 'Typed Variables',
        'versions.v1150.f1': '5 native types',
        'versions.v1150.f1.detail': '5 native variable types: string, int, bool, list, dict',
        'versions.v1150.f2': 'Required/optional',
        'versions.v1150.f2.detail': 'Required/optional indicator on each variable with visual icon',
        'versions.v1150.f3': 'Regex validation',
        'versions.v1150.f3.detail': 'Default value and regular expression validation',
        'versions.v1150.f4': 'Admin types',
        'versions.v1150.f4.detail': 'Admin-customizable variable types',

        // Version 1.14.0
        'versions.v1140.date': 'December 2025',
        'versions.v1140.title': 'Real-Time Synchronization',
        'versions.v1140.f1': 'Granular sync',
        'versions.v1140.f1.detail': 'Granular updates per field/element with 300ms debounce',
        'versions.v1140.f2': 'Collab highlight',
        'versions.v1140.f2.detail': 'Collaborative highlighting with unique colors per user',
        'versions.v1140.f3': 'TreeView modules',
        'versions.v1140.f3.detail': 'Tree view of modules with lazy loading',
        'versions.v1140.f4': 'Lazy loading',
        'versions.v1140.f4.detail': 'Optimized lazy loading with parallel batch (10 namespaces)',

        // Version 1.13.0
        'versions.v1130.date': 'December 2025',
        'versions.v1130.title': 'Multi-user Collaboration',
        'versions.v1130.f1': 'User roles',
        'versions.v1130.f1.detail': 'Role system: Owner, Editor, Viewer',
        'versions.v1130.f2': 'Playbook sharing',
        'versions.v1130.f2.detail': 'Playbook sharing by username with permission management',
        'versions.v1130.f3': 'WebSockets',
        'versions.v1130.f3.detail': 'Real-time WebSockets with avatars and user presence',
        'versions.v1130.f4': 'Audit log',
        'versions.v1130.f4.detail': 'Modification audit log with complete history',

        // Roadmap Section
        'roadmap.label': 'Roadmap',
        'roadmap.title': 'Upcoming Features',
        'roadmap.subtitle': 'Discover what we\'re preparing for future versions of Automation Factory.',

        'roadmap.collab.title': 'Advanced Collaboration',
        'roadmap.collab.f1': 'Real-time messaging between collaborators',
        'roadmap.collab.f2': 'Playbook locking/unlocking',

        'roadmap.import.title': 'Import & Export',
        'roadmap.import.f1': 'Import YAML playbooks and Ansible roles',
        'roadmap.import.f2': 'Export as Ansible role or collection',
        'roadmap.import.f3': 'Direct publish to private Galaxy',

        'roadmap.security.title': 'Security & Vault',
        'roadmap.security.f1': 'Ansible Vault integration',
        'roadmap.security.f2': 'Automatic secrets detection',
        'roadmap.security.f3': 'Admin session management',

        'roadmap.annotations.title': 'Annotations & History',
        'roadmap.annotations.f1': 'Comments on tasks and modules',
        'roadmap.annotations.f2': 'Playbook versioning and history',
        'roadmap.annotations.f3': 'Version comparison and diff',

        'roadmap.inventory.title': 'Inventory & Connections',
        'roadmap.inventory.f1': 'Visual inventory editor',
        'roadmap.inventory.f2': 'SSH connection testing',
        'roadmap.inventory.f3': 'Dynamic inventory (AWS, Azure, GCP)',

        'roadmap.git.title': 'Git Integrations',
        'roadmap.git.f1': 'GitHub/GitLab/Bitbucket connection',
        'roadmap.git.f2': 'Push/Pull and branch management',
        'roadmap.git.f3': 'Version tags and auto changelog',

        'roadmap.more.title': 'And More...',
        'roadmap.more.f1': 'Notification center',
        'roadmap.more.f2': 'Admin dashboard and statistics',
        'roadmap.more.f3': 'Ansible roles management',

        // Slideshow captions
        'slideshow.interface': 'Main interface with work zones',
        'slideshow.modules': 'Browse Galaxy modules',
        'slideshow.roles': '36,000+ Ansible roles available',
        'slideshow.block': 'Blocks with error handling',
        'slideshow.share': 'Share with your team',
        'slideshow.validation': 'Built-in Ansible-lint validation',

        // Installation Section
        'install.label': 'Deployment',
        'install.title': 'Installation',
        'install.subtitle': 'Deploy Automation Factory according to your needs: locally, with Docker, or on Kubernetes.',

        'install.tab.docker': 'Docker Compose',
        'install.tab.kubernetes': 'Kubernetes (Helm)',
        'install.tab.standalone': 'Standalone',

        'install.docker.title': 'Deploy with Docker Compose',
        'install.docker.desc': 'The simplest method to deploy Automation Factory. Ready in 2 minutes with built-in SQLite, no configuration required.',
        'install.docker.recommended': 'Recommended',
        'install.docker.quick': 'Quick install (SQLite)',
        'install.docker.copy': 'Copy',
        'install.docker.copied': 'Copied!',
        'install.docker.minimal': 'docker-compose.yml - Minimal configuration',
        'install.docker.note.title': 'SQLite vs PostgreSQL',
        'install.docker.note.desc': 'SQLite is perfect for getting started quickly, testing, and small teams (up to 10 users). For production with more users, switch to PostgreSQL.',
        'install.docker.advanced': 'Advanced configuration (PostgreSQL + Redis)',
        'install.docker.prod': 'docker-compose.yml - Production',

        'install.k8s.title': 'Deploy on Kubernetes with Helm',
        'install.k8s.desc': 'For production environments. High availability, auto-scaling and centralized management.',
        'install.k8s.commands': 'Helm Installation',
        'install.k8s.config': 'custom-values.yaml - Helm Configuration',

        'install.standalone.title': 'Standalone Installation (Development)',
        'install.standalone.desc': 'For local development or testing. Backend and frontend launched separately.',
        'install.standalone.commands': 'Manual installation',

        'install.requirements': 'Requirements',

        // CTA Section
        'cta.title': 'Ready to simplify your Ansible playbooks?',
        'cta.subtitle': 'Get started for free today. No credit card required.',
        'cta.btn': 'Launch Automation Factory',

        // Footer
        'footer.desc': 'Visual Ansible playbook creator. Open source and free.',
        'footer.product': 'Product',
        'footer.resources': 'Resources',
        'footer.ansible.docs': 'Ansible Documentation',
        'footer.ansible.galaxy': 'Ansible Galaxy',
        'footer.copyright': '2026 Automation Factory. Developed by Cyril Coupel.',

        // Language switcher
        'lang.fr': 'FR',
        'lang.en': 'EN'
    }
};

// Language Manager
const LanguageManager = {
    currentLang: 'fr',

    init() {
        // Get saved language or detect from browser
        const saved = localStorage.getItem('automation-factory-lang');
        if (saved && translations[saved]) {
            this.currentLang = saved;
        } else {
            // Detect browser language
            const browserLang = navigator.language.split('-')[0];
            this.currentLang = translations[browserLang] ? browserLang : 'fr';
        }

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;

        // Apply translations
        this.applyTranslations();

        // Update language switcher UI
        this.updateSwitcherUI();
    },

    setLanguage(lang) {
        if (!translations[lang]) return;

        this.currentLang = lang;
        localStorage.setItem('automation-factory-lang', lang);
        document.documentElement.lang = lang;

        this.applyTranslations();
        this.updateSwitcherUI();
    },

    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = translations[this.currentLang][key];

            if (translation) {
                // Check if it's an input placeholder
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = translation;
                } else if (el.hasAttribute('data-i18n-attr')) {
                    // For attributes like aria-label
                    const attr = el.getAttribute('data-i18n-attr');
                    el.setAttribute(attr, translation);
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update page title
        const titleKey = 'hero.title';
        if (translations[this.currentLang][titleKey]) {
            document.title = `Automation Factory - ${this.currentLang === 'fr' ? 'Créateur Visuel de Playbooks Ansible' : 'Visual Ansible Playbook Creator'}`;
        }
    },

    updateSwitcherUI() {
        // Update floating language switcher
        const floatingSwitcher = document.querySelector('.floating-lang-switcher');
        if (floatingSwitcher) {
            floatingSwitcher.querySelectorAll('.lang-option').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
            });
        }

        // Also update old style switcher if it exists (backwards compatibility)
        const oldSwitcher = document.querySelector('.lang-switcher');
        if (oldSwitcher) {
            oldSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
            });
        }
    },

    get(key) {
        return translations[this.currentLang][key] || key;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    LanguageManager.init();

    // Add event listeners to floating language options
    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
            LanguageManager.setLanguage(btn.dataset.lang);
        });
    });

    // Backwards compatibility for old style buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            LanguageManager.setLanguage(btn.dataset.lang);
        });
    });
});

// Export for use in other scripts
window.LanguageManager = LanguageManager;
window.translations = translations;

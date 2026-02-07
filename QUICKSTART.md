# Quick Start - Automation Factory Interface

## L'interface est maintenant en ligne ! 🚀

### Accès à l'application

Ouvrez votre navigateur (Chrome, Edge ou Firefox) et accédez à :

**URL locale:** http://localhost:5173

**URL réseau:** http://192.168.1.84:5173

### Architecture de l'Interface

L'interface est divisée en **5 zones principales** :

#### 1. Zone Play (Barre haute 1)
- **Couleur:** Bleu (barre principale)
- **Fonction:** Configuration globale du playbook
- **Champs:**
  - Playbook Name
  - Inventory
  - Ansible Version

#### 2. Zone Vars (Barre haute 2)
- **Fonction:** Gestion des variables du playbook
- **Actions:**
  - Affichage des variables sous forme de chips
  - Ajout de nouvelles variables
  - Suppression de variables

#### 3. Zone Modules (Panneau gauche - 280px)
- **Fonction:** Catalogue des modules Ansible disponibles
- **Contenu:**
  - Recherche de modules
  - Modules organisés par collections (accordion)
  - 3 collections de démonstration :
    - ansible.builtin (copy, file, template, service, package)
    - ansible.posix (firewalld, sysctl, mount)
    - community.general (docker_container, git, npm)
- **Interaction:** Drag & Drop des modules vers la zone de travail

#### 4. Zone de Travail (Centre - flexible)
- **Fonction:** Construction visuelle du playbook
- **Interaction:**
  - Drop zone pour recevoir les modules
  - Affichage des modules en blocs numérotés
  - Suppression de modules
  - Réorganisation (drag & drop)

#### 5. Zone Config (Panneau droit - 320px)
- **Fonction:** Configuration du module sélectionné
- **Contenu:**
  - Formulaire dynamique avec les paramètres du module
  - Exemple pour le module "copy" :
    - src, dest, owner, group, mode, backup

#### 6. Zone System (Barre basse - 200px)
- **Fonction:** Actions et résultats
- **Onglets:**
  - **Preview:** Prévisualisation YAML du playbook
  - **Logs:** Journaux d'activité
  - **Validation:** Résultats de validation
- **Actions:**
  - Bouton "Compile"
  - Bouton "Download YAML"

## Fonctionnalités actuelles

### ✅ Implémentées
- [x] Layout complet avec les 5 zones
- [x] Drag & Drop fonctionnel des modules
- [x] Ajout de modules dans la zone de travail
- [x] Suppression de modules
- [x] Prévisualisation YAML
- [x] Interface responsive
- [x] Données de démonstration

### 🔄 Prochaines étapes
- [ ] Connexion au backend
- [ ] Formulaires dynamiques basés sur les schémas de modules
- [ ] Sélection de module pour configuration
- [ ] Génération YAML réelle
- [ ] Validation avec ansible-lint
- [ ] Sauvegarde/chargement de playbooks
- [ ] Gestion des utilisateurs

## Test de l'Interface

### Test du Drag & Drop
1. Ouvrez http://localhost:5173
2. Dans le panneau gauche, dépliez une collection (ex: ansible.builtin)
3. Cliquez et maintenez sur un module (ex: "copy")
4. Glissez-le vers la zone centrale
5. Relâchez pour ajouter le module au playbook
6. Le module apparaît comme un bloc numéroté

### Test de la Suppression
- Cliquez sur l'icône 🗑️ d'un module pour le supprimer

### Test des Onglets System
- En bas, cliquez sur les onglets "Preview", "Logs", "Validation"
- Preview montre le YAML généré
- Logs affiche les actions
- Validation montre les résultats de validation

## Arrêter le Serveur

Pour arrêter le serveur de développement :
```bash
# Trouvez le processus
ps aux | grep vite

# Ou depuis VSCode, arrêtez le processus en cours
Ctrl+C dans le terminal où le serveur tourne
```

## Relancer le Serveur

```bash
cd frontend
npm run dev
```

## Compatibilité Navigateurs

Testé et compatible avec :
- ✅ Google Chrome (recommandé)
- ✅ Microsoft Edge
- ✅ Mozilla Firefox
- ✅ Safari

## Support

L'interface utilise Material-UI pour un rendu cohérent sur tous les navigateurs modernes.

---

**Prochaine étape :** Valider le design et l'ergonomie, puis connecter au backend pour des données réelles.

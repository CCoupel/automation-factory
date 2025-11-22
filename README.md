# Ansible Builder

Constructeur graphique de playbooks Ansible en mode SaaS.

## Description

Ansible Builder est une application web qui permet de construire des playbooks Ansible de manière visuelle via un système de drag & drop. L'application collecte les modules disponibles depuis Ansible Galaxy et permet de les assembler graphiquement pour générer des playbooks YAML valides.

## Stack Technique

### Backend
- **FastAPI** (Python 3.11+)
- **PostgreSQL** avec SQLAlchemy (async)
- **Redis** (cache & sessions)
- **Ansible Runner** & PyYAML

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Material-UI** (composants UI)
- **@dnd-kit** (drag & drop)
- **Zustand** (state management)

### Infrastructure
- **Docker** & **Docker Compose**
- **Kubernetes** (production)
- **Nginx** (reverse proxy)

## Architecture de l'Interface

```
┌─────────────────────────────────────────────┐
│  Zone Play (Playbook metadata)              │
├─────────────────────────────────────────────┤
│  Zone Vars (Variables)                      │
├──────────┬────────────────────┬─────────────┤
│  Zone    │  Zone de Travail   │  Zone       │
│  Modules │  (Drag & Drop)     │  Config     │
│          │                    │             │
├──────────┴────────────────────┴─────────────┤
│  Zone System (Download, Logs, Compilation)  │
└─────────────────────────────────────────────┘
```

## Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Node.js 20+ (pour développement frontend local)
- Python 3.11+ (pour développement backend local)

### Développement Local avec Docker Compose

```bash
# Cloner le repository
git clone <repo-url>
cd ansible-builder

# Copier les fichiers d'environnement
cp backend/.env.example backend/.env

# Démarrer tous les services
docker-compose up -d

# Vérifier que les services sont en ligne
docker-compose ps
```

**Services disponibles:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Développement Local (sans Docker)

#### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer .env
cp .env.example .env

# Démarrer PostgreSQL et Redis (via Docker)
docker-compose up -d postgresql redis

# Lancer le serveur
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Déploiement Kubernetes

### Prérequis
- Cluster Kubernetes configuré
- kubectl installé et configuré
- Ingress Controller (nginx) installé

### Déploiement

```bash
# Créer le namespace
kubectl apply -f k8s/namespace.yaml

# Déployer PostgreSQL
kubectl apply -f k8s/postgresql/

# Déployer Redis
kubectl apply -f k8s/redis/

# Construire et pousser les images Docker
docker build -t your-registry/ansible-builder-backend:latest ./backend
docker build -t your-registry/ansible-builder-frontend:latest ./frontend
docker push your-registry/ansible-builder-backend:latest
docker push your-registry/ansible-builder-frontend:latest

# Mettre à jour les images dans les manifestes
# Puis déployer backend et frontend
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# Vérifier le déploiement
kubectl get pods -n ansible-builder
kubectl get svc -n ansible-builder
kubectl get ingress -n ansible-builder
```

### Configuration DNS

Pointer votre domaine vers l'IP de l'Ingress:
```bash
kubectl get ingress -n ansible-builder
```

Mettre à jour `k8s/frontend/frontend-ingress.yaml` avec votre domaine.

## Structure du Projet

```
ansible-builder/
├── backend/
│   ├── app/
│   │   ├── api/          # Routes FastAPI
│   │   ├── models/       # Modèles SQLAlchemy
│   │   ├── services/     # Logique métier
│   │   ├── core/         # Configuration
│   │   └── main.py       # Point d'entrée
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API calls
│   │   ├── types/        # TypeScript types
│   │   └── main.tsx      # Point d'entrée
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── k8s/                  # Manifestes Kubernetes
│   ├── backend/
│   ├── frontend/
│   ├── postgresql/
│   └── redis/
├── docker-compose.yml
├── CLAUDE.md            # Documentation globale (vue d'ensemble)
├── frontend/
│   ├── CLAUDE_FRONTEND.md  # Documentation frontend détaillée
│   └── docs/            # Analyses et guides d'optimisation
└── backend/
    └── CLAUDE_BACKEND.md   # Documentation backend détaillée
```

## Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run test
```

## Linting & Formatting

### Backend
```bash
cd backend
black .
ruff check .
```

### Frontend
```bash
cd frontend
npm run lint
```

## 📚 Documentation

La documentation du projet est organisée en plusieurs fichiers pour faciliter la navigation :

### 🌐 [CLAUDE.md](./CLAUDE.md) - Vue d'ensemble globale (321 lignes)
- Description du projet et architecture de l'interface
- Décisions architecturales et stack technique
- State management et déploiement
- Résumé des refactorings réalisés (~1,854 lignes économisées)

### 💻 [frontend/CLAUDE_FRONTEND.md](./frontend/CLAUDE_FRONTEND.md) - Documentation frontend (1,619 lignes)
- Architecture des Blocks (3 sections: Tasks, Rescue, Always)
- Système de Drag & Drop et Liens
- Patterns à respecter et pièges à éviter
- Guide de refactoring et composants réutilisables
- Liste complète des fonctionnalités implémentées

### 🖥️ [backend/CLAUDE_BACKEND.md](./backend/CLAUDE_BACKEND.md) - Documentation backend (524 lignes)
- Stack technique et architecture de données
- API Endpoints et services
- Sécurité, performance et tests
- Guide de déploiement

### 📊 [frontend/docs/](./frontend/docs/) - Analyses d'optimisation (698 lignes)
- [README_OPTIMISATION.md](./frontend/docs/README_OPTIMISATION.md) - Point d'entrée
- [ANALYSE_OPTIMISATION_CODE.md](./frontend/docs/ANALYSE_OPTIMISATION_CODE.md) - Analyse détaillée
- [EXEMPLES_REFACTORING.txt](./frontend/docs/EXEMPLES_REFACTORING.txt) - Exemples de code
- [CHECKLIST_REFACTORING.txt](./frontend/docs/CHECKLIST_REFACTORING.txt) - Guide d'implémentation

---

## Contribution

Consulter la documentation appropriée selon le domaine :
- **Frontend :** [frontend/CLAUDE_FRONTEND.md](./frontend/CLAUDE_FRONTEND.md)
- **Backend :** [backend/CLAUDE_BACKEND.md](./backend/CLAUDE_BACKEND.md)
- **Vue d'ensemble :** [CLAUDE.md](./CLAUDE.md)

## Licence

MIT

## Support

Pour toute question ou problème, ouvrir une issue sur le repository.

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
├── CLAUDE.md            # Documentation pour Claude AI
└── README.md
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

## Contribution

Consulter [CLAUDE.md](CLAUDE.md) pour les décisions architecturales, patterns à respecter et pièges à éviter.

## Licence

MIT

## Support

Pour toute question ou problème, ouvrir une issue sur le repository.

# Implémentation Frontend - Ansible Builder

Ce document décrit les détails techniques et l'implémentation concrète du frontend React/TypeScript.

---

## 🏗️ **Architecture Frontend**

### Stack Technique
- **Framework :** React 18.3.1 avec TypeScript
- **Build Tool :** Vite 5.4.8
- **UI Framework :** Material-UI (MUI) 6.1.3
- **Routing :** React Router DOM 6.30.2
- **State Management :** React Context + Hooks + Zustand 5.0.0
- **HTTP Client :** Axios 1.7.7
- **Drag & Drop :** @dnd-kit (core, sortable, utilities)

### Structure du Projet
```
frontend/
├── src/
│   ├── main.tsx                   # Point d'entrée React
│   ├── App.tsx                    # Composant racine + routing
│   ├── main-cached.tsx            # Version avec cache Galaxy
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Layout principal redimensionnable
│   │   │   └── AppHeader.tsx      # Header avec auth et versions
│   │   ├── zones/
│   │   │   ├── WorkZone.tsx       # Zone centrale playbook
│   │   │   ├── ModulesZoneCached.tsx # Zone modules Galaxy
│   │   │   ├── VarsZone.tsx       # Zone variables
│   │   │   ├── ConfigZone.tsx     # Zone configuration
│   │   │   └── SystemZone.tsx     # Zone preview/logs
│   │   ├── dialogs/
│   │   │   ├── PlaybookManagerDialog.tsx # Gestion playbooks
│   │   │   └── AddVariableDialog.tsx # Ajout variables
│   │   └── common/
│   │       ├── TaskAttributeIcons.tsx # Icônes attributs
│   │       └── SectionLinks.tsx   # Liens sections
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Authentification globale
│   │   ├── ThemeContext.tsx       # Thème dark/light
│   │   ├── AnsibleVersionContext.tsx # Version Ansible
│   │   └── GalaxyCacheContext.tsx # Cache Galaxy
│   ├── services/
│   │   ├── playbookService.ts     # Service playbooks
│   │   ├── galaxyService.ts       # Service Galaxy API
│   │   ├── galaxySmartService.ts  # Service Galaxy SMART
│   │   └── userPreferencesService.ts # Favoris utilisateur
│   ├── utils/
│   │   ├── httpClient.ts          # Client HTTP configuré
│   │   ├── apiConfig.ts           # Configuration URLs
│   │   └── versionUtils.ts        # Utilitaires versions
│   ├── types/
│   │   ├── playbook.ts            # Types playbook
│   │   ├── galaxy.ts              # Types Galaxy
│   │   └── user.ts                # Types utilisateur
│   └── pages/
│       ├── LoginPage.tsx          # Page connexion
│       ├── ConfigurationPage.tsx  # Page config admin
│       └── AccountsManagementPage.tsx # Gestion comptes
├── public/
│   └── vite.svg
├── package.json                   # Dépendances et scripts
├── tsconfig.json                  # Configuration TypeScript
├── vite.config.ts                 # Configuration Vite
├── nginx.conf                     # Configuration nginx
├── docker-entrypoint.sh          # Script démarrage container
└── Dockerfile                    # Image Docker multi-stage
```

---

## 🚀 **Point d'Entrée : main.tsx**

### Configuration React
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { AnsibleVersionProvider } from './contexts/AnsibleVersionContext'
import { GalaxyCacheProvider } from './contexts/GalaxyCacheContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AnsibleVersionProvider>
            <GalaxyCacheProvider>
              <App />
            </GalaxyCacheProvider>
          </AnsibleVersionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
```

### Routing Application
```typescript
// App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AccountsManagementPage from './pages/AccountsManagementPage'
import ConfigurationPage from './pages/ConfigurationPage'
import VersionEndpoint from './components/VersionEndpoint'

function App() {
  return (
    <Routes>
      {/* Main workspace */}
      <Route path="/" element={<MainLayout />} />

      {/* Version endpoint for nginx */}
      <Route path="/version" element={<VersionEndpoint />} />

      {/* Admin pages */}
      <Route path="/admin/accounts" element={<AccountsManagementPage />} />
      <Route path="/admin/configuration" element={<ConfigurationPage />} />

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

---

## 🎨 **Layout Principal : MainLayout.tsx**

### Zone Redimensionnable
```typescript
interface MainLayoutState {
  systemZoneHeight: number
  modulesZoneWidth: number  
  configZoneWidth: number
  isModulesCollapsed: boolean
  isConfigCollapsed: boolean
  isSystemCollapsed: boolean
  isVarsCollapsed: boolean
}

const MainLayout = () => {
  const [systemZoneHeight, setSystemZoneHeight] = useState(200)
  const [modulesZoneWidth, setModulesZoneWidth] = useState(280)
  const [configZoneWidth, setConfigZoneWidth] = useState(320)
  
  // Gestion redimensionnement souris
  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSystem) {
      const newHeight = window.innerHeight - e.clientY
      if (newHeight >= 100 && newHeight <= 600) {
        setSystemZoneHeight(newHeight)
      }
    } else if (isResizingModules) {
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) {
        setModulesZoneWidth(newWidth)
      }
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header fixe */}
      <AppHeader 
        saveStatus={saveStatus} 
        playbookName={playbookName}
        onOpenPlaybookManager={() => setPlaybookManagerOpen(true)}
      />

      {/* Zone Variables collapsible */}
      {!isVarsCollapsed && (
        <VarsZone height={120} onCollapse={() => setIsVarsCollapsed(true)} />
      )}

      {/* Layout principal 3 colonnes */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Zone Modules gauche */}
        {!isModulesCollapsed && (
          <ModulesZoneCached 
            width={modulesZoneWidth}
            onCollapse={() => setIsModulesCollapsed(true)}
          />
        )}

        {/* Zone centrale WorkZone */}
        <WorkZone flex={1} />

        {/* Zone Config droite */}
        {!isConfigCollapsed && (
          <ConfigZone 
            width={configZoneWidth}
            onCollapse={() => setIsConfigCollapsed(true)}
          />
        )}
      </Box>

      {/* Zone System bas */}
      {!isSystemCollapsed && (
        <SystemZone 
          height={systemZoneHeight}
          onCollapse={() => setIsSystemCollapsed(true)}
        />
      )}
    </Box>
  )
}
```

---

## 🔐 **Context d'Authentification**

### AuthContext Implementation
```typescript
// contexts/AuthContext.tsx
interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  authLost: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Vérification token au démarrage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const http = getHttpClient()
          const response = await http.get('/auth/me')
          setUser(response.data)
        } catch (error) {
          localStorage.removeItem('access_token')
        }
      }
      setIsLoading(false)
    }
    
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', { email, password })
    const { access_token } = response.data
    
    localStorage.setItem('access_token', access_token)
    
    // Récupérer profil utilisateur
    const userResponse = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    
    setUser(userResponse.data)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    window.location.href = '/login'
  }

  // Écouter événements de perte d'authentification
  useEffect(() => {
    const handleAuthLost = () => logout()
    window.addEventListener('authLost', handleAuthLost)
    return () => window.removeEventListener('authLost', handleAuthLost)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, authLost: logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## 🌌 **Galaxy Cache Context**

### Cache Multi-niveaux
```typescript
// contexts/GalaxyCacheContext.tsx
interface GalaxyCacheContextType {
  popularNamespaces: Namespace[]
  allNamespaces: Namespace[]
  isLoading: boolean
  isReady: boolean
  error: string | null
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error' | 'refreshing'
  lastSync: Date | null
  refreshCache: () => void
  enrichNamespaceOnDemand: (namespace: string) => Promise<Namespace | null>
  getCollections: (namespace: string) => Promise<Collection[] | null>
  getModules: (namespace: string, collection: string, version: string) => Promise<Module[] | null>
}

export const GalaxyCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [popularNamespaces, setPopularNamespaces] = useState<Namespace[]>([])
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Initialisation cache au démarrage
  useEffect(() => {
    const initializeCache = async () => {
      try {
        setSyncStatus('syncing')
        setIsLoading(true)
        
        // Charger données initiales
        const smartService = new GalaxySmartService()
        const response = await smartService.getNamespacesWithStatus()
        
        setPopularNamespaces(response.popular || [])
        setAllNamespaces(response.all || [])
        setSyncStatus('completed')
        
      } catch (error) {
        console.error('Failed to initialize Galaxy cache:', error)
        setError('Failed to load Galaxy data')
        setSyncStatus('error')
      } finally {
        setIsLoading(false)
        setIsReady(true)
        setLastSync(new Date())
      }
    }

    initializeCache()
  }, [])

  const enrichNamespaceOnDemand = async (namespace: string): Promise<Namespace | null> => {
    try {
      const smartService = new GalaxySmartService()
      const enriched = await smartService.enrichNamespace(namespace)
      
      // Mettre à jour les listes
      setPopularNamespaces(prev => 
        prev.map(ns => ns.name === namespace ? { ...ns, ...enriched } : ns)
      )
      setAllNamespaces(prev => 
        prev.map(ns => ns.name === namespace ? { ...ns, ...enriched } : ns)
      )
      
      return enriched
    } catch (error) {
      console.error(`Failed to enrich namespace ${namespace}:`, error)
      return null
    }
  }

  const refreshCache = () => {
    setSyncStatus('refreshing')
    // Recharger données depuis backend
    window.location.reload()
  }

  return (
    <GalaxyCacheContext.Provider value={{
      popularNamespaces,
      allNamespaces,
      isLoading,
      isReady,
      error,
      syncStatus,
      lastSync,
      refreshCache,
      enrichNamespaceOnDemand,
      getCollections,
      getModules
    }}>
      {children}
    </GalaxyCacheContext.Provider>
  )
}
```

---

## 🛠️ **Services Frontend**

### HTTP Client Configuré
```typescript
// utils/httpClient.ts
import axios, { AxiosInstance } from 'axios'
import { getApiBaseUrl } from './apiConfig'

let httpClient: AxiosInstance | null = null

const createHttpClient = (): AxiosInstance => {
  const baseURL = getApiBaseUrl()
  
  const client = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    }
  })

  // Auto-injection JWT token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Gestion erreurs authentification
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expiré - déclencher déconnexion
        window.dispatchEvent(new CustomEvent('authLost', { 
          detail: { reason: 'token_expired', url: error.config?.url } 
        }))
      }
      return Promise.reject(error)
    }
  )

  return client
}

export const getHttpClient = (): AxiosInstance => {
  if (!httpClient) {
    httpClient = createHttpClient()
  }
  return httpClient
}
```

### Configuration URLs Dynamique
```typescript
// utils/apiConfig.ts
export function getApiBaseUrl(): string {
  // Runtime-injected API URL (docker-entrypoint.sh)
  const apiUrl = (window as any).__API_URL__
  if (apiUrl) {
    return apiUrl
  }
  
  // Développement local
  if (window.location.hostname === 'localhost' || window.location.hostname === '192.168.1.217') {
    const isNginxProxy = window.location.port === '' || window.location.port === '80'
    
    if (isNginxProxy) {
      return '/api'  // Nginx reverse proxy
    } else {
      return 'http://localhost:8000/api'  // Direct backend
    }
  }
  
  // Production
  return './api'
}

export function getFrontendBaseUrl(): string {
  const basePath = (window as any).__BASE_PATH__
  if (basePath && basePath !== '/') {
    return basePath
  }
  
  return window.location.origin + window.location.pathname.replace(/\/$/, '')
}
```

---

## 📚 **Service Playbooks**

### Gestion State Playbook
```typescript
// services/playbookService.ts
export interface PlaybookContent {
  version: string
  inventory: string
  plays: Play[]
}

export interface Play {
  id: string
  name: string
  hosts: string
  variables: PlayVariable[]
  pre_tasks: ModuleBlock[]
  tasks: ModuleBlock[]
  post_tasks: ModuleBlock[]
  handlers: ModuleBlock[]
}

class PlaybookService {
  private currentPlaybook: PlaybookContent | null = null
  private isDirty = false
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeDefaultPlaybook()
    this.startAutoSave()
  }

  private initializeDefaultPlaybook() {
    this.currentPlaybook = {
      version: '1.0.0',
      inventory: 'hosts',
      plays: [{
        id: this.generateId(),
        name: 'Default Play',
        hosts: 'all',
        variables: [],
        pre_tasks: [],
        tasks: [],
        post_tasks: [],
        handlers: []
      }]
    }
  }

  addModule(playId: string, section: string, module: ModuleBlock): void {
    if (!this.currentPlaybook) return

    const play = this.currentPlaybook.plays.find(p => p.id === playId)
    if (play && section in play) {
      (play as any)[section].push({
        ...module,
        id: this.generateId()
      })
      this.markDirty()
    }
  }

  updateModule(moduleId: string, updates: Partial<ModuleBlock>): void {
    if (!this.currentPlaybook) return

    for (const play of this.currentPlaybook.plays) {
      for (const section of ['pre_tasks', 'tasks', 'post_tasks', 'handlers']) {
        const modules = (play as any)[section] as ModuleBlock[]
        const moduleIndex = modules.findIndex(m => m.id === moduleId)
        
        if (moduleIndex !== -1) {
          modules[moduleIndex] = { ...modules[moduleIndex], ...updates }
          this.markDirty()
          return
        }
      }
    }
  }

  private startAutoSave() {
    this.autoSaveInterval = setInterval(async () => {
      if (this.isDirty && this.currentPlaybook) {
        await this.savePlaybook()
      }
    }, 5000) // Auto-save toutes les 5 secondes
  }

  private async savePlaybook(): Promise<void> {
    if (!this.currentPlaybook) return

    try {
      const http = getHttpClient()
      
      if (this.currentPlaybookId) {
        // Mise à jour
        await http.put(`/playbooks/${this.currentPlaybookId}`, {
          name: this.currentPlaybookName,
          content: this.currentPlaybook
        })
      } else {
        // Création
        const response = await http.post('/playbooks', {
          name: this.currentPlaybookName,
          content: this.currentPlaybook
        })
        this.currentPlaybookId = response.data.id
      }

      this.isDirty = false
      this.onSaveStatusChange?.('saved', this.currentPlaybookName)
      
    } catch (error) {
      console.error('Failed to save playbook:', error)
      this.onSaveStatusChange?.('error', this.currentPlaybookName)
    }
  }
}

export const playbookService = new PlaybookService()
```

---

## 🎛️ **Zone Modules avec Galaxy**

### ModulesZoneCached Implementation
```typescript
// components/zones/ModulesZoneCached.tsx
const ModulesZoneCached = ({ onCollapse }: ModulesZoneCachedProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Galaxy cache context
  const {
    popularNamespaces,
    allNamespaces,
    isLoading: cacheLoading,
    isReady: cacheReady,
    enrichNamespaceOnDemand,
    getCollections,
    getModules
  } = useGalaxyCache()
  
  // Favoris utilisateur
  const [favorites, setFavorites] = useState<string[]>([])
  const [standardNamespaces, setStandardNamespaces] = useState<string[]>(['community'])
  
  // Chargement namespaces standards depuis configuration admin
  useEffect(() => {
    const loadStandardNamespaces = async () => {
      try {
        const response = await fetch('./api/admin/configuration/standard-namespaces', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.namespaces) {
            setStandardNamespaces(data.namespaces)
          }
        }
      } catch (error) {
        console.error('Failed to load standard namespaces:', error)
      }
    }
    
    loadStandardNamespaces()
  }, [])

  // Navigation vers collections avec enrichissement
  const navigateToCollections = async (namespace: string) => {
    const selectedNamespace = [...popularNamespaces, ...allNamespaces]
      .find(ns => ns.name === namespace)
    
    // Enrichissement on-demand si nécessaire
    if (selectedNamespace && selectedNamespace.collection_count === 0) {
      await enrichNamespaceOnDemand(namespace)
    }
    
    setNavigationState({ level: 'collections', namespace })
  }

  // Gestion favoris
  const handleToggleFavorite = async (namespace: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const wasFavorite = favorites.includes(namespace)
    
    try {
      if (wasFavorite) {
        await removeFavorite('namespace', namespace)
        setFavorites(prev => prev.filter(fav => fav !== namespace))
      } else {
        await addFavorite('namespace', namespace)
        setFavorites(prev => [...prev, namespace])
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header avec onglets */}
      <Box sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Generic" />
          <Tab label="Modules" />
        </Tabs>
        
        <TextField
          fullWidth
          size="small"
          placeholder={activeTab === 0 ? "Search generic..." : "Search modules..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon />
          }}
        />
      </Box>

      {/* Contenu selon onglet */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 ? (
          // Onglet Generic
          <List dense>
            {genericElements.map((element, index) => (
              <NamespaceListItem
                key={index}
                element={element}
                onDrag={(dragData) => console.log('Drag:', dragData)}
              />
            ))}
          </List>
        ) : (
          // Onglet Modules avec navigation Galaxy
          <GalaxyNavigator
            navigationState={navigationState}
            onNavigate={navigateToCollections}
            onToggleFavorite={handleToggleFavorite}
            favorites={favorites}
            standardNamespaces={standardNamespaces}
          />
        )}
      </Box>
    </Box>
  )
}
```

---

## 🎨 **Thème et Design System**

### Theme Context
```typescript
// contexts/ThemeContext.tsx
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
})

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false)
  
  const toggleDarkMode = () => setDarkMode(prev => !prev)
  
  return (
    <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
        {children}
      </ThemeContext.Provider>
    </MuiThemeProvider>
  )
}
```

---

## 🧪 **Tests Frontend**

### Test Structure
```typescript
// tests/components/AppHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import AppHeader from '../../components/layout/AppHeader'

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('AppHeader', () => {
  test('displays user menu when authenticated', async () => {
    renderWithProviders(
      <AppHeader 
        saveStatus="saved" 
        playbookName="Test Playbook"
        onOpenPlaybookManager={() => {}}
      />
    )
    
    // Vérifier présence avatar utilisateur
    const userAvatar = screen.getByRole('button', { name: /user menu/i })
    expect(userAvatar).toBeInTheDocument()
    
    // Ouvrir menu
    fireEvent.click(userAvatar)
    
    // Vérifier entrées menu
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Change Password')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  test('shows configuration menu for admin users', async () => {
    // Mock admin user
    const mockUser = { 
      id: '1', 
      email: 'admin@test.com', 
      username: 'admin',
      role: 'admin',
      isActive: true 
    }
    
    renderWithProviders(<AppHeader {...props} />)
    
    const userAvatar = screen.getByRole('button', { name: /user menu/i })
    fireEvent.click(userAvatar)
    
    // Vérifier entrée Configuration pour admin
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })
})
```

### Test Utilitaires
```typescript
// tests/utils/testUtils.tsx
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { AuthProvider } from '../../contexts/AuthContext'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

---

## 🚀 **Build et Déploiement**

### Configuration Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material'],
          router: ['react-router-dom'],
          http: ['axios'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true
      }
    }
  }
})
```

### Dockerfile Multi-stage
```dockerfile
# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Build app
COPY . .
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine

# Permissions
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    && chown -R 1000:1000 /var/cache/nginx /var/run /etc/nginx /usr/share/nginx/html \
    && chmod -R 755 /var/cache/nginx \
    && chmod -R 777 /var/run

# Copy build files
COPY --from=build /app/dist /usr/share/nginx/html

# Configuration nginx
COPY nginx.conf /tmp/nginx.conf.template
COPY package.json /tmp/package.json

# Inject version from package.json
RUN FRONTEND_VERSION=$(cat /tmp/package.json | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/') && \
    sed "s/{{FRONTEND_VERSION}}/$FRONTEND_VERSION/g" /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /tmp/nginx.conf.template /tmp/package.json

# Entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER 1000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### Entrypoint Script
```bash
#!/bin/sh
# docker-entrypoint.sh

# Configuration runtime injection
cat > /usr/share/nginx/html/config.js << EOF
window.__API_URL__ = '${API_URL:-/api}';
window.__BASE_PATH__ = '${BASE_PATH:-/}';
window.__FRONTEND_VERSION__ = '${FRONTEND_VERSION}';
EOF

# Inject config in HTML
sed -i 's|<head>|<head>\n  <script src="/config.js"></script>|' /usr/share/nginx/html/index.html

# Start nginx
exec "$@"
```

---

## 📊 **Performance et Optimisations**

### Lazy Loading Components
```typescript
// Lazy loading pour pages admin
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'))
const AccountsManagementPage = lazy(() => import('./pages/AccountsManagementPage'))

// Usage avec Suspense
<Suspense fallback={<CircularProgress />}>
  <Routes>
    <Route path="/admin/configuration" element={<ConfigurationPage />} />
    <Route path="/admin/accounts" element={<AccountsManagementPage />} />
  </Routes>
</Suspense>
```

### Optimisation Renders
```typescript
// Memoization composants lourds
const ModuleListItem = memo(({ module, onSelect }: ModuleListItemProps) => {
  return (
    <ListItem button onClick={() => onSelect(module)}>
      <ListItemText primary={module.name} secondary={module.description} />
    </ListItem>
  )
})

// Callbacks memoizés
const PlaybookEditor = () => {
  const handleModuleAdd = useCallback((module: ModuleBlock) => {
    playbookService.addModule(currentPlayId, 'tasks', module)
  }, [currentPlayId])

  const handleModuleUpdate = useCallback((moduleId: string, updates: Partial<ModuleBlock>) => {
    playbookService.updateModule(moduleId, updates)
  }, [])

  return <WorkZone onModuleAdd={handleModuleAdd} onModuleUpdate={handleModuleUpdate} />
}
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-12*

*Voir aussi :*
- [Spécifications Frontend](FRONTEND_SPECS.md)
- [Backend Implementation](../backend/BACKEND_IMPLEMENTATION.md)
- [Galaxy Integration](../backend/GALAXY_INTEGRATION.md)
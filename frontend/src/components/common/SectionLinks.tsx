import React from 'react'
import { ModuleBlock, Link, PlaySectionName, BlockSectionName } from '../../types/playbook'

/**
 * Props pour le composant SectionLinks
 */
interface SectionLinksProps {
  /**
   * Liste de tous les liens
   */
  links: Link[]

  /**
   * Liste de tous les modules (pour retrouver source et destination)
   */
  modules: ModuleBlock[]

  /**
   * Type de section : 'play' pour sections PLAY, 'block' pour sections de blocks
   */
  sectionType: 'play' | 'block'

  /**
   * Nom de la section (pour filtrer les liens appropriés)
   */
  sectionName: PlaySectionName | BlockSectionName

  /**
   * ID du parent (pour sections de blocks uniquement)
   */
  parentId?: string

  /**
   * Fonction pour obtenir le style d'un lien selon son type
   */
  getLinkStyle: (type: string) => {
    stroke: string
    strokeWidth?: string
    strokeDasharray?: string
    label?: string
  }

  /**
   * Fonction pour supprimer un lien
   */
  deleteLink: (linkId: string) => void

  /**
   * ID du lien actuellement survolé (pour afficher le bouton de suppression)
   */
  hoveredLinkId: string | null

  /**
   * Fonction pour définir le lien survolé
   */
  setHoveredLinkId: (linkId: string | null) => void

  /**
   * Fonction pour obtenir les modules (incluant les virtuels comme START)
   */
  getModuleOrVirtual: (id: string) => ModuleBlock | undefined

  /**
   * Dimensions du module (pour calcul des points de connexion)
   */
  getModuleDimensions: (module: ModuleBlock) => { width: number; height: number }
}

/**
 * Composant réutilisable pour le rendu des liens SVG dans une section
 *
 * Ce composant rend un SVG positionné relativement dans sa section parente,
 * avec des liens calculés en coordonnées relatives (module.x, module.y).
 *
 * Avantages de cette approche:
 * - Clipping naturel via overflow: auto de la section
 * - Pas de calcul de coordonnées absolues avec getBoundingClientRect
 * - Pas de gestion manuelle du scroll
 * - Chaque section gère ses propres liens
 */
const SectionLinks: React.FC<SectionLinksProps> = ({
  links,
  modules,
  sectionType,
  sectionName,
  parentId,
  getLinkStyle,
  deleteLink,
  hoveredLinkId,
  setHoveredLinkId,
  getModuleOrVirtual,
  getModuleDimensions
}) => {
  /**
   * Vérifie si un module appartient à la section courante
   */
  const isModuleInCurrentSection = (module: ModuleBlock): boolean => {
    if (sectionType === 'play') {
      // Pour sections PLAY : vérifier que le module est dans la section et n'a pas de parentId
      return module.parentSection === sectionName && !module.parentId
    } else {
      // Pour sections de blocks : vérifier que le module a le bon parentId et la bonne section
      return module.parentId === parentId && module.parentSection === sectionName
    }
  }

  /**
   * Calcule le point de connexion d'un module (centre des bords)
   * Coordonnées relatives à la section (utilise module.x et module.y directement)
   */
  const getConnectionPoint = (module: ModuleBlock, toModule: ModuleBlock): { from: { x: number; y: number }; to: { x: number; y: number } } => {
    const fromDims = getModuleDimensions(module)
    const toDims = getModuleDimensions(toModule)

    // Coordonnées du centre de chaque module
    const fromCenterX = module.x + fromDims.width / 2
    const fromCenterY = module.y + fromDims.height / 2
    const toCenterX = toModule.x + toDims.width / 2
    const toCenterY = toModule.y + toDims.height / 2

    // Calculer l'angle entre les deux modules
    const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX)

    // Point de départ : bord du module source dans la direction du module destination
    let fromX = fromCenterX
    let fromY = fromCenterY

    // Déterminer quel bord utiliser selon l'angle
    const absAngle = Math.abs(angle)
    if (absAngle < Math.PI / 4) {
      // Droite
      fromX = module.x + fromDims.width
      fromY = fromCenterY
    } else if (absAngle > (3 * Math.PI) / 4) {
      // Gauche
      fromX = module.x
      fromY = fromCenterY
    } else if (angle > 0) {
      // Bas
      fromX = fromCenterX
      fromY = module.y + fromDims.height
    } else {
      // Haut
      fromX = fromCenterX
      fromY = module.y
    }

    // Point d'arrivée : bord du module destination opposé au module source
    let toX = toCenterX
    let toY = toCenterY

    const reverseAngle = angle + Math.PI
    const absReverseAngle = Math.abs(reverseAngle)
    if (absReverseAngle < Math.PI / 4) {
      // Droite
      toX = toModule.x + toDims.width
      toY = toCenterY
    } else if (absReverseAngle > (3 * Math.PI) / 4) {
      // Gauche
      toX = toModule.x
      toY = toCenterY
    } else if (reverseAngle > 0) {
      // Bas
      toX = toCenterX
      toY = toModule.y + toDims.height
    } else {
      // Haut
      toX = toCenterX
      toY = toModule.y
    }

    return {
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    }
  }

  /**
   * Filtre les liens pour ne garder que ceux de la section courante
   */
  const sectionLinks = links.filter(link => {
    const fromModule = getModuleOrVirtual(link.from)
    const toModule = getModuleOrVirtual(link.to)

    if (!fromModule || !toModule) return false

    // Les deux modules doivent être dans la section courante
    return isModuleInCurrentSection(fromModule) && isModuleInCurrentSection(toModule)
  })

  // Si aucun lien dans cette section, ne pas rendre de SVG
  if (sectionLinks.length === 0) {
    return null
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      {sectionLinks.map((link) => {
        const fromModule = getModuleOrVirtual(link.from)!
        const toModule = getModuleOrVirtual(link.to)!

        const connectionPoints = getConnectionPoint(fromModule, toModule)

        const x1 = connectionPoints.from.x
        const y1 = connectionPoints.from.y
        const x2 = connectionPoints.to.x
        const y2 = connectionPoints.to.y

        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2

        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
        const style = getLinkStyle(link.type)

        return (
          <g key={link.id} style={{ pointerEvents: 'all' }}>
            {/* Point de connexion source */}
            <circle
              cx={x1}
              cy={y1}
              r="4"
              fill={style.stroke}
              stroke="white"
              strokeWidth="1.5"
            />
            {/* Ligne */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth || '2'}
              strokeDasharray={style.strokeDasharray}
            />
            {/* Point de connexion destination */}
            <circle
              cx={x2}
              cy={y2}
              r="4"
              fill={style.stroke}
              stroke="white"
              strokeWidth="1.5"
            />
            {/* Flèche au milieu */}
            <polygon
              points="0,-4 8,0 0,4"
              fill={style.stroke}
              transform={`translate(${midX}, ${midY}) rotate(${angle})`}
            />
            {/* Label du type de lien */}
            {style.label && (
              <text
                x={midX}
                y={midY - 15}
                textAnchor="middle"
                fill={style.stroke}
                fontSize="10"
                fontWeight="bold"
              >
                {style.label}
              </text>
            )}
            {/* Zone cliquable invisible */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth="20"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredLinkId(link.id)}
              onMouseLeave={() => setHoveredLinkId(null)}
            />
            {/* Bouton de suppression */}
            {hoveredLinkId === link.id && (
              <>
                <circle
                  cx={midX}
                  cy={midY}
                  r="10"
                  fill="white"
                  stroke="#dc004e"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => deleteLink(link.id)}
                  onMouseEnter={() => setHoveredLinkId(link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                />
                <text
                  x={midX}
                  y={midY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#dc004e"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  ×
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default SectionLinks

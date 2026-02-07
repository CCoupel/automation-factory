import { useEffect } from 'react'
import packageJson from '../../package.json'

const VersionEndpoint = () => {
  useEffect(() => {
    const versionData = {
      version: packageJson.version,
      name: packageJson.name,
      environment: "development"
    }
    
    // Return JSON response
    const response = new Response(JSON.stringify(versionData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // This component should never render UI, just return JSON
    document.body.innerHTML = JSON.stringify(versionData, null, 2)
    document.body.style.fontFamily = 'monospace'
    document.body.style.whiteSpace = 'pre'
  }, [])

  return null
}

export default VersionEndpoint
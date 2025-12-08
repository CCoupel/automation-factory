// Frontend version endpoint
// This file will be served statically and will call the backend API

const FRONTEND_VERSION = "1.8.0_1";
const FRONTEND_NAME = "Ansible Builder Frontend";

async function getVersions() {
    try {
        // Get backend version
        const backendResponse = await fetch('/api/version');
        const backendData = await backendResponse.json();
        
        return {
            frontend: {
                version: FRONTEND_VERSION,
                name: FRONTEND_NAME
            },
            backend: backendData,
            environment: "development",
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            frontend: {
                version: FRONTEND_VERSION,
                name: FRONTEND_NAME
            },
            backend: {
                version: "unavailable",
                name: "Backend API",
                error: error.message
            },
            environment: "development",
            timestamp: new Date().toISOString()
        };
    }
}

// If this is called directly (e.g., via fetch), return JSON
if (typeof window === 'undefined') {
    // Server-side or fetch context
    getVersions().then(console.log);
} else {
    // Browser context - expose globally
    window.getVersions = getVersions;
}
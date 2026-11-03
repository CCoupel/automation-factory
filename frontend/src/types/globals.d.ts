// Runtime configuration injected into `window` (see public/config.js / nginx)
interface Window {
  __API_URL__?: string
  __BASE_PATH__?: string
}

# Wave Music

Static Spotify discovery website. Uses Spotify Authorization Code with PKCE; never put a Spotify client secret in browser code.

## Spotify setup
1. Create an app in the Spotify Developer Dashboard and enable the Web API.
2. Set the website URL to the deployed Wave Music URL.
3. Add the exact deployed URL (including trailing slash if present) as a Redirect URI.
4. Copy the Spotify Client ID. In Wave Music click Connect Spotify and paste it.

The redirect URI is the deployed site's origin plus its root path. For local development, serve this directory over localhost and register that exact localhost redirect URI in Spotify.

## Deploy
Serve the repository root as a static site; no build command is required.
// Wave Music — Spotify Authorization Code with PKCE.
// Public browser app: the Spotify Client Secret is intentionally NOT used.
const $ = s => document.querySelector(s);
const clientId = "5535336bb91a4ee49f5ee929cb8a887c";
const redirectUri = "https://wave-music-robotz.onrender.com/";
const statusEl = $("#status");
const resultsEl = $("#results");

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}
async function digest(s) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
}
function errorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data.slice(0, 240) || fallback;
  return data.error_description || data.error?.message || data.message || fallback;
}
async function readResponse(response) {
  const text = await response.text();
  if (!text) return { data: null, raw: "" };
  try { return { data: JSON.parse(text), raw: text }; }
  catch { return { data: null, raw: text }; }
}

async function connect() {
  try {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
    const challenge = b64url(await digest(verifier));
    const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
    sessionStorage.setItem("wave_verifier", verifier);
    sessionStorage.setItem("wave_state", state);

    const p = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state
    });
    window.location.assign("https://accounts.spotify.com/authorize?" + p.toString());
  } catch (e) {
    statusEl.textContent = e.message || "Could not start Spotify login.";
  }
}

async function finishLogin() {
  const params = new URLSearchParams(location.search);
  const error = params.get("error");
  const code = params.get("code");

  if (error) {
    statusEl.textContent = "Spotify login was cancelled or denied.";
    history.replaceState({}, "", redirectUri);
    return;
  }
  if (!code) return;

  const state = params.get("state");
  if (!state || state !== sessionStorage.getItem("wave_state")) {
    throw Error("Spotify login session expired. Please click Connect Spotify again.");
  }

  const verifier = sessionStorage.getItem("wave_verifier");
  if (!verifier) throw Error("Spotify login session expired. Please connect again.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  statusEl.textContent = "Finishing Spotify sign-in…";
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const { data, raw } = await readResponse(response);

  if (!response.ok || !data?.access_token) {
    console.error("Spotify token response:", response.status, raw);
    throw Error(errorMessage(data, raw || "Spotify token request failed."));
  }

  sessionStorage.removeItem("wave_state");
  sessionStorage.setItem("wave_access_token", data.access_token);
  if (data.refresh_token) sessionStorage.setItem("wave_refresh_token", data.refresh_token);
  history.replaceState({}, "", redirectUri);
  statusEl.textContent = "Connected to Spotify. Search for a track or artist.";
  $("#connect").textContent = "Spotify connected ✓";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

async function search(q) {
  const token = sessionStorage.getItem("wave_access_token");
  if (!token) {
    statusEl.textContent = "Connect Spotify first.";
    return;
  }

  statusEl.textContent = "Searching…";
  const response = await fetch(
    "https://api.spotify.com/v1/search?type=track&limit=16&q=" + encodeURIComponent(q),
    { headers: { Authorization: "Bearer " + token } }
  );
  const { data, raw } = await readResponse(response);

  if (response.status === 401) {
    sessionStorage.removeItem("wave_access_token");
    statusEl.textContent = "Spotify session expired. Click Connect Spotify again.";
    $("#connect").textContent = "Connect Spotify";
    return;
  }
  if (!response.ok) {
    statusEl.textContent = errorMessage(data, raw || "Search failed.");
    return;
  }

  const tracks = data?.tracks?.items || [];
  resultsEl.innerHTML = tracks.length
    ? tracks.map(t => {
        const art = t.album?.images?.[0]?.url || "";
        return '<article class="track"><img src="' + esc(art) + '" alt=""><h3>' +
          esc(t.name) + '</h3><p>' +
          esc(t.artists?.map(a => a.name).join(", ") || "") +
          '</p><a href="' + esc(t.external_urls?.spotify || "#") +
          '" target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a></article>';
      }).join("")
    : '<div class="empty">No tracks found. Try another search.</div>';
  statusEl.textContent = tracks.length + " tracks found.";
}

$("#connect").addEventListener("click", connect);
$("#searchForm").addEventListener("submit", e => {
  e.preventDefault();
  const q = $("#query").value.trim();
  if (q) search(q).catch(err => statusEl.textContent = err.message || "Search failed.");
});

finishLogin().then(() => {
  if (sessionStorage.getItem("wave_access_token")) $("#connect").textContent = "Spotify connected ✓";
}).catch(e => {
  statusEl.textContent = e.message || "Spotify sign-in failed.";
});

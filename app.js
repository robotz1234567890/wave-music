// Spotify Authorization Code with PKCE. No client secret is used in this public browser app.
const $ = s => document.querySelector(s);
const redirectUri = location.origin + location.pathname;
const scopes = "user-read-private user-read-email";
let clientId = localStorage.getItem("wave_spotify_client_id") || "";
const statusEl = $("#status"), resultsEl = $("#results");
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function digest(s){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))}
async function connect(){
 if(!clientId){clientId=prompt("Paste your Spotify Client ID (not Client Secret):")?.trim()||"";if(!clientId)return;localStorage.setItem("wave_spotify_client_id",clientId)}
 const verifier=b64url(crypto.getRandomValues(new Uint8Array(64))),challenge=b64url(await digest(verifier));sessionStorage.setItem("wave_verifier",verifier);
 const p=new URLSearchParams({client_id:clientId,response_type:"code",redirect_uri:redirectUri,code_challenge_method:"S256",code_challenge:challenge,scope:scopes});
 location.href="https://accounts.spotify.com/authorize?"+p.toString();
}
async function finishLogin(){
 const params=new URLSearchParams(location.search),code=params.get("code");if(!code)return;
 if(!clientId)throw Error("Client ID missing. Click Connect Spotify again.");
 const verifier=sessionStorage.getItem("wave_verifier");if(!verifier)throw Error("Login session expired. Please connect again.");
 const body=new URLSearchParams({client_id:clientId,grant_type:"authorization_code",code,redirect_uri:redirectUri,code_verifier:verifier});
 const r=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
 const data=await r.json();if(!r.ok)throw Error(data.error_description||"Spotify sign-in failed.");
 sessionStorage.setItem("wave_access_token",data.access_token);if(data.refresh_token)sessionStorage.setItem("wave_refresh_token",data.refresh_token);
 history.replaceState({},"",redirectUri);statusEl.textContent="Connected to Spotify. Search for a track or artist.";$("#connect").textContent="Spotify connected ✓";
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function search(q){
 const token=sessionStorage.getItem("wave_access_token");if(!token){statusEl.textContent="Connect Spotify first.";return}
 statusEl.textContent="Searching…";const r=await fetch("https://api.spotify.com/v1/search?type=track&limit=16&q="+encodeURIComponent(q),{headers:{Authorization:"Bearer "+token}});
 const data=await r.json();if(!r.ok){statusEl.textContent=data.error?.message||"Search failed.";return}
 const tracks=data.tracks?.items||[];resultsEl.innerHTML=tracks.length?tracks.map(t=>{const art=t.album.images?.[0]?.url||"";return '<article class="track"><img src="'+esc(art)+'" alt=""><h3>'+esc(t.name)+'</h3><p>'+esc(t.artists.map(a=>a.name).join(", "))+'</p><a href="'+esc(t.external_urls.spotify)+'" target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a></article>'}).join(""):'<div class="empty">No tracks found. Try another search.</div>';statusEl.textContent=tracks.length+" tracks found.";
}
$("#connect").addEventListener("click",()=>connect().catch(e=>statusEl.textContent=e.message));
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();const q=$("#query").value.trim();if(q)search(q).catch(err=>statusEl.textContent=err.message)});
finishLogin().then(()=>{if(sessionStorage.getItem("wave_access_token"))$("#connect").textContent="Spotify connected ✓"}).catch(e=>statusEl.textContent=e.message);
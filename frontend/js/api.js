// ============================================================
//  ConorFight — Strapi API configuration
//  Single source of truth for the backend URL.
//  Auto-detects environment: local Strapi in dev, production on Vercel.
// ============================================================

// ⚠️ DEPLOYMENT: set this to your live Render backend URL before going live.
const PRODUCTION_API = 'https://conorfight-platform.onrender.com';

const host = window.location.hostname;
const IS_LOCAL = host === 'localhost' || host === '127.0.0.1' || host === '';

// Exported so every module shares one base URL (used for building media URLs).
export const STRAPI_URL = IS_LOCAL ? 'http://localhost:1337' : PRODUCTION_API;
const API_URL = `${STRAPI_URL}/api`;

// How long a cached API response stays "fresh" (ms). Within this window the
// page renders instantly from localStorage with no network call.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cached fetch with stale-while-revalidate + offline fallback:
//  - fresh cache  → return instantly, no network (fast repeat loads)
//  - stale/no cache → fetch, then cache
//  - network fails → serve last cached copy if we have one
export async function cachedFetch(url, ttl = CACHE_TTL) {
    const key = `cf:${url}`;
    let cached = null;
    try {
        const raw = localStorage.getItem(key);
        if (raw) cached = JSON.parse(raw);
    } catch { /* localStorage unavailable / bad JSON */ }

    if (cached && (Date.now() - cached.t) < ttl) {
        return cached.data; // fresh → instant
    }

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* quota */ }
        return data;
    } catch (error) {
        if (cached) return cached.data; // network down → serve stale
        throw error;
    }
}

// Generic fetch wrapper — returns null on failure so callers can fall back.
async function fetchAPI(endpoint, populate = '*') {
    const url = `${API_URL}/${endpoint}?populate=${populate}`;
    try {
        return await cachedFetch(url);
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return null;
    }
}

// Homepage
export async function getHomepage() {
    return await fetchAPI('homepage');
}

// Fight Cards
export async function getFightCards() {
    return await fetchAPI('fight-cards');
}

// Predictions
export async function getPredictions() {
    return await fetchAPI('predictions');
}

// Fighters
export async function getFighters() {
    return await fetchAPI('fighters');
}

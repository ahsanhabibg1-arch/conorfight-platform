// ============================================================
//  ConorFight — Strapi API configuration
//  Single source of truth for the backend URL.
//  Auto-detects environment: local Strapi in dev, production on Vercel.
// ============================================================

// ⚠️ DEPLOYMENT: set this to your live Render backend URL before going live.
const PRODUCTION_API = 'https://api.conorfight.com';

const host = window.location.hostname;
const IS_LOCAL = host === 'localhost' || host === '127.0.0.1' || host === '';

// Exported so every module shares one base URL (used for building media URLs).
export const STRAPI_URL = IS_LOCAL ? 'http://localhost:1337' : PRODUCTION_API;
const API_URL = `${STRAPI_URL}/api`;

// Generic fetch wrapper — returns null on failure so callers can fall back.
async function fetchAPI(endpoint, populate = '*') {
    const url = `${API_URL}/${endpoint}?populate=${populate}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
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

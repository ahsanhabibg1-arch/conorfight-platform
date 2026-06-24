// Strapi API Configuration
const API_URL = 'http://localhost:1337/api';

// Generic fetch function
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
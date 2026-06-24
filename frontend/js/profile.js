import { getFighters, STRAPI_URL } from './api.js';

// Build a full media URL (v5 flattened + v4 nested), optional format.
function mediaUrl(media, prefer = null) {
    if (!media) return null;
    const node = media.data?.attributes ?? media;
    const url = (prefer && node?.formats?.[prefer]?.url) || node?.url || null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
}

function findFighter(list, needle) {
    if (!Array.isArray(list)) return null;
    const q = needle.toLowerCase();
    return list.find(f => {
        const a = f?.attributes ?? f;
        const name = (a?.name ?? '').toLowerCase();
        const slug = (a?.slug ?? '').toLowerCase();
        return name.includes(q) || slug.includes(q);
    }) ?? null;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Each profile page sets <body data-fighter="conor"> or "max".
    const key = document.body.dataset.fighter;
    if (!key) return;

    try {
        const res = await getFighters();
        const fighter = findFighter(res?.data ?? [], key);
        if (!fighter) {
            console.warn(`Fighter "${key}" not found in Strapi.`);
            return;
        }
        const a = fighter.attributes ?? fighter;
        const image = a.Image ?? a.image ?? null;
        const src = mediaUrl(image, 'medium');

        const imgEl = document.getElementById('profile-photo');
        if (imgEl && src) {
            imgEl.src = src;
            imgEl.alt = a.name ?? 'Fighter';
            imgEl.closest('.profile-photo-wrap')?.classList.add('has-img');
        }
    } catch (e) {
        console.warn('Profile image load skipped:', e);
    }
});

import { getHomepage, getFighters } from './api.js';

/* ============================================================
   Helpers
   ============================================================ */

// Pick the first defined/non-null value (for schema typos / field fallbacks)
function pick(...values) {
    for (const v of values) {
        if (v !== undefined && v !== null) return v;
    }
    return undefined;
}

// Safely set text content (no-op if element missing)
function setText(id, value, fallback = '') {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? fallback;
}

// Safely set innerHTML (no-op if element missing)
function setHTML(id, html, fallback = '') {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html || fallback;
}

// Escape user/CMS text before injecting into HTML attributes/cells
function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Render Strapi rich text safely. Handles: null/undefined, plain string,
// and the Strapi blocks structure (paragraph, heading, list, links).
function renderRichText(content) {
    if (!content) return '';
    
    // যদি এটি স্ট্রিং হয় (যেমন: HTML কোড), তাহলে সরাসরি রিটার্ন করুন
    if (typeof content === 'string') {
        return content;
    }
    
    // যদি এটি Strapi-র Blocks JSON অ্যারে হয়
    if (Array.isArray(content)) {
        return content.map(block => {
            if (block.type === 'paragraph') {
                const text = block.children?.map(c => c.text).join('') || '';
                return `<p>${text}</p>`;
            }
            // অন্যান্য ব্লক টাইপ (যেমন: list, heading) যোগ করতে চাইলে এখানে বাড়ানো যেতে পারে
            return '';
        }).join('');
    }
    
    return '';
}

// Strapi media base URL (local dev). Change this for production.
const STRAPI_URL = 'http://localhost:1337';

// Render the hero poster image. Supports both Strapi v5 (flattened:
// heroImage.url) and v4 (nested: heroImage.data.attributes.url) shapes.
function renderHeroImage(heroImage, title) {
    const el = document.getElementById('hero-image');
    if (!el) return;

    try {
        // v5 flattened first, then v4 nested fallback.
        const url = heroImage?.url ?? heroImage?.data?.attributes?.url ?? null;

        if (url) {
            // Strapi returns a relative path locally → prefix the host.
            // Absolute URLs (e.g. a cloud provider) are used as-is.
            const src = /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
            const alt = escapeHTML(title || 'UFC 329 Event Poster');
            el.innerHTML =
                `<figure class="hero-poster-figure">
                    <img class="hero-poster-img" src="${escapeHTML(src)}" alt="${alt}" loading="lazy">
                    <span class="hero-poster-badge">UFC 329</span>
                </figure>`;
        } else {
            el.innerHTML = '<span style="color:#666;">Event Poster (Upload image in Strapi)</span>';
        }
    } catch (e) {
        console.warn('Hero image render skipped:', e);
        el.innerHTML = '<span style="color:#666;">Event Poster (Upload image in Strapi)</span>';
    }
}

// Pull the image object off a fighter, tolerant of field-name casing
// ("Image" vs "image") and of v5-flat vs v4-nested shapes.
function getFighterImage(fighterData) {
    const a = fighterData?.attributes ?? fighterData ?? {};
    return a.Image ?? a.image ?? null;
}

// Build a full URL from a Strapi media object. `prefer` picks a format
// (e.g. 'medium' for backgrounds, 'thumbnail' for avatars) and falls back
// to the original. Supports v5 (flattened) and v4 (nested).
function getMediaUrl(media, prefer = null) {
    if (!media) return null;
    const node = media.data?.attributes ?? media; // v4 nested → unwrap
    const url =
        (prefer && node?.formats?.[prefer]?.url) ||
        node?.url ||
        null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
}

// Render a fighter's profile image into the given avatar container.
// Falls back to text/emoji if no image is available.
function renderFighterAvatar(containerId, fighterData, fallbackText = '🥊') {
    const el = document.getElementById(containerId);
    if (!el) return;
    try {
        const name = fighterData?.name ?? fighterData?.attributes?.name ?? 'Fighter';
        const src = getMediaUrl(getFighterImage(fighterData), 'thumbnail');

        if (src) {
            el.innerHTML =
                `<img class="fighter-profile-img" src="${escapeHTML(src)}" alt="${escapeHTML(name)}" loading="lazy">`;
        } else {
            el.innerHTML = `<span class="fighter-avatar-fallback">${escapeHTML(fallbackText)}</span>`;
        }
    } catch (e) {
        console.warn(`Fighter avatar (${containerId}) skipped:`, e);
        el.innerHTML = `<span class="fighter-avatar-fallback">${escapeHTML(fallbackText)}</span>`;
    }
}

// Set the fighter photo as a faded background on the whole card.
function renderFighterBackground(cardSelector, fighterData) {
    const card = document.querySelector(cardSelector);
    if (!card) return;
    try {
        const src = getMediaUrl(getFighterImage(fighterData), 'medium');
        if (src) {
            card.style.setProperty('--fighter-img', `url("${src}")`);
            card.classList.add('has-fighter-bg');
        }
    } catch (e) {
        console.warn(`Fighter background (${cardSelector}) skipped:`, e);
    }
}

// Find a fighter in the list by name or slug (case-insensitive, partial match).
function findFighter(list, needle) {
    if (!Array.isArray(list)) return null;
    const q = needle.toLowerCase();
    return list.find(f => {
        const a = f?.attributes ?? f; // support v5 flat + v4 nested
        const name = (a?.name ?? '').toLowerCase();
        const slug = (a?.slug ?? '').toLowerCase();
        return name.includes(q) || slug.includes(q.replace(/\s+/g, '-'));
    }) ?? null;
}

// Fetch fighters and render their profile images. Isolated so a failure
// here never blocks the bios/text from rendering.
async function loadFighterAvatars() {
    try {
        const res = await getFighters();
        const list = res?.data ?? [];
        console.log('🥊 Fighters loaded:', list);

        const conor = findFighter(list, 'conor');
        const max = findFighter(list, 'max');

        renderFighterAvatar('conor-avatar', conor, '🇮🇪');
        renderFighterAvatar('max-avatar', max, '🇺🇸');

        renderFighterBackground('.fighter-conor', conor);
        renderFighterBackground('.fighter-max', max);
    } catch (e) {
        console.warn('Fighter avatars skipped (bios still render):', e);
    }
}

// Live countdown timer. Updates every second until targetDate is reached.
function startCountdown(targetDate) {
    const target = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
    if (Number.isNaN(target)) {
        console.warn('startCountdown: invalid target date', targetDate);
        return;
    }

    const wrap = document.getElementById('countdown-timer');
    const elDays = document.getElementById('cd-days');
    const elHours = document.getElementById('cd-hours');
    const elMins = document.getElementById('cd-minutes');
    const elSecs = document.getElementById('cd-seconds');
    if (!elDays || !elHours || !elMins || !elSecs) return;

    const pad = (n) => String(n).padStart(2, '0');

    const tick = () => {
        const diff = target - Date.now();

        if (diff <= 0) {
            elDays.textContent = elHours.textContent = elMins.textContent = elSecs.textContent = '00';
            if (wrap) wrap.classList.add('is-live');
            const dateEl = document.getElementById('countdown-date');
            if (dateEl) dateEl.textContent = "🔴 It's Fight Night!";
            clearInterval(timer);
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        elDays.textContent = pad(days);
        elHours.textContent = pad(hours);
        elMins.textContent = pad(mins);
        elSecs.textContent = pad(secs);
    };

    tick();
    const timer = setInterval(tick, 1000);
}

// Mobile nav toggle
function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });
}

/* ============================================================
   Main load
   ============================================================ */
async function loadHomepage() {
    try {
        console.log('🔄 Loading homepage...');
        const response = await getHomepage();

        // Strapi v5 flattens fields onto `data` (no `data.attributes`).
        // Support both shapes for safety.
        const attrs = response?.data?.attributes ?? response?.data ?? null;

        if (!attrs) {
            console.error('❌ No data received from Strapi');
            setText('hero-title', 'Data Unavailable');
            return;
        }
        console.log('✅ Data loaded:', attrs);

        // --- 1. Hero (title, subtitle, poster image) ---
        try {
            setText('hero-title', attrs.heroTitle, 'Conor McGregor vs Max Holloway');
            setHTML('hero-subtitle', renderRichText(attrs.heroSubtitle));
            renderHeroImage(attrs.heroImage, attrs.heroTitle);
        } catch (e) { console.warn('Hero render skipped:', e); }

        // --- 2. What You'll Get (field is "whatYouGet" OR "whatYouGetItem") ---
        try {
            console.log('🔎 whatYouGet:', attrs.whatYouGet, '| whatYouGetItem:', attrs.whatYouGetItem);
            const rawItems = attrs.whatYouGet ?? attrs.whatYouGetItem ?? [];
            const items = Array.isArray(rawItems) ? rawItems : [];
            if (items.length > 0) {
                setHTML('what-you-get-list', items.map(it => {
                    const label = escapeHTML(typeof it === 'string' ? it : (it?.item ?? it ?? ''));
                    return `<li><span class="check">✓</span><span>${label}</span></li>`;
                }).join(''));
            } else {
                setHTML('what-you-get-list', '<li class="is-empty">No items available yet.</li>');
            }
        } catch (e) { console.warn('What-you-get render skipped:', e); }

        // --- 3. About — Conor (contoOverview, fallback conorOverview) + Max ---
        try {
            const conorBio = pick(attrs.contoOverview, attrs.conorOverview);
            setHTML('conor-content', renderRichText(conorBio),
                '<p class="is-empty">Conor McGregor biography coming soon…</p>');
            setHTML('max-content', renderRichText(attrs.maxOverview),
                '<p class="is-empty">Max Holloway biography coming soon…</p>');
        } catch (e) { console.warn('Bios render skipped:', e); }

        // --- 3b. Fighter profile images (from Fighters collection) ---
        // Fire-and-forget: bios already rendered above, images fill in async.
        loadFighterAvatars();

        // --- 4. Records — Conor (contoRecord, fallback conorRecord) + Max ---
        try {
            const conorRec = pick(attrs.contoRecord, attrs.conorRecord);
            setHTML('conor-record',
                `<h3>🇮🇪 Conor McGregor</h3>${renderRichText(conorRec)}`,
                '<h3>🇮🇪 Conor McGregor</h3><p class="is-empty">Record not available.</p>');
            setHTML('max-record',
                `<h3>🇺🇸 Max Holloway</h3>${renderRichText(attrs.maxRecord)}`,
                '<h3>🇺🇸 Max Holloway</h3><p class="is-empty">Record not available.</p>');
        } catch (e) { console.warn('Records render skipped:', e); }

        // --- 5. Key Info Table ---
        try {
            const rows = Array.isArray(attrs.keyInfoTable) ? attrs.keyInfoTable : [];
            if (rows.length > 0) {
                const body = rows.map(r =>
                    `<tr><td>${escapeHTML(r?.label ?? '')}</td><td>${escapeHTML(r?.value ?? '')}</td></tr>`
                ).join('');
                setHTML('key-info-table',
                    `<table class="info-table">
                        <thead><tr><th>Information</th><th>Details</th></tr></thead>
                        <tbody>${body}</tbody>
                    </table>`);
            } else {
                setHTML('key-info-table', '<p class="is-empty">Key information coming soon.</p>');
            }
        } catch (e) { console.warn('Key-info render skipped:', e); }

        // --- 6. How To Watch ---
        try {
            setHTML('how-to-watch-content', renderRichText(attrs.howToWatchContent),
                '<p class="is-empty">Streaming details coming soon.</p>');
        } catch (e) { console.warn('How-to-watch render skipped:', e); }

        // --- 7. Conclusion ---
        try {
            setText('conclusion-title', 'Conclusion');
            setHTML('conclusion-content', renderRichText(attrs.conclusionContent));
        } catch (e) { console.warn('Conclusion render skipped:', e); }

        console.log('✅ Homepage rendered successfully!');

    } catch (error) {
        console.error('❌ Critical Homepage Load Error:', error);
        setText('hero-title', 'Error Loading Data');
    }
}

/* ============================================================
   Init
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    // Countdown to UFC 329 — July 11, 2026 23:59:59 (local time)
    startCountdown(new Date(2026, 6, 11, 23, 59, 59));
    loadHomepage();
});

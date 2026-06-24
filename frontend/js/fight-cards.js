import { getFightCards } from './api.js';

const STRAPI_URL = 'http://localhost:1337';

/* ============================================================
   Helpers
   ============================================================ */

// Escape text before injecting into HTML (XSS-safe).
function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Build a full media URL — v5 flattened (media.url) + v4 nested fallback.
function mediaUrl(media) {
    if (!media) return null;
    const node = media.data?.attributes ?? media;
    const url = node?.url ?? null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
}

// Unwrap a Strapi entry to its field bag (v5 flat or v4 nested).
function fields(entry) {
    return entry?.attributes ?? entry ?? {};
}

// Get a fighter's display name from a single relation (flat or nested).
function relationName(rel) {
    if (!rel) return null;
    const node = rel.data?.attributes ?? rel.data ?? rel;
    return node?.name ?? null;
}

// Format an ISO date nicely, e.g. "Saturday, July 11, 2026".
function formatDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Map status → badge CSS modifier.
function statusClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        default:          return 'status-upcoming';
    }
}

/* ============================================================
   Rendering
   ============================================================ */

function renderFightList(fightList) {
    if (!Array.isArray(fightList) || fightList.length === 0) return '';
    const rows = fightList.map(f => {
        const a = escapeHTML(f?.fighterA ?? 'TBD');
        const b = escapeHTML(f?.fighterB ?? 'TBD');
        const wc = f?.weightClass ? `<span class="fl-class">${escapeHTML(f.weightClass)}</span>` : '';
        const res = f?.result ? `<span class="fl-result">${escapeHTML(f.result)}</span>` : '';
        return `<li class="fight-list-item">
            ${wc}
            <div class="fl-fighters"><span>${a}</span><span class="fl-vs">vs</span><span>${b}</span></div>
            ${res}
        </li>`;
    }).join('');
    return `<ul class="fight-list">${rows}</ul>`;
}

// Build the prelim bouts markup (reuses the .bout / .bout-* CSS classes).
// Returns '' when there is nothing to render.
function renderPrelimsList(prelims) {
    if (!Array.isArray(prelims) || prelims.length === 0) return '';
    return prelims.map(f => {
        const a = escapeHTML(f?.fighterA ?? 'TBD');
        const b = escapeHTML(f?.fighterB ?? 'TBD');
        const wc = f?.weightClass ? `<span class="bout-tag">${escapeHTML(f.weightClass)}</span>` : '';
        return `<div class="bout">
            ${wc}
            <div class="bout-fighters">
                <span class="bout-name">${a}</span>
                <span class="bout-vs">vs</span>
                <span class="bout-name">${b}</span>
            </div>
        </div>`;
    }).join('');
}

function renderCard(entry) {
    const a = fields(entry);

    const name = escapeHTML(a.eventName ?? 'Untitled Event');
    // DB field is misspelled "statuss" (two 's') — try it first, then "status".
    const status = a.statuss ?? a.status ?? 'Upcoming';
    const poster = mediaUrl(a.poster);
    const date = formatDate(a.eventDate);
    const metaBits = [date, a.venue, a.location].filter(Boolean).map(escapeHTML);
    const meta = metaBits.length ? metaBits.join(' · ') : 'Date &amp; venue TBD';

    const mainEvent = relationName(a.mainEvent) ?? 'TBD';
    const coMain = relationName(a.coMainEvent) ?? 'TBD';
    const slug = a.slug ?? '';

    const posterHTML = poster
        ? `<div class="fight-poster-wrap"><img class="fight-poster" src="${escapeHTML(poster)}" alt="${name} poster" loading="lazy"></div>`
        : '';

    // Dynamic preliminary card (Strapi "prelims" repeatable component).
    const prelimsHTML = renderPrelimsList(a.prelims);
    const prelimsSection = prelimsHTML
        ? `<h2 class="section-title" style="margin-top:40px;">Preliminary <span class="accent">Card</span></h2><div class="bout-list">${prelimsHTML}</div>`
        : '';

    return `<article class="fight-card-item">
        ${posterHTML}
        <div class="fight-card-body">
            <span class="fight-status ${statusClass(status)}">${escapeHTML(status)}</span>
            <h2 class="fight-event-name">${name}</h2>
            <p class="fight-meta">${meta}</p>

            <div class="fight-main-event">
                <div class="me-row">
                    <span class="me-label">Main Event</span>
                    <span class="me-fighters">${escapeHTML(mainEvent)} <em>vs</em> ${escapeHTML(coMain)}</span>
                </div>
            </div>

            ${renderFightList(a.fightList)}

            ${prelimsSection}

            <div class="fight-card-actions">
                <!-- ✅ ফিক্স: # এর বদলে /fight-cards/ + slug বসানো হয়েছে -->
                <a href="${slug ? `fight-card-detail.html?slug=${encodeURIComponent(slug)}` : 'how-to-watch.html'}" class="btn btn-primary">View Full Card</a>
                <a href="how-to-watch.html" class="btn btn-ghost">How To Watch</a>
            </div>
        </div>
    </article>`;
}
/* ============================================================
   Load
   ============================================================ */

async function loadFightCards() {
    const container = document.getElementById('fight-cards-container');
    if (!container) return;

    try {
        const res = await getFightCards();
        const list = Array.isArray(res?.data) ? res.data : [];
        console.log('🥊 Fight cards loaded:', list);

        if (list.length === 0) {
            container.innerHTML = '<p class="is-empty">No fight cards available yet. Check back soon!</p>';
            return;
        }

        // Sort by event date — soonest first.
        const sorted = [...list].sort((x, y) => {
            const dx = new Date(fields(x).eventDate ?? 0).getTime() || 0;
            const dy = new Date(fields(y).eventDate ?? 0).getTime() || 0;
            return dx - dy;
        });

        container.innerHTML = `<div class="fight-cards-grid">${sorted.map(renderCard).join('')}</div>`;
    } catch (error) {
        console.error('❌ Fight cards load error:', error);
        container.innerHTML = '<p class="is-empty">Unable to load fight cards right now. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFightCards);

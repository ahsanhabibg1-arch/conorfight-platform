import { getFightCards, STRAPI_URL } from './api.js';

/* ============================================================
   Helpers (self-contained copies from fight-cards.js)
   ============================================================ */

function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mediaUrl(media) {
    if (!media) return null;
    const node = media.data?.attributes ?? media;
    const url = node?.url ?? null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
}

function fields(entry) {
    return entry?.attributes ?? entry ?? {};
}

function relationName(rel) {
    if (!rel) return null;
    const node = rel.data?.attributes ?? rel.data ?? rel;
    return node?.name ?? null;
}

function formatDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function statusClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        default:          return 'status-upcoming';
    }
}

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

/* ============================================================
   Slug extraction — supports clean URL and ?slug= fallback
   ============================================================ */

function getSlug() {
    // 1) Query param (works locally: fight-card-detail.html?slug=ufc-329)
    const qs = new URLSearchParams(window.location.search).get('slug');
    if (qs) return qs.trim();

    // 2) Clean URL path (e.g. /fight-cards/ufc-329 on Vercel)
    const last = window.location.pathname.split('/').filter(Boolean).pop() || '';
    const clean = last.replace(/\.html$/i, '');
    if (!clean || clean === 'fight-card-detail') return null;
    return clean;
}

/* ============================================================
   Rendering
   ============================================================ */

function renderDetail(entry) {
    const a = fields(entry);

    const name = escapeHTML(a.eventName ?? 'Untitled Event');
    const status = a.statuss ?? a.status ?? 'Upcoming';
    const poster = mediaUrl(a.poster);
    const date = formatDate(a.eventDate);
    const mainEvent = relationName(a.mainEvent) ?? 'TBD';
    const coMain = relationName(a.coMainEvent) ?? 'TBD';
    // Optional eyebrow label — customizable from Strapi via "detailLabel" field.
    const eyebrow = escapeHTML(a.detailLabel ?? 'Fight Card Detail');

    const metaItems = [
        date ? { label: 'Date', value: date } : null,
        a.venue ? { label: 'Venue', value: a.venue } : null,
        a.location ? { label: 'Location', value: a.location } : null,
        { label: 'Status', value: status },
    ].filter(Boolean).map(m =>
        `<div class="detail-meta-item"><strong>${escapeHTML(m.label)}</strong>${escapeHTML(m.value)}</div>`
    ).join('');

    const posterHTML = poster
        ? `<div class="detail-poster"><img src="${escapeHTML(poster)}" alt="${name} poster" loading="lazy"></div>`
        : `<div class="detail-poster"><div class="poster-frame"><span class="poster-vs">${name}</span></div></div>`;

    const fightListHTML = renderFightList(a.fightList);
    const fightListSection = fightListHTML
        ? `<h2 class="section-title" style="margin-top:56px;">Main <span class="accent">Card</span></h2>${fightListHTML}`
        : '';

    const prelimsHTML = renderPrelimsList(a.prelims);
    const prelimsSection = prelimsHTML
        ? `<h2 class="section-title" style="margin-top:48px;">Preliminary <span class="accent">Card</span></h2><div class="bout-list">${prelimsHTML}</div>`
        : '';

    return `
        <div class="detail-hero">
            <div class="detail-info">
                <span class="eyebrow">🥊 ${eyebrow}</span>
                <span class="fight-status ${statusClass(status)}" style="margin-left:12px;">${escapeHTML(status)}</span>
                <h1 class="fight-event-name" style="font-size:clamp(2rem,5vw,3.4rem);margin:14px 0;">${name}</h1>
                <div class="detail-meta-list">${metaItems}</div>
            </div>
            ${posterHTML}
        </div>

        <div class="fight-main-event" style="margin-top:24px;">
            <span class="me-label">Main Event</span>
            <div class="detail-vs">
                <span class="detail-vs-name">${escapeHTML(mainEvent)}</span>
                <span class="vs-badge">VS</span>
                <span class="detail-vs-name">${escapeHTML(coMain)}</span>
            </div>
        </div>

        ${fightListSection}
        ${prelimsSection}
    `;
}

/* ============================================================
   Dynamic SEO
   ============================================================ */

// Create or update a <meta> tag in <head>. `attr` is "name" or "property".
function upsertMeta(attr, key, content) {
    if (!content) return;
    let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
}

// Update document title + meta tags from the event's SEO component.
function updateSEO(event) {
    try {
        const a = fields(event);
        const seo = a.seo ?? event?.seo ?? {};

        // Title
        document.title = seo.metaTitle || a.eventName || 'UFC Event';

        // Description
        const description = seo.metaDescription
            || `${a.eventName ?? 'UFC Event'} — full fight card, main event, prelims and how to watch.`;
        upsertMeta('name', 'description', description);

        // Keywords (only if present)
        if (seo.keywords) upsertMeta('name', 'keywords', seo.keywords);

        // Social images — prefer the SEO ogImage, fall back to the event poster.
        const image = mediaUrl(seo.ogImage) || mediaUrl(a.poster);
        if (image) {
            upsertMeta('property', 'og:image', image);
            upsertMeta('name', 'twitter:image', image);
        }

        // Helpful open-graph extras (safe, derived from data above)
        upsertMeta('property', 'og:title', document.title);
        upsertMeta('property', 'og:description', description);
    } catch (e) {
        console.warn('SEO update skipped:', e);
    }
}

// Set or update the canonical link to the clean event URL.
function setCanonical(slug) {
    const href = `https://conorfight.com/fight-cards/${slug}`;
    let tag = document.head.querySelector('link[rel="canonical"]');
    if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', 'canonical');
        document.head.appendChild(tag);
    }
    tag.setAttribute('href', href);
    upsertMeta('property', 'og:url', href);
}

// Inject BreadcrumbList JSON-LD: Home › Fight Cards › Event.
function injectBreadcrumb(event, slug) {
    try {
        const a = fields(event);
        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://conorfight.com/" },
                { "@type": "ListItem", "position": 2, "name": "Fight Cards", "item": "https://conorfight.com/fight-cards" },
                { "@type": "ListItem", "position": 3, "name": a.eventName || "Event", "item": `https://conorfight.com/fight-cards/${slug}` }
            ]
        };
        let tag = document.getElementById('breadcrumb-schema');
        if (!tag) {
            tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.id = 'breadcrumb-schema';
            document.head.appendChild(tag);
        }
        tag.textContent = JSON.stringify(schema);
    } catch (e) {
        console.warn('Breadcrumb schema skipped:', e);
    }
}

// Inject SportsEvent JSON-LD structured data.
function injectEventSchema(event) {
    try {
        const a = fields(event);
        const image = mediaUrl(a.poster);
        const schema = {
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "name": a.eventName || "UFC Event",
            "startDate": a.eventDate || undefined,
            "eventStatus": "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
            "image": image || undefined,
            "location": {
                "@type": "Place",
                "name": a.venue || "TBD",
                "address": a.location || "TBD"
            },
            "competitor": [
                { "@type": "Person", "name": relationName(a.mainEvent) || "TBD" },
                { "@type": "Person", "name": relationName(a.coMainEvent) || "TBD" }
            ]
        };
        let tag = document.getElementById('event-schema');
        if (!tag) {
            tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.id = 'event-schema';
            document.head.appendChild(tag);
        }
        tag.textContent = JSON.stringify(schema);
    } catch (e) {
        console.warn('Event schema injection skipped:', e);
    }
}

/* ============================================================
   Load
   ============================================================ */

async function loadDetail() {
    const container = document.getElementById('detail-container');
    if (!container) return;

    const slug = getSlug();
    if (!slug) {
        container.innerHTML = '<p class="is-empty">No event specified. <a href="/fight-cards">Browse all fight cards →</a></p>';
        return;
    }

    try {
        const res = await getFightCards();
        const events = (Array.isArray(res?.data) ? res.data : []).map(fields);
        const event = events.find(e => e.slug === slug);
        if (!event) {
            container.innerHTML = `<p class="is-empty">Event not found. <a href="/fight-cards">Back to fight cards →</a></p>`;
            return;
        }

        container.innerHTML = renderDetail(event);
        updateSEO(event);
        setCanonical(slug);
        injectEventSchema(event);
        injectBreadcrumb(event, slug);
    } catch (error) {
        console.error('❌ Event detail load error:', error);
        container.innerHTML = '<p class="is-empty">Unable to load this event right now. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadDetail);

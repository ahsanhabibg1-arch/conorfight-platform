// CMS-driven blog listing: fetches posts from Strapi and renders cards.

import { STRAPI_URL, cachedFetch } from './api.js';

/* ---------- Helpers ---------- */
function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fields(entry) {
    return entry?.attributes ?? entry ?? {};
}

function mediaUrl(media) {
    if (!media) return null;
    const node = media.data?.attributes ?? media;
    const url = node?.url ?? null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${STRAPI_URL}${url}`;
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
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ---------- Rendering ---------- */
function renderCard(post) {
    const title = escapeHTML(post.title ?? 'Untitled');
    const excerpt = escapeHTML(post.excerpt ?? '');
    const slug = encodeURIComponent(post.slug ?? '');
    const img = mediaUrl(post.featuredImage ?? post.FeaturedImage);
    const category = relationName(post.category);
    const author = relationName(post.author);
    const date = formatDate(post.publishedAt ?? post.createdAt);

    const imgHTML = img
        ? `<img src="${escapeHTML(img)}" alt="${title}" loading="lazy">`
        : `<div class="blog-thumb">🥊</div>`;

    return `<article class="blog-card">
        <a href="/blog/${slug}" class="blog-card-link">
            ${imgHTML}
            <div class="blog-body">
                ${category ? `<span class="blog-tag">${escapeHTML(category)}</span>` : ''}
                <h3>${title}</h3>
                ${excerpt ? `<p>${excerpt}</p>` : ''}
                <div class="blog-meta">
                    ${date ? `<span class="blog-date">${date}</span>` : ''}
                    ${author ? `<span class="blog-author">By ${escapeHTML(author)}</span>` : ''}
                </div>
                <span class="blog-readmore">Read More →</span>
            </div>
        </a>
    </article>`;
}

/* ---------- Load ---------- */
async function loadBlogs() {
    const container = document.getElementById('blog-container');
    if (!container) return;

    try {
        const json = await cachedFetch(`${STRAPI_URL}/api/blogs?populate=*&sort=createdAt:desc`);
        const posts = (Array.isArray(json?.data) ? json.data : []).map(fields);

        if (posts.length === 0) {
            container.innerHTML = '<p class="is-empty">No blog posts yet.</p>';
            return;
        }

        container.innerHTML = posts.map(renderCard).join('');
    } catch (error) {
        console.error('❌ Blog load error:', error);
        container.innerHTML = '<p class="is-empty">Unable to load posts right now. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadBlogs);

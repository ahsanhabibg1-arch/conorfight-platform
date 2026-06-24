// CMS-driven blog detail: finds a post by slug, renders the full article,
// and injects Article JSON-LD schema for SEO.

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

// Render Strapi Rich Text (blocks array OR HTML/markdown string) → safe HTML.
function renderRichText(content) {
    if (!content) return '';
    if (typeof content === 'string') {
        // Treat as already-safe HTML/markdown from the CMS.
        return content;
    }
    if (!Array.isArray(content)) return '';

    const inline = (children) => (children || []).map(c => {
        if (!c || typeof c !== 'object') return '';
        if (c.type === 'link') {
            const url = escapeHTML(c.url ?? '#');
            return `<a href="${url}" target="_blank" rel="noopener">${inline(c.children)}</a>`;
        }
        let t = escapeHTML(c.text ?? '');
        if (c.bold) t = `<strong>${t}</strong>`;
        if (c.italic) t = `<em>${t}</em>`;
        if (c.underline) t = `<u>${t}</u>`;
        if (c.code) t = `<code>${t}</code>`;
        return t;
    }).join('');

    return content.map(block => {
        if (!block || typeof block !== 'object') return '';
        switch (block.type) {
            case 'heading': {
                const lvl = Math.min(Math.max(block.level || 2, 2), 4);
                return `<h${lvl}>${inline(block.children)}</h${lvl}>`;
            }
            case 'list': {
                const tag = block.format === 'ordered' ? 'ol' : 'ul';
                const items = (block.children || []).map(li => `<li>${inline(li?.children)}</li>`).join('');
                return `<${tag}>${items}</${tag}>`;
            }
            case 'quote':
                return `<blockquote>${inline(block.children)}</blockquote>`;
            case 'image': {
                const url = mediaUrl(block.image);
                return url ? `<img src="${escapeHTML(url)}" alt="" loading="lazy">` : '';
            }
            case 'paragraph':
            default: {
                const t = inline(block.children);
                return t ? `<p>${t}</p>` : '';
            }
        }
    }).join('');
}

// Flatten rich text → plain text (for schema fallback).
function richToText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (Array.isArray(content)) {
        return content.map(b => (b?.children || []).map(c => c?.text ?? '').join('')).join(' ').replace(/\s+/g, ' ').trim();
    }
    return '';
}

/* ---------- Slug ---------- */
function getSlug() {
    const qs = new URLSearchParams(window.location.search).get('slug');
    if (qs) return qs.trim();
    const last = window.location.pathname.split('/').filter(Boolean).pop() || '';
    const clean = last.replace(/\.html$/i, '');
    if (!clean || clean === 'blog-detail') return null;
    return clean;
}

/* ---------- SEO ---------- */
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

// Dynamic canonical + OG/Twitter tags for the article.
function updateSEO(post, slug, imageUrl) {
    try {
        const url = `https://conorfight.com/blog/${slug}`;
        let canonical = document.head.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', url);

        const desc = post.excerpt || richToText(post.content).slice(0, 160);
        upsertMeta('property', 'og:title', post.title || 'Article');
        upsertMeta('property', 'og:description', desc);
        upsertMeta('property', 'og:url', url);
        upsertMeta('name', 'description', desc);
        if (imageUrl) {
            upsertMeta('property', 'og:image', imageUrl);
            upsertMeta('name', 'twitter:image', imageUrl);
        }
    } catch (e) {
        console.warn('Blog SEO update skipped:', e);
    }
}

// BreadcrumbList JSON-LD: Home › Blog › Article.
function injectBreadcrumb(post, slug) {
    try {
        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://conorfight.com/" },
                { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://conorfight.com/blog" },
                { "@type": "ListItem", "position": 3, "name": post.title || "Article", "item": `https://conorfight.com/blog/${slug}` }
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

function injectSchema(post, imageUrl) {
    try {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title ?? '',
            "image": imageUrl || undefined,
            "author": { "@type": "Person", "name": relationName(post.author) || "ConorFight" },
            "datePublished": post.publishedAt ?? post.createdAt ?? undefined,
            "description": post.excerpt || richToText(post.content).slice(0, 160)
        };
        let tag = document.getElementById('article-schema');
        if (!tag) {
            tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.id = 'article-schema';
            document.head.appendChild(tag);
        }
        tag.textContent = JSON.stringify(schema);
    } catch (e) {
        console.warn('Article schema injection skipped:', e);
    }
}

/* ---------- Render ---------- */
function renderDetail(post) {
    const title = escapeHTML(post.title ?? 'Untitled');
    const author = relationName(post.author);
    const category = relationName(post.category);
    const date = formatDate(post.publishedAt ?? post.createdAt);
    const img = mediaUrl(post.featuredImage ?? post.FeaturedImage);

    const heroImage = img
        ? `<div class="blog-detail-hero"><img src="${escapeHTML(img)}" alt="${title}"></div>`
        : '';

    return `
        <article class="blog-article">
            ${category ? `<span class="blog-tag">${escapeHTML(category)}</span>` : ''}
            <h1 class="blog-detail-title">${title}</h1>
            <div class="blog-detail-meta">
                ${author ? `<span>✍️ ${escapeHTML(author)}</span>` : ''}
                ${date ? `<span>📅 ${date}</span>` : ''}
            </div>
            ${heroImage}
            <div class="blog-content rich-text">${renderRichText(post.content)}</div>
        </article>
    `;
}

/* ---------- Load ---------- */
async function loadDetail() {
    const container = document.getElementById('detail-container');
    if (!container) return;

    const slug = getSlug();
    if (!slug) {
        container.innerHTML = '<p class="is-empty">No article specified. <a href="/blog">Browse the blog →</a></p>';
        return;
    }

    try {
        const json = await cachedFetch(`${STRAPI_URL}/api/blogs?populate=*&filters[slug][$eq]=${encodeURIComponent(slug)}`);
        let post = (Array.isArray(json?.data) ? json.data : []).map(fields)[0];

        // Fallback: if the filter returned nothing, fetch all and match locally.
        if (!post) {
            const all = await cachedFetch(`${STRAPI_URL}/api/blogs?populate=*`);
            post = (Array.isArray(all?.data) ? all.data : []).map(fields).find(p => p.slug === slug);
        }

        if (!post) {
            container.innerHTML = '<p class="is-empty">Post not found. <a href="/blog">Back to blog →</a></p>';
            return;
        }

        document.title = `${post.title ?? 'Article'} · ConorFight`;
        const img = mediaUrl(post.featuredImage ?? post.FeaturedImage);
        container.innerHTML = renderDetail(post);
        updateSEO(post, slug, img);
        injectSchema(post, img);
        injectBreadcrumb(post, slug);
    } catch (error) {
        console.error('❌ Blog detail load error:', error);
        container.innerHTML = '<p class="is-empty">Unable to load this article right now. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadDetail);

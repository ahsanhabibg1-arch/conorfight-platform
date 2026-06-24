// CMS-driven FAQ page: fetches FAQs from Strapi, renders an accordion,
// and injects FAQPage JSON-LD schema for rich snippets.

import { STRAPI_URL, cachedFetch } from './api.js';

/* ============================================================
   Helpers
   ============================================================ */

function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Unwrap a Strapi entry (v5 flat or v4 nested).
function fields(entry) {
    return entry?.attributes ?? entry ?? {};
}

// Render a rich-text answer (string OR Strapi blocks array) → safe HTML.
function answerToHTML(content) {
    if (!content) return '';
    if (typeof content === 'string') {
        // Plain text → split into paragraphs on blank lines.
        return content.split(/\n{2,}/).map(p => `<p>${escapeHTML(p.trim())}</p>`).join('');
    }
    if (Array.isArray(content)) {
        return content.map(block => {
            if (!block || typeof block !== 'object') return '';
            const inline = (block.children || []).map(c => {
                let t = escapeHTML(c?.text ?? '');
                if (c?.bold) t = `<strong>${t}</strong>`;
                if (c?.italic) t = `<em>${t}</em>`;
                return t;
            }).join('');
            if (block.type === 'heading') return `<p><strong>${inline}</strong></p>`;
            return inline ? `<p>${inline}</p>` : '';
        }).join('');
    }
    return '';
}

// Flatten a rich-text answer to plain text (for JSON-LD schema).
function answerToText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
        return content
            .map(b => (b?.children || []).map(c => c?.text ?? '').join(''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    return '';
}

/* ============================================================
   Rendering
   ============================================================ */

function renderFaqs(items) {
    return items.map(it => {
        const q = escapeHTML(it.question ?? '');
        const a = answerToHTML(it.answer);
        return `<div class="faq-item">
            <button class="faq-q">${q} <span class="faq-icon">+</span></button>
            <div class="faq-a">${a}</div>
        </div>`;
    }).join('');
}

// Accordion behaviour — only one item open at a time.
function wireAccordion(container) {
    const itemsEls = container.querySelectorAll('.faq-item');
    itemsEls.forEach(item => {
        const btn = item.querySelector('.faq-q');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            itemsEls.forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
}

// Inject FAQPage structured data (JSON-LD) into <head>.
function injectSchema(items) {
    try {
        const schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": items.map(it => ({
                "@type": "Question",
                "name": it.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": answerToText(it.answer)
                }
            }))
        };
        let tag = document.getElementById('faq-schema');
        if (!tag) {
            tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.id = 'faq-schema';
            document.head.appendChild(tag);
        }
        tag.textContent = JSON.stringify(schema);
    } catch (e) {
        console.warn('FAQ schema injection skipped:', e);
    }
}

/* ============================================================
   Load
   ============================================================ */

async function loadFaqs() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    try {
        const json = await cachedFetch(`${STRAPI_URL}/api/faqs?populate=*&sort=sortOrder:asc`);
        const items = (Array.isArray(json?.data) ? json.data : []).map(fields);

        if (items.length === 0) {
            container.innerHTML = '<p class="is-empty">No questions yet. Check back soon!</p>';
            return;
        }

        // Sort client-side too (in case the API ignores the sort param).
        items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        container.innerHTML = renderFaqs(items);
        wireAccordion(container);
        injectSchema(items);
    } catch (error) {
        console.error('❌ FAQ load error:', error);
        container.innerHTML = '<p class="is-empty">Unable to load questions right now. Please try again later.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadFaqs);

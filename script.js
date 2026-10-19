const WHATSAPP = '8801843004246';
const PAGE_SIZE = 24;

// ---------- Preloader ----------
window.addEventListener('load', function () {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
    }, 1200);
});

// ---------- Smooth scrolling ----------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ---------- Catalog ----------
const state = { categories: {}, products: [], active: 'all', query: '', shown: PAGE_SIZE };
const el = id => document.getElementById(id);

function orderUrl(code) {
    const link = location.origin + location.pathname + '?code=' + encodeURIComponent(code);
    const text = 'আমি ' + code + ' কোডের শাড়িটি কিনতে আগ্রহী\n' + link;
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
}

function toBn(n) {
    return String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

function filtered() {
    const q = state.query.trim().toLowerCase();
    return state.products.filter(p => {
        if (state.active !== 'all' && p.category !== state.active) return false;
        if (!q) return true;
        return p.code.toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q);
    });
}

function buildChips() {
    const box = el('chips');
    box.textContent = '';
    const letters = [...new Set(state.products.map(p => p.category))].sort();
    const items = [['all', 'সব']].concat(letters.map(l => [l, state.categories[l] || (l + ' সিরিজ')]));
    items.forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (state.active === key ? ' active' : '');
        b.textContent = label;
        b.addEventListener('click', () => {
            state.active = key;
            state.shown = PAGE_SIZE;
            buildChips();
            render();
        });
        box.appendChild(b);
    });
}

function makeCard(p) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.id = 'p-' + p.code;

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = p.code;
    card.appendChild(badge);

    const holder = document.createElement('div');
    holder.className = 'product-img-holder';
    if (p.images && p.images.length) {
        const im = document.createElement('img');
        im.loading = 'lazy';
        im.decoding = 'async';
        im.src = 'images/thumb/' + p.images[0];
        im.alt = (p.name || 'শাড়ি') + ' ' + p.code;
        holder.appendChild(im);
        holder.classList.add('clickable');
        holder.addEventListener('click', () => openLightbox(p, 0));
        if (p.images.length > 1) {
            const c = document.createElement('span');
            c.className = 'img-count';
            c.textContent = '📷 ' + toBn(p.images.length);
            holder.appendChild(c);
        }
    } else {
        holder.classList.add('ph-' + p.category);
    }
    if (p.soldOut) {
        const s = document.createElement('div');
        s.className = 'sold-out';
        s.textContent = 'স্টক শেষ';
        holder.appendChild(s);
    }
    card.appendChild(holder);

    const info = document.createElement('div');
    info.className = 'product-info';
    const h3 = document.createElement('h3');
    h3.textContent = p.name || 'জামদানি শাড়ি';
    info.appendChild(h3);
    const sub = document.createElement('p');
    sub.className = 'price';
    sub.textContent = p.price ? '৳ ' + p.price : (p.tagline || ' ');
    info.appendChild(sub);
    const a = document.createElement('a');
    a.className = 'order-btn';
    a.target = '_blank';
    a.rel = 'noopener';
    if (p.soldOut) {
        a.classList.add('disabled');
        a.textContent = 'স্টক শেষ';
    } else {
        a.href = orderUrl(p.code);
        a.textContent = 'অর্ডার করুন';
    }
    info.appendChild(a);
    card.appendChild(info);
    return card;
}

function render() {
    const list = filtered();
    const grid = el('product-grid');
    grid.textContent = '';
    list.slice(0, state.shown).forEach(p => grid.appendChild(makeCard(p)));
    el('empty-msg').hidden = list.length > 0;
    el('load-more').hidden = list.length <= state.shown;
    el('result-count').textContent = list.length ? toBn(list.length) + 'টি শাড়ি' : '';
}

async function initCatalog() {
    try {
        const res = await fetch('products.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        state.categories = data.categories || {};
        state.products = data.products || [];
    } catch (err) {
        el('empty-msg').textContent = 'কালেকশন লোড করা যায়নি। পরে আবার চেষ্টা করুন।';
        el('empty-msg').hidden = false;
        return;
    }
    buildChips();
    render();

    el('search').addEventListener('input', e => {
        state.query = e.target.value;
        state.shown = PAGE_SIZE;
        render();
    });
    el('load-more').addEventListener('click', () => {
        state.shown += PAGE_SIZE;
        render();
    });

    // Deep link: ?code=A28 opens that saree directly
    const code = new URLSearchParams(location.search).get('code');
    if (code) {
        const p = state.products.find(x => x.code.toLowerCase() === code.toLowerCase());
        if (p && p.images && p.images.length) {
            document.getElementById('collection').scrollIntoView();
            openLightbox(p, 0);
        }
    }
}

// ---------- Lightbox ----------
const lb = { product: null, index: 0 };

function showLightbox() {
    const p = lb.product;
    el('lb-img').src = 'images/full/' + p.images[lb.index];
    el('lb-img').alt = (p.name || 'শাড়ি') + ' ' + p.code;
    el('lb-title').textContent = (p.name || 'জামদানি শাড়ি') + ' · ' + p.code;
    el('lb-count').textContent = p.images.length > 1 ? ' (' + toBn(lb.index + 1) + '/' + toBn(p.images.length) + ')' : '';
    const multi = p.images.length > 1;
    el('lb-prev').hidden = !multi;
    el('lb-next').hidden = !multi;
    const order = el('lb-order');
    if (p.soldOut) {
        order.removeAttribute('href');
        order.classList.add('disabled');
    } else {
        order.href = orderUrl(p.code);
        order.classList.remove('disabled');
    }
}

function openLightbox(p, i) {
    lb.product = p;
    lb.index = i;
    showLightbox();
    el('lightbox').hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    el('lightbox').hidden = true;
    document.body.style.overflow = '';
}

function stepLightbox(d) {
    const n = lb.product.images.length;
    lb.index = (lb.index + d + n) % n;
    showLightbox();
}

el('lb-close').addEventListener('click', closeLightbox);
el('lb-prev').addEventListener('click', () => stepLightbox(-1));
el('lb-next').addEventListener('click', () => stepLightbox(1));
el('lightbox').addEventListener('click', e => { if (e.target === el('lightbox')) closeLightbox(); });
document.addEventListener('keydown', e => {
    if (el('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lb.product.images.length > 1) stepLightbox(-1);
    if (e.key === 'ArrowRight' && lb.product.images.length > 1) stepLightbox(1);
});

initCatalog();

// Tati Bari shop logic — filters, search, quick-view, wishlist, cart, WhatsApp checkout
// Defensive: works offline (file://), topbar is logo-only, toolbar holds cart/wishlist.
const WA_NUMBER = "8801843004246";
const $ = (s) => document.querySelector(s);
const grid = $("#productGrid"), emptyState = $("#emptyState"), resultCount = $("#resultCount");
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

// Safe storage (localStorage can throw on file:// in some browsers)
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || fallback); } catch (e) { return JSON.parse(fallback); }
  },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
};

let activeFilter = "all";
let searchQ = "";
let sortMode = "code";
let cart = store.get("tb_cart", "[]");
let wishlist = new Set(store.get("tb_wish", "[]"));

function waLink(code, extra) {
  const msg = "আসসালামু আলাইকুম! আমি " + code + " কোডের জামদানি শাড়িটি কিনতে আগ্রহী।";
  return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg + (extra || ""));
}

function save() {
  store.set("tb_cart", cart);
  store.set("tb_wish", [...wishlist]);
  const cc = $("#cartCount"), wc = $("#wishlistCount");
  if (cc) cc.textContent = toBn(cart.length);
  if (wc) wc.textContent = toBn(wishlist.size);
}

function getFiltered() {
  if (typeof PRODUCTS === "undefined" || !Array.isArray(PRODUCTS)) return [];
  const q = searchQ.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    const fOk = activeFilter === "all" ? true : activeFilter === "wishlist" ? wishlist.has(p.code) : p.series === activeFilter;
    const sOk = !q || p.code.toLowerCase().includes(q) || p.name.includes(searchQ) || p.series.toLowerCase() === q;
    return fOk && sOk;
  });
  if (sortMode === "new") list.sort((a, b) => b.code.localeCompare(a.code));
  else if (sortMode === "az") list.sort((a, b) => a.code.localeCompare(b.code));
  else list.sort((a, b) => a.series.localeCompare(b.series) || a.num.localeCompare(b.num));
  return list;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function render() {
  if (!grid) return;
  const list = getFiltered();
  if (resultCount) resultCount.textContent = toBn(list.length) + "টি শাড়ি";
  grid.innerHTML = list.map((p) => {
    const wished = wishlist.has(p.code);
    return (
      '<article class="product-card" data-code="' + esc(p.code) + '">' +
        '<div class="badge">' + esc(p.code) + '</div>' +
        '<div class="product-img-holder" onclick="openQV(\'' + esc(p.code) + '\')">' +
          '<img src="' + esc(p.img) + '" alt="' + esc(p.name_en || p.code) + '" loading="lazy" onerror="this.src=\'images/hero.jpg\'">' +
        '</div>' +
        '<div class="product-info">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<div class="card-btns">' +
            '<a class="order-btn" href="' + waLink(p.code) + '" target="_blank" rel="noopener">অর্ডার করুন</a>' +
            '<button class="mini-btn" title="কার্টে যোগ করুন" onclick="addToCart(\'' + esc(p.code) + '\',this)">👜</button>' +
            '<button class="mini-btn' + (wished ? " done" : "") + '" title="Wishlist" onclick="toggleWish(\'' + esc(p.code) + '\',this)">' + (wished ? "♥" : "♡") + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");
  if (emptyState) emptyState.hidden = list.length > 0;
  save();
}

// Filters
document.querySelectorAll(".filter-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    activeFilter = b.dataset.filter;
    render();
  });
});

const searchInput = $("#searchInput");
if (searchInput) searchInput.addEventListener("input", (e) => { searchQ = e.target.value; render(); });

const sortSelect = $("#sortSelect");
if (sortSelect) sortSelect.addEventListener("change", (e) => { sortMode = e.target.value; render(); });

const resetBtn = $("#resetBtn");
if (resetBtn) resetBtn.addEventListener("click", () => {
  searchQ = "";
  if (searchInput) searchInput.value = "";
  activeFilter = "all";
  const allBtn = document.querySelector('[data-filter="all"]');
  if (allBtn) allBtn.click();
  else render();
});

// Wishlist / Cart
function toggleWish(code) {
  wishlist.has(code) ? wishlist.delete(code) : wishlist.add(code);
  render();
}
function addToCart(code, el) {
  if (!cart.includes(code)) cart.push(code);
  save(); renderCart();
  if (el) { el.classList.add("done"); setTimeout(() => el.classList.remove("done"), 900); }
}
function removeFromCart(code) { cart = cart.filter((c) => c !== code); save(); renderCart(); render(); }

const clearCartBtn = $("#clearCart");
if (clearCartBtn) clearCartBtn.addEventListener("click", () => { cart = []; save(); renderCart(); render(); });

function renderCart() {
  const body = $("#cartBody");
  const checkout = $("#checkoutBtn");
  if (!body) return;
  if (!cart.length) {
    body.innerHTML = '<p style="text-align:center;color:#888;padding:30px 0">কার্ট খালি — পছন্দের শাড়ি 👜 বাটনে যোগ করুন</p>';
    if (checkout) checkout.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("আসসালামু আলাইকুম! জামদানি শাড়ি কিনতে চাই।");
    return;
  }
  body.innerHTML = cart.map((code) => {
    const p = (typeof PRODUCTS !== "undefined" ? PRODUCTS : []).find((x) => x.code === code);
    if (!p) return "";
    return '<div class="cart-row"><img src="' + esc(p.img) + '" alt=""><div><b>' + esc(p.name) + '</b><small>কোড ' + esc(p.code) + '</small></div><button class="rm" onclick="removeFromCart(\'' + esc(code) + '\')">🗑</button></div>';
  }).join("");
  const msg = "আসসালামু আলাইকুম! আমি এই শাড়িগুলো কিনতে চাই:\n" + cart.map((c) => "• " + c).join("\n") + "\nদাম ও ডেলিভারি জানালে ভালো হয়।";
  if (checkout) checkout.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
}

// Drawer
const drawer = $("#cartDrawer"), overlay = $("#cartOverlay");
function openCart() { if (drawer) drawer.classList.add("open"); if (overlay) overlay.classList.add("open"); }
function closeCart() { if (drawer) drawer.classList.remove("open"); if (overlay) overlay.classList.remove("open"); }

const cartBtn = $("#cartBtn");
if (cartBtn) cartBtn.addEventListener("click", openCart);
const wishlistBtn = $("#wishlistBtn");
if (wishlistBtn) wishlistBtn.addEventListener("click", () => {
  const w = document.querySelector('[data-filter="wishlist"]');
  if (w) w.click();
  const col = document.getElementById("collection");
  if (col) col.scrollIntoView({ behavior: "smooth" });
  closeCart();
});
const cartClose = $("#cartClose");
if (cartClose) cartClose.addEventListener("click", closeCart);
if (overlay) overlay.addEventListener("click", closeCart);

// Quick view
let qvCode = null;
function openQV(code) {
  const p = (typeof PRODUCTS !== "undefined" ? PRODUCTS : []).find((x) => x.code === code);
  if (!p) return;
  qvCode = code;
  const img = $("#qvImg"), badge = $("#qvBadge"), name = $("#qvName"), codeEl = $("#qvCode"), order = $("#qvOrder"), ov = $("#qvOverlay");
  if (img) { img.src = p.img; img.alt = p.name_en || p.name; }
  if (badge) badge.textContent = p.code;
  if (name) name.textContent = p.name;
  if (codeEl) codeEl.textContent = p.series + " সিরিজ জামদানি • কোড " + p.code;
  if (order) order.href = waLink(p.code);
  if (ov) ov.classList.add("open");
}
function closeQV() { const ov = $("#qvOverlay"); if (ov) ov.classList.remove("open"); }
const qvClose = $("#qvClose");
if (qvClose) qvClose.addEventListener("click", closeQV);
const qvOverlay = $("#qvOverlay");
if (qvOverlay) qvOverlay.addEventListener("click", (e) => { if (e.target.id === "qvOverlay") closeQV(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeQV(); closeCart(); } });
const qvAdd = $("#qvAddCart");
if (qvAdd) qvAdd.addEventListener("click", () => { if (qvCode) addToCart(qvCode); });
const qvWish = $("#qvWishlist");
if (qvWish) qvWish.addEventListener("click", () => { if (qvCode) toggleWish(qvCode); });

// Preloader + init (works even if load event already fired / offline)
function hidePre() {
  const pre = $("#preloader");
  if (pre) { pre.style.opacity = "0"; pre.style.visibility = "hidden"; }
}
window.addEventListener("load", () => setTimeout(hidePre, 900));
setTimeout(hidePre, 2500);

const yearEl = $("#year");
if (yearEl) yearEl.textContent = toBn(new Date().getFullYear());

render();
renderCart();
save();

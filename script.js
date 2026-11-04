// Tati Bari shop logic — filters, search, quick-view, wishlist, cart, WhatsApp checkout
const WA_NUMBER = "8801843004246";
const $ = (s) => document.querySelector(s);
const grid = $("#productGrid"), emptyState = $("#emptyState"), resultCount = $("#resultCount");
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

let activeFilter = "all";
let searchQ = "";
let sortMode = "code";
let cart = JSON.parse(localStorage.getItem("tb_cart") || "[]");
let wishlist = new Set(JSON.parse(localStorage.getItem("tb_wish") || "[]"));

function waLink(code, extra = "") {
  const msg = `আসসালামু আলাইকুম! আমি ${code} কোডের জামদানি শাড়িটি কিনতে আগ্রহী।`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg + extra)}`;
}

function save() {
  localStorage.setItem("tb_cart", JSON.stringify(cart));
  localStorage.setItem("tb_wish", JSON.stringify([...wishlist]));
  $("#cartCount").textContent = toBn(cart.length);
  $("#wishlistCount").textContent = toBn(wishlist.size);
}

function getFiltered() {
  let list = PRODUCTS.filter((p) => {
    const fOk = activeFilter === "all" ? true : activeFilter === "wishlist" ? wishlist.has(p.code) : p.series === activeFilter;
    const q = searchQ.trim().toLowerCase();
    const sOk = !q || p.code.toLowerCase().includes(q) || p.name.includes(searchQ) || p.series.toLowerCase() === q;
    return fOk && sOk;
  });
  if (sortMode === "new") list.sort((a, b) => b.code.localeCompare(a.code));
  else if (sortMode === "az") list.sort((a, b) => a.code.localeCompare(b.code));
  else list.sort((a, b) => a.series.localeCompare(b.series) || a.num.localeCompare(b.num));
  return list;
}

function render() {
  const list = getFiltered();
  resultCount.textContent = toBn(list.length) + "টি শাড়ি";
  grid.innerHTML = list.map((p) => `
    <article class="product-card" data-code="${p.code}">
      <div class="badge">${p.code}</div>
      <div class="product-img-holder" onclick="openQV('${p.code}')">
        <img src="${p.img}" alt="${p.name_en}" loading="lazy" onerror="this.src='images/hero.jpg'">
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="price">💬 WhatsApp-এ দাম জানুন</p>
        <p class="sku">${p.series} সিরিজ • কোড ${p.code}</p>
        <div class="card-btns">
          <a class="order-btn" href="${waLink(p.code)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> অর্ডার করুন</a>
          <button class="mini-btn" title="কার্টে যোগ করুন" onclick="addToCart('${p.code}',this)">👜</button>
          <button class="mini-btn ${wishlist.has(p.code) ? "done" : ""}" title="Wishlist" onclick="toggleWish('${p.code}',this)">${wishlist.has(p.code) ? "♥" : "♡"}</button>
        </div>
      </div>
    </article>`).join("");
  emptyState.hidden = list.length > 0;
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
$("#searchInput").addEventListener("input", (e) => { searchQ = e.target.value; render(); });
$("#sortSelect").addEventListener("change", (e) => { sortMode = e.target.value; render(); });
$("#resetBtn").addEventListener("click", () => {
  searchQ = ""; $("#searchInput").value = ""; activeFilter = "all";
  document.querySelector('[data-filter="all"]').click();
});

// Wishlist / Cart
function toggleWish(code, el) {
  wishlist.has(code) ? wishlist.delete(code) : wishlist.add(code);
  render();
}
function addToCart(code, el) {
  if (!cart.includes(code)) cart.push(code);
  save(); renderCart();
  if (el) { el.classList.add("done"); setTimeout(() => el.classList.remove("done"), 900); }
}
function removeFromCart(code) { cart = cart.filter((c) => c !== code); save(); renderCart(); render(); }
$("#clearCart").addEventListener("click", () => { cart = []; save(); renderCart(); render(); });

function renderCart() {
  const body = $("#cartBody");
  if (!cart.length) {
    body.innerHTML = '<p style="text-align:center;color:#888;padding:30px 0">কার্ট খালি — পছন্দের শাড়ি 👜 বাটনে যোগ করুন</p>';
    $("#checkoutBtn").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("আসসালামু আলাইকুম! জামদানি শাড়ি কিনতে চাই।")}`;
    return;
  }
  body.innerHTML = cart.map((code) => {
    const p = PRODUCTS.find((x) => x.code === code);
    if (!p) return "";
    return `<div class="cart-row"><img src="${p.img}" alt=""><div><b>${p.name}</b><small>কোড ${p.code}</small></div><button class="rm" onclick="removeFromCart('${code}')">🗑</button></div>`;
  }).join("");
  const msg = `আসসালামু আলাইকুম! আমি এই শাড়িগুলো কিনতে চাই:\n${cart.map((c) => "• " + c).join("\n")}\nদাম ও ডেলিভারি জানালে ভালো হয়।`;
  $("#checkoutBtn").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// Drawer
const drawer = $("#cartDrawer"), overlay = $("#cartOverlay");
function openCart() { drawer.classList.add("open"); overlay.classList.add("open"); }
function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("open"); }
$("#cartBtn").addEventListener("click", openCart);
$("#wishlistBtn").addEventListener("click", () => { document.querySelector('[data-filter="wishlist"]').click(); document.getElementById("collection").scrollIntoView({ behavior: "smooth" }); closeCart(); });
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

// Quick view
let qvCode = null;
function openQV(code) {
  const p = PRODUCTS.find((x) => x.code === code);
  if (!p) return;
  qvCode = code;
  $("#qvImg").src = p.img; $("#qvImg").alt = p.name_en;
  $("#qvBadge").textContent = p.code;
  $("#qvName").textContent = p.name;
  $("#qvCode").textContent = `${p.series} সিরিজ জামদানি • কোড ${p.code}`;
  $("#qvOrder").href = waLink(p.code);
  $("#qvOverlay").classList.add("open");
}
function closeQV() { $("#qvOverlay").classList.remove("open"); }
$("#qvClose").addEventListener("click", closeQV);
$("#qvOverlay").addEventListener("click", (e) => { if (e.target.id === "qvOverlay") closeQV(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeQV(); closeCart(); } });
$("#qvAddCart").addEventListener("click", () => { addToCart(qvCode); });
$("#qvWishlist").addEventListener("click", () => { toggleWish(qvCode); });

// Nav
$("#hamburger").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));

// Preloader + init
window.addEventListener("load", () => {
  const pre = $("#preloader");
  setTimeout(() => { pre.style.opacity = "0"; pre.style.visibility = "hidden"; }, 1200);
});
setTimeout(() => { const pre = $("#preloader"); if (pre) { pre.style.opacity = "0"; pre.style.visibility = "hidden"; } }, 3500);
$("#year").textContent = toBn(new Date().getFullYear());
render();
renderCart();
save();

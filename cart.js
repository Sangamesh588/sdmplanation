(function () {

  const CART_KEY = "sdb_cart_v3";

  /* -------------------------
     LOAD & SAVE CART
  ------------------------- */
  function loadCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}");
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* -------------------------
     CARAT LOGIC (ONLY 2 ITEMS)
  ------------------------- */
  function allowCarat(sku) {
    sku = sku.trim().toLowerCase();
    return sku === "robusta" || sku === "robusta green banana";
  }

  function caratsFromKg(kg) {
    const n = Number(kg);
    if (n <= 0) return "";
    return `(${(n / 20).toFixed(2)} carats)`;
  }

  /* -------------------------
     TOTALS + DISCOUNT
  ------------------------- */
  function updateTotals(items) {
    let totalKg = 0;
    let totalAmount = 0;

    items.forEach(it => {
      totalKg += Number(it.qtyKg);
      totalAmount += Number(it.qtyKg) * Number(it.price);
    });

    const discElm = document.getElementById("discountMessage");

    if (totalKg > 60) {
      const discount = totalAmount * 0.05;
      totalAmount -= discount;
      discElm.textContent = "🎉 WOW! You received 5% discount!";
    } else {
      discElm.textContent = "";
    }

    document.getElementById("totalItems").textContent = items.length;
    document.getElementById("totalKg").textContent = totalKg;
    document.getElementById("grandTotal").textContent = totalAmount.toFixed(2);
  }

  /* -------------------------
     RENDER CART ITEMS
  ------------------------- */
  function render() {
    const cart = loadCart();
    const list = document.getElementById("cartList");
    list.innerHTML = "";

    const items = Object.values(cart);

    if (!items.length) {
      list.innerHTML = `<div class="small">Your cart is empty.</div>`;
      updateTotals([]);
      return;
    }

    items.forEach(it => {
      const sku = it.sku;
      const allow = allowCarat(sku);
      const caratText = allow ? caratsFromKg(it.qtyKg) : "";

      const row = document.createElement("div");
      row.className = "cart-item";

      row.innerHTML = `
        <div style="display:flex;gap:10px;">
          <img src="${it.img}" style="width:80px;height:80px;border-radius:8px;">

          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;">
              <h3>${it.name}</h3>
              <div style="font-weight:900;font-size:18px;">
                ₹ ${(it.qtyKg * it.price).toFixed(2)}
              </div>
            </div>

            <div>₹${it.price}/kg</div>

            <div style="margin-top:6px;display:flex;align-items:center;gap:10px;">
              <label>Qty:</label>
              <input class="qty-input"
                     type="number"
                     data-sku="${sku}"
                     value="${it.qtyKg}"
                     min="1"
                     style="width:70px;text-align:center;font-weight:700;">

              <div class="carat-label" style="color:green;font-weight:700;">
                ${caratText}
              </div>

              <button class="remove" data-sku="${sku}"
                style="background:#ffe7e7;color:#c40000;border:none;padding:6px 10px;border-radius:8px;">
                Remove
              </button>
            </div>
          </div>
        </div>
      `;

      list.appendChild(row);
    });

    updateTotals(items);
  }

  /* -------------------------
     BINDED EVENT HANDLERS
  ------------------------- */
  function bindHandlers() {
    const list = document.getElementById("cartList");

    /* Quantity Update */
    list.addEventListener("input", e => {
      if (e.target.classList.contains("qty-input")) {

        // Clean numeric input
        let val = e.target.value.replace(/[^\d]/g, "");
        if (val === "" || Number(val) < 1) val = "1";
        e.target.value = val;

        const sku = e.target.dataset.sku;
        const cart = loadCart();
        cart[sku].qtyKg = Number(val);
        saveCart(cart);

        render(); // update price instantly
      }
    });

    /* Remove item */
    list.addEventListener("click", e => {
      if (e.target.classList.contains("remove")) {
        if (!confirm("Remove this item?")) return;
        const sku = e.target.dataset.sku;
        const cart = loadCart();
        delete cart[sku];
        saveCart(cart);
        render();
      }
    });

    /* Clear cart */
    document.getElementById("clearBtn")
      .addEventListener("click", () => {
        if (!confirm("Clear cart?")) return;
        localStorage.removeItem(CART_KEY);
        render();
      });
  }

  /* -------------------------
     INIT
  ------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    render();
    bindHandlers();
  });

})();

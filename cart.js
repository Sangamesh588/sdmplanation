(function () {

  const CART_KEY = "sdb_cart_v3";

  function loadCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || "{}");
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  // ⭐ Only 2 bananas need carat
  function allowCarat(sku) {
    sku = sku.trim().toLowerCase();
    return sku === "robusta" || sku === "robusta green banana";
  }

  function caratsFromKg(kg) {
    return `(${(kg / 20).toFixed(2)} carats)`;
  }

  // ⭐ UPDATE TOTALS + DISCOUNT
  function updateTotals(items) {
    let totalKg = 0;
    let amount = 0;

    items.forEach(it => {
      totalKg += Number(it.qtyKg);
      amount += Number(it.qtyKg) * Number(it.price);
    });

    if (totalKg > 60) {
      amount = amount - amount * 0.05;
      document.getElementById("discountMessage").textContent =
        "🎉 Congratulations! You received 5% discount!";
    } else {
      document.getElementById("discountMessage").textContent = "";
    }

    document.getElementById("totalItems").textContent = items.length;
    document.getElementById("totalKg").textContent = totalKg;
    document.getElementById("grandTotal").textContent = amount.toFixed(2);
  }

  // ⭐ RENDER CART
  function render() {
    const cart = loadCart();
    const list = document.getElementById("cartList");
    list.innerHTML = "";

    const items = Object.values(cart);

    if (!items.length) {
      list.innerHTML = `<div class='small'>Your cart is empty.</div>`;
      updateTotals([]);
      return;
    }

    items.forEach(it => {
      const sku = it.sku;
      const caratShow = allowCarat(sku) ? caratsFromKg(it.qtyKg) : "";

      const row = document.createElement("div");
      row.className = "cart-item";

      row.innerHTML = `
        <img src="${it.img}" class="item-img">

        <div class="item-info">
          <h3 class="item-title">${it.name}</h3>
          <div class="item-price">₹${it.price}/kg</div>

          <div class="qty-row">
            <label>Qty:</label>

            <input type="number" 
                   class="qty-input" 
                   data-sku="${sku}"
                   value="${it.qtyKg}"
                   min="1">

            <div class="carat-label">${caratShow}</div>
          </div>

          <div class="line-total">₹ ${(it.qtyKg * it.price).toFixed(2)}</div>
        </div>

        <button class="remove" data-sku="${sku}">Remove</button>
      `;

      list.appendChild(row);
    });

    updateTotals(items);
  }

  // ⭐ BIND EVENTS
  function bindHandlers() {
    const list = document.getElementById("cartList");

    // ⭐ Quantity input (smooth phone-style input)
    list.addEventListener("input", e => {
      if (e.target.classList.contains("qty-input")) {

        let v = e.target.value.replace(/[^\d]/g, "");
        if (v === "" || Number(v) < 1) v = 1;
        e.target.value = v;

        const sku = e.target.dataset.sku;
        const cart = loadCart();
        cart[sku].qtyKg = Number(v);
        saveCart(cart);

        render(); // ⭐ updates price immediately
      }
    });

    // ⭐ Remove item
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

    // ⭐ Clear cart
    document.getElementById("clearBtn").addEventListener("click", () => {
      if (!confirm("Clear your cart?")) return;
      localStorage.removeItem(CART_KEY);
      render();
    });
  }

  // ⭐ INIT
  document.addEventListener("DOMContentLoaded", () => {
    render();
    bindHandlers();
  });

})();

// cart.js — improved: non-destructive qty input, smaller mobile images, immediate totals update
(() => {
  const CART_KEY = 'sdb_cart_v3';
  const LOG = '[cart]';
  function log(...a){ try{ console.log(LOG, ...a) }catch(e){} }
  function err(...a){ try{ console.error(LOG, ...a) }catch(e){} }

  function safeParse(v){ try{ return JSON.parse(v||'{}'); } catch(e){ err('parse error', e); return {}; } }
  function loadCart(){ return safeParse(localStorage.getItem(CART_KEY)); }

  // saveCart optionally avoids calling render (so input caret isn't lost)
  function saveCart(cart, renderNow = true){
    try{
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      if (renderNow) render();
    }catch(e){ err('save error', e) }
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  // Render whole list (used for initial render, after remove/clear, after order)
  function render(){
    const cart = loadCart();
    const list = document.getElementById('cartList');
    if (!list) { err('cartList element missing'); return; }
    list.innerHTML = '';
    const items = Object.values(cart);
    if (!items.length) {
      list.innerHTML = '<div class="small">Your cart is empty. <a href="/">Continue shopping</a>.</div>';
      updateTotals(items);
      return;
    }
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'card';
    div.className = "cart-item";
div.innerHTML = `
  <img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.name)}" class="item-img">

  <div class="item-info">
    <h3 class="item-title">${escapeHtml(it.name)}</h3>
    <div class="item-price">₹${Number(it.price).toFixed(2)} / kg</div>

    <div class="qty-row">
      <button class="qty-btn qty-minus" data-sku="${escapeHtml(it.sku)}">−</button>
      <input class="qty-input" type="number" min="1" step="1" value="${it.qtyKg}" data-sku="${escapeHtml(it.sku)}">
      <button class="qty-btn qty-plus" data-sku="${escapeHtml(it.sku)}">+</button>
    </div>

    <div class="line-total">₹${(it.qtyKg * it.price).toFixed(2)}</div>
  </div>
`;

      list.appendChild(div);
    });
    updateTotals(items);
    const totalItemsEl = document.getElementById('totalItems');
    if (totalItemsEl) totalItemsEl.textContent = items.length;
  }

  function updateTotals(items){
    items = items || Object.values(loadCart());
    const totalKg = items.reduce((s,i) => s + Number(i.qtyKg || 0), 0);
    const grand = items.reduce((s,i) => s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0);
    const totalKgEl = document.getElementById('totalKg');
    const grandEl = document.getElementById('grandTotal');
    if (totalKgEl) totalKgEl.textContent = totalKg;
    if (grandEl) grandEl.textContent = grand.toFixed(2);
    // update header/fab counts
    const count = items.length;
    const elHead = document.getElementById('cartCount'); if (elHead) elHead.textContent = count;
    const elFab = document.getElementById('cartFabCount'); if (elFab) elFab.textContent = count;
  }

  // Update only the line total DOM for a given SKU (no full re-render)
  function updateLineTotalDOM(sku){
    const cart = loadCart();
    const data = cart[sku];
    if (!data) return;
    // find the input and the .lineTotal for this sku
    const input = document.querySelector(`input.qty[data-sku="${CSS.escape(sku)}"]`);
    const line = input?.closest('.card')?.querySelector('.lineTotal');
    if (line) line.textContent = '₹' + (Number(data.qtyKg) * Number(data.price)).toFixed(2);
    updateTotals(Object.values(cart));
  }

  // Build WA message string (encoded later)
  function buildWhatsAppMessage(payload, name, phone){
    let msg = `Order from ${name} (${phone})%0A`;
    payload.items.forEach(it => { msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${it.price}/kg = ₹${(it.qtyKg*it.price).toFixed(2)}%0A`; });
    msg += `%0ATotal items: ${payload.items.length}%0ATotal kg: ${payload.totalKg}%0AGrand total: ₹${payload.totalAmount.toFixed(2)}`;
    return msg;
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    const list = document.getElementById('cartList');
// delegated handlers: clicks (remove, plus, minus) and input (manual quantity)
list.addEventListener('click', (e) => {
  // Remove button
  const rem = e.target.closest && e.target.closest('.remove');
  if (rem) {
    const sku = rem.dataset.sku;
    const cart = loadCart();
    if (cart[sku]) { delete cart[sku]; saveCart(cart, true); log('removed', sku); }
    return;
  }

  // Stepper plus/minus
  const plus = e.target.closest && e.target.closest('.qty-plus');
  const minus = e.target.closest && e.target.closest('.qty-minus');
  if (plus || minus) {
    const btn = plus || minus;
    const sku = btn.dataset.sku;
    const cart = loadCart();
    if (!cart[sku]) return;
    let cur = Number(cart[sku].qtyKg) || 0;
    cur = plus ? (cur + 1) : Math.max(1, cur - 1);
    cart[sku].qtyKg = cur;
    saveCart(cart, false);         // persist but avoid full re-render
    // update DOM input value if present
    const input = document.querySelector(`input.qty[data-sku="${CSS.escape(sku)}"]`);
    if (input) input.value = cur;
    updateLineTotalDOM(sku);
    return;
  }
});

// input handler — manual typing (no full re-render)
// Ensure llist exists and points to the cart list container
var llist = document.querySelector('#cartList') || document.querySelector('.cart-list') || document.getElementById('cartList') || document.body;
llist.addEventListener("click", (e) => {
  const plus = e.target.closest(".qty-plus");
  const minus = e.target.closest(".qty-minus");
  if (!plus && !minus) return;

  const sku = (plus || minus).dataset.sku;
  const cart = loadCart();
  if (!cart[sku]) return;

  let qty = Number(cart[sku].qtyKg);
  qty = plus ? qty + 1 : Math.max(1, qty - 1);

  cart[sku].qtyKg = qty;
  saveCart(cart);

  render();
});

list.addEventListener("input", (e) => {
  if (e.target.classList.contains("qty-input")) {
    const sku = e.target.dataset.sku;
    let v = Number(e.target.value);
    if (!v || v < 1) v = 1;

    const cart = loadCart();
    cart[sku].qtyKg = v;
    saveCart(cart);

    render();
  }
});



    document.getElementById('clearBtn')?.addEventListener('click', () => {
      if (!confirm('Clear cart?')) return;
      localStorage.removeItem(CART_KEY);
      render();
    });

    // PLACE ORDER — send to /order and WAIT for server response
    document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
      const cart = loadCart(); const items = Object.values(cart);
      if (!items.length){ alert('Cart empty'); return; }
      const name = document.getElementById('custName')?.value?.trim(); const phone = document.getElementById('custPhone')?.value?.trim();
      const address = document.getElementById('custAddress')?.value?.trim();
      if (!name || !phone || !address){ alert('Enter name, phone & address'); return; }

      const payload = {
        customer:{ name, phone, address },
        items: items.map(it => ({ sku: it.sku, name: it.name, qtyKg: Number(it.qtyKg), price: Number(it.price), img: it.img })),
        totalKg: items.reduce((s,i)=> s + Number(i.qtyKg || 0), 0),
        totalAmount: items.reduce((s,i)=> s + (Number(i.qtyKg || 0) * Number(i.price || 0)), 0)
      };

      const checkoutBtn = document.getElementById('checkoutBtn');
      const checkoutWhats = document.getElementById('checkoutWhats');
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Placing order...';
      document.getElementById('orderMsg').textContent = '';

      try {
        const res = await fetch('/order', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json && json.success) {
          document.getElementById('orderMsg').textContent = 'Thank you — our team will contact you shortly.';
          localStorage.removeItem(CART_KEY);
          render();
          if (checkoutWhats) {
            checkoutWhats.disabled = false;
            checkoutWhats.onclick = () => {
              const wa = buildWhatsAppMessage(payload, name, phone);
              window.open(`https://wa.me/918553334247?text=${encodeURIComponent(wa)}`, '_blank');
            };
          }
        } else {
          console.error('order save failed', json);
          document.getElementById('orderMsg').textContent = 'Server error saving order. Try again.';
        }
      } catch (err) {
        console.error('network/order error', err);
        document.getElementById('orderMsg').textContent = 'Network error saving order.';
      } finally {
        if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Place Order'; }
      }
    });

    const checkoutWhatsBtn = document.getElementById('checkoutWhats');
    if (checkoutWhatsBtn) {
      checkoutWhatsBtn.disabled = true;
      checkoutWhatsBtn.addEventListener('click', () => {
        const cart = loadCart(); const items = Object.values(cart);
        if (!items.length) { alert('Cart empty'); return; }
        let msg = 'Hello SDB Plantation, I would like to order:%0A';
        items.forEach(it => msg += `- ${it.name}: ${it.qtyKg} kg @ ₹${it.price}/kg = ₹${(it.qtyKg*it.price).toFixed(2)}%0A`);
        msg += `%0ATotal items: ${items.length}%0ATotal kg: ${items.reduce((s,i)=>s+Number(i.qtyKg||0),0)} kg%0AGrand total: ₹${items.reduce((s,i)=>s + (Number(i.qtyKg||0)*Number(i.price||0)),0).toFixed(2)}`;
        window.open(`https://wa.me/918553334247?text=${msg}`, '_blank');
      });
    }

    log('cart handlers bound');
  });

})();
// cart.js — lightweight, safe
(function(){
  const CART_KEY = 'cartItems';
  const cartList = document.getElementById('cartList');
  const totalItemsEl = document.getElementById('totalItems');
  const totalKgEl = document.getElementById('totalKg');
  const grandTotalEl = document.getElementById('grandTotal');
  const clearBtn = document.getElementById('clearBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const checkoutWhats = document.getElementById('checkoutWhats');

  function readCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e){ return []; } }
  function writeCart(v){ localStorage.setItem(CART_KEY, JSON.stringify(v)); window.dispatchEvent(new Event('cart.updated')); }

  function formatCurrency(n){ return (Number(n)||0).toFixed(2); }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // render cart lines (idempotent)
  function renderCart(){
    const items = readCart();
    if (!cartList) return;
    cartList.innerHTML = '';
    if (!items.length) {
      cartList.innerHTML = '<p style="color:#666">Your cart is empty.</p>';
      updateTotals(0,0,0);
      return;
    }
    for (const it of items) {
      const line = document.createElement('div');
      line.className = 'card cart-item';
      line.dataset.id = it.id;
      line.innerHTML = `
        <img src="${escapeHtml(it.image||'/images/placeholder.png')}" alt="${escapeHtml(it.name)}" class="item-img" />
        <div class="item-info">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0;font-size:16px">${escapeHtml(it.name)}</h3>
            <button class="remove-btn remove" data-id="${escapeHtml(it.id)}" type="button">Remove</button>
          </div>
          <div style="margin-top:6px;color:#6b7280">₹ ${formatCurrency(it.price)} / kg</div>
          <div style="margin-top:8px">Quantity: <strong class="display-qty">${escapeHtml(String(it.qty))}</strong> kg</div>
        </div>
        <div class="controls">
          <div class="lineTotal">₹ ${formatCurrency(it.price * it.qty)}</div>
        </div>
      `;
      cartList.appendChild(line);
    }
    // update totals after DOM updated
    const totalKg = items.reduce((s,i)=> s + (Number(i.qty)||0), 0);
    const totalItems = items.reduce((s,i)=> s + (i.qty > 0 ? 1 : 0), 0);
    const grand = items.reduce((s,i)=> s + (Number(i.price)||0) * (Number(i.qty)||0), 0);
    updateTotals(totalItems, totalKg, grand);
  }

  function updateTotals(totalItems, totalKg, grand) {
    if (totalItemsEl) totalItemsEl.textContent = String(totalItems);
    if (totalKgEl) totalKgEl.textContent = String(totalKg);
    if (grandTotalEl) grandTotalEl.textContent = formatCurrency(grand);
  }

  // remove item event (delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    if (!confirm('Remove this item from cart?')) return;
    let cart = readCart();
    cart = cart.filter(it => it.id !== id);
    writeCart(cart);
    renderCart();
  });

  // clear cart
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear entire cart?')) return;
      localStorage.removeItem(CART_KEY);
      renderCart();
      alert('Cart cleared.');
    });
  }

  // submit order
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      const cart = readCart();
      if (!cart.length) return alert('Cart is empty.');
      const payload = {
        items: cart,
        cartTotal: cart.reduce((s,i)=> s + (Number(i.price)||0) * (Number(i.qty)||0), 0),
        customer: {
          name: document.getElementById('custName')?.value || '',
          phone: document.getElementById('custPhone')?.value || '',
          address: document.getElementById('custAddress')?.value || ''
        },
        createdAt: new Date().toISOString()
      };
      // basic validation
      if (!payload.customer.name || !payload.customer.phone || !payload.customer.address) {
        if (!confirm('Customer details incomplete. Submit anyway?')) return;
      }
      try {
        const res = await fetch('/api/submit-order', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text().catch(()=>'<no-text>');
          console.error('Server error', res.status, txt);
          // fallback save
          savePendingOrder(payload);
          alert('Server error — order saved locally.');
          return;
        }
        alert('Order submitted successfully!');
        localStorage.removeItem(CART_KEY);
        renderCart();
      } catch (err) {
        console.error('Submit error', err);
        savePendingOrder(payload);
        alert('Network error — order saved locally.');
      }
    });
  }

  // WhatsApp confirm
  if (checkoutWhats) {
    checkoutWhats.addEventListener('click', () => {
      const cart = readCart();
      if (!cart.length) return alert('Cart empty.');
      let msg = 'Order from SDB Plantation:%0A';
      for (const it of cart) {
        msg += `${it.name} — ${it.qty} kg — ₹${formatCurrency(it.price * it.qty)}%0A`;
      }
      msg += `%0ATotal: ₹${formatCurrency(cart.reduce((s,i)=> s + i.price * i.qty,0))}%0A`;
      msg += `Name: ${document.getElementById('custName')?.value || '-'}%0APhone: ${document.getElementById('custPhone')?.value || '-'}`;
      const phone = '918553334247';
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    });
  }

  function savePendingOrder(payload){
    try {
      const key = 'pendingOrders';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(payload);
      localStorage.setItem(key, JSON.stringify(arr));
      console.log('Saved pending order', payload);
    } catch (e) { console.warn(e); }
  }

  // initialize
  document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    // re-render when other tab updates cart
    window.addEventListener('storage', (ev) => {
      if (ev.key === null || ev.key === 'cartItems' || ev.key === 'cartUpdatedAt') renderCart();
    });
  });
})();

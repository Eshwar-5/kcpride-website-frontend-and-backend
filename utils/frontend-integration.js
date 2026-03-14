// ─────────────────────────────────────────────────────────────────────────
//  KC Pride — Frontend Payment Integration (Supabase backend)
//
//  SETUP:
//  1. Add this script tag in <head> of your HTML files:
//     <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
//
//  2. Replace the existing placeOrder() function with the one below.
//
//  3. Change API_BASE to your deployed server URL when going live.
// ─────────────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:5000'; // ← change to live URL when deployed

async function placeOrder() {
  // Validate card
  if (payMethod === 'card') {
    const num = (document.getElementById('p-card-num') || document.getElementById('card-num'))
                  ?.value.replace(/\s/g, '');
    if (!num || num.length < 16) { showToast('Please enter a valid card number.'); return; }
  }

  // Collect form values (works for both kc-pride.html and kc-pride-collection.html)
  const g = (id1, id2) => (document.getElementById(id1) || document.getElementById(id2))?.value?.trim() || '';
  const fname   = g('p-fname',   'fname');
  const lname   = g('p-lname',   'lname');
  const email   = g('p-email',   'email');
  const phone   = g('p-phone',   'phone');
  const address = g('p-address', 'address');
  const city    = g('p-city',    'city');
  const pin     = g('p-pin',     'pincode');
  const state   = g('p-state',   'state');

  // Build totals
  const subtotal     = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt  = appliedCoupon ? Math.round(subtotal * appliedCoupon.pct / 100) : 0;
  const discounted   = subtotal - discountAmt;
  const deliveryCost = discounted >= 999 ? 0 : 99;
  const total        = discounted + deliveryCost;

  const payload = {
    customer:        { firstName: fname, lastName: lname, email, phone },
    delivery:        { address, city, pincode: pin, state },
    items:           cart.map(c => ({ productId: c.id, name: c.name, price: c.price, qty: c.qty, size: c.size || 'M' })),
    subtotal,
    discount:        discountAmt,
    coupon:          appliedCoupon?.code || null,
    delivery_charge: deliveryCost,
    total,
    paymentMethod:   payMethod,
  };

  try {
    showToast('Processing your order...');

    const res  = await fetch(`${API_BASE}/api/payment/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) { showToast(data.message || 'Order creation failed.'); return; }

    // COD — done
    if (data.cod) { _showSuccess(data.orderId); return; }

    // Online payment via Razorpay
    const rzp = new Razorpay({
      key:         data.razorpayKeyId,
      amount:      data.amount,
      currency:    data.currency,
      name:        'KC Pride',
      description: 'Premium Formal Shirts',
      order_id:    data.razorpayOrderId,
      prefill:     { name: data.customerName, email: data.customerEmail, contact: data.customerPhone },
      theme:       { color: '#2563b0' },
      handler: async (response) => {
        const vRes = await fetch(`${API_BASE}/api/payment/verify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...response, _id: data._id }),
        });
        const vData = await vRes.json();
        vData.success ? _showSuccess(vData.orderId) : showToast('Payment verification failed. Contact us.');
      },
      modal: { ondismiss: () => showToast('Payment cancelled. Your cart is saved.') },
    });
    rzp.open();

  } catch (err) {
    console.error('Order error:', err);
    showToast('Something went wrong. Please try again.');
  }
}

function _showSuccess(orderId) {
  const el = document.getElementById('p-order-id') || document.getElementById('order-id');
  if (el) el.textContent = orderId;
  document.querySelectorAll('.p-section, .payment-section').forEach(s => s.classList.remove('active'));
  const successEl = document.getElementById('psec-success');
  if (successEl) successEl.classList.add('active');
  document.querySelectorAll('.pstep').forEach(s => s.classList.add('done'));
  cart = []; appliedCoupon = null;
  saveCart?.();
  updateBadge?.();
  updateCartBadge?.();
  if (typeof renderGrid === 'function') renderGrid();
}

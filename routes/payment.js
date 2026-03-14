const express  = require('express');
const router   = express.Router();
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { createOrder, getOrderById, updateOrderById, addStatusHistory } = require('../models/Order');
const { sendOrderConfirmation }  = require('../utils/email');
const { notifyOwnerNewOrder, notifyCustomerConfirmation } = require('../utils/whatsapp');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── POST /api/payment/create-order ───────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const { customer, delivery, items, subtotal, discount, coupon, delivery_charge, total, paymentMethod } = req.body;

    if (!customer?.email || !customer?.phone || !items?.length || !total) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Save order to Supabase
    const order = await createOrder({
      customer, delivery, items,
      subtotal, discount, coupon,
      delivery_charge, total, paymentMethod,
    });

    // COD — no payment gateway needed
    if (paymentMethod === 'cod') {
      const updated = await updateOrderById(order.id, {
        payment_status: 'pending',
        status: 'confirmed',
      });
      await addStatusHistory(order.order_id, 'confirmed', 'COD order confirmed');

      try { await sendOrderConfirmation({ ...updated, order_items: items }); await updateOrderById(order.id, { email_sent: true }); } catch(e) { console.error('Email:', e.message); }
      try { await notifyOwnerNewOrder({ ...updated, order_items: items }); await notifyCustomerConfirmation(updated); await updateOrderById(order.id, { whatsapp_sent: true }); } catch(e) { console.error('WA:', e.message); }

      return res.json({ success: true, cod: true, orderId: order.order_id, _id: order.id });
    }

    // Online payment — create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   total * 100,
      currency: 'INR',
      receipt:  order.order_id,
      notes:    { orderId: order.order_id, customer: customer.firstName },
    });

    await updateOrderById(order.id, { razorpay_order_id: rzpOrder.id });

    res.json({
      success:          true,
      razorpayOrderId:  rzpOrder.id,
      razorpayKeyId:    process.env.RAZORPAY_KEY_ID,
      amount:           total * 100,
      currency:         'INR',
      orderId:          order.order_id,
      _id:              order.id,
      customerName:     `${customer.firstName} ${customer.lastName || ''}`.trim(),
      customerEmail:    customer.email,
      customerPhone:    customer.phone,
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ─── POST /api/payment/verify ─────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, _id } = req.body;

    // Verify HMAC SHA256 signature — this proves the payment is real
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update order in Supabase
    const updated = await updateOrderById(_id, {
      razorpay_payment_id,
      razorpay_signature,
      payment_status: 'paid',
      status:         'confirmed',
    });

    await addStatusHistory(updated.order_id, 'confirmed', 'Payment verified via Razorpay');

    // Fetch items for notifications
    const supabase = require('../config/supabase');
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', updated.order_id);

    try { await sendOrderConfirmation({ ...updated, order_items: items }); await updateOrderById(_id, { email_sent: true }); } catch(e) { console.error('Email:', e.message); }
    try { await notifyOwnerNewOrder({ ...updated, order_items: items }); await notifyCustomerConfirmation(updated); await updateOrderById(_id, { whatsapp_sent: true }); } catch(e) { console.error('WA:', e.message); }

    res.json({ success: true, orderId: updated.order_id });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;

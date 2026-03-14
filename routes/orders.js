const express = require('express');
const router  = express.Router();
const { getOrderByOrderId, updateOrder, addStatusHistory, getAllOrders, getStats } = require('../models/Order');
const { protect } = require('../middleware/auth');
const { sendStatusUpdate }           = require('../utils/email');
const { notifyCustomerStatusUpdate } = require('../utils/whatsapp');

// ─── GET /api/orders/track/:orderId  (public — customer tracking) ──────────
router.get('/track/:orderId', async (req, res) => {
  try {
    const order = await getOrderByOrderId(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Return limited fields to customer
    res.json({
      success: true,
      order: {
        order_id:       order.order_id,
        status:         order.status,
        tracking_id:    order.tracking_id,
        first_name:     order.first_name,
        total:          order.total,
        created_at:     order.created_at,
        statusHistory:  order.order_status_history || [],
        items:          (order.order_items || []).map(i => ({ name: i.name, size: i.size, qty: i.qty })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/orders/admin/login ─────────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const jwt   = require('jsonwebtoken');
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// ─── GET /api/orders/admin/all  (admin — all orders with filters) ──────────
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const { orders, total } = await getAllOrders({ status, page: +page, limit: +limit, search });
    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/orders/admin/stats  (admin dashboard numbers) ───────────────
router.get('/admin/stats', protect, async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/orders/admin/:orderId/status  (admin — update + notify) ───
router.patch('/admin/:orderId/status', protect, async (req, res) => {
  try {
    const { status, note, trackingId, notifyCustomer } = req.body;
    const validStatuses = ['placed','confirmed','processing','shipped','delivered','cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updates = { status };
    if (trackingId) updates.tracking_id = trackingId;

    const order = await updateOrder(req.params.orderId, updates);
    await addStatusHistory(order.order_id, status, note || `Status updated to ${status}`);

    if (notifyCustomer) {
      const messages = {
        confirmed:  `✅ Your KC Pride order *${order.order_id}* is confirmed!`,
        processing: `🔄 Your KC Pride order *${order.order_id}* is being prepared.`,
        shipped:    `🚚 Your KC Pride order *${order.order_id}* has been shipped!\nTracking: *${trackingId || 'N/A'}*`,
        delivered:  `📦 Your KC Pride order *${order.order_id}* has been delivered. Enjoy your shirts! 👔`,
        cancelled:  `❌ Your KC Pride order *${order.order_id}* was cancelled. Contact us if this is a mistake.`,
      };
      try { await sendStatusUpdate(order, messages[status] || `Order status: ${status}`); } catch(e) { console.error('Email:', e.message); }
      try { await notifyCustomerStatusUpdate(order, messages[status]); } catch(e) { console.error('WA:', e.message); }
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendOrderConfirmation = async (order) => {
  const items = order.order_items || order.items || [];
  const itemsHTML = items.map(i => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #f0ece6;">👔 ${i.name} (${i.size})</td>
      <td style="padding:10px;border-bottom:1px solid #f0ece6;text-align:center;">×${i.qty}</td>
      <td style="padding:10px;border-bottom:1px solid #f0ece6;text-align:right;font-weight:600;">₹${i.price * i.qty}</td>
    </tr>`).join('');

  const html = `
  <!DOCTYPE html><html><body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f9f7f5;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e1117,#2563b0);padding:32px;text-align:center;">
      <div style="font-size:2.2rem;font-weight:700;letter-spacing:0.1em;color:white;">KC <span style="color:#e05a22;">Pride</span></div>
      <div style="color:rgba(255,255,255,0.5);font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;margin-top:6px;">Premium Formal Shirts</div>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 6px;color:#0e1117;">Order Confirmed! 🎉</h2>
      <p style="margin:0 0 24px;color:#888;font-size:0.85rem;">Hi ${order.first_name}, thank you for shopping with KC Pride.</p>
      <div style="background:#f9f7f5;border-radius:4px;padding:12px 16px;margin-bottom:24px;display:inline-block;">
        <span style="font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;color:#aaa;">Order ID</span><br>
        <span style="font-weight:700;color:#e05a22;font-size:1rem;">${order.order_id}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f9f7f5;">
          <th style="padding:10px;text-align:left;font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;">Item</th>
          <th style="padding:10px;text-align:center;font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;">Qty</th>
          <th style="padding:10px;text-align:right;font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:#aaa;">Price</th>
        </tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <div style="border-top:2px solid #0e1117;padding-top:12px;">
        ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem;color:#1a7a44;"><span>Discount (${order.coupon})</span><span>-₹${order.discount}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem;color:#555;"><span>Delivery</span><span>${order.delivery_charge === 0 ? 'FREE' : '₹' + order.delivery_charge}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;color:#0e1117;"><span>Total</span><span>₹${order.total}</span></div>
      </div>
      <div style="margin-top:24px;background:#f9f7f5;border-radius:4px;padding:16px;">
        <div style="font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;color:#aaa;margin-bottom:6px;">Delivering To</div>
        <div style="font-size:0.85rem;color:#444;line-height:1.7;">${order.first_name} ${order.last_name || ''}<br>${order.address}<br>${order.city} – ${order.pincode}, ${order.state}</div>
      </div>
      <p style="margin-top:24px;font-size:0.8rem;color:#888;line-height:1.7;">
        Your shirts are being prepared with care. We'll send a tracking link once shipped.<br><br>
        Questions? <a href="https://wa.me/919876543210" style="color:#2563b0;">WhatsApp us</a>
      </p>
    </div>
    <div style="background:#0e1117;padding:20px;text-align:center;">
      <p style="margin:0;font-size:0.7rem;color:rgba(255,255,255,0.3);">© 2025 KC Pride · Premium Formal Shirts · Chennai</p>
    </div>
  </div>
  </body></html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to:   order.email,
    subject: `Order Confirmed – ${order.order_id} | KC Pride`,
    html,
  });
};

const sendStatusUpdate = async (order, message) => {
  const colors = { confirmed:'#2563b0', processing:'#e05a22', shipped:'#1a7a44', delivered:'#1a7a44', cancelled:'#c0392b' };
  const color  = colors[order.status] || '#2563b0';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to:   order.email,
    subject: `Order ${order.order_id} – ${order.status.charAt(0).toUpperCase() + order.status.slice(1)} | KC Pride`,
    html: `
    <div style="max-width:520px;margin:32px auto;font-family:Arial,sans-serif;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <div style="background:${color};padding:24px;text-align:center;">
        <div style="font-size:1.8rem;font-weight:700;color:white;">KC <span style="color:#f9d5c2;">Pride</span></div>
        <div style="color:rgba(255,255,255,0.8);font-size:0.9rem;margin-top:8px;">Order Update</div>
      </div>
      <div style="padding:28px;">
        <p style="font-size:1rem;color:#0e1117;">Hi ${order.first_name},</p>
        <p style="font-size:0.9rem;color:#555;line-height:1.7;">${message}</p>
        <div style="background:#f9f7f5;border-radius:4px;padding:14px;margin-top:16px;font-size:0.85rem;color:#555;">
          Order ID: <strong style="color:#e05a22;">${order.order_id}</strong><br>
          Status: <strong style="color:${color};">${order.status.toUpperCase()}</strong>
          ${order.tracking_id ? `<br>Tracking: <strong>${order.tracking_id}</strong>` : ''}
        </div>
      </div>
    </div>`,
  });
};

module.exports = { sendOrderConfirmation, sendStatusUpdate };

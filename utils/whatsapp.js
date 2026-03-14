const twilio = require('twilio');

const getClient = () => twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const notifyOwnerNewOrder = async (order) => {
  const items = order.order_items || order.items || [];
  const itemsList = items.map(i => `  • ${i.name} (${i.size}) ×${i.qty}`).join('\n');

  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   process.env.OWNER_WHATSAPP,
    body:
      `🛍️ *New Order — KC Pride*\n\n` +
      `*Order ID:* ${order.order_id}\n` +
      `*Customer:* ${order.first_name} ${order.last_name || ''}\n` +
      `*Phone:* ${order.phone}\n` +
      `*Email:* ${order.email}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total:* ₹${order.total}\n` +
      `*Payment:* ${{ card:'Card', upi:'UPI', cod:'Cash on Delivery' }[order.payment_method]}\n` +
      `*Delivery:* ${order.city}, ${order.state} – ${order.pincode}`,
  });
};

const notifyCustomerConfirmation = async (order) => {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   `whatsapp:${order.phone}`,
    body:
      `✅ *Order Confirmed — KC Pride*\n\n` +
      `Hi ${order.first_name}! Your order has been placed successfully.\n\n` +
      `*Order ID:* ${order.order_id}\n` +
      `*Total:* ₹${order.total}\n\n` +
      `We'll notify you once your shirts are shipped.\n\n` +
      `_Thank you for shopping with KC Pride_ 👔`,
  });
};

const notifyCustomerStatusUpdate = async (order, message) => {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   `whatsapp:${order.phone}`,
    body: message,
  });
};

module.exports = { notifyOwnerNewOrder, notifyCustomerConfirmation, notifyCustomerStatusUpdate };

const supabase = require('../config/supabase');

// Generate a unique order ID like KCP123ABC
const generateOrderId = () =>
  'KCP' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-3).toUpperCase();

// ─── CREATE ORDER ─────────────────────────────────────────────────────────
const createOrder = async (orderData) => {
  const orderId = generateOrderId();

  // 1. Insert into orders table
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_id:          orderId,
      first_name:        orderData.customer.firstName,
      last_name:         orderData.customer.lastName || null,
      email:             orderData.customer.email.toLowerCase(),
      phone:             orderData.customer.phone,
      address:           orderData.delivery.address,
      city:              orderData.delivery.city,
      pincode:           orderData.delivery.pincode,
      state:             orderData.delivery.state,
      subtotal:          orderData.subtotal,
      discount:          orderData.discount || 0,
      coupon:            orderData.coupon || null,
      delivery_charge:   orderData.delivery_charge || 0,
      total:             orderData.total,
      payment_method:    orderData.paymentMethod,
      payment_status:    'pending',
      status:            'placed',
    })
    .select()
    .single();

  if (orderError) throw new Error('DB Error creating order: ' + orderError.message);

  // 2. Insert order items
  const items = orderData.items.map(item => ({
    order_id:   orderId,
    product_id: item.productId,
    name:       item.name,
    price:      item.price,
    qty:        item.qty,
    size:       item.size,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) throw new Error('DB Error saving items: ' + itemsError.message);

  // 3. Insert initial status history
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status:   'placed',
    note:     'Order placed by customer',
  });

  return { ...order, items: orderData.items };
};

// ─── GET ORDER BY order_id STRING ─────────────────────────────────────────
const getOrderByOrderId = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .eq('order_id', orderId.toUpperCase())
    .single();

  if (error) return null;
  return data;
};

// ─── GET ORDER BY UUID (internal id) ──────────────────────────────────────
const getOrderById = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
};

// ─── UPDATE ORDER ──────────────────────────────────────────────────────────
const updateOrder = async (orderId, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw new Error('DB Error updating order: ' + error.message);
  return data;
};

// ─── UPDATE ORDER BY UUID ──────────────────────────────────────────────────
const updateOrderById = async (id, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('DB Error updating order: ' + error.message);
  return data;
};

// ─── ADD STATUS HISTORY ENTRY ──────────────────────────────────────────────
const addStatusHistory = async (orderId, status, note) => {
  await supabase.from('order_status_history').insert({ order_id: orderId, status, note });
};

// ─── GET ALL ORDERS (admin) ────────────────────────────────────────────────
const getAllOrders = async ({ status, page = 1, limit = 20, search } = {}) => {
  let query = supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status && status !== 'all') query = query.eq('status', status);

  if (search) {
    query = query.or(
      `order_id.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,first_name.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error('DB Error fetching orders: ' + error.message);

  return { orders: data, total: count };
};

// ─── GET STATS (admin dashboard) ──────────────────────────────────────────
const getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalOrders },
    { data: revenueData },
    { count: pendingOrders },
    { count: todayOrders },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total').in('payment_status', ['paid', 'pending']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['placed', 'confirmed', 'processing']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
  ]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + o.total, 0) || 0;

  return { totalOrders, totalRevenue, pendingOrders, todayOrders };
};

module.exports = {
  createOrder,
  getOrderByOrderId,
  getOrderById,
  updateOrder,
  updateOrderById,
  addStatusHistory,
  getAllOrders,
  getStats,
};

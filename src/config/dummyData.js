// Dummy Data Generator
export const generateDummyOrders = (count = 10) => {
  const orders = [];
  const statuses = ['pending', 'preparing', 'completed'];
  const deliveryTypes = ['dine-in', 'takeaway', 'delivery'];
  const itemsList = [
    { name: 'Cheeseburger', price: 12.99 },
    { name: 'French Fries', price: 4.99 },
    { name: 'Coca Cola', price: 2.99 },
    { name: 'Margherita Pizza', price: 15.99 },
    { name: 'Caesar Salad', price: 8.99 },
    { name: 'Spaghetti Carbonara', price: 14.99 },
    { name: 'Garlic Bread', price: 5.99 },
    { name: 'Vanilla Ice Cream', price: 3.99 },
    { name: 'Chicken Wings', price: 12.99 },
    { name: 'Beer', price: 5.99 }
  ];

  for (let i = 1; i <= count; i++) {
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const randomItem = itemsList[Math.floor(Math.random() * itemsList.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      items.push({
        id: j + 1,
        name: randomItem.name,
        quantity,
        price: randomItem.price,
        notes: Math.random() > 0.7 ? 'Extra sauce' : ''
      });
      subtotal += randomItem.price * quantity;
    }

    const tax = subtotal * 0.08;
    const tip = subtotal * 0.15;
    const total = subtotal + tax + tip;

    orders.push({
      id: `ORD${1000 + i}`,
      orderNumber: `#${1000 + i}`,
      customerName: `Customer ${i}`,
      customerPhone: `+1${Math.floor(Math.random() * 900000000) + 100000000}`,
      items,
      total: parseFloat(total.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      tip: parseFloat(tip.toFixed(2)),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      tableNumber: `T${Math.floor(Math.random() * 20) + 1}`,
      deliveryType: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)],
      orderType: 'kitchen'
    });
  }

  return orders;
};

export const dummyUserData = {
  id: 'user_001',
  name: 'Kitchen Manager',
  email: 'kitchen@example.com',
  role: 'kitchen',
  restaurant: 'Main Restaurant'
};
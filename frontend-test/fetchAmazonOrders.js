// fetchAmazonOrders.js
const fetch = require('node-fetch'); // If Node <18, install: npm install node-fetch

// Replace this with your actual API endpoint or JSON file path
const AMAZON_ORDERS_API_URL = 'https://example.com/your-amazon-orders-api-or-json';

async function getAmazonOrders() {
  try {
    // If your data is in a local JSON file, you can do:
    // const data = require('./orders.json');

    // Or fetch from API:
    const response = await fetch(AMAZON_ORDERS_API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    // Assuming orders are in data.Orders array (adjust if different)
    const orders = data.Orders || data.orders || [];

    if (orders.length === 0) {
      console.log('No orders found in data.');
      return;
    }

    orders.forEach(order => {
      const orderId = order.AmazonOrderId || 'N/A';
      const buyerEmail = order.BuyerInfo?.BuyerEmail || 'N/A';
      const purchaseDate = order.PurchaseDate || 'N/A';
      const status = order.OrderStatus || 'N/A';
      const totalAmount = order.OrderTotal?.Amount || 'N/A';
      const currency = order.OrderTotal?.CurrencyCode || 'N/A';

      const shipAddr = order.ShippingAddress || {};
      const city = shipAddr.City || 'N/A';
      const state = shipAddr.StateOrRegion || 'N/A';
      const postalCode = shipAddr.PostalCode || 'N/A';

      console.log('------------------------------');
      console.log(`Order ID: ${orderId}`);
      console.log(`Buyer Email: ${buyerEmail}`);
      console.log(`Purchase Date: ${purchaseDate}`);
      console.log(`Status: ${status}`);
      console.log(`Order Total: ${totalAmount} ${currency}`);
      console.log(`Shipping Address: ${city}, ${state} ${postalCode}`);
    });

  } catch (error) {
    console.error('Error fetching or processing data:', error);
  }
}

getAmazonOrders();

// api.js
// const API_BASE_URL = 'http://127.0.0.1:3001'; // USB + ADB reverse
const API_BASE_URL = 'https://pocendpoint.momentsview.com'; // USB + ADB reverse

// Helper for GET requests
const get = async (url) => {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${url} failed: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (error) {
    console.error('API GET Error:', error.message);
    throw error;
  }
};

// Helper for POST requests
const post = async (url, data) => {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`POST ${url} failed: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (error) {
    console.error('API POST Error:', error.message);
    throw error;
  }
};

// Helper for PATCH requests
const patch = async (url, data) => {
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PATCH ${url} failed: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (error) {
    console.error('API PATCH Error:', error.message);
    throw error;
  }
};

// API endpoints
export const orderApi = {
  getAllOrders: () => get('/mobileapi/orders'),
  getOrdersByStatus: (status) => get(`/orders?status=${status}`),
  getTodaysOrders: () => get('/orders/today'),
  getOrderById: (id) => get(`/orders/${id}`),
updateOrderStatus: ({ orderNumber, receiptPrinted }) =>
  patch('/mobileapi/orders/print-status', {
    orderNumber,
    receiptPrinted
  }),  markAsPrinted: (id) => post(`/orders/${id}/print`, {}),
  getPrinterJobs: (deviceId) => get(`/printer/jobs?deviceId=${deviceId}`),
  registerPrinter: (data) => post('/printer/register', data),
  sendPrintAck: (data) => post('/printer/acknowledge', data),
  logReprint: (data) => post('/printer/reprint-log', data),
};

export default orderApi;

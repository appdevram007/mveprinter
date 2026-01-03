import { USE_REAL_API, API_BASE_URL } from '../config/constants';
import { generateDummyOrders, dummyUserData } from '../config/dummyData';

export const apiRequest = async (endpoint, method = 'GET', data = null, authToken = null) => {
  if (!USE_REAL_API) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (endpoint) {
      case '/auth/login':
        if (data?.pin === '123456') {
          return {
            success: true,
            token: 'dummy_jwt_token',
            user: dummyUserData
          };
        }
        return { success: false, message: 'Invalid credentials' };
      
      case '/auth/forgot-password':
        return { success: true, message: 'Reset email sent' };
      
      case '/auth/reset-password':
        return { success: true, message: 'Password reset successful' };
      
      case '/orders':
        return {
          success: true,
          orders: generateDummyOrders(15)
        };
      
      case '/auth/logout':
        return { success: true };
      
      default:
        if (endpoint.startsWith('/orders/') && endpoint.endsWith('/status')) {
          return { success: true, message: 'Status updated' };
        }
        if (endpoint.startsWith('/orders/') && endpoint.endsWith('/print')) {
          return { success: true, message: 'Printed successfully' };
        }
        return { success: false, message: 'Endpoint not implemented' };
    }
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};
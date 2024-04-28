const request = require('supertest');
const app = require('./index');
const Order = require('./Order');

describe('GET /order/orders', () => {
  it('responds with JSON containing orders for the user', async () => {
    // Mock user authentication
    const mockUser = { email: 'test@example.com' };
    const isAuthenticatedMock = jest.fn((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Mock orders data
    const mockOrders = [
      { user: 'test@example.com', products: ['product1', 'product2'], total_price: 100 },
      { user: 'test@example.com', products: ['product3'], total_price: 50 }
    ];

    // Mock Order.find() function
    Order.find = jest.fn().mockResolvedValue(mockOrders);

    // Send request to the route
    const response = await request(app)
      .get('/order/orders')
      .expect('Content-Type', /json/)
      .expect(200);

    // Check if response contains orders for the user
    expect(response.body.orders).toEqual(mockOrders);
  });

  it('responds with message when no orders found for user', async () => {
    // Mock user authentication
    const mockUser = { email: 'test@example.com' };
    const isAuthenticatedMock = jest.fn((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Mock Order.find() function returning empty array
    Order.find = jest.fn().mockResolvedValue([]);

    // Send request to the route
    const response = await request(app)
      .get('/order/orders')
      .expect('Content-Type', /json/)
      .expect(200);

    // Check if response contains message indicating no orders found
    expect(response.body.message).toBe('No orders found for user');
  });

  it('responds with status 500 and error message on internal server error', async () => {
    // Mock user authentication
    const mockUser = { email: 'test@example.com' };
    const isAuthenticatedMock = jest.fn((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Mock Order.find() function throwing an error
    Order.find = jest.fn().mockRejectedValue(new Error('Database error'));

    // Send request to the route
    const response = await request(app)
      .get('/order/orders')
      .expect('Content-Type', /json/)
      .expect(500);

    // Check if response contains error message
    expect(response.body.error).toBe('Internal Server Error');
  });
});

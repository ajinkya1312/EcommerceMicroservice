const request = require('supertest');
const app = require('./index');

// Test case for GET /product/products
describe('GET /product/products', () => {
  it('responds with JSON containing all products', async () => {
    const response = await request(app)
      .get('/product/products')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

// Test case for POST /product/buy
describe('POST /product/buy', () => {
  it('responds with JSON indicating successful order placement', async () => {
    const productsToBuy = { ids: ['product_id_1', 'product_id_2'] };

    const response = await request(app)
      .post('/product/buy')
      .send(productsToBuy)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ message: 'order placed successfully' });
  });
});

// Test case for POST /product/update
describe('POST /product/update', () => {
  it('responds with JSON containing the updated product', async () => {
    const productUpdate = {
      id: 'product_id_1',
      price: 20.99,
      version: 1
    };

    const response = await request(app)
      .post('/product/update')
      .send(productUpdate)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.price).toEqual(productUpdate.price);
  });
});

// Test case for POST /product/delete
describe('POST /product/delete', () => {
  it('responds with JSON indicating successful product deletion', async () => {
    const productToDelete = { id: 'product_id_1' };

    const response = await request(app)
      .post('/product/delete')
      .send(productToDelete)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ message: 'Product removed' });
  });
});

// Test case for POST /product/create
describe('POST /product/create', () => {
  it('responds with JSON containing the newly created product', async () => {
    const newProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 10.99
    };

    const response = await request(app)
      .post('/product/create')
      .send(newProduct)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.name).toEqual(newProduct.name);
    expect(response.body.description).toEqual(newProduct.description);
    expect(response.body.price).toEqual(newProduct.price);
  });
});


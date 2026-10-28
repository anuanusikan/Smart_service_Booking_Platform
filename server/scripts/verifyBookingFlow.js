// Uses a dedicated database, never the database named in MONGO_URI.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { once } = require('node:events');
const app = require('../index');
const Job = require('../models/Job');

async function main() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) throw new Error('MONGO_URI and JWT_SECRET are required');
  const dbName = `skilllink_verification_${Date.now()}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 15000 });
    console.log(`Isolated verification database: ${dbName}`);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, method = 'GET', body, token, expected = 200) {
      const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const data = await response.json();
      assert.equal(response.status, expected, `${method} ${path}: ${data.message || 'unexpected status'}`);
      return data;
    }
    const password = 'DemoOnly123!';
    const accounts = {};
    for (const role of ['customer', 'provider']) {
      const email = `${role}@example.test`;
      await request('/auth/register', 'POST', { name: `Demo ${role}`, email, password, role, skills: role === 'provider' ? ['Plumbing'] : [], location: 'Kandy' }, null, 201);
      accounts[role] = await request('/auth/login', 'POST', { email, password, role });
    }
    const customer = accounts.customer.token;
    const provider = accounts.provider.token;
    const details = { title: 'Verification kitchen tap', description: 'Repair a leaking kitchen tap for verification', category: 'Plumbing', location: 'Kandy', budget: 2000 };
    const { job } = await request('/jobs', 'POST', details, customer, 201);
    await request(`/jobs/${job._id}`, 'PUT', { budget: 3000 }, customer);
    const results = await request('/jobs/matched?title=kitchen&location=Kandy&minBudget=2500&sort=budget_asc', 'GET', undefined, provider);
    assert.ok(results.some(item => item._id === job._id && item.budget === 3000));
    assert.equal((await request('/jobs/matched?maxBudget=100', 'GET', undefined, provider)).length, 0);
    const { job: removed } = await request('/jobs', 'POST', { ...details, title: 'Verification delete job' }, customer, 201);
    await request(`/jobs/${removed._id}`, 'DELETE', undefined, customer);
    assert.equal((await request('/jobs')).some(item => item._id === removed._id), false);
    console.log('PASS: registration, login, job create/read/update/delete, provider filtering and sorting');
    const { quote } = await request('/quotes', 'POST', { jobId: job._id, price: 2750, message: 'Can repair the tap' }, provider, 201);
    await request(`/quotes/${quote._id}/accept`, 'PUT', {}, customer);
    const bookings = await request('/bookings/mine', 'GET', undefined, customer);
    const booking = bookings.find(item => item.job._id === job._id);
    assert.ok(booking);
    assert.equal(booking.agreedPrice, 2750);
    await request(`/messages/${booking._id}`, 'POST', { text: 'Please confirm the appointment.' }, customer, 201);
    const thread = await request(`/messages/${booking._id}`, 'GET', undefined, provider);
    assert.ok(thread.some(item => item.text === 'Please confirm the appointment.'));
    await request(`/bookings/${booking._id}`, 'PUT', { status: 'completed' }, customer);
    await request('/reviews', 'POST', { bookingId: booking._id, rating: 5, comment: 'Verification review' }, customer, 201);
    console.log('PASS: quote acceptance transaction, agreed price, messaging, completion and review');
    await mongoose.disconnect();
    await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 15000 });
    assert.equal((await Job.findById(job._id)).status, 'completed');
    assert.equal((await Job.findById(removed._id)).status, 'deleted');
    console.log('PASS: data persists after database disconnection and reconnection');
    console.log('Synthetic records remain in the isolated verification database for inspection.');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch(error => {
  // Do not print connection strings or credentials in diagnostic output.
  console.error(`Verification failed (${error.name}). ${error.name === 'AssertionError' ? error.message : 'Check database connectivity, permissions, and replica-set transaction support.'}`);
  process.exitCode = 1;
});

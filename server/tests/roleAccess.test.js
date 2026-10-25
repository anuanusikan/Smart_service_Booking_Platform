jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Booking', () => ({ find: jest.fn() }));
const requireRole = require('../middleware/requireRole');
const Booking = require('../models/Booking');
const routers = {
  jobs: require('../routes/jobs'), quotes: require('../routes/quotes'),
  bookings: require('../routes/bookings'), reviews: require('../routes/reviews')
};
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
test.each(['customer', 'provider'])('role middleware allows %s and rejects the other role', role => {
  const guard = requireRole(role);
  const next = jest.fn();
  guard({ user: { role } }, response(), next);
  expect(next).toHaveBeenCalledTimes(1);
  const res = response();
  guard({ user: { role: role === 'provider' ? 'customer' : 'provider' } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).toHaveBeenCalledTimes(1);
});
test('role middleware requires authentication', () => {
  const res = response();
  const next = jest.fn();
  requireRole('provider')({}, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
test.each([
  ['jobs', '/', 'post', 'customer'], ['jobs', '/:id', 'put', 'customer'], ['jobs', '/:id', 'delete', 'customer'],
  ['quotes', '/job/:jobId', 'get', 'customer'], ['quotes', '/mine', 'get', 'provider'],
  ['quotes', '/:id/accept', 'put', 'customer'], ['quotes', '/:id/decline', 'put', 'customer'],
  ['bookings', '/:id', 'put', 'customer'], ['bookings', '/:id/cancel', 'delete', 'provider'],
  ['reviews', '/mine', 'get', 'customer']
])('%s %s %s rejects the wrong role before the handler', (name, path, method, role) => {
  const route = routers[name].stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
  const guard = route.stack[1].handle;
  const res = response();
  const next = jest.fn();
  guard({ user: { role: role === 'provider' ? 'customer' : 'provider' } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
test('customer earnings requests are rejected before querying bookings', async () => {
  const handler = routers.bookings.stack.find(layer => layer.route?.path === '/mine').route.stack.at(-1).handle;
  const res = response();
  await handler({ user: { id: 'c1', role: 'customer' }, query: { view: 'earnings' } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Booking.find).not.toHaveBeenCalled();
});

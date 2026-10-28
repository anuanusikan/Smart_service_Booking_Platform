jest.mock('multer', () => () => ({ single: () => (req, res, next) => next() }));
jest.mock('../config/cloudinaryProfile', () => ({ storage: {} }));
jest.mock('../models/User', () => {
  const Model = jest.fn(function(data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); });
  Model.findOne = jest.fn();
  return Model;
});
jest.mock('bcryptjs', () => ({ genSalt: jest.fn().mockResolvedValue('salt'), hash: jest.fn().mockResolvedValue('hashed') }));
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const router = require('../routes/auth');
const register = router.stack.find(layer => layer.route?.path === '/register').route.stack.at(-1).handle;
const valid = { name: '  Test User  ', email: ' test@example.com ', password: 'secret123', role: 'customer' };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => { jest.clearAllMocks(); User.findOne.mockResolvedValue(null); });

test.each([{ name: ' ' }, { name: ['name'] }, { email: 'invalid' }, { email: { $ne: '' } }, { password: '123' }, { password: '      ' }, { password: 'a'.repeat(73) }, { role: 'admin' }, { hourlyRate: -1 }, { skills: { map: 'bad' } }])('rejects invalid registration before hashing or database writes: %j', invalid => {
  const res = response();
  return register({ body: { ...valid, ...invalid } }, res).then(() => {
    expect(res.status).toHaveBeenCalledWith(400);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(User).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

test('valid registration trims fields and persists a hashed password', async () => {
  const res = response();
  await register({ body: valid }, res);
  expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
  expect(User).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test User', email: 'test@example.com', password: 'hashed' }));
  expect(User.mock.instances[0].save).toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(201);
});

test('concurrent duplicate email returns a clear validation error', async () => {
  User.mockImplementationOnce(function() { this.save = jest.fn().mockRejectedValue({ code: 11000 }); });
  const res = response();
  await register({ body: valid }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
});

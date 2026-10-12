jest.mock('multer', () => () => ({ array: () => (req, res, next) => next() }));
jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Job', () => {
  const Model = jest.fn(function(data) { Object.assign(this, data); this.save = jest.fn().mockResolvedValue(this); });
  Model.findById = jest.fn();
  return Model;
});
const Job = require('../models/Job');
const router = require('../routes/jobs');
const create = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack.at(-1).handle;
const edit = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.put).route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const future = () => new Date(Date.now() + 86400000).toISOString();
beforeEach(() => jest.clearAllMocks());
test('job posting stores the chosen appointment', async () => {
  const scheduledAt = future();
  const res = response();
  await create({ user: { id: 'c1', role: 'customer' }, body: { title: 'Test job', description: 'Fix the kitchen sink', category: 'Plumbing', scheduledAt } }, res);
  expect(Job).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: new Date(scheduledAt) }));
  expect(res.status).toHaveBeenCalledWith(201);
});
test('invalid appointment returns 400 instead of creating the job', async () => {
  const res = response();
  await create({ user: { id: 'c1', role: 'customer' }, body: { title: 'Test job', description: 'Fix the kitchen sink', category: 'Plumbing', scheduledAt: 'bad' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Job).not.toHaveBeenCalled();
});
test('customer can change or clear the appointment on an open job', async () => {
  const job = { postedBy: 'c1', status: 'open', save: jest.fn() };
  Job.findById.mockResolvedValue(job);
  const scheduledAt = future();
  await edit({ user: { id: 'c1' }, params: { id: 'j1' }, body: { scheduledAt } }, response());
  expect(job.scheduledAt.toISOString()).toBe(scheduledAt);
  await edit({ user: { id: 'c1' }, params: { id: 'j1' }, body: { scheduledAt: null } }, response());
  expect(job.scheduledAt).toBeNull();
});
test('assigned job appointment cannot be silently changed', async () => {
  const job = { postedBy: 'c1', status: 'assigned', save: jest.fn() };
  Job.findById.mockResolvedValue(job);
  const res = response();
  await edit({ user: { id: 'c1' }, params: { id: 'j1' }, body: { scheduledAt: future() } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(job.save).not.toHaveBeenCalled();
});

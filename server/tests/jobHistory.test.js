jest.mock('multer', () => () => ({ array: () => (req, res, next) => next() }));
jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Job', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../models/Booking', () => ({ updateMany: jest.fn() }));
jest.mock('../models/Quote', () => ({ updateMany: jest.fn() }));
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const Quote = require('../models/Quote');
const router = require('../routes/jobs');
const route = router.stack.find(layer => layer.route?.path === '/:id/history').route;
const hide = route.stack.at(-1).handle;
const req = { params: { id: 'j1' }, user: { id: 'c1', role: 'customer' } };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => {
  jest.resetAllMocks();
  Job.findById.mockResolvedValue({ postedBy: 'c1', status: 'completed' });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'j1', status: 'completed', hiddenFromHistory: true });
});

test('hides only the owner history flag and preserves completion, timestamps and linked records', async () => {
  const res = response();
  await hide(req, res);
  expect(Job.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: 'j1', postedBy: 'c1', status: 'completed' },
    { $set: { hiddenFromHistory: true } },
    { returnDocument: 'after', timestamps: false }
  );
  expect(res.json).toHaveBeenCalledWith({ message: 'Job removed from your history' });
  expect(Booking.updateMany).not.toHaveBeenCalled();
  expect(Quote.updateMany).not.toHaveBeenCalled();
});

test('another customer cannot hide the owner job', async () => {
  const res = response();
  await hide({ ...req, user: { id: 'other', role: 'customer' } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Job.findOneAndUpdate).not.toHaveBeenCalled();
});

test('provider is rejected by role middleware', () => {
  const res = response();
  const next = jest.fn();
  route.stack[1].handle({ user: { id: 'p1', role: 'provider' } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test.each(['open', 'assigned', 'deleted'])('cannot hide a %s job', async status => {
  Job.findById.mockResolvedValue({ postedBy: 'c1', status });
  const res = response();
  await hide(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Job.findOneAndUpdate).not.toHaveBeenCalled();
});

test('already hidden completed jobs can be safely retried', async () => {
  Job.findById.mockResolvedValue({ postedBy: 'c1', status: 'completed', hiddenFromHistory: true });
  const res = response();
  await hide(req, res);
  expect(res.json).toHaveBeenCalledWith({ message: 'Job removed from your history' });
});

test('missing jobs return 404', async () => {
  Job.findById.mockResolvedValue(null);
  const res = response();
  await hide(req, res);
  expect(res.status).toHaveBeenCalledWith(404);
});

test('invalid job IDs return 400', async () => {
  Job.findById.mockRejectedValue({ name: 'CastError' });
  const res = response();
  await hide(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});

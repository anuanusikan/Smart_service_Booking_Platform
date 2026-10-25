jest.mock('multer', () => () => ({ array: () => (req, res, next) => next() }));
jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Job', () => ({ findById: jest.fn(), findOneAndUpdate: jest.fn(), find: jest.fn() }));
jest.mock('../models/Quote', () => ({ updateMany: jest.fn() }));
jest.mock('../models/Booking', () => ({ updateMany: jest.fn() }));
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const Booking = require('../models/Booking');
const router = require('../routes/jobs');
const remove = router.stack.find(layer => layer.route?.methods.delete).route.stack.at(-1).handle;
const mine = router.stack.find(layer => layer.route?.path === '/mine').route.stack.at(-1).handle;
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const req = { params: { id: 'j1' }, user: { id: 'c1', role: 'customer' } };
beforeEach(() => {
  jest.resetAllMocks();
  Job.findById.mockResolvedValue({ _id: 'j1', postedBy: 'c1', status: 'open' });
  Job.findOneAndUpdate.mockResolvedValue({ _id: 'j1', status: 'deleted' });
});
test('removes listing while retaining references and closing only pending records', async () => {
  const response = res();
  await remove(req, response);
  expect(Job.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: 'j1', postedBy: 'c1', status: { $in: ['open', 'deleted'] } },
    { status: 'deleted' }, { new: true }
  );
  expect(Quote.updateMany).toHaveBeenCalledWith({ job: 'j1', status: 'pending' }, { status: 'declined' });
  expect(Booking.updateMany).toHaveBeenCalledWith({ job: 'j1', status: 'pending' }, { status: 'declined' });
  expect(response.json).toHaveBeenCalledWith({ message: 'Job deleted successfully' });
});
test.each(['assigned', 'completed'])('protects %s jobs and their earnings records', async status => {
  Job.findById.mockResolvedValue({ postedBy: 'c1', status });
  const response = res();
  await remove(req, response);
  expect(response.status).toHaveBeenCalledWith(400);
  expect(Job.findOneAndUpdate).not.toHaveBeenCalled();
  expect(Booking.updateMany).not.toHaveBeenCalled();
  expect(Quote.updateMany).not.toHaveBeenCalled();
});
test('another user cannot delete the job', async () => {
  const response = res();
  await remove({ ...req, user: { id: 'other' } }, response);
  expect(response.status).toHaveBeenCalledWith(403);
  expect(Job.findOneAndUpdate).not.toHaveBeenCalled();
});
test('acceptance winning the job claim prevents deletion and cleanup', async () => {
  Job.findOneAndUpdate.mockResolvedValue(null);
  const response = res();
  await remove(req, response);
  expect(response.status).toHaveBeenCalledWith(409);
  expect(Booking.updateMany).not.toHaveBeenCalled();
  expect(Quote.updateMany).not.toHaveBeenCalled();
});
test('cleanup can be retried on an already removed listing', async () => {
  Job.findById.mockResolvedValue({ _id: 'j1', postedBy: 'c1', status: 'deleted' });
  await remove(req, res());
  expect(Booking.updateMany).toHaveBeenCalled();
});
test('removed listings are excluded from My Jobs', async () => {
  Job.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
  await mine(req, res());
  expect(Job.find).toHaveBeenCalledWith({ postedBy: 'c1', status: { $ne: 'deleted' } });
});

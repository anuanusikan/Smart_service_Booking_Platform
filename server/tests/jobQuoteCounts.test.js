jest.mock('multer', () => () => ({ array: () => (req, res, next) => next() }));
jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Job', () => ({ find: jest.fn() }));
jest.mock('../models/Quote', () => ({ aggregate: jest.fn() }));
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const router = require('../routes/jobs');
const mine = router.stack.find(layer => layer.route?.path === '/mine').route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => jest.clearAllMocks());

test('returns pending counts per owned job including zero, scoped to visible job IDs', async () => {
  const jobs = [{ _id: 'j1', title: 'First' }, { _id: 'j2', title: 'Second' }];
  Job.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(jobs.map(job => ({ ...job, toObject: () => job }))) });
  Quote.aggregate.mockResolvedValue([{ _id: 'j1', count: 3 }]);
  const res = response();
  await mine({ user: { id: 'customer1', role: 'customer' } }, res);
  expect(Job.find).toHaveBeenCalledWith({ postedBy: 'customer1', status: { $ne: 'deleted' }, hiddenFromHistory: { $ne: true } });
  expect(Quote.aggregate).toHaveBeenCalledWith([
    { $match: { job: { $in: ['j1', 'j2'] }, status: 'pending' } },
    { $group: { _id: '$job', count: { $sum: 1 } } }
  ]);
  expect(res.json).toHaveBeenCalledWith([
    { ...jobs[0], pendingQuoteCount: 3 }, { ...jobs[1], pendingQuoteCount: 0 }
  ]);
});

test('empty job list skips the quote query', async () => {
  Job.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
  const res = response();
  await mine({ user: { id: 'customer1', role: 'customer' } }, res);
  expect(res.json).toHaveBeenCalledWith([]);
  expect(Quote.aggregate).not.toHaveBeenCalled();
});

test('providers cannot request customer quote counts', async () => {
  const res = response();
  await mine({ user: { id: 'provider1', role: 'provider' } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(Quote.aggregate).not.toHaveBeenCalled();
});

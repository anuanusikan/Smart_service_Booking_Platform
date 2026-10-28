jest.mock('multer', () => () => ({ array: () => (req, res, next) => next() }));
jest.mock('../config/cloudinary', () => ({ storage: {} }));
jest.mock('../models/Job', () => ({ find: jest.fn() }));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
const Job = require('../models/Job');
const User = require('../models/User');
const router = require('../routes/jobs');
const { jobFilters, sortJobs } = require('../services/jobFilters');
const handler = path => router.stack.find(layer => layer.route?.path === path && layer.route.methods.get).route.stack.at(-1).handle;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => jest.clearAllMocks());

test.each(['/', '/matched'])('%s applies all filters before returning open jobs', async path => {
  User.findById.mockResolvedValue({ skills: ['Plumbing'], location: 'Kandy' });
  Job.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
  await handler(path)({ query: { category: 'Plumbing', location: 'Kandy', minBudget: '0', maxBudget: '5000' }, user: { id: 'p1', role: 'provider' } }, response());
  expect(Job.find).toHaveBeenCalledWith({ status: 'open', category: { $regex: 'Plumbing', $options: 'i' }, location: { $regex: 'Kandy', $options: 'i' }, budget: { $gte: 0, $lte: 5000 } });
});

test.each(['/', '/matched'])('%s rejects reversed budget ranges without querying jobs', async path => {
  const res = response();
  await handler(path)({ query: { minBudget: '100', maxBudget: '50' }, user: { id: 'p1', role: 'provider' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(Job.find).not.toHaveBeenCalled();
});

test('category and location searches treat regex characters as literal text', () => {
  const filter = jobFilters({ category: 'Repair (A+)', location: '.*' });
  expect(new RegExp(filter.category.$regex).test('Repair (A+)')).toBe(true);
  expect(new RegExp(filter.location.$regex).test('Kandy')).toBe(false);
});

test.each([{ minBudget: '-1' }, { maxBudget: 'Infinity' }, { minBudget: 'abc' }, { category: ['Plumbing'] }])('rejects malformed filters: %j', query => {
  expect(() => jobFilters(query)).toThrow();
});

test('filtered provider jobs retain match ranking', async () => {
  User.findById.mockResolvedValue({ skills: ['Plumbing'], location: 'Kandy' });
  const jobs = [{ category: 'Painting', location: 'Kandy' }, { category: 'Plumbing', location: 'Kandy' }];
  Job.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(jobs.map(job => ({ ...job, toObject: () => job }))) });
  const res = response();
  await handler('/matched')({ query: {}, user: { id: 'p1', role: 'provider' } }, res);
  expect(res.json.mock.calls[0][0].map(job => job.category)).toEqual(['Plumbing', 'Painting']);
});

test('title search is case insensitive and escapes regex syntax', () => {
  const filter = jobFilters({ title: 'Tap (repair)' });
  expect(new RegExp(filter.title.$regex, filter.title.$options).test('TAP (repair) today')).toBe(true);
  expect(new RegExp(filter.title.$regex, filter.title.$options).test('Tap repair')).toBe(false);
});

test('sorting supports date, price and match without mutating results', () => {
  const jobs = [
    { _id: 'a', budget: 500, createdAt: '2026-01-01', matchScore: 80 },
    { _id: 'b', budget: 100, createdAt: '2026-02-01', matchScore: 30 }
  ];
  for (const [sort, first] of [['newest', 'b'], ['oldest', 'a'], ['budget_asc', 'b'], ['budget_desc', 'a'], ['match', 'a']]) {
    expect(sortJobs(jobs, sort)[0]._id).toBe(first);
  }
  expect(jobs[0]._id).toBe('a');
  expect(() => jobFilters({ sort: 'unknown' })).toThrow('Invalid sort option');
});

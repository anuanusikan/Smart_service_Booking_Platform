function jobFilters(query = {}) {
  if (query.sort !== undefined && !['', 'match', 'newest', 'oldest', 'budget_asc', 'budget_desc'].includes(query.sort)) throw new Error('Invalid sort option');
  const filter = { status: 'open' };
  for (const field of ['title', 'category', 'location']) {
    if (query[field] === undefined || query[field] === '') continue;
    if (typeof query[field] !== 'string') throw new Error(`${field} must be text`);
    const text = query[field].trim();
    if (text) filter[field] = { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  for (const [field, operator] of [['minBudget', '$gte'], ['maxBudget', '$lte']]) {
    const raw = query[field];
    if (raw === undefined || raw === '') continue;
    if (typeof raw !== 'string' || !raw.trim() || !Number.isFinite(Number(raw)) || Number(raw) < 0) {
      throw new Error('Budget filters must be valid numbers of Rs. 0 or more');
    }
    filter.budget ||= {};
    filter.budget[operator] = Number(raw);
  }
  if (filter.budget?.$gte > filter.budget?.$lte) throw new Error('Minimum budget cannot exceed maximum budget');
  return filter;
}

function sortJobs(jobs, sort = 'newest') {
  const newest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || String(a._id).localeCompare(String(b._id));
  const comparators = {
    newest,
    oldest: (a, b) => -newest(a, b),
    budget_asc: (a, b) => (a.budget || 0) - (b.budget || 0) || newest(a, b),
    budget_desc: (a, b) => (b.budget || 0) - (a.budget || 0) || newest(a, b),
    match: (a, b) => (b.matchScore || 0) - (a.matchScore || 0) || newest(a, b)
  };
  return [...jobs].sort(comparators[sort] || newest);
}

module.exports = { jobFilters, sortJobs };

function validateJobInput(input, partial = false) {
  const value = {};
  const errors = {};
  for (const [field, min, label] of [['title', 3, 'Title'], ['description', 10, 'Description'], ['category', 1, 'Category']]) {
    if (partial && input[field] === undefined) continue;
    if (typeof input[field] !== 'string' || input[field].trim().length < min) {
      errors[field] = min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`;
    } else value[field] = input[field].trim();
  }
  if (input.location !== undefined) {
    if (typeof input.location !== 'string') errors.location = 'Location must be text';
    else value.location = input.location.trim();
  }
  if (!partial || input.budget !== undefined) {
    const budget = input.budget === undefined || (typeof input.budget === 'string' && !input.budget.trim()) ? 0 : input.budget;
    if (!['string', 'number'].includes(typeof budget) || !Number.isFinite(Number(budget)) || Number(budget) < 0) {
      errors.budget = 'Budget must be a valid number of Rs. 0 or more';
    } else value.budget = Number(budget);
  }
  return { value, errors, message: Object.values(errors)[0] };
}
module.exports = { validateJobInput };

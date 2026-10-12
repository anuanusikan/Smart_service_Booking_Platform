export function validateJobForm(form) {
  const errors = {};
  if (typeof form.title !== 'string' || form.title.trim().length < 3) errors.title = 'Use at least 3 characters for the title.';
  if (typeof form.description !== 'string' || form.description.trim().length < 10) errors.description = 'Describe the job in at least 10 characters.';
  if (typeof form.category !== 'string' || !form.category.trim()) errors.category = 'Enter a service category.';
  if (!Number.isFinite(Number(form.budget ?? 0)) || Number(form.budget) < 0) errors.budget = 'Enter Rs. 0 or more, or leave this blank.';
  return errors;
}

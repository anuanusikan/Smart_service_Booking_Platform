function validateRegistration(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { message: 'Registration details must be an object', errors: { form: 'Invalid registration details' } };
  const errors = {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (name.length < 2 || name.length > 100) errors.name = 'Name must contain 2 to 100 characters';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
  if (typeof input.password !== 'string' || input.password.length < 6 || input.password.trim().length < 6 || Buffer.byteLength(input.password, 'utf8') > 72) {
    errors.password = 'Password must contain at least 6 non-padding characters and be at most 72 bytes';
  }
  if (!['customer', 'provider'].includes(input.role)) errors.role = 'Choose customer or provider';
  if (input.location !== undefined && (typeof input.location !== 'string' || input.location.length > 200)) errors.location = 'Location must be text of at most 200 characters';
  if (input.skills !== undefined && (!Array.isArray(input.skills) || input.skills.length > 30 || input.skills.some(skill => typeof skill !== 'string' || !skill.trim() || skill.length > 100))) errors.skills = 'Skills must be a list of up to 30 non-empty text values';
  if (input.hourlyRate !== undefined && (typeof input.hourlyRate !== 'number' || !Number.isFinite(input.hourlyRate) || input.hourlyRate < 0)) errors.hourlyRate = 'Hourly rate must be a number of Rs. 0 or more';
  if (Object.keys(errors).length) return { errors, message: Object.values(errors)[0] };
  return { errors, value: { name, email, password: input.password, role: input.role, location: input.location?.trim(), skills: input.skills?.map(skill => skill.trim()), hourlyRate: input.hourlyRate } };
}

module.exports = { validateRegistration };

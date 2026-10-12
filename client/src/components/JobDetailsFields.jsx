import { useId } from 'react';

export default function JobDetailsFields({ values, onChange, errors = {} }) {
  const prefix = useId();
  const field = (name, label, hint, options = {}) => {
    const id = `${prefix}-${name}`;
    const common = {
      id, name, value: values[name] ?? '', onChange: event => onChange(name, event.target.value),
      'aria-invalid': Boolean(errors[name]), 'aria-describedby': `${id}-hint`, ...options
    };
    return <div className={`job-form-field${errors[name] ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{options.required && <span className="job-field-required"> *</span>}</label>
      {name === 'description' ? <textarea {...common} rows={4} /> : <input {...common} />}
      <div id={`${id}-hint`} className={errors[name] ? 'job-field-error' : 'job-field-hint'}>{errors[name] || hint}</div>
    </div>;
  };
  return <>
    {field('title', 'Job title', 'A clear title helps the right professional find your job.', { type: 'text', required: true, minLength: 3, placeholder: 'e.g. Repair a leaking kitchen tap' })}
    {field('description', 'Tell us about the work', 'Include the problem, what needs doing, and any special requirements.', { required: true, minLength: 10, placeholder: 'Describe your project and what a successful result looks like...' })}
    <div className="job-form-row">
      {field('category', 'Service category', 'e.g. Plumbing, Electrical, Cleaning', { type: 'text', required: true, placeholder: 'Choose your area of work' })}
      {field('location', 'Location', 'Your city or service area.', { type: 'text', placeholder: 'e.g. Colombo 03' })}
    </div>
    {field('budget', 'Estimated budget (Rs.)', 'Optional. Use Rs. 0 or more; the final price is agreed through quotes.', { type: 'number', min: 0, step: 'any', placeholder: 'e.g. 5000' })}
  </>;
}

import { $ } from './utils.js';

const VALIDATION_RULES = {
  spot1Year: {
    min: 0,
    max: 50,
    required: true,
    label: '1-year spot rate',
    unit: '%'
  },
  spot2Year: {
    min: 0,
    max: 50,
    required: true,
    label: '2-year spot rate',
    unit: '%'
  }
};

export function validateField(field, value) {
  const rules = VALIDATION_RULES[field];
  if (!rules) return null;
  
  if (rules.required && (value === '' || value == null || isNaN(value))) {
    return `${rules.label} is required`;
  }
  
  if (rules.min !== undefined && value < rules.min) {
    return `${rules.label} must be between ${rules.min}${rules.unit || ''} and ${rules.max}${rules.unit || ''}`;
  }
  
  if (rules.max !== undefined && value > rules.max) {
    return `${rules.label} must be between ${rules.min}${rules.unit || ''} and ${rules.max}${rules.unit || ''}`;
  }
  
  return null;
}

export function validateAllInputs(inputs) {
  const errors = {};
  
  Object.keys(VALIDATION_RULES).forEach(field => {
    const error = validateField(field, inputs[field]);
    if (error) {
      errors[field] = error;
    }
  });
  
  if (inputs.spot2Year > 0 && inputs.spot1Year > 0 && inputs.spot2Year <= inputs.spot1Year) {
    errors.yieldCurve = 'Note: 2-year rate typically higher than 1-year rate for normal yield curve';
  }
  
  return errors;
}

export function updateFieldError(fieldId, errorMessage) {
  const input = $(`#${fieldId}`);
  if (!input) return;
  
  if (errorMessage) {
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('error');
  } else {
    input.removeAttribute('aria-invalid');
    input.classList.remove('error');
  }
}

export function updateValidationSummary(errors) {
  const summary = $('#validation-summary');
  const list = $('#validation-list');

  if (!summary || !list) return;

  if (hasErrors(errors)) {
    list.innerHTML = Object.entries(errors)
      .map(([field, message]) => `<li>${message}</li>`)
      .join('');
    summary.style.display = 'block';
  } else {
    summary.style.display = 'none';
  }
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

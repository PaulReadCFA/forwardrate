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
  
  return errors;
}

/**
 * A flat or inverted curve is unusual, but mathematically valid.
 * Return advisory copy separately so it never blocks calculation.
 */
export function getYieldCurveWarning(inputs) {
  const { spot1Year, spot2Year } = inputs;
  if (!Number.isFinite(spot1Year) || !Number.isFinite(spot2Year)) return null;

  if (spot2Year < spot1Year) {
    return 'The 2-year spot rate is below the 1-year spot rate, indicating an inverted yield curve. The forward-rate calculation remains valid.';
  }

  if (spot2Year === spot1Year) {
    return 'The 1-year and 2-year spot rates are equal, indicating a flat yield curve. The forward-rate calculation remains valid.';
  }

  return null;
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

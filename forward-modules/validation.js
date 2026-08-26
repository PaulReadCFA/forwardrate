import {
  updateFieldError,
  updateValidationSummary,
  hasErrors,
  requiredMessage,
  minMessage,
  maxMessage,
} from '../validation-ui.js';

export { updateFieldError, updateValidationSummary, hasErrors };

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
    return requiredMessage(rules.label);
  }
  
  if (rules.min !== undefined && value < rules.min) {
    return minMessage(rules.label, `${rules.min}${rules.unit || ''}`);
  }
  
  if (rules.max !== undefined && value > rules.max) {
    return maxMessage(rules.label, `${rules.max}${rules.unit || ''}`);
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

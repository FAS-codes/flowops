import { describe, expect, it } from 'vitest';
import {
  evaluateCondition,
  evaluateConditions,
  renderTemplate,
} from '../../src/services/automation.service';

describe('automation condition evaluation', () => {
  const lead = { stage: 'Won', dealValue: 5000, company: 'Acme Corp' };

  it('handles string equality and inequality', () => {
    expect(evaluateCondition(lead, { field: 'stage', operator: 'eq', value: 'Won' })).toBe(true);
    expect(evaluateCondition(lead, { field: 'stage', operator: 'ne', value: 'Lost' })).toBe(true);
    expect(evaluateCondition(lead, { field: 'stage', operator: 'eq', value: 'Lost' })).toBe(false);
  });

  it('compares numbers correctly', () => {
    expect(evaluateCondition(lead, { field: 'dealValue', operator: 'gte', value: '5000' })).toBe(true);
    expect(evaluateCondition(lead, { field: 'dealValue', operator: 'gt', value: '5000' })).toBe(false);
    expect(evaluateCondition(lead, { field: 'dealValue', operator: 'lt', value: '10000' })).toBe(true);
  });

  it('supports case-insensitive contains', () => {
    expect(evaluateCondition(lead, { field: 'company', operator: 'contains', value: 'acme' })).toBe(true);
    expect(evaluateCondition(lead, { field: 'company', operator: 'contains', value: 'globex' })).toBe(false);
  });

  it('returns false when comparing non-numeric values numerically', () => {
    expect(evaluateCondition(lead, { field: 'company', operator: 'gt', value: '5' })).toBe(false);
  });

  it('requires all conditions to pass (AND)', () => {
    expect(
      evaluateConditions(lead, [
        { field: 'stage', operator: 'eq', value: 'Won' },
        { field: 'dealValue', operator: 'gte', value: '1000' },
      ])
    ).toBe(true);
    expect(
      evaluateConditions(lead, [
        { field: 'stage', operator: 'eq', value: 'Won' },
        { field: 'dealValue', operator: 'gt', value: '9000' },
      ])
    ).toBe(false);
  });

  it('treats an empty condition list as always matching', () => {
    expect(evaluateConditions(lead, [])).toBe(true);
  });
});

describe('automation template rendering', () => {
  it('substitutes entity fields into placeholders', () => {
    expect(renderTemplate('Follow up on {{company}}', { company: 'Acme' })).toBe('Follow up on Acme');
  });

  it('tolerates whitespace and missing fields', () => {
    expect(renderTemplate('{{ company }} / {{missing}}', { company: 'Acme' })).toBe('Acme / ');
  });
});

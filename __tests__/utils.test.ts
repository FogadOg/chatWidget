import { cn } from '../src/lib/utils';

describe('cn utility function', () => {
  it('merges Tailwind classes correctly', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('handles conflicting classes by keeping the last one', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class');
    expect(result).toBe('base-class active-class');
  });

  it('filters out falsy values', () => {
    const result = cn('class1', false && 'class2', null, undefined, 'class3');
    expect(result).toBe('class1 class3');
  });

  it('handles array inputs', () => {
    const result = cn(['bg-red-500', 'text-white'], ['border', 'border-solid']);
    expect(result).toBe('bg-red-500 text-white border border-solid');
  });

  it('handles object inputs', () => {
    const result = cn({ 'bg-red-500': true, 'bg-blue-500': false }, 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('returns empty string for no inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles single string input', () => {
    const result = cn('single-class');
    expect(result).toBe('single-class');
  });

  it('handles complex Tailwind merging', () => {
    const result = cn('px-2 py-1', 'px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('preserves important modifiers', () => {
    const result = cn('!bg-red-500', 'bg-blue-500');
    // tailwind-merge keeps both classes when one has !important
    expect(result).toContain('!bg-red-500');
  });
});
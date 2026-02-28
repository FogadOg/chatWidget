import { renderHook, act } from '@testing-library/react';
import { useClickedButtons, ButtonLike } from '../../hooks/useClickedButtons';

describe('useClickedButtons hook', () => {
  it('initializes empty set', () => {
    const { result } = renderHook(() => useClickedButtons());
    expect(result.current.clickedButtons.size).toBe(0);
  });

  it('marks and prevents duplicate clicks', () => {
    const { result } = renderHook(() => useClickedButtons());
    const btn: ButtonLike = { id: 'foo' };
    act(() => {
      result.current.handleClick(btn, () => {});
    });
    expect(result.current.clickedButtons.has('foo')).toBe(true);

    // second click should not clear or re-add
    act(() => {
      result.current.handleClick(btn, () => {
        throw new Error('should not be called');
      });
    });
  });

  it('returns id via getButtonId even if button_id used', () => {
    const { result } = renderHook(() => useClickedButtons());
    const btn: ButtonLike = { button_id: 'bar' };
    expect(result.current.getButtonId(btn)).toBe('bar');
  });
});

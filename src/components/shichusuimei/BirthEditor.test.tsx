import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BirthEditor } from './BirthEditor';
import type { BirthInput } from '../../lib/shichusuimeiTypes';

const value: BirthInput = { year: 2000, month: 1, day: 1, hour: 0, minute: 0, utcOffset: 9, sex: 'male' };
afterEach(cleanup);

describe('出生情報のプルダウン', () => {
  it('offers every year, month, day, hour and minute and reports the chosen value', () => {
    const onChange = vi.fn();
    render(<BirthEditor value={value} onChange={onChange} label="本人" />);
    expect(screen.getByLabelText('本人の生まれた年')).toHaveValue('2000');
    expect(screen.getByLabelText('本人の生まれた月')).toHaveValue('1');
    expect(screen.getByLabelText('本人の生まれた日')).toHaveValue('1');
    expect(screen.getByLabelText('本人の生まれた時')).toHaveValue('0');
    expect(screen.getByLabelText('本人の生まれた分')).toHaveValue('0');
    expect(screen.getByLabelText('本人の生まれた年').children).toHaveLength(201);
    expect(screen.getByLabelText('本人の生まれた分').children).toHaveLength(60);
    fireEvent.change(screen.getByLabelText('本人の生まれた時'), { target: { value: '23' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, hour: 23 });
  });

  it('follows the length of the chosen month and pulls an impossible day back', () => {
    const onChange = vi.fn();
    const { rerender } = render(<BirthEditor value={{ ...value, month: 1, day: 31 }} onChange={onChange} label="本人" />);
    expect(screen.getByLabelText('本人の生まれた日').children).toHaveLength(31);
    fireEvent.change(screen.getByLabelText('本人の生まれた月'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith({ ...value, month: 2, day: 29 });
    rerender(<BirthEditor value={{ ...value, year: 2001, month: 2, day: 28 }} onChange={onChange} label="本人" />);
    expect(screen.getByLabelText('本人の生まれた日').children).toHaveLength(28);
  });
});

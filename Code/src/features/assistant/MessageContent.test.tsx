import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MessageContent } from './MessageContent';

function Location() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

describe('MessageContent', () => {
  it('renders bold text, a heading line above its list, and citation chips', async () => {
    render(
      <MemoryRouter>
        <MessageContent
          text={'Start with [[task:t_1]].\n\n**Blocked by**\n- [[task:t_2]] — due today'}
          citations={[
            { type: 'task', id: 't_1', title: 'Finalize error states' },
            { type: 'task', id: 't_2', title: 'Send API key' },
          ]}
        />
        <Location />
      </MemoryRouter>,
    );
    expect(screen.getByText('Blocked by').tagName).toBe('STRONG');
    expect(screen.getByRole('list')).toHaveTextContent('Send API key');
    await userEvent.click(screen.getByRole('button', { name: 'Finalize error states' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?task=t_1');
  });

  it('shows a placeholder until citations arrive', () => {
    const { container } = render(
      <MemoryRouter>
        <MessageContent text="See [[file:f_1]]" citations={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });
});

import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('signing in as Maya lands on Home with her focus and due groups', async ({ page }) => {
  await signIn(page, 'Maya Okafor');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Maya');

  const focus = page.getByRole('region', { name: 'Your focus today' });
  await expect(focus.getByRole('listitem')).toHaveCount(3);

  await expect(page.getByRole('heading', { name: /^Overdue\s*\d+$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Today\s*\d+$/ })).toBeVisible();
});

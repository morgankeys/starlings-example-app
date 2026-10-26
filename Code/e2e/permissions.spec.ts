import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('a guest has no People link and cannot open a private folder', async ({ page }) => {
  await signIn(page, 'Elena Ruiz');

  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'My tasks' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'People' })).toHaveCount(0);

  await page.goto('/files/folders/fd_checkout');
  await expect(
    page.getByText(/not found|don.t have access|can.t be opened|no access/i).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /project brief/ })).toHaveCount(0);
});

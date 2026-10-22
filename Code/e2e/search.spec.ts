import { expect, test } from '@playwright/test';
import { MOD, signIn } from './helpers';

test('the command palette finds files by name', async ({ page }) => {
  await signIn(page, 'Maya Okafor');
  await page.keyboard.press(`${MOD}+k`);

  const search = page.getByRole('combobox', { name: 'Search' });
  await expect(search).toBeFocused();
  await search.fill('launch');

  await expect(page.getByRole('option', { name: /Spring '27 launch plan\.docx/ })).toBeVisible();
});

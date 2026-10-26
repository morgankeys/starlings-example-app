import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('board shows a column per status and moves a card between them', async ({ page }) => {
  await signIn(page, 'Maya Okafor');
  await page.goto('/tasks?view=board');

  for (const name of ['To do', 'In progress', 'In review', 'Done']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }

  const todo = page.getByRole('region', { name: 'To do', exact: true });
  const inReview = page.getByRole('region', { name: 'In review', exact: true });
  const card = todo.locator('[data-component="TaskBoardCard"]').first();
  const move = card.getByRole('button', { name: /^Move “/ });
  const label = (await move.getAttribute('aria-label')) ?? '';
  const title = label.replace(/^Move “/, '').replace(/”$/, '');
  expect(title).not.toBe('');

  await move.click();
  await page.getByRole('menuitemcheckbox', { name: 'In review' }).click();

  const cardsIn = (col: typeof todo) =>
    col.locator('[data-component="TaskBoardCard"]').filter({ hasText: title });
  await expect(cardsIn(inReview)).toHaveCount(1);
  await expect(cardsIn(todo)).toHaveCount(0);
});

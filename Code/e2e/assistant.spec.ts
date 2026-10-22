import { expect, test } from '@playwright/test';
import { assistantPanel, MOD, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page, 'Maya Okafor');
});

test('a suggested prompt gets an answer with citation chips', async ({ page }) => {
  await page.keyboard.press(`${MOD}+j`);
  const panel = assistantPanel(page);
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: 'What should I focus on today?' }).click();

  await expect(panel.locator('button[data-type="task"]').first()).toBeVisible();
});

test('turning action items into tasks offers a suggested tasks card', async ({ page }) => {
  await page.goto('/files/folders/fd_supplier');
  await page
    .getByRole('button', { name: /Supplier pilot kickoff notes\.docx/ })
    .first()
    .click();
  await expect(page.getByRole('complementary', { name: 'File details' })).toBeVisible();

  await page.getByRole('button', { name: 'Ask Birdy', exact: true }).click();
  const panel = assistantPanel(page);
  await panel.getByRole('button', { name: 'Turn the action items into tasks' }).click();

  await expect(panel.getByText('Suggested tasks')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Create 4 tasks' })).toBeVisible();
});

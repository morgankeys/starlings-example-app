import { expect, test } from '@playwright/test';
import { filePanel, signIn } from './helpers';

test('a file opens with a preview and a share dialog listing who has access', async ({ page }) => {
  await signIn(page, 'Maya Okafor');
  await page.goto('/files/folders/fd_checkout');

  await page
    .getByRole('button', { name: /Checkout redesign – project brief\.docx/ })
    .first()
    .click();

  const panel = filePanel(page);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('region', { name: 'Preview' })).toContainText(
    'Checkout redesign: project brief',
  );

  await panel.getByRole('button', { name: 'Share' }).click();
  const dialog = page.getByRole('dialog', { name: /^Share “Checkout redesign/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'People with access' })).toBeVisible();
  await expect(dialog.getByText('Maya Okafor')).toBeVisible();
  await expect(dialog.getByText('Product Design', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Engineering', { exact: true })).toBeVisible();
});

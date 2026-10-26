import { expect, test } from '@playwright/test';
import { signIn, taskPanel, toasts } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page, 'Maya Okafor');
});

test('quick add parses the date, priority and assignee', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Add a task' });
  await input.fill('Draft hero copy tomorrow !high @leo');
  // The preview resolves @leo once the people list has loaded; submitting earlier would
  // leave "@leo" in the title and keep the task on Maya.
  const preview = page.locator('[data-component="QuickAdd"]');
  await expect(preview.getByText('Leo Brandt')).toBeVisible();
  await input.press('Enter');

  await expect(toasts(page).getByText('Task added')).toBeVisible();

  // It is assigned to Leo, so it shows up on his page rather than on Maya's Home.
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByRole('link', { name: /Leo Brandt/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Leo Brandt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark “Draft hero copy” as done' })).toBeVisible();
});

test('completing a task can be undone from the toast', async ({ page }) => {
  const mark = page.getByRole('button', { name: /^Mark “.+” as done$/ });
  await expect(mark.first()).toBeVisible();
  const label = (await mark.first().getAttribute('aria-label')) ?? '';
  const title = label.replace(/^Mark “/, '').replace(/” as done$/, '');
  expect(title).not.toBe('');

  await mark.first().click();
  await expect(toasts(page).getByText('Task completed')).toBeVisible();
  await expect(page.getByRole('button', { name: `Mark “${title}” as done` })).toHaveCount(0);

  await toasts(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: `Mark “${title}” as done` })).toBeVisible();
});

test('a task panel changes status from the Status menu', async ({ page }) => {
  await page.goto('/tasks');
  const row = page.locator('[data-component="TaskRow"]').first();
  await row.getByRole('button').nth(1).click();

  const panel = taskPanel(page);
  await expect(panel).toBeVisible();
  const status = panel.getByRole('button', { name: /(To do|In progress|In review|Done)$/ });
  const before = (await status.textContent())?.trim();
  const next = before === 'In review' ? 'In progress' : 'In review';

  await status.click();
  await page.getByRole('menuitemcheckbox', { name: next }).click();
  await expect(status).toHaveText(next);
});

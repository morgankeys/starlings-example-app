import { expect, type Locator, type Page } from '@playwright/test';

/** Open /sign-in, pick a person, and wait for Home. Each test starts from the seed data. */
export async function signIn(page: Page, name: string) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /^Good (morning|afternoon|evening), /,
  );
}

/** The task side panel (a `SidePanel` with the "Task" label). */
export function taskPanel(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Task details' });
}

/** The file side panel. */
export function filePanel(page: Page): Locator {
  return page.getByRole('complementary', { name: 'File details' });
}

/** The Ask Birdy side panel. */
export function assistantPanel(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Ask Birdy' });
}

/** The toast region; toasts are announced in a "Notifications" region. */
export function toasts(page: Page): Locator {
  return page.getByRole('region', { name: 'Notifications' });
}

/** The primary shortcut modifier for this machine, as Playwright names it. */
export const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

import { test, expect } from '@playwright/test';

test.describe('A visitor adds a todo and sees it in the list', () => {
  // Explicit setup: navigate to the app for every test
  test.beforeEach(async ({ page }) => {
    // Open the provided live page via a path relative to baseURL
    await page.goto('./');
    // Basic sanity check from the accessibility tree
    await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();
  });

  test('[pwg:55d656e9-5d63-4306-b520-77a4ed9043e6] Typing a todo and pressing Enter adds it to the list and updates the counter', async ({ page }) => {
    // Locate the new-todo textbox by its accessible name from the provided tree
    const newTodo = page.getByRole('textbox', { name: 'What needs to be done?' });
    await expect(newTodo).toBeVisible();

    // Type the todo and submit with Enter
    await newTodo.fill('Buy milk');
    // Sanity check that the value was entered
    await expect(newTodo).toHaveValue('Buy milk');
    await newTodo.press('Enter');

    // Find a listitem that contains the entered text
    const addedItem = page.getByRole('listitem').filter({ hasText: 'Buy milk' });
    await expect(addedItem).toBeVisible();

    // Verify the counter shows the expected text. The counter's exact role/structure
    // was not present in the supplied accessibility tree, so use a text match per guidance.
    const counter = page.getByText('1 item left');
    await expect(counter).toBeVisible();
  });
});

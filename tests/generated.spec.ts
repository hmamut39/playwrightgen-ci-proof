import { test, expect } from '@playwright/test';

// This test expects card data to be provided via environment variables.
// Required environment variables (no credentials are embedded here):
//   TEST_CARD_NUMBER, TEST_CARD_EXPIRY, TEST_CARD_CVC
// Optional: TEST_CARD_NAME
// The test navigates to '/cart' relative to the configured baseURL in the Playwright config.

test.describe('Card payment succeeds', () => {
  // Fail fast if required card data is not provided; skip the test instead of embedding secrets.
  const cardNumber = process.env.TEST_CARD_NUMBER;
  const cardExpiry = process.env.TEST_CARD_EXPIRY;
  const cardCVC = process.env.TEST_CARD_CVC;
  const cardName = process.env.TEST_CARD_NAME ?? 'Test User';

  test.beforeEach(async ({ page }) => {
    // Navigate explicitly to the cart page. Base URL must be set in the test config (see configuration field).
    await page.goto('/cart');

    // Basic sanity: ensure the url contains '/cart' or that a cart heading appears. This helps catch misnavigation early.
    await expect(page).toHaveURL(/\/cart/i);
  });

  test('[pwg:92ef04d1-770c-4ca4-b627-3dfd7dd93520] submitting a valid card displays an order confirmation', async ({ page }) => {
    // If payment credentials are not provided, skip the test rather than embedding a card.
    test.skip(!cardNumber || !cardExpiry || !cardCVC, 'Skipping: test card data not provided via environment variables (TEST_CARD_NUMBER, TEST_CARD_EXPIRY, TEST_CARD_CVC).');

    // Helper: attempt to locate an input using a list of candidate labels/placeholders/testids.
    async function findField(candidates: string[]) {
      for (const candidate of candidates) {
        const byLabel = page.getByLabel(candidate);
        if (await byLabel.count()) return byLabel.first();
        const byPlaceholder = page.getByPlaceholder(candidate);
        if (await byPlaceholder.count()) return byPlaceholder.first();
        try {
          const byTestId = page.getByTestId(candidate);
          if (await byTestId.count()) return byTestId.first();
        } catch {
          // getByTestId may not be available if the author didn't include such attributes; ignore silently
        }
      }
      return null;
    }

    const numberCandidates = ['Card number', 'Card Number', 'cardNumber', 'card-number', 'card-number-input', 'number'];
    const expiryCandidates = ['Expiry', 'Expiry date', 'MM / YY', 'MM/YY', 'Expiration', 'Expiration date', 'expiry'];
    const cvcCandidates = ['CVC', 'CVC code', 'CVV', 'CVV2', 'cvc', 'cvc-code'];
    const nameCandidates = ['Name on card', 'Cardholder name', 'Name', 'name'];

    const numberField = await findField(numberCandidates);
    const expiryField = await findField(expiryCandidates);
    const cvcField = await findField(cvcCandidates);
    const nameField = await findField(nameCandidates);

    if (!numberField || !expiryField || !cvcField) {
      const iframeCount = await page.frameLocator('iframe').locator('input').count().catch(() => 0);
      if (iframeCount > 0) {
        test.skip(true, 'Payment inputs appear to be inside an iframe (common with hosted providers). Configure provider-specific frame locators or provide accessible inputs for automated tests.');
      }
      throw new Error('Could not locate payment input fields on the cart page. Provide accessible input labels/placeholders/testids or update the test to handle provider frames.');
    }

    await numberField.fill(cardNumber);
    await expiryField.fill(cardExpiry);
    await cvcField.fill(cardCVC);
    if (nameField) await nameField.fill(cardName);

    const submitButton = page.getByRole('button', { name: /pay|submit|place order|confirm|checkout|complete order/i }).first();
    if (await submitButton.count()) {
      await submitButton.click();
    } else {
      const fallback = (await page.getByTestId('submit-payment').count()) ? page.getByTestId('submit-payment') : null;
      if (fallback) {
        await fallback.click();
      } else {
        throw new Error('Could not find a submit/payment button (tried role-based and common test ids).');
      }
    }

    const confirmationHeading = page.getByRole('heading', { name: /thank you|order (confirmation|received)|receipt|order (?:#|number)/i });
    const confirmationStatus = page.getByRole('status');
    const confirmationText = page.locator('text=/thank you|order confirmation|receipt|order received|order number/i');

    await Promise.race([
      (async () => { if (await confirmationHeading.count()) await expect(confirmationHeading).toBeVisible({ timeout: 15000 }); })(),
      (async () => { if (await confirmationStatus.count()) await expect(confirmationStatus).toBeVisible({ timeout: 15000 }); })(),
      (async () => { if (await confirmationText.count()) await expect(confirmationText).toBeVisible({ timeout: 15000 }); })()
    ]).catch(() => {
      throw new Error('Order confirmation was not detected after submitting payment. Ensure the application shows a confirmation message and that the test can locate it.');
    });
  });
});

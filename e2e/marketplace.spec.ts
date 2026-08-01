import { expect, test } from '@playwright/test'
import { loginDemoAdmin, gotoPath } from './helpers'
import {
  E2E_LISTING_PREFIX,
  archiveE2eListings,
  cancelE2eOrders,
  createDisposableMarketplaceOrg,
  deactivateOrg,
  ensureMarketCategory,
  fillListingForm,
  loginOrgAdmin,
  loginSuperAdminApi,
  loginSuperAdminUi,
  setMarketplaceEnabled,
  type DisposableOrg,
} from './marketplace-helpers'

test.describe.configure({ mode: 'serial' })

test.describe('marketplace e2e', () => {
  test.setTimeout(120_000)

  let org: DisposableOrg
  let categoryName = ''
  let saHeaders: Record<string, string> = {}

  test.beforeAll(async ({ request }) => {
    saHeaders = await loginSuperAdminApi(request)
    org = await createDisposableMarketplaceOrg(request, saHeaders)
    const cat = await ensureMarketCategory(request, saHeaders)
    categoryName = cat.name
  })

  test.afterAll(async ({ request, browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await loginOrgAdmin(page, org)
      await archiveE2eListings(page)
    } catch {
      // best-effort
    } finally {
      await context.close()
    }
    try {
      await deactivateOrg(request, saHeaders, org.orgId)
    } catch {
      // leave org if SA unavailable
    }
  })

  test('happy path: листинг → модерация → витрина → заказ → статус продавца', async ({
    page,
    browser,
  }) => {
    const title = `${E2E_LISTING_PREFIX}honey-${Date.now()}`
    const buyerPhone = `+7900${String(Date.now()).slice(-7)}`

    await loginOrgAdmin(page, org)
    await page.getByRole('link', { name: /^Создать( объявление)?$/ }).first().click()
    await expect(page.getByTestId('listing-form')).toBeVisible({ timeout: 15_000 })
    await fillListingForm(page, { title, categoryName })
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page).toHaveURL(/\/seller-market\/listings\/[^/]+/, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Отправить на модерацию' })).toBeEnabled()
    const submitWait = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        /\/api\/marketplace\/listings\/[^/]+\/submit/.test(r.url()),
      { timeout: 25_000 },
    )
    await page.getByRole('button', { name: 'Отправить на модерацию' }).click()
    const submitRes = await submitWait
    expect(submitRes.status(), await submitRes.text()).toBe(200)
    await page.goto('/seller-market/listings')
    await expect(
      page.locator('li').filter({ hasText: title }).getByText('На модерации'),
    ).toBeVisible({ timeout: 15_000 })

    const saContext = await browser.newContext()
    const saPage = await saContext.newPage()
    try {
      await loginSuperAdminUi(saPage)
      await gotoPath(saPage, '/superadmin/marketplace')
      await expect(saPage.getByRole('heading', { name: /Очередь модерации/i })).toBeVisible({
        timeout: 20_000,
      })
      const card = saPage.locator('li').filter({ hasText: title })
      await expect(card).toBeVisible({ timeout: 20_000 })
      await card.getByRole('button', { name: 'Одобрить' }).click()
      await expect(card).toHaveCount(0, { timeout: 20_000 })
    } finally {
      await saContext.close()
    }

    const guest = await browser.newContext()
    const guestPage = await guest.newPage()
    try {
      await guestPage.goto('/market')
      await expect(guestPage.getByTestId('catalog-toolbar')).toBeVisible({ timeout: 20_000 })
      await guestPage.locator('#market-search').fill(title)
      const productLink = guestPage.getByRole('link', { name: new RegExp(title) })
      await expect(productLink).toBeVisible({ timeout: 20_000 })
      const catChip = guestPage.getByRole('option', { name: categoryName })
      if (await catChip.isVisible().catch(() => false)) {
        await catChip.click()
        await expect(productLink).toBeVisible({ timeout: 10_000 })
      }
      await productLink.click()
      await expect(guestPage.getByTestId('order-form')).toBeVisible({ timeout: 15_000 })
      await guestPage.locator('#buyer_name').fill('E2E Покупатель')
      await guestPage.locator('#buyer_phone').fill(buyerPhone)
      await guestPage.locator('#quantity').fill('1')
      await guestPage.getByRole('button', { name: 'Оставить заявку' }).click()
      await expect(guestPage.getByTestId('order-success')).toBeVisible({ timeout: 20_000 })
    } finally {
      await guest.close()
    }

    await page.goto('/seller-market/orders')
    const orderCard = page.locator('li').filter({ hasText: title })
    await expect(orderCard).toBeVisible({ timeout: 20_000 })
    await expect(orderCard.getByTestId('buyer-phone')).toContainText(buyerPhone)
    await orderCard.getByRole('button', { name: 'Связались' }).click()
    await expect(orderCard.getByRole('button', { name: 'Подтверждена' })).toBeVisible({
      timeout: 15_000,
    })

    await cancelE2eOrders(page, title)
    await archiveE2eListings(page)
  })

  test('отклонение: причина видна, на витрине нет, без самопубликации', async ({
    page,
    browser,
  }) => {
    const title = `${E2E_LISTING_PREFIX}reject-${Date.now()}`
    const reason = `E2E причина отклонения ${Date.now()}`

    await loginOrgAdmin(page, org)
    await page.getByRole('link', { name: /^Создать( объявление)?$/ }).first().click()
    await expect(page.getByTestId('listing-form')).toBeVisible({ timeout: 15_000 })
    await fillListingForm(page, { title, categoryName })
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page).toHaveURL(/\/seller-market\/listings\/[^/]+/, { timeout: 20_000 })
    const submitWait = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        /\/api\/marketplace\/listings\/[^/]+\/submit/.test(r.url()),
      { timeout: 25_000 },
    )
    await page.getByRole('button', { name: 'Отправить на модерацию' }).click()
    const submitRes = await submitWait
    expect(submitRes.status(), await submitRes.text()).toBe(200)
    await page.goto('/seller-market/listings')
    await expect(
      page.locator('li').filter({ hasText: title }).getByText('На модерации'),
    ).toBeVisible({ timeout: 15_000 })

    const saContext = await browser.newContext()
    const saPage = await saContext.newPage()
    try {
      await loginSuperAdminUi(saPage)
      await gotoPath(saPage, '/superadmin/marketplace')
      const card = saPage.locator('li').filter({ hasText: title })
      await expect(card).toBeVisible({ timeout: 20_000 })
      await card.getByRole('button', { name: 'Отклонить' }).click()
      await saPage.getByTestId('reject-reason-input').fill(reason)
      await saPage.getByTestId('reject-confirm').click()
      await expect(card).toHaveCount(0, { timeout: 20_000 })
    } finally {
      await saContext.close()
    }

    await page.goto('/seller-market/listings')
    const row = page.locator('li').filter({ hasText: title })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await expect(row.getByText('Отклонён')).toBeVisible()
    await row.getByRole('link', { name: /Исправить|Открыть/ }).click()
    await expect(page.getByTestId('rejection-reason')).toContainText(reason, {
      timeout: 15_000,
    })
    await expect(page.getByText('Опубликован', { exact: true })).toHaveCount(0)

    const guest = await browser.newContext()
    const guestPage = await guest.newPage()
    try {
      await guestPage.goto('/market')
      await guestPage.locator('#market-search').fill(title)
      await expect(guestPage.getByRole('link', { name: new RegExp(title) })).toHaveCount(0, {
        timeout: 10_000,
      })
    } finally {
      await guest.close()
    }

    await page.goto('/seller-market/listings')
    await archiveE2eListings(page)
  })

  test('marketplace_enabled=false: пункта «Магазин» в меню нет', async ({ page, request }) => {
    await setMarketplaceEnabled(request, saHeaders, org.orgId, false)
    try {
      const res = await page.request.post(
        `${process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/auth/login`,
        {
          data: {
            email: org.adminEmail,
            password: org.tempPassword,
            org_id: org.orgId,
          },
        },
      )
      expect(res.ok(), await res.text()).toBeTruthy()
      const body = (await res.json()) as { access_token: string }
      await page.goto('/login')
      await page.evaluate((token) => {
        localStorage.setItem('agrodesk_token', token)
      }, body.access_token)
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible({
        timeout: 20_000,
      })
      await expect(page.getByRole('link', { name: 'Магазин', exact: true })).toHaveCount(0)
    } finally {
      await setMarketplaceEnabled(request, saHeaders, org.orgId, true)
    }
  })
})

test('marketplace + shifts helpers: вход в рабочее время (demo) без конфликта', async ({
  page,
}) => {
  await loginDemoAdmin(page)
  await gotoPath(page, '/worktime')
  await expect(page.getByRole('heading', { name: 'Рабочее время' })).toBeVisible({
    timeout: 20_000,
  })
})

/**
 * Marketplace e2e helpers — Playwright request API (same pattern as
 * e2e/shipment-requests.spec.ts). Uses a disposable org + E2E-MKT- titles.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API =
  process.env.VITE_API_PROXY_TARGET ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:8000'

export const SUPERADMIN_EMAIL =
  process.env.SUPERADMIN_EMAIL?.trim() || 'admin@agrodesk.local'
export const SUPERADMIN_PASSWORD =
  process.env.SUPERADMIN_PASSWORD?.trim() || 'ChangeMe123!'

export const E2E_LISTING_PREFIX = 'E2E-MKT-'

/** Minimal valid 1×1 PNG for ImageUploader. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

export type DisposableOrg = {
  orgId: string
  orgName: string
  slug: string
  adminEmail: string
  tempPassword: string
}

export async function loginSuperAdminApi(
  request: APIRequestContext,
): Promise<Record<string, string>> {
  const res = await request.post(`${API}/superadmin/api/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = (await res.json()) as { access_token: string }
  return { Authorization: `Bearer ${body.access_token}` }
}

export async function loginSuperAdminUi(page: Page) {
  // Prefer API token + localStorage: UI form login flakes under serial e2e load.
  const res = await page.request.post(`${API}/superadmin/api/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = (await res.json()) as { access_token: string }
  await page.goto('/superadmin/login')
  await page.evaluate((token) => {
    localStorage.setItem('superadmin_token', token)
  }, body.access_token)
  await page.goto('/superadmin/marketplace')
  await expect(page).not.toHaveURL(/\/superadmin\/login/, { timeout: 20_000 })
}

export async function createDisposableMarketplaceOrg(
  request: APIRequestContext,
  saHeaders: Record<string, string>,
): Promise<DisposableOrg> {
  const stamp = Date.now().toString(36)
  const slug = `e2e-mkt-${stamp}`
  const created = await request.post(`${API}/superadmin/api/organizations`, {
    headers: { ...saHeaders, 'Content-Type': 'application/json' },
    data: {
      name: `E2E Marketplace ${stamp}`,
      slug,
      owner_email: `owner-${stamp}@e2e.agrodesk.local`,
      plan: 'trial',
      max_employees: 5,
    },
  })
  expect(created.ok(), await created.text()).toBeTruthy()
  const body = (await created.json()) as {
    organization: { id: string; name: string; slug: string }
    admin_email: string
    temp_password: string
  }

  const enabled = await request.patch(
    `${API}/superadmin/api/organizations/${body.organization.id}`,
    {
      headers: { ...saHeaders, 'Content-Type': 'application/json' },
      data: { marketplace_enabled: true },
    },
  )
  expect(enabled.ok(), await enabled.text()).toBeTruthy()
  const patched = (await enabled.json()) as { marketplace_enabled: boolean }
  expect(patched.marketplace_enabled).toBe(true)

  return {
    orgId: body.organization.id,
    orgName: body.organization.name,
    slug: body.organization.slug,
    adminEmail: body.admin_email,
    tempPassword: body.temp_password,
  }
}

export async function setMarketplaceEnabled(
  request: APIRequestContext,
  saHeaders: Record<string, string>,
  orgId: string,
  enabled: boolean,
): Promise<void> {
  const res = await request.patch(`${API}/superadmin/api/organizations/${orgId}`, {
    headers: { ...saHeaders, 'Content-Type': 'application/json' },
    data: { marketplace_enabled: enabled },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = (await res.json()) as { marketplace_enabled: boolean }
  expect(body.marketplace_enabled).toBe(enabled)
}

export async function deactivateOrg(
  request: APIRequestContext,
  saHeaders: Record<string, string>,
  orgId: string,
): Promise<void> {
  const res = await request.delete(`${API}/superadmin/api/organizations/${orgId}`, {
    headers: saHeaders,
  })
  expect(res.status(), await res.text()).toBe(204)
}

export async function ensureMarketCategory(
  request: APIRequestContext,
  saHeaders: Record<string, string>,
): Promise<{ id: string; name: string }> {
  const name = `E2E Витрина ${Date.now().toString(36)}`
  const created = await request.post(`${API}/superadmin/api/marketplace/categories`, {
    headers: { ...saHeaders, 'Content-Type': 'application/json' },
    data: {
      name,
      slug: `e2e-vitrine-${Date.now()}`,
      is_active: true,
      sort_order: 0,
    },
  })
  expect(created.ok(), await created.text()).toBeTruthy()
  const row = (await created.json()) as { id: string; name: string }
  return { id: row.id, name: row.name }
}

export async function loginOrgAdmin(page: Page, org: DisposableOrg): Promise<void> {
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: {
      email: org.adminEmail,
      password: org.tempPassword,
      org_id: org.orgId,
    },
  })
  expect(res.ok(), await res.text()).toBeTruthy()
  const body = (await res.json()) as { access_token: string }
  await page.goto('/login')
  await page.evaluate((token) => {
    localStorage.setItem('agrodesk_token', token)
  }, body.access_token)
  await page.goto('/seller-market/listings')
  await expect(page.getByRole('heading', { name: 'Магазин на витрине' })).toBeVisible({
    timeout: 20_000,
  })
}

export async function orgAuthHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
  expect(token).toBeTruthy()
  return { Authorization: `Bearer ${token}` }
}

export async function archiveE2eListings(page: Page): Promise<void> {
  const headers = await orgAuthHeaders(page)
  const list = await page.request.get(`${API}/api/marketplace/listings`, { headers })
  if (!list.ok()) return
  const body = (await list.json()) as {
    items: Array<{ id: string; title: string; status: string }>
  }
  for (const item of body.items ?? []) {
    if (!item.title.startsWith(E2E_LISTING_PREFIX)) continue
    if (item.status === 'archived') continue
    await page.request.post(`${API}/api/marketplace/listings/${item.id}/archive`, {
      headers,
    })
  }
}

export async function cancelE2eOrders(page: Page, listingTitle: string): Promise<void> {
  const headers = await orgAuthHeaders(page)
  const list = await page.request.get(`${API}/api/marketplace/orders`, { headers })
  if (!list.ok()) return
  const orders = (await list.json()) as Array<{
    id: string
    listing_title: string
    status: string
  }>
  for (const order of orders) {
    if (order.listing_title !== listingTitle) continue
    if (order.status === 'cancelled' || order.status === 'completed') continue
    await page.request.patch(`${API}/api/marketplace/orders/${order.id}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { status: 'cancelled' },
    })
  }
}

export async function fillListingForm(
  page: Page,
  opts: { title: string; categoryName: string; price?: string; qty?: string },
): Promise<void> {
  await page.locator('#title').fill(opts.title)
  const catSelect = page.locator('#category_id')
  const options = catSelect.locator('option')
  const count = await options.count()
  let selected = false
  for (let i = 0; i < count; i += 1) {
    const text = (await options.nth(i).textContent())?.trim() ?? ''
    if (text === opts.categoryName || text.endsWith(opts.categoryName)) {
      await catSelect.selectOption({ index: i })
      selected = true
      break
    }
  }
  expect(selected, `category ${opts.categoryName} in select`).toBeTruthy()
  await page.locator('#price').fill(opts.price ?? '150')
  await page.locator('#unit').fill('кг')
  await page.locator('#qty').fill(opts.qty ?? '5')

  const fileInput = page.locator('[data-testid="listing-form"] input[type="file"]')
  await fileInput.setInputFiles({
    name: 'e2e-shot.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })
  await expect(page.getByAltText('Превью')).toBeVisible({ timeout: 20_000 })
  // Ensure RHF photos field is non-empty before submit (upload onChange).
  await expect
    .poll(async () => page.locator('[data-testid="listing-form"] img[alt="Превью"]').count())
    .toBeGreaterThan(0)
}

import { expect, test } from '@playwright/test'
import { loginDemoAdmin, loginDemoEmployee, gotoPath } from './helpers'

test.describe.configure({ mode: 'serial' })

test('мессенджер: direct-чат и обмен сообщениями между сотрудниками', async ({
  browser,
}) => {
  test.setTimeout(90_000)

  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await loginDemoEmployee(pageA, 'EMP001')
  await loginDemoEmployee(pageB, 'EMP002')

  await pageA.goto('/messenger')
  await expect(pageA.getByTestId('messenger-page')).toBeVisible({ timeout: 15_000 })
  await expect(pageA.getByTestId('new-group-chat')).toHaveCount(0)
  await expect(pageA.getByTestId('new-direct-chat')).toBeVisible()

  await pageA.getByTestId('new-direct-chat').click()
  await expect(pageA.getByRole('dialog', { name: 'Новый чат' })).toBeVisible()

  const peer = pageA
    .locator('[role="dialog"] label')
    .filter({ hasText: 'Петров Александр Иванович' })
  await expect(peer).toBeVisible({ timeout: 15_000 })
  await peer.click()
  await pageA.getByRole('button', { name: 'Написать' }).click()

  await expect(pageA).toHaveURL(/\/messenger\/[^/]+/, { timeout: 15_000 })
  await expect(pageA.getByTestId('chat-dialog')).toBeVisible({ timeout: 15_000 })
  const chatUrl = pageA.url()
  const unique = `e2e-msg-${Date.now()}`
  await pageA.getByTestId('message-input').fill(unique)
  await pageA.getByTestId('send-message').click()
  await expect(pageA.locator('[data-message-id]').filter({ hasText: unique })).toBeVisible({
    timeout: 10_000,
  })

  await pageB.goto('/messenger')
  await expect(pageB.getByTestId('messenger-page')).toBeVisible({ timeout: 15_000 })

  const chatRow = pageB
    .locator('[data-chat-id]')
    .filter({ hasText: /Иванов Сергей|e2e-msg-/ })
    .first()

  for (let i = 0; i < 6; i += 1) {
    if (await chatRow.isVisible().catch(() => false)) break
    await pageB.reload({ waitUntil: 'domcontentloaded' })
    await pageB.waitForTimeout(2_000)
  }
  await expect(chatRow).toBeVisible({ timeout: 10_000 })
  await chatRow.click()
  await expect(pageB.getByTestId('chat-dialog')).toBeVisible()
  await expect(pageB.getByTestId('message-thread')).toBeVisible({ timeout: 15_000 })
  await pageB.getByTestId('message-thread').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(
    pageB.getByTestId('message-thread').getByText(unique, { exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  const reply = `e2e-reply-${Date.now()}`
  await pageB.getByTestId('message-input').fill(reply)
  await pageB.getByTestId('send-message').click()
  await pageB.getByTestId('message-thread').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(
    pageB.getByTestId('message-thread').getByText(reply, { exact: true }),
  ).toBeVisible({ timeout: 10_000 })

  for (let i = 0; i < 15; i += 1) {
    if (
      await pageA
        .getByTestId('message-thread')
        .getByText(reply, { exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      break
    }
    try {
      await pageA.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    } catch {
      // Concurrent HMR / navigation abort — retry.
    }
    await expect(pageA.getByTestId('chat-dialog')).toBeVisible({ timeout: 15_000 }).catch(() => undefined)
    await pageA
      .getByTestId('message-thread')
      .evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
      .catch(() => undefined)
    await pageA.waitForTimeout(2_000)
  }
  await expect(
    pageA.getByTestId('message-thread').getByText(reply, { exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  await contextA.close()
  await contextB.close()
})

test('мессенджер: group — admin создаёт, участники переписываются', async ({ browser }) => {
  test.setTimeout(90_000)
  const adminCtx = await browser.newContext()
  const empCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  const empPage = await empCtx.newPage()

  await loginDemoAdmin(adminPage)
  await loginDemoEmployee(empPage, 'EMP001')

  const groupName = `E2E Group ${Date.now()}`
  await adminPage.goto('/messenger')
  await expect(adminPage.getByTestId('new-group-chat')).toBeVisible({ timeout: 15_000 })
  await adminPage.getByTestId('new-group-chat').click()
  await adminPage.getByTestId('group-name-input').fill(groupName)
  await adminPage
    .locator('[role="dialog"] label')
    .filter({ hasText: 'Иванов Сергей Николаевич' })
    .click()
  await adminPage.getByTestId('create-group-submit').click()
  await expect(adminPage.getByTestId('chat-dialog')).toBeVisible({ timeout: 15_000 })
  await expect(adminPage.getByText(groupName).first()).toBeVisible()

  const body = `group-hi-${Date.now()}`
  await adminPage.getByTestId('message-input').fill(body)
  await adminPage.getByTestId('send-message').click()
  await expect(adminPage.locator('[data-message-id]').filter({ hasText: body })).toBeVisible()

  await gotoPath(empPage, '/messenger')
  await expect(empPage.getByTestId('messenger-page')).toBeVisible({ timeout: 15_000 })
  const row = empPage.locator('[data-chat-id]').filter({ hasText: groupName }).first()
  for (let i = 0; i < 6; i += 1) {
    if (await row.isVisible().catch(() => false)) break
    try {
      await empPage.reload({ waitUntil: 'domcontentloaded' })
    } catch {
      await gotoPath(empPage, '/messenger')
    }
    await empPage.waitForTimeout(2_000)
  }
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click()
  await expect(empPage.locator('[data-message-id]').filter({ hasText: body })).toBeVisible({
    timeout: 15_000,
  })

  await adminCtx.close()
  await empCtx.close()
})

test('мессенджер: mobile split — список и диалог как отдельные экраны', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await loginDemoEmployee(page, 'EMP001')
  await page.goto('/messenger')
  await expect(page.getByTestId('messenger-chat-list')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('messenger-dialog-pane')).toBeHidden()

  const row = page.locator('[data-chat-id]').first()
  if ((await row.count()) === 0) {
    await page.getByTestId('new-direct-chat').click()
    await page
      .locator('[role="dialog"] label')
      .filter({ hasText: 'Петров Александр Иванович' })
      .click()
    await page.getByRole('button', { name: 'Написать' }).click()
  } else {
    await row.click()
  }

  await expect(page.getByTestId('chat-dialog')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('messenger-back')).toBeVisible()
  await expect(page.getByTestId('messenger-chat-list')).toBeHidden()

  await page.getByTestId('messenger-back').click()
  await expect(page.getByTestId('messenger-chat-list')).toBeVisible()
  await expect(page).toHaveURL(/\/messenger\/?$/)
})

import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(() => {
  // Leave the dialog closed between tests.
  useConfirm().resolve(false)
})

describe('useConfirm', () => {
  it('starts closed', () => {
    expect(useConfirm().state.value.open).toBe(false)
  })

  it('opens with the supplied copy', () => {
    const { confirm, state, resolve } = useConfirm()
    void confirm({ title: 'Delete this?', message: 'It cannot be undone.', danger: true })

    expect(state.value).toMatchObject({
      open: true,
      title: 'Delete this?',
      message: 'It cannot be undone.',
      danger: true,
    })
    resolve(false)
  })

  it('resolves true when confirmed', async () => {
    const { confirm, resolve } = useConfirm()
    const answer = confirm({ title: 'Sure?' })

    resolve(true)
    await expect(answer).resolves.toBe(true)
  })

  it('resolves false when cancelled', async () => {
    const { confirm, resolve } = useConfirm()
    const answer = confirm({ title: 'Sure?' })

    resolve(false)
    await expect(answer).resolves.toBe(false)
  })

  it('closes and clears the copy once answered', async () => {
    const { confirm, state, resolve } = useConfirm()
    const answer = confirm({ title: 'Sure?', message: 'Really?' })

    resolve(true)
    await answer

    expect(state.value.open).toBe(false)
    expect(state.value.title).toBe('')
    expect(state.value.message).toBeUndefined()
  })

  it('is reachable from a separate call site — the dialog renders elsewhere', async () => {
    const answer = useConfirm().confirm({ title: 'Sure?' })
    useConfirm().resolve(true)

    await expect(answer).resolves.toBe(true)
  })

  it('does not throw when resolved with nothing pending', () => {
    expect(() => useConfirm().resolve(true)).not.toThrow()
  })

  it('lets a second prompt resolve normally after the first', async () => {
    const { confirm, resolve } = useConfirm()

    const first = confirm({ title: 'First' })
    resolve(true)
    await expect(first).resolves.toBe(true)

    const second = confirm({ title: 'Second' })
    resolve(false)
    await expect(second).resolves.toBe(false)
  })
})

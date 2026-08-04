import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import MemberRow from '~/components/member/Row.vue'
import type { Profile } from '~/types'

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-2',
  email: 'ada@example.com',
  full_name: 'Ada Lovelace',
  avatar_url: null,
  status: 'pending',
  is_admin: false,
  created_at: '2026-08-01T00:00:00.000Z',
  decided_at: null,
  decided_by: null,
  ...overrides,
})

const mount = (props: { profile: Profile; manageable?: boolean; saving?: boolean }) =>
  mountSuspended(MemberRow, {
    props: { manageable: true, saving: false, ...props },
  })

const buttonLabels = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll('button').map(button => button.text())

describe('rendering', () => {
  it('shows the name and email', async () => {
    const wrapper = await mount({ profile: profile() })

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('falls back to the email when there is no name', async () => {
    const wrapper = await mount({ profile: profile({ full_name: null }) })
    expect(wrapper.text()).toContain('ada@example.com')
  })

  it('labels each status', async () => {
    expect((await mount({ profile: profile({ status: 'pending' }) })).text()).toContain('Pending')
    expect((await mount({ profile: profile({ status: 'approved' }) })).text()).toContain('Approved')
    expect((await mount({ profile: profile({ status: 'rejected' }) })).text()).toContain('Declined')
  })

  it('marks admins', async () => {
    const wrapper = await mount({ profile: profile({ is_admin: true }) })
    expect(wrapper.text()).toContain('Admin')
  })

  it('shows when the account joined', async () => {
    const wrapper = await mount({ profile: profile() })
    expect(wrapper.text()).toContain('Aug 1, 2026')
  })
})

describe('actions', () => {
  it('offers approve and decline while pending', async () => {
    const wrapper = await mount({ profile: profile({ status: 'pending' }) })
    expect(buttonLabels(wrapper)).toEqual(['Approve', 'Decline'])
  })

  it('offers only revoke once approved', async () => {
    const wrapper = await mount({ profile: profile({ status: 'approved' }) })
    expect(buttonLabels(wrapper)).toEqual(['Revoke'])
  })

  it('offers a way back in for a declined account', async () => {
    const wrapper = await mount({ profile: profile({ status: 'rejected' }) })
    expect(buttonLabels(wrapper)).toEqual(['Approve'])
  })

  it('emits the profile with the decision', async () => {
    const row = profile({ status: 'pending' })
    const wrapper = await mount({ profile: row })

    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('approve')?.[0]).toEqual([row])

    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('decline')?.[0]).toEqual([row])
  })

  it('hides every control on the admin\'s own row', async () => {
    // Self-edits are refused by RLS, so offering the button would only fail.
    const wrapper = await mount({ profile: profile({ status: 'approved' }), manageable: false })

    expect(buttonLabels(wrapper)).toEqual([])
    expect(wrapper.text()).toContain('(you)')
  })

  it('swaps the buttons for a spinner while saving', async () => {
    const wrapper = await mount({ profile: profile({ status: 'pending' }), saving: true })

    expect(buttonLabels(wrapper)).toEqual([])
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })
})

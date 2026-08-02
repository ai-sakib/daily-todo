import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TodoRow from '~/components/todo/Row.vue'
import type { DailyTodo } from '~/types'

const todo = (overrides: Partial<DailyTodo> = {}): DailyTodo => ({
  id: 'todo-1',
  user_id: 'user-1',
  todo_date: '2026-08-03',
  item_key: 'read',
  item_name: 'Read a book',
  is_completed: false,
  completed_at: null,
  created_at: '2026-08-03T00:00:00.000Z',
  updated_at: '2026-08-03T00:00:00.000Z',
  ...overrides,
})

interface RowProps {
  todo: DailyTodo
  editable?: boolean
  removable?: boolean
}

const mount = (props: RowProps) => mountSuspended(TodoRow, { props })

const checkbox = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.get('[role="checkbox"]')

describe('rendering', () => {
  it('shows the item name', async () => {
    const wrapper = await mount({ todo: todo() })
    expect(wrapper.text()).toContain('Read a book')
  })

  it('exposes an unchecked checkbox for an open item', async () => {
    const wrapper = await mount({ todo: todo() })
    expect(checkbox(wrapper).attributes('aria-checked')).toBe('false')
  })

  it('marks a completed item checked and struck through', async () => {
    const wrapper = await mount({ todo: todo({ is_completed: true }) })

    expect(checkbox(wrapper).attributes('aria-checked')).toBe('true')
    expect(wrapper.html()).toContain('line-through')
  })

  it('shows the completion time when there is one', async () => {
    const wrapper = await mount({
      todo: todo({ is_completed: true, completed_at: '2026-08-03T03:41:00.000Z' }),
    })
    // Asia/Dhaka is UTC+6.
    expect(wrapper.text()).toContain('Done at 09:41 AM')
  })

  it('omits the completion time when the timestamp is missing', async () => {
    const wrapper = await mount({ todo: todo({ is_completed: true, completed_at: null }) })
    expect(wrapper.text()).not.toContain('Done at')
  })

  it('labels the checkbox with the item name for screen readers', async () => {
    const wrapper = await mount({ todo: todo() })
    expect(checkbox(wrapper).attributes('aria-label')).toBe('Read a book')
  })
})

describe('actions', () => {
  it('emits toggle when the checkbox is clicked', async () => {
    const wrapper = await mount({ todo: todo() })
    await checkbox(wrapper).trigger('click')

    expect(wrapper.emitted('toggle')?.[0]?.[0]).toMatchObject({ id: 'todo-1' })
  })

  it('hides both actions by default', async () => {
    const wrapper = await mount({ todo: todo() })

    expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(false)
  })

  it('shows only the rename action when editable', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })

    expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(false)
  })

  it('shows only the delete action when removable', async () => {
    const wrapper = await mount({ todo: todo(), removable: true })

    expect(wrapper.find('[aria-label="Rename"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(true)
  })

  it('emits remove when the delete action is used', async () => {
    const wrapper = await mount({ todo: todo(), removable: true })
    await wrapper.get('[aria-label="Remove"]').trigger('click')

    expect(wrapper.emitted('remove')?.[0]?.[0]).toMatchObject({ id: 'todo-1' })
  })

  it('toggles when a non-editable title is clicked', async () => {
    // With no inline editing available, the whole row should behave as a target.
    const wrapper = await mount({ todo: todo() })
    await wrapper.get('button.block').trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})

describe('inline editing', () => {
  const startEditing = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    await wrapper.get('[aria-label="Rename"]').trigger('click')
    return wrapper.get('input[type="text"]')
  }

  it('opens an input seeded with the current name', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    expect((input.element as HTMLInputElement).value).toBe('Read a book')
  })

  it('opens when the title itself is clicked', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    await wrapper.get('button.block').trigger('click')

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.emitted('toggle')).toBeUndefined() // clicking the title edits, not ticks
  })

  it('commits on Enter', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('Read two books')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('rename')?.[0]?.[1]).toBe('Read two books')
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('commits on blur', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('Renamed by blur')
    await input.trigger('blur')

    expect(wrapper.emitted('rename')?.[0]?.[1]).toBe('Renamed by blur')
  })

  it('discards on Escape', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('Thrown away')
    await input.trigger('keydown.esc')

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('does not re-emit when Escape is followed by the blur it causes', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('Thrown away')
    await input.trigger('keydown.esc')
    await input.trigger('blur')

    expect(wrapper.emitted('rename')).toBeUndefined()
  })

  it('emits once when Enter is followed by the blur it causes', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('Committed once')
    await input.trigger('keydown.enter')
    await input.trigger('blur')

    expect(wrapper.emitted('rename')).toHaveLength(1)
  })

  it('ignores an unchanged name', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('rename')).toBeUndefined()
  })

  it('ignores a blank name and closes the editor', async () => {
    const wrapper = await mount({ todo: todo(), editable: true })
    const input = await startEditing(wrapper)

    await input.setValue('   ')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('hides the action buttons while editing', async () => {
    const wrapper = await mount({ todo: todo(), editable: true, removable: true })
    await startEditing(wrapper)

    expect(wrapper.find('[aria-label="Remove"]').exists()).toBe(false)
  })
})

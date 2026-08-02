import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ProgressRing from '~/components/base/ProgressRing.vue'

interface RingProps {
  value: number
  size?: number
  stroke?: number
}

const mount = (props: RingProps) => mountSuspended(ProgressRing, { props })

/** The arc is drawn by offsetting a dash the length of the full circumference. */
const arcOf = async (props: RingProps) => {
  const wrapper = await mount(props)
  const arc = wrapper.findAll('circle')[1]!
  return {
    circumference: Number(arc.attributes('stroke-dasharray')),
    offset: Number(arc.attributes('stroke-dashoffset')),
  }
}

describe('geometry', () => {
  it('offsets the arc fully at 0%', async () => {
    const { circumference, offset } = await arcOf({ value: 0 })
    expect(offset).toBeCloseTo(circumference, 5)
  })

  it('closes the arc at 100%', async () => {
    const { offset } = await arcOf({ value: 100 })
    expect(offset).toBeCloseTo(0, 5)
  })

  it('offsets by half at 50%', async () => {
    const { circumference, offset } = await arcOf({ value: 50 })
    expect(offset).toBeCloseTo(circumference / 2, 5)
  })

  it('derives the circumference from size and stroke', async () => {
    const { circumference } = await arcOf({ value: 50, size: 100, stroke: 10 })
    expect(circumference).toBeCloseTo(2 * Math.PI * 45, 5) // r = (100 - 10) / 2
  })

  it('clamps values outside 0–100 instead of drawing a broken arc', async () => {
    const over = await arcOf({ value: 150 })
    expect(over.offset).toBeCloseTo(0, 5)

    const under = await arcOf({ value: -20 })
    expect(under.offset).toBeCloseTo(under.circumference, 5)
  })

  it('sizes the svg from the size prop', async () => {
    const wrapper = await mount({ value: 40, size: 64 })
    const svg = wrapper.get('svg')

    expect(svg.attributes('width')).toBe('64')
    expect(svg.attributes('height')).toBe('64')
  })
})

describe('content', () => {
  it('shows the percentage by default', async () => {
    const wrapper = await mount({ value: 42 })
    expect(wrapper.text()).toContain('42%')
  })

  it('lets a slot replace the label', async () => {
    const wrapper = await mountSuspended(ProgressRing, {
      props: { value: 42 },
      slots: { default: () => '3 left' },
    })

    expect(wrapper.text()).toContain('3 left')
    expect(wrapper.text()).not.toContain('42%')
  })

  it('announces the value to assistive technology', async () => {
    const wrapper = await mount({ value: 42 })
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('42% complete')
  })
})

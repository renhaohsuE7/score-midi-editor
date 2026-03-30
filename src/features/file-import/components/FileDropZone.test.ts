import { mount } from '@vue/test-utils'
import FileDropZone from './FileDropZone.vue'

describe('FileDropZone', () => {
  it('renders full mode by default', () => {
    const wrapper = mount(FileDropZone)
    expect(wrapper.text()).toContain('Drag')
    expect(wrapper.text()).toContain('Browse Files')
  })

  it('renders compact mode', () => {
    const wrapper = mount(FileDropZone, { props: { compact: true } })
    expect(wrapper.text()).toContain('browse')
    expect(wrapper.text()).not.toContain('Browse Files')
  })

  it('emits filesSelected on file input change', async () => {
    const wrapper = mount(FileDropZone)
    const input = wrapper.find('input[type="file"]')

    const file = new File(['test'], 'test.mid', { type: 'audio/midi' })
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    expect(wrapper.emitted('filesSelected')).toBeTruthy()
    expect(wrapper.emitted('filesSelected')![0]![0]).toHaveLength(1)
  })

  it('emits filesSelected on drop', async () => {
    const wrapper = mount(FileDropZone)
    const zone = wrapper.find('div')

    const file = new File(['test'], 'test.mid')
    await zone.trigger('drop', {
      dataTransfer: { files: [file] },
    })

    expect(wrapper.emitted('filesSelected')).toBeTruthy()
  })

  it('exposes openFilePicker method', () => {
    const wrapper = mount(FileDropZone)
    expect(typeof wrapper.vm.openFilePicker).toBe('function')
  })
})

import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FileList from './FileList.vue'
import { useFilesStore } from '../stores/files.store'

describe('FileList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders file entries from store', () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f1',
      name: 'song.mid',
      type: 'midi',
      size: 2048,
      importedAt: Date.now(),
      status: 'ready',
    })

    const wrapper = mount(FileList)
    expect(wrapper.text()).toContain('song.mid')
    expect(wrapper.text()).toContain('MIDI')
    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.text()).toContain('2.0 KB')
  })

  it('renders MusicXML badge', () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f2',
      name: 'score.musicxml',
      type: 'musicxml',
      size: 1020,
      importedAt: Date.now(),
      status: 'ready',
    })

    const wrapper = mount(FileList)
    expect(wrapper.text()).toContain('MusicXML')
  })

  it('shows parsing status', () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f3',
      name: 'loading.mid',
      type: 'midi',
      size: 500,
      importedAt: Date.now(),
      status: 'parsing',
    })

    const wrapper = mount(FileList)
    expect(wrapper.text()).toContain('Parsing...')
  })

  it('shows error message', () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f4',
      name: 'bad.mid',
      type: 'midi',
      size: 500,
      importedAt: Date.now(),
      status: 'error',
      error: 'Invalid MIDI header',
    })

    const wrapper = mount(FileList)
    expect(wrapper.text()).toContain('Error')
    expect(wrapper.text()).toContain('Invalid MIDI header')
  })

  it('emits remove on delete button click', async () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f5',
      name: 'delete-me.mid',
      type: 'midi',
      size: 100,
      importedAt: Date.now(),
      status: 'ready',
    })

    const wrapper = mount(FileList)
    const removeBtn = wrapper.find('button[title="Remove file"]')
    await removeBtn.trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]![0]).toBe('f5')
  })

  it('selects file on row click', async () => {
    const store = useFilesStore()
    store.addFile({
      id: 'f6',
      name: 'click-me.mid',
      type: 'midi',
      size: 100,
      importedAt: Date.now(),
      status: 'ready',
    })

    const wrapper = mount(FileList)
    const row = wrapper.find('[role="button"]')
    await row.trigger('click')

    expect(store.selectedFileId).toBe('f6')
  })
})

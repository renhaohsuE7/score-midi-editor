import { createRouter, createWebHistory } from 'vue-router'
import { ensureFilesLoaded } from '@/features/file-import/composables/useFileImport'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/views/HomeView.vue'),
    },
    {
      path: '/file/:id',
      name: 'file-detail',
      component: () => import('@/features/file-detail/views/FileDetailView.vue'),
      props: true,
      meta: { hideAppHeader: true },
    },
  ],
})

// Hydrate file store from IndexedDB before any route renders.
// Runs once (singleton promise) — subsequent navigations resolve instantly.
router.beforeEach(() => ensureFilesLoaded())

export default router

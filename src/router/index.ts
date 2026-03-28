import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: () => import('../views/CatalogView.vue'),
    },
    {
      path: '/repository/:name+',
      name: 'repository',
      component: () => import('../views/RepositoryView.vue'),
    },
  ],
})

export default router

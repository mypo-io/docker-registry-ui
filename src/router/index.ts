import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: () => import('@/views/CatalogView.vue'),
    },
    {
      // :name+ allows multi-segment paths like mypo-io/mypo-landing
      path: '/repository/:name+',
      name: 'repository',
      component: () => import('@/views/RepositoryView.vue'),
    },
  ],
})

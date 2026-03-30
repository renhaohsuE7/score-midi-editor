import { createApp } from 'vue'
import { pinia } from '@/app/plugins/pinia'
import router from '@/app/plugins/router'
import App from '@/app/App.vue'
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

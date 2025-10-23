import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './dev/seedDemo'
import './dev/clearCloud'
import './dev/seed45'
// PWA registration
import { registerSW } from 'virtual:pwa-register'
registerSW()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

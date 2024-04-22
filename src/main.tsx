import React from 'react'
import ReactDOM from 'react-dom/client'
import LogProvider from './LogProvider.tsx'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LogProvider>
      <App />
    </LogProvider>
  </React.StrictMode>,
)

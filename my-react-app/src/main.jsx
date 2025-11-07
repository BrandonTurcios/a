import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import './index.css'
import App from './App.jsx'
import antdThemeConfig from './config/antdTheme.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider 
      theme={antdThemeConfig}
      notification={{
        placement: 'topRight',
        top: 24,
        bottom: 24,
        duration: 4,
        rtl: false,
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { getSuiteletBasename } from './lib/suiteletUrl'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find #root element — check index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={getSuiteletBasename()}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

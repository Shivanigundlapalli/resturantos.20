import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import CustomerApp from './customer/CustomerApp.tsx';
import KitchenView from './kitchen/KitchenView.tsx';
import './index.css';

const path = window.location.pathname;
const isCustomerRoute = path.startsWith('/customer') || window.location.search.includes('table=');
const isKitchenRoute = path.startsWith('/kitchen');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCustomerRoute ? <CustomerApp /> : isKitchenRoute ? <KitchenView /> : <App />}
  </StrictMode>,
);


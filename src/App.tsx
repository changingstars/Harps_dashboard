import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import Products from './pages/Products'
import { CartProvider } from './context/CartContext'
import AccountProfile from './pages/AccountProfile'
import Support from './pages/Support'

// Placeholders for now
import Orders from './pages/Orders'
import AdminLayout from './components/AdminLayout'
import AdminGuard from './components/AdminGuard'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminSupport from './pages/admin/AdminSupport'

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<AuthGuard />}>
            {/* Customer Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/account" element={<AccountProfile />} />
              <Route path="/support" element={<Support />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="support" element={<AdminSupport />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App

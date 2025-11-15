import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import ProductList from './components/ProductList'
import ProductDetail from './components/ProductDetail'
import CategoryProducts from './components/CategoryProducts'
import Categories from './components/Categories'
import CategoryDetail from './components/CategoryDetail'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import OrderLookup from './components/OrderLookup'
import MyOrders from './components/MyOrders'
import OrderDetail from './components/OrderDetail'
import About from './components/About'
import Contact from './components/Contact'
import FAQ from './components/FAQ'
import OrderConfirmation from './components/OrderConfirmation'
import PaymentFailed from './components/PaymentFailed'
import Payment3DCallback from './components/Payment3DCallback'
import Profile from './components/Profile'
import Login from './components/Login'
import Addresses from './components/Addresses'
import AddAddress from './components/AddAddress'
import MyReviews from './components/MyReviews'
import Footer from './components/Footer'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import KVKK from './components/KVKK'
import DistanceSelling from './components/DistanceSelling'
import ReturnPolicy from './components/ReturnPolicy'
import ShippingInfo from './components/ShippingInfo'
import TrackShipment from './components/TrackShipment'
import CookiePolicy from './components/CookiePolicy'
import Contract from './components/Contract'
import ContractsList from './components/ContractsList'
import MyContracts from './components/MyContracts'
import NotFound from './components/NotFound'
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import VisitorHeartbeat from './components/VisitorHeartbeat'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
      <CartProvider>
        <Router>
          <VisitorHeartbeat />
          <div className="app">
            <Header />
            <main className="main-content" role="main">
              <Routes>
                <Route path="/" element={<ProductList />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/kategoriler" element={<Categories />} />
                <Route path="/kategori/:categoryId/:categorySlug" element={<CategoryDetail />} />
                <Route path="/category/:categoryName" element={<CategoryProducts />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/siparis-sorgula" element={<OrderLookup />} />
                <Route path="/siparislerim" element={<MyOrders />} />
                <Route path="/siparis/:orderNumber" element={<OrderDetail />} />
                <Route path="/hakkimizda" element={<About />} />
                <Route path="/iletisim" element={<Contact />} />
                <Route path="/sss" element={<FAQ />} />
                <Route path="/siparis-onayi" element={<OrderConfirmation />} />
                <Route path="/odeme-basarisiz" element={<PaymentFailed />} />
                <Route path="/payment/3d-callback" element={<Payment3DCallback />} />
                <Route path="/giris" element={<Login />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/adreslerim" element={<Addresses />} />
                <Route path="/adres-ekle" element={<AddAddress />} />
                <Route path="/yorumlarim" element={<MyReviews />} />
                <Route path="/sozlesmelerim" element={<MyContracts />} />
                <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
                <Route path="/kullanim-kosullari" element={<TermsOfService />} />
                <Route path="/kvkk" element={<KVKK />} />
                <Route path="/mesafeli-satis-sozlesmesi" element={<DistanceSelling />} />
                <Route path="/iade-degisim" element={<ReturnPolicy />} />
                <Route path="/kargo-teslimat" element={<ShippingInfo />} />
                <Route path="/kargo-takip" element={<TrackShipment />} />
                <Route path="/cerez-politikasi" element={<CookiePolicy />} />
                {/* Sözleşmeler */}
                <Route path="/sozlesmeler" element={<ContractsList />} />
                <Route path="/sozlesme/:id" element={<Contract />} />
                {/* Backend redirect route'ları */}
                <Route path="/payment-success" element={<OrderConfirmation />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                {/* 404 Sayfası - En sonda olmalı */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App


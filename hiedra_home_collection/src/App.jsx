import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Loading from './components/Loading'

// Critical components - direkt import (ilk yüklemede gerekli)
// Lazy load edilmeyen: Header, Footer (her sayfada görünür)

// Lazy loaded components - sadece ihtiyaç duyulduğunda yüklenir
const ProductList = lazy(() => import('./components/ProductList'))
const ProductDetail = lazy(() => import('./components/ProductDetail'))
const CategoryProducts = lazy(() => import('./components/CategoryProducts'))
const Categories = lazy(() => import('./components/Categories'))
const CategoryDetail = lazy(() => import('./components/CategoryDetail'))
const Cart = lazy(() => import('./components/Cart'))
const Checkout = lazy(() => import('./components/Checkout'))
const OrderLookup = lazy(() => import('./components/OrderLookup'))
const MyOrders = lazy(() => import('./components/MyOrders'))
const OrderDetail = lazy(() => import('./components/OrderDetail'))
const About = lazy(() => import('./components/About'))
const Contact = lazy(() => import('./components/Contact'))
const FAQ = lazy(() => import('./components/FAQ'))
const OrderConfirmation = lazy(() => import('./components/OrderConfirmation'))
const PaymentFailed = lazy(() => import('./components/PaymentFailed'))
const Payment3DCallback = lazy(() => import('./components/Payment3DCallback'))
const Profile = lazy(() => import('./components/Profile'))
const Login = lazy(() => import('./components/Login'))
const Addresses = lazy(() => import('./components/Addresses'))
const AddAddress = lazy(() => import('./components/AddAddress'))
const MyReviews = lazy(() => import('./components/MyReviews'))
const Coupons = lazy(() => import('./components/Coupons'))
const CouponDetail = lazy(() => import('./components/CouponDetail'))
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./components/TermsOfService'))
const KVKK = lazy(() => import('./components/KVKK'))
const DistanceSelling = lazy(() => import('./components/DistanceSelling'))
const ReturnPolicy = lazy(() => import('./components/ReturnPolicy'))
const ShippingInfo = lazy(() => import('./components/ShippingInfo'))
const TrackShipment = lazy(() => import('./components/TrackShipment'))
const CookiePolicy = lazy(() => import('./components/CookiePolicy'))
const Contract = lazy(() => import('./components/Contract'))
const ContractsList = lazy(() => import('./components/ContractsList'))
const MyContracts = lazy(() => import('./components/MyContracts'))
const NotFound = lazy(() => import('./components/NotFound'))
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import VisitorHeartbeat from './components/VisitorHeartbeat'
import './App.css'

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '60vh' 
  }}>
    <Loading size="large" text="Sayfa yükleniyor..." variant="page" />
  </div>
)

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
            <main id="main-content" className="main-content" role="main" tabIndex="-1">
              <Suspense fallback={<PageLoader />}>
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
                <Route path="/kuponlar" element={<Coupons />} />
                <Route path="/kupon/:id" element={<CouponDetail />} />
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
              </Suspense>
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


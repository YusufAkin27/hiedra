import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from './SEO'
import './FAQ.css'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'Perde siparişimi nasıl verebilirim?',
      answer: 'Sitemizde ürünlerimizi inceleyebilir, beğendiğiniz perdeyi sepete ekleyebilirsiniz. Ürün detay sayfasında en, boy ve pile sıklığı gibi özelleştirmelerinizi yapabilir, fiyatı görüntüleyebilir ve sepete ekleyebilirsiniz. Ödeme adımlarını tamamladıktan sonra siparişiniz bize ulaşır.'
    },
    {
      question: 'Perde ölçülerini nasıl belirleyebilirim?',
      answer: 'Perde ölçülerinizi ürün detay sayfasında belirleyebilirsiniz. En (genişlik) için maksimum 30000 cm, boy (yükseklik) için maksimum 500 cm girilebilir. Ölçülerinizi pencere veya duvar ölçülerinize göre belirleyebilirsiniz. Profesyonel ölçü hizmeti de sunmaktayız, iletişim sayfamızdan randevu alabilirsiniz.'
    },
    {
      question: 'Pile sıklığı nedir? Hangi seçeneği tercih etmeliyim?',
      answer: 'Pile sıklığı, perdenin katlanma sıklığını ifade eder. Seyrek seçeneği daha sade görünüm sunarken, 1x2 ve 1x3 seçenekleri daha fazla katman ve dolgunluk sağlar. Seçim, zevkinize ve dekorasyon tarzınıza göre değişir. Daha dolgun ve şık bir görünüm için 1x3, daha minimal bir görünüm için seyrek tercih edebilirsiniz.'
    },
    {
      question: 'Fiyatlandırma nasıl yapılıyor?',
      answer: 'Fiyatlandırma, ürünün metre fiyatı, seçtiğiniz en (genişlik) ve pile sıklığı çarpanına göre hesaplanır. Seyrek seçeneği x1, 1x2 seçeneği x2, 1x3 seçeneği x3 çarpanı ile hesaplanır. Ürün detay sayfasında seçimlerinizi yaptıktan sonra otomatik olarak güncel fiyatı görebilirsiniz.'
    },
    {
      question: 'Teslimat süresi ne kadar?',
      answer: 'Siparişiniz onaylandıktan sonra, özel ölçü ve üretim sürecimiz yaklaşık 7-14 iş günü sürer. Üretim tamamlandıktan sonra kargo ile gönderim yapılır ve teslimat süresi adresinize göre değişiklik gösterir. Acil durumlarda hızlı teslimat seçeneği de sunmaktayız, detaylar için iletişime geçebilirsiniz.'
    },
    {
      question: 'Montaj hizmeti sunuyor musunuz?',
      answer: 'Evet, profesyonel montaj hizmeti sunmaktayız. Montaj hizmeti için ek ücret alınmaktadır. Siparişiniz sırasında montaj hizmeti talep edebilir veya sonradan randevu alabilirsiniz. Montaj ekibimiz, perdenizin düzgün ve profesyonel bir şekilde takılmasını sağlar.'
    },
    {
      question: 'İade ve değişim politikası nedir?',
      answer: 'Ürünleriniz size ulaştıktan sonra 14 gün içinde iade veya değişim talebinde bulunabilirsiniz. Ürünün kullanılmamış, paket açılmamış ve hasarsız olması gerekmektedir. Özel ölçüde üretilen perdeler için iade kabul edilmemektedir. Detaylı bilgi için iletişim sayfamızdan bize ulaşabilirsiniz.'
    },
    {
      question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
      answer: 'Kredi kartı, banka kartı ve kapıda ödeme seçenekleri sunmaktayız. Online ödeme için güvenli ödeme altyapısı kullanılmaktadır. Kart bilgileriniz saklanmaz ve ödemeler SSL sertifikası ile korunur.'
    },
    {
      question: 'Siparişimi nasıl takip edebilirim?',
      answer: 'Sipariş sorgulama sayfamızdan, sipariş numaranız ve e-posta adresiniz ile siparişinizin durumunu takip edebilirsiniz. Siparişiniz onaylandıktan sonra e-posta ile kargo bilgileriniz de paylaşılır.'
    },
    {
      question: 'Hangi şehirlere teslimat yapıyorsunuz?',
      answer: 'Tüm Türkiye genelinde kargo ile teslimat yapmaktayız. Adres bilgilerinizi doğru girdiğiniz takdirde, kargo şirketleri aracılığıyla siparişiniz adresinize teslim edilir. İstanbul, Ankara, İzmir gibi büyük şehirlerde montaj hizmeti de sunmaktayız.'
    }
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <div className="faq-container">
      <SEO
        title="Sık Sorulan Sorular - Perde Satış SSS | Hiedra Perde"
        description="Perde satış hakkında en çok merak edilen sorular ve cevapları. Perde siparişi, ölçü, teslimat, montaj ve iade politikası hakkında bilgi alın. Perde satış süreci hakkında detaylar."
        keywords="perde sss, perde sık sorulan sorular, perde satış sss, perde sipariş nasıl verilir, perde teslimat, perde montaj, perde iade, perde satış sorular"
        url="/sss"
        structuredData={structuredData}
      />
      <div className="faq-content">
        <header className="faq-header">
          <h1>Sık Sorulan Sorular - Perde Satış</h1>
          <p className="faq-subtitle">Perde satış hakkında merak ettiğiniz soruların cevaplarını burada bulabilirsiniz</p>
        </header>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${openIndex === index ? 'open' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="faq-question-text">{faq.question}</span>
                <span className="faq-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div
                id={`faq-answer-${index}`}
                className="faq-answer"
                aria-hidden={openIndex !== index}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-contact">
          <p>Cevaplayamadığınız bir sorunuz mu var?</p>
          <Link to="/iletisim" className="contact-link">Bize Ulaşın</Link>
        </div>
      </div>
    </div>
  )
}

export default FAQ


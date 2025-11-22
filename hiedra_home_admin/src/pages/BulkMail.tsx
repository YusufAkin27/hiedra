import { useState } from 'react'
import { FaEnvelope, FaPaperPlane, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import type { AuthResponse } from '../services/authService'
import { getAdminHeaders } from '../services/authService'
import { useToast } from '../components/Toast'

type BulkMailPageProps = {
  session: AuthResponse
}

const DEFAULT_API_URL = 'http://localhost:8080/api'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL

function BulkMailPage({ session }: BulkMailPageProps) {
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recipientType, setRecipientType] = useState<'ALL' | 'ACTIVE' | 'VERIFIED'>('ACTIVE')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{
    totalRecipients: number
    successCount: number
    failCount: number
  } | null>(null)
  const [sentMailPreview, setSentMailPreview] = useState<{
    subject: string
    message: string
    htmlContent: string
    recipientType: 'ALL' | 'ACTIVE' | 'VERIFIED'
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim()) {
      toast.error('Lütfen konu başlığı girin.')
      return
    }

    if (!message.trim()) {
      toast.error('Lütfen mesaj içeriği girin.')
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch(`${apiBaseUrl}/admin/mail/bulk-send`, {
        method: 'POST',
        headers: getAdminHeaders(session.accessToken),
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          recipientType,
        }),
      })

      const payload = (await response.json()) as {
        isSuccess?: boolean
        success?: boolean
        data?: {
          totalRecipients: number
          successCount: number
          failCount: number
        }
        message?: string
      }

      const success = payload.isSuccess ?? payload.success ?? false

      if (!success || !payload.data) {
        throw new Error(payload.message ?? 'Mail gönderilemedi.')
      }

      setResult(payload.data)
      
      // Gönderilen mail içeriğinin HTML önizlemesini oluştur
      const htmlContent = createEmailTemplate(subject.trim(), message.trim())
      setSentMailPreview({
        subject: subject.trim(),
        message: message.trim(),
        htmlContent,
        recipientType
      })
      
      toast.success(`Toplu mail gönderimi başlatıldı! ${payload.data.successCount} mail kuyruğa eklendi.`)
      
      // Formu temizle
      setSubject('')
      setMessage('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.'
      toast.error(errorMessage)
      console.error('Toplu mail gönderim hatası:', err)
    } finally {
      setIsSending(false)
    }
  }

  // Mail template oluştur (backend ile aynı)
  const createEmailTemplate = (subject: string, message: string): string => {
    const currentDate = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    })

    const escapeHtml = (text: string): string => {
      if (!text) return ''
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    const formatMessage = (msg: string): string => {
      if (!msg) return ''
      const escaped = escapeHtml(msg)
      return escaped.replace(/\n/g, '<br>')
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
        }
        .email-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        .email-header .date {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 10px;
        }
        .email-body {
            padding: 40px 30px;
        }
        .email-content {
            font-size: 16px;
            line-height: 1.8;
            color: #444444;
            white-space: pre-wrap;
        }
        .email-content p {
            margin-bottom: 20px;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .email-footer .logo {
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }
        .email-footer .info {
            font-size: 12px;
            color: #6c757d;
            margin-top: 15px;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
            .email-header {
                padding: 30px 20px;
            }
            .email-header h1 {
                font-size: 24px;
            }
            .email-body {
                padding: 30px 20px;
            }
            .email-content {
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>📢 ${escapeHtml(subject)}</h1>
            <div class="date">${currentDate}</div>
        </div>
        <div class="email-body">
            <div class="divider"></div>
            <div class="email-content">${formatMessage(message)}</div>
            <div class="divider"></div>
        </div>
        <div class="email-footer">
            <div class="logo">HIEDRA COLLECTION</div>
            <div class="info">
                Bu e-posta HIEDRA COLLECTION tarafından gönderilmiştir.<br>
                Sorularınız için bizimle iletişime geçebilirsiniz.
            </div>
        </div>
    </div>
</body>
</html>`
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header__title">
          <FaEnvelope className="page-header__icon" />
          <h1>Toplu Mail Gönderimi</h1>
        </div>
        <p className="page-header__description">
          Tüm kullanıcılara haber ve duyuru göndermek için bu formu kullanın.
        </p>
      </div>

      <div className="bulk-mail-container">
        <form onSubmit={handleSubmit} className="bulk-mail-form">
          <div className="form-group">
            <label htmlFor="subject" className="form-label">
              Konu Başlığı <span className="required">*</span>
            </label>
            <input
              type="text"
              id="subject"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Örn: Yeni Ürünlerimiz Geldi!"
              disabled={isSending}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipientType" className="form-label">
              Alıcı Tipi
            </label>
            <select
              id="recipientType"
              className="form-select"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as 'ALL' | 'ACTIVE' | 'VERIFIED')}
              disabled={isSending}
            >
              <option value="ACTIVE">Aktif ve Doğrulanmış Kullanıcılar</option>
              <option value="VERIFIED">Tüm Doğrulanmış Kullanıcılar</option>
              <option value="ALL">Tüm Kullanıcılar</option>
            </select>
            <small className="form-help">
              {recipientType === 'ACTIVE' && 'Sadece aktif ve email doğrulanmış kullanıcılara gönderilir.'}
              {recipientType === 'VERIFIED' && 'Email doğrulanmış tüm kullanıcılara gönderilir.'}
              {recipientType === 'ALL' && 'Sistemdeki tüm kullanıcılara gönderilir.'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">
              Mesaj İçeriği <span className="required">*</span>
            </label>
            <textarea
              id="message"
              className="form-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Göndermek istediğiniz mesajı buraya yazın..."
              rows={12}
              disabled={isSending}
              required
            />
            <small className="form-help">
              Mesajınız haber/duyuru formatında güzel bir şekilde formatlanacaktır.
            </small>
          </div>

          {result && (
            <div className="result-card">
              <div className="result-card__header">
                <FaCheckCircle className="result-card__icon" />
                <h3>Gönderim Sonucu</h3>
              </div>
              <div className="result-card__content">
                <div className="result-stat">
                  <span className="result-stat__label">Toplam Alıcı:</span>
                  <span className="result-stat__value">{result.totalRecipients}</span>
                </div>
                <div className="result-stat result-stat--success">
                  <span className="result-stat__label">Başarılı:</span>
                  <span className="result-stat__value">{result.successCount}</span>
                </div>
                {result.failCount > 0 && (
                  <div className="result-stat result-stat--error">
                    <span className="result-stat__label">Başarısız:</span>
                    <span className="result-stat__value">{result.failCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isSending || !subject.trim() || !message.trim()}
            >
              {isSending ? (
                <>
                  <FaSpinner className="btn-icon btn-icon--spinning" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <FaPaperPlane className="btn-icon" />
                  Mail Gönder
                </>
              )}
            </button>
          </div>
        </form>

        {sentMailPreview && (
          <div className="mail-preview-card">
            <div className="mail-preview-header">
              <h3>📧 Gönderilen Mail Önizlemesi</h3>
              <button
                type="button"
                className="btn-close-preview"
                onClick={() => setSentMailPreview(null)}
              >
                ✕
              </button>
            </div>
            <div className="mail-preview-info">
              <div className="preview-info-item">
                <strong>Konu:</strong> {sentMailPreview.subject}
              </div>
              <div className="preview-info-item">
                <strong>Alıcı Tipi:</strong> {
                  sentMailPreview.recipientType === 'ACTIVE' ? 'Aktif ve Doğrulanmış Kullanıcılar' :
                  sentMailPreview.recipientType === 'VERIFIED' ? 'Tüm Doğrulanmış Kullanıcılar' :
                  'Tüm Kullanıcılar'
                }
              </div>
            </div>
            <div className="mail-preview-content">
              <iframe
                srcDoc={sentMailPreview.htmlContent}
                title="Mail Önizlemesi"
                className="mail-preview-iframe"
              />
            </div>
          </div>
        )}

        <div className="bulk-mail-info">
          <div className="info-card">
            <FaExclamationTriangle className="info-card__icon" />
            <h3>Önemli Bilgiler</h3>
            <ul>
              <li>Mail'ler kuyruğa eklenir ve sırayla gönderilir.</li>
              <li>Çok sayıda alıcı varsa gönderim biraz zaman alabilir.</li>
              <li>Mail'ler profesyonel bir haber/duyuru formatında gönderilir.</li>
              <li>Gönderim sonrası sonuçları ve mail önizlemesini görebilirsiniz.</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .page-container {
          min-height: 100vh;
          background: #ffffff;
          padding: 30px 20px;
        }

        .page-header {
          max-width: 1200px;
          margin: 0 auto 30px;
          padding: 30px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
          color: #000000;
        }

        .page-header__title {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 12px;
        }

        .page-header__icon {
          font-size: 32px;
          color: #000000;
          opacity: 0.95;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #000000;
        }

        .page-header__description {
          margin: 0;
          font-size: 16px;
          color: #333333;
          line-height: 1.6;
        }

        .bulk-mail-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .bulk-mail-form {
          background: #ffffff;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #000000;
          font-size: 14px;
        }

        .required {
          color: #ff0000;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #000000;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s;
          background: #ffffff;
          color: #000000;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #000000;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
          background: #ffffff;
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #999;
        }

        .form-textarea {
          resize: vertical;
          min-height: 200px;
          line-height: 1.6;
        }

        .form-help {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: #666666;
        }

        .form-actions {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-primary {
          background: #000000;
          color: #ffffff;
          border: 2px solid #000000;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          background: #333333;
          border-color: #333333;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-lg {
          padding: 14px 32px;
          font-size: 16px;
        }

        .btn-icon {
          font-size: 16px;
        }

        .btn-icon--spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .result-card {
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .result-card__header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .result-card__icon {
          color: #000000;
          font-size: 20px;
        }

        .result-card__header h3 {
          margin: 0;
          color: #000000;
          font-size: 18px;
        }

        .result-card__content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .result-stat {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 6px;
          border: 1px solid #000000;
        }

        .result-stat__label {
          font-weight: 600;
          color: #000000;
        }

        .result-stat__value {
          font-weight: 700;
          color: #000000;
        }

        .result-stat--success .result-stat__value {
          color: #16a34a;
        }

        .result-stat--error .result-stat__value {
          color: #ff0000;
        }

        .bulk-mail-info {
          margin-top: 30px;
        }

        .info-card {
          background: #ffffff;
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 20px;
        }

        .info-card__icon {
          color: #000000;
          font-size: 24px;
          margin-bottom: 10px;
        }

        .info-card h3 {
          margin: 0 0 15px 0;
          color: #000000;
          font-size: 18px;
        }

        .info-card ul {
          margin: 0;
          padding-left: 20px;
          color: #333333;
        }

        .info-card li {
          margin-bottom: 8px;
          line-height: 1.6;
        }

        .mail-preview-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 2px solid #000000;
        }

        .mail-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #000000;
        }

        .mail-preview-header h3 {
          margin: 0;
          color: #000000;
          font-size: 20px;
          font-weight: 700;
        }

        .btn-close-preview {
          background: transparent;
          border: 2px solid #000000;
          color: #000000;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-close-preview:hover {
          background: #000000;
          color: #ffffff;
        }

        .mail-preview-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          border: 1px solid #000000;
        }

        .preview-info-item {
          font-size: 14px;
          color: #333333;
        }

        .preview-info-item strong {
          color: #000000;
          margin-right: 8px;
        }

        .mail-preview-content {
          border: 2px solid #000000;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }

        .mail-preview-iframe {
          width: 100%;
          height: 600px;
          border: none;
          display: block;
        }

        @media (max-width: 768px) {
          .bulk-mail-container {
            padding: 15px;
          }

          .bulk-mail-form {
            padding: 20px;
          }

          .form-actions {
            justify-content: stretch;
          }

          .btn-lg {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default BulkMailPage


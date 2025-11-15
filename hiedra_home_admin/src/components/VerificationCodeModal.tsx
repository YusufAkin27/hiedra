import { useEffect, useState } from 'react'
import { FaTimes, FaEnvelope, FaSpinner, FaCheckCircle, FaRedo } from 'react-icons/fa'
import './VerificationCodeModal.css'

export type VerificationCodeModalProps = {
  isOpen: boolean
  email: string
  onVerify: (code: string) => Promise<void>
  onCancel: () => void
  onResendCode?: () => Promise<void>
  isLoading?: boolean
  isResending?: boolean
}

function VerificationCodeModal({
  isOpen,
  email,
  onVerify,
  onCancel,
  onResendCode,
  isLoading = false,
  isResending = false,
}: VerificationCodeModalProps) {
  const [codeInputs, setCodeInputs] = useState(['', '', '', '', '', ''])
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setResendCountdown(60) // 60 saniye countdown başlat
      // İlk input'a focus ver
      setTimeout(() => {
        const firstInput = document.getElementById('verification-code-input-0') as HTMLInputElement
        if (firstInput) firstInput.focus()
      }, 100)
    } else {
      document.body.style.overflow = ''
      // Modal kapandığında inputları temizle
      setCodeInputs(['', '', '', '', '', ''])
      setResendCountdown(0)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleResendCode = async () => {
    if (resendCountdown > 0 || !onResendCode) return
    await onResendCode()
    setResendCountdown(60) // Yeni kod gönderildiğinde countdown'u sıfırla
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel, isLoading])

  const handleCodeInputChange = (index: number, value: string) => {
    // Sadece rakam kabul et
    if (value && !/^\d$/.test(value)) return

    const newInputs = [...codeInputs]
    newInputs[index] = value

    // Otomatik olarak bir sonraki input'a geç
    if (value && index < 5) {
      const nextInput = document.getElementById(`verification-code-input-${index + 1}`) as HTMLInputElement
      if (nextInput) nextInput.focus()
    }

    setCodeInputs(newInputs)

    // Tüm inputlar doluysa otomatik submit
    const fullCode = newInputs.join('')
    if (fullCode.length === 6) {
      handleVerify(fullCode)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace ile önceki input'a geç
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      const prevInput = document.getElementById(`verification-code-input-${index - 1}`) as HTMLInputElement
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerify = async (code?: string) => {
    const verificationCode = code || codeInputs.join('')

    if (!verificationCode || verificationCode.length !== 6) {
      return
    }

    await onVerify(verificationCode)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newInputs = pastedData.split('')
      setCodeInputs(newInputs)
      // Son input'a focus ver
      setTimeout(() => {
        const lastInput = document.getElementById('verification-code-input-5') as HTMLInputElement
        if (lastInput) lastInput.focus()
      }, 0)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="verification-modal-overlay" onClick={isLoading ? undefined : onCancel}>
      <div className="verification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="verification-modal__header">
          <div className="verification-modal__title-wrapper">
            <FaEnvelope className="verification-modal__icon" />
            <h3 className="verification-modal__title">Email Değişikliği Doğrulama</h3>
          </div>
          {!isLoading && (
            <button
              type="button"
              className="verification-modal__close"
              onClick={onCancel}
              aria-label="Kapat"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="verification-modal__body">
          <div className="verification-modal__info-box">
            <FaEnvelope className="verification-modal__info-icon" />
            <div>
              <p className="verification-modal__message">
                <strong>{email}</strong> adresine gönderilen 6 haneli doğrulama kodunu giriniz.
              </p>
              <p className="verification-modal__sub-message">
                Kodunuzu email kutunuzda kontrol edin. Spam klasörünü de kontrol etmeyi unutmayın.
              </p>
            </div>
          </div>

          <div className="verification-modal__code-wrapper">
            <label className="verification-modal__code-label">Doğrulama Kodu</label>
            <div
              className="verification-modal__code-inputs"
              onPaste={handlePaste}
            >
              {codeInputs.map((value, index) => (
                <input
                  key={index}
                  id={`verification-code-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleCodeInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  disabled={isLoading}
                  className="verification-modal__code-input"
                />
              ))}
            </div>
            
            {onResendCode && (
              <div className="verification-modal__resend-wrapper">
                {resendCountdown > 0 ? (
                  <p className="verification-modal__resend-countdown">
                    Yeni kod talep etmek için <strong>{resendCountdown}</strong> saniye bekleyin
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || isLoading}
                    className="verification-modal__resend-button"
                  >
                    {isResending ? (
                      <>
                        <FaSpinner className="verification-modal__resend-spinner" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <FaRedo />
                        Kodu Tekrar Gönder
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="verification-modal__footer">
          {!isLoading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              İptal
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleVerify()}
            disabled={isLoading || codeInputs.join('').length !== 6}
            style={{ opacity: codeInputs.join('').length !== 6 ? 0.5 : 1 }}
          >
            {isLoading ? (
              <>
                <FaSpinner style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                Doğrulanıyor...
              </>
            ) : (
              <>
                <FaCheckCircle style={{ marginRight: '0.5rem' }} />
                Doğrula ve Email'i Güncelle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerificationCodeModal


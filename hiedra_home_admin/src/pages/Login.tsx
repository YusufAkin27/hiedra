import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react'
import {
  checkAdminEmail,
  checkAdminIp,
  requestLoginCode,
  resendLoginCode,
  verifyLoginCode,
  type AuthResponse,
} from '../services/authService'

type LoginPageProps = {
  onLoginSuccess: (session: AuthResponse) => void
}

const RESEND_COOLDOWN_MS = 3 * 60 * 1000
const RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_MS / 1000
const CODE_LENGTH = 6

type Step = 'request' | 'verify'

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState<string>('')
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [networkStatus, setNetworkStatus] = useState<'pending' | 'allowed' | 'blocked'>('pending')
  const [networkMessage, setNetworkMessage] = useState<string>('Ağ yetkiniz doğrulanıyor...')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    let isMounted = true

    const verifyNetwork = async () => {
      try {
        await checkAdminIp()
        if (!isMounted) {
          return
        }
        setNetworkStatus('allowed')
        setNetworkMessage('')
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Bu ağdan yönetici paneline erişim yetkisi bulunmuyor.'
        if (!isMounted) {
          return
        }
        setNetworkStatus('blocked')
        setNetworkMessage(message)
      }
    }

    verifyNetwork()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!cooldownEndsAt) {
      setRemainingSeconds(0)
      return
    }

    const updateRemaining = () => {
      const diff = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000))
      setRemainingSeconds(diff)

      if (diff === 0) {
        setCooldownEndsAt(null)
      }
    }

    updateRemaining()
    const timer = window.setInterval(updateRemaining, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownEndsAt])

  const cooldownPercent = useMemo(() => {
    if (remainingSeconds <= 0 || remainingSeconds > RESEND_COOLDOWN_SECONDS) {
      return 100
    }

    const elapsed = RESEND_COOLDOWN_SECONDS - remainingSeconds
    return (elapsed / RESEND_COOLDOWN_SECONDS) * 100
  }, [remainingSeconds])

  const countdownLabel = remainingSeconds > 0 ? formatRemaining(remainingSeconds) : 'Hazır'
  const canResend = remainingSeconds <= 0

  const getCodeString = () => {
    return codeDigits.join('')
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) {
      return
    }

    const newDigits = [...codeDigits]
    
    if (value.length > 1) {
      // Yapıştırma durumu
      const pastedValue = value.slice(0, CODE_LENGTH - index)
      for (let i = 0; i < pastedValue.length && index + i < CODE_LENGTH; i++) {
        newDigits[index + i] = pastedValue[i]
      }
      setCodeDigits(newDigits)
      
      // Son dolu kutucuğa odaklan
      const nextEmptyIndex = newDigits.findIndex((digit, idx) => idx >= index && !digit)
      const focusIndex = nextEmptyIndex === -1 ? CODE_LENGTH - 1 : Math.min(nextEmptyIndex, CODE_LENGTH - 1)
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus()
      }, 0)
    } else {
      newDigits[index] = value
      setCodeDigits(newDigits)
      
      // Otomatik ilerleme
      if (value && index < CODE_LENGTH - 1) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus()
        }, 0)
      }
    }
  }

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (codeDigits[index]) {
        // Mevcut kutucuk doluysa, sadece onu temizle
        const newDigits = [...codeDigits]
        newDigits[index] = ''
        setCodeDigits(newDigits)
      } else if (index > 0) {
        // Mevcut kutucuk boşsa, öncekine git ve onu temizle
        const newDigits = [...codeDigits]
        newDigits[index - 1] = ''
        setCodeDigits(newDigits)
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus()
        }, 0)
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pastedData = event.clipboardData.getData('text').trim()
    const digits = pastedData.slice(0, CODE_LENGTH).split('').filter(char => /^\d$/.test(char))
    
    if (digits.length > 0) {
      const newDigits = [...codeDigits]
      for (let i = 0; i < digits.length && i < CODE_LENGTH; i++) {
        newDigits[i] = digits[i]
      }
      setCodeDigits(newDigits)
      
      // Son dolu kutucuğa odaklan
      let lastFilledIndex = -1
      for (let i = newDigits.length - 1; i >= 0; i--) {
        if (newDigits[i]) {
          lastFilledIndex = i
          break
        }
      }
      const focusIndex = lastFilledIndex === -1 ? 0 : Math.min(lastFilledIndex + 1, CODE_LENGTH - 1)
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus()
      }, 0)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (networkStatus !== 'allowed') {
      return
    }

    if (!email) {
      setErrorMessage('E-posta adresi gereklidir.')
      return
    }

    if (step === 'verify') {
      const codeString = getCodeString()
      if (codeString.length !== CODE_LENGTH) {
        setErrorMessage('Lütfen 6 haneli doğrulama kodunu girin.')
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      if (step === 'request') {
        await checkAdminEmail(email)
        await requestLoginCode(email)
        setStatusMessage('Doğrulama kodu gönderildi.')
        setStep('verify')
        setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_MS)
        setCodeDigits(Array(CODE_LENGTH).fill(''))
        // İlk kutucuğa odaklan
        setTimeout(() => {
          inputRefs.current[0]?.focus()
        }, 100)
      } else {
        const codeString = getCodeString()
        const authResponse = await verifyLoginCode(email, codeString)
        onLoginSuccess(authResponse)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeEmail = () => {
    setStep('request')
    setCodeDigits(Array(CODE_LENGTH).fill(''))
    setStatusMessage(null)
    setErrorMessage(null)
    setCooldownEndsAt(null)
  }

  const handleResend = async () => {
    if (!email || !canResend || networkStatus !== 'allowed') {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await resendLoginCode(email)
      setStatusMessage('Doğrulama kodu gönderildi.')
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_MS)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Kod gönderilemedi.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page page--centered">
      <section className="login-card" aria-live="polite">
        <header className="login-card__header">
          <h1>{step === 'request' ? 'Giriş' : 'Doğrulama'}</h1>
          {step === 'verify' ? (
            <button type="button" className="login-card__back" onClick={handleChangeEmail}>
              ← Geri
            </button>
          ) : null}
        </header>

        {networkStatus !== 'allowed' ? (
          <div className="login-network">
            <p className="login-network__title">
              {networkStatus === 'pending' ? 'Ağ doğrulaması yapılıyor…' : 'Erişim engellendi'}
            </p>
            <p className="login-network__message">{networkMessage}</p>
            <p className="login-network__hint">
              Lütfen yetkili ağ üzerinden bağlanın veya sistem yöneticinizle iletişime geçin.
            </p>
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            placeholder="ornek@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            aria-describedby={errorMessage ? 'login-error' : undefined}
            required
            disabled={isSubmitting || step === 'verify' || networkStatus !== 'allowed'}
          />

          {step === 'verify' && (
            <div className="login-form__code-wrapper">
              <label htmlFor="code-0" className="login-form__code-label">
                Doğrulama Kodu
              </label>
              <div className="login-form__code-inputs" role="group" aria-label="Doğrulama kodu girişi">
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleCodeChange(index, event.target.value)}
                    onKeyDown={(event) => handleCodeKeyDown(index, event)}
                    onPaste={handleCodePaste}
                    autoComplete="off"
                    disabled={isSubmitting || networkStatus !== 'allowed'}
                    required
                    className="login-form__code-input"
                    aria-label={`Kod hanesi ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {(errorMessage || statusMessage) && (
            <div 
              className={`login-form__status-message ${errorMessage ? 'login-form__status-message--error' : 'login-form__status-message--success'}`}
              role={errorMessage ? 'alert' : 'status'}
              aria-live={errorMessage ? 'assertive' : 'polite'}
            >
              <span className="login-form__status-icon">
                {errorMessage ? '✕' : '✓'}
              </span>
              <span className="login-form__status-text">
                {errorMessage || statusMessage}
              </span>
            </div>
          )}

          <button
            className="login-form__submit"
            type="submit"
            disabled={isSubmitting || networkStatus !== 'allowed'}
          >
            {isSubmitting
              ? step === 'request'
                ? 'Gönderiliyor...'
                : 'Doğrulanıyor...'
              : step === 'request'
                ? 'Devam Et'
                : 'Giriş Yap'}
          </button>

          {step === 'verify' ? (
            <div className="login-form__resend">
              <button
                type="button"
                className={`login-form__resend-button ${isSubmitting ? 'login-form__resend-button--loading' : ''}`}
                onClick={handleResend}
                disabled={isSubmitting || !canResend || networkStatus !== 'allowed'}
              >
                <span className="login-form__resend-button-text">
                  {isSubmitting ? 'Gönderiliyor...' : 'Yeniden Gönder'}
                </span>
                {isSubmitting && (
                  <span className="login-form__resend-button-spinner" aria-hidden="true">
                    <span className="login-form__resend-button-spinner-dot"></span>
                    <span className="login-form__resend-button-spinner-dot"></span>
                    <span className="login-form__resend-button-spinner-dot"></span>
                  </span>
                )}
              </button>
              <div className="login-form__resend-meta">
                <div className="login-form__resend-countdown-wrapper">
                  <span className="login-form__resend-countdown-label">Yeniden gönderebilirsiniz:</span>
                  <span className="login-form__resend-countdown">{countdownLabel}</span>
                </div>
                <div className="login-form__resend-track" aria-hidden="true">
                  <span
                    className="login-form__resend-progress"
                    style={{ width: `${cooldownPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

export default LoginPage


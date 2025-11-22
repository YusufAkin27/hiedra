import { useEffect } from 'react'
import { FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa'
import './ConfirmModal.css'

export type ModalType = 'confirm' | 'alert' | 'info' | 'warning'

export type ConfirmModalProps = {
  isOpen: boolean
  title?: string
  message: string
  type?: ModalType
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  showCancel?: boolean
}

function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Onayla',
  cancelText = 'İptal',
  onConfirm,
  onCancel,
  showCancel = true,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return <FaExclamationTriangle className="confirm-modal__icon confirm-modal__icon--warning" />
      case 'alert':
        return <FaExclamationTriangle className="confirm-modal__icon confirm-modal__icon--danger" />
      case 'info':
        return <FaInfoCircle className="confirm-modal__icon confirm-modal__icon--info" />
      case 'warning':
        return <FaExclamationTriangle className="confirm-modal__icon confirm-modal__icon--warning" />
      default:
        return <FaInfoCircle className="confirm-modal__icon confirm-modal__icon--info" />
    }
  }

  const getTitle = () => {
    if (title) return title
    switch (type) {
      case 'confirm':
        return 'Onay Gerekli'
      case 'alert':
        return 'Uyarı'
      case 'info':
        return 'Bilgi'
      case 'warning':
        return 'Dikkat'
      default:
        return 'Bilgi'
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'confirm':
      case 'alert':
        return 'btn btn-danger'
      case 'warning':
        return 'btn btn-warning'
      case 'info':
        return 'btn btn-primary'
      default:
        return 'btn btn-primary'
    }
  }

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal__header">
          <div className="confirm-modal__title-wrapper">
            {getIcon()}
            <h3 className="confirm-modal__title">{getTitle()}</h3>
          </div>
          <button
            type="button"
            className="confirm-modal__close"
            onClick={onCancel}
            aria-label="Kapat"
          >
            <FaTimes />
          </button>
        </div>
        <div className="confirm-modal__body">
          <p className="confirm-modal__message">{message}</p>
        </div>
        <div className="confirm-modal__footer">
          {showCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={getConfirmButtonClass()}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal


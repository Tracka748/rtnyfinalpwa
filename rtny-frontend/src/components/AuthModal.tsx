import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Alert } from './ui/Alert'
import { Loader2 } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithEmail, signInWithPhone, verifyOtp, error } = useAuth()
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [inputValue, setInputValue] = useState('')
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)

  const handleSendCode = async () => {
    try {
      setIsCodeSent(true)
      if (authMethod === 'email') {
        await signInWithEmail(inputValue)
      } else {
        await signInWithPhone(inputValue)
      }
    } catch (err) {
      console.error('Error sending code:', err)
    }
  }

  const handleVerify = async () => {
    try {
      setIsVerifying(true)
      await verifyOtp(inputValue, otp)
      onClose()
    } catch (err) {
      console.error('Error verifying:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sign In</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {!isCodeSent ? (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setAuthMethod('email')}
                className={`w-full py-2 px-4 rounded-lg mb-2 ${
                  authMethod === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Sign in with Email
              </button>
              <button
                onClick={() => setAuthMethod('phone')}
                className={`w-full py-2 px-4 rounded-lg ${
                  authMethod === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Sign in with Phone
              </button>
            </div>

            <div className="space-y-4">
              <Input
                type={authMethod === 'email' ? 'email' : 'tel'}
                placeholder={
                  authMethod === 'email'
                    ? 'Enter your email address'
                    : 'Enter your phone number'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button
                onClick={handleSendCode}
                disabled={!inputValue}
              >
                Send Verification Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              pattern="[0-9]*"
            />
            <Button
              onClick={handleVerify}
              disabled={!otp || otp.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
            <button
              onClick={() => setIsCodeSent(false)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Back to input
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

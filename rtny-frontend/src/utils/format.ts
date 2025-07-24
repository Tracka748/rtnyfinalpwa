import { format } from 'date-fns'

export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return {
      full: format(date, 'EEEE, MMMM do, yyyy'),
      time: format(date, 'h:mm a'),
      date: format(date, 'MMM dd'),
      weekday: format(date, 'EEE')
    }
  } catch (error) {
    return { full: 'Date TBD', time: '', date: 'TBD', weekday: '' }
  }
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export const formatPhoneNumber = (value: string) => {
  const phoneNumber = value.replace(/\D/g, '')
  if (phoneNumber.length >= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  } else if (phoneNumber.length >= 3) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  } else {
    return phoneNumber
  }
}

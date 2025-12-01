export interface Event {
  id: string
  name: string
  description: string
  venue_name: string
  venue_address: string
  event_date: string
  flyer_image_url: string
  category: string
  min_price: number
  max_price: number
  status: 'active' | 'sold_out' | 'cancelled'
  featured?: boolean
  tickets_available?: number
}
export interface EventWithTickets extends Event {
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    quantity: number
    remaining: number
  }>
}
import * as React from 'react'

interface OrderConfirmationEmailProps {
  orderNumber: string
  customerEmail: string
  eventName: string
  eventDate: string
  venueName: string
  venueAddress: string
  tickets: Array<{
    ticketNumber: string
    ticketType: string
    price: number
  }>
  totalAmount: number
}

export const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({
  orderNumber,
  customerEmail,
  eventName,
  eventDate,
  venueName,
  venueAddress,
  tickets,
  totalAmount,
}) => (
  <html>
    <head>
      <style>
        {`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: #121113; color: #59FFA0; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .ticket { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #59FFA0; }
          .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          h1 { margin: 0; font-size: 28px; }
          .total { font-size: 24px; font-weight: bold; color: #59FFA0; margin-top: 20px; }
        `}
      </style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <h1>🎉 Order Confirmed!</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#F9FDFF' }}>
            Order #{orderNumber}
          </p>
        </div>
        
        <div className="content">
          <h2 style={{ color: '#121113', marginTop: 0 }}>Thanks for your purchase!</h2>
          <p>Your tickets for <strong>{eventName}</strong> are ready.</p>
          
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#121113' }}>📍 Event Details</h3>
            <p style={{ margin: '5px 0' }}><strong>Event:</strong> {eventName}</p>
            <p style={{ margin: '5px 0' }}><strong>Date:</strong> {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            <p style={{ margin: '5px 0' }}><strong>Venue:</strong> {venueName}</p>
            <p style={{ margin: '5px 0' }}><strong>Address:</strong> {venueAddress}</p>
          </div>

          <h3 style={{ color: '#121113' }}>🎫 Your Tickets</h3>
          {tickets.map((ticket, index) => (
            <div key={index} className="ticket">
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{ticket.ticketType}</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>Ticket #{ticket.ticketNumber}</p>
              <p style={{ margin: '5px 0 0 0', color: '#59FFA0', fontWeight: 'bold' }}>${ticket.price.toFixed(2)}</p>
            </div>
          ))}

          <div className="total">
            Total Paid: ${totalAmount.toFixed(2)}
          </div>

          <div style={{ marginTop: '30px', padding: '20px', background: '#FFF9E6', borderRadius: '8px', borderLeft: '4px solid #FFB800' }}>
            <p style={{ margin: '0', fontSize: '14px' }}>
              <strong>📱 View Your Tickets:</strong><br/>
              Log in to your RTNY account to view, download, and manage your tickets:<br/>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets`} style={{ color: '#1AC8ED', textDecoration: 'none' }}>
                View My Tickets →
              </a>
            </p>
          </div>
        </div>

        <div className="footer">
          <p>RTNY - Rochester's Premier Nightlife Ticketing Platform</p>
          <p>Questions? Contact us at support@rtny.com</p>
        </div>
      </div>
    </body>
  </html>
)

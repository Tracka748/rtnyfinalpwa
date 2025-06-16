# ROCticketNy - Rochester Nightlife Ticketing Platform

Your gateway to Rochester nightlife events and exclusive experiences.

## Features

- 🎫 **Event Ticketing** - Purchase tickets for exclusive Rochester nightlife events
- 👑 **Tier-Based Membership** - Basic, Promoter, Bottle Girl, and Team tiers with benefits
- 🎁 **Perks Marketplace** - Exclusive perks and benefits for members
- 🎰 **Sweepstakes** - Every ticket purchase enters you in exciting sweepstakes
- 💳 **Digital Membership Cards** - QR code-based membership verification
- 🏷️ **Promo Codes** - Social media distributed promotional codes
- 📱 **PWA Support** - Install as a mobile app with offline capabilities

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Cash App (Phase 1), Stripe (Future)
- **Deployment**: Vercel
- **PWA**: Service Worker, Web App Manifest

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo>
   cd rocticketny
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   ```

3. **Run database migrations**:
   - Open Supabase SQL editor
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_promo_codes.sql`

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
rocticketny/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication pages
│   ├── events/            # Event pages
│   ├── tickets/           # Ticket management
│   ├── membership/        # Membership features
│   ├── admin/             # Admin dashboard
│   └── api/v1/            # API endpoints
├── components/            # React components
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
├── supabase/             # Database migrations
└── public/               # Static assets
```

## Development Timeline

- **Week 1**: Backend setup, authentication, membership system
- **Week 2**: Events, ticketing, promo codes, payments
- **Week 3**: Admin dashboard, PWA features, testing, deployment

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/phone
- `POST /api/v1/auth/verify` - Verify OTP code

### Memberships
- `GET /api/v1/memberships/me` - Get current user membership
- `PUT /api/v1/memberships/me` - Update membership

### Events
- `GET /api/v1/events` - List events
- `GET /api/v1/events/[id]` - Get event details

### Tickets
- `POST /api/v1/tickets/purchase` - Purchase tickets
- `GET /api/v1/tickets` - Get user tickets

### Promo Codes
- `POST /api/v1/promo/validate` - Validate promo code

## Deployment

1. **Deploy to Vercel**:
   ```bash
   npm run build
   vercel --prod
   ```

2. **Set up environment variables** in Vercel dashboard

3. **Configure custom domain** (optional)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

Private - ROCticketNy Platform

## Support

For support, email support@rocticketny.com or join our Discord community.

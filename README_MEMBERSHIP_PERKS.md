# ROCticketNy Membership & Perks System

A comprehensive membership and perks system for the ROCticketNy nightlife platform, featuring tier-based benefits, digital membership cards, and a complete perks marketplace.

## 🎯 System Overview

This system implements a simplified 4-tier membership structure:

- **Basic** (auto-assigned) → **Promoter** → **Bottle Girl** → **Team**

### Key Features

- ✅ Digital membership cards with QR codes
- ✅ Tier-based discounts and benefits
- ✅ Complete perks marketplace
- ✅ Secure API endpoints with Row Level Security
- ✅ Mobile-responsive PWA components

## 📁 Folder Structure

```
├── app/api/v1/
│   ├── memberships/           # Membership CRUD operations
│   │   ├── route.ts          # Get/create membership
│   │   ├── [id]/route.ts     # Individual membership management
│   │   └── card/route.ts     # Digital membership card with QR
│   └── perks/                # Perks marketplace
│       ├── route.ts          # Browse/create perks
│       ├── [id]/route.ts     # Individual perk management
│       └── [id]/purchase/    # Perk purchasing with discounts
├── components/
│   ├── membership/           # Membership UI components
│   │   ├── membership-card.tsx    # Digital card with QR code
│   │   └── tier-badge.tsx         # Tier display component
│   └── perks/               # Perks marketplace components
│       ├── perk-card.tsx          # Individual perk display
│       └── perks-marketplace.tsx  # Complete marketplace
├── types/
│   ├── membership.ts        # Membership type definitions
│   └── perks.ts            # Perks type definitions
├── lib/
│   ├── membership-utils.ts  # Membership helper functions
│   └── perks-utils.ts      # Perks utility functions
├── hooks/
│   ├── use-membership.ts    # Membership state management
│   └── use-perks.ts        # Perks marketplace state
├── supabase/migrations/
│   └── 003_perks_system.sql # Database schema for perks
└── __tests__/              # Test files (generated)
    ├── api/                # API route tests
    ├── components/         # Component tests
    ├── lib/               # Utility function tests
    └── hooks/             # Custom hook tests
```

## 🚀 Quick Start

### 1. Environment Setup

Ensure your `.env.local` contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Migration

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and execute: supabase/migrations/003_perks_system.sql
```

### 3. Install Dependencies

```bash
npm install qrcode.react
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

### 4. Start Development

```bash
npm run dev
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Test files are located in `__tests__/` and include:

- API route tests
- Component rendering tests
- Utility function tests
- Custom hook tests

## 🎨 Code Quality

Format code:

```bash
npx prettier --write .
```

Lint code:

```bash
npx eslint . --fix
```

## 📊 Tier System

### Membership Tiers

| Tier        | Discount | Benefits                             |
| ----------- | -------- | ------------------------------------ |
| Basic       | 0%       | Event access, Basic support          |
| Promoter    | 10%      | + Priority support, Exclusive events |
| Bottle Girl | 15%      | + VIP access, Free merchandise       |
| Team        | 20%      | + Admin access, Revenue sharing      |

### Tier Upgrades

- Basic membership is automatically created on user registration
- Tier upgrades are admin-controlled via API endpoints
- Each tier includes all benefits from lower tiers

## 🛍️ Perks Marketplace

### Categories

- **Food** 🍕 - Restaurant deals and dining experiences
- **Drinks** 🍹 - Beverage packages and bar credits
- **Merchandise** 👕 - ROCticketNy branded items
- **Experiences** 🎉 - VIP access and special events

### Features

- Tier-based eligibility and pricing
- Inventory management with quantity tracking
- Advanced filtering (category, availability, tier)
- Real-time purchase processing

## 🔐 Security

- Row Level Security (RLS) policies on all tables
- JWT-based authentication via Supabase
- Tier-based access control
- Input validation and sanitization
- Rate limiting on API endpoints

## 🎯 Business Logic

### Membership Cards

- Unique card numbers: `RTNY-{timestamp}-{random}`
- QR codes for verification: `RTNY-MEMBER-{card_number}`
- Tier-specific styling and benefits display

### Pricing Logic

- Automatic tier discounts applied at purchase
- No discount stacking (best discount wins)
- Transparent pricing display with savings shown

### Purchase Flow

1. User selects perk and quantity
2. System validates tier eligibility
3. Calculates discounted price
4. Creates purchase record
5. Updates inventory
6. Generates confirmation

## 📱 PWA Features

- Offline-capable components
- Mobile-responsive design
- Touch-optimized interfaces
- QR code generation and scanning
- Progressive enhancement

## 🔧 API Endpoints

### Memberships

- `GET /api/v1/memberships` - Get user membership
- `POST /api/v1/memberships` - Create membership
- `GET /api/v1/memberships/card` - Get digital card
- `PATCH /api/v1/memberships/[id]` - Update tier (admin)

### Perks

- `GET /api/v1/perks` - Browse perks (with filters)
- `POST /api/v1/perks` - Create perk (admin)
- `GET /api/v1/perks/[id]` - Get individual perk
- `PATCH /api/v1/perks/[id]` - Update perk (admin)
- `POST /api/v1/perks/[id]/purchase` - Purchase perk

## 🚀 Deployment

This system is designed for Vercel deployment with Supabase backend:

1. Set environment variables in Vercel dashboard
2. Deploy via Git integration
3. Run database migrations in Supabase
4. Test all endpoints and components

## 📈 Future Enhancements

- Payment processing integration
- Email/SMS notifications
- Advanced analytics dashboard
- Loyalty points system
- Social sharing features
- Mobile app version

## 🤝 Contributing

1. Run tests before committing: `npm test`
2. Format code: `npx prettier --write .`
3. Follow TypeScript best practices
4. Update tests for new features
5. Document API changes

## 📞 Support

For questions about this system:

1. Check the test files for usage examples
2. Review the type definitions for data structures
3. Examine the utility functions for business logic
4. Test API endpoints with the provided test suite

---

**Generated by ROCticketNy Setup Script** - Enhanced with safety features, testing infrastructure, and comprehensive documentation.

# HR Management System

A comprehensive HR management application with biometric attendance, payroll, leave management, and more.

## Features

- 👤 Employee Management
- 📅 Attendance Tracking with Biometric Integration
- 🏖️ Leave Management
- 💰 Payroll Processing
- 📊 Performance Reviews
- 👥 Recruitment Management
- 📈 Analytics and Reporting

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## Biometric Device Integration

This application supports fingerprint attendance devices (ZKTeco, Anviz, eSSL, etc.).

### Quick Setup (5 minutes)

See **[QUICK_START_DEVICE_INTEGRATION.md](./QUICK_START_DEVICE_INTEGRATION.md)** for the fastest setup path.

### Complete Guides

- **[DEVICE_SETUP_GUIDE.md](./DEVICE_SETUP_GUIDE.md)** - Step-by-step device integration
- **[TROUBLESHOOTING_CHECKLIST.md](./TROUBLESHOOTING_CHECKLIST.md)** - Systematic troubleshooting
- **[biometric-bridge/README.md](./biometric-bridge/README.md)** - Bridge service documentation

### Architecture

```
Web Application → Supabase Cloud → Bridge Service → Fingerprint Devices
```

The bridge service runs on your local network to communicate with devices using proprietary protocols.

## Project Structure

```
├── src/
│   ├── components/         # React components
│   ├── contexts/          # React contexts (Auth, Preferences)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
├── biometric-bridge/      # Local bridge service for device communication
└── public/                # Static assets
```

## Key Technologies

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Biometric:** node-zklib for ZKTeco devices
- **Build:** Vite

## Database Setup

The application uses Supabase with automatic migrations. Database schema includes:

- Users and authentication
- Employees and departments
- Attendance logs and schedules
- Leave requests and allocations
- Payroll and payslips
- Performance reviews
- Biometric templates

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript compiler check
```

## Environment Variables

### Main Application (.env)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Bridge Service (biometric-bridge/.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BRIDGE_PORT=3001
NODE_ENV=development
```

## User Roles

The system supports three main roles:

- **Admin** - Full system access
- **Manager** - Department-level access
- **Employee** - Self-service access

See [USER_ROLES_GUIDE.md](./USER_ROLES_GUIDE.md) for details.

## Biometric Attendance

### Supported Devices

- ✅ ZKTeco (K40, F18, etc.) - Full support with node-zklib
- ⚠️ Anviz, eSSL, Suprema - Simulated mode (requires protocol implementation)

### Setup Process

1. Install bridge service dependencies
2. Configure environment variables
3. Test device connectivity
4. Register device in web UI
5. Enroll employee fingerprints
6. Attendance auto-syncs every 5 minutes

### Bridge Service

The bridge service is required for real device communication:

```bash
cd biometric-bridge
npm install
npm start
```

See [DEVICE_SETUP_GUIDE.md](./DEVICE_SETUP_GUIDE.md) for complete instructions.

## Common Issues

### Device won't connect

1. Check bridge service is running
2. Verify device IP and port
3. Test network connectivity: `ping <device-ip>`
4. See [TROUBLESHOOTING_CHECKLIST.md](./TROUBLESHOOTING_CHECKLIST.md)

### Bridge won't start

1. Check `.env` file exists in `biometric-bridge/`
2. Verify Supabase Service Role Key is set
3. Ensure port 3001 is not in use

### No attendance records

1. Verify employee IDs contain numbers matching device UIDs
2. Check bridge console logs during sync
3. Ensure device has attendance data

## Documentation

### Setup & Configuration
- [QUICK_START_DEVICE_INTEGRATION.md](./QUICK_START_DEVICE_INTEGRATION.md) - 5-minute setup
- [DEVICE_SETUP_GUIDE.md](./DEVICE_SETUP_GUIDE.md) - Complete setup guide
- [CONNECT_YOUR_K40_NOW.md](./CONNECT_YOUR_K40_NOW.md) - ZKTeco K40 specific guide

### Troubleshooting
- [TROUBLESHOOTING_CHECKLIST.md](./TROUBLESHOOTING_CHECKLIST.md) - Systematic diagnostics
- [FINGERPRINT_FIXES_SUMMARY.md](./FINGERPRINT_FIXES_SUMMARY.md) - Common fixes

### Feature Guides
- [USER_ROLES_GUIDE.md](./USER_ROLES_GUIDE.md) - User roles and permissions
- [PERMISSION_MANAGEMENT_GUIDE.md](./PERMISSION_MANAGEMENT_GUIDE.md) - Permission system
- [ATTENDANCE_SYSTEM_GUIDE.md](./ATTENDANCE_SYSTEM_GUIDE.md) - Attendance features

### Technical Documentation
- [biometric-bridge/README.md](./biometric-bridge/README.md) - Bridge service
- [biometric-bridge/K40_SETUP_GUIDE.md](./biometric-bridge/K40_SETUP_GUIDE.md) - ZKTeco details

## Security

- Row Level Security (RLS) enabled on all tables
- Service role key kept secure in bridge service
- Fingerprint templates encrypted
- Authentication via Supabase Auth
- Department-based access control

## Support

For issues or questions:

1. Check relevant documentation above
2. Review [TROUBLESHOOTING_CHECKLIST.md](./TROUBLESHOOTING_CHECKLIST.md)
3. Check browser console (F12) for errors
4. Review bridge service logs if using biometric devices
5. Verify database connectivity and migrations

## License

MIT

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- (Optional) Biometric device for attendance features

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Run migrations (automatic via Supabase)
5. Start dev server: `npm run dev`
6. (Optional) Start bridge service for biometric devices

### Building

```bash
npm run build
```

Outputs to `dist/` directory.

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure build passes: `npm run build`

---

**Version:** 2.0.0
**Last Updated:** November 2025

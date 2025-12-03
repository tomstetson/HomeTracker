# HomeTracker v1.0 Feature Roadmap

## Research Summary: What Homeowners Track

Based on research from homeowner forums, Reddit discussions, and home management app reviews, here are the most commonly requested features:

### Current Features (Implemented)
- ✅ **Project Tracking** - Kanban board with statuses, priorities, budgets
- ✅ **Inventory Management** - Home assets and items
- ✅ **Vendor Directory** - Contractors, service providers
- ✅ **Warranty Tracking** - Coverage dates, policy info
- ✅ **Maintenance Tasks** - To-do items with due dates
- ✅ **Document Storage** - Manuals, receipts, invoices
- ✅ **Excel Export** - Backend sync with .xlsx file

### Missing Features (High Priority for v1.0)

#### 1. Paint Colors & Finishes Registry 🎨
**Why:** One of the most requested features. Homeowners constantly need to touch up paint or match colors.
- Room-by-room paint colors
- Brand, color name, color code
- Sheen/finish type
- Date painted
- Also: flooring, countertops, hardware finishes

#### 2. Home Vitals / Emergency Info 🚨
**Why:** Critical safety information that's hard to find in emergencies.
- Water main shutoff location
- Gas shutoff location
- Electrical panel location
- Circuit breaker mapping
- HVAC filter size
- Emergency contacts (plumber, electrician, etc.)

#### 3. Service History 🔧
**Why:** Know when things were last serviced for maintenance planning.
- Link services to vendors
- Track costs over time
- Photos before/after
- Notes and receipts

#### 4. Recurring Maintenance Schedules 📅
**Why:** Preventive maintenance prevents costly repairs.
- Monthly: HVAC filters, garbage disposal cleaning
- Quarterly: Gutter cleaning, dryer vent
- Seasonal: Furnace tune-up, lawn care
- Annual: Roof inspection, chimney sweep
- Automated reminder system

#### 5. Room Organization 🏠
**Why:** Everything organized by location for easy reference.
- Room list with photos
- Assign items, projects, colors to rooms
- Room dimensions
- Quick access to "what's in this room"

#### 6. Property Details Enhancement 📋
**Why:** Comprehensive property record for insurance, selling, reference.
- Purchase date/price
- Current estimated value
- Square footage, lot size
- Year built, renovation dates
- HOA info
- Insurance policy details
- Property tax info

### Implementation Priority

| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| Paint Colors | Low | High | P1 |
| Home Vitals | Low | High | P1 |
| Service History | Medium | High | P1 |
| Recurring Schedules | Medium | High | P2 |
| Room Organization | Medium | Medium | P2 |
| Property Enhancement | Low | Medium | P3 |

### Phase 1 (This Sprint)
1. Paint Colors & Finishes module
2. Home Vitals / Emergency Info
3. Service History (enhance maintenance)

### Phase 2 (Next Sprint)
1. Recurring maintenance schedules
2. Room-based organization
3. Dashboard widgets for upcoming tasks

### Phase 3 (Polish)
1. Property details enhancement
2. Reports and analytics
3. Mobile app (PWA)
4. Multi-user/family sharing

---

## Technical Notes

### Resource Optimization
- All new data stored in existing JSON/Excel structure
- No additional database required
- Lazy loading for large datasets
- Efficient re-renders with React.memo

### Data Structure Extensions
```typescript
// New: Paint Colors
interface PaintColor {
  id: string;
  room: string;
  brand: string;
  colorName: string;
  colorCode: string;
  finish: 'flat' | 'eggshell' | 'satin' | 'semi-gloss' | 'gloss';
  dateApplied?: string;
  notes?: string;
}

// New: Home Vitals
interface HomeVitals {
  waterMain: { location: string; notes?: string; photo?: string };
  gasShutoff: { location: string; notes?: string; photo?: string };
  electricPanel: { location: string; notes?: string; photo?: string };
  hvacFilter: { size: string; brand?: string; lastChanged?: string };
  emergencyContacts: Array<{ name: string; phone: string; type: string }>;
}

// New: Service Record
interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  vendorId?: string;
  itemId?: string;
  cost?: number;
  description: string;
  notes?: string;
  receipt?: string;
}
```

### Docker Optimization
- Single container with both frontend and backend
- Volume mount for data persistence
- Health checks for reliability
- Resource limits: 512MB RAM, 0.5 CPU



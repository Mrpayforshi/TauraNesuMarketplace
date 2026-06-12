/**
 * Seed Script — Taura Nesu Marketplace
 * Creates test dealers, listings, and submissions for UAT.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json -e "require('dotenv').config({ path: '.env.local' })" scripts/seed.ts
 *
 * Or add to package.json scripts:
 *   "seed": "ts-node --project tsconfig.json scripts/seed.ts"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const DEALERS = [
  {
    auth_email: 'prestige@tauranesuzw.com',
    auth_password: 'TestDealer123!',
    name: 'Prestige Motors',
    contact_name: 'Tendai Moyo',
    phone: '263771000001',
    city: 'Harare',
    status: 'active',
    subscription_tier: 'premium',
    listing_limit: 50,
  },
  {
    auth_email: 'harare@tauranesuzw.com',
    auth_password: 'TestDealer123!',
    name: 'Harare Auto Hub',
    contact_name: 'Farai Ncube',
    phone: '263771000002',
    city: 'Harare',
    status: 'active',
    subscription_tier: 'standard',
    listing_limit: 25,
  },
  {
    auth_email: 'bulawayo@tauranesuzw.com',
    auth_password: 'TestDealer123!',
    name: 'Bulawayo Best Cars',
    contact_name: 'Sipho Dube',
    phone: '263771000003',
    city: 'Bulawayo',
    status: 'active',
    subscription_tier: 'basic',
    listing_limit: 10,
  },
];

const LISTINGS_TEMPLATE = [
  {
    make: 'Toyota',
    model: 'Hilux',
    year: 2019,
    price_usd: 22000,
    mileage_km: 85000,
    body_type: 'pickup',
    transmission: 'manual',
    fuel_type: 'diesel',
    colour: 'White',
    description: 'Well maintained Toyota Hilux double cab. Full service history. Towbar fitted. No accidents.',
    is_special: false,
    status: 'active',
    slug_suffix: 'harare-001',
  },
  {
    make: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2018,
    price_usd: 45000,
    mileage_km: 60000,
    body_type: 'suv',
    transmission: 'automatic',
    fuel_type: 'diesel',
    colour: 'Silver',
    description: 'Toyota Land Cruiser Prado TX in excellent condition. Leather seats, sunroof, reverse camera.',
    is_special: true,
    status: 'active',
    slug_suffix: 'harare-002',
  },
  {
    make: 'Honda',
    model: 'Fit',
    year: 2017,
    price_usd: 8500,
    mileage_km: 55000,
    body_type: 'hatchback',
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Blue',
    description: 'Honda Fit in great condition. Low fuel consumption, ideal city car. Recent service done.',
    is_special: false,
    status: 'active',
    slug_suffix: 'harare-003',
  },
  {
    make: 'Mazda',
    model: 'CX-5',
    year: 2020,
    price_usd: 28000,
    mileage_km: 40000,
    body_type: 'suv',
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Red',
    description: 'Mazda CX-5 GT spec. Loaded with features. Lane departure, adaptive cruise, heated seats.',
    is_special: true,
    status: 'active',
    slug_suffix: 'harare-004',
  },
  {
    make: 'Toyota',
    model: 'Fortuner',
    year: 2021,
    price_usd: 52000,
    mileage_km: 25000,
    body_type: 'suv',
    transmission: 'automatic',
    fuel_type: 'diesel',
    colour: 'Black',
    description: 'Toyota Fortuner 2.8 GD6 4x4. Near new condition. Still under warranty. Full leather interior.',
    is_special: false,
    status: 'active',
    slug_suffix: 'harare-005',
  },
  {
    make: 'Nissan',
    model: 'Tiida',
    year: 2016,
    price_usd: 6500,
    mileage_km: 95000,
    body_type: 'sedan',
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Silver',
    description: 'Nissan Tiida in good condition. Well serviced. Good on fuel. Perfect for daily commuting.',
    is_special: false,
    status: 'active',
    slug_suffix: 'harare-006',
  },
  {
    make: 'Isuzu',
    model: 'D-Max',
    year: 2020,
    price_usd: 32000,
    mileage_km: 50000,
    body_type: 'pickup',
    transmission: 'manual',
    fuel_type: 'diesel',
    colour: 'White',
    description: 'Isuzu D-Max 250 Hi-Ride. One owner. No dents. Ready for work or weekend adventure.',
    is_special: false,
    status: 'active',
    slug_suffix: 'byo-001',
  },
  {
    make: 'Volkswagen',
    model: 'Polo',
    year: 2019,
    price_usd: 12000,
    mileage_km: 62000,
    body_type: 'hatchback',
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Grey',
    description: 'VW Polo 1.0 TSI Comfortline. Excellent fuel economy. Accident free. Books available.',
    is_special: false,
    status: 'active',
    slug_suffix: 'byo-002',
  },
  {
    make: 'Ford',
    model: 'Ranger',
    year: 2018,
    price_usd: 26000,
    mileage_km: 88000,
    body_type: 'pickup',
    transmission: 'manual',
    fuel_type: 'diesel',
    colour: 'Blue',
    description: 'Ford Ranger XLS 4x4. Good working condition. Bull bar, canopy, rear diff lock.',
    is_special: true,
    status: 'active',
    slug_suffix: 'byo-003',
  },
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2015,
    price_usd: 9500,
    mileage_km: 110000,
    body_type: 'sedan',
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'White',
    description: 'Toyota Corolla 1.8 Exclusive. Good service history. Air con, power windows, central locking.',
    is_special: false,
    status: 'active',
    slug_suffix: 'hub-001',
  },
  {
    make: 'Mitsubishi',
    model: 'Pajero',
    year: 2016,
    price_usd: 18500,
    mileage_km: 98000,
    body_type: 'suv',
    transmission: 'automatic',
    fuel_type: 'diesel',
    colour: 'Black',
    description: 'Mitsubishi Pajero 3.2 DID. 7 seater. Good condition. Recent tyres and service.',
    is_special: false,
    status: 'active',
    slug_suffix: 'hub-002',
  },
  {
    make: 'Suzuki',
    model: 'Swift',
    year: 2018,
    price_usd: 7000,
    mileage_km: 72000,
    body_type: 'hatchback',
    transmission: 'manual',
    fuel_type: 'petrol',
    colour: 'Orange',
    description: 'Suzuki Swift GLX. Very economical. Easy to park. Great city car for new drivers.',
    is_special: true,
    status: 'active',
    slug_suffix: 'hub-003',
  },
];

const SUBMISSIONS = [
  {
    make: 'Toyota',
    model: 'Vitz',
    year: 2014,
    mileage_km: 120000,
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Red',
    condition: 'good',
    intent: 'sell',
    seller_name: 'Chiedza Mutasa',
    seller_phone: '263777100001',
    seller_city: 'Harare',
    status: 'pending',
  },
  {
    make: 'Honda',
    model: 'CR-V',
    year: 2016,
    mileage_km: 90000,
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Silver',
    condition: 'good',
    intent: 'sell',
    seller_name: 'Blessing Chirwa',
    seller_phone: '263777100002',
    seller_city: 'Harare',
    status: 'valued',
    valuation_min_usd: 12000,
    valuation_max_usd: 14500,
    valuation_notes: 'Good condition for age. Minor scuffs on rear bumper.',
  },
  {
    make: 'Nissan',
    model: 'Navara',
    year: 2017,
    mileage_km: 105000,
    transmission: 'manual',
    fuel_type: 'diesel',
    colour: 'White',
    condition: 'fair',
    intent: 'trade_in',
    seller_name: 'Tafadzwa Hungwe',
    seller_phone: '263777100003',
    seller_city: 'Bulawayo',
    status: 'in_pipeline',
    valuation_min_usd: 16000,
    valuation_max_usd: 19000,
    valuation_notes: 'High mileage. Some rust on chassis. Engine sound.',
  },
  {
    make: 'Mazda',
    model: 'Demio',
    year: 2013,
    mileage_km: 145000,
    transmission: 'automatic',
    fuel_type: 'petrol',
    colour: 'Blue',
    condition: 'fair',
    intent: 'sell',
    seller_name: 'Rutendo Mhike',
    seller_phone: '263777100004',
    seller_city: 'Harare',
    status: 'pending',
  },
  {
    make: 'Toyota',
    model: 'Hilux',
    year: 2015,
    mileage_km: 130000,
    transmission: 'manual',
    fuel_type: 'diesel',
    colour: 'Grey',
    condition: 'good',
    intent: 'sell',
    seller_name: 'Munyaradzi Banda',
    seller_phone: '263777100005',
    seller_city: 'Harare',
    status: 'valued',
    valuation_min_usd: 14000,
    valuation_max_usd: 17000,
    valuation_notes: 'Popular model. Good mileage for year. Clean interior.',
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeSlug(make: string, model: string, year: number, suffix: string): string {
  return `${make}-${model}-${year}-${suffix}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function randomPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting seed...\n');

  const dealerIds: string[] = [];

  // ── 1. Create dealer auth accounts + dealer rows ──────────────────────────
  for (const d of DEALERS) {
    console.log(`Creating dealer: ${d.name}`);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: d.auth_email,
      password: d.auth_password,
      email_confirm: true,
      app_metadata: { role: 'dealer' },
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`  ⚠️  Auth user already exists for ${d.auth_email}, skipping auth creation`);
        // Fetch existing user
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users?.users.find((u) => u.email === d.auth_email);
        if (!existing) {
          console.error(`  ❌ Could not find existing user for ${d.auth_email}`);
          continue;
        }

        // Check if dealer row exists
        const { data: existingDealer } = await supabase
          .from('dealers')
          .select('id')
          .eq('auth_user_id', existing.id)
          .single();

        if (existingDealer) {
          console.log(`  ⚠️  Dealer row already exists, skipping`);
          dealerIds.push(existingDealer.id);
          continue;
        }

        // Insert dealer row for existing auth user
        const { data: dealerRow, error: dealerError } = await supabase
          .from('dealers')
          .insert({
            auth_user_id: existing.id,
            name: d.name,
            contact_name: d.contact_name,
            phone: d.phone,
            city: d.city,
            status: d.status,
            subscription_tier: d.subscription_tier,
            listing_limit: d.listing_limit,
          })
          .select('id')
          .single();

        if (dealerError) {
          console.error(`  ❌ Failed to insert dealer row: ${dealerError.message}`);
          continue;
        }
        dealerIds.push(dealerRow.id);
        console.log(`  ✅ Dealer row created (existing auth)`);
        continue;
      }
      console.error(`  ❌ Auth error: ${authError.message}`);
      continue;
    }

    const authUserId = authData.user.id;

    // Insert dealer row
    const { data: dealerRow, error: dealerError } = await supabase
      .from('dealers')
      .insert({
        auth_user_id: authUserId,
        name: d.name,
        contact_name: d.contact_name,
        phone: d.phone,
        city: d.city,
        status: d.status,
        subscription_tier: d.subscription_tier,
        listing_limit: d.listing_limit,

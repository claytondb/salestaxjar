import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// US States list for validation
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
] as const;

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

// Validation schema
const nexusSchema = z.object({
  stateCode: z.enum(US_STATES),
  hasNexus: z.boolean(),
  nexusType: z.string().max(50).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  registrationDate: z.string().datetime().optional().nullable(),
});

const bulkUpdateSchema = z.object({
  states: z.array(nexusSchema),
});

/**
 * GET /api/nexus
 * 
 * Get all nexus states for the user's primary business
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's primary business
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!business) {
      // Return empty array if no business (user should set up business first)
      return NextResponse.json({ nexusStates: [], businessId: null });
    }

    // Get all nexus states for this business
    const nexusStates = await prisma.nexusState.findMany({
      where: { businessId: business.id },
      orderBy: { stateName: 'asc' },
    });

    // Transform to frontend format
    const states = nexusStates.map(ns => ({
      id: ns.id,
      stateCode: ns.stateCode,
      state: ns.stateName,
      hasNexus: ns.hasNexus,
      nexusType: ns.nexusType,
      registrationNumber: ns.registrationNumber,
      registrationDate: ns.registrationDate?.toISOString(),
    }));

    return NextResponse.json({ nexusStates: states, businessId: business.id });
  } catch (error) {
    console.error('Error fetching nexus states:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nexus states' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nexus
 * 
 * Add or update a single nexus state
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = nexusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get or create user's primary business
    let business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!business) {
      // Create a default business if none exists
      business = await prisma.business.create({
        data: {
          userId: user.id,
          name: `${user.name}'s Business`,
        },
      });
    }

    // Upsert the nexus state
    const nexusState = await prisma.nexusState.upsert({
      where: {
        businessId_stateCode: {
          businessId: business.id,
          stateCode: data.stateCode,
        },
      },
      update: {
        hasNexus: data.hasNexus,
        nexusType: data.nexusType,
        registrationNumber: data.registrationNumber,
        registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      },
      create: {
        businessId: business.id,
        stateCode: data.stateCode,
        stateName: STATE_NAMES[data.stateCode] || data.stateCode,
        hasNexus: data.hasNexus,
        nexusType: data.nexusType,
        registrationNumber: data.registrationNumber,
        registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      },
    });

    return NextResponse.json({
      nexusState: {
        id: nexusState.id,
        stateCode: nexusState.stateCode,
        state: nexusState.stateName,
        hasNexus: nexusState.hasNexus,
        nexusType: nexusState.nexusType,
        registrationNumber: nexusState.registrationNumber,
        registrationDate: nexusState.registrationDate?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving nexus state:', error);
    return NextResponse.json(
      { error: 'Failed to save nexus state' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/nexus
 * 
 * Bulk update nexus states
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    // Get or create user's primary business
    let business = await prisma.business.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!business) {
      business = await prisma.business.create({
        data: {
          userId: user.id,
          name: `${user.name}'s Business`,
        },
      });
    }

    // Process each state
    const results = await Promise.all(
      validation.data.states.map(async (state) => {
        return prisma.nexusState.upsert({
          where: {
            businessId_stateCode: {
              businessId: business!.id,
              stateCode: state.stateCode,
            },
          },
          update: {
            hasNexus: state.hasNexus,
            nexusType: state.nexusType,
            registrationNumber: state.registrationNumber,
            registrationDate: state.registrationDate ? new Date(state.registrationDate) : null,
          },
          create: {
            businessId: business!.id,
            stateCode: state.stateCode,
            stateName: STATE_NAMES[state.stateCode] || state.stateCode,
            hasNexus: state.hasNexus,
            nexusType: state.nexusType,
            registrationNumber: state.registrationNumber,
            registrationDate: state.registrationDate ? new Date(state.registrationDate) : null,
          },
        });
      })
    );

    // Return all nexus states for this business
    const allStates = await prisma.nexusState.findMany({
      where: { businessId: business.id },
      orderBy: { stateName: 'asc' },
    });

    return NextResponse.json({
      nexusStates: allStates.map(ns => ({
        id: ns.id,
        stateCode: ns.stateCode,
        state: ns.stateName,
        hasNexus: ns.hasNexus,
        nexusType: ns.nexusType,
        registrationNumber: ns.registrationNumber,
        registrationDate: ns.registrationDate?.toISOString(),
      })),
      updated: results.length,
    });
  } catch (error) {
    console.error('Error bulk updating nexus states:', error);
    return NextResponse.json(
      { error: 'Failed to update nexus states' },
      { status: 500 }
    );
  }
}

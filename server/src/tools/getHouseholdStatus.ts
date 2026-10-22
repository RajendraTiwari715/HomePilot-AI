import { BaseToolResult, HouseholdStatus } from '@homepilot/shared';

/**
 * Tool: get_household_status
 * 
 * Returns simulated household status including plant moisture levels,
 * low-stock grocery staples, pending household chores, and home safety alerts.
 * 
 * Note: Clearly flagged as simulated demo data for the Alexa+ hackathon demonstration.
 */
export function executeGetHouseholdStatus(): BaseToolResult<HouseholdStatus> {
  const now = new Date().toISOString();
  const actionId = `act_status_${Date.now()}`;

  const status: HouseholdStatus = {
    simulated: true,
    label: 'Simulated demo data',
    awayMode: false,
    plants: [
      {
        id: 'plant_1',
        name: 'Fiddle Leaf Fig',
        location: 'Living Room (South Window)',
        moistureLevel: 'low',
        needsWater: true,
        lastWatered: new Date(Date.now() - 4 * 86400000).toISOString(),
        notes: 'Top 2 inches of soil are dry; needs watering before or during departure.'
      },
      {
        id: 'plant_2',
        name: 'Snake Plant',
        location: 'Bedroom',
        moistureLevel: 'optimal',
        needsWater: false,
        lastWatered: new Date(Date.now() - 8 * 86400000).toISOString(),
        notes: 'Drought-tolerant; good for another 7-10 days.'
      },
      {
        id: 'plant_3',
        name: 'Golden Pothos',
        location: 'Kitchen Counter',
        moistureLevel: 'medium',
        needsWater: false,
        lastWatered: new Date(Date.now() - 2 * 86400000).toISOString(),
        notes: 'Moisture is adequate for a 3-day absence.'
      }
    ],
    groceries: [
      {
        id: 'groc_1',
        name: 'Whole Milk',
        category: 'dairy',
        quantity: 0.2,
        unit: 'gallon',
        isLowStock: true,
        status: 'low',
        lastUpdated: now
      },
      {
        id: 'groc_2',
        name: 'Pasture-Raised Large Eggs',
        category: 'dairy',
        quantity: 2,
        unit: 'eggs',
        isLowStock: true,
        status: 'low',
        lastUpdated: now
      },
      {
        id: 'groc_3',
        name: 'Artisan Sourdough Loaf',
        category: 'pantry',
        quantity: 1,
        unit: 'loaf',
        isLowStock: false,
        status: 'in_stock',
        lastUpdated: now
      },
      {
        id: 'groc_4',
        name: 'Cold Brew Coffee',
        category: 'beverages',
        quantity: 32,
        unit: 'fl oz',
        isLowStock: false,
        status: 'in_stock',
        lastUpdated: now
      }
    ],
    pendingTasks: [
      {
        id: 'task_1',
        title: 'Water Living Room Fiddle Leaf Fig',
        category: 'plants',
        priority: 'high',
        due: 'Today',
        status: 'pending'
      },
      {
        id: 'task_2',
        title: 'Empty kitchen compost bin and take out trash',
        category: 'chores',
        priority: 'medium',
        due: 'Before departure',
        status: 'pending'
      },
      {
        id: 'task_3',
        title: 'Verify patio sliding door is locked',
        category: 'departure',
        priority: 'high',
        due: 'Departure day',
        status: 'pending'
      }
    ],
    alerts: [
      {
        id: 'alert_1',
        type: 'maintenance',
        severity: 'medium',
        title: 'Plant Care Needed',
        description: 'Living Room Fiddle Leaf Fig moisture is critically low (22%). Needs watering soon.',
        timestamp: now,
        acknowledged: false
      },
      {
        id: 'alert_2',
        type: 'security',
        severity: 'low',
        title: 'Away Mode Inactive',
        description: 'Home is currently in Home/Occupied mode. Away mode should be enabled upon departure.',
        timestamp: now,
        acknowledged: false
      }
    ],
    lastUpdated: now
  };

  return {
    success: true,
    message: 'Household status retrieved successfully (Simulated demo data). 1 plant needs watering, 2 grocery staples are low on stock, and Away Mode is currently off.',
    data: status,
    timestamp: now,
    actionId,
    isSimulated: true
  };
}

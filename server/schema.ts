// Shared structured-data helpers used by scoring and issue generation.

const LOCAL_BUSINESS_SCHEMA_TYPES = [
  'localbusiness',
  'restaurant',
  'foodestablishment',
  'cafeorcoffeeshop',
  'barorpub',
  'dentist',
  'medicalclinic',
  'physician',
  'hospital',
  'veterinarycare',
  'lodgingbusiness',
  'hotel',
  'motel',
  'bedandbreakfast',
  'store',
  'grocery store',
  'clothingstore',
  'beautysalon',
  'hairsalon',
  'healthandbeautybusiness',
  'plumber',
  'electrician',
  'hvacbusiness',
  'homeandconstructionbusiness',
  'legalservice',
  'accountingservice',
  'financialservice',
  'realestateagent',
  'autorepair',
  'automotivebusiness',
  'travelagency',
  'touristinformationcenter',
  'childcare',
  'fitnesscenter',
  'sportsactivitylocation',
];

export function isLocalBusinessSchemaType(type: string | undefined | null): boolean {
  if (!type) return false;
  const normalized = String(type).toLowerCase().replace(/[^a-z0-9]/g, '');
  return LOCAL_BUSINESS_SCHEMA_TYPES.some((t) => t.replace(/[^a-z0-9]/g, '') === normalized);
}

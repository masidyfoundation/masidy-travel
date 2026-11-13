import type { Product, ServiceCategory } from '../../src/shared/types.ts';

export interface ProviderAvailabilityQuote {
  adapterName: string;
  available: boolean;
  remainingUnits: number;
  verifiedUnitPrice: number;
  currency: string;
  externalHoldReference: string;
}

export interface UnifiedTravelProviderAdapter {
  readonly adapterId: string;
  readonly supportedCategories: ServiceCategory[];
  checkAvailabilityAndPrice(
    product: Product,
    date: string,
    travelersCount: number
  ): ProviderAvailabilityQuote;
}

class MasidyDirectProviderAdapter implements UnifiedTravelProviderAdapter {
  readonly adapterId = 'masidy_direct_inventory';
  readonly supportedCategories: ServiceCategory[] = [
    'flights',
    'hotels',
    'tours',
    'transport',
    'cruises',
    'hajj_umrah',
    'visas_packages',
  ];

  checkAvailabilityAndPrice(
    product: Product,
    _date: string,
    travelersCount: number
  ): ProviderAvailabilityQuote {
    const remainingUnits = Math.max(0, product.maxCapacity - travelersCount);
    return {
      adapterName: 'Masidy Direct Provider Core',
      available: travelersCount <= product.maxCapacity,
      remainingUnits,
      verifiedUnitPrice: product.price,
      currency: product.baseCurrency,
      externalHoldReference: `DIR-${product.id.slice(-6).toUpperCase()}`,
    };
  }
}

export const defaultProviderAdapter: UnifiedTravelProviderAdapter =
  new MasidyDirectProviderAdapter();

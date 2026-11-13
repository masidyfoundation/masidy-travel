import type {
  Booking,
  CommissionRule,
  CommissionSnapshot,
  CurrencyCode,
  LedgerEntry,
  Payout,
  ServiceCategory,
  UserRole,
} from '../../src/shared/types.ts';
import { CURRENCY_RATES_FROM_EUR } from '../../src/shared/currency.ts';
import { createId, type DatabaseSchema } from '../db/store.ts';

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function resolveApplicableRule(
  rules: CommissionRule[],
  category: ServiceCategory,
  organizationId: string
): CommissionRule {
  const activeRules = rules.filter((r) => r.active);
  const orgRule = activeRules.find(
    (r) => r.scope === 'organization' && r.organizationId === organizationId
  );
  if (orgRule) return orgRule;

  const catRule = activeRules.find((r) => r.scope === 'category' && r.category === category);
  if (catRule) return catRule;

  const globalRule = activeRules.find((r) => r.scope === 'global');
  return (
    globalRule ?? {
      id: 'fallback',
      name: 'Default Global Commission',
      scope: 'global',
      platformPercent: 5,
      sellerPercent: 10,
      fixedFeeEur: 0,
      active: true,
    }
  );
}

export function calculateCommissionSnapshot(
  db: DatabaseSchema,
  params: {
    grossOriginal: number;
    providerCostOriginal: number;
    currency: CurrencyCode;
    category: ServiceCategory;
    organizationId: string;
    hasSeller: boolean;
  }
): {
  exchangeRateAtBooking: number;
  grossEur: number;
  snapshot: CommissionSnapshot;
} {
  const rate = CURRENCY_RATES_FROM_EUR[params.currency];
  const grossEur = round2(params.grossOriginal / rate);
  const providerCostEur = round2(params.providerCostOriginal / rate);

  const rule = resolveApplicableRule(db.commissionRules, params.category, params.organizationId);

  const platformFeeEur = round2((grossEur * rule.platformPercent) / 100 + rule.fixedFeeEur);
  const sellerCommissionEur = params.hasSeller
    ? round2((grossEur * rule.sellerPercent) / 100)
    : 0;
  const companyMarginEur = round2(
    grossEur - providerCostEur - platformFeeEur - sellerCommissionEur
  );

  return {
    exchangeRateAtBooking: rate,
    grossEur,
    snapshot: {
      ruleId: rule.id,
      ruleName: rule.name,
      grossEur,
      providerCostEur,
      sellerCommissionEur,
      platformFeeEur,
      companyMarginEur,
    },
  };
}

export function recordConfirmedBookingLedger(db: DatabaseSchema, booking: Booking): void {
  const alreadyRecorded = db.ledgerEntries.some(
    (e) => e.bookingId === booking.id && e.entryType === 'platform_fee'
  );
  if (alreadyRecorded) return;

  const now = new Date().toISOString();
  const snap = booking.commissionSnapshot;
  const providerReceivableEur = round2(snap.providerCostEur + snap.companyMarginEur);

  const entries: LedgerEntry[] = [
    {
      id: createId('led'),
      bookingId: booking.id,
      accountType: 'provider',
      entityId: booking.organizationId,
      entityName: booking.providerName,
      entryType: 'provider_payable',
      amountEur: providerReceivableEur,
      originalCurrency: booking.originalCurrency,
      originalAmount: round2(providerReceivableEur * booking.exchangeRateAtBooking),
      exchangeRate: booking.exchangeRateAtBooking,
      description: `Provider payable (cost + net margin) for ${booking.referenceCode}`,
      createdAt: now,
      immutable: true,
    },
    {
      id: createId('led'),
      bookingId: booking.id,
      accountType: 'platform',
      entityId: 'masidy_platform',
      entityName: 'MASIDY Platform Revenue',
      entryType: 'platform_fee',
      amountEur: snap.platformFeeEur,
      originalCurrency: booking.originalCurrency,
      originalAmount: round2(snap.platformFeeEur * booking.exchangeRateAtBooking),
      exchangeRate: booking.exchangeRateAtBooking,
      description: `Platform commission (${snap.ruleName}) for ${booking.referenceCode}`,
      createdAt: now,
      immutable: true,
    },
  ];

  if (booking.sellerId && snap.sellerCommissionEur > 0) {
    entries.push({
      id: createId('led'),
      bookingId: booking.id,
      accountType: 'seller',
      entityId: booking.sellerId,
      entityName: booking.sellerName || 'Affiliate Seller',
      entryType: 'seller_commission',
      amountEur: snap.sellerCommissionEur,
      originalCurrency: booking.originalCurrency,
      originalAmount: round2(snap.sellerCommissionEur * booking.exchangeRateAtBooking),
      exchangeRate: booking.exchangeRateAtBooking,
      description: `Affiliate commission (${booking.affiliateCode || 'REF'}) for ${booking.referenceCode}`,
      createdAt: now,
      immutable: true,
    });

    const seller = db.sellerProfiles.find((s) => s.id === booking.sellerId);
    if (seller) {
      seller.totalConversions += 1;
      seller.pendingBalanceEur = round2(seller.pendingBalanceEur + snap.sellerCommissionEur);
    }

    const affLink = db.affiliateLinks.find(
      (l) => l.sellerId === booking.sellerId && l.productId === booking.productId
    );
    if (affLink) {
      affLink.conversions += 1;
      affLink.earnedEur = round2(affLink.earnedEur + snap.sellerCommissionEur);
    }

    const existingSellerPayout = db.payouts.find(
      (p) =>
        p.recipientType === 'seller' &&
        p.recipientId === booking.sellerId &&
        p.status === 'Pending'
    );
    if (existingSellerPayout) {
      existingSellerPayout.amountEur = round2(
        existingSellerPayout.amountEur + snap.sellerCommissionEur
      );
    } else {
      const newPayout: Payout = {
        id: createId('pay'),
        recipientType: 'seller',
        recipientId: booking.sellerId,
        recipientName: booking.sellerName || 'Affiliate Seller',
        amountEur: snap.sellerCommissionEur,
        status: 'Pending',
        createdAt: now,
      };
      db.payouts.push(newPayout);
    }
  }

  const existingProviderPayout = db.payouts.find(
    (p) =>
      p.recipientType === 'provider' &&
      p.recipientId === booking.organizationId &&
      p.status === 'Pending'
  );
  if (existingProviderPayout) {
    existingProviderPayout.amountEur = round2(
      existingProviderPayout.amountEur + providerReceivableEur
    );
  } else {
    db.payouts.push({
      id: createId('pay'),
      recipientType: 'provider',
      recipientId: booking.organizationId,
      recipientName: booking.providerName,
      amountEur: providerReceivableEur,
      status: 'Pending',
      createdAt: now,
    });
  }

  db.ledgerEntries.unshift(...entries);
}

export function recordRefundLedger(
  db: DatabaseSchema,
  booking: Booking,
  partialRatio = 1
): void {
  const now = new Date().toISOString();
  const refundEur = round2(booking.totalEur * partialRatio);
  const refundOriginal = round2(booking.totalOriginal * partialRatio);

  db.ledgerEntries.unshift({
    id: createId('led'),
    bookingId: booking.id,
    accountType: 'customer',
    entityId: booking.customerId,
    entityName: booking.customerName,
    entryType: 'refund',
    amountEur: -refundEur,
    originalCurrency: booking.originalCurrency,
    originalAmount: -refundOriginal,
    exchangeRate: booking.exchangeRateAtBooking,
    description: `Refund issued (${Math.round(partialRatio * 100)}%) for ${booking.referenceCode}`,
    createdAt: now,
    immutable: true,
  });
}

export function appendAuditLog(
  db: DatabaseSchema,
  actor: { id: string; name: string; role: UserRole },
  action: string,
  entityType: string,
  entityId: string,
  details: string
): void {
  db.auditLogs.unshift({
    id: createId('aud'),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
}

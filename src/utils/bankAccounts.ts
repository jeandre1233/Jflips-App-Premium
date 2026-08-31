/**
 * PAYOUT ACCOUNT RESOLUTION
 * ═════════════════════════
 * Which of the owner's two bank accounts prints on a client's invoice.
 *
 * The choice used to live only in `localStorage`, under a key built from
 * `user?.id || 'default'`. On a cold start `user` is still null when the state
 * initialiser runs, so the app READ the `default` key but WROTE the real one —
 * and nothing ever reached the database. That is why the invoice kept falling
 * back to the personal account: the business selection was being made against a
 * key nobody read back, and was lost entirely on a reinstall or a second device.
 *
 * The choice now lives on `owner_profiles` in two jsonb columns, and resolves
 * through three levels:
 *
 *   1. the explicit choice saved on THIS client's invoice
 *   2. the default set for the client's GROUP in the Management tab
 *   3. 'personal'
 *
 * `localStorage` is kept as an offline cache only, never as the source of truth.
 */

import { Profile, Gym } from '../../types';

export type BankAllocation = 'personal' | 'business';

/** The three client groups a payout default can be set for. */
export type ClientGroup = 'schools' | 'gyms' | 'tumbling';

export type GroupDefaults = Partial<Record<ClientGroup, BankAllocation>>;
export type InvoiceAllocations = Record<string, BankAllocation>;

export const CLIENT_GROUPS: Array<{
  key: ClientGroup;
  label: string;
  blurb: string;
}> = [
  {
    key: 'schools',
    label: 'Schools & Cheer Organisations',
    blurb: 'Every cheer school and organisation invoice.'
  },
  {
    key: 'gyms',
    label: 'External Gyms',
    blurb: 'Partner gyms billed for coaching hours.'
  },
  {
    key: 'tumbling',
    label: 'Tumbling Parents',
    blurb: 'Family and individual athlete invoices.'
  }
];

/**
 * Which group a client belongs to. A cheer-typed gym is a school; any other gym
 * entity is an external gym; anything that is not a gym is a tumbling family.
 */
export function clientGroupFor(familyId: string, gyms: Gym[] = []): ClientGroup {
  const entity = (gyms || []).find(g => g.id === familyId);
  if (!entity) return 'tumbling';
  // A sub-team inherits its parent's group, so a school's teams never split
  // across two accounts.
  const root = entity.parent_gym_id
    ? (gyms || []).find(g => g.id === entity.parent_gym_id) || entity
    : entity;
  return root.gym_type === 'cheer' ? 'schools' : 'gyms';
}

const isAllocation = (v: any): v is BankAllocation =>
  v === 'personal' || v === 'business';

/** Drop anything that is not a real allocation, so bad data can't select an account. */
export function sanitiseAllocations(raw: any): InvoiceAllocations {
  const out: InvoiceAllocations = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.entries(raw).forEach(([k, v]) => { if (isAllocation(v)) out[k] = v; });
  return out;
}

export function sanitiseGroupDefaults(raw: any): GroupDefaults {
  const out: GroupDefaults = {};
  if (!raw || typeof raw !== 'object') return out;
  CLIENT_GROUPS.forEach(({ key }) => {
    const v = (raw as any)[key];
    if (isAllocation(v)) out[key] = v;
  });
  return out;
}

/**
 * The account this client's invoice should print, and where that decision came
 * from — the UI shows the source so it is obvious when an invoice is following
 * its group rather than its own setting.
 */
export function resolveAllocation(
  familyId: string | undefined,
  gyms: Gym[],
  overrides: InvoiceAllocations = {},
  groupDefaults: GroupDefaults = {}
): { allocation: BankAllocation; source: 'invoice' | 'group' | 'fallback'; group: ClientGroup } {
  const group = clientGroupFor(familyId || '', gyms);

  if (familyId && isAllocation(overrides[familyId])) {
    return { allocation: overrides[familyId], source: 'invoice', group };
  }
  const groupChoice = groupDefaults[group];
  if (isAllocation(groupChoice)) {
    return { allocation: groupChoice, source: 'group', group };
  }
  return { allocation: 'personal', source: 'fallback', group };
}

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  accountType?: string;
}

/**
 * The four banking fields for an invoice.
 *
 * A coach invoice always prints the COACH's own account — it is money leaving
 * the business, so neither of the owner's accounts belongs on it. Only when the
 * coach has no bank details on file does it fall through to the owner's.
 */
export function resolveBankDetails(
  profile: Profile,
  allocation: BankAllocation,
  coach?: any
): BankDetails {
  const coachBank = coach?.bankName ?? coach?.bank_name;
  const coachAcc = coach?.accountNumber ?? coach?.account_number;
  if (coachBank && coachAcc) {
    return {
      bankName: coachBank,
      accountNumber: coachAcc,
      branchCode: coach?.branchCode ?? coach?.branch_code,
      accountType: coach?.accountType ?? coach?.account_type
    };
  }

  if (allocation === 'business') {
    // Each field falls back on its own. A business account with a branch code
    // left blank should still print the business bank and number, not silently
    // revert the whole block to the personal account.
    return {
      bankName: profile.bizBankName || profile.bankName,
      accountNumber: profile.bizAccountNumber || profile.accountNumber,
      branchCode: profile.bizBranchCode || profile.branchCode,
      accountType: profile.bizAccountType || profile.accountType
    };
  }

  return {
    bankName: profile.bankName,
    accountNumber: profile.accountNumber,
    branchCode: profile.branchCode,
    accountType: profile.accountType
  };
}

/** True when the business account has enough on file to print. */
export function hasBusinessAccount(profile: Profile): boolean {
  return !!(profile.bizBankName && profile.bizAccountNumber);
}

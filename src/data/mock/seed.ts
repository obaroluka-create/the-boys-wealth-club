import type {
  AccountStatus,
  BookValuation,
  CollectiveBook,
  Deposit,
  Dividend,
  InvestmentPortfolio,
  Transaction,
  User,
  UserRole,
} from "@/types";
import { DEMO_PASSWORD } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  LAUNCH_UNIT_PRICE,
  applyPeriodReturn,
  percentChange,
  replayPortfolio,
  unitPriceAt,
  unitValue,
  unitsForAmount,
} from "@/utils/unitAccounting";

export const IDS = {
  admins: {
    margaret: "3a1c8e20-4b7d-4f12-9e3a-8c5d2f1b0a47",
    david: "7e9b2c14-81a0-4d33-b6f1-2a4c9e8d7055",
    elena: "0f4d6a91-2c58-4e7b-a013-9d6e1b4c8820",
  },
  users: {
    james: "550e8400-e29b-41d4-a716-446655440000",
    rafael: "7f2c14a1-92b4-4d3c-8f2e-103928af8273",
    amara: "91b3e6d2-0c47-4a15-8d9f-2e6a1c4b7350",
    sophia: "a12f9c84-6e20-4b91-9d3a-5c8e0f17b246",
    hiroshi: "b8e41d70-3a56-4c12-af09-7d2e6b4c9183",
    thomas: "c4d7a290-1f83-4e56-b0c8-9a3d5e7f1024",
    isabelle: "d6e19b45-8c02-4f37-a1d5-3b7e9c0a5648",
    nadia: "e2a8c713-5d46-4b90-8e1f-6c4a0d9b3275",
    owen: "f1c0d894-2b57-4e18-9a6c-8d3f5e1b7042",
    priya: "6b9e2a15-4c83-4d70-b2f1-0a7e5c8d9361",
  },
  portfolios: {
    james: "aa10c3d4-2e91-4b67-8f05-1c9a4d7e8320",
    rafael: "bb21d4e5-3f02-4c78-9a16-2d0b5e8f9431",
    amara: "cc32e5f6-4013-4d89-ab27-3e1c6f90a542",
    sophia: "dd43f607-5124-4e9a-bc38-4f2d70a1b653",
    hiroshi: "ee540718-6235-4fab-cd49-503e81b2c764",
    thomas: "ff651829-7346-40bc-de5a-614f92c3d875",
    isabelle: "1066293a-8457-41cd-ef6b-7250a3d4e986",
    nadia: "21773a4b-9568-42de-f07c-8361b4e5f097",
    owen: "32884b5c-a679-43ef-018d-9472c5f601a8",
    priya: "43995c6d-b78a-44f0-129e-a583d60712b9",
  },
} as const;

function user(partial: {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  status?: AccountStatus;
  memberSince: string;
  imageUrl: string;
}): User {
  return {
    status: "active",
    ...partial,
  };
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Seeded history runs up to the moment the mock platform is created, so time ranges stay current. */
export function seedEndDate() {
  return new Date().toISOString().slice(0, 10);
}

const BOOK_LAUNCH_DATE = "2022-01-01";

/**
 * Collective book valuations on the 1st and 15th of each month from launch
 * until now. Period returns follow a deterministic random walk (mean +0.32%,
 * roughly 1.4% spread) so there are both profitable and losing periods.
 */
function buildBookValuations(): BookValuation[] {
  const rand = seeded(hash("tbwc-collective-book"));
  const now = new Date().toISOString();
  const valuations: BookValuation[] = [];
  const cursor = new Date(`${BOOK_LAUNCH_DATE}T00:00:00.000Z`);
  let price = LAUNCH_UNIT_PRICE;

  for (let index = 0; ; index += 1) {
    const date = `${cursor.toISOString().slice(0, 10)}T16:00:00.000Z`;
    if (date > now) break;
    // Sum of three uniforms approximates a normal distribution.
    const noise = (rand() + rand() + rand() - 1.5) / 0.5;
    const change = index === 0 ? 0 : Math.round((0.32 + noise * 1.4) * 100) / 100;
    const profitPercent = Math.max(change, 0);
    const lossPercent = Math.max(-change, 0);
    const unitPrice = index === 0 ? price : applyPeriodReturn(price, profitPercent, lossPercent);
    valuations.push({
      id: `b0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      date,
      unitPrice,
      previousUnitPrice: price,
      changePercent: percentChange(price, unitPrice),
      profitPercent,
      lossPercent,
    });
    price = unitPrice;
    if (cursor.getUTCDate() === 1) cursor.setUTCDate(15);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }
  return valuations;
}

export const bookValuations: BookValuation[] = buildBookValuations();

const latestValuation = bookValuations[bookValuations.length - 1];

export const collectiveBook: CollectiveBook = {
  unitPrice: latestValuation.unitPrice,
  launchUnitPrice: LAUNCH_UNIT_PRICE,
  launchedAt: bookValuations[0].date,
  updatedAt: latestValuation.date,
  lastChangePercent: latestValuation.changePercent,
};

export const users: User[] = [
  user({
    id: IDS.admins.margaret,
    fullName: "Anthony Gozie",
    email: "anthony.gozie@meridian.private",
    username: "agozie",
    role: "admin",
    memberSince: "2019-03-12",
    imageUrl: "/avatars/margaret.jpg",
  }),
  user({
    id: IDS.admins.david,
    fullName: "David Okonkwo",
    email: "david.okonkwo@meridian.private",
    username: "dokonkwo",
    role: "admin",
    memberSince: "2020-06-01",
    imageUrl: "/avatars/david.jpg",
  }),
  user({
    id: IDS.admins.elena,
    fullName: "Elena Vasquez",
    email: "elena.vasquez@meridian.private",
    username: "evasquez",
    role: "admin",
    memberSince: "2021-01-18",
    imageUrl: "/avatars/elena.jpg",
  }),
  user({
    id: IDS.users.james,
    fullName: "Luka Obaro",
    email: "luka.obaro@meridian.private",
    username: "lobaro",
    role: "user",
    memberSince: "2023-02-14",
    imageUrl: "/avatars/james.jpg",
  }),
  user({
    id: IDS.users.rafael,
    fullName: "Rafael Costa",
    email: "rafael.costa@meridian.private",
    username: "rcosta",
    role: "user",
    memberSince: "2024-04-09",
    imageUrl: "/avatars/rafael.jpg",
  }),
  user({
    id: IDS.users.amara,
    fullName: "Amara Okoye",
    email: "amara.okoye@meridian.private",
    username: "aokoye",
    role: "user",
    memberSince: "2024-01-22",
    imageUrl: "/avatars/amara.jpg",
  }),
  user({
    id: IDS.users.sophia,
    fullName: "Sophia Laurent",
    email: "sophia.laurent@meridian.private",
    username: "slaurent",
    role: "user",
    memberSince: "2023-07-03",
    imageUrl: "/avatars/sophia.jpg",
  }),
  user({
    id: IDS.users.hiroshi,
    fullName: "Hiroshi Tanaka",
    email: "hiroshi.tanaka@meridian.private",
    username: "htanaka",
    role: "user",
    memberSince: "2022-11-18",
    imageUrl: "/avatars/hiroshi.jpg",
  }),
  user({
    id: IDS.users.thomas,
    fullName: "Thomas Brennan",
    email: "thomas.brennan@meridian.private",
    username: "tbrennan",
    role: "user",
    memberSince: "2025-01-08",
    imageUrl: "/avatars/thomas.jpg",
  }),
  user({
    id: IDS.users.isabelle,
    fullName: "Isabelle Moreau",
    email: "isabelle.moreau@meridian.private",
    username: "imoreau",
    role: "user",
    memberSince: "2023-10-21",
    imageUrl: "/avatars/isabelle.jpg",
  }),
  user({
    id: IDS.users.nadia,
    fullName: "Nadia Petrov",
    email: "nadia.petrov@meridian.private",
    username: "npetrov",
    role: "user",
    memberSince: "2022-05-16",
    imageUrl: "/avatars/nadia.jpg",
  }),
  user({
    id: IDS.users.owen,
    fullName: "Owen Gallagher",
    email: "owen.gallagher@meridian.private",
    username: "ogallagher",
    role: "user",
    memberSince: "2025-11-02",
    imageUrl: "/avatars/owen.jpg",
  }),
  user({
    id: IDS.users.priya,
    fullName: "Priya Sharma",
    email: "priya.sharma@meridian.private",
    username: "psharma",
    role: "user",
    status: "disabled",
    memberSince: "2024-08-27",
    imageUrl: "/avatars/priya.jpg",
  }),
];

const PORTFOLIO_SEEDS: Array<{
  id: string;
  userId: string;
  reference: string;
  dividends: number;
}> = [
  { id: IDS.portfolios.james, userId: IDS.users.james, reference: "MER-1042", dividends: 31_250 },
  { id: IDS.portfolios.rafael, userId: IDS.users.rafael, reference: "MER-1188", dividends: 1_425 },
  { id: IDS.portfolios.amara, userId: IDS.users.amara, reference: "MER-1214", dividends: 9_800 },
  { id: IDS.portfolios.sophia, userId: IDS.users.sophia, reference: "MER-1098", dividends: 17_000 },
  { id: IDS.portfolios.hiroshi, userId: IDS.users.hiroshi, reference: "MER-0871", dividends: 62_400 },
  { id: IDS.portfolios.thomas, userId: IDS.users.thomas, reference: "MER-1302", dividends: 600 },
  { id: IDS.portfolios.isabelle, userId: IDS.users.isabelle, reference: "MER-1116", dividends: 10_125 },
  { id: IDS.portfolios.nadia, userId: IDS.users.nadia, reference: "MER-0744", dividends: 36_000 },
  { id: IDS.portfolios.owen, userId: IDS.users.owen, reference: "MER-1411", dividends: 0 },
  { id: IDS.portfolios.priya, userId: IDS.users.priya, reference: "MER-1255", dividends: 4_800 },
];

const DEPOSIT_SCHEDULE: Record<string, Array<{ amount: number; date: string; note: string }>> = {
  [IDS.portfolios.james]: [
    { amount: 800_000, date: "2023-02-14", note: "Opening deposit" },
    { amount: 250_000, date: "2024-06-18", note: "Recurring contribution" },
    { amount: 125_000, date: "2025-03-04", note: "Recurring contribution" },
    { amount: 75_000, date: "2026-01-20", note: "Recurring contribution" },
  ],
  [IDS.portfolios.rafael]: [
    { amount: 50_000, date: "2024-04-09", note: "Opening deposit" },
    { amount: 25_000, date: "2025-02-11", note: "Recurring contribution" },
    { amount: 20_000, date: "2026-05-06", note: "Recurring contribution" },
  ],
  [IDS.portfolios.amara]: [
    { amount: 250_000, date: "2024-01-22", note: "Opening deposit" },
    { amount: 100_000, date: "2025-01-15", note: "Recurring contribution" },
    { amount: 70_000, date: "2026-04-08", note: "Recurring contribution" },
  ],
  [IDS.portfolios.sophia]: [
    { amount: 500_000, date: "2023-07-03", note: "Opening deposit" },
    { amount: 200_000, date: "2024-09-12", note: "Recurring contribution" },
    { amount: 150_000, date: "2025-11-03", note: "Recurring contribution" },
  ],
  [IDS.portfolios.hiroshi]: [
    { amount: 1_500_000, date: "2022-11-18", note: "Opening deposit" },
    { amount: 500_000, date: "2024-03-21", note: "Recurring contribution" },
    { amount: 250_000, date: "2025-06-09", note: "Recurring contribution" },
    { amount: 150_000, date: "2026-02-17", note: "Recurring contribution" },
  ],
  [IDS.portfolios.thomas]: [
    { amount: 100_000, date: "2025-01-08", note: "Opening deposit" },
    { amount: 80_000, date: "2026-03-19", note: "Recurring contribution" },
  ],
  [IDS.portfolios.isabelle]: [
    { amount: 400_000, date: "2023-10-21", note: "Opening deposit" },
    { amount: 175_000, date: "2024-12-02", note: "Recurring contribution" },
    { amount: 100_000, date: "2025-08-14", note: "Recurring contribution" },
  ],
  [IDS.portfolios.nadia]: [
    { amount: 1_000_000, date: "2022-05-16", note: "Opening deposit" },
    { amount: 500_000, date: "2024-01-29", note: "Recurring contribution" },
    { amount: 300_000, date: "2025-10-07", note: "Recurring contribution" },
  ],
  [IDS.portfolios.owen]: [
    { amount: 30_000, date: "2025-11-02", note: "Opening deposit" },
    { amount: 20_000, date: "2026-06-24", note: "Recurring contribution" },
  ],
  [IDS.portfolios.priya]: [
    { amount: 200_000, date: "2024-08-27", note: "Opening deposit" },
    { amount: 120_000, date: "2025-04-16", note: "Recurring contribution" },
  ],
};

/** Each seeded deposit buys units at the book price in effect on its date. */
export const deposits: Deposit[] = PORTFOLIO_SEEDS.flatMap((item) =>
  (DEPOSIT_SCHEDULE[item.id] ?? []).map((entry, index) => {
    const unitPrice = unitPriceAt(bookValuations, entry.date);
    return {
      id: `de${item.id.slice(2, 10)}${String(index).padStart(4, "0")}`,
      userId: item.userId,
      portfolioId: item.id,
      amount: entry.amount,
      units: unitsForAmount(entry.amount, unitPrice),
      unitPrice,
      date: entry.date,
      note: entry.note,
    };
  }),
);

export const portfolios: InvestmentPortfolio[] = PORTFOLIO_SEEDS.map((item) => {
  const position = replayPortfolio(
    deposits.filter((entry) => entry.portfolioId === item.id),
    bookValuations,
  );
  return {
    id: item.id,
    userId: item.userId,
    reference: item.reference,
    units: position.units,
    totalDeposit: position.totalDeposit,
    currentBalance: position.currentBalance,
    totalProfit: position.totalProfit,
    totalLoss: position.totalLoss,
    totalDividends: item.dividends,
    updatedAt: latestValuation.date,
  };
});

export const dividends: Dividend[] = [
  {
    id: "d1a2b3c4-1111-4aaa-8bbb-000000000001",
    userId: IDS.users.james,
    portfolioId: IDS.portfolios.james,
    portfolioReference: "MER-1042",
    date: "2025-12-15",
    type: "annual",
    amount: 12_500,
    status: "paid",
  },
  {
    id: "d1a2b3c4-1111-4aaa-8bbb-000000000002",
    userId: IDS.users.james,
    portfolioId: IDS.portfolios.james,
    portfolioReference: "MER-1042",
    date: "2026-03-20",
    type: "quarterly",
    amount: 9_375,
    status: "paid",
  },
  {
    id: "d1a2b3c4-1111-4aaa-8bbb-000000000003",
    userId: IDS.users.james,
    portfolioId: IDS.portfolios.james,
    portfolioReference: "MER-1042",
    date: "2026-06-20",
    type: "quarterly",
    amount: 9_375,
    status: "paid",
  },
  {
    id: "d1a2b3c4-2222-4aaa-8bbb-000000000004",
    userId: IDS.users.rafael,
    portfolioId: IDS.portfolios.rafael,
    portfolioReference: "MER-1188",
    date: "2026-06-20",
    type: "quarterly",
    amount: 1_425,
    status: "paid",
  },
  {
    id: "d1a2b3c4-3333-4aaa-8bbb-000000000005",
    userId: IDS.users.amara,
    portfolioId: IDS.portfolios.amara,
    portfolioReference: "MER-1214",
    date: "2025-12-15",
    type: "annual",
    amount: 4_200,
    status: "paid",
  },
  {
    id: "d1a2b3c4-3333-4aaa-8bbb-000000000006",
    userId: IDS.users.amara,
    portfolioId: IDS.portfolios.amara,
    portfolioReference: "MER-1214",
    date: "2026-06-20",
    type: "quarterly",
    amount: 5_600,
    status: "paid",
  },
  {
    id: "d1a2b3c4-4444-4aaa-8bbb-000000000007",
    userId: IDS.users.sophia,
    portfolioId: IDS.portfolios.sophia,
    portfolioReference: "MER-1098",
    date: "2025-12-15",
    type: "annual",
    amount: 8_500,
    status: "paid",
  },
  {
    id: "d1a2b3c4-4444-4aaa-8bbb-000000000008",
    userId: IDS.users.sophia,
    portfolioId: IDS.portfolios.sophia,
    portfolioReference: "MER-1098",
    date: "2026-06-20",
    type: "quarterly",
    amount: 8_500,
    status: "paid",
  },
  {
    id: "d1a2b3c4-5555-4aaa-8bbb-000000000009",
    userId: IDS.users.hiroshi,
    portfolioId: IDS.portfolios.hiroshi,
    portfolioReference: "MER-0871",
    date: "2025-06-20",
    type: "quarterly",
    amount: 18_000,
    status: "paid",
  },
  {
    id: "d1a2b3c4-5555-4aaa-8bbb-000000000010",
    userId: IDS.users.hiroshi,
    portfolioId: IDS.portfolios.hiroshi,
    portfolioReference: "MER-0871",
    date: "2025-12-15",
    type: "annual",
    amount: 24_000,
    status: "paid",
  },
  {
    id: "d1a2b3c4-5555-4aaa-8bbb-000000000011",
    userId: IDS.users.hiroshi,
    portfolioId: IDS.portfolios.hiroshi,
    portfolioReference: "MER-0871",
    date: "2026-06-20",
    type: "quarterly",
    amount: 20_400,
    status: "paid",
  },
  {
    id: "d1a2b3c4-6666-4aaa-8bbb-000000000012",
    userId: IDS.users.thomas,
    portfolioId: IDS.portfolios.thomas,
    portfolioReference: "MER-1302",
    date: "2026-06-20",
    type: "special",
    amount: 600,
    status: "paid",
  },
  {
    id: "d1a2b3c4-7777-4aaa-8bbb-000000000013",
    userId: IDS.users.isabelle,
    portfolioId: IDS.portfolios.isabelle,
    portfolioReference: "MER-1116",
    date: "2025-12-15",
    type: "annual",
    amount: 5_400,
    status: "paid",
  },
  {
    id: "d1a2b3c4-7777-4aaa-8bbb-000000000014",
    userId: IDS.users.isabelle,
    portfolioId: IDS.portfolios.isabelle,
    portfolioReference: "MER-1116",
    date: "2026-06-20",
    type: "quarterly",
    amount: 4_725,
    status: "processing",
  },
  {
    id: "d1a2b3c4-8888-4aaa-8bbb-000000000015",
    userId: IDS.users.nadia,
    portfolioId: IDS.portfolios.nadia,
    portfolioReference: "MER-0744",
    date: "2025-12-15",
    type: "annual",
    amount: 18_000,
    status: "paid",
  },
  {
    id: "d1a2b3c4-8888-4aaa-8bbb-000000000016",
    userId: IDS.users.nadia,
    portfolioId: IDS.portfolios.nadia,
    portfolioReference: "MER-0744",
    date: "2026-06-20",
    type: "quarterly",
    amount: 18_000,
    status: "paid",
  },
  {
    id: "d1a2b3c4-aaaa-4aaa-8bbb-000000000017",
    userId: IDS.users.priya,
    portfolioId: IDS.portfolios.priya,
    portfolioReference: "MER-1255",
    date: "2025-12-15",
    type: "annual",
    amount: 4_800,
    status: "paid",
  },
];

let txCounter = 0;

function tx(partial: Omit<Transaction, "id" | "status">): Transaction {
  txCounter += 1;
  return {
    id: `70000000-0000-4000-8000-${String(txCounter).padStart(12, "0")}`,
    status: "completed",
    ...partial,
  };
}

/** Units held just before `at`: deposits recorded earlier than that moment. */
function unitsHeldBefore(portfolioId: string, at: string) {
  return deposits
    .filter((entry) => entry.portfolioId === portfolioId && entry.date < at)
    .reduce((sum, entry) => sum + entry.units, 0);
}

/** Activity history derived from the seeded deposits, dividends and recent valuations. */
function buildTransactions(): Transaction[] {
  const list: Transaction[] = [];

  for (const item of PORTFOLIO_SEEDS) {
    let total = 0;
    deposits
      .filter((entry) => entry.portfolioId === item.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((entry, index) => {
        const previous = total;
        total += entry.amount;
        list.push(
          tx({
            userId: item.userId,
            date: `${entry.date}T09:00:00.000Z`,
            action: index === 0 ? "account_created" : "deposit_recorded",
            previousValue: index === 0 ? null : previous,
            newValue: index === 0 ? entry.amount : total,
            note: `${entry.note} · ${entry.units.toFixed(4)} units at ${formatCurrency(entry.unitPrice, true)}`,
          }),
        );
      });

    let dividendTotal = 0;
    dividends
      .filter((entry) => entry.portfolioId === item.id && entry.status === "paid")
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((entry) => {
        const previous = dividendTotal;
        dividendTotal += entry.amount;
        list.push(
          tx({
            userId: item.userId,
            date: `${entry.date}T12:00:00.000Z`,
            action: "dividend_added",
            previousValue: previous,
            newValue: dividendTotal,
          }),
        );
      });

    for (const valuation of bookValuations.slice(-3)) {
      const units = unitsHeldBefore(item.id, valuation.date);
      if (units <= 0) continue;
      list.push(
        tx({
          userId: item.userId,
          date: valuation.date,
          action: "book_updated",
          previousValue: unitValue(units, valuation.previousUnitPrice),
          newValue: unitValue(units, valuation.unitPrice),
          note: `Unit price ${formatCurrency(valuation.previousUnitPrice, true)} → ${formatCurrency(valuation.unitPrice, true)}`,
        }),
      );
    }
  }

  list.push(
    tx({
      userId: IDS.users.priya,
      date: "2026-06-14T09:30:00.000Z",
      action: "account_disabled",
      previousValue: null,
      newValue: null,
      note: "Account paused pending documentation review",
    }),
  );

  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export const transactions: Transaction[] = buildTransactions();

export const credentials: Record<string, string> = Object.fromEntries(
  users.flatMap((entry) => [
    [entry.email.toLowerCase(), DEMO_PASSWORD],
    [entry.username.toLowerCase(), DEMO_PASSWORD],
  ]),
);

export const DEMO_USER_ID = IDS.users.james;
export const DEMO_ADMIN_ID = IDS.admins.margaret;

export function createSeedState() {
  return {
    users: structuredClone(users),
    portfolios: structuredClone(portfolios),
    dividends: structuredClone(dividends),
    deposits: structuredClone(deposits),
    transactions: structuredClone(transactions),
    credentials: { ...credentials },
    book: { ...collectiveBook },
    valuations: structuredClone(bookValuations),
    sessions: {} as Record<string, { userId: string; createdAt: string }>,
    /** Users who must replace a temporary password before using the app. */
    mustChangePassword: {} as Record<string, boolean>,
  };
}

export type PlatformState = ReturnType<typeof createSeedState>;

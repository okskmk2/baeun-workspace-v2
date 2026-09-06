import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import pg from "pg";
import { polar } from "../src/lib/polar.client.mjs";
import {
  catalogPriceUsd,
  KNOWN_POLAR_PRODUCTS,
  polarUnitPriceCreate,
  toPolarMinorUnits,
} from "../src/lib/polar.catalog.mjs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATALOG = [
  { resource: "WORKSPACE", cycle: "MONTHLY", name: "Workspace License" },
  { resource: "PROJECT", cycle: "MONTHLY", name: "Project License" },
  { resource: "WORKSPACE_MEMBER", cycle: "MONTHLY", name: "Workspace Member License" },
  { resource: "WORKSPACE", cycle: "YEARLY", name: "Workspace License Yearly" },
  { resource: "PROJECT", cycle: "YEARLY", name: "Project License Yearly" },
  { resource: "WORKSPACE_MEMBER", cycle: "YEARLY", name: "Workspace Member License Yearly" },
  { resource: "WORKSPACE", cycle: "LIFETIME", name: "Workspace License Lifetime" },
  { resource: "PROJECT", cycle: "LIFETIME", name: "Project License Lifetime" },
  { resource: "WORKSPACE_MEMBER", cycle: "LIFETIME", name: "Workspace Member License Lifetime" },
];

const knownId = (resource, cycle) => KNOWN_POLAR_PRODUCTS[`${resource}_${cycle}`] || null;

const matchProduct = (products, item) => {
  const byId = knownId(item.resource, item.cycle);
  if (byId) {
    const found = products.find((product) => product.id === byId);
    if (found) return found;
  }
  return products.find((product) => {
    const meta = product.metadata || {};
    return meta.baeun_resource === item.resource && meta.baeun_cycle === item.cycle;
  });
};

const ensurePolarProduct = async (products, item) => {
  const existing = matchProduct(products, item);
  const price = catalogPriceUsd(item.resource, item.cycle);
  const unitAmount = toPolarMinorUnits(price, "USD");
  const metadata = { baeun_resource: item.resource, baeun_cycle: item.cycle };

  if (existing) {
    const meta = existing.metadata || {};
    if (meta.baeun_resource !== item.resource || meta.baeun_cycle !== item.cycle) {
      await polar.products.update(existing.id, { metadata });
    }
    return existing.id;
  }

  const payload = {
    name: item.name,
    description: `Baeun ${item.resource.toLowerCase()} slot (${item.cycle.toLowerCase()})`,
    metadata,
    prices: [polarUnitPriceCreate(unitAmount, item.resource, "usd")],
  };
  if (item.cycle === "MONTHLY") {
    payload.recurring_interval = "month";
    payload.recurring_interval_count = 1;
  } else if (item.cycle === "YEARLY") {
    payload.recurring_interval = "year";
    payload.recurring_interval_count = 1;
  }

  const created = await polar.products.create(payload);
  console.log(`Created Polar product ${created.id} (${item.name})`);
  return created.id;
};

const applyMigration = async (client) => {
  const sqlPath = path.join(__dirname, "../sql/migrations/20260907_polar_payments.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
};

const upsertLicense = async (client, item, polarProductId) => {
  const price = catalogPriceUsd(item.resource, item.cycle);
  const nameI18nKey = `license.${item.resource.toLowerCase()}.${item.cycle.toLowerCase()}`;
  const existing = await client.query(
    `SELECT id
     FROM license
     WHERE target_resource = $1
       AND billing_cycle = $2
       AND currency = 'USD'
     LIMIT 1`,
    [item.resource, item.cycle]
  );

  if (existing.rows[0]) {
    const updated = await client.query(
      `UPDATE license
       SET price = $2,
           name = $3,
           name_i18n_key = $4,
           polar_product_id = $5,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, polar_product_id`,
      [existing.rows[0].id, price, item.name, nameI18nKey, polarProductId]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO license (
       target_resource, billing_cycle, grace_period_months, price, currency, name, name_i18n_key, is_active, polar_product_id
     ) VALUES ($1, $2, 0, $3, 'USD', $4, $5, true, $6)
     RETURNING id, polar_product_id`,
    [item.resource, item.cycle, price, item.name, nameI18nKey, polarProductId]
  );
  return inserted.rows[0];
};

const run = async () => {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new Error("POLAR_ACCESS_TOKEN is required");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const listed = await polar.products.list();
  const products = listed.items || [];
  const polarIds = {};
  for (const item of CATALOG) {
    polarIds[`${item.resource}_${item.cycle}`] = await ensurePolarProduct(products, item);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await applyMigration(client);
    for (const item of CATALOG) {
      const row = await upsertLicense(client, item, polarIds[`${item.resource}_${item.cycle}`]);
      console.log(`License ${row.id} <- ${item.resource} ${item.cycle} ${row.polar_product_id}`);
    }
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

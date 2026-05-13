import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://iaaeqiqylpzkbrgjpuyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhYWVxaXF5bHB6a2JyZ2pwdXlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1NjgyNSwiZXhwIjoyMDk0MTMyODI1fQ.MS8179V36t-p_CjYPMg6iozr8feyUc38-DbDKNRXbFU",
);

async function migrate() {
  console.log("Running migration: add gst + customer_name columns to bills...");

  const sql = `
    ALTER TABLE bills
      ADD COLUMN IF NOT EXISTS customer_name TEXT,
      ADD COLUMN IF NOT EXISTS gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_amount    NUMERIC(10,2) NOT NULL DEFAULT 0;
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    // If exec_sql doesn't exist, try direct REST approach
    console.log("exec_sql not available, trying direct column check...");

    // Try to read current columns by inserting a test row check
    const { error: colErr } = await supabase
      .from("bills")
      .select("gst_rate, gst_amount, customer_name")
      .limit(1);

    if (!colErr) {
      console.log("✅ Columns already exist! Migration not needed.");
    } else {
      console.error("❌ Columns missing. Please run in Supabase SQL Editor:");
      console.log(`
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount    NUMERIC(10,2) NOT NULL DEFAULT 0;
      `);
    }
    return;
  }

  console.log("✅ Migration complete!");
}

migrate().catch(console.error);

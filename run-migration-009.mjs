import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  "https://iaaeqiqylpzkbrgjpuyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhYWVxaXF5bHB6a2JyZ2pwdXlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1NjgyNSwiZXhwIjoyMDk0MTMyODI1fQ.MS8179V36t-p_CjYPMg6iozr8feyUc38-DbDKNRXbFU",
);

async function migrate() {
  console.log("Running migration: 009 staff hierarchy...");

  const sql = fs.readFileSync("supabase/migrations/009_staff_hierarchy.sql", "utf-8");

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("❌ exec_sql failed. Please run this in Supabase SQL Editor manually:");
    console.log(sql);
    return;
  }

  console.log("✅ Migration 009 complete!");
}

migrate().catch(console.error);

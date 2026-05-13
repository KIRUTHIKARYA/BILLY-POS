import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://iaaeqiqylpzkbrgjpuyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhYWVxaXF5bHB6a2JyZ2pwdXlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1NjgyNSwiZXhwIjoyMDk0MTMyODI1fQ.MS8179V36t-p_CjYPMg6iozr8feyUc38-DbDKNRXbFU"
);

async function check() {
  const { data, error } = await supabase.from("users").select("name").limit(1);
  if (error) {
    console.log("❌ Failed:", error.message);
  } else {
    console.log("✅ Success! 'name' column exists.");
  }
}

check();

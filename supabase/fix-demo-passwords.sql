-- Run once in Supabase SQL Editor if login fails with "Invalid username or password."
-- Sets password for admin + shopdemo to: Pass@123

update users
set password_hash = '$2b$10$w2lEUCPYGIxud6nXgNLhjuielMtEViYZFinHRWPwURPWfphVCFXXS'
where username in ('admin', 'shopdemo');

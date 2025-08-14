# Autonomous Improvement Plan for LookEscolar

## 1. Analysis Phase
- **Step 1.1:** Gather all configuration files using glob_file_search for *.config.*, package.json, tsconfig.json, etc.
- **Step 1.2:** Read key files like package.json, next.config.js, middleware.ts using read_file in parallel.
- **Step 1.3:** Search for potential issues: grep for process.env in code, check for hard-coded values, insecure patterns.
- **Step 1.4:** Analyze file structure from provided project_layout.
- **Error Handling:** If file not found, log to failures.md and skip to next.

## 2. Identify Issues
- **Step 2.1:** Performance: Search for large files, uncached queries, setInterval usage.
- **Step 2.2:** Security: Check for exposed keys, missing auth, improper env usage.
- **Step 2.3:** Accessibility: Verify aria labels, focus management in components.
- **Step 2.4:** Maintenance: Look for duplicated code, obsolete scripts.
- **Error Handling:** If grep fails, note in failures.md.

## 3. Update Documentation
- **Step 3.1:** Create or update README.md with project overview, setup instructions.
- **Step 3.2:** Add .env.example with all required variables.
- **Step 3.3:** Update code comments in key files.
- **Step 3.4:** Consolidate docs/ folder.
- **Error Handling:** If edit fails after 3 attempts, log and skip.

## 4. Remove Obsolete Code
- **Step 4.1:** Delete unused scripts identified in analysis.
- **Step 4.2:** Remove hard-coded Supabase URLs and keys.
- **Step 4.3:** Clean up test files with stubs.
- **Error Handling:** Use delete_file; if error, log.

## 5. Refactor and Optimize
- **Step 5.1:** Centralize Supabase clients.
- **Step 5.2:** Add 'server-only' to sensitive files.
- **Step 5.3:** Implement env validation.
- **Step 5.4:** Fix linter errors in modified files.
- **Error Handling:** Limit to 3 edit attempts per file.

## 6. Propose Improvements
- **Step 6.1:** Write suggestions in improvements.md.
- **Step 6.2:** Propose architectural changes like moving to edge runtime.

## 7. Summary
- **Step 7.1:** Compile changes and suggestions into summary.md.

## Execution Rules
- Proceed step by step.
- If error, try to solve (e.g., create missing file), else log in failures.md and continue.
- Use tools in parallel where possible.
- Never output code directly to user.


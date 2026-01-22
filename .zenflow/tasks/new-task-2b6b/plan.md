# Fix bug

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Investigation and Planning
<!-- chat-id: cdc7cb57-9b91-4e44-b493-4f12800981f5 -->

Analyze the bug report and design a solution.

1. Review the bug description, error messages, and logs
2. Clarify reproduction steps with the user if unclear
3. Check existing tests for clues about expected behavior
4. Locate relevant code sections and identify root cause
5. Propose a fix based on the investigation
6. Consider edge cases and potential side effects

Save findings to `{@artifacts_path}/investigation.md` with:
- Bug summary
- Root cause analysis
- Affected components
- Proposed solution

### [x] Step: Implementation
<!-- chat-id: 113239b0-2575-49e9-bb65-e3f4154d111c -->
Read `{@artifacts_path}/investigation.md`
Implement the bug fix.

**Fixed (FINAL SOLUTION):** 
1. Downgraded `cloudinary` from `^2.8.0` to `^1.41.3` in `backend/package.json`
2. Upgraded `multer-storage-cloudinary` to `^4.0.0` in `backend/package.json`
3. Updated `backend/src/config/cloudinary.js`:
   - Import `cloudinary.v2` directly: `require("cloudinary").v2`
   - Use named export: `{ CloudinaryStorage }`
   - Pass cloudinary instance to CloudinaryStorage
   - Use v4.x params syntax with `allowed_formats`
4. Added error logging to `backend/src/routes/uploadRoutes.js` for debugging

**Why this works**: 
- `cloudinary@^1.41.3` + `multer-storage-cloudinary@^4.0.0` are the compatible, well-maintained versions
- v2.2.1 of multer-storage-cloudinary is from 2016 and doesn't work with modern Node.js
- v4.0.0 is from 2020 and has proper error handling and feature support

1. Add/adjust regression test(s) that fail before the fix and pass after
2. Implement the fix
3. Run relevant tests
4. Update `{@artifacts_path}/investigation.md` with implementation notes and test results

If blocked or uncertain, ask the user for direction.

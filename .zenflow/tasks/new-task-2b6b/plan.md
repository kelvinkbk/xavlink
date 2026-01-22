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

**Fixed:** 
1. Changed `multer-storage-cloudinary` from `^4.0.0` to `^2.2.1` in `backend/package.json`
2. Updated `backend/src/config/cloudinary.js`:
   - Import full cloudinary object instead of just `.v2`
   - Configure using `cloudinary.v2.config()`
   - Pass full cloudinary object to CloudinaryStorage
   - Export `cloudinary.v2` for backward compatibility
3. Simplified CloudinaryStorage params to remove unsupported v2.x options:
   - Removed `allowed_formats` (not supported in v2.x)
   - Removed `transformation` array (different syntax in v2.x)
   - Kept only `folder` and `resource_type` params

1. Add/adjust regression test(s) that fail before the fix and pass after
2. Implement the fix
3. Run relevant tests
4. Update `{@artifacts_path}/investigation.md` with implementation notes and test results

If blocked or uncertain, ask the user for direction.

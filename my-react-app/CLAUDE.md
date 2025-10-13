# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React web application for GNU Health Tryton. Provides authentication, session management, and full access to Tryton ERP/Health system functionality through a modern UI.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production (output: dist/)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

### Technology Stack
- **React 19.1** with Vite 7.1
- **Ant Design** for UI components
- **Tailwind CSS** for styling
- **TanStack Table** for data tables
- **JSON-RPC** for Tryton communication

### Authentication & Session Flow
1. User logs in via `Login.jsx` → calls `trytonService.login()`
2. Session data (username, userId, sessionId) stored in `localStorage` as `tryton_session`
3. `App.jsx` checks localStorage on mount to restore sessions
4. All RPC calls include Authorization header: `Session ${base64(username:userId:sessionId)}`
5. 401 responses trigger automatic session cleanup

### Key Service: trytonService.js

Central service (~1785 lines) implementing complete Tryton JSON-RPC protocol:

**Core Methods:**
- `login(database, username, password)` - Authentication with Tryton server
- `makeRpcCall(method, params)` - Generic JSON-RPC call handler
- `getMenuData()` - Fetch sidebar menu structure
- `getModelData(model, ids, fieldsToRead)` - Read model records
- `searchModel(model, domain, offset, limit, order, fieldsToLoad)` - Search with domain filters
- `createRecord(model, values)` - Create new records
- `updateRecord(model, id, values)` - Update existing records
- `deleteRecords(model, ids)` - Delete records
- `executeAction(actionId, context)` - Execute Tryton actions
- `executeWizard(wizardName, action, data, context)` - Handle wizard flows

**URL Construction:**
- Methods use `buildURL(method)` which formats as `${baseURL}/${database}/`
- Exception: `common.db.list` uses base URL only (no database path)
- Base URL configured in `env.config.js` (default: `http://localhost:8000`)

**Context Handling:**
- Service maintains `this.context` with user preferences and active settings
- Context automatically appended to RPC params
- Special handling for wizard methods (context added at end without merging)

### Component Structure

**App.jsx** - Root component managing session state and routing between Login/Dashboard

**Dashboard.jsx** (~1538 lines) - Main application interface:
- Loads hierarchical menu from Tryton via `loadSidebarMenu()`
- Handles menu actions: `ir.action.act_window`, `ir.action.wizard`, `ir.action.report`
- Manages expandable/collapsible menu tree with icons
- Switches between table view and form view based on actions
- Modal handling for action options and wizards

**TrytonTable.jsx** (~339 lines) - Dynamic data table component:
- Uses TanStack Table for rendering
- Handles pagination, sorting, and filtering
- Action buttons (Create, Edit, Delete, Actions, Reports)
- Renders fields based on Tryton field definitions (many2one, selection, boolean, etc.)

**TrytonForm.jsx** (~664 lines) - Dynamic form component:
- Renders forms based on Tryton view XML definitions
- Handles various field types: char, text, selection, many2one, one2many, date, datetime, boolean, integer, float
- Form validation and submission
- Supports notebooks (tabbed interfaces) and groups

**WizardModal.jsx** - Handles Tryton wizard workflows (multi-step processes)

**ActionOptionsModal.jsx** - Displays available actions/reports for selected records

### UI Component Library (src/components/ui/)
- `table.jsx` - Base table components (shadcn/ui style)
- `dialog.jsx` - Modal dialog components
- `data-table.jsx` - Enhanced data table with features

### Configuration

**env.config.js** - Tryton server configuration:
```javascript
{
  baseURL: 'http://localhost:8000',  // Tryton JSON-RPC endpoint
  timeout: 30000,
  retries: 3,
  defaultHeaders: { ... }
}
```

**Tryton Server Setup** (documented in README.md):
- JSON-RPC API: Port 8000
- Web interface: Port 5173
- PostgreSQL: Port 5432
- Config file: `/opt/gnuhealth/his-50/etc/trytond.conf`

## Important Implementation Notes

### Working with Tryton Models
- Model names use dot notation: `health.patient`, `ir.action.act_window`, `res.user`
- Domain filters use Tryton syntax: `[('field', 'operator', 'value')]`
  - Operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `like`, `ilike`, `in`, `not in`
- All model operations require proper context (handled automatically by service)

### Menu Structure
- Menu loaded via `model.ir.ui.menu` methods
- Hierarchical structure with `childs` property
- Each menu item has optional `action` (action ID to execute)
- Icons are SVG files stored in Tryton backend (see Icon System below)

### Icon System (Tryton SVG Icons)

Tryton stores all menu icons as SVG files in the backend database. The icon system works as follows:

**Icon Model: `ir.ui.icon`**
- Icons are stored in the `ir.ui.icon` model
- Each icon has:
  - `id`: Integer ID
  - `name`: String identifier (e.g., 'tryton-list', 'tryton-star', 'tryton-health')
  - `icon`: SVG XML data as string

**Icon RPC Methods:**
```javascript
// List all available icons (returns array of [id, name] pairs)
await trytonService.makeRpcCall('model.ir.ui.icon.execute', [
  'list_icons',
  []
]);
// Returns: [[1, 'tryton-list'], [2, 'tryton-star'], ...]

// Read icon SVG data
await trytonService.makeRpcCall('model.ir.ui.icon.read', [
  [iconId],           // Array of icon IDs
  ['name', 'icon'],   // Fields to read
  {}                  // Context
]);
// Returns: [{id: 1, name: 'tryton-list', icon: '<svg>...</svg>'}]
```

**Icon Loading Strategy (from Tryton SAO):**
1. On app init: Call `ir.ui.icon.list_icons` to get all icon names and IDs
2. Build icon name → ID map for quick lookup
3. Load icons in batches of 10 when needed (optimization)
4. Convert SVG to Blob URL for rendering: `URL.createObjectURL(new Blob([svgData]))`
5. Apply color theming to SVG before rendering
6. Cache loaded icons to avoid redundant server calls

**SVG Processing:**
```javascript
// Example from Tryton SAO (common.js)
_convert: function(svgData) {
  var xml = jQuery.parseXML(svgData);
  // Apply color theme
  jQuery(xml).find('svg').attr('fill', Sao.config.icon_colors[0]);
  data = new XMLSerializer().serializeToString(xml);
  var blob = new Blob([data], {type: 'image/svg+xml'});
  return window.URL.createObjectURL(blob);
}
```

**Menu Icon Integration:**
- Menu items from `ir.ui.menu.search_read` include `icon` field (string name, not SVG)
- Frontend must:
  1. Get menu with icon names
  2. Load corresponding SVG data from `ir.ui.icon`
  3. Convert SVG to renderable format (data URL or Blob URL)
  4. Display in UI

**Current Implementation:**
- Dashboard.jsx uses hard-coded Lucide React icons (temporary)
- TODO: Replace with real Tryton SVG icons from backend
- Reference implementation: `/home/gnuhealth/Downloads/package/src/common.js` lines 3153-3284 (IconFactory)

### Action Execution Flow
1. User clicks menu item → `handleMenuClick(menuItem)`
2. If action exists → `handleActionExecution(actionId)`
3. Fetch action definition → `trytonService.getActionData(actionId)`
4. Based on action type:
   - `act_window`: Open table view with model/domain
   - `wizard`: Open wizard modal
   - `report`: Generate and download report
5. If multiple action keywords → show ActionOptionsModal

### Form/View Rendering
- Views fetched via `model.ir.ui.view` based on model name
- XML architecture parsed and converted to React components
- Field definitions determine widget type and validation
- One2many fields render as nested tables

### Session Management
- Sessions persist across page refreshes via localStorage
- 401 errors trigger `clearSession()` and redirect to login
- No automatic token refresh - users must re-login on expiry

## Common Patterns

### Adding a New Model View
1. Ensure Tryton has model and views defined
2. Add menu entry in Tryton (will auto-appear in sidebar)
3. Icon mapping: Add to `iconMap` in Dashboard.jsx if needed
4. Custom field widgets: Extend TrytonForm.jsx's `renderField()` method

### Making Custom RPC Calls
```javascript
import trytonService from '../services/trytonService';

// Search records
const results = await trytonService.searchModel(
  'health.patient',
  [('active', '=', true)],
  0, 10, null, ['name', 'dob']
);

// Execute action
const actionResult = await trytonService.executeAction(
  actionId,
  { active_id: recordId }
);
```

### Handling Wizards
Wizards are multi-step processes:
1. Execute initial step: `executeWizard(wizardName, 'create', {}, context)`
2. Get wizard state and view definition
3. User fills form → submit with current state
4. Repeat until wizard completes or is cancelled

## Testing

No automated tests currently implemented. Manual testing via:
1. `npm run dev` - Test in development
2. Login with Tryton credentials
3. Navigate through menu items
4. Test CRUD operations on various models

## Troubleshooting

**Connection Issues:**
- Verify Tryton server is running: Check port 8000 is accessible
- CORS errors: Ensure `trytond.conf` has `cors = *` under `[web]` section
- 401 errors: Clear localStorage and re-login

**Menu Not Loading:**
- Check browser console for RPC errors
- Verify user has menu permissions in Tryton
- Check session data in localStorage is valid

**Form/Table Not Rendering:**
- Verify model has proper views defined in Tryton
- Check field definitions match between client and server
- Look for XML parsing errors in console

# Data Schema — Your Space

Applies identically to **Dexie (IndexedDB)** table definitions and **Supabase (Postgres)** table DDL — field names are kept 1:1 so the sync engine needs no field-mapping layer.

## Entity-Relationship Overview
```
Workspace (fixed set: quicknotes, projects, journal, checklists,
           wishlist, routines, sketch)
   │
   ├── Project ──< SubProject ──< Note
   │                                 │
   ├── Note (flat, Workspace = quicknotes/journal/etc.)
   │        │
   │        ├──< Tag (many-to-many via NoteTag)
   │        └──< Attachment (sketch images)
   │
   ├── ChecklistItem  (belongs to a Note of type "checklist")
   ├── WishListItem   (belongs to a Note of type "wishlist")
   ├── RoutineEntry   (streak/completion log, belongs to a Note of type "routine")
   └── AI_Memory      (per-Note or per-Project AI context cache)
```

## 1. `workspaces` (static/seed table)
| Field | Type | Notes |
|---|---|---|
| `id` | text (PK) | `quicknotes`, `projects`, `journal`, `checklists`, `wishlist`, `routines`, `sketch` |
| `label` | text | Display name |
| `icon` | text | Icon identifier |
| `sort_order` | integer | Sidebar order |

## 2. `projects`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → auth.users) | Owner |
| `title` | text | e.g. "The Last Train" |
| `description` | text (nullable) | |
| `color` | text | Hex or palette token |
| `is_archived` | boolean | default `false` |
| `is_deleted` | boolean | default `false` |
| `deleted_at` | timestamptz (nullable) | Set on soft-delete; drives 7-day purge |
| `sort_order` | integer | Drag-and-drop position among sibling projects |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Drives last-write-wins sync |

## 3. `subprojects`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `project_id` | uuid (FK → projects.id) | Parent |
| `title` | text | e.g. "Act 1", "Characters" |
| `sort_order` | integer | Drag-and-drop position |
| `is_archived` | boolean | |
| `is_deleted` | boolean | |
| `deleted_at` | timestamptz (nullable) | |
| `created_at` / `updated_at` | timestamptz | |

## 4. `notes`
The universal content unit — used by every workspace. Type-specific behavior driven by `note_type` + `workspace_id`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `workspace_id` | text (FK → workspaces.id) | Which top-level section this lives in |
| `subproject_id` | uuid (FK → subprojects.id, nullable) | Set only for hierarchical Project notes |
| `note_type` | text | `plain`, `checklist`, `wishlist`, `routine`, `journal`, `sketch` |
| `title` | text | |
| `content` | jsonb | TipTap JSON document (rich text body) |
| `color` | text | Card color token (Quick Notes) |
| `is_pinned` | boolean | Pin-to-top |
| `mood` | text (nullable) | Journal-only: e.g. `great`, `okay`, `low` |
| `entry_date` | date (nullable) | Journal-only: auto-set to date of creation |
| `is_archived` | boolean | |
| `is_deleted` | boolean | |
| `deleted_at` | timestamptz (nullable) | |
| `sort_order` | integer | |
| `synced_at` | timestamptz (nullable) | Last successful cloud push |
| `created_at` / `updated_at` | timestamptz | |

## 5. `tags`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | |
| `label` | text | e.g. `Action`, `Dialogue` (stored without `#`) |
| `color` | text | |
| `created_at` | timestamptz | |

## 6. `note_tags` (join table)
| Field | Type | Notes |
|---|---|---|
| `note_id` | uuid (FK → notes.id) | |
| `tag_id` | uuid (FK → tags.id) | |
| PK | `(note_id, tag_id)` | Composite |

## 7. `attachments`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `note_id` | uuid (FK → notes.id) | |
| `type` | text | `sketch`, `image` |
| `storage_path` | text | Supabase Storage path (cloud) / blob key (local) |
| `thumbnail_data` | text (nullable) | Base64 thumbnail for instant local render |
| `created_at` | timestamptz | |

## 8. `checklist_items`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `note_id` | uuid (FK → notes.id, note_type = 'checklist') | Parent checklist |
| `label` | text | |
| `is_checked` | boolean | |
| `sort_order` | integer | |

## 9. `wishlist_items`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `note_id` | uuid (FK → notes.id, note_type = 'wishlist') | |
| `label` | text | |
| `price` | numeric (nullable) | Optional price tag |
| `is_checked` | boolean | "Got it" state |
| `url` | text (nullable) | Optional product link |
| `sort_order` | integer | |

## 10. `routine_entries`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `note_id` | uuid (FK → notes.id, note_type = 'routine') | The habit/routine definition |
| `period` | text | `weekly` or `monthly` |
| `entry_date` | date | The specific day/week marked |
| `is_completed` | boolean | |
| `streak_count` | integer | Denormalized running streak, recalculated on write |

## 11. `ai_memory`
Cache of AI interactions so re-running Summarize/Expand doesn't always re-cost an API call, and so Auto-Organize can reference prior groupings.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `scope_type` | text | `note` or `project` |
| `scope_id` | uuid | FK to `notes.id` or `projects.id` |
| `action` | text | `summarize`, `expand_idea`, `auto_organize` |
| `input_hash` | text | Hash of source content, to detect staleness |
| `output` | jsonb | AI response payload |
| `created_at` | timestamptz | |

## Indexes (Dexie `db.js` example)
```javascript
db.version(1).stores({
  projects: 'id, user_id, is_archived, is_deleted, sort_order',
  subprojects: 'id, project_id, sort_order',
  notes: 'id, workspace_id, subproject_id, note_type, is_pinned, is_archived, is_deleted, entry_date',
  tags: 'id, user_id, label',
  note_tags: '[note_id+tag_id], note_id, tag_id',
  attachments: 'id, note_id',
  checklist_items: 'id, note_id, sort_order',
  wishlist_items: 'id, note_id, sort_order',
  routine_entries: 'id, note_id, entry_date',
  ai_memory: 'id, scope_id, action'
});
```

## Trash / 7-Day Purge Logic
Any table with `is_deleted` + `deleted_at`:
- Soft-delete: `is_deleted = true`, `deleted_at = now()`.
- Trash view: `WHERE is_deleted = true ORDER BY deleted_at DESC`, with a computed "days remaining" = `7 - (now() - deleted_at)`.
- Auto-purge: a background check (on app load, or a Supabase scheduled Edge Function) hard-deletes rows where `deleted_at < now() - interval '7 days'`.

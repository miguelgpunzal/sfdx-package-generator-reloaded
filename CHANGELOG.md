# Change Log

All notable changes to the "Salesforce Package XML Generator Reloaded" extension will be documented in this file.

## [4.4.0] - 2025-10-30

### Added
- **Progressive Loading**: Components now load incrementally with real-time progress indicators showing current metadata type being processed
- **Per-Metadata-Type Caching**: Each metadata type is cached independently for faster performance and more granular control
- **Selective Refresh Modal**: New refresh UI allowing users to choose specific metadata types to refresh
  - Search functionality to filter metadata types
  - Select All / Deselect All options
  - 8 common metadata types pre-selected by default (ApexClass, ApexTrigger, LightningComponentBundle, etc.)
  - Loading state with "Retrieving metadata types..." message
- **Last Refresh Timestamp**: Displays when components were last fetched from the org
  - Visual warning (red flashing background) when data is more than 24 hours old
  - Timestamp shown at the top of My Components table
- **Clickable Table Rows**: Click anywhere on a table row to toggle component selection (not just the checkbox)
- **Compact Loading Bar**: 75% smaller progress indicator for better screen space utilization

### Changed
- Cache structure updated from single blob to per-metadata-type organization
- Refresh workflow now preserves existing cached data when refreshing selected types only
- Loading indicators are more subtle and less intrusive

### Fixed
- Selective refresh now correctly preserves components of non-refreshed metadata types
- Cache clearing is now scoped to only the metadata types being refreshed
- Frontend properly receives and uses the selective refresh flag from backend

### Technical
- Backend methods updated to support `isSelectiveRefresh` parameter
- Message passing enhanced to communicate refresh scope between frontend and backend
- Improved error handling and logging for metadata type retrieval

## [4.3.4] - Previous Release

### Features
- "My Components" feature with LastModifiedBy tracking
- Advanced table view with sorting
- Column-based filtering
- Metadata enrichment with LastModifiedBy
- Enhanced UI with Material-UI components
- Dual-tab interface
- Improved selection logic for filtered items
- Dark mode support


# Changelog - LocalPOS Pro Refactor

## [1.0.0] - Production Cleanup
### Added
- Feature-based folder structure (`features/`, `config/`, `lib/`, `types/`).
- `lib/money.ts` for standardized currency calculations.
- `.env.example` for environment variable management.
- Reusable UI components in `components/ui/`.

### Fixed
- Consolidated duplicated styling patterns into `Badge` and `StatCard` components.
- Standardized route management in `App.tsx`.
- Improved responsiveness of the Sidebar "Pull Tab" interface.

### Changed
- Moved `surfaces/` to `features/*/`.
- Moved `types.ts` to `types/index.ts`.
- Moved `constants.tsx` to `config/constants.ts`.
- Moved logic from `components/Layout.tsx` into `components/layout/`.

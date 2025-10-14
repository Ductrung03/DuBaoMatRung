# Fix Dropdown Import Paths and Verify Select Usage

## Information Gathered
- Dropdown component location: `client/src/components/Dropdown.jsx`
- Sidebar components location: `client/src/dashboard/components/sidebars/`
- Correct import path for sidebar components: `../../../components/Dropdown`
- No Select component usage found anywhere in the codebase

## Plan
- Fix incorrect Dropdown import paths in sidebar JSX files
- Verify no Select component dependencies exist

## Dependent Files to be edited
- `client/src/dashboard/components/sidebars/dubaomatrung/DuBaoMatRungTuDong.jsx`
- `client/src/dashboard/components/sidebars/dubaomatrung/DuBaoMatRungTuyBien.jsx`
- `client/src/dashboard/components/sidebars/quanlydulieu/XacMinhDuBaoMatRung.jsx`
- `client/src/dashboard/components/sidebars/quanlydulieu/TraCuuAnhVeTinh.jsx`

## Followup steps
- Test that all imports resolve correctly
- Verify no build errors after changes

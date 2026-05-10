# Database Schemas

Schema-only SQL dumps — **không có dữ liệu**, chỉ có cấu trúc bảng, indexes, functions, triggers.

## Databases

| File | Database | Mô tả |
|---|---|---|
| `auth_db.sql` | auth_db | Users, Roles, Permissions, RBAC tables (Prisma-managed) |
| `gis_db.sql` | gis_db | son_la_mat_rung, bang_ke_xu_ly_anh, spatial functions |
| `admin_db.sql` | admin_db | GIS layers: sonla_hientrangrung_new, sonla_tkkl, sonla_rgx |

## Cách restore

```bash
# Yêu cầu: PostgreSQL đã cài, databases đã tạo, PostGIS đã bật

psql -U postgres -d auth_db  -f auth_db.sql
psql -U postgres -d gis_db   -f gis_db.sql
psql -U postgres -d admin_db -f admin_db.sql
```

## Lưu ý

- Các file này được export với `pg_dump --schema-only --no-owner --no-acl`
- Không chứa dữ liệu thực tế (lớp rừng, user, mất rừng)
- Dữ liệu GIS (lớp rừng, tiểu khu khoảnh) cần import riêng từ shapefile
- Sau khi restore `auth_db.sql`, vẫn cần chạy `prisma migrate` và `prisma seed` cho `auth-service`

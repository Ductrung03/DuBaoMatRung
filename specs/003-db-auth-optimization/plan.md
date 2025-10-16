# Implementation Plan: Tối ưu hóa CSDL và Phân quyền (Kiến trúc "Tự Host")

**Branch**: `003-db-auth-optimization` | **Date**: 2025-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-db-auth-optimization/spec.md`

## Summary

Kế hoạch này sẽ tái cấu trúc kiến trúc CSDL của dự án theo mô hình **"Tự Host"** để giải quyết các vấn đề về hiệu năng, khả năng mở rộng và bảo trì mà **không phát sinh thêm chi phí**. Các thay đổi chính bao gồm:
1.  **Giữ lại CSDL PostGIS** trên server hiện tại, nhưng dùng **Kysely Query Builder** để hiện đại hóa việc truy vấn.
2.  **Hiện đại hóa service xác thực** với Prisma và triển khai hệ thống RBAC linh hoạt.
3.  **Tách biệt hệ thống logging** sang **MongoDB chạy trong Docker**.
4.  **Loại bỏ liên kết CSDL trực tiếp (FDW)** và chuyển sang giao tiếp hoàn toàn qua API.

## Technical Context

**Language/Version**: Node.js v18
**Primary Dependencies**: Express.js, **Prisma**, **Kysely**, `mongodb` (native driver)
**Storage**: PostgreSQL (cho Auth và GIS), **MongoDB (trong Docker)**
**Testing**: `npm test` (Jest/Mocha)
**Target Platform**: Linux server (môi trường production)
**Project Type**: Web Application (Frontend/Backend) với kiến trúc Microservices.
**Performance Goals**: Ghi nhận >100 log/giây; Thời gian phản hồi API p95 < 200ms.
**Constraints**: Phải loại bỏ hoàn toàn Foreign Data Wrappers (FDW). **Không phát sinh chi phí cloud**.
**Scale/Scope**: Hỗ trợ lên đến 10,000 người dùng đồng thời, hàng triệu đối tượng GIS và bản ghi log.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Hiến pháp (Constitution) chưa được định nghĩa.** Bỏ qua bước kiểm tra.

## Project Structure

### Documentation (this feature)

```
specs/003-db-auth-optimization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # (sẽ được tạo bởi /speckit.tasks)
```

### Source Code (repository root)

Cấu trúc dự án là một ứng dụng web với backend microservices. Các thay đổi sẽ tập trung vào các thư mục con trong `microservices/services/`.

```
microservices/
├── gateway/              # API Gateway
└── services/
    ├── auth-service/     # Sẽ được refactor với Prisma, RBAC
    ├── gis-service/      # Sẽ được refactor với Kysely
    ├── admin-service/    # Sẽ được refactor với Kysely
    └── logging-service/  # Service mới (hoặc logic trong gateway)

client/                   # Frontend không thay đổi trong phạm vi này
```

**Structure Decision**: Các thay đổi sẽ được thực hiện trong cấu trúc microservices hiện có. Một service/logic mới cho logging sẽ được tạo. `auth-service`, `gis-service`, và `admin-service` sẽ được tái cấu trúc tại chỗ với các công nghệ đã chọn.

## Complexity Tracking

Không có vi phạm hiến pháp nào được ghi nhận vì hiến pháp chưa được định nghĩa.

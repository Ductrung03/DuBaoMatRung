-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT,
    "organization" TEXT,
    "district_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ui_path" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" INTEGER,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataScope" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "parent_id" INTEGER,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DataScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDataScope" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "data_scope_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDataScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_full_name_idx" ON "User"("full_name");

-- CreateIndex
CREATE INDEX "User_district_id_idx" ON "User"("district_id");

-- CreateIndex
CREATE INDEX "User_is_active_idx" ON "User"("is_active");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_name_idx" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_created_at_idx" ON "Role"("created_at");

-- CreateIndex
CREATE INDEX "Role_is_system_idx" ON "Role"("is_system");

-- CreateIndex
CREATE INDEX "Role_is_active_idx" ON "Role"("is_active");

-- CreateIndex
CREATE INDEX "Role_created_by_idx" ON "Role"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_code_idx" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_module_resource_idx" ON "Permission"("module", "resource");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE INDEX "Permission_name_idx" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_order_idx" ON "Permission"("order");

-- CreateIndex
CREATE INDEX "Permission_parent_id_idx" ON "Permission"("parent_id");

-- CreateIndex
CREATE INDEX "Permission_is_active_idx" ON "Permission"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_resource_action_key" ON "Permission"("module", "resource", "action");

-- CreateIndex
CREATE INDEX "UserRole_role_id_idx" ON "UserRole"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_user_id_role_id_key" ON "UserRole"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "RolePermission_permission_id_idx" ON "RolePermission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON "RolePermission"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "DataScope_code_key" ON "DataScope"("code");

-- CreateIndex
CREATE INDEX "DataScope_is_active_idx" ON "DataScope"("is_active");

-- CreateIndex
CREATE INDEX "DataScope_parent_id_idx" ON "DataScope"("parent_id");

-- CreateIndex
CREATE INDEX "DataScope_path_idx" ON "DataScope"("path");

-- CreateIndex
CREATE INDEX "DataScope_type_idx" ON "DataScope"("type");

-- CreateIndex
CREATE INDEX "RoleDataScope_role_id_idx" ON "RoleDataScope"("role_id");

-- CreateIndex
CREATE INDEX "RoleDataScope_data_scope_id_idx" ON "RoleDataScope"("data_scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDataScope_role_id_data_scope_id_key" ON "RoleDataScope"("role_id", "data_scope_id");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataScope" ADD CONSTRAINT "DataScope_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "DataScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDataScope" ADD CONSTRAINT "RoleDataScope_data_scope_id_fkey" FOREIGN KEY ("data_scope_id") REFERENCES "DataScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDataScope" ADD CONSTRAINT "RoleDataScope_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

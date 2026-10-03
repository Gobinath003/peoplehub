-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "salary_type" TEXT NOT NULL DEFAULT 'MONTHLY_FIXED';

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "piece_rate_details" JSONB,
ADD COLUMN     "piece_rate_units" DOUBLE PRECISION,
ADD COLUMN     "salary_type" TEXT NOT NULL DEFAULT 'MONTHLY_FIXED';

-- CreateTable
CREATE TABLE "piece_rate_activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "rate_per_unit" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_rate_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piece_rate_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_rate" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_rate_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "piece_rate_activities_tenant_id_idx" ON "piece_rate_activities"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "piece_rate_activities_tenant_id_code_key" ON "piece_rate_activities"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "piece_rate_logs_tenant_id_idx" ON "piece_rate_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "piece_rate_logs_tenant_id_log_date_idx" ON "piece_rate_logs"("tenant_id", "log_date");

-- CreateIndex
CREATE INDEX "piece_rate_logs_tenant_id_employee_id_log_date_idx" ON "piece_rate_logs"("tenant_id", "employee_id", "log_date");

-- AddForeignKey
ALTER TABLE "piece_rate_activities" ADD CONSTRAINT "piece_rate_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_rate_logs" ADD CONSTRAINT "piece_rate_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_rate_logs" ADD CONSTRAINT "piece_rate_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_rate_logs" ADD CONSTRAINT "piece_rate_logs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "piece_rate_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

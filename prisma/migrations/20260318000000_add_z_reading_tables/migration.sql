-- CreateTable
CREATE TABLE "z_readings" (
    "id" SERIAL NOT NULL,
    "store_name" TEXT,
    "receipt_number" TEXT,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "image_url" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "z_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "z_reading_lines" (
    "id" SERIAL NOT NULL,
    "reading_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_centavos" INTEGER NOT NULL DEFAULT 0,
    "line_total_centavos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "z_reading_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "z_reading_lines_reading_id_idx" ON "z_reading_lines"("reading_id");

-- AddForeignKey
ALTER TABLE "z_reading_lines" ADD CONSTRAINT "z_reading_lines_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "z_readings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AssetImport" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "roomNumberColumn" TEXT NOT NULL,
    "columns" TEXT[],
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "AssetImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "searchText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetRecord_importId_idx" ON "AssetRecord"("importId");

-- CreateIndex
CREATE INDEX "AssetRecord_roomNumber_idx" ON "AssetRecord"("roomNumber");

-- AddForeignKey
ALTER TABLE "AssetRecord" ADD CONSTRAINT "AssetRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "AssetImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

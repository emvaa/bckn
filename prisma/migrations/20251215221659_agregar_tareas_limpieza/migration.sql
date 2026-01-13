-- CreateTable
CREATE TABLE "TareaLimpieza" (
    "id" SERIAL NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "asignadoAId" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "tipoLimpieza" TEXT NOT NULL DEFAULT 'check_out',
    "notas" TEXT,
    "problemaReportado" TEXT,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInicio" TIMESTAMP(3),
    "fechaCompletado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TareaLimpieza_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TareaLimpieza" ADD CONSTRAINT "TareaLimpieza_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaLimpieza" ADD CONSTRAINT "TareaLimpieza_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

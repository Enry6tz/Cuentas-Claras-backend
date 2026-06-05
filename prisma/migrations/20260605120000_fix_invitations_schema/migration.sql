-- Reconcilia la tabla `invitations` legacy (columnas invited_id/invited_by/updated_at
-- de un esquema anterior) con el modelo actual (inviter_id/invitee_id/role/responded_at).
-- La tabla traía 1 fila incompatible que impediría agregar columnas NOT NULL; se limpia.

DELETE FROM "invitations";

-- Recrear el enum InvitationStatus con los valores del modelo.
BEGIN;
CREATE TYPE "InvitationStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."invitations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "status" TYPE "InvitationStatus_new" USING ("status"::text::"InvitationStatus_new");
ALTER TYPE "InvitationStatus" RENAME TO "InvitationStatus_old";
ALTER TYPE "InvitationStatus_new" RENAME TO "InvitationStatus";
DROP TYPE "public"."InvitationStatus_old";
ALTER TABLE "invitations" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_invited_by_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_invited_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "invitations_trip_id_invited_id_key";

-- AlterTable
ALTER TABLE "invitations" DROP COLUMN "invited_by",
DROP COLUMN "invited_id",
DROP COLUMN "updated_at",
ADD COLUMN     "invitee_id" UUID NOT NULL,
ADD COLUMN     "inviter_id" UUID NOT NULL,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "role" "ParticipationRole" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "invitations_invitee_id_status_idx" ON "invitations"("invitee_id", "status");

-- CreateIndex
CREATE INDEX "invitations_trip_id_idx" ON "invitations"("trip_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

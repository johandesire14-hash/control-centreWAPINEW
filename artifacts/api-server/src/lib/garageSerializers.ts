import { and, avg, count, eq } from "drizzle-orm";
import { db, favoritesTable, reviewsTable, type Garage } from "@workspace/db";

interface ReviewAggregates {
  averageRating: number;
  reviewCount: number;
  trustQuality: number;
  trustHonesty: number;
  trustPunctuality: number;
  trustValue: number;
}

async function getReviewAggregates(garageId: number): Promise<ReviewAggregates> {
  const [row] = await db
    .select({
      averageRating: avg(reviewsTable.rating),
      reviewCount: count(reviewsTable.id),
      trustQuality: avg(reviewsTable.qualityRating),
      trustHonesty: avg(reviewsTable.honestyRating),
      trustPunctuality: avg(reviewsTable.punctualityRating),
      trustValue: avg(reviewsTable.valueRating),
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.garageId, garageId));

  return {
    averageRating: row?.averageRating ? Number(row.averageRating) : 0,
    reviewCount: row?.reviewCount ?? 0,
    trustQuality: row?.trustQuality ? Math.round(Number(row.trustQuality) * 20) : 0,
    trustHonesty: row?.trustHonesty ? Math.round(Number(row.trustHonesty) * 20) : 0,
    trustPunctuality: row?.trustPunctuality ? Math.round(Number(row.trustPunctuality) * 20) : 0,
    trustValue: row?.trustValue ? Math.round(Number(row.trustValue) * 20) : 0,
  };
}

async function isFavoritedBy(garageId: number, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db
    .select({ id: favoritesTable.id })
    .from(favoritesTable)
    .where(and(eq(favoritesTable.garageId, garageId), eq(favoritesTable.userId, userId)));
  return !!row;
}

function computeProfileCompletion(garage: Garage): number {
  const fields = [
    garage.name,
    garage.neighborhood,
    garage.address,
    garage.phone,
    garage.whatsapp,
    garage.description,
    garage.coverImageUrl,
    garage.avatarImageUrl,
    (garage.specialties as string[])?.length ? "x" : null,
    garage.averageRepairDelay,
    garage.yearsExperience ? "x" : null,
    garage.mechanicsCount ? "x" : null,
    (garage.acceptedBrands as string[])?.length ? "x" : null,
    (garage.openingHours as unknown[])?.length ? "x" : null,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export async function toGarageSummary(garage: Garage, currentUserId?: string) {
  const aggregates = await getReviewAggregates(garage.id);
  const trustScore = Math.round(
    (aggregates.trustQuality + aggregates.trustHonesty + aggregates.trustPunctuality + aggregates.trustValue) / 4,
  );
  const favorite = await isFavoritedBy(garage.id, currentUserId);

  return {
    id: garage.id,
    ownerId: garage.ownerId,
    name: garage.name,
    neighborhood: garage.neighborhood,
    coverImageUrl: garage.coverImageUrl,
    avatarImageUrl: garage.avatarImageUrl,
    certified: garage.certified,
    specialties: (garage.specialties as string[]) ?? [],
    averageRating: Number(aggregates.averageRating.toFixed(1)),
    reviewCount: aggregates.reviewCount,
    trustScore,
    emergencyAvailable: garage.emergencyAvailable,
    isFavorite: favorite,
  };
}

export async function toGarageDetail(garage: Garage, currentUserId?: string) {
  const aggregates = await getReviewAggregates(garage.id);
  const trustScore = Math.round(
    (aggregates.trustQuality + aggregates.trustHonesty + aggregates.trustPunctuality + aggregates.trustValue) / 4,
  );
  const favorite = await isFavoritedBy(garage.id, currentUserId);

  return {
    id: garage.id,
    ownerId: garage.ownerId,
    name: garage.name,
    neighborhood: garage.neighborhood,
    address: garage.address,
    phone: garage.phone,
    whatsapp: garage.whatsapp,
    description: garage.description,
    coverImageUrl: garage.coverImageUrl,
    avatarImageUrl: garage.avatarImageUrl,
    certified: garage.certified,
    specialties: (garage.specialties as string[]) ?? [],
    emergencyAvailable: garage.emergencyAvailable,
    averageRepairDelay: garage.averageRepairDelay,
    yearsExperience: garage.yearsExperience,
    mechanicsCount: garage.mechanicsCount,
    acceptedBrands: (garage.acceptedBrands as string[]) ?? [],
    openingHours: (garage.openingHours as unknown[]) ?? [],
    averageRating: Number(aggregates.averageRating.toFixed(1)),
    reviewCount: aggregates.reviewCount,
    trustScore,
    trustQuality: aggregates.trustQuality,
    trustHonesty: aggregates.trustHonesty,
    trustPunctuality: aggregates.trustPunctuality,
    trustValue: aggregates.trustValue,
    isFavorite: favorite,
    profileCompletion: computeProfileCompletion(garage),
    createdAt: garage.createdAt.toISOString(),
  };
}

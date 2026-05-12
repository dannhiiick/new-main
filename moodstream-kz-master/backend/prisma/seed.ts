import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database...");

  // ─── Artists ───────────────────────────────────────────────────────────────
  const imanbek = await prisma.artist.upsert({
    where: { slug: "imanbek" },
    update: {},
    create: {
      slug: "imanbek",
      name: "Imanbek",
      localizedName: { kk: "Иманбек", ru: "Иманбек", en: "Imanbek" },
      type: "DJ",
      bio: "Казахстанский диджей и музыкальный продюсер из Жанаозена. Известен ремиксом на Saint Jhn — Roses, который стал мировым хитом.",
      isLocal: true,
      isVerified: true,
      isPublished: true,
    },
  });

  const ninetyOne = await prisma.artist.upsert({
    where: { slug: "ninety-one" },
    update: {},
    create: {
      slug: "ninety-one",
      name: "Ninety One",
      localizedName: { kk: "Ninety One", ru: "Ninety One", en: "Ninety One" },
      type: "BAND",
      bio: "Казахстанская K-pop группа, основанная в 2015 году. Участники: Ace, Zaq, Bul, Ama, Dll.",
      isLocal: true,
      isVerified: true,
      isPublished: true,
    },
  });

  const moldanazar = await prisma.artist.upsert({
    where: { slug: "moldanazar" },
    update: {},
    create: {
      slug: "moldanazar",
      name: "Moldanazar",
      localizedName: { kk: "Молданазар", ru: "Молданазар", en: "Moldanazar" },
      type: "SOLO",
      bio: "Казахстанский певец и музыкант, исполняющий казахскую народную и поп-музыку.",
      isLocal: true,
      isVerified: true,
      isPublished: true,
    },
  });

  const jahKhalib = await prisma.artist.upsert({
    where: { slug: "jah-khalib" },
    update: {},
    create: {
      slug: "jah-khalib",
      name: "Jah Khalib",
      localizedName: { kk: "Жах Халиб", ru: "Жах Халиб", en: "Jah Khalib" },
      type: "SOLO",
      bio: "Казахстанский рэпер и певец, выступающий в жанрах хип-хоп, R&B и trap.",
      isLocal: true,
      isVerified: true,
      isPublished: true,
    },
  });

  console.log("Artists created:", imanbek.slug, ninetyOne.slug, moldanazar.slug, jahKhalib.slug);

  // ─── Releases ──────────────────────────────────────────────────────────────
  const roses = await prisma.release.upsert({
    where: { slug: "imanbek-roses-remix" },
    update: {},
    create: {
      slug: "imanbek-roses-remix",
      title: "Roses (Imanbek Remix)",
      releaseType: "SINGLE",
      releaseDate: new Date("2019-10-25"),
      isPublished: true,
      sourcePolicy: "CURATED",
      artistId: imanbek.id,
      catalogVisibilityReason: "Chart-topping remix",
    },
  });

  const imanbekAlbum = await prisma.release.upsert({
    where: { slug: "imanbek-honest" },
    update: {},
    create: {
      slug: "imanbek-honest",
      title: "Honest",
      releaseType: "ALBUM",
      releaseDate: new Date("2021-06-18"),
      isPublished: true,
      sourcePolicy: "CURATED",
      artistId: imanbek.id,
    },
  });

  const ninetyOneEP = await prisma.release.upsert({
    where: { slug: "ninety-one-haiqai" },
    update: {},
    create: {
      slug: "ninety-one-haiqai",
      title: "Haiqai",
      releaseType: "EP",
      releaseDate: new Date("2020-03-15"),
      isPublished: true,
      sourcePolicy: "CURATED",
      artistId: ninetyOne.id,
    },
  });

  const moldanazarAlbum = await prisma.release.upsert({
    where: { slug: "moldanazar-arman" },
    update: {},
    create: {
      slug: "moldanazar-arman",
      title: "Арман",
      releaseType: "ALBUM",
      releaseDate: new Date("2018-09-01"),
      isPublished: true,
      sourcePolicy: "CURATED",
      artistId: moldanazar.id,
    },
  });

  const jahKhalibSingle = await prisma.release.upsert({
    where: { slug: "jah-khalib-mezhdu-nami-tishina" },
    update: {},
    create: {
      slug: "jah-khalib-mezhdu-nami-tishina",
      title: "Между нами тишина",
      releaseType: "SINGLE",
      releaseDate: new Date("2017-08-20"),
      isPublished: true,
      sourcePolicy: "CURATED",
      artistId: jahKhalib.id,
    },
  });

  console.log("Releases created");

  // ─── Tracks ────────────────────────────────────────────────────────────────
  // Helper to create or find a track
  async function upsertTrack(data: {
    title: string;
    durationMs: number;
    trackNumber: number;
    isLocal: boolean;
    isExplicit: boolean;
    releaseId: string;
    primaryArtistId: string;
    featuredArtistId?: string;
  }) {
    const existing = await prisma.track.findFirst({
      where: { title: data.title, releaseId: data.releaseId },
    });

    if (existing != null) {
      return existing;
    }

    return prisma.track.create({
      data: {
        title: data.title,
        durationMs: data.durationMs,
        trackNumber: data.trackNumber,
        isLocal: data.isLocal,
        isExplicit: data.isExplicit,
        offlineEligible: true,
        releaseId: data.releaseId,
        audioAssetKey: null, // No actual audio for seed
        isPublished: true,
        playbackStatus: "PLAYABLE",
        sourcePolicy: "CURATED",
        catalogVisibilityReason: "Seeded track",
        lastConfirmedAt: new Date(),
        artists: {
          create: [
            { artistId: data.primaryArtistId, role: "PRIMARY", order: 0 },
            ...(data.featuredArtistId != null
              ? [{ artistId: data.featuredArtistId, role: "FEATURED", order: 1 }]
              : []),
          ],
        },
      },
    });
  }

  // Imanbek tracks
  const track1 = await upsertTrack({
    title: "Roses (Imanbek Remix)",
    durationMs: 175000,
    trackNumber: 1,
    isLocal: true,
    isExplicit: false,
    releaseId: roses.id,
    primaryArtistId: imanbek.id,
  });

  const track2 = await upsertTrack({
    title: "딱 내 스타일 (Just My Type)",
    durationMs: 198000,
    trackNumber: 1,
    isLocal: true,
    isExplicit: false,
    releaseId: imanbekAlbum.id,
    primaryArtistId: imanbek.id,
  });

  const track3 = await upsertTrack({
    title: "Loco",
    durationMs: 213000,
    trackNumber: 2,
    isLocal: true,
    isExplicit: false,
    releaseId: imanbekAlbum.id,
    primaryArtistId: imanbek.id,
  });

  // Ninety One tracks
  const track4 = await upsertTrack({
    title: "Haiqai",
    durationMs: 225000,
    trackNumber: 1,
    isLocal: true,
    isExplicit: false,
    releaseId: ninetyOneEP.id,
    primaryArtistId: ninetyOne.id,
  });

  const track5 = await upsertTrack({
    title: "В темноте",
    durationMs: 238000,
    trackNumber: 2,
    isLocal: true,
    isExplicit: false,
    releaseId: ninetyOneEP.id,
    primaryArtistId: ninetyOne.id,
  });

  const track6 = await upsertTrack({
    title: "Айтпадым",
    durationMs: 205000,
    trackNumber: 3,
    isLocal: true,
    isExplicit: false,
    releaseId: ninetyOneEP.id,
    primaryArtistId: ninetyOne.id,
  });

  // Moldanazar tracks
  const track7 = await upsertTrack({
    title: "Арман",
    durationMs: 252000,
    trackNumber: 1,
    isLocal: true,
    isExplicit: false,
    releaseId: moldanazarAlbum.id,
    primaryArtistId: moldanazar.id,
  });

  const track8 = await upsertTrack({
    title: "Туған жер",
    durationMs: 271000,
    trackNumber: 2,
    isLocal: true,
    isExplicit: false,
    releaseId: moldanazarAlbum.id,
    primaryArtistId: moldanazar.id,
  });

  // Jah Khalib tracks
  const track9 = await upsertTrack({
    title: "Между нами тишина",
    durationMs: 246000,
    trackNumber: 1,
    isLocal: true,
    isExplicit: false,
    releaseId: jahKhalibSingle.id,
    primaryArtistId: jahKhalib.id,
  });

  const track10 = await upsertTrack({
    title: "Самая (feat. Imanbek)",
    durationMs: 233000,
    trackNumber: 2,
    isLocal: true,
    isExplicit: false,
    releaseId: jahKhalibSingle.id,
    primaryArtistId: jahKhalib.id,
    featuredArtistId: imanbek.id,
  });

  console.log(
    "Tracks created:",
    [track1, track2, track3, track4, track5, track6, track7, track8, track9, track10]
      .map((t) => t.title)
      .join(", "),
  );

  // ─── Sample Chart ──────────────────────────────────────────────────────────
  const topKZ = await prisma.chart.upsert({
    where: { slug: "top-kz" },
    update: { isPublished: true, updatedAt: new Date() },
    create: {
      slug: "top-kz",
      title: "Топ Казахстана",
      territory: "KZ",
      isLocal: true,
      isPublished: true,
    },
  });

  // Add chart entries for top tracks
  const chartTracks = [track1, track9, track4, track7, track2];
  for (let i = 0; i < chartTracks.length; i++) {
    const t = chartTracks[i];
    if (t == null) continue;
    await prisma.chartEntry.upsert({
      where: { chartId_trackId: { chartId: topKZ.id, trackId: t.id } },
      update: { position: i + 1 },
      create: {
        chartId: topKZ.id,
        trackId: t.id,
        position: i + 1,
        peakPos: i + 1,
        weeksOn: Math.floor(Math.random() * 8) + 1,
      },
    });
  }

  console.log("Chart seeded: Топ Казахстана");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

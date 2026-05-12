import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { LocaleCode, TerritoryCode } from "../../domain/types.js";
import {
  getHomeSections,
  searchTracks,
  getTrackById,
  getArtistById,
  getReleaseById,
  getArtistStats,
} from "./catalog.service.js";

const LocaleSchema = z
  .enum(["kk", "ru", "en"])
  .default("ru")
  .transform((v) => v as LocaleCode);

const TerritorySchema = z
  .enum(["KZ", "KG", "UZ", "AZ", "TJ", "TM", "GLOBAL"])
  .default("KZ")
  .transform((v) => v as TerritoryCode);

const HomeQuerySchema = z.object({
  locale: LocaleSchema,
  territory: TerritorySchema,
});

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  locale: LocaleSchema,
  territory: TerritorySchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const catalogModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // GET /home
  app.get("/home", async (request, reply) => {
    const query = HomeQuerySchema.parse(request.query);
    const result = await getHomeSections(query.locale, query.territory);
    return reply.send(result);
  });

  // GET /search
  app.get("/search", async (request, reply) => {
    const query = SearchQuerySchema.parse(request.query);
    const result = await searchTracks(
      query.q,
      query.locale,
      query.territory,
      query.cursor,
      query.limit,
    );
    return reply.send(result);
  });

  // GET /tracks/:id
  app.get<{ Params: { id: string } }>("/tracks/:id", async (request, reply) => {
    const { id } = request.params;
    const track = await getTrackById(id);
    return reply.send(track);
  });

  // GET /artists/:id
  app.get<{ Params: { id: string } }>("/artists/:id", async (request, reply) => {
    const { id } = request.params;
    const artist = await getArtistById(id);
    return reply.send(artist);
  });

  // GET /releases/:id
  app.get<{ Params: { id: string } }>("/releases/:id", async (request, reply) => {
    const { id } = request.params;
    const release = await getReleaseById(id);
    return reply.send(release);
  });

  // GET /artists/:id/stats — full artist profile with tracks, top plays, discography
  app.get<{ Params: { id: string } }>("/artists/:id/stats", async (request, reply) => {
    const { id } = request.params;
    const stats = await getArtistStats(id);
    return reply.send(stats);
  });
};

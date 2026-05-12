import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  listPlaylists,
  getPlaylistById,
  getPlaylistOwner,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
} from "./playlists.service.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

const CreateBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
});

const AddTrackBodySchema = z.object({
  trackId: z.string().min(1),
});

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function assertOwner(
  reply: Parameters<typeof verifyJwt>[1],
  playlistId: string,
  userId: string,
): Promise<boolean> {
  const owner = await getPlaylistOwner(playlistId);
  if (owner === null) {
    const body: ProblemDetails = { code: "NOT_FOUND", message: "Playlist not found" };
    await reply.status(404).send(body);
    return false;
  }
  if (owner !== userId) {
    const body: ProblemDetails = { code: "FORBIDDEN", message: "You do not own this playlist" };
    await reply.status(403).send(body);
    return false;
  }
  return true;
}

// ─── Module ───────────────────────────────────────────────────────────────────

export const playlistsModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // GET /api/v1/playlists — list user's own playlists
  app.get(
    "/",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const userId = getUserId(request);
      const query = ListQuerySchema.parse(request.query);
      const result = await listPlaylists(userId, {
        ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
        limit: query.limit,
      });
      return reply.send(result);
    },
  );

  // POST /api/v1/playlists — create playlist
  app.post(
    "/",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const userId = getUserId(request);
      const body = CreateBodySchema.parse(request.body);
      const result = await createPlaylist(userId, {
        title: body.title,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
      });
      return reply.status(201).send(result);
    },
  );

  // GET /api/v1/playlists/:id — get playlist detail with tracks
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = getUserId(request);
      const playlist = await getPlaylistById(id);

      if (!playlist) {
        const body: ProblemDetails = { code: "NOT_FOUND", message: "Playlist not found" };
        return reply.status(404).send(body);
      }

      // Allow access to own playlists + public playlists
      const owner = await getPlaylistOwner(id);
      if (owner !== userId && playlist.visibility !== "PUBLIC") {
        const body: ProblemDetails = { code: "FORBIDDEN", message: "You do not own this playlist" };
        return reply.status(403).send(body);
      }

      return reply.send(playlist);
    },
  );

  // POST /api/v1/playlists/:id/tracks — add track to playlist
  app.post<{ Params: { id: string } }>(
    "/:id/tracks",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = getUserId(request);

      if (!(await assertOwner(reply, id, userId))) return;

      const body = AddTrackBodySchema.parse(request.body);
      const result = await addTrackToPlaylist(id, body.trackId);
      return reply.status(201).send(result);
    },
  );

  // DELETE /api/v1/playlists/:id/tracks/:trackId — soft-delete track
  app.delete<{ Params: { id: string; trackId: string } }>(
    "/:id/tracks/:trackId",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { id, trackId } = request.params;
      const userId = getUserId(request);

      if (!(await assertOwner(reply, id, userId))) return;

      const removed = await removeTrackFromPlaylist(id, trackId);
      if (!removed) {
        const body: ProblemDetails = { code: "NOT_FOUND", message: "Track not found in playlist" };
        return reply.status(404).send(body);
      }
      return reply.status(204).send();
    },
  );

  // DELETE /api/v1/playlists/:id — delete playlist
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = getUserId(request);

      if (!(await assertOwner(reply, id, userId))) return;

      await deletePlaylist(id);
      return reply.status(204).send();
    },
  );
};

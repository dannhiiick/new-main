import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    friendship: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    artistFollow: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    release: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../../db/client.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  followArtist,
  unfollowArtist,
  getSocialFeed,
  FriendNotFoundError,
  AlreadyFriendsError,
} from "../social.service.js";

const mockUser = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockFriendshipFindFirst = prisma.friendship.findFirst as ReturnType<typeof vi.fn>;
const mockFriendshipCreate = prisma.friendship.create as ReturnType<typeof vi.fn>;
const mockFriendshipUpdateMany = prisma.friendship.updateMany as ReturnType<typeof vi.fn>;
const mockFriendshipFindMany = prisma.friendship.findMany as ReturnType<typeof vi.fn>;
const mockArtistFollowUpsert = prisma.artistFollow.upsert as ReturnType<typeof vi.fn>;
const mockArtistFollowDeleteMany = prisma.artistFollow.deleteMany as ReturnType<typeof vi.fn>;
const mockArtistFollowFindMany = prisma.artistFollow.findMany as ReturnType<typeof vi.fn>;
const mockReleaseFindMany = prisma.release.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockReleaseFindMany.mockResolvedValue([]);
});

describe("sendFriendRequest", () => {
  it("creates a friendship when both users exist", async () => {
    mockUser.mockResolvedValue({ id: "user-2" });
    mockFriendshipFindFirst.mockResolvedValue(null);
    mockFriendshipCreate.mockResolvedValue({});

    await sendFriendRequest("user-1", "user-2");

    expect(mockFriendshipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { requesterId: "user-1", addresseeId: "user-2" },
      }),
    );
  });

  it("throws FriendNotFoundError when addressee doesn't exist", async () => {
    mockUser.mockResolvedValue(null);

    await expect(sendFriendRequest("user-1", "unknown")).rejects.toThrow(FriendNotFoundError);
  });

  it("throws AlreadyFriendsError when friendship exists", async () => {
    mockUser.mockResolvedValue({ id: "user-2" });
    mockFriendshipFindFirst.mockResolvedValue({ id: "f-1", status: "ACCEPTED" });

    await expect(sendFriendRequest("user-1", "user-2")).rejects.toThrow(AlreadyFriendsError);
  });

  it("throws FriendNotFoundError when sending to self", async () => {
    await expect(sendFriendRequest("user-1", "user-1")).rejects.toThrow(FriendNotFoundError);
  });
});

describe("acceptFriendRequest", () => {
  it("updates friendship status to ACCEPTED", async () => {
    mockFriendshipUpdateMany.mockResolvedValue({ count: 1 });

    await acceptFriendRequest("user-2", "user-1");

    expect(mockFriendshipUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ACCEPTED" },
      }),
    );
  });
});

describe("getFriends", () => {
  it("returns friends from both sides of the relationship", async () => {
    mockFriendshipFindMany.mockResolvedValue([
      {
        requesterId: "user-1",
        addresseeId: "user-2",
        requester: { id: "user-1", displayName: "A", avatarUrl: null },
        addressee: { id: "user-2", displayName: "B", avatarUrl: null },
      },
      {
        requesterId: "user-3",
        addresseeId: "user-1",
        requester: { id: "user-3", displayName: "C", avatarUrl: null },
        addressee: { id: "user-1", displayName: "A", avatarUrl: null },
      },
    ]);

    const friends = await getFriends("user-1");

    expect(friends).toHaveLength(2);
    expect(friends.map((f) => f.id)).toContain("user-2");
    expect(friends.map((f) => f.id)).toContain("user-3");
  });
});

describe("followArtist / unfollowArtist", () => {
  it("calls upsert on follow", async () => {
    mockArtistFollowUpsert.mockResolvedValue({});
    await followArtist("user-1", "artist-1");
    expect(mockArtistFollowUpsert).toHaveBeenCalled();
  });

  it("calls deleteMany on unfollow", async () => {
    mockArtistFollowDeleteMany.mockResolvedValue({ count: 1 });
    await unfollowArtist("user-1", "artist-1");
    expect(mockArtistFollowDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", artistId: "artist-1" },
    });
  });
});

describe("getSocialFeed", () => {
  it("returns feed items from followed artists' releases", async () => {
    mockArtistFollowFindMany.mockResolvedValue([{ artistId: "artist-1" }]);
    mockReleaseFindMany.mockResolvedValue([
      {
        id: "rel-1",
        title: "New Album",
        coverAssetUrl: null,
        releaseType: "ALBUM",
        releaseDate: new Date("2025-03-01"),
        createdAt: new Date("2025-03-01"),
        artist: { id: "artist-1", name: "Artist", slug: "artist", isLocal: false },
      },
    ]);

    const result = await getSocialFeed("user-1");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.type).toBe("NEW_RELEASE");
    expect(result.items[0]?.release?.title).toBe("New Album");
  });

  it("returns empty feed when no followed artists", async () => {
    mockArtistFollowFindMany.mockResolvedValue([]);

    const result = await getSocialFeed("user-1");

    expect(result.items).toHaveLength(0);
    expect(result.totalFollowedArtists).toBe(0);
  });
});

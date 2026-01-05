import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Downloader } from "@shared/schema";

vi.mock("parse-torrent", () => ({
  default: vi.fn().mockResolvedValue({ infoHash: "abc123def456" }),
}));

describe("Downloader Duplicate Handling", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it("Transmission: should return success: true when torrent is a duplicate", async () => {
    const transmission: Downloader = {
      id: "trans-1",
      name: "Transmission",
      type: "transmission",
      url: "http://localhost:9091",
      username: "admin",
      password: "password",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock session ID response
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
      json: async () => ({}),
      text: async () => "",
    });

    // Mock duplicate response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        arguments: {
          "torrent-duplicate": {
            id: 123,
            name: "Test Game",
            hashString: "duplicate-hash",
          },
        },
        result: "success",
      }),
    });

    const { DownloaderManager } = await import("../downloaders.js");
    const result = await DownloaderManager.addTorrent(transmission, {
      url: "magnet:?xt=urn:btih:duplicate-hash",
      title: "Test Game",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Torrent already exists");
    expect(result.id).toBe("duplicate-hash");
  });

  it("qBittorrent: should return success: true when response is 'Fails.'", async () => {
    const qbittorrent: Downloader = {
      id: "qb-1",
      name: "qBittorrent",
      type: "qbittorrent",
      url: "http://localhost:8080",
      username: "admin",
      password: "password",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock login
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "Ok.",
      headers: new Headers([["set-cookie", "SID=abc"]]),
    });

    // Mock add torrent response "Fails."
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "Fails.",
    });

    const { DownloaderManager } = await import("../downloaders.js");
    const result = await DownloaderManager.addTorrent(qbittorrent, {
      url: "magnet:?xt=urn:btih:some-hash",
      title: "Test Game",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Torrent already exists or invalid torrent");
  });

  it("SABnzbd: should return success: true when status is true but nzo_ids is empty", async () => {
    const sabnzbd: Downloader = {
      id: "sab-1",
      name: "SABnzbd",
      type: "sabnzbd",
      url: "http://localhost:8080",
      username: "apikey",
      password: "",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock addurl response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: true,
        nzo_ids: [], // Empty array
      }),
    });

    const { DownloaderManager } = await import("../downloaders.js");
    const result = await DownloaderManager.addTorrent(sabnzbd, {
      url: "http://example.com/test.nzb",
      title: "Test Game",
      downloadType: "usenet",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("likely duplicate or merged");
  });

  it("SABnzbd: should return success: true when error message contains 'duplicate'", async () => {
    const sabnzbd: Downloader = {
      id: "sab-1",
      name: "SABnzbd",
      type: "sabnzbd",
      url: "http://localhost:8080",
      username: "apikey",
      password: "",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock addurl response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: false,
        error: "Duplicate NZB URL",
      }),
    });

    const { DownloaderManager } = await import("../downloaders.js");
    const result = await DownloaderManager.addTorrent(sabnzbd, {
      url: "http://example.com/test.nzb",
      title: "Test Game",
      downloadType: "usenet",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("NZB already exists");
  });

  it("addTorrentWithFallback: should stop falling back when duplicate is encountered (success: true)", async () => {
    const downloader1: Downloader = {
      id: "trans-1",
      name: "Transmission (Primary)",
      type: "transmission",
      url: "http://localhost:9091",
      username: "admin",
      password: "password",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const downloader2: Downloader = {
      id: "qb-1",
      name: "qBittorrent (Secondary)",
      type: "qbittorrent",
      url: "http://localhost:8080",
      username: "admin",
      password: "password",
      enabled: true,
      priority: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Transmission duplicate response (session + response)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
      json: async () => ({}),
      text: async () => "",
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        arguments: {
          "torrent-duplicate": {
            id: 123,
            name: "Test Game",
            hashString: "duplicate-hash",
          },
        },
        result: "success",
      }),
    });

    const { DownloaderManager } = await import("../downloaders.js");

    // Attempt add with fallback
    const result = await DownloaderManager.addTorrentWithFallback([downloader1, downloader2], {
      url: "magnet:?xt=urn:btih:duplicate-hash",
      title: "Test Game",
      downloadType: "torrent",
    });

    // Should succeed on the first one (Transmission) despite it being a duplicate
    expect(result.success).toBe(true);
    expect(result.downloaderName).toBe("Transmission (Primary)");
    expect(result.attemptedDownloaders).toEqual(["Transmission (Primary)"]);
    // Should NOT have called qBittorrent login/add
    expect(fetchMock).toHaveBeenCalledTimes(2); // Only Transmission calls
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Downloader } from "@shared/schema";

vi.mock("parse-torrent", () => ({
  default: vi.fn().mockResolvedValue({ infoHash: "abc123def456" }),
}));

describe("Comprehensive Downloader Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  // ==================== Transmission Tests ====================
  describe("TransmissionClient", () => {
    const downloader: Downloader = {
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

    it("should test connection successfully", async () => {
      // Mock session ID requirement then success
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
          json: async () => ({}),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: "success" }),
        });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.testDownloader(downloader);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Connected successfully");
    });

    it("should add torrent successfully", async () => {
      fetchMock
        .mockResolvedValueOnce({
          // Session ID
          ok: false,
          status: 409,
          headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
          json: async () => ({}),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          // Add success
          ok: true,
          status: 200,
          json: async () => ({
            arguments: {
              "torrent-added": {
                hashString: "hash123",
                name: "Test Torrent",
                id: 1,
              },
            },
            result: "success",
          }),
        });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "magnet:?xt=urn:btih:hash123",
        title: "Test Torrent",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("hash123");
    });

    it("should handle duplicate torrent as success", async () => {
      fetchMock
        .mockResolvedValueOnce({
          // Session ID
          ok: false,
          status: 409,
          headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
          json: async () => ({}),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          // Duplicate response
          ok: true,
          status: 200,
          json: async () => ({
            arguments: {
              "torrent-duplicate": {
                hashString: "hash123",
                name: "Test Torrent",
                id: 1,
              },
            },
            result: "success",
          }),
        });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "magnet:?xt=urn:btih:hash123",
        title: "Test Torrent",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Torrent already exists");
    });

    it("should get torrent status", async () => {
      fetchMock
        .mockResolvedValueOnce({
          // Session ID
          ok: false,
          status: 409,
          headers: new Headers([["X-Transmission-Session-Id", "session-id"]]),
          json: async () => ({}),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          // Status response
          ok: true,
          status: 200,
          json: async () => ({
            arguments: {
              torrents: [
                {
                  id: 1,
                  name: "Test Torrent",
                  status: 4, // Downloading
                  percentDone: 0.5,
                  rateDownload: 1000,
                  rateUpload: 0,
                  eta: 3600,
                  totalSize: 1000000,
                  downloadedEver: 500000,
                  hashString: "hash123",
                },
              ],
            },
            result: "success",
          }),
        });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.getTorrentStatus(downloader, "hash123");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("downloading");
      expect(result?.progress).toBe(50);
    });
  });

  // ==================== rTorrent Tests ====================
  describe("RTorrentClient", () => {
    const downloader: Downloader = {
      id: "rt-1",
      name: "rTorrent",
      type: "rtorrent",
      url: "http://localhost:80",
      username: "user",
      password: "password",
      enabled: true,
      priority: 1,
      urlPath: "/RPC2",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should test connection successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><string>0.9.8</string></value></param></params></methodResponse>`,
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.testDownloader(downloader);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Connected successfully");
    });

    it("should add torrent successfully", async () => {
      // Mock fetching .torrent file
      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(10),
      });

      // Mock XML-RPC load.raw_start response (0 = success)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><i4>0</i4></value></param></params></methodResponse>`,
      });

      // Mock set custom1 (category)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><i4>0</i4></value></param></params></methodResponse>`,
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "http://example.com/test.torrent",
        title: "Test Torrent",
        category: "movies",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("abc123def456"); // From mock parse-torrent
    });
  });

  // ==================== qBittorrent Tests ====================
  describe("QBittorrentClient", () => {
    const downloader: Downloader = {
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

    it("should test connection successfully", async () => {
      // Mock login
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "Ok.",
        headers: new Headers([["set-cookie", "SID=abc"]]),
      });

      // Mock version
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "v4.3.9",
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.testDownloader(downloader);

      expect(result.success).toBe(true);
      expect(result.message).toContain("v4.3.9");
    });

    it("should add torrent successfully", async () => {
      // Mock login
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "Ok.",
        headers: new Headers([["set-cookie", "SID=abc"]]),
      });

      // Mock add
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "Ok.",
      });

      // Mock verify (info call)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ hash: "hash123", name: "Test Torrent" }],
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "magnet:?xt=urn:btih:hash123",
        title: "Test Torrent",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("hash123");
    });

    it("should handle duplicate torrent (Fails.) as success", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "Ok.",
        headers: new Headers([["set-cookie", "SID=abc"]]),
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "Fails.",
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "magnet:?xt=urn:btih:hash123",
        title: "Test Torrent",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("already exists");
    });
  });

  // ==================== SABnzbd Tests ====================
  describe("SABnzbdClient", () => {
    const downloader: Downloader = {
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

    it("should test connection successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "3.4.2" }),
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.testDownloader(downloader);

      expect(result.success).toBe(true);
      expect(result.message).toContain("v3.4.2");
    });

    it("should add NZB successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, nzo_ids: ["nzo123"] }),
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "http://example.com/test.nzb",
        title: "Test NZB",
        downloadType: "usenet",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("nzo123");
    });

    it("should handle duplicate NZB as success", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: false, error: "Duplicate NZB URL" }),
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "http://example.com/test.nzb",
        title: "Test NZB",
        downloadType: "usenet",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("already exists");
    });
  });

  // ==================== NZBGet Tests ====================
  describe("NZBGetClient", () => {
    const downloader: Downloader = {
      id: "nzbget-1",
      name: "NZBGet",
      type: "nzbget",
      url: "http://localhost:6789",
      username: "control",
      password: "password",
      enabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should test connection successfully", async () => {
      // Mock version response (XML-RPC)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><string>21.0</string></value></param></params></methodResponse>`,
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.testDownloader(downloader);

      expect(result.success).toBe(true);
      expect(result.message).toContain("v21.0");
    });

    it("should add NZB successfully", async () => {
      // Mock fetching .nzb file
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "nzb content",
      });

      // Mock append response (returns ID > 0)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><i4>10</i4></value></param></params></methodResponse>`,
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "http://example.com/test.nzb",
        title: "Test NZB",
        downloadType: "usenet",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("10");
    });

    it("should fail to add NZB if ID is 0", async () => {
      // Mock fetching .nzb file
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => "nzb content",
      });

      // Mock append response (returns ID 0)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><methodResponse><params><param><value><i4>0</i4></value></param></params></methodResponse>`,
      });

      const { DownloaderManager } = await import("../downloaders.js");
      const result = await DownloaderManager.addTorrent(downloader, {
        url: "http://example.com/test.nzb",
        title: "Test NZB",
        downloadType: "usenet",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("ID is 0");
    });
  });
});

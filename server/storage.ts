import { type User, type InsertUser, type Game, type InsertGame, type UpdateGameStatus, users, games } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game methods
  getGame(id: string): Promise<Game | undefined>;
  getGameByIgdbId(igdbId: number): Promise<Game | undefined>;
  getAllGames(): Promise<Game[]>;
  getGamesByStatus(status: string): Promise<Game[]>;
  searchGames(query: string): Promise<Game[]>;
  addGame(game: InsertGame): Promise<Game>;
  updateGameStatus(id: string, statusUpdate: UpdateGameStatus): Promise<Game | undefined>;
  removeGame(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private games: Map<string, Game>;

  constructor() {
    this.users = new Map();
    this.games = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Game methods
  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameByIgdbId(igdbId: number): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(
      (game) => game.igdbId === igdbId,
    );
  }

  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values()).sort((a, b) => 
      new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
    );
  }

  async getGamesByStatus(status: string): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter((game) => game.status === status)
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
  }

  async searchGames(query: string): Promise<Game[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.games.values())
      .filter((game) => 
        game.title.toLowerCase().includes(lowercaseQuery) ||
        game.genres?.some((genre) => genre.toLowerCase().includes(lowercaseQuery)) ||
        game.platforms?.some((platform) => platform.toLowerCase().includes(lowercaseQuery))
      )
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime());
  }

  async addGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = { 
      ...insertGame, 
      id,
      status: insertGame.status || "wanted",
      summary: insertGame.summary || null,
      coverUrl: insertGame.coverUrl || null,
      releaseDate: insertGame.releaseDate || null,
      rating: insertGame.rating || null,
      platforms: insertGame.platforms || null,
      genres: insertGame.genres || null,
      screenshots: insertGame.screenshots || null,
      igdbId: insertGame.igdbId || null,
      addedAt: new Date(),
      completedAt: null
    };
    this.games.set(id, game);
    return game;
  }

  async updateGameStatus(id: string, statusUpdate: UpdateGameStatus): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;

    const updatedGame: Game = {
      ...game,
      status: statusUpdate.status,
      completedAt: statusUpdate.status === "completed" ? new Date() : null,
    };

    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async removeGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Game methods
  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getGameByIgdbId(igdbId: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.igdbId, igdbId));
    return game || undefined;
  }

  async getAllGames(): Promise<Game[]> {
    return db.select().from(games).orderBy(sql`${games.addedAt} DESC`);
  }

  async getGamesByStatus(status: string): Promise<Game[]> {
    return db.select().from(games)
      .where(eq(games.status, status as any))
      .orderBy(sql`${games.addedAt} DESC`);
  }

  async searchGames(query: string): Promise<Game[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return db.select().from(games)
      .where(
        or(
          ilike(games.title, searchTerm),
          sql`EXISTS (SELECT 1 FROM unnest(${games.genres}) AS genre WHERE genre ILIKE ${searchTerm})`,
          sql`EXISTS (SELECT 1 FROM unnest(${games.platforms}) AS platform WHERE platform ILIKE ${searchTerm})`
        )
      )
      .orderBy(sql`${games.addedAt} DESC`);
  }

  async addGame(insertGame: InsertGame): Promise<Game> {
    const gameWithId = {
      ...insertGame,
      id: randomUUID(),
    };
    
    const [game] = await db
      .insert(games)
      .values(gameWithId)
      .returning();
    return game;
  }

  async updateGameStatus(id: string, statusUpdate: UpdateGameStatus): Promise<Game | undefined> {
    const [updatedGame] = await db
      .update(games)
      .set({
        status: statusUpdate.status,
        completedAt: statusUpdate.status === "completed" ? new Date() : null,
      })
      .where(eq(games.id, id))
      .returning();
    
    return updatedGame || undefined;
  }

  async removeGame(id: string): Promise<boolean> {
    const result = await db.delete(games).where(eq(games.id, id));
    // For Drizzle, we assume success if no error is thrown
    return true;
  }
}

export const storage = new DatabaseStorage();

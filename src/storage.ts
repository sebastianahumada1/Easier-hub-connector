import * as fs from 'fs';
import * as path from 'path';
import { TokenData } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

export class Storage {
  constructor() {
    this.ensureDataDirectory();
  }

  /**
   * Asegura que el directorio de datos existe
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('FacebookTokenManager: Directorio de datos creado');
    }
  }

  /**
   * Lee todos los tokens almacenados
   */
  readTokens(): TokenData[] {
    try {
      if (!fs.existsSync(TOKENS_FILE)) {
        return [];
      }

      const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      console.error('FacebookTokenManager: Error leyendo tokens:', error.message);
      return [];
    }
  }

  /**
   * Guarda todos los tokens
   */
  writeTokens(tokens: TokenData[]): void {
    try {
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
      console.log('FacebookTokenManager: Tokens guardados exitosamente');
    } catch (error: any) {
      console.error('FacebookTokenManager: Error guardando tokens:', error.message);
      throw error;
    }
  }

  /**
   * Guarda o actualiza un token específico
   */
  saveToken(tokenData: TokenData): void {
    const tokens = this.readTokens();
    const existingIndex = tokens.findIndex(t => t.appId === tokenData.appId);

    if (existingIndex >= 0) {
      tokens[existingIndex] = tokenData;
    } else {
      tokens.push(tokenData);
    }

    this.writeTokens(tokens);
  }

  /**
   * Obtiene un token específico por App ID
   */
  getToken(appId: string): TokenData | null {
    const tokens = this.readTokens();
    return tokens.find(t => t.appId === appId) || null;
  }

  /**
   * Obtiene todos los tokens almacenados
   */
  getAllTokens(): TokenData[] {
    return this.readTokens();
  }
}

export const storage = new Storage();


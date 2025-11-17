import * as fs from 'fs';
import * as path from 'path';
import { TokenData, GHLAccount } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const GHL_CONFIG_FILE = path.join(DATA_DIR, 'ghl-accounts.json');

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

  /**
   * Lee todas las cuentas de GHL almacenadas
   */
  readGHLAccounts(): GHLAccount[] {
    try {
      if (!fs.existsSync(GHL_CONFIG_FILE)) {
        return [];
      }

      const data = fs.readFileSync(GHL_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      console.error('GHL: Error leyendo cuentas:', error.message);
      return [];
    }
  }

  /**
   * Guarda todas las cuentas de GHL
   */
  writeGHLAccounts(accounts: GHLAccount[]): void {
    try {
      fs.writeFileSync(GHL_CONFIG_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
      console.log('GHL: Cuentas guardadas exitosamente');
    } catch (error: any) {
      console.error('GHL: Error guardando cuentas:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene todas las cuentas de GHL
   */
  getAllGHLAccounts(): GHLAccount[] {
    return this.readGHLAccounts();
  }
}

export const storage = new Storage();


import sqlite3 from 'sqlite3'
import { app } from 'electron'
import { join } from 'path'

// Get the user data path to store the DB file
const dbPath = join(app.getPath('userData'), 'smartwifi.db')
let db: sqlite3.Database

export interface SpeedTestResult {
  id?: number
  timestamp: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
}

export function initDb(): void {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message)
    } else {
      console.log('Connected to SQLite database at', dbPath)
      // Create tables if they don't exist
      db.run(
        `CREATE TABLE IF NOT EXISTS speed_tests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          downloadMbps REAL NOT NULL,
          uploadMbps REAL NOT NULL,
          pingMs REAL NOT NULL,
          jitterMs REAL NOT NULL,
          server TEXT NOT NULL
        )`,
        (createErr) => {
          if (createErr) console.error('Failed to create table:', createErr.message)
        }
      )
    }
  })
}

export function insertSpeedTest(result: SpeedTestResult): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO speed_tests (timestamp, downloadMbps, uploadMbps, pingMs, jitterMs, server)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    db.run(
      query,
      [
        result.timestamp,
        result.downloadMbps,
        result.uploadMbps,
        result.pingMs,
        result.jitterMs,
        result.server
      ],
      function (err) {
        if (err) reject(err)
        else resolve(this.lastID)
      }
    )
  })
}

export function getSpeedTests(): Promise<SpeedTestResult[]> {
  return new Promise((resolve, reject) => {
    const query =
      'SELECT id, timestamp, downloadMbps, uploadMbps, pingMs, jitterMs, server FROM speed_tests ORDER BY timestamp DESC'
    db.all(query, [], (err, rows) => {
      if (err) reject(err)
      else resolve(rows as SpeedTestResult[])
    })
  })
}

export function clearSpeedTests(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM speed_tests', (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function deleteSpeedTest(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM speed_tests WHERE id = ?', [id], (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

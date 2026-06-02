import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import chokidar from 'chokidar'
import sharp from 'sharp'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Register custom protocol privileges
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true } }
])

// Setup Paths
const userDataPath = app.getPath('userData')
const damDataDir = path.join(userDataPath, 'dam-data')
const thumbnailCacheDir = path.join(damDataDir, 'thumbnails')

// Ensure directories exist
if (!fs.existsSync(damDataDir)) fs.mkdirSync(damDataDir, { recursive: true })
if (!fs.existsSync(thumbnailCacheDir)) fs.mkdirSync(thumbnailCacheDir, { recursive: true })

// Database Initialization
const dbPath = path.join(damDataDir, 'dam.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS linked_directories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      absolute_path TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'idle'
  );
  
  CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      linked_dir_id INTEGER,
      relative_path TEXT NOT NULL,
      absolute_path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      extension TEXT NOT NULL,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_modified INTEGER,
      thumbnail_path TEXT,
      rating INTEGER DEFAULT 0,
      description TEXT,
      title TEXT,
      FOREIGN KEY(linked_dir_id) REFERENCES linked_directories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT
  );

  CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY(asset_id, tag_id),
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
  );

  -- Performance indexes for 10,000+ assets
  CREATE INDEX IF NOT EXISTS idx_assets_dir    ON assets(linked_dir_id);
  CREATE INDEX IF NOT EXISTS idx_assets_ext    ON assets(extension);
  CREATE INDEX IF NOT EXISTS idx_assets_rating ON assets(rating);
  CREATE INDEX IF NOT EXISTS idx_asset_tags    ON asset_tags(tag_id);
`)

// Check if absolute_path exists in assets table, if not drop and recreate tables to resolve schema constraints
try {
  db.prepare('SELECT absolute_path FROM assets LIMIT 1').all()
} catch (e) {
  db.exec(`
    DROP TABLE IF EXISTS asset_tags;
    DROP TABLE IF EXISTS tags;
    DROP TABLE IF EXISTS assets;
    DROP TABLE IF EXISTS linked_directories;
    
    CREATE TABLE linked_directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        absolute_path TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'idle'
    );
    
    CREATE TABLE assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linked_dir_id INTEGER,
        relative_path TEXT NOT NULL,
        absolute_path TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        extension TEXT NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_modified INTEGER,
        thumbnail_path TEXT,
        rating INTEGER DEFAULT 0,
        description TEXT,
        title TEXT,
        FOREIGN KEY(linked_dir_id) REFERENCES linked_directories(id) ON DELETE CASCADE
    );

    CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT
    );

    CREATE TABLE asset_tags (
        asset_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY(asset_id, tag_id),
        FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)
}

// Fallback migration block for incremental safety
const migrations = [
  { table: 'linked_directories', column: 'status', type: 'TEXT DEFAULT "idle"' },
  { table: 'linked_directories', column: 'alias', type: 'TEXT' },
  { table: 'assets', column: 'absolute_path', type: 'TEXT UNIQUE' },
  { table: 'assets', column: 'width', type: 'INTEGER' },
  { table: 'assets', column: 'height', type: 'INTEGER' },
  { table: 'assets', column: 'date_modified', type: 'INTEGER' },
  { table: 'assets', column: 'rating', type: 'INTEGER DEFAULT 0' },
  { table: 'assets', column: 'description', type: 'TEXT' },
  { table: 'assets', column: 'title', type: 'TEXT' },
  { table: 'assets', column: 'colors', type: 'TEXT' },
  { table: 'assets', column: 'source_url', type: 'TEXT' },
  { table: 'assets', column: 'favorited', type: 'INTEGER DEFAULT 0' },
]

for (const m of migrations) {
  try {
    db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`)
  } catch (e) {
    // Column already exists or error is thrown, safe to ignore
  }
}

// Ensure settings table and indexes exist (safe to run on every startup)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_assets_dir    ON assets(linked_dir_id);
    CREATE INDEX IF NOT EXISTS idx_assets_ext    ON assets(extension);
    CREATE INDEX IF NOT EXISTS idx_assets_rating ON assets(rating);
    CREATE INDEX IF NOT EXISTS idx_asset_tags    ON asset_tags(tag_id);
  `)
} catch (e) {
  // Indexes or table already exist — safe to ignore
}



let win: BrowserWindow | null = null
const watchers = new Map<number, any>()

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 850,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Register custom protocol handler to serve local assets securely
  protocol.handle('media', (request) => {
    const rawUrl = request.url.slice('media://'.length)
    const filePath = decodeURIComponent(rawUrl)
    return net.fetch('file://' + filePath)
  })

  createWindow()
  initializeWatchers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Supported extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv']
const VECTOR_EXTENSIONS = ['.eps', '.ai', '.pdf']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.opus']

// ── Color Palette Extraction ─────────────────────────────────────────────────
// Resizes to a small grid, reads raw RGB pixels, quantizes to 32-level buckets,
// and returns the top-5 most-frequent colors as hex strings.
async function extractColors(imagePath: string): Promise<string[]> {
  try {
    const { data } = await sharp(imagePath)
      .resize(80, 80, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const counts: Record<string, number> = {}
    for (let i = 0; i < data.length; i += 3) {
      // Quantize each channel to 6 bits (64 levels) to merge similar colors
      const r = Math.round(data[i]     / 4) * 4
      const g = Math.round(data[i + 1] / 4) * 4
      const b = Math.round(data[i + 2] / 4) * 4
      const key = `${r},${g},${b}`
      counts[key] = (counts[key] || 0) + 1
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key]) => {
        const [r, g, b] = key.split(',').map(Number)
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      })
  } catch {
    return []
  }
}

// Thumbnail Generation & Metadata Extraction
async function processAsset(absolutePath: string, linkedDirId: number, relativePath: string): Promise<boolean> {
  try {
    const ext = path.extname(absolutePath).toLowerCase()
    const isImage = IMAGE_EXTENSIONS.includes(ext)
    const isVideo = VIDEO_EXTENSIONS.includes(ext)
    const isVector = VECTOR_EXTENSIONS.includes(ext)
    const isAudio = AUDIO_EXTENSIONS.includes(ext)

    if (!isImage && !isVideo && !isVector && !isAudio) return false

    const stats = fs.statSync(absolutePath)
    const filename = path.basename(absolutePath)
    
    let thumbPath: string | null = null
    let width: number | null = null
    let height: number | null = null

    if (isImage) {
      // Generate unique ID/filename for thumbnail
      const thumbName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`
      thumbPath = path.join(thumbnailCacheDir, thumbName)

      if (ext !== '.svg') {
        const metadata = await sharp(absolutePath).metadata()
        width = metadata.width || null
        height = metadata.height || null

        // Generate optimized thumbnail
        await sharp(absolutePath)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbPath)
      } else {
        // SVG: we don't need a cached thumbnail, UI uses original media:// path
        thumbPath = null
      }
    } else if (isAudio) {
      // Audio: no thumbnail, just index metadata
    } else if (ext === '.eps') {
      // Use macOS QuickLook to generate EPS preview
      const thumbName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`
      thumbPath = path.join(thumbnailCacheDir, thumbName)
      try {
        // qlmanage generates a folder (or file) with the .png inside. By writing direct to a known png path it usually works.
        // If qlmanage produces a .png suffix (e.g. filename.eps.png), we'll handle it:
        const tmpDir = fs.mkdtempSync(path.join(app.getPath('temp'), 'beaver-ql-'))
        execSync(`qlmanage -t -s 600 -o "${tmpDir}" "${absolutePath}"`, { stdio: 'ignore' })
        // find the generated png inside tmpDir
        const files = fs.readdirSync(tmpDir)
        const pngFile = files.find(f => f.endsWith('.png'))
        if (pngFile) {
          fs.renameSync(path.join(tmpDir, pngFile), thumbPath)
        } else {
          thumbPath = null
        }
      } catch (e) {
        thumbPath = null
      }
    }

    // Extract dominant color palette for rasterized images
    let colors: string[] = []
    if (isImage && ext !== '.svg' && thumbPath) {
      colors = await extractColors(absolutePath)
    }
    const colorsJson = colors.length ? JSON.stringify(colors) : null

    const insertAsset = db.prepare(`
      INSERT INTO assets (linked_dir_id, relative_path, absolute_path, filename, extension, file_size, width, height, date_modified, thumbnail_path, colors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(absolute_path) DO UPDATE SET
        file_size = excluded.file_size,
        width = excluded.width,
        height = excluded.height,
        date_modified = excluded.date_modified,
        thumbnail_path = excluded.thumbnail_path,
        colors = excluded.colors
    `)
    insertAsset.run(linkedDirId, relativePath, absolutePath, filename, ext, stats.size, width, height, stats.mtimeMs, thumbPath, colorsJson)
    
    // Send event to UI about new/updated asset
    win?.webContents.send('asset-processed')
    return true
  } catch (err) {
    console.error(`Failed to process asset: ${absolutePath}`, err)
    return false
  }
}

// Background Folder Scanner
async function scanDirectory(linkedDirId: number, rootPath: string) {
  db.prepare('UPDATE linked_directories SET status = ? WHERE id = ?').run('scanning', linkedDirId)
  win?.webContents.send('directories-updated')

  const walk = async (dir: string) => {
    let files: string[] = []
    try {
      files = fs.readdirSync(dir)
    } catch (e) {
      return
    }

    for (const file of files) {
      const fullPath = path.join(dir, file)
      let stat
      try {
        stat = fs.statSync(fullPath)
      } catch (e) {
        continue
      }

      if (stat.isDirectory()) {
        // Skip common ignore dirs
        if (['node_modules', '.git', 'dist', 'build', '.DS_Store'].includes(file)) continue
        await walk(fullPath)
      } else {
        const relativePath = path.relative(rootPath, fullPath)
        await processAsset(fullPath, linkedDirId, relativePath)
      }
    }
  }

  await walk(rootPath)
  db.prepare('UPDATE linked_directories SET status = ? WHERE id = ?').run('idle', linkedDirId)
  win?.webContents.send('directories-updated')
}

// Start Chokidar watcher for real-time synchronization
function setupWatcher(dirId: number, dirPath: string) {
  if (watchers.has(dirId)) {
    watchers.get(dirId)?.close()
  }

  const watcher = chokidar.watch(dirPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  })

  watcher
    .on('add', async (filePath) => {
      const rel = path.relative(dirPath, filePath)
      await processAsset(filePath, dirId, rel)
    })
    .on('change', async (filePath) => {
      const rel = path.relative(dirPath, filePath)
      await processAsset(filePath, dirId, rel)
    })
    .on('unlink', (filePath) => {
      db.prepare('DELETE FROM assets WHERE absolute_path = ?').run(filePath)
      win?.webContents.send('asset-processed')
    })

  watchers.set(dirId, watcher)
}

function initializeWatchers() {
  const dirs = db.prepare('SELECT * FROM linked_directories').all() as any[]
  for (const dir of dirs) {
    if (fs.existsSync(dir.absolute_path)) {
      setupWatcher(dir.id, dir.absolute_path)
    }
  }
}

function pauseWatcher(dirId: number) {
  const watcher = watchers.get(dirId)
  if (watcher) {
    watcher.close()
    watchers.delete(dirId)
  }
}

function resumeWatcher(dirId: number) {
  const dir = db.prepare('SELECT * FROM linked_directories WHERE id = ?').get(dirId) as any
  if (dir && fs.existsSync(dir.absolute_path)) {
    setupWatcher(dir.id, dir.absolute_path)
  }
}


// IPC Handlers
ipcMain.handle('link-folder', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const targetPath = result.filePaths[0]
  try {
    const insertDir = db.prepare('INSERT INTO linked_directories (absolute_path) VALUES (?)')
    const runResult = insertDir.run(targetPath)
    const newId = runResult.lastInsertRowid as number

    setupWatcher(newId, targetPath)
    // Run scanner asynchronously
    scanDirectory(newId, targetPath)

    return { id: newId, absolute_path: targetPath }
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { error: 'Directory already linked' }
    }
    return { error: err.message }
  }
})

ipcMain.handle('get-directories', () => {
  const dirs = db.prepare('SELECT * FROM linked_directories').all() as any[]
  
  // Attach per-folder asset count and unique subdirectories
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM assets WHERE linked_dir_id = ?')
  const subDirsStmt = db.prepare('SELECT DISTINCT relative_path FROM assets WHERE linked_dir_id = ?')

  return dirs.map(dir => {
    // Extract unique folder paths from relative_path (excluding the file itself)
    const relativePaths = (subDirsStmt.all(dir.id) as { relative_path: string }[]).map(row => row.relative_path)
    const subdirectories = new Set<string>()
    for (const rp of relativePaths) {
      const dirname = path.dirname(rp)
      if (dirname && dirname !== '.') {
        // Add all parent paths as well
        const parts = dirname.split(path.sep)
        let current = ''
        for (const p of parts) {
          current = current ? `${current}${path.sep}${p}` : p
          subdirectories.add(current)
        }
      }
    }

    return {
      ...dir,
      asset_count: (countStmt.get(dir.id) as any)?.count ?? 0,
      subdirectories: Array.from(subdirectories).sort()
    }
  })
})

ipcMain.handle('create-directory', (_event, parentDirId: number, folderName: string) => {
  try {
    const parent = db.prepare('SELECT absolute_path FROM linked_directories WHERE id = ?').get(parentDirId) as any
    if (!parent) return false
    
    const newPath = path.join(parent.absolute_path, folderName)
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true })
      return true
    }
    return false
  } catch (e) {
    return false
  }
})

ipcMain.handle('remove-directory', (_event, id: number) => {
  watchers.get(id)?.close()
  watchers.delete(id)
  
  // Cascade delete assets
  const assets = db.prepare('SELECT thumbnail_path FROM assets WHERE linked_dir_id = ?').all(id) as any[]
  for (const asset of assets) {
    if (asset.thumbnail_path && fs.existsSync(asset.thumbnail_path)) {
      try { fs.unlinkSync(asset.thumbnail_path) } catch (e) {}
    }
  }

  db.prepare('DELETE FROM linked_directories WHERE id = ?').run(id)
  return true
})

// Set a display alias for a linked folder (doesn't rename the folder on disk)
ipcMain.handle('rename-directory', (_event, id: number, alias: string) => {
  db.prepare('UPDATE linked_directories SET alias = ? WHERE id = ?').run(alias.trim() || null, id)
  return true
})

ipcMain.handle('get-assets', (_event, filters: {
  dirId?: number; subPath?: string; tagId?: number; search?: string; rating?: number;
  untagged?: boolean; recentDays?: number; typeFilter?: string; favorited?: boolean;
}) => {
  let query = `
    SELECT a.*, GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids,
           ld.absolute_path as dir_path, ld.alias as dir_alias
    FROM assets a
    LEFT JOIN asset_tags at ON a.id = at.asset_id
    LEFT JOIN tags t ON at.tag_id = t.id
    LEFT JOIN linked_directories ld ON a.linked_dir_id = ld.id
    WHERE 1=1
  `
  const params: any[] = []

  if (filters.dirId) {
    query += ' AND a.linked_dir_id = ?'
    params.push(filters.dirId)
    
    // Exact sub-folder match or children matching
    if (filters.subPath) {
      // If we want exact match (files in THIS exact folder):
      // query += ' AND (a.relative_path LIKE ? AND a.relative_path NOT LIKE ?)'
      // But usually people want "this folder and all its contents". Let's do exact match as standard Dam:
      query += ` AND (a.relative_path LIKE ? OR a.relative_path = ?)`
      params.push(`${filters.subPath}${path.sep}%`, filters.subPath)
    }
  }

  if (filters.rating) {
    query += ' AND a.rating >= ?'
    params.push(filters.rating)
  }

  if (filters.search) {
    query += ' AND (a.filename LIKE ? OR a.title LIKE ? OR a.description LIKE ? OR a.source_url LIKE ?)'
    const s = `%${filters.search}%`
    params.push(s, s, s, s)
  }

  if (filters.favorited) {
    query += ' AND a.favorited = 1'
  }

  // Recently Added: assets indexed within the last N days
  if (filters.recentDays && typeof filters.recentDays === 'number') {
    const days = Math.floor(Math.abs(filters.recentDays))
    query += ` AND a.date_added >= datetime('now', '-${days} days')`
  }

  // Type filter: map group name to file extensions
  if (filters.typeFilter) {
    const typeMap: Record<string, string[]> = {
      image:  ['.png','.jpg','.jpeg','.webp','.gif','.heic','.avif'],
      video:  ['.mp4','.webm','.ogg','.mov','.mkv','.avi'],
      vector: ['.svg','.eps','.ai'],
      doc:    ['.pdf','.psd','.xd','.fig','.sketch'],
      font:   ['.ttf','.otf','.woff','.woff2'],
    }
    const exts = typeMap[filters.typeFilter]
    if (exts && exts.length > 0) {
      query += ` AND a.extension IN (${exts.map(() => '?').join(',')})`
      params.push(...exts)
    }
  }

  query += ' GROUP BY a.id'

  if (filters.tagId) {
    query += " HAVING INSTR(',' || tag_ids || ',', ',' || ? || ',') > 0"
    params.push(String(filters.tagId))
  } else if (filters.untagged) {
    query += ' HAVING tag_ids IS NULL'
  }

  query += ' ORDER BY a.date_added DESC'

  return db.prepare(query).all(...params)
})

ipcMain.handle('update-asset', (_event, id: number, updates: {
  title?: string; description?: string; rating?: number; source_url?: string; favorited?: number
}) => {
  const fields: string[] = []
  const params: any[] = []

  if (updates.title !== undefined)       { fields.push('title = ?');       params.push(updates.title) }
  if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description) }
  if (updates.rating !== undefined)      { fields.push('rating = ?');      params.push(updates.rating) }
  if (updates.source_url !== undefined)  { fields.push('source_url = ?'); params.push(updates.source_url) }
  if (updates.favorited !== undefined)   { fields.push('favorited = ?');  params.push(updates.favorited) }

  if (fields.length === 0) return false

  params.push(id)
  const stmt = db.prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`)
  stmt.run(...params)
  return true
})

// Tag IPCs
ipcMain.handle('create-tag', (_event, name: string, color?: string) => {
  try {
    const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
    const result = stmt.run(name, color || '#71717a')
    return { id: result.lastInsertRowid, name, color }
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return db.prepare('SELECT * FROM tags WHERE name = ?').get(name)
    }
    return { error: err.message }
  }
})

ipcMain.handle('get-tags', () => {
  return db.prepare('SELECT * FROM tags').all()
})

ipcMain.handle('assign-tag', (_event, assetId: number, tagId: number) => {
  try {
    db.prepare('INSERT INTO asset_tags (asset_id, tag_id) VALUES (?, ?)').run(assetId, tagId)
    return true
  } catch (e) {
    return false
  }
})

ipcMain.handle('remove-tag', (_event, assetId: number, tagId: number) => {
  db.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?').run(assetId, tagId)
  return true
})

ipcMain.handle('open-file', (_event, filePath: string) => {
  shell.openPath(filePath)
  return true
})

ipcMain.handle('open-url', (_event, url: string) => {
  shell.openExternal(url)
  return true
})

ipcMain.handle('reveal-file', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
  return true
})

// Settings IPC — key/value store for user preferences
ipcMain.handle('get-setting', (_event, key: string) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  return row ? row.value : null
})

ipcMain.handle('set-setting', (_event, key: string, value: string) => {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
  return true
})

ipcMain.handle('get-all-settings', () => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return result
})

// File Management IPCs
ipcMain.handle('delete-assets', async (_event, ids: number[]) => {
  if (!ids || ids.length === 0) return false
  
  const placeholders = ids.map(() => '?').join(',')
  const assets = db.prepare(`SELECT id, absolute_path, thumbnail_path FROM assets WHERE id IN (${placeholders})`).all(...ids) as any[]
  
  let deletedCount = 0
  for (const asset of assets) {
    try {
      // 1. Send to macOS Trash
      if (fs.existsSync(asset.absolute_path)) {
        await shell.trashItem(asset.absolute_path)
      }
      
      // 2. Delete cached thumbnail if it exists
      if (asset.thumbnail_path && fs.existsSync(asset.thumbnail_path)) {
        fs.unlinkSync(asset.thumbnail_path)
      }
      
      // 3. Remove from SQLite
      db.prepare('DELETE FROM assets WHERE id = ?').run(asset.id)
      deletedCount++
    } catch (e) {
      console.error('Failed to delete asset', asset.absolute_path, e)
    }
  }
  
  return deletedCount > 0
})

// Open a folder picker dialog and return the selected path (without linking it)
ipcMain.handle('pick-folder', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('duplicate-assets', async (_event, ids: number[]) => {
  if (!ids || ids.length === 0) return false
  const placeholders = ids.map(() => '?').join(',')
  const assets = db.prepare(`SELECT * FROM assets WHERE id IN (${placeholders})`).all(...ids) as any[]

  for (const asset of assets) {
    try {
      if (!fs.existsSync(asset.absolute_path)) continue
      const dir = path.dirname(asset.absolute_path)
      const base = path.basename(asset.filename, asset.extension)
      let newName = `${base}-copy${asset.extension}`
      let newPath = path.join(dir, newName)
      let counter = 2
      while (fs.existsSync(newPath)) {
        newName = `${base}-copy-${counter}${asset.extension}`
        newPath = path.join(dir, newName)
        counter++
      }
      fs.copyFileSync(asset.absolute_path, newPath)
      const relDir = path.dirname(asset.relative_path)
      const newRelPath = relDir === '.' ? newName : path.join(relDir, newName)
      await processAsset(newPath, asset.linked_dir_id, newRelPath)
    } catch (e) {
      console.error('Failed to duplicate asset', asset.absolute_path, e)
    }
  }
  return true
})

ipcMain.handle('move-assets', async (_event, ids: number[], targetDirPath: string) => {
  if (!ids || ids.length === 0 || !targetDirPath) return false
  if (!fs.existsSync(targetDirPath)) return false

  const placeholders = ids.map(() => '?').join(',')
  const assets = db.prepare(`SELECT * FROM assets WHERE id IN (${placeholders})`).all(...ids) as any[]
  const targetDir = db.prepare('SELECT * FROM linked_directories WHERE absolute_path = ?').get(targetDirPath) as any

  // Group by linked_dir_id and target to pause watchers during transaction
  const sourceDirIds = Array.from(new Set(assets.map(a => a.linked_dir_id)))
  const allDirIds = Array.from(new Set([...sourceDirIds, targetDir?.id].filter(Boolean)))
  for (const dirId of allDirIds) {
    pauseWatcher(dirId)
  }

  const updateStmt = db.prepare('UPDATE assets SET absolute_path = ?, relative_path = ?, linked_dir_id = ?, filename = ? WHERE id = ?')
  let movedCount = 0

  for (const asset of assets) {
    try {
      if (!fs.existsSync(asset.absolute_path)) continue
      const newAbsPath = path.join(targetDirPath, asset.filename)
      if (fs.existsSync(newAbsPath)) continue

      fs.renameSync(asset.absolute_path, newAbsPath)

      const newLinkedDirId = targetDir ? targetDir.id : asset.linked_dir_id
      const newRelPath = targetDir
        ? path.relative(targetDir.absolute_path, newAbsPath)
        : path.join(path.dirname(asset.relative_path), asset.filename)

      updateStmt.run(newAbsPath, newRelPath, newLinkedDirId, asset.filename, asset.id)
      movedCount++
    } catch (e) {
      console.error('Failed to move asset', asset.absolute_path, e)
    }
  }

  // Resume watchers
  for (const dirId of allDirIds) {
    resumeWatcher(dirId)
  }

  win?.webContents.send('asset-processed')
  return movedCount > 0
})

ipcMain.handle('save-processed-image', async (_event, originalPath: string, buffer: Uint8Array) => {
  const dir = path.dirname(originalPath)
  const ext = path.extname(originalPath)
  const base = path.basename(originalPath, ext)
  let newPath = path.join(dir, `${base}-nobg.png`)
  let i = 2
  while (fs.existsSync(newPath)) { newPath = path.join(dir, `${base}-nobg-${i}.png`); i++ }

  await fs.promises.writeFile(newPath, buffer)

  const original = db.prepare('SELECT linked_dir_id FROM assets WHERE absolute_path = ?').get(originalPath) as any
  if (original) {
    const linkedDir = db.prepare('SELECT absolute_path FROM linked_directories WHERE id = ?').get(original.linked_dir_id) as any
    if (linkedDir) {
      const relPath = path.relative(linkedDir.absolute_path, newPath)
      await processAsset(newPath, original.linked_dir_id, relPath)
    }
  }
  return newPath
})

ipcMain.handle('rename-assets', (_event, ids: number[], strategy: { type: 'prefix' | 'suffix' | 'replace', value: string }) => {
  if (!ids || ids.length === 0 || !strategy.value) return false

  const placeholders = ids.map(() => '?').join(',')
  const assets = db.prepare(`SELECT id, absolute_path, filename, extension, relative_path, linked_dir_id FROM assets WHERE id IN (${placeholders})`).all(...ids) as any[]

  // Pause watchers
  const dirIds = Array.from(new Set(assets.map(a => a.linked_dir_id)))
  for (const dirId of dirIds) {
    pauseWatcher(dirId)
  }

  let renamedCount = 0
  const updateStmt = db.prepare('UPDATE assets SET absolute_path = ?, filename = ?, relative_path = ? WHERE id = ?')

  let sequence = 1
  for (const asset of assets) {
    try {
      if (!fs.existsSync(asset.absolute_path)) continue

      const dir = path.dirname(asset.absolute_path)
      const baseNameWithoutExt = path.basename(asset.filename, asset.extension)
      
      let cleanValue = strategy.value.trim()
      const extLower = asset.extension.toLowerCase()
      if (cleanValue.toLowerCase().endsWith(extLower)) {
        cleanValue = cleanValue.slice(0, -extLower.length)
      }

      let newNameWithoutExt = baseNameWithoutExt
      if (strategy.type === 'prefix') {
        newNameWithoutExt = `${cleanValue}${baseNameWithoutExt}`
      } else if (strategy.type === 'suffix') {
        newNameWithoutExt = `${baseNameWithoutExt}${cleanValue}`
      } else if (strategy.type === 'replace') {
        newNameWithoutExt = ids.length > 1 ? `${cleanValue}-${sequence}` : cleanValue
      }

      const newFilename = `${newNameWithoutExt}${asset.extension}`
      const newAbsolutePath = path.join(dir, newFilename)
      const newRelativePath = path.join(path.dirname(asset.relative_path), newFilename)

      if (fs.existsSync(newAbsolutePath)) continue // skip if destination exists to avoid overwriting

      // Rename on disk
      fs.renameSync(asset.absolute_path, newAbsolutePath)

      // Update DB
      updateStmt.run(newAbsolutePath, newFilename, newRelativePath, asset.id)
      renamedCount++
      sequence++
    } catch (e) {
      console.error('Failed to rename asset', asset.absolute_path, e)
    }
  }

  // Resume watchers
  for (const dirId of dirIds) {
    resumeWatcher(dirId)
  }

  win?.webContents.send('asset-processed')
  return renamedCount > 0
})

ipcMain.handle('clear-thumbnail-cache', () => {
  try {
    const files = fs.readdirSync(thumbnailCacheDir)
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(thumbnailCacheDir, file))
      } catch (e) {}
    }
    db.prepare('UPDATE assets SET thumbnail_path = NULL').run()
    
    // Trigger async scan for all linked directories to rebuild cache
    const dirs = db.prepare('SELECT * FROM linked_directories').all() as any[]
    for (const dir of dirs) {
      scanDirectory(dir.id, dir.absolute_path)
    }
    return true
  } catch (err) {
    console.error('Failed to clear thumbnail cache', err)
    return false
  }
})

ipcMain.handle('optimize-database', () => {
  try {
    db.exec('VACUUM')
    return true
  } catch (err) {
    console.error('Failed to optimize database via vacuum', err)
    return false
  }
})

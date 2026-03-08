// 3-way merge for cloud sync
// All functions are pure — no side effects, no store access.

function toMap(arr) {
  const m = new Map()
  for (const item of arr) m.set(item.id, item)
  return m
}

function shallowEqual(a, b) {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const k of keysA) {
    if (a[k] !== b[k]) return false
  }
  return true
}

// --- 2.1 Diff a collection against a base ---
function diffCollection(baseArr, sideArr) {
  const baseMap = toMap(baseArr)
  const sideMap = toMap(sideArr)

  const added = new Map()
  const deleted = new Set()
  const modified = new Map()

  for (const [id, item] of sideMap) {
    if (!baseMap.has(id)) {
      added.set(id, item)
    } else if (!shallowEqual(baseMap.get(id), item)) {
      modified.set(id, item)
    }
  }
  for (const id of baseMap.keys()) {
    if (!sideMap.has(id)) deleted.add(id)
  }

  return { added, deleted, modified }
}

// --- 2.3 Merge a single entity modified on both sides ---
function mergeEntity(baseItem, localItem, remoteItem, preferRemote) {
  const merged = { ...baseItem }
  const allKeys = new Set([...Object.keys(localItem), ...Object.keys(remoteItem)])

  for (const key of allKeys) {
    const baseVal = baseItem[key]
    const localVal = localItem[key]
    const remoteVal = remoteItem[key]
    const localChanged = localVal !== baseVal
    const remoteChanged = remoteVal !== baseVal

    if (localChanged && !remoteChanged) {
      merged[key] = localVal
    } else if (!localChanged && remoteChanged) {
      merged[key] = remoteVal
    } else if (localChanged && remoteChanged) {
      // Both changed — LWW via preferRemote
      merged[key] = preferRemote ? remoteVal : localVal
    }
    // Neither changed → keep base value (already in merged)
  }

  return merged
}

// --- 2.2 Merge a collection ---
function mergeCollection(baseArr, localArr, remoteArr, preferRemote) {
  const localDiff = diffCollection(baseArr, localArr)
  const remoteDiff = diffCollection(baseArr, remoteArr)
  const baseMap = toMap(baseArr)
  const localMap = toMap(localArr)
  const remoteMap = toMap(remoteArr)

  const result = new Map()

  // Start with all base items (will be overwritten/removed as needed)
  for (const [id, item] of baseMap) {
    const deletedLocal = localDiff.deleted.has(id)
    const deletedRemote = remoteDiff.deleted.has(id)
    const modifiedLocal = localDiff.modified.has(id)
    const modifiedRemote = remoteDiff.modified.has(id)

    if (deletedLocal && deletedRemote) {
      // Deleted both sides → remove
      continue
    }
    if (deletedLocal && !modifiedRemote) {
      // Deleted locally, not modified remotely → remove
      continue
    }
    if (deletedRemote && !modifiedLocal) {
      // Deleted remotely, not modified locally → remove
      continue
    }
    if (deletedLocal && modifiedRemote) {
      // Deleted locally but modified remotely → keep remote version
      result.set(id, remoteMap.get(id))
      continue
    }
    if (deletedRemote && modifiedLocal) {
      // Deleted remotely but modified locally → keep local version
      result.set(id, localMap.get(id))
      continue
    }
    if (modifiedLocal && modifiedRemote) {
      // Modified both sides → field-level merge
      result.set(id, mergeEntity(item, localMap.get(id), remoteMap.get(id), preferRemote))
      continue
    }
    if (modifiedLocal) {
      result.set(id, localMap.get(id))
      continue
    }
    if (modifiedRemote) {
      result.set(id, remoteMap.get(id))
      continue
    }
    // Unchanged
    result.set(id, item)
  }

  // Add items added on local side
  for (const [id, item] of localDiff.added) {
    result.set(id, item)
  }

  // Add items added on remote side
  for (const [id, item] of remoteDiff.added) {
    // If same id was added on both sides (UUID collision — extremely unlikely)
    if (!result.has(id)) {
      result.set(id, item)
    }
  }

  return [...result.values()]
}

// --- 2.4 Merge scalars ---
const SCALAR_KEYS = ['activeTabId', 'theme', 'language', 'showArchive']

function mergeScalars(base, local, remote, preferRemote) {
  const merged = {}
  for (const key of SCALAR_KEYS) {
    const baseVal = base[key]
    const localVal = local[key]
    const remoteVal = remote[key]
    const localChanged = localVal !== baseVal
    const remoteChanged = remoteVal !== baseVal

    if (localChanged && !remoteChanged) {
      merged[key] = localVal
    } else if (!localChanged && remoteChanged) {
      merged[key] = remoteVal
    } else if (localChanged && remoteChanged) {
      merged[key] = preferRemote ? remoteVal : localVal
    } else {
      merged[key] = baseVal
    }
  }
  return merged
}

// --- 2.5 Post-merge cleanup ---

function cleanupOrphans(data) {
  const tabIds = new Set(data.tabs.map((t) => t.id))
  const columns = data.columns.filter((c) => tabIds.has(c.tabId))
  const colIds = new Set(columns.map((c) => c.id))
  const tasks = data.tasks.filter((t) => colIds.has(t.columnId))
  return { ...data, columns, tasks }
}

function recompactOrders(data) {
  // Tabs: sort by order, tie-break by id
  const tabs = [...data.tabs].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const reorderedTabs = tabs.map((t, i) => ({ ...t, order: i }))

  // Recompact pinnedOrder separately
  const pinned = reorderedTabs
    .filter((t) => t.pinnedOrder != null)
    .sort((a, b) => a.pinnedOrder - b.pinnedOrder || a.id.localeCompare(b.id))
  const pinnedMap = new Map(pinned.map((t, i) => [t.id, i]))
  const finalTabs = reorderedTabs.map((t) => ({
    ...t,
    pinnedOrder: pinnedMap.has(t.id) ? pinnedMap.get(t.id) : null,
  }))

  // Columns: group by tabId, sort by order, tie-break by id
  const colsByTab = new Map()
  for (const col of data.columns) {
    const arr = colsByTab.get(col.tabId) || []
    arr.push(col)
    colsByTab.set(col.tabId, arr)
  }
  const finalColumns = []
  for (const [, cols] of colsByTab) {
    cols.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    for (let i = 0; i < cols.length; i++) {
      finalColumns.push({ ...cols[i], order: i })
    }
  }

  // Tasks: group by columnId, sort by order, tie-break by createdAt then id
  const tasksByCol = new Map()
  for (const task of data.tasks) {
    const arr = tasksByCol.get(task.columnId) || []
    arr.push(task)
    tasksByCol.set(task.columnId, arr)
  }
  const finalTasks = []
  for (const [, tasks] of tasksByCol) {
    tasks.sort((a, b) => a.order - b.order || (a.createdAt || 0) - (b.createdAt || 0) || a.id.localeCompare(b.id))
    for (let i = 0; i < tasks.length; i++) {
      finalTasks.push({ ...tasks[i], order: i })
    }
  }

  return { ...data, tabs: finalTabs, columns: finalColumns, tasks: finalTasks }
}

function validateActiveTabId(data) {
  if (data.tabs.length === 0) return data
  const tabIds = new Set(data.tabs.map((t) => t.id))
  if (tabIds.has(data.activeTabId)) return data
  // Fallback to first tab by order
  const first = [...data.tabs].sort((a, b) => a.order - b.order)[0]
  return { ...data, activeTabId: first.id }
}

// --- 2.6 Main merge function ---

const EMPTY_BASE = {
  tabs: [],
  columns: [],
  tasks: [],
  activeTabId: null,
  theme: 'light',
  language: 'en',
  showArchive: false,
}

export function threeWayMerge(base, local, remote, preferRemote = false) {
  const b = base || EMPTY_BASE

  const tabs = mergeCollection(b.tabs, local.tabs, remote.tabs, preferRemote)
  const columns = mergeCollection(b.columns, local.columns, remote.columns, preferRemote)
  const tasks = mergeCollection(b.tasks, local.tasks, remote.tasks, preferRemote)
  const scalars = mergeScalars(b, local, remote, preferRemote)

  let merged = { tabs, columns, tasks, ...scalars }
  merged = cleanupOrphans(merged)
  merged = recompactOrders(merged)
  merged = validateActiveTabId(merged)

  return merged
}

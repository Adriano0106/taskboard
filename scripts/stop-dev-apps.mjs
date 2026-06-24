import { execFileSync } from 'node:child_process'

const developmentPorts = [3333, 5173, 5174, 5175, 5176, 5177]
const commandPatterns = [
  'scripts/dev-apps.mjs',
  '@taskboard/api',
  '@taskboard/web',
  'tsx watch src/server.ts',
  'vite --host',
]

if (process.platform !== 'win32') {
  console.log('dev:stop currently supports Windows only.')
  process.exit(0)
}

const processIds = new Set([
  ...findProcessIdsByCommandPatterns(commandPatterns),
  ...findProcessIdsByPorts(developmentPorts),
])
const protectedProcessIds = new Set([process.pid, ...findParentProcessIds(process.pid)])

const stoppableProcessIds = [...processIds].filter(
  (processId) => !protectedProcessIds.has(processId),
)

if (stoppableProcessIds.length === 0) {
  console.log('No TaskBoard dev processes found.')
  process.exit(0)
}

for (const processId of stoppableProcessIds) {
  try {
    execFileSync('taskkill', ['/pid', String(processId), '/T', '/F'], {
      stdio: 'ignore',
    })
    console.log(`Stopped process tree ${processId}.`)
  } catch {
    // The process may already have been stopped as part of another tree.
  }
}

console.log('TaskBoard dev cleanup finished.')

function findProcessIdsByCommandPatterns(patterns) {
  const query = [
    'Get-CimInstance Win32_Process',
    '| Where-Object {',
    patterns
      .map((pattern) => `$_.CommandLine -like '*${escapePowerShellPattern(pattern)}*'`)
      .join(' -or '),
    '}',
    '| Select-Object -ExpandProperty ProcessId',
  ].join(' ')

  return runPowerShellProcessIdQuery(query)
}

function findProcessIdsByPorts(ports) {
  const joinedPorts = ports.join(',')
  const query = [
    `Get-NetTCPConnection -LocalPort ${joinedPorts} -ErrorAction SilentlyContinue`,
    "| Where-Object { $_.State -eq 'Listen' }",
    '| Select-Object -ExpandProperty OwningProcess',
    '| Sort-Object -Unique',
  ].join(' ')

  return runPowerShellProcessIdQuery(query)
}

function runPowerShellProcessIdQuery(query) {
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command', query], {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((processId) => Number.isInteger(processId) && processId > 0)
  } catch {
    return []
  }
}

function escapePowerShellPattern(pattern) {
  return pattern.replaceAll("'", "''")
}

function findParentProcessIds(processId) {
  const parentProcessIds = []
  let currentProcessId = processId

  while (currentProcessId) {
    const parentProcessId = findParentProcessId(currentProcessId)

    if (!parentProcessId || parentProcessIds.includes(parentProcessId)) {
      break
    }

    parentProcessIds.push(parentProcessId)
    currentProcessId = parentProcessId
  }

  return parentProcessIds
}

function findParentProcessId(processId) {
  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${processId}").ParentProcessId`,
      ],
      {
        encoding: 'utf8',
      },
    ).trim()

    const parentProcessId = Number(output)

    return Number.isInteger(parentProcessId) && parentProcessId > 0 ? parentProcessId : null
  } catch {
    return null
  }
}

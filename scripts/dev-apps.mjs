import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const rootDirectory = resolve(currentDirectory, '..')
const environment = {
  ...process.env,
  ...readEnvironmentFile('.env.example'),
  ...readEnvironmentFile('.env'),
}
let isShuttingDown = false

const applications = [
  {
    name: 'api',
    command: 'npm',
    args: ['run', 'dev', '--workspace', '@taskboard/api'],
  },
  {
    name: 'web',
    command: 'npm',
    args: ['run', 'dev', '--workspace', '@taskboard/web'],
  },
]

const runningApplications = applications.map((application) => {
  const childProcess = spawn(application.command, application.args, {
    cwd: rootDirectory,
    env: environment,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  childProcess.stdout.on('data', (chunk) => {
    process.stdout.write(prefixLines(application.name, chunk))
  })

  childProcess.stderr.on('data', (chunk) => {
    process.stderr.write(prefixLines(application.name, chunk))
  })

  childProcess.on('exit', (code) => {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    stopApplications()
    process.exit(code ?? 1)
  })

  return childProcess
})

process.on('SIGINT', () => {
  isShuttingDown = true
  stopApplications()
})

process.on('SIGTERM', () => {
  isShuttingDown = true
  stopApplications()
})

function readEnvironmentFile(fileName) {
  const filePath = resolve(rootDirectory, fileName)

  if (!existsSync(filePath)) {
    return {}
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((environmentValues, line) => {
      const trimmedLine = line.trim()

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return environmentValues
      }

      const separatorPosition = trimmedLine.indexOf('=')

      if (separatorPosition === -1) {
        return environmentValues
      }

      const key = trimmedLine.slice(0, separatorPosition).trim()
      const value = trimmedLine.slice(separatorPosition + 1).trim()

      environmentValues[key] = removeWrappingQuotes(value)

      return environmentValues
    }, {})
}

function removeWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function prefixLines(applicationName, chunk) {
  return chunk
    .toString()
    .split(/\r?\n/)
    .map((line) => (line ? `[${applicationName}] ${line}` : line))
    .join('\n')
}

function stopApplications() {
  for (const runningApplication of runningApplications) {
    if (runningApplication.killed) {
      continue
    }

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(runningApplication.pid), '/T', '/F'], {
        stdio: 'ignore',
        shell: true,
      })
    } else {
      runningApplication.kill('SIGTERM')
    }
  }
}

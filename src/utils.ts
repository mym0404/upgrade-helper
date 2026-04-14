import semver from 'semver/preload'
import {
  RN_DIFF_REPOSITORIES,
  DEFAULT_APP_NAME,
  DEFAULT_APP_PACKAGE,
  PACKAGE_NAMES,
  RN_CHANGELOG_URLS,
} from './constants'
import versions from './releases'

const getRNDiffRepository = ({ packageName }: { packageName: string }) =>
  RN_DIFF_REPOSITORIES[packageName]

export const getReleasesFileURL = ({ packageName }: { packageName: string }) =>
  `https://raw.githubusercontent.com/${getRNDiffRepository({
    packageName,
  })}/master/${packageName === PACKAGE_NAMES.RNM ? 'RELEASES_MAC' : 'RELEASES'}`

export const getDiffURL = ({
  packageName,
  language,
  fromVersion,
  toVersion,
}: {
  packageName: string
  language: string
  fromVersion: string
  toVersion: string
}) => {
  const languageDir =
    packageName === PACKAGE_NAMES.RNM
      ? 'mac/'
      : packageName === PACKAGE_NAMES.RNW
      ? `${language}/`
      : ''

  return `https://raw.githubusercontent.com/${getRNDiffRepository({
    packageName,
  })}/diffs/diffs/${languageDir}${fromVersion}..${toVersion}.diff`
}

const getBranch = ({
  packageName,
  language,
  version,
}: {
  packageName: string
  language?: string
  version: string
}) =>
  packageName === PACKAGE_NAMES.RNM
    ? `mac/${version}`
    : packageName === PACKAGE_NAMES.RNW
    ? `${language}/${version}`
    : version

interface GetBinaryFileURLProps {
  packageName: string
  language?: string
  version: string
  path: string
}
// `path` must contain `RnDiffApp` prefix
export const getBinaryFileURL = ({
  packageName,
  language,
  version,
  path,
}: GetBinaryFileURLProps) => {
  const branch = getBranch({ packageName, language, version })

  return `https://raw.githubusercontent.com/${getRNDiffRepository({
    packageName,
  })}/release/${branch}/${path}`
}

export const removeAppPathPrefix = (path: string, appName = DEFAULT_APP_NAME) =>
  path.replace(new RegExp(`${appName}/`), '')

/**
 * Replaces DEFAULT_APP_PACKAGE and DEFAULT_APP_NAME in str with custom
 * values if provided.
 * str could be a path, or content from a text file.
 */
export const replaceAppDetails = (
  str: string,
  appName?: string,
  appPackage?: string
) => {
  const appNameOrFallback = appName || DEFAULT_APP_NAME
  const appPackageOrFallback =
    appPackage || `com.${appNameOrFallback.toLowerCase()}`

  return str
    .replaceAll(DEFAULT_APP_PACKAGE, appPackageOrFallback)
    .replaceAll(
      DEFAULT_APP_PACKAGE.replaceAll('.', '/'),
      appPackageOrFallback.replaceAll('.', '/')
    )
    .replaceAll(DEFAULT_APP_NAME, appNameOrFallback)
    .replaceAll(DEFAULT_APP_NAME.toLowerCase(), appNameOrFallback.toLowerCase())
}

export const getVersionsContentInDiff = ({
  packageName,
  fromVersion,
  toVersion,
}: {
  packageName: string
  fromVersion: string
  toVersion: string
}) => {
  if (!versions[packageName]) {
    return []
  }

  const cleanedToVersion = semver.valid(semver.coerce(toVersion))
  if (!cleanedToVersion) {
    return []
  }

  return versions[packageName].filter(({ version }) => {
    const cleanedVersion = semver.coerce(version)
    if (!cleanedVersion) {
      return false
    }

    // `cleanedVersion` can't be newer than `cleanedToVersion` nor older (or equal) than `fromVersion`
    return (
      semver.compare(cleanedToVersion, cleanedVersion) !== -1 &&
      ![0, -1].includes(semver.compare(cleanedVersion, fromVersion))
    )
  })
}

export const getChangelogURL = ({
  version,
  packageName,
}: {
  version: string
  packageName: string
}) => {
  if (packageName === PACKAGE_NAMES.RNW || packageName === PACKAGE_NAMES.RNM) {
    return `${RN_CHANGELOG_URLS[packageName]}v${version}`
  }

  return `${RN_CHANGELOG_URLS[packageName]}#v${version.replaceAll('.', '')}`
}

// If the browser is headless (running puppeteer) then it doesn't have any duration
export const getTransitionDuration = (duration: number) =>
  navigator.webdriver ? 0 : duration

// settings constants
export const SHOW_LATEST_RCS = 'Show latest release candidates'

/**
 * Returns the file paths to display for each side of the diff. Takes into account
 * custom app name and package, and truncates the leading app name to provide
 * paths relative to the project directory.
 */
export const getFilePathsToShow = ({
  oldPath,
  newPath,
  appName,
  appPackage,
}: {
  oldPath: string
  newPath: string
  appName?: string
  appPackage?: string
}) => {
  const oldPathSanitized = replaceAppDetails(oldPath, appName, appPackage)
  const newPathSanitized = replaceAppDetails(newPath, appName, appPackage)

  return {
    oldPath: removeAppPathPrefix(oldPathSanitized, appName),
    newPath: removeAppPathPrefix(newPathSanitized, appName),
  }
}

const getDiffBlocks = (rawDiffText: string) =>
  rawDiffText.split(/(?=^diff --git )/m).filter(Boolean)

const isBinaryDiffBlock = (diffBlock: string) =>
  diffBlock.includes('\nGIT binary patch\n') ||
  /^Binary files .* differ$/m.test(diffBlock)

const getDiffPathsFromBlock = (diffBlock: string) => {
  const match = diffBlock.match(/^diff --git a\/(.+?) b\/(.+)$/m)

  if (!match) {
    return null
  }

  return {
    oldPath: match[1],
    newPath: match[2],
  }
}

export const buildAiUpgradePrompt = ({
  packageName,
  language,
  fromVersion,
  toVersion,
  rawDiffText,
  appName,
  appPackage,
}: {
  packageName: string
  language: string
  fromVersion: string
  toVersion: string
  rawDiffText: string
  appName?: string
  appPackage?: string
}) => {
  const effectiveAppName = appName || DEFAULT_APP_NAME
  const effectiveAppPackage =
    appPackage || `com.${effectiveAppName.toLowerCase()}`
  const binaryFiles: { localPath: string; downloadCommand: string }[] = []
  const textDiffBlocks = getDiffBlocks(rawDiffText).filter((diffBlock) => {
    if (!isBinaryDiffBlock(diffBlock)) {
      return true
    }

    const diffPaths = getDiffPathsFromBlock(diffBlock)

    if (!diffPaths) {
      return false
    }

    const binaryPath =
      diffPaths.newPath === '/dev/null' ? diffPaths.oldPath : diffPaths.newPath

    if (binaryPath === '/dev/null') {
      return false
    }

    const localPaths = getFilePathsToShow({
      oldPath: diffPaths.oldPath,
      newPath: diffPaths.newPath,
      appName,
      appPackage,
    })
    const localPath =
      diffPaths.newPath === '/dev/null'
        ? localPaths.oldPath
        : localPaths.newPath
    const downloadURL = getBinaryFileURL({
      packageName,
      language,
      version: toVersion,
      path: binaryPath,
    })

    binaryFiles.push({
      localPath,
      downloadCommand: `curl -L "${downloadURL}" -o "${localPath}"`,
    })

    return false
  })
  const customizedDiff = replaceAppDetails(
    textDiffBlocks.join(''),
    appName,
    appPackage
  )
  const binaryInstructions =
    binaryFiles.length > 0
      ? [
          '',
          '## Binary file handling',
          '- Binary patch payloads are intentionally omitted from the diff below because they are too large and should not be applied from inline patch text.',
          '- Download the actual binary file to the target project path and replace it directly if that file is relevant to your app.',
          ...binaryFiles.flatMap(({ localPath, downloadCommand }) => [
            `### \`${localPath}\``,
            '```bash',
            downloadCommand,
            '```',
          ]),
        ]
      : []

  return [
    '# React Native upgrade guidance request',
    '',
    'You are helping upgrade a React Native app using the provided template diff.',
    '',
    '## Task overview',
    `- From version: ${fromVersion}`,
    `- To version: ${toVersion}`,
    `- App name input or fallback: ${effectiveAppName}`,
    `- App package input or fallback: ${effectiveAppPackage}`,
    '',
    '## Important notes',
    '- Use the full git diff below as the source of truth for template changes.',
    '- This diff only represents the React Native bootstrap/template project between versions. First understand the current project structure and apply only the changes that are relevant to this codebase.',
    '- Preserve project-specific code and merge carefully instead of blindly overwriting files.',
    '- Review binary file changes separately if any are present.',
    '- The app name and app package values may be inaccurate because the user may have left them unchanged, blank, or approximate. Verify them against the real project before applying changes.',
    ...binaryInstructions,
    '',
    '## Full git diff (binary patches omitted)',
    '',
    '```diff',
    customizedDiff.trimEnd(),
    '```',
  ]
    .filter(Boolean)
    .join('\n')
}

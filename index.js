'format cjs';

var engine = require('./engine');
var configLoader = require('commitizen').configLoader;
var defaultCommitTypes = {
  feat: {
    value: 'feat',
    description: 'A new feature',
    title: 'Feature',
    emoji: '✨',
  },
  fix: {
    value: 'fix',
    description: 'A bug fix',
    title: 'Bug Fix',
    emoji: '🐛',
  },
  docs: {
    value: 'docs',
    description: 'Documentation only changes',
    title: 'Documentation',
    emoji: '📚',
  },
  style: {
    value: 'style',
    description:
    'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
    title: 'Code Style',
    emoji: '💎',
  },
  refactor: {
    value: 'refactor',
    description: 'A code change that neither fixes a bug nor adds a feature',
    title: 'Code Refactoring',
    emoji: '📦',
  },
  perf: {
    value: 'perf',
    description: 'A code change that improves performance',
    title: 'Performance Improvement',
    emoji: '🚀',
  },
  test: {
    value: 'test',
    description: 'Adding missing tests or correcting existing tests',
    title: 'Tests',
    emoji: '🚨',
  },
  build: {
    value: 'build',
    description:
    'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
    title: 'Build',
    emoji: '🛠',
  },
  ci: {
    value: 'ci',
    description:
    'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
    title: 'Continuous Integration',
    emoji: '⚙️',
  },
  chore: {
    value: 'chore',
    description: "Other changes that don't modify src or test files",
    title: 'Chore',
    emoji: '♻️',
  },
  revert: {
    value: 'revert',
    description: 'Reverts a previous commit',
    title: 'Revert',
    emoji: '🗑',
  },
  WIP: {
    value: 'WIP',
    description: 'An incomplete work-in-progress',
    title: 'WIP',
    emoji: '🚧',
  },
  initial: {
    value: 'feat',
    description: 'Initial commit',
    title: 'Initial',
    emoji: '🎉',
  },
  dependencies: {
    value: 'fix',
    description: 'Update dependencies',
    title: 'Dependencies',
    emoji: '⏫',
  },
  peerDependencies: {
    value: 'fix',
    description: 'Update peer dependencies',
    title: 'Peer dependencies',
    emoji: '⬆️',
  },
  devDependencies: {
    value: 'chore',
    description: 'Update development dependencies',
    title: 'Dev dependencies',
    emoji: '🔼',
  },
  metadata: {
    value: 'chore',
    description: 'Update metadata (package.json)',
    title: 'Metadata',
    emoji: '📦',
  },
};

var config = configLoader.load() || {};
var options = {
  types: config.types || defaultCommitTypes,
  defaultType: process.env.CZ_TYPE || config.defaultType,
  defaultScope: process.env.CZ_SCOPE || config.defaultScope,
  defaultSubject: process.env.CZ_SUBJECT || config.defaultSubject,
  defaultBody: process.env.CZ_BODY || config.defaultBody,
  defaultIssues: process.env.CZ_ISSUES || config.defaultIssues,
  disableScopeLowerCase:
    process.env.DISABLE_SCOPE_LOWERCASE || config.disableScopeLowerCase,
  disableSubjectLowerCase:
    process.env.DISABLE_SUBJECT_LOWERCASE || config.disableSubjectLowerCase,
  maxHeaderWidth:
    (process.env.CZ_MAX_HEADER_WIDTH &&
      parseInt(process.env.CZ_MAX_HEADER_WIDTH)) ||
    config.maxHeaderWidth ||
    100,
  maxLineWidth:
    (process.env.CZ_MAX_LINE_WIDTH &&
      parseInt(process.env.CZ_MAX_LINE_WIDTH)) ||
    config.maxLineWidth ||
    100
};

(function(options) {
  try {
    var commitlintLoad = require('@commitlint/load');
    commitlintLoad().then(function(clConfig) {
      if (clConfig.rules) {
        var maxHeaderLengthRule = clConfig.rules['header-max-length'];
        if (
          typeof maxHeaderLengthRule === 'object' &&
          maxHeaderLengthRule.length >= 3 &&
          !process.env.CZ_MAX_HEADER_WIDTH &&
          !config.maxHeaderWidth
        ) {
          options.maxHeaderWidth = maxHeaderLengthRule[2];
        }
      }
    });
  } catch (err) {}
})(options);

module.exports = engine(options);

'format cjs';

var path = require('path');
var { execSync, } = require('child_process');
var wrap = require('word-wrap');
var map = require('lodash.map');
var chalk = require('chalk');
var autocompletePropmpt = require('inquirer-autocomplete-prompt');

const doubleWidthEmojis = [
  'build',
  'ci',
  'chore',
  'revert',
  'peerDependencies',
];

const changedFiles = execSync(
  'git diff --cached --name-only',
  { encoding: 'utf8', stdio: 'pipe', }
).split('\n').map(path.normalize);

const packagesInfo = JSON.parse(execSync(
  'lerna list --json',
  { encoding: 'utf8', stdio: 'pipe', }
));

const changedPkgs = packagesInfo
  .filter(({ location, }) => {
    const pkgPrefix = path.relative('.', location) + path.sep;
    for (const changedFile of changedFiles) {
      if (changedFile.indexOf(pkgPrefix) === 0) return true;
    }
    return false;
  })
  .map(pkg => pkg.name);


const allPackages =  packagesInfo.map(pkg => ({
  name: pkg.name,
  checked: changedPkgs.includes(pkg.name),
}));

var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

var headerLength = function(answers) {
  return (
    answers.type.length + 2 + (answers.scope ? answers.scope.length + 2 : 0)
  );
};

var maxSummaryLength = function(options, answers) {
  return options.maxHeaderWidth - headerLength(answers);
};

var filterSubject = function(subject, disableSubjectLowerCase) {
  subject = subject.trim();
  if (!disableSubjectLowerCase && subject.charAt(0).toLowerCase() !== subject.charAt(0)) {
    subject =
      subject.charAt(0).toLowerCase() + subject.slice(1, subject.length);
  }
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function(options) {
  var types = options.types;
  var choices = map(types, function(type, key) {
    return {
      name: (`${type.emoji}${doubleWidthEmojis.includes(key) ? '  ' : ' '}${type.title}: ${type.description}`),
      value: type.value,
    };
  });

  function searchTypes(answers, input) {
    input = input ?? '';
    return new Promise(resolve => {
      const results = choices
        .filter(choice => {
          if (!input) return true;
          return choice.value.toLowerCase().includes(input.toLowerCase());
        })
        // Put results that start with input before ones that include it
        .sort((a, b) => {
          const aWeight = a.value.startsWith(input) ? 0 : 1;
          const bWeight = b.value.startsWith(input) ? 0 : 1;
          return aWeight - bWeight;
        });
      resolve(results);
    });
  }


  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
      // template and will keep empty lines.
      prompter: function(cz, commit) {
      cz.registerPrompt('autocomplete', autocompletePropmpt);

      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        // TODO: Convert this to autocomplete
        {
          type: 'autocomplete',
          name: 'type',
          message: "Select the type of change that you're committing:",
          // choices: choices,
          // default: options.defaultType
          source: searchTypes,
        },
        {
          type: 'input',
          name: 'scope',
          message:
            'What is the scope of this change (e.g. component or file name): (press enter to skip)',
          default: options.defaultScope,
          filter: function(value) {
            return options.disableScopeLowerCase
              ? value.trim()
              : value.trim().toLowerCase();
          }
        },
        {
          type: 'input',
          name: 'subject',
          message: function(answers) {
            return (
              'Write a short, imperative tense description of the change (max ' +
              maxSummaryLength(options, answers) +
              ' chars):\n'
            );
          },
          default: options.defaultSubject,
          validate: function(subject, answers) {
            var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase);
            return filteredSubject.length == 0
              ? 'subject is required'
              : filteredSubject.length <= maxSummaryLength(options, answers)
              ? true
              : 'Subject length must be less than or equal to ' +
                maxSummaryLength(options, answers) +
                ' characters. Current length is ' +
                filteredSubject.length +
                ' characters.';
          },
          transformer: function(subject, answers) {
            var filteredSubject = filterSubject(subject, options.disableSubjectLowerCase);
            var color =
              filteredSubject.length <= maxSummaryLength(options, answers)
                ? chalk.green
                : chalk.red;

            var remainingAllowedChars = maxSummaryLength(options, answers) - filteredSubject.length;
            return color('(' + remainingAllowedChars + '/' +
              maxSummaryLength(options, answers) + ') ' + subject);
          },
          filter: function(subject) {
            return filterSubject(subject, options.disableSubjectLowerCase);
          }
        },
        {
          type: 'input',
          name: 'body',
          message:
            'Provide a longer description of the change. Insert line breaks with "|||"\n(press enter to skip)\n',
          default: options.defaultBody
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false
        },
        {
          type: 'input',
          name: 'breakingBody',
          default: '-',
          message:
            'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:\n',
          when: function(answers) {
            return answers.isBreaking && !answers.body;
          },
          validate: function(breakingBody, answers) {
            return (
              breakingBody.trim().length > 0 ||
              'Body is required for BREAKING CHANGE'
            );
          }
        },
        {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: function(answers) {
            return answers.isBreaking;
          }
        },
        {
          type: 'confirm',
          name: 'isIssueAffected',
          message: 'Does this change closes any open issues?',
          default: options.defaultIssues ? true : false
        },
        // {
        //   type: 'input',
        //   name: 'issuesBody',
        //   default: '-',
        //   message:
        //     'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself:\n',
        //   when: function(answers) {
        //     return (
        //       answers.isIssueAffected && !answers.body && !answers.breakingBody
        //     );
        //   }
        // },
        {
          type: 'input',
          name: 'issues',
          message: 'Add issue references (e.g. "#123"):\n',
          when: function(answers) {
            return answers.isIssueAffected;
          },
          default: options.defaultIssues ? options.defaultIssues : undefined
        },
        {
          type: 'checkbox',
          name: 'affected',
          choices: allPackages,
          messages:  `The packages that this commit has affected (${changedPkgs.length} detected)\n`
        },
        {
          type: 'input',
          name: 'clickup',
          message: 'Add related clickup tasks (e.g. Cu 5kvw54)',
          // TODO: Try and get related task from branch name
          // default: getTaskFromBranchName(),
        },
      ]).then(function(answers) {
        var wrapOptions = {
          trim: true,
          cut: false,
          newline: '\n',
          indent: '',
          width: options.maxLineWidth
        };

        // parentheses are only needed when a scope is present
        var scope = answers.scope ? '(' + answers.scope + ')' : '';

        // Hard limit this line in the validate
        var head = answers.type + scope + ': ' + answers.subject;

        // Wrap these lines at options.maxLineWidth characters
        var body = answers.body ? wrap(answers.body.split('|||').join('\n'), wrapOptions) : false;

        var affected = answers.affected && answers.affected.length
          ? wrap('Affected packages: ' + answers.affected.join(', '), wrapOptions)
          : false;

        // Apply breaking change prefix, removing it if already present
        var breaking = answers.breaking ? answers.breaking.trim() : '';
        breaking = breaking
          ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '')
          : '';
        breaking = breaking ? wrap(breaking, wrapOptions) : false;

        var issues = answers.issues
          ? wrap(
            answers.issues
              .split(',')
              .map(issue => {
                issue.trim();
                return `Closes ${issue.startsWith('#') ? '' : '#'}${issue}`;
              })
              .join(', '),
            wrapOptions
          )
          : false;
        var clickup = answers.clickup
          ? wrap('Related clickup tasks: ' + answers.clickup, wrapOptions)
          : false;

        var footer = false;
        if (clickup || issues) {
          const store = [];
          if (issues) store.push(issues);
          if (clickup) store.push(clickup);
          footer = store.join('\n');
        }

        commit(filter([head, body, breaking, affected, footer]).join('\n\n'));
      });
    }
  };
};

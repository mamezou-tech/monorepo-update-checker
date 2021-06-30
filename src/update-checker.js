const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

exports.check = async (input) => {
  const projectPathMap = parseProjectPathMap(input.projectPaths);

  if (input.eventName !== 'push') {
    const result = {};
    projectPathMap.forEach((paths, projectName) => {
      result[projectName] = true;
    });
    console.log(
      `all result are FALSE because Because of ${input.eventName} event without commit.`
    );
    return result;
  }

  const updateFiles = await UpdateFiles.fromGitHub(input);
  const result = {};
  projectPathMap.forEach((paths, projectName) => {
    result[projectName] = updateFiles.isUpdatedOnProject(
      paths,
      input.checkStrategy || defaultStrategy
    );
    console.log(`[${projectName}] => updated=${result[projectName]}`);
  });
  return result;
};

class UpdateFiles {
  constructor(updateFileNames) {
    this._updateFileNames = updateFileNames;
  }

  static async fromGitHub(queryParamaters) {
    let commit;
    try {
      // request to https://api.github.com/repos/{owner}/{repo}/commits/{commit_sha}
      const octokit = new Octokit();
      commit = await octokit.request(
        'GET /repos/{owner}/{repo}/commits/{commit_sha}',
        {
          owner: queryParamaters.owner,
          repo: queryParamaters.repo,
          commit_sha: queryParamaters.commit_sha,
        }
      );
    } catch (error) {
      core.setFailed(error.message);
    }

    const commitFiles = commit.data.files.map((file) => file.filename);
    const previousFiles = commit.data.files
      .filter((file) => file.status == 'renamed' && file.previous_filename)
      .map((file) => file.previous_filename);
    const updateFiles = [...commitFiles, ...previousFiles];

    console.log(`commit_sha: ${queryParamaters.commit_sha}`);
    console.log(`The event commit: ${updateFiles}`);

    return new UpdateFiles(updateFiles);
  }

  isUpdatedOnProject(projectPaths, checkStrategy) {
    for (const path of projectPaths) {
      if (checkStrategy(this._updateFileNames, path)) {
        return true;
      }
    }
    return false;
  }
}

const parseProjectPathMap = function (projectPaths) {
  const map = new Map();
  for (const line of projectPaths) {
    const kv = line.replace(/[\\"\\']/g, '').split(':'); // ex) line = "'service1:path1,path2'"
    map.set(
      kv[0].trim(),
      kv[1].split(',').map((path) => path.trim())
    );
  }
  map.forEach((val, key) => console.log(key, val));
  return map;
};

// default strategy
const defaultStrategy = function (files, prefixPath) {
  for (let fileName of files) {
    //console.log(`${fileName} startsWith(${prefixPath})`);
    if (fileName.startsWith(prefixPath)) {
      return true;
    }
  }
  return false;
};

//----------------------
// exports for testing
//----------------------
exports.defaultStrategy = defaultStrategy;
exports.parseProjectPathMap = parseProjectPathMap;
exports.UpdateFiles = UpdateFiles;

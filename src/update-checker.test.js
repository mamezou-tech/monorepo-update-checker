const checker = require('./update-checker.js');

// parseProjectPathMap
test('parseProjectPathMap testNoral', () => {
  const lines = ['project1:path1,path2', 'project2:path3,path4'];
  const map = checker.parseProjectPathMap(lines);
  expect(map.size).toBe(2);
  expect(map.get('project1')).toEqual([`path1`, `path2`]);
  expect(map.get('project2')).toEqual([`path3`, `path4`]);
});

test('parseProjectPathMap testTrim', () => {
  const lines = ['project1 : path1, path2', ' project2:path3,path4 '];
  const map = checker.parseProjectPathMap(lines);
  expect(map.size).toBe(2);
  expect(map.get('project1')).toEqual([`path1`, `path2`]);
  expect(map.get('project2')).toEqual([`path3`, `path4`]);
});

test('parseProjectPathMap testRemoveQuote', () => {
  const lines = ["'project1:path1,path2'", '"project2:path3,path4"'];
  const map = checker.parseProjectPathMap(lines);
  expect(map.size).toBe(2);
  expect(map.get('project1')).toEqual([`path1`, `path2`]);
  expect(map.get('project2')).toEqual([`path3`, `path4`]);
});

// defaultStrategy
test('defaultStrategy testNoral', () => {
  const files = ['file.txt', 'service1/file1.txt', 'service2/file1.txt'];
  expect(checker.defaultStrategy(files, 'service1')).toBeTruthy();
  expect(checker.defaultStrategy(files, 'service2')).toBeTruthy();
  expect(checker.defaultStrategy(files, 'service3')).toBeFalsy();
});
test('defaultStrategy testUnexpected', () => {
  const files = ['file.txt', 'service1/file1.txt', 'service2/file1.txt'];
  expect(checker.defaultStrategy(files, '')).toBeTruthy();
  expect(checker.defaultStrategy(files)).toBeFalsy();
  expect(checker.defaultStrategy([], 'service1')).toBeFalsy();
});

// UpdateFiles
test('UpdateFiles testNormal', () => {
  const updateFilesParam = ['service1/file1.txt', 'service3/file1.txt'];
  const updateFiles = new checker.UpdateFiles(updateFilesParam);

  const projectPathsMatch = ['service1', 'services2', 'service3'];
  expect(
    updateFiles.isUpdatedOnProject(projectPathsMatch, checker.defaultStrategy)
  ).toBeTruthy();

  const projectPathsUnmatch = ['service2', 'service2/service1'];
  expect(
    updateFiles.isUpdatedOnProject(projectPathsUnmatch, checker.defaultStrategy)
  ).toBeFalsy();
});

// integration test
test('integration test', async () => {
  // on push event test
  const input = {
    projectPaths: [
      'service1:test/service1,test/service1-option',
      'service2:test/service2',
      'service3:test/service3',
    ],
    owner: 'mamezou-tech',
    repo: 'monorepo-update-checker',
    eventName: 'push',
    commit_sha: '7ff026ed0fe647ec842470fdab90cad2d4baa16e',
  };

  const expected = {
    service1: false,
    service2: true,
    service3: true,
  };
  // expect(await checker.check(input)).toEqual(expected);

  // on workflow_run event test
  input.eventName = 'workflow_run';
  expected.service1 = true;
  expected.service2 = true;
  expected.service3 = true;

  expect(await checker.check(input)).toEqual(expected);
});

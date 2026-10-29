import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const hook = fileURLToPath(new URL('../scripts/review-docs.mjs', import.meta.url));

function fixture(t, { commit = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'lean harness 한글 '));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  function git(...args) {
    const result = spawnSync('git', [
      '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
      '-c', 'user.name=Harness Test', '-c', 'user.email=test@example.invalid', ...args,
    ], { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  }
  function write(path, text = 'export const value = 1;\n') {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), text);
  }
  function run(event = {}, args = []) {
    const result = spawnSync(process.execPath, [hook, ...args], {
      cwd, encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'Stop', cwd, ...event }),
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  }
  git('init', '-b', 'main');
  write('src/features/home/feed.ts');
  write('src/shared/uid.ts');
  write('docs/features/home.md', '# 홈\n');
  write('docs/features/reader.md', '# 리더\n코드 진입점: `src/shared/uid.ts`\n');
  if (commit) {
    git('add', 'src', 'docs');
    git('commit', '-m', 'test fixture');
  }
  return { cwd, git, write, run };
}

test('clean tree and documentation-only changes do not interrupt completion', t => {
  const f = fixture(t);
  assert.deepEqual(f.run(), {});
  f.write('docs/features/home.md', '# 홈\n설명 변경\n');
  assert.deepEqual(f.run(), {});
});

test('unstaged source change selects its feature document', t => {
  const f = fixture(t);
  f.write('src/features/home/feed.ts', 'export const value = 2;\n');
  const result = f.run();
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /docs\/features\/home\.md/);
  assert.match(result.reason, /기존 사용자 변경/);
  assert.match(result.reason, /불필요하면 그대로/);
});

test('staged changes are included even when the working copy is clean', t => {
  const f = fixture(t);
  f.write('src/features/home/feed.ts', 'export const value = 3;\n');
  f.git('add', 'src/features/home/feed.ts');
  assert.equal(f.run().decision, 'block');
});

test('opposing staged and unstaged changes are not hidden by the final working copy', t => {
  const f = fixture(t);
  f.write('src/features/home/feed.ts', 'export const value = 3;\n');
  f.git('add', 'src/features/home/feed.ts');
  f.write('src/features/home/feed.ts', 'export const value = 1;\n');
  assert.equal(f.run().decision, 'block');
});

test('untracked source and JSON data are included with no matching document', t => {
  const f = fixture(t);
  f.write('src/data/quiz.json', '{"enabled":true}\n');
  const result = f.run();
  assert.match(result.reason, /src\/data\/quiz\.json/);
  assert.match(result.reason, /직접 연결된 기능 문서는 없습니다/);
});

test('shared source selects documents that mention its exact path', t => {
  const f = fixture(t);
  f.write('src/shared/uid.ts', 'export const value = 4;\n');
  const result = f.run();
  assert.match(result.reason, /docs\/features\/reader\.md/);
  assert.doesNotMatch(result.reason, /docs\/features\/home\.md/);
});

test('deletions and renames retain both old and new source candidates', t => {
  const f = fixture(t);
  f.write('src/features/home/old.ts');
  f.git('add', 'src/features/home/old.ts');
  f.git('commit', '-m', 'add old file');
  renameSync(join(f.cwd, 'src/features/home/old.ts'), join(f.cwd, 'src/features/home/new.ts'));
  unlinkSync(join(f.cwd, 'src/features/home/feed.ts'));
  const result = f.run({}, ['--check']);
  assert.deepEqual(result.files, [
    'src/features/home/feed.ts', 'src/features/home/new.ts', 'src/features/home/old.ts',
  ]);
});

test('test-only changes and ignored files do not request a review', t => {
  const f = fixture(t);
  f.write('src/features/home/feed.test.ts');
  f.write('src/features/home/__tests__/edge.ts');
  f.write('.gitignore', 'src/generated/\n');
  f.write('src/generated/cache.ts');
  assert.deepEqual(f.run(), {});
});

test('continuation and non-Stop events exit without repeating the reminder', t => {
  const f = fixture(t);
  f.write('src/features/home/feed.ts', 'export const value = 5;\n');
  assert.deepEqual(f.run({ stop_hook_active: true }), {});
  assert.deepEqual(f.run({ hook_event_name: 'PostToolUse' }), {});
});

test('new repositories without a commit and missing docs are supported', t => {
  const f = fixture(t, { commit: false });
  rmSync(join(f.cwd, 'docs'), { recursive: true });
  f.git('add', 'src/features/home/feed.ts');
  assert.equal(f.run().decision, 'block');
});

test('unusual filenames remain quoted data and the source list is bounded', t => {
  const f = fixture(t);
  f.write('src/features/home/a\nodd name.ts');
  assert.match(f.run().reason, /a\\nodd name\.ts/);
  for (let i = 0; i < 20; i++) f.write(`src/features/home/file-${i}.ts`);
  assert.match(f.run().reason, /외 9개/);
});

test('malformed input reports a failed check instead of claiming success', () => {
  const result = spawnSync(process.execPath, [hook], { encoding: 'utf8', input: '{' });
  assert.match(JSON.parse(result.stdout).systemMessage, /실행하지 못했습니다/);
});

test('running outside Git reports a failed check', t => {
  const cwd = mkdtempSync(join(tmpdir(), 'lean-no-git-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [hook], {
    cwd, encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'Stop', cwd }),
  });
  assert.match(JSON.parse(result.stdout).systemMessage, /실행하지 못했습니다/);
});

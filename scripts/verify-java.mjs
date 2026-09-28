import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectRoot } from './build.mjs';
const problems = JSON.parse(await readFile(join(projectRoot, 'src/extra-problems.json'), 'utf8'));
const cases = JSON.parse(await readFile(join(projectRoot, 'tests/java-cases.json'), 'utf8'));
const selected = process.argv.slice(2);
const ids = selected.length ? selected : Object.keys(problems);
const temp = await mkdtemp(join(tmpdir(), 'dsa-java-'));
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
});
const helpers = `
  static int[] a(int... values) { return values; }
  static int[][] m(int[]... rows) { return rows; }
  static String[] s(String... values) { return values; }
  static ListNode list(int... values) {
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int value : values) { tail.next = new ListNode(value); tail = tail.next; }
    return dummy.next;
  }
  static int[] vals(ListNode head) {
    List<Integer> out = new ArrayList<>();
    while (head != null) {
      if (out.size() > 10000) throw new AssertionError("Unexpected cycle in result");
      out.add(head.val); head = head.next;
    }
    return out.stream().mapToInt(Integer::intValue).toArray();
  }
  static TreeNode tree(Integer... values) {
    if (values.length == 0 || values[0] == null) return null;
    TreeNode root = new TreeNode(values[0]);
    Queue<TreeNode> queue = new ArrayDeque<>(); queue.offer(root);
    int i = 1;
    while (i < values.length && !queue.isEmpty()) {
      TreeNode p = queue.poll();
      if (values[i] != null) { p.left = new TreeNode(values[i]); queue.offer(p.left); }
      i++;
      if (i < values.length && values[i] != null) { p.right = new TreeNode(values[i]); queue.offer(p.right); }
      i++;
    }
    return root;
  }
  static void eq(Object actual, Object expected) {
    if (!Objects.deepEquals(actual, expected)) throw new AssertionError("Expected " + Arrays.deepToString(new Object[]{expected}) + ", got " + Arrays.deepToString(new Object[]{actual}));
  }
`;
try {
  const files = [];
  for (const id of ids) {
    const problem = problems[id];
    if (!problem || !cases[id]) throw new Error(`Problem ${id} needs both a solution and executable cases`);
    const dir = join(temp, `p${id}`); await mkdir(dir);
    const code = /^class\s/.test(problem.code) ? problem.code : `class Solution {\n${problem.code}\n}`;
    const snippet = `package p${id};\nimport java.util.*;\nclass ListNode { int val; ListNode next; ListNode(int val) { this.val=val; } }\nclass TreeNode { int val; TreeNode left,right; TreeNode(int val) { this.val=val; } }\n${problem.supportCode || ''}\n${code}\n`;
    const verify = `package p${id};\nimport java.util.*;\npublic class Verify {\n${helpers}\npublic static void run() {\n${cases[id]}\n}\n}`;
    await writeFile(join(dir, 'Snippet.java'), snippet);
    await writeFile(join(dir, 'Verify.java'), verify);
    files.push(join(dir, 'Snippet.java'), join(dir, 'Verify.java'));
  }
  const main = join(temp, 'AllChecks.java');
  await writeFile(main, `public class AllChecks { public static void main(String[] args) {\n${ids.map(id=>`try { p${id}.Verify.run(); } catch (Throwable error) { throw new AssertionError("Problem ${id}: ${problems[id].title.replaceAll('"','')} failed", error); }`).join('\n')}\nSystem.out.println("Compiled and verified ${ids.length} Java solutions."); } }`);
  const classes = join(temp, 'classes'); await mkdir(classes);
  await run(process.env.JAVAC || 'javac', ['-encoding', 'UTF-8', '-d', classes, ...files, main]);
  await run(process.env.JAVA || 'java', ['-cp', classes, 'AllChecks']);
} finally {
  await rm(temp, { recursive: true, force: true });
}

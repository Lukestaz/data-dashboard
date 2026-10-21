#!/usr/bin/env python3
"""Regenerate this pinned candidate from complete, hash-verified checkout files."""
import argparse
import base64
import difflib
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

NEW_FILES = {'js/community-report-controls.js', 'tests/community-report-filter.test.mjs', 'tests/community-reports.browser.mjs'}
PATCH_SHA = '931f89d0a84ffca16a0333c2fcd6a198eb0f6a877c00faf50ae8b46e0bd1a187'
ANCHOR = "export function communityReportMatches(report, filter = 'all') {\n  return filter === 'all' || (report.status === 'ready' && report.kind === filter);\n}\n"

def require(condition, message):
    if not condition:
        raise ValueError(message)

def parse_patch(text):
    result = {}
    for section in text.split('diff --git ')[1:]:
        lines = section.splitlines(keepends=True)
        match = re.fullmatch(r'a/(\S+) b/\1\n', lines[0])
        require(match is not None, 'Invalid patch path')
        name = match[1]
        require(not PurePosixPath(name).is_absolute() and not any(p in ('..', '.git') for p in PurePosixPath(name).parts), 'Unsafe patch path')
        require(name not in result, 'Duplicate patch path: ' + name)
        hunks = []
        i = 1
        while i < len(lines):
            if not lines[i].startswith('@@ '):
                i += 1
                continue
            header = re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@\n', lines[i])
            require(header is not None, 'Invalid hunk header')
            old_count = int(header[2]) if header[2] is not None else 1
            new_count = int(header[4]) if header[4] is not None else 1
            old, new = [], []
            i += 1
            while i < len(lines) and lines[i][:1] in (' ', '+', '-'):
                line = lines[i]
                if line[0] in (' ', '-'):
                    old.append(line[1:])
                if line[0] in (' ', '+'):
                    new.append(line[1:])
                i += 1
            require(len(old) == old_count and len(new) == new_count, 'Hunk count mismatch: ' + name)
            hunks.append((''.join(old), ''.join(new)))
        require(bool(hunks), 'No hunks: ' + name)
        result[name] = hunks
    require(bool(result), 'Empty candidate')
    return result

def reconstruct(name, before, hunks):
    ranges = []
    for old, new in hunks:
        require(bool(old), 'Unexpected empty replacement: ' + name)
        if name == 'js/community-reports.js' and old == '}\n':
            require(new.startswith('}\nexport function communityReportsEnabled(state) {\n'), 'Unexpected classifier insertion')
            require(before.count(ANCHOR) == 1, 'Classifier anchor not unique')
            start = before.index(ANCHOR) + len(ANCHOR) - len(old)
        else:
            require(before.count(old) == 1, 'Replacement must match exactly once: ' + name)
            start = before.index(old)
        ranges.append((start, start + len(old), new))
    ranges.sort()
    require(all(left[1] <= right[0] for left, right in zip(ranges, ranges[1:])), 'Overlapping replacements: ' + name)
    after = before
    for start, end, replacement in reversed(ranges):
        after = after[:start] + replacement + after[end:]
    return after

def full_diff(before, after):
    parts = []
    for name in sorted(after):
        old = before.get(name, '')
        if old == after[name]:
            continue
        parts.append(f'diff --git a/{name} b/{name}\n')
        if name not in before:
            parts.append('new file mode 100644\n')
        for line in difflib.unified_diff(old.splitlines(True), after[name].splitlines(True), fromfile='a/' + name if name in before else '/dev/null', tofile='b/' + name, n=3):
            parts.append(line if line.endswith('\n') else line + '\n\\ No newline at end of file\n')
    return ''.join(parts).encode('utf-8')

def prepare(root, output, candidate):
    data = json.loads(candidate.read_text(encoding='utf-8'))
    decoded = gzip.decompress(base64.b64decode(data['patchGzipBase64'], validate=True))
    require(data['patchSha256'] == PATCH_SHA and hashlib.sha256(decoded).hexdigest() == PATCH_SHA, 'Candidate checksum mismatch')
    parsed = parse_patch(decoded.decode('utf-8'))
    expected = data['expectedBlobs']
    require(set(parsed) == set(expected) | NEW_FILES, 'Unexpected candidate file set')
    before, after = {}, {}
    for name, sha in expected.items():
        raw = (root / name).read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        require(blob == sha, 'Candidate needs reconciliation: ' + name)
        before[name] = raw.decode('utf-8')
    for name, hunks in parsed.items():
        if name in before:
            after[name] = reconstruct(name, before[name], hunks)
        else:
            require(not (root / name).exists(), 'New candidate file already exists: ' + name)
            require(len(hunks) == 1 and hunks[0][0] == '', 'Invalid new file: ' + name)
            after[name] = hunks[0][1]
    regenerated = full_diff(before, after)
    output.mkdir(parents=True, exist_ok=True)
    patch = output / 'amex-community-reports-full-context.patch'
    patch.write_bytes(regenerated)
    subprocess.run(['git', 'apply', '--check', str(patch.resolve())], cwd=root, check=True)
    subprocess.run(['git', 'apply', str(patch.resolve())], cwd=root, check=True)
    target_hashes = {}
    for name, text in after.items():
        require((root / name).read_bytes() == text.encode('utf-8'), 'Applied bytes differ: ' + name)
        target_hashes[name] = hashlib.sha256(text.encode('utf-8')).hexdigest()
    subprocess.run(['git', 'diff', '--check'], cwd=root, check=True)
    record = {'checkedOutCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), 'inputSourceBlobs': expected, 'inputPatchSha256': PATCH_SHA, 'fullContextPatchSha256': hashlib.sha256(regenerated).hexdigest(), 'targetSha256': target_hashes, 'verification': 'Normal git apply --check/apply and exact target-byte comparison passed; feature tests run separately.'}
    (output / 'candidate-targets.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(record))

def self_test():
    import tempfile
    passed = 0
    def rejects(run):
        try:
            run()
        except ValueError:
            return
        raise AssertionError('Expected rejection')
    source = 'head\nchange\ntail\n'
    require(reconstruct('x', source, [('change\n', 'changed\n')]) == 'head\nchanged\ntail\n', 'Unique replacement')
    passed += 1
    rejects(lambda: reconstruct('x', source, [('absent\n', 'new\n')]))
    passed += 1
    rejects(lambda: reconstruct('x', 'x\nx\n', [('x\n', 'y\n')]))
    passed += 1
    rejects(lambda: reconstruct('x', source, [('head\nchange\n', 'one\n'), ('change\ntail\n', 'two\n')]))
    passed += 1
    classifier = 'function other() {\n}\n' + ANCHOR + 'function following() {\n}\n'
    insertion = '}\nexport function communityReportsEnabled(state) {\n  return true;\n}\n'
    require(reconstruct('js/community-reports.js', classifier, [('}\n', insertion)]) == classifier.replace(ANCHOR, ANCHOR[:-2] + insertion), 'Explicit classifier anchor')
    passed += 1
    rejects(lambda: reconstruct('js/community-reports.js', classifier, [('}\n', '}\nwrong\n')]))
    passed += 1
    rejects(lambda: reconstruct('js/community-reports.js', ANCHOR + ANCHOR, [('}\n', insertion)]))
    passed += 1
    rejects(lambda: parse_patch('diff --git a/../bad b/../bad\n@@ -1 +1 @@\n-x\n+y\n'))
    passed += 1
    rejects(lambda: parse_patch('diff --git a/x b/x\n@@ -1,2 +1 @@\n-x\n+y\n'))
    passed += 1
    require(parse_patch('diff --git a/x b/x\n@@ -1 +1 @@\n-x\n+y\n')['x'] == [('x\n', 'y\n')], 'Parse exact counts')
    passed += 1
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        before = {'x.txt': source, 'nonl.txt': 'before'}
        after = {'x.txt': 'head\nchanged\ntail\n', 'nonl.txt': 'after', 'new.txt': 'new\n'}
        for name, text in before.items():
            (root / name).write_bytes(text.encode())
        path = root / 'test.patch'
        path.write_bytes(full_diff(before, after))
        subprocess.run(['git', 'apply', '--check', str(path)], cwd=root, check=True)
        subprocess.run(['git', 'apply', str(path)], cwd=root, check=True)
        require(all((root / name).read_bytes() == text.encode() for name, text in after.items()), 'Round-trip including new file and no final newline')
    passed += 1
    print(f'Candidate regeneration self-tests: {passed} passed; no external requests.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--output', type=Path)
    parser.add_argument('--candidate', type=Path, default=Path('candidate/amex-community-reports.json'))
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        parser.error('--output is required') if args.output is None else prepare(args.root.resolve(), args.output.resolve(), args.candidate.resolve())

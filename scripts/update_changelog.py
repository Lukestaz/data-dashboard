#!/usr/bin/env python3
import collections, datetime, pathlib, re, subprocess, sys
from zoneinfo import ZoneInfo

BASELINE = '0998d2da81bef22459348309274927c095626148'
START = '<!-- AUTO-CHANGELOG:START -->'
END = '<!-- AUTO-CHANGELOG:END -->'
REPO = 'https://github.com/Lukestaz/data-dashboard'

def render(entries):
    grouped = collections.defaultdict(list)
    for sha, stamp, subject in entries:
        match = re.match(r'^(feat|fix|perf|refactor|chore)(?:\([^)]*\))?!?:\s+(.+)$', subject)
        if not match:
            continue
        day = datetime.datetime.fromisoformat(stamp).astimezone(ZoneInfo('Pacific/Auckland')).date().isoformat()
        group = {'feat':'Features','fix':'Fixes','perf':'Performance','refactor':'Maintenance','chore':'Maintenance'}[match[1]]
        message = match[2].replace('[','\\[').replace(']','\\]')
        grouped[day].append((group, f'- {message} ([`{sha[:7]}`]({REPO}/commit/{sha})).'))
    lines = [START, '## Automated changes', '', 'Generated from commit messages; these are not release or deployment confirmations.', '']
    for day in sorted(grouped, reverse=True):
        lines += ['### ' + day + ' (NZ time)', '']
        for group in ('Features','Fixes','Performance','Maintenance'):
            bullets = [bullet for kind, bullet in grouped[day] if kind == group]
            if bullets:
                lines += [group, ''] + bullets + ['']
    return '\n'.join(lines + [END]) + '\n'

def merge(existing, block):
    if START in existing or END in existing:
        if existing.count(START) != 1 or existing.count(END) != 1:
            raise ValueError('Invalid automatic changelog markers')
        start = existing.index(START)
        end = existing.index(END) + len(END)
        if end <= start:
            raise ValueError('Automatic changelog markers reversed')
        return existing[:start] + block.rstrip('\n') + existing[end:]
    heading = re.search(r'^# [^\n]+\n', existing, re.M)
    offset = heading.end() if heading else 0
    return existing[:offset] + '\n' + block + '\n' + existing[offset:]

def self_test():
    entries = [('a'*40,'2026-10-06T23:55:00+00:00','feat: Add subtype dropdown'),
               ('b'*40,'2026-10-07T01:00:00+00:00','fix: Match dropdown styles'),
               ('c'*40,'2026-10-07T01:02:00+00:00','Refresh Amex dataset 2026-10-07'),
               ('d'*40,'2026-10-07T01:03:00+00:00','docs: update automated changelog')]
    block = render(entries)
    original = '# Changelog\n\n## Handwritten\nKeep this exactly.\n'
    first = merge(original, block)
    assert merge(first, block) == first
    assert '2026-10-07 (NZ time)' in block
    assert 'Refresh Amex' not in block and 'docs:' not in block
    assert first.endswith(original[len('# Changelog\n'):])
    try:
        merge(START, block)
    except ValueError:
        pass
    else:
        raise AssertionError('Broken marker accepted')
    print('Changelog checks passed: dates, exclusions, manual preservation, idempotence and marker safety')

def main():
    self_test()
    if '--test-only' in sys.argv:
        return
    path = pathlib.Path('CHANGELOG.md')
    existing = path.read_text(encoding='utf-8')
    history = subprocess.check_output(['git','log','--first-parent','--format=%H%x00%cI%x00%s',BASELINE + '..HEAD'], text=True)
    entries = [line.split('\0',2) for line in history.splitlines() if line]
    updated = merge(existing, render(entries))
    if updated == existing:
        print('Changelog already current')
        return
    temporary = path.with_suffix('.md.tmp')
    temporary.write_text(updated, encoding='utf-8')
    temporary.replace(path)
    print('Updated automatic changelog section; manual text preserved')

if __name__ == '__main__':
    main()

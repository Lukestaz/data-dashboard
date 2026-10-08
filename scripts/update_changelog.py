#!/usr/bin/env python3
import collections, datetime, pathlib, re, subprocess, sys
from zoneinfo import ZoneInfo

BASELINE = '0998d2da81bef22459348309274927c095626148'
START = '<!-- AUTO-CHANGELOG:START -->'
END = '<!-- AUTO-CHANGELOG:END -->'
REPO = 'https://github.com/Lukestaz/data-dashboard'
GROUPS = ('Breaking changes', 'Features', 'Fixes', 'Performance', 'Maintenance')

def escape_markdown(text):
    return re.sub(r'([\\`*_{}\[\]<>])', r'\\\1', text)

def render(entries):
    grouped = collections.defaultdict(list)
    for sha, stamp, subject in entries:
        match = re.match(r'^(feat|fix|perf|refactor|chore)(?:\([^)]*\))?(!)?:\s+(.+)$', subject)
        if not match:
            continue
        day = datetime.datetime.fromisoformat(stamp).astimezone(ZoneInfo('Pacific/Auckland')).date().isoformat()
        group = 'Breaking changes' if match[2] else {'feat':'Features','fix':'Fixes','perf':'Performance','refactor':'Maintenance','chore':'Maintenance'}[match[1]]
        message = escape_markdown(match[3])
        grouped[day].append((group, f'- {message} ([`{sha[:7]}`]({REPO}/commit/{sha})).'))
    lines = [START, '## Automated changes', '', 'Generated from commit messages; these are not release or deployment confirmations.', '']
    for day in sorted(grouped, reverse=True):
        lines += ['### ' + day + ' (NZ time)', '']
        for group in GROUPS:
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
               ('b'*40,'2026-10-07T01:00:00+00:00','fix(feedback): Match dropdown styles'),
               ('c'*40,'2026-10-07T01:02:00+00:00','Refresh Amex dataset 2026-10-07'),
               ('d'*40,'2026-10-07T01:03:00+00:00','docs: update automated changelog'),
               ('e'*40,'2026-10-07T01:04:00+00:00','feat(api)!: Remove legacy endpoint'),
               ('f'*40,'2026-10-07T01:05:00+00:00','fix!: Change stored settings')]
    block = render(entries)
    original = '# Changelog\n\n## Handwritten\nKeep this exactly.\n'
    first = merge(original, block)
    assert merge(first, block) == first
    assert '2026-10-07 (NZ time)' in block
    assert 'Refresh Amex' not in block and 'docs:' not in block
    assert 'Match dropdown styles' in block
    assert 'Breaking changes\n\n- Remove legacy endpoint' in block
    assert '- Change stored settings' in block
    assert block.index('Breaking changes') < block.index('Features\n')
    assert first.endswith(original[len('# Changelog\n'):])
    for broken in (START, END, END + START, START + START + END, START + END + END):
        try:
            merge(broken, block)
        except ValueError:
            pass
        else:
            raise AssertionError('Broken markers accepted')
    for stamp, day in [('2026-07-01T11:59:00+00:00','2026-07-01'),
                       ('2026-07-01T12:00:00+00:00','2026-07-02'),
                       ('2026-01-01T10:59:00+00:00','2026-01-01'),
                       ('2026-01-01T11:00:00+00:00','2026-01-02'),
                       ('2026-09-26T13:59:00+00:00','2026-09-27'),
                       ('2026-09-26T14:00:00+00:00','2026-09-27')]:
        assert day + ' (NZ time)' in render([('a'*40, stamp, 'fix: Date check')])
    punctuation = '[label] *bold* _name_ `code` <tag> {value}'
    escaped = escape_markdown(punctuation)
    for char in '[]*_`<>{}':
        assert '\\' + char in escaped
    assert escaped in render([('a'*40, entries[0][1], 'fix: ' + punctuation)])
    assert merge('Manual notes\n', block).endswith('Manual notes\n')
    print('Changelog checks passed: scoped and breaking subjects, NZ dates, exclusions, Markdown escaping, manual preservation, idempotence and marker safety')

def main():
    self_test()
    if '--test-only' in sys.argv:
        return
    path = pathlib.Path('CHANGELOG.md')
    existing = path.read_text(encoding='utf-8')
    # First-parent history assumes meaningful conventional subjects on main.
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

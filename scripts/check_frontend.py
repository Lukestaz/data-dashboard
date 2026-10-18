#!/usr/bin/env python3
"""Read-only frontend syntax and HTML contract checks; does not execute app code."""
import argparse
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import tempfile

REQUIRED_IDS = (
    'compact-toolbar', 'compact-root', 'search-input', 'town-select',
    'area-select', 'sort-select', 'near-me-btn', 'compact-location',
    'compact-more', 'compact-build-footer', 'total-count', 'card-grid',
    'map', 'map-wrapper', 'cards-wrapper',
)

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = Counter()
        self.tags = Counter()
        self.ends = Counter()
        self.styles = []
        self.modules = []
        self.builds = []
        self.doctype = False

    def handle_decl(self, decl):
        if decl.lower() == 'doctype html':
            self.doctype = True

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags[tag] += 1
        if attrs.get('id'):
            self.ids[attrs['id']] += 1
        if tag == 'link' and 'stylesheet' in attrs.get('rel', '').split():
            self.styles.append(attrs.get('href'))
        if tag == 'script' and attrs.get('type') == 'module':
            self.modules.append(attrs.get('src'))
        if tag == 'meta' and attrs.get('name') == 'application-build':
            self.builds.append(attrs.get('content', ''))

    def handle_endtag(self, tag):
        self.ends[tag] += 1


def html_errors(source):
    page = Page()
    try:
        page.feed(source)
        page.close()
    except Exception:
        return ['index.html could not be parsed']
    errors = []
    if not page.doctype:
        errors.append('index.html needs the HTML doctype')
    for tag in ('html', 'head', 'body'):
        if page.tags[tag] != 1 or page.ends[tag] != 1:
            errors.append('index.html needs exactly one opening/closing ' + tag)
    for identifier in REQUIRED_IDS:
        if page.ids[identifier] != 1:
            errors.append('index.html requires exactly one #' + identifier)
    if any(count != 1 for count in page.ids.values()):
        errors.append('index.html has duplicate element IDs')
    expected = ['./css/compact.css', './css/tailwind.css']
    if any(page.styles.count(path) != 1 for path in expected):
        errors.append('index.html requires both local stylesheets exactly once')
    elif page.styles.index(expected[0]) > page.styles.index(expected[1]):
        errors.append('compact.css must precede tailwind.css')
    if page.modules.count('./js/app.js') != 1:
        errors.append('index.html requires the ./js/app.js module entrypoint exactly once')
    if len(page.builds) > 1 or any(not re.fullmatch(r'[0-9a-f]{40}', sha) for sha in page.builds):
        errors.append('application-build metadata is duplicated or malformed')
    return errors


def syntax_ok(source):
    try:
        result = subprocess.run(
            ['node', '--input-type=module', '--check'], input=source,
            text=True, capture_output=True, timeout=15,
        )
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def check(root):
    errors = []
    try:
        errors.extend(html_errors((root / 'index.html').read_text(encoding='utf-8')))
    except (OSError, UnicodeError):
        errors.append('index.html is missing or not valid UTF-8')
    for path in ('css/compact.css', 'css/tailwind.css', 'js/app.js'):
        if not (root / path).is_file():
            errors.append('Required local asset missing: ' + path)
    modules = sorted((root / 'js').rglob('*.js'))
    if not modules:
        errors.append('No frontend JavaScript modules found')
    for module in modules:
        try:
            valid = syntax_ok(module.read_text(encoding='utf-8'))
        except (OSError, UnicodeError):
            valid = False
        if not valid:
            errors.append(str(module.relative_to(root)) + ': module syntax check failed')
    return errors, len(modules)


def self_test():
    identifiers = ''.join('<div id="' + name + '"></div>' for name in REQUIRED_IDS)
    html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="./css/compact.css"><link rel="stylesheet" href="./css/tailwind.css"><script type="module" src="./js/app.js"></script></head><body>' + identifiers + '</body></html>'
    assert not html_errors(html)
    assert html_errors(html.replace(chr(34), chr(92) + chr(34)))
    assert html_errors(html.replace('id="card-grid"', 'id="not-card-grid"'))
    assert html_errors(html.replace('</body>', '<div id="card-grid"></div></body>'))
    reversed_styles = html.replace('./css/compact.css', './css/temp.css').replace('./css/tailwind.css', './css/compact.css').replace('./css/temp.css', './css/tailwind.css')
    assert html_errors(reversed_styles)
    assert html_errors(html.replace('type="module"', 'type="text/plain"'))
    assert html_errors(html.replace('</head>', '<meta name="application-build" content="bad"></head>'))
    stamped = html.replace('</head>', '<meta name="application-build" content="' + 'a' * 40 + '"></head>')
    assert not html_errors(stamped)
    assert syntax_ok('export const ok = 1;' + chr(10))
    assert not syntax_ok('export const ok = 1;' + chr(92) + 'nexport const broken = 2;')
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / 'js').mkdir()
        (root / 'css').mkdir()
        (root / 'index.html').write_text(html, encoding='utf-8')
        (root / 'js/app.js').write_text('export const ok = true;' + chr(10), encoding='utf-8')
        for name in ('compact', 'tailwind'):
            (root / ('css/' + name + '.css')).write_text('', encoding='utf-8')
        assert check(root) == ([], 1)
        (root / 'js/app.js').write_text('export const ok = true;' + chr(92) + 'n', encoding='utf-8')
        assert check(root)[0]
        (root / 'js/app.js').unlink()
        assert check(root)[0]
    print('Frontend guard self-tests: 13 passed (no app execution or network requests)')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    errors, count = check(args.root.resolve())
    if errors:
        for error in errors:
            print('FAIL: ' + error)
        return 1
    print('Frontend checks passed: HTML contracts and ' + str(count) + ' module syntax checks')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

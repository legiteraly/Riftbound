"""Regenerate raw/defs.json from the pop files and write scripts/browser/ebay_classify.js (paste into the eBay tab)."""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'build_defs.py')], cwd=ROOT, check=True)
defs = open(os.path.join(ROOT, 'raw', 'defs.json')).read()
t = open(os.path.join(ROOT, 'scripts', 'browser', 'ebay_classify.template.js')).read()
open(os.path.join(ROOT, 'scripts', 'browser', 'ebay_classify.js'), 'w').write(t.replace('__DEFS__', defs))
print('wrote scripts/browser/ebay_classify.js')

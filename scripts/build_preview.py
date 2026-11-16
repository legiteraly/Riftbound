"""Bundle site/ into one self-contained HTML file (preview/index.html) with the data inlined."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, 'site')
html = open(os.path.join(S, 'index.html')).read()
css = open(os.path.join(S, 'styles.css')).read()
data = {'cards': json.load(open(os.path.join(S, 'data/cards.json'))), 'history': json.load(open(os.path.join(S, 'data/history.json')))}
js = 'window.RIFT_DATA=' + json.dumps(data, separators=(',', ':')).replace('</', '<\\/') + ';\n' + open(os.path.join(S, 'ev.js')).read() + '\n' + open(os.path.join(S, 'app.js')).read()
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="ev.js"></script>\n<script src="app.js"></script>', '<script>\n' + js + '\n</script>')
os.makedirs(os.path.join(ROOT, 'preview'), exist_ok=True)
open(os.path.join(ROOT, 'preview', 'index.html'), 'w').write(html)
print(len(html))

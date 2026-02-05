
import sys
from arq.cli import cli

# Windows Unicode Fix: Force UTF-8 for stdout/stderr to prevent logging crashes with arrows/emojis
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

if __name__ == '__main__':
    # ARQ CLI expects to be called as 'arq', so we mimic that
    sys.exit(cli())

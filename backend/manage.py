#!/usr/bin/env python
import os
import sys
from pathlib import Path

def main():
    """Run administrative tasks."""
    # Add the parent directory to Python path
    sys.path.append(str(Path(__file__).parent))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()